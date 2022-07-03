import {w3cwebsocket as W3CWebSocket,IClientConfig} from "websocket";
import {OutgoingHttpHeaders} from "http";
import {RetryOptions,retry} from "../../../retry";

import Logger from "../../../Logger";
import EnhancedEventEmitter from "../../../EnhancedEventEmitter";
import Message from "../../Message";
import { WS_SUBPROTOCOL } from "../../Common";



export interface SOCKET_OPTIONS{
	retry:RetryOptions,
	origin?:string,
	headers?:OutgoingHttpHeaders|undefined,
	requestOptions?:object,
	clientConfig?:IClientConfig
	
}

const DEFAULT_RETRY_OPTIONS:RetryOptions =
{
	retries    : 10,
	factor     : 2,
	minTimeout : 1 * 1000,
	maxTimeout : 8 * 1000
};

const logger = new Logger('WebSocketTransportClientSide');

export default class WebSocketTransport extends EnhancedEventEmitter
{
	private _closed:boolean;

	private _url:string;

	private _options:SOCKET_OPTIONS;

	private _ws:W3CWebSocket|null = null;

	constructor(url:string, options:SOCKET_OPTIONS)
	{
		super(logger);

		logger.debug('constructor() [url:%s, options:%o]', url, options);

		this._closed = false;

		this._url = url;

		this._options = options;

		this._ws = null;

		this._runWebSocket();
	}

	get closed()
	{
		return this._closed;
	}

	close()
	{
		if (this._closed)
			return;

		logger.debug('close()');

		this._closed = true;
		this.safeEmit('close');

		try
		{
			if(this._ws){
				this._ws.close();
			}
		}
		catch (error)
		{
			logger.error('close() | error closing the WebSocket: %o', error);
		}
	}

	async send(message:object)
	{
		if (this._closed)
			throw new Error('transport closed');

		try
		{
			this._ws && this._ws.send(JSON.stringify(message));
		}
		catch (error)
		{
			logger.warn('send() failed:%o', error);

			throw error;
		}
	}

	_runWebSocket()
	{
		const operation = retry.operation(this._options.retry || DEFAULT_RETRY_OPTIONS);

		let wasConnected = false;

		operation.attempt((currentAttempt:any) =>
		{
			if (this._closed)
			{
				operation.stop();

				return;
			}

			logger.debug('_runWebSocket() [currentAttempt:%s]', currentAttempt);

			this._ws = new W3CWebSocket(
				this._url,
				WS_SUBPROTOCOL,
				this._options.origin,
				this._options.headers,
				this._options.requestOptions,
				this._options.clientConfig
			);

			this._ws.onopen = () =>
			{
				if (this._closed)
					return;

				wasConnected = true;

				this.safeEmit('open');
			};

			this._ws.onclose = (event) =>
			{
				if (this._closed)
					return;

				logger.warn('WebSocket "close" event [wasClean:%s, code:%s, reason:"%s"]',event.wasClean, event.code, event.reason);

				if (event.code !== 4000)
				{
					if (!wasConnected)
					{
						this.safeEmit('failed', currentAttempt);

						if (this._closed)
							return;

						if (operation.retry())
							return;
					}
					else
					{
						operation.stop();

						this.safeEmit('disconnected');

						if (this._closed)
							return;

						this._runWebSocket();

						return;
					}
				}

				this._closed = true;

				this.safeEmit('close');
			};

			this._ws.onerror = () =>
			{
				if (this._closed)
					return;

				logger.error('WebSocket "error" event');
			};

			this._ws.onmessage = (event) =>
			{
				if (this._closed)
					return;

				const message = Message.parse((event.data as string));

				if (!message)
					return;

				if (this.listenerCount('message') === 0)
				{
					logger.error('no listeners for WebSocket "message" event, ignoring received message');

					return;
				}

				this.safeEmit('message', message);
			};
		});
	}
}

module.exports = WebSocketTransport;
