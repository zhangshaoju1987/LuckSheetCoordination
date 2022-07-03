import Logger from "../../Logger";
import EnhancedEventEmitter from "../../EnhancedEventEmitter";
import Peer from "./Peer";
import WebSocketTransport from "./transports/WebSocketTransport";

const logger = new Logger('Room');

export default class Room extends EnhancedEventEmitter {

	private _closed = false;

	private _peers: Map<string, Peer> = new Map();

	constructor() {
		super(logger);
		logger.debug('constructor()');
	}

	get closed() {
		return this._closed;
	}

	get peers() {
		return Array.from(this._peers.values());
	}

	close() {
		if (this._closed)
			return;

		logger.debug('close()');

		this._closed = true;

		for (const peer of this._peers.values()) {
			peer.close();
		}

		this.safeEmit('close');
	}

	createPeer(peerId: string, transport: WebSocketTransport) {
		logger.debug('createPeer() [peerId:%s, transport:%s]', peerId, transport);

		if (!transport)
			throw new TypeError('no transport given');

		if (typeof peerId !== 'string' || !peerId) {
			transport.close();

			throw new TypeError('peerId must be a string');
		}

		if (this._peers.has(peerId)) {
			transport.close();

			throw new Error(`there is already a Peer with same peerId [peerId:"${peerId}"]`);
		}

		const peer = new Peer(peerId, transport);

		this._peers.set(peer.id, peer);
		peer.on('close', () => this._peers.delete(peerId));

		return peer;
	}

	hasPeer(peerId: string) {
		return this._peers.has(peerId);
	}

	getPeer(peerId: string) {
		return this._peers.get(peerId);
	}
}

module.exports = Room;
