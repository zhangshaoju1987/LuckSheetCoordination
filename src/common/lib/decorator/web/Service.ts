import "reflect-metadata";
import {WebRouterKind} from "../../../server/WebRouters";

/**
 * https://www.cnblogs.com/winfred/p/8260885.html
 * @param root 配置在controller上的根路径
 * @param router 使用指定路由（存在多个web服务器,路由也有多个）
 * @returns 
 */
export function Service(root:string,routerKind:WebRouterKind) : ClassDecorator{
    return function(constructor: Function ){

        Reflect.defineMetadata("root",root,constructor.prototype);
        Reflect.defineMetadata("routerKind",routerKind,constructor.prototype);
    }
}