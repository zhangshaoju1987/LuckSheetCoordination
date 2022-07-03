import { EventEmitter } from "events";
import { AwaitQueue } from "../common/lib/AwaitQueue";
import ZhumiSocketRoom, { AcceptFn, RPCRequest, RejectFn } from '../common/lib/websocket/server';
import Logger from "../common/lib/Logger";
import LuckSheetCoordinationPeer from "./LuckSheetCoordinationPeer";

const logger = new Logger('LuckSheetCoordinationRoom');
export default class LuckSheetCoordinationRoom extends EventEmitter {

	private _peers: Map<string, LuckSheetCoordinationPeer>;

	private _zhumiSocketRoom = new ZhumiSocketRoom.Room();

	private _startIp;

	private _roomId;

	private _roomName;

	private _closed = false;

	private _queue = new AwaitQueue();

	/**
	 * create a coordination unit
	 * @async
	 */
	static async create(
		{roomId, roomName, startIp }
			:
			{ roomId: string, roomName: string, startIp: string }) {

		
		return new LuckSheetCoordinationRoom({
			roomId,
			roomName,
			startIp
		});
	}

	constructor(
		{roomId, roomName, startIp }
			:
			{roomId: string, roomName: string, startIp: string }
	) {
		super();
		this.setMaxListeners(Infinity);

		this._peers = new Map<string, LuckSheetCoordinationPeer>();

		this._zhumiSocketRoom = new ZhumiSocketRoom.Room();

		this._startIp = startIp;

		this._roomId = roomId;

		this._roomName = roomName;

		this._closed = false;

		this._queue = new AwaitQueue();
	}

	set roomName(roomName:string){
		this._roomName = roomName;
	}
	get roomName(){
		return this._roomName;
	}
	
	async close() {
		if(this._closed){
			return;
		}
		this._closed = true;
		try{
			this._queue.close();
		}catch(err){}

		for (const peer of this._peers.values()) {
			await peer.close();
		}
		this._peers.clear();
		this._zhumiSocketRoom.close();
		this.emit('close');
	}

	handlePeer({ peer }: { peer: LuckSheetCoordinationPeer }) {
		
		this._peerJoining(peer);
	}

	/**
	 * 导出房间信息
	 */
	dump() {
		return {
			roomId: this._roomId,
			peers: this._peers.size
		};
	}

	get id() {
		return this._roomId;
	}

	get startIp() {
		return this._startIp;
	}

	get closed() {
		return this._closed;
	}

	get socketRoom() {
		return this._zhumiSocketRoom;
	}

	_peerJoining(peer: LuckSheetCoordinationPeer) {
		logger.info("处理客户端[%s]加入(注意:这里不是业务逻辑上的参会)请求[return=%s]", peer.id);
		this._queue.push(async () => {
			this._peers.set(peer.id, peer);
			this._handlePeer(peer);
		});
	}

	_handlePeer(peer: LuckSheetCoordinationPeer) {
		logger.debug('_handlePeer() [peer:"%s"]', peer.id);

		peer.on('close', () => {
			this._handlePeerClose(peer);
		});

		peer.signalingChannel.on('request', (request: RPCRequest, accept: AcceptFn, reject: RejectFn) => {
			this._handleWebsocketRequest(peer, request, accept, reject).catch(async (error) => {reject(error);});
		});
	}

	/**
	 * When LuckSheetCoordinationPeer finished emit `close` event, trigger this method
	 * @param peer 
	 */
	async _handlePeerClose(peer: LuckSheetCoordinationPeer) {
		logger.info('客户端[peer:"%s,%s"]退出了,开始执行客户端退出后的业务逻辑', peer.id, peer.displayName);

	}

	/**
	 * 
	 * @param {*} peer 
	 * @param {*} request 
	 * @param {*} accept 
	 * @param {*} reject
	 */
	async _handleWebsocketRequest(peer: LuckSheetCoordinationPeer, request: RPCRequest, accept: AcceptFn, reject: RejectFn) {
		switch (request.method) {
			case 'join':
				{
					accept({})

					break;
				}

			default:
				{
					logger.error('unknown request.method "%s"', request.method);
					reject(500, `unknown request.method "${request.method}"`);
				}
		}
	}

	/**
	 * notification
	 */
	_notification(peer: LuckSheetCoordinationPeer, method: string, data: any = undefined, broadcast = false, includeSender = false) {
		if (broadcast) {
			for (let one of this._zhumiSocketRoom.peers) {
				if (one.id != peer.signalingChannel.id) {
					one.notify(method, data);
				}
			}
			if (includeSender) {
				peer.signalingChannel.notify(method, data);
			}
		} else {
			if (peer.closed || !peer.signalingChannel || peer.signalingChannel.closed) {
				return;
			}
			peer.signalingChannel.notify(method, data);
		}
	}

}
