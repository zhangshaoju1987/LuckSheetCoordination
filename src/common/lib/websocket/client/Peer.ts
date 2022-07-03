import Logger from "../../Logger";
import EnhancedEventEmitter from "../../EnhancedEventEmitter";
import { RPCNotification, RPCRequest, RPCResponse } from "../Message";
import Message from "../Message";
import WebSocketTransport from "./transports/WebSocketTransport";

const logger = new Logger('WebsocketClientPeer');

export default class Peer extends EnhancedEventEmitter
{

	private _closed = false;
	private _transport:WebSocketTransport;
	private _connected = false;
	private _data = {};
	private _sents = new Map();
	constructor(transport:WebSocketTransport)
	{
		super(logger);

		logger.debug('constructor()');

		this._closed = false;

		this._transport = transport;

		this._connected = false;

		this._data = {};

		this._sents = new Map();

		this._handleTransport();
	}

	get closed()
	{
		return this._closed;
	}

	get connected()
	{
		return this._connected;
	}

	get data()
	{
		return this._data;
	}

	close()
	{
		if (this._closed)
			return;

		logger.debug('close()');

		this._closed = true;
		this._connected = false;

		this._transport.close();

		for (const sent of this._sents.values())
		{
			sent.close();
		}

		this.safeEmit('close');
	}

	async request(method:string, data:any = undefined):Promise<any>
	{
		const request = Message.createRequest(method, data);

		logger.debug('request() [method:%s, id:%s]', method, request.id);

		await this._transport.send(request);

		return new Promise((pResolve, pReject) =>
		{
			const timeout = 1500 * (15 + (0.1 * this._sents.size));
			const sent =
			{
				id      : request.id,
				method  : request.method,
				resolve : (data2:any) =>
				{
					if (!this._sents.delete(request.id))
						return;

					clearTimeout(sent.timer);
					pResolve(data2);
				},
				reject : (error:any) =>
				{
					if (!this._sents.delete(request.id))
						return;

					clearTimeout(sent.timer);
					pReject(error);
				},
				timer : setTimeout(() =>
				{
					if (!this._sents.delete(request.id))
						return;

					pReject(new Error('request timeout'));
				}, timeout),
				close : () =>
				{
					clearTimeout(sent.timer);
					pReject(new Error('peer closed'));
				}
			};

			this._sents.set(request.id, sent);
		});
	}

	async notify(method:string, data = undefined)
	{
		const notification = Message.createNotification(method, data);

		logger.debug('notify() [method:%s]', method);

		await this._transport.send(notification);
	}

	_handleTransport()
	{
		if (this._transport.closed)
		{
			this._closed = true;

			setTimeout(() =>
			{
				if (this._closed)
					return;

				this._connected = false;

				this.safeEmit('close');
			});

			return;
		}

		this._transport.on('open', () =>
		{
			if (this._closed)
				return;

			logger.debug('emit "open"');

			this._connected = true;

			this.safeEmit('open');
		});

		this._transport.on('disconnected', () =>
		{
			if (this._closed)
				return;

			logger.debug('emit "disconnected"');

			this._connected = false;

			this.safeEmit('disconnected');
		});

		this._transport.on('failed', (currentAttempt) =>
		{
			if (this._closed)
				return;

			logger.debug('emit "failed" [currentAttempt:%s]', currentAttempt);

			this._connected = false;

			this.safeEmit('failed', currentAttempt);
		});

		this._transport.on('close', () =>
		{
			if (this._closed)
				return;

			this._closed = true;

			logger.debug('emit "close"');

			this._connected = false;

			this.safeEmit('close');
		});

		this._transport.on('message', (message) =>
		{
			if (message.request)
				this._handleRequest(message);
			else if (message.response)
				this._handleResponse(message);
			else if (message.notification)
				this._handleNotification(message);
		});
	}

	_handleRequest(request:RPCRequest)
	{
		try
		{
			this.emit('request',
				request,
				// accept() function.
				(data:object) =>
				{
					const response = Message.createSuccessResponse(request, data);

					this._transport.send(response).catch(() => {});
				},
				// reject() function.
				(errorCode:number|Error, errorReason:string|Error) =>
				{
					if (errorCode instanceof Error)
					{
						errorReason = errorCode.message;
						errorCode = 500;
					}
					else if (typeof errorCode === 'number' && errorReason instanceof Error)
					{
						errorReason = errorReason.message;
					}

					const response = Message.createErrorResponse(request, errorCode, errorReason);

					this._transport.send(response).catch(() => {});
				});
		}
		catch (error)
		{
			const response = Message.createErrorResponse(request, 500, String(error));

			this._transport.send(response)
				.catch(() => {});
		}
	}

	_handleResponse(response:RPCResponse)
	{
		const sent = this._sents.get(response.id);

		if (!sent)
		{
			logger.error(
				'received response does not match any sent request [id:%s]', response.id);

			return;
		}

		if (response.ok)
		{
			sent.resolve(response.data);
		}
		else
		{
			const error = new Error((response.errorReason as string));

			(error as any).code = response.errorCode;
			sent.reject(error);
		}
	}

	_handleNotification(notification:RPCNotification)
	{
		this.safeEmit('notification', notification);
	}
}

module.exports = Peer;
