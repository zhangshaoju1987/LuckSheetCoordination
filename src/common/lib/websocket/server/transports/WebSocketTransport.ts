import Logger from "../../../Logger";
import EnhancedEventEmitter from "../../../EnhancedEventEmitter";
import Message from "../../Message";
import { Socket } from "net";
import websocket from "websocket";

const logger = new Logger('WebSocketTransportServerSide');

export default class WebSocketTransport extends EnhancedEventEmitter {

	private _closed = false;

	private _connection: websocket.connection;

	private _socket: Socket;
	constructor(connection: websocket.connection) {
		super(logger);

		logger.debug('constructor()');

		this._closed = false;

		this._connection = connection;

		this._socket = connection.socket;

		this._handleConnection();
	}

	get closed() {
		return this._closed;
	}

	toString() {
		return `WSS|WS}:[${this._socket.remoteAddress}]:${this._socket.remotePort}`;
	}

	close() {
		if (this._closed)
			return;

		logger.debug('close() [conn:%s]', this);

		this._closed = true;
		this.safeEmit('close');

		try {
			this._connection.close(4000, 'closed by websocket-server');
		}
		catch (error) {
			logger.error('close() | error closing the connection: %s', error);
		}
	}

	async send(message: object) {
		if (this._closed)
			throw new Error('transport closed');

		try {
			this._connection.sendUTF(JSON.stringify(message));
		}
		catch (error) {
			logger.warn('send() failed:%o', error);

			throw error;
		}
	}

	_handleConnection() {
		this._connection.on('close', (code: any, reason: string) => {
			if (this._closed)
				return;

			this._closed = true;
			logger.debug('connection "close" event [conn:%s, code:%d, reason:"%s"]', this, code, reason);
			this.safeEmit('close');
		});

		this._connection.on('error', (error: Error) => {
			logger.error('connection "error" event [conn:%s, error:%s]', this, error);
		});

		this._connection.on('message', (raw: websocket.Message) => {
			if (raw.type === 'binary') {
				// 这是专门为信令设计的通信模式，所以不支持|忽略二进制数据
				logger.debug('ignoring received binary message [conn:%s]', this);
				return;
			}

			const message = Message.parse(raw.utf8Data);

			if (!message)
				return;

			if (this.listenerCount('message') === 0) {
				logger.error('no listeners for "message" event, ignoring received message');
				return;
			}

			this.safeEmit('message', message);
		});
	}
}