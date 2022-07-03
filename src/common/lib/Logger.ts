import debug,{Debugger} from "debug";
const APP_NAME = 'LuckSheetCoordination';
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

		this._debug.log = console.info.bind(console);
		this._info.log = console.info.bind(console);
		this._warn.log = console.warn.bind(console);
		this._error.log = console.error.bind(console);
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
