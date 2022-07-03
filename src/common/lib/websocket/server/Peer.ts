import Logger from "../../Logger";
import EnhancedEventEmitter from "../../EnhancedEventEmitter";
import Message, { RPCNotification, RPCRequest, RPCResponse } from "../Message";
import WebSocketTransport from "./transports/WebSocketTransport";
import { SocketTimeoutError } from "../../Errors";

const logger = new Logger('WebsocketServerPeer');

export default class Peer extends EnhancedEventEmitter {

	private _closed = false;

	private _id;

	private _transport: WebSocketTransport;

	private _data = {};

	private _sents: Map<number, any> = new Map();
	/**
	 *
	 * @emits close
	 */
	constructor(peerId: string, transport: WebSocketTransport) {
		super(logger);

		logger.debug('constructor()');

		this._closed = false;

		this._id = peerId;

		this._transport = transport;

		this._data = {};

		this._sents = new Map();

		this._handleTransport();
	}

	get id() {
		return this._id;
	}

	get closed() {
		return this._closed;
	}

	get data() {
		return this._data;
	}

	set data(_data: object) {
		throw new Error('cannot override data object');
	}

	close() {
		if (this._closed)
			return;

		logger.debug('close()');

		this._closed = true;

		// Close Transport.
		this._transport.close();

		// Close every pending sent.
		for (const sent of this._sents.values()) {
			sent.close();
		}

		// Emit 'close' event.
		this.safeEmit('close');
	}

	async request(method: string, data = undefined) {
		const request = Message.createRequest(method, data);

		logger.info('Request_[method:%s, id:%s]', method, request.id);

		// This may throw.
		await this._transport.send(request);

		return new Promise<any>((pResolve, pReject) => {
			const timeout = 2000 * (15 + (0.1 * this._sents.size));
			const sent =
			{
				id: request.id,
				method: request.method,
				resolve: (data2: any) => {
					if (!this._sents.delete(request.id))
						return;

					clearTimeout(sent.timer);
					pResolve(data2);
					logger.info("Request_Got_Response_Success for request:%s",request.id);
				},
				reject: (error: any) => {
					if (!this._sents.delete(request.id))
						return;

					clearTimeout(sent.timer);
					pReject(error);
				},
				timer: setTimeout(() => {
					if (!this._sents.delete(request.id))
						return;

					logger.error("Request_timeout for request:%s, with timeout %d",request.id,timeout);
					pReject(new SocketTimeoutError('request timeout'));
				}, timeout),
				close: () => {
					clearTimeout(sent.timer);
					pReject(new Error('peer closed'));
				}
			};

			this._sents.set(request.id, sent);
		});
	}

	async notify(method: string, data: any = undefined) {
		const notification = Message.createNotification(method, data);

		logger.debug('notify() [method:%s]', method);

		await this._transport.send(notification);
	}

	_handleTransport() {
		if (this._transport.closed) {
			this._closed = true;

			setImmediate(() => this.safeEmit('close'));

			return;
		}

		this._transport.on('close', () => {
			if (this._closed)
				return;

			this._closed = true;

			this.safeEmit('close');
		});

		this._transport.on('message', (message) => {
			if (message.request)
				this._handleRequest(message);
			else if (message.response)
				this._handleResponse(message);
			else if (message.notification)
				this._handleNotification(message);
		});
	}

	_handleRequest(request: RPCRequest) {
		try {
			this.emit('request',
				request,
				(data: any) => {
					const response = Message.createSuccessResponse(request, data);

					this._transport.send(response).catch(() => { });
				},
				(errorCode: number | Error, errorReason: string | Error) => {
					if (errorCode instanceof Error) {
						errorReason = errorCode.message;
						errorCode = 500;
					}
					else if (typeof errorCode === 'number' && errorReason instanceof Error) {
						errorReason = errorReason.message;
					}

					const response = Message.createErrorResponse(request, errorCode, errorReason);

					this._transport.send(response).catch(() => { });
				});
		}
		catch (error) {
			const response = Message.createErrorResponse(request, 500, String(error));
			this._transport.send(response).catch(() => { });
		}
	}

	_handleResponse(response: RPCResponse) {
		const sent = this._sents.get(response.id);

		if (!sent) {
			logger.error('received response does not match any sent request [id:%s]', response.id);
			return;
		}

		if (response.ok) {
			sent.resolve(response.data);
		}else {
			const error = new Error((response.errorReason as string));
			(error as any).code = response.errorCode;
			sent.reject(error);
		}
	}

	_handleNotification(notification: RPCNotification) {
		this.safeEmit('notification', notification);
	}
}

module.exports = Peer;
