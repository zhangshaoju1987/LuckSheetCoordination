import {EventEmitter} from "events";
import Logger from "../common/lib/Logger";
import {WebsocketServerPeer,RequestCb} from "../common/lib/websocket/server";

const logger = new Logger('LuckSheetCoordinationPeer');

export default class LuckSheetCoordinationPeer extends EventEmitter
{
	private _id:string;
	
	private _room;

	private _signalingChannel:WebsocketServerPeer;

	private _mobile :string = "";

	private _meetingNo:string = "";

	private _joinIp:string;

	private _joinId:string;

	private _closed = false;

	private _joined = false;

	private _joinedTimestamp:number = -1;

	private _inLobby = false;

	private _authenticated = false;

	private _authenticatedTimestamp:number = -1;

	private _displayName:string|null = null;

	private _email :string = "";


	public socketRequestHandler:RequestCb = ()=>{};
	public gotRoleHandler:()=>void = ()=>{};
	public displayNameChangeHandler:()=>void = ()=>{};
	public pictureChangeHandler:()=>void = ()=>{};
	public closeHandler:()=>void = ()=>{};


	constructor({ id, room,signalingChannel,joinIp,joinId }:{id:string,room:any,signalingChannel:WebsocketServerPeer,joinIp:string,joinId:string})
	{		
		super();
		this._id = id;

		this._room = room;

		this._signalingChannel = signalingChannel;

		this._joinIp = joinIp;

		this._joinId = joinId;

		this._closed = false;

		this._joined = false;

		this._handlePeer();
	}

	get signalingChannel()
	{
		return this._signalingChannel;
	}

	async close(){
		if (this.closed){
			return;
		}
		logger.info("Close peer:%s",this.id);
		this._closed = true;		
		if (this._signalingChannel && !this._signalingChannel.closed){
			this._signalingChannel.close();
		}
		this.emit('close');
	}

	_handlePeer()
	{
		this._signalingChannel.on('close', () =>
		{
			if (this._closed){
				return;
			}else{
				this.close();
			}
		});
	}

	get id()
	{
		return this._id;
	}

	get joinIp()
	{
		return this._joinIp;
	}

	get joinId()
	{
		return this._joinId;
	}

	set id(id)
	{
		this._id = id;
	}

	get room()
	{
		return this._room;
	}
	get roomId()
	{
		return this._room.roomId;
	}

	set room(room)
	{
		this._room = room;
	}

	get closed()
	{
		return this._closed;
	}

	set closed(closed:boolean)
	{
		this._closed = closed;
	}

	get joined()
	{
		return this._joined;
	}

	set joined(joined)
	{
		joined ?
			this._joinedTimestamp = Date.now() :
			this._joinedTimestamp = -1;

		this._joined = joined;
	}

	get joinedTimestamp()
	{
		return this._joinedTimestamp;
	}

	get inLobby()
	{
		return this._inLobby;
	}

	set inLobby(inLobby)
	{
		this._inLobby = inLobby;
	}

	get authenticated()
	{
		return this._authenticated;
	}

	set authenticated(authenticated)
	{
		if (authenticated !== this._authenticated)
		{
			authenticated ?
				this._authenticatedTimestamp = Date.now() :
				this._authenticatedTimestamp = -1;

			const oldAuthenticated = this._authenticated;
			this._authenticated = authenticated;
			this.emit('authenticationChanged', { oldAuthenticated });
		}
	}

	get authenticatedTimestamp()
	{
		return this._authenticatedTimestamp;
	}

	get displayName()
	{
		return this._displayName;
	}

	get mobile()
	{
		return this._email;
	}

	set mobile(mobile:string)
	{
		this._mobile = mobile;
	}

	

	request(method:string,data:any = undefined){

		return this._signalingChannel.request(method,data);
	}

	get peerInfo()
	{
		const peerInfo =
		{
			id                  : this.id,
			joinIp              : this._joinIp,
			mobile              : this._mobile,
			meetingNo			: this._meetingNo,
			displayName         : this.displayName
		};

		return peerInfo;
	}
}