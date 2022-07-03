import Logger from "../Logger";
import { generateRandomNumber } from "./utils";

const logger = new Logger('WSClientSideMessage');

export interface RPCResponse {
	response: boolean,
	id: number,
	ok: boolean,
	data?: any,
	errorCode?: number | Error | undefined,
	errorReason?: string | Error | undefined
}

export interface RPCRequest {
	request: boolean,
	id: number,
	method: string,
	data?: any
}

export interface RPCNotification {
	notification: boolean,
	method: string,
	data?: any
};


export default class Message {
	static parse(raw: string) {
		let object;
		const message: any = {};

		try {
			object = JSON.parse(raw);
		}
		catch (error) {
			logger.error('parse() | invalid JSON: %s', error);

			return;
		}

		if (typeof object !== 'object' || Array.isArray(object)) {
			logger.error('parse() | not an object');

			return;
		}

		// Request.
		if (object.request) {
			message.request = true;

			if (typeof object.method !== 'string') {
				logger.error('parse() | missing/invalid method field');

				return;
			}

			if (typeof object.id !== 'number') {
				logger.error('parse() | missing/invalid id field');

				return;
			}

			message.id = object.id;
			message.method = object.method;
			message.data = object.data || {};
		}
		// Response.
		else if (object.response) {
			message.response = true;

			if (typeof object.id !== 'number') {
				logger.error('parse() | missing/invalid id field');

				return;
			}

			message.id = object.id;

			// Success.
			if (object.ok) {
				message.ok = true;
				message.data = object.data || {};
			}
			// Error.
			else {
				message.ok = false;
				message.errorCode = object.errorCode;
				message.errorReason = object.errorReason;
			}
		}
		// Notification.
		else if (object.notification) {
			message.notification = true;

			if (typeof object.method !== 'string') {
				logger.error('parse() | missing/invalid method field');

				return;
			}

			message.method = object.method;
			message.data = object.data || {};
		}
		// Invalid.
		else {
			logger.error('parse() | missing request/response field');

			return;
		}

		return message;
	}

	static createRequest(method: string, data: object | undefined) {
		const request =
		{
			request: true,
			id: generateRandomNumber(),
			method: method,
			data: data || {}
		};

		return request;
	}

	static createSuccessResponse(request: { id: number }, data: object) {
		const response =
		{
			response: true,
			id: request.id,
			ok: true,
			data: data || {}
		};

		return response;
	}

	static createErrorResponse(request: { id: number }, errorCode: number, errorReason: string | Error) {
		const response =
		{
			response: true,
			id: request.id,
			ok: false,
			errorCode: errorCode,
			errorReason: errorReason
		};

		return response;
	}

	static createNotification(method: string, data: object | undefined) {
		const notification =
		{
			notification: true,
			method: method,
			data: data || {}
		};

		return notification;
	}
}

module.exports = Message;
