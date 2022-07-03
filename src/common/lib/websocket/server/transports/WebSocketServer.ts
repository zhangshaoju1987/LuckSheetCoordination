import websocket from "websocket";
import { IncomingMessage } from "http";
import { Socket } from 'node:net';
import Logger from "../../../Logger";
import EnhancedEventEmitter from "../../../EnhancedEventEmitter";
import WebSocketTransport from "./WebSocketTransport";
import { WS_SUBPROTOCOL } from "../../Common";

const logger = new Logger('WebSocketServer');

export interface WebSocketConnectionInfo {
	request: IncomingMessage
	origin: string
	socket: Socket
}

export interface WebSocketConnectionAccept {
	(): WebSocketTransport
}

export interface WebSocketConnectionReject {
	(code: number | Error, reason: string | Error | undefined): void
}



export default class WebSocketServer extends EnhancedEventEmitter {
	private _wsServer: websocket.server;

	constructor(options: websocket.IServerConfig) {
		super(logger);

		logger.debug('constructor() [option:%o]', options);

		options = Object.assign(
			{
				keepalive: true,
				keepaliveInterval: 60000
			},
			options);

		this._wsServer = new websocket.server(options);

		this._wsServer.on('request', (request: websocket.request) => this._onRequest(request));
	}

	stop() {
		logger.debug('stop()');
		this._wsServer.unmount();
	}

	_onRequest(request: websocket.request) {
		logger.debug('onRequest() [origin:%s | path:"%s"]', request.origin, request.resource);

		request.httpRequest.socket.on('error', () => { });

		if (request.requestedProtocols.indexOf(WS_SUBPROTOCOL) === -1) {
			logger.warn('_onRequest() | invalid/missing Sec-WebSocket-Protocol');
			request.reject(403, 'invalid/missing Sec-WebSocket-Protocol');

			return;
		}

		if (this.listenerCount('connectionrequest') === 0) {
			logger.error(
				'_onRequest() | no listeners for "connectionrequest" event, ' +
				'rejecting connection request');

			request.reject(500, 'no listeners for "connectionrequest" event');

			return;
		}

		let replied = false;

		try {
			this.emit('connectionrequest',
				{//info
					request: request.httpRequest,
					origin: request.origin,
					socket: request.httpRequest.socket
				},
				(cookie: any) => // accept
				{
					if (replied) {
						logger.warn('_onRequest() | cannot call accept(), connection request already replied');

						return;
					}

					replied = true;

					const connection = request.accept(WS_SUBPROTOCOL, request.origin, cookie);
					const transport = new WebSocketTransport(connection);

					logger.debug('_onRequest() | accept() called');

					return transport;
				},
				(code: number | Error, reason: string | Error | undefined) => // reject
				{
					if (replied) {
						logger.warn('_onRequest() | cannot call reject(), connection request already replied');

						return;
					}

					if (code instanceof Error) {
						code = 500;
						reason = String(code);
					}
					else if (reason instanceof Error) {
						reason = String(reason);
					}

					replied = true;
					code = code || 403;
					reason = reason || 'Rejected';

					logger.debug('_onRequest() | reject() called [code:%s | reason:"%s"]', code, reason);

					request.reject(code, reason);
				});
		}
		catch (error) {
			request.reject(500, String(error));
		}
	}
}