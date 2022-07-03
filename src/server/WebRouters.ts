import { Router } from "express";
import Logger from "../common/lib/Logger";
import CommonUtils from "../common/utils/CommonUtils";

const logger = new Logger("WebRouterKind");
/**
 * @description
 */
export enum WebRouterKind {
    LUCKSHEET_COORDINATION = "lucky_sheet-coordination"
}
const routers:Map<String,Router> = new Map<string,Router>();
/**
 * @param kind 
 * @returns 
 */
export function getRouter(kind:WebRouterKind):Router{

    let router = routers.get(kind);
    if(!router){
        logger.debug("Create WebRouter:%s",kind);
        router = Router();
        router.all("*",(req,_res,next)=>{
            logger.info("Process %s,Router%sGot request:%s,ip=%s",process.pid,kind,req.url,CommonUtils.getClientIp(req));
            next();
        });
        routers.set(kind,router);
    }
    return router;
}

export default {
    WebRouterKind,
    getRouter
}