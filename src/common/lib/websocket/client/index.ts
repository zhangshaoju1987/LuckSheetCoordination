import WebsocketClientPeer from "./Peer";
import WebSocketTransport from "./transports/WebSocketTransport"
import {SOCKET_OPTIONS} from "./transports/WebSocketTransport";

const version = "1.0.1";
export {
    WebsocketClientPeer,
    SOCKET_OPTIONS
}
export default {
    version,
    WebSocketTransport
};
