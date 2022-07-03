import {EventEmitter} from "events";
import express from "express";
import http from "http";
import https,{ServerOptions} from "https";
import compression from "compression";
import { AwaitQueue } from "../common/lib/AwaitQueue";
import {WebSocketConnectionAccept, WebSocketConnectionInfo, WebSocketConnectionReject, WebSocketServer} from "../common/lib/websocket/server";
import fs from "fs";
import url from "url";
import helmet from "helmet";
import bodyParser from "body-parser";

import ServerLifeCycle from "./ServerLifeCycle";
import Logger from "../common/lib/Logger";
import ConfigHelper from "../common/utils/ConfigHelper";
import {ParsedUrlQuery} from "querystring";
import { v4 as uuidv4 } from "uuid";
import WebRouters from "./WebRouters";
import LuckSheetCoordinationRoom from "../luckysheet/LuckSheetCoordinationRoom";
import LuckSheetCoordinationPeer from "../luckysheet/LuckSheetCoordinationPeer";
const {config} = ConfigHelper;
const logger = new Logger("LuckSheetCoordinationServer");

export default class LuckSheetCoordinationServer extends EventEmitter implements ServerLifeCycle{
    public static instance:LuckSheetCoordinationServer;
    private _webServer:http.Server|https.Server|undefined = undefined;
    private _redirectWebServer:http.Server|https.Server|undefined = undefined;
    private _app = express();
    private _websocketServer:WebSocketServer|undefined = undefined;

    private _rooms:Map<string,LuckSheetCoordinationRoom> = new Map();
    private _joinQueue:AwaitQueue = new AwaitQueue();
    private _allPeers:Map<string,LuckSheetCoordinationPeer> = new Map();

    /**
     * @param key 
     * @param queryParams 
     */
    private _getStringFromQueryString(queryParams:ParsedUrlQuery,key:string):string{

        const val = queryParams[key];
        if(!val){
            return "";
        }
        if(typeof val == "string"){
            return val;
        }
        if(Array.isArray(val) && val.length>0){
            return val[0];
        }
        return "";

    }

    private async _getOrCreateRoom({roomId,roomName,startIp }:{ peerId:string,roomId:string,roomName:string,startIp:string }){
        let room = this._rooms.get(roomId);
        if(room && !room.closed){
            return room;
        }
        this._rooms.delete(roomId);
        
        logger.info('Create coordination room [roomInfo:"%s,%s,%s"]', roomId,roomName,startIp);
        room = await LuckSheetCoordinationRoom.create({roomId, roomName, startIp});
        this._rooms.set(roomId, room);
        room.on('close', () =>{
            this._rooms.delete(roomId);
        });
        return room;
    }
    async start(){
        this._app.use(compression());
        this._app.use((_req,res,next) => {
            res.header('Access-Control-Allow-Origin','*');
            res.header('Access-Control-Allow-Methods','*');
            res.header('Access-Control-Allow-Headers','*');
            return next();
        });
        this._app.use(bodyParser.json());
        this._app.use(helmet.hsts());
        this._app.use(WebRouters.getRouter(WebRouters.WebRouterKind.LUCKSHEET_COORDINATION));
        const serverConfig = config.web_server;
        if(serverConfig.isHttpOnly){
            this._webServer = http.createServer(this._app);
        }else{
            const tls:ServerOptions = {
                cert          : fs.readFileSync(serverConfig.tls.cert),
                key           : fs.readFileSync(serverConfig.tls.key),
                secureOptions : 1.2,
                ciphers       :
                    [
                        'ECDHE-ECDSA-AES128-GCM-SHA256',
                        'ECDHE-RSA-AES128-GCM-SHA256',
                        'ECDHE-ECDSA-AES256-GCM-SHA384',
                        'ECDHE-RSA-AES256-GCM-SHA384',
                        'ECDHE-ECDSA-CHACHA20-POLY1305',
                        'ECDHE-RSA-CHACHA20-POLY1305',
                        'DHE-RSA-AES128-GCM-SHA256',
                        'DHE-RSA-AES256-GCM-SHA384'
                    ].join(':'),
                honorCipherOrder : true
            };
            // https
            this._webServer = https.createServer(tls, this._app);
            this._redirectWebServer = http.createServer(this._app);
            this._redirectWebServer.listen(serverConfig.listeningPort+1);
        }
         
        logger.info("Start success "+(serverConfig.isHttpOnly?"http":"https")+"://"+serverConfig.listeningHost+":"+serverConfig.listeningPort);
        this._webServer.listen(serverConfig.listeningPort, serverConfig.listeningHost); 
        this._websocketServer = new WebSocketServer(
        {
            httpServer               : this._webServer,
            maxReceivedFrameSize     : 960000,
            maxReceivedMessageSize   : 960000,
            fragmentOutgoingMessages : true,
            fragmentationThreshold   : 960000
        });
        this._websocketServer.on('connectionrequest', (info:WebSocketConnectionInfo, accept:WebSocketConnectionAccept, reject:WebSocketConnectionReject) =>{

            const webSocketTransport = accept();
            const urlLink:string = info.request.url?info.request.url:"";
            const params = url.parse(urlLink, true).query;
            const roomId:string = this._getStringFromQueryString(params,'workbookId');		// excel表格的Id
            const roomName:string = this._getStringFromQueryString(params,'workbookName');  // excel表格的名称
            const peerId:string = this._getStringFromQueryString(params,'peerId');          // 登录（或者匿名）用户的唯一标致
            
            if (!roomId || !peerId){
                reject(500, 'missing nessceary parameters');
                return;
            }

            let ip = info.request.socket.remoteAddress||"127.0.0.1";
            logger.info("Got coordination request:workbookId=%s&peerId=%s,ip=%s,os=%s,v1=%s,v2=%s",roomId,peerId,ip);
            let room:LuckSheetCoordinationRoom|null = null;
            this._joinQueue.push(async () => {
                room = await this._getOrCreateRoom({ peerId,roomId,roomName,startIp:ip });
                let sc = room.socketRoom.getPeer(peerId);
                if(sc){
                    sc.close();
                }
                let signalingChannel = room.socketRoom.createPeer(peerId,webSocketTransport);
                signalingChannel.on('close', () =>{
                    this._allPeers.delete(peerId);
                });

                let peer = new LuckSheetCoordinationPeer({ id: peerId,room, signalingChannel,joinIp:ip,joinId:uuidv4() });
                room.handlePeer({ peer });
                
            }).catch((error) =>{
                logger.error('Create or join room got error [error:"%O"]', error);
                return;
            });
        });
    }
    async stop() {
        
    }

    async dump(): Promise<object> {
        
        return Promise.resolve({});
    }

    get rooms(){
        return this._rooms;
    }

    private constructor(){
        super();
    }
    /**
     * 获取唯一实例
     * @returns 
     */
    static getSigleton():LuckSheetCoordinationServer{
        if(!this.instance){
            this.instance = new LuckSheetCoordinationServer();
        }
        return this.instance;
    }
}