/**
 *	网络超时异常
 */
export class SocketTimeoutError extends Error
{
	constructor(message:string)
	{
		super(message);

		this.name = 'SocketTimeoutError';

		if (Error.hasOwnProperty('captureStackTrace')) // Just in V8.
			Error.captureStackTrace(this, SocketTimeoutError);
		else
			this.stack = (new Error(message)).stack;
	}
}

export default {
	SocketTimeoutError
}