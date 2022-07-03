import {EventEmitter} from "events";
import express from "express";
import http from "http";
import https,{ServerOptions} from "https";
import compression from "compression";
import { AwaitQueue } from "../lib/AwaitQueue";
import {WebSocketConnectionAccept, WebSocketConnectionInfo, WebSocketConnectionReject, WebSocketServer} from "../lib/websocket/server";
import fs from "fs";
import url from "url";
import helmet from "helmet";
import bodyParser from "body-parser";

import ServerLifeCycle from "./ServerLifeCycle";
import Logger from "../lib/Logger";
import ConfigHelper from "../utils/ConfigHelper";
import {ParsedUrlQuery} from "querystring";
import MediaNodeHandler from "../manager/MediaNodeHandler";
import { v4 as uuidv4 } from "uuid";
import WebRouters from "./WebRouters";
import MeetingRoom from "../manager/MeetingRoom";
import MeetingPeer from "../manager/MeetingPeer";
import MySqlClient from "../lib/MySqlClient";
import CommonUtils from "../utils/CommonUtils";
import { LoginUser } from "../types";

const {config} = ConfigHelper;
const logger = new Logger("MeetingServer");
const mysqlClient = MySqlClient.getSingleton();
/**
 * 会议信令服务器
 * 单例模式
 */
export default class LuckSheetCoordinationServer extends EventEmitter implements ServerLifeCycle{
    public static instance:LuckSheetCoordinationServer;
    private _webServer:http.Server|https.Server|undefined = undefined;
    private _redirectWebServer:http.Server|https.Server|undefined = undefined;
    private _app = express();
    private _websocketServer:WebSocketServer|undefined = undefined;

    private _rooms:Map<string,MeetingRoom> = new Map();
    private _joinQueue:AwaitQueue = new AwaitQueue();
    private _allPeers:Map<string,MeetingPeer> = new Map();

