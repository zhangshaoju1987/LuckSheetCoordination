import { EventEmitter } from "events";
import Logger from "./Logger";

/**
 * 防止emit抛出异常导致不可预知的问题
 */
export default class EnhancedEventEmitter extends EventEmitter
{
	private _logger:Logger;
	constructor(logger:Logger)
	{
		super();
		this.setMaxListeners(Infinity);

		this._logger = logger || new Logger('EnhancedEventEmitter');
	}

	safeEmit(event:any, ...args:any[])
	{
		try
		{
			this.emit(event, ...args);
		}
		catch (error)
		{
			this._logger.error('safeEmit() | event listener threw an error [event:%s]:%o',event, error);
		}
	}

	async safeEmitAsPromise(event:any, ...args:any[])
	{
		return new Promise((resolve, reject) =>
		{
			this.safeEmit(event, ...args, resolve, reject);
		});
	}
}
