import Room from "./Room";
import WebSocketTransport from "./transports/WebSocketTransport";
import WebsocketServerPeer from "./Peer";
import WebSocketServer, { WebSocketConnectionInfo, WebSocketConnectionAccept, WebSocketConnectionReject } from "./transports/WebSocketServer";
import { RPCRequest, RPCResponse, RPCNotification } from "../Message";

export type AcceptFn = (data: any) => void;
export type RejectFn = ((errorCode?: Error) => void) & ((errorCode: number, errorReason: Error | string) => void);
export type EmptyCb = () => void;
export type RequestCb = (request: RPCRequest, accept: AcceptFn, reject: RejectFn) => void;


export {
    WebsocketServerPeer, RPCRequest, RPCResponse, RPCNotification, version, WebSocketServer, WebSocketConnectionInfo, WebSocketConnectionAccept, WebSocketConnectionReject
}
const version = "1.0.1";
export default {
    Room,
    version,
    WebSocketTransport,
    WebsocketServerPeer
}