    /**
     * 从querystring 提取参数
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

    /**
     * 返回已存在的房间或者创建新的房间
     */
    private async _getOrCreateRoom({ peerId,roomId,roomName,startIp }:{ peerId:string,roomId:string,roomName:string,startIp:string }){
        let room = this._rooms.get(roomId);
        if(room && !room.closed){
            return room;
        }
        this._rooms.delete(roomId); // 确保清理成功
        
        logger.info('Create coordination room [roomInfo:"%s,%s,%s"]', roomId,roomName,startIp);
        room = await MeetingRoom.create({ dbUuid,mediaNodeHandler:MediaNodeHandler.getSigleton(), roomId, roomName, peers:this._allPeers, startIp});
        this._rooms.set(roomId, room);
        room.on('close', () =>{
            logger.info("会议室%s,%s关闭,删除引用",roomId,roomName);
            this._rooms.delete(roomId);
        });
        return room;
    }
    async start(){
        logger.info("开始启动会议服务器,单个会议最大容量 %s",config.maxUsersPerRoom);
        this._app.use(compression());
        this._app.use((_req,res,next) => { //支持跨域
            res.header('Access-Control-Allow-Origin','*');
            res.header('Access-Control-Allow-Methods','*');
            res.header('Access-Control-Allow-Headers','*');
            return next();
        });
        this._app.use(bodyParser.json());
        this._app.use(helmet.hsts());
        this._app.use(WebRouters.getRouter(WebRouters.WebRouterKind.MEETING));
        const serverConfig = config.servers.meeting;
        if(serverConfig.isHttpOnly){
            this._webServer = http.createServer(this._app);
        }else{
            // 证书加密设置
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
         
        if (serverConfig.listeningHost){
            logger.info("启动成功 "+(serverConfig.isHttpOnly?"http":"https")+";会议信令服务器监听地址 "+serverConfig.listeningHost+",监听端口 "+serverConfig.listeningPort);
            this._webServer.listen(serverConfig.listeningPort, serverConfig.listeningHost); 
        }else{
            logger.info("启动成功 "+(serverConfig.isHttpOnly?"http":"https")+";会议信令服务器监听端口 "+serverConfig.listeningPort);
            this._webServer.listen(serverConfig.listeningPort);
        }
        this._websocketServer = new WebSocketServer(
            {
                httpServer               : this._webServer,
                maxReceivedFrameSize     : 960000, // 960 KBytes.
                maxReceivedMessageSize   : 960000,
                fragmentOutgoingMessages : true,
                fragmentationThreshold   : 960000
            });
        // 处理websocket请求
        this._websocketServer.on('connectionrequest', (info:WebSocketConnectionInfo, accept:WebSocketConnectionAccept, reject:WebSocketConnectionReject) =>{

            const webSocketTransport = accept(); // 需要在第一时间accpet,防止因为业务异常导致连接状态错误,导致客户端阻塞

            const urlLink:string = info.request.url?info.request.url:"";
            const params = url.parse(urlLink, true).query;
            const roomId:string = this._getStringFromQueryString(params,'roomId');		
            const roomName:string = this._getStringFromQueryString(params,'roomName');		// 用户桌面分组（每个人只有一个桌面分组）
            const peerId:string = this._getStringFromQueryString(params,'peerId');	        // 用户会话唯一编码,也是token
            const os:string = this._getStringFromQueryString(params,'os');						// 公共参数 操作系统类型
            const app_version:string = this._getStringFromQueryString(params,'app_version');	// 客户端版本
            const os_version:string = this._getStringFromQueryString(params,'os_version');		// 操作
            
            if (!roomId || !peerId){
                logger.error('会议信令通道 缺失必要的请求参数,拒绝连接');
                reject(500, '缺失必要的请求参数');
                return;
            }

            let ip = info.request.socket.remoteAddress||"127.0.0.1";
            logger.info("收到客户端app的websocket连接:roomId=%s&peerId=%s,ip=%s,os=%s,v1=%s,v2=%s",roomId,peerId,ip,os,app_version,os_version);
            let room:MeetingRoom|null = null;
            this._joinQueue.push(async () => {
                // websocket连接建立的时候就创建房间
                room = await this._getOrCreateRoom({ peerId,roomId,roomName,startIp:ip });

                if(!room){
                    return;
                }
                if(!room.dbStatus){ // 保存数据库失败
                    reject(400, '登录失效,请重新登录');
                    room.close();
                    return;
                }
                // 创建完成后立即绑定业务事件（好习惯）
                let sc = room.protooRoom.getPeer(peerId); // 返回已存在的通道
                if(sc){ // 关闭掉之前的,准备重新申请
                    logger.info("检测可信令通道已存在,可能是出现了重连,关闭该通道[%s,%s],等待2s后重新创建",roomId,peerId);
                    sc.close();
                }
                let signalingChannel2 = room.protooRoom.createPeer(peerId,webSocketTransport); // 创建和客户端的网络通道
                signalingChannel2.on('close', () =>{
                    logger.info("监听到与客户端信令通道[%s]关闭,从全局peers里删除peer[%s]",signalingChannel2?.id,peerId);
                    this._allPeers.delete(peerId);// 只处理分内的事,在全局delete掉就行,至于peer需不需关闭,由peer内部决定
                });

                let returning = false;// 是否从房间出去后折返回来的
                let peer = this._allPeers.get(peerId);
                if(!peer){ // 常规加入会议
                    peer = new MeetingPeer({ id: peerId,room, signalingChannel:signalingChannel2,joinIp:ip,joinId:uuidv4() });
                    this._allPeers.set(peerId, peer);// 方便进行全局管理,这里的peerId也应该全局唯一
                    logger.info("全局会议客户端个数 %s",this._allPeers.size);
                    returning = false;
                }else{ // 折返回来加入会议 比如信令通道断开,参会者重连进入会议的情况
                    logger.info("检测到[%s,%s]重新接入,重置信令通道。",peer.id,peer.displayName);
                    peer.removeAllListeners();
                    peer.signalingChannel = signalingChannel2;// 更新信令通道
                    returning = true;
                }
                //给客户端的一些业务操作绑定响应逻辑 通知其他客户端
                room.handlePeer({ peer, returning });
                
            }).catch((error) =>{
                logger.error('创建或者加入房间失败 [error:"%O"]', error);
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
    static getSigleton():MeetingServer{
        if(!this.instance){
            this.instance = new MeetingServer();
        }
        return this.instance;
    }
}