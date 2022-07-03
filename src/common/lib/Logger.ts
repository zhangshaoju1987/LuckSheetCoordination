import debug,{Debugger} from "debug";
// 信令服务器的日志标志
const APP_NAME = 'SignalingServer';

/**
 * 和Java有点不一样的
 * java Log4j定义了debug,那么级别比debug高的都会输出
 * 这里(node的debug模块)必须明确指定要输出的日志级别,设置DEBUG*,则只能输出debug;设置ERROR*,则只能输出error
 * node里是按命名空间的概念理解的;java是按日志级别的概念理解的。
 * 语法如下:
 * 通过冒号来分割明明空间;程序名称:日志级别:子模块
 * ${APP_NAME}:ERROR*:${prefix}
 */
export default class Logger
{
	private _debug:Debugger;
	private _info:Debugger;
	private _warn:Debugger;
	private _error:Debugger;
	constructor(prefix:string)
	{
		if (prefix)
		{
			this._debug = debug(`${APP_NAME}:DEBUG:${prefix}`);
			this._info  = debug(`${APP_NAME}:INFO:${prefix}`);
			this._warn  = debug(`${APP_NAME}:WARN:${prefix}`);
			this._error = debug(`${APP_NAME}:ERROR:${prefix}`);
		}
		else
		{
			this._debug = debug(`${APP_NAME}:DEBUG`);
			this._info = debug(`${APP_NAME}:INFO`);
			this._warn = debug(`${APP_NAME}:WARN`);
			this._error = debug(`${APP_NAME}:ERROR`);
		}

		/* eslint-disable no-console */
		this._debug.log = console.info.bind(console);
		this._info.log = console.info.bind(console);
		this._warn.log = console.warn.bind(console);
		this._error.log = console.error.bind(console);
		/* eslint-enable no-console */
	}

	get debug()
	{
		return this._debug;
	}

	get info()
	{
		return this._info;
	}

	get warn()
	{
		return this._warn;
	}

	get error()
	{
		return this._error;
	}
}
