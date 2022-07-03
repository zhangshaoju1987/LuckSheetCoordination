import "reflect-metadata";
import { RequestHandler } from "express";
import { HttpMethod ,RequestHandlerMeta} from "./Request";
import { ClassMethod, ClassMethodParameter} from "./Params";
import { Router } from "express";
import Logger from "../../Logger";
import WebRouters,{WebRouterKind} from "../../../server/WebRouters";


// 注解导出模块:向外统一导出所有注解（装饰器）模块
// node里叫装饰器,java里叫注解。


export * from "./Use";
export * from "./Request";
export * from "./Service";


const logger = new Logger("RegistWebService");
/**
 * 手动注册web服务（虽然可以完全自动化注册,但是太自动化会让项目不太可控,所以设计成手动模式,每次新增需要显示调用该api注册web服务）
 * @param clazzs 对应的web服务类
 */
export function RegistWebService(clazzs:any[]){

    clazzs.forEach((clazz:Function,_index)=>{

        const pt = clazz.prototype;
        const root = Reflect.getMetadata("root",pt);
        const routerKind:WebRouterKind = Reflect.getMetadata("routerKind",pt);
        const router:Router = WebRouters.getRouter(routerKind);
        const requestHandlerMetas:Map<string,RequestHandlerMeta> = Reflect.getMetadata("requestHandlerMetas",pt);
        const methods:Map<string,ClassMethod> = Reflect.getMetadata("methods",pt);
        logger.debug("开始注册%s服务;service=%s,base=%s",routerKind,clazz.name,root);
        for(let requestHandlerMeta of requestHandlerMetas.values()){
            
            const path:string|undefined = requestHandlerMeta.path;
            const method:HttpMethod|undefined = requestHandlerMeta.method;
            const handle = requestHandlerMeta.handle;
            const middlewares:RequestHandler[]|undefined = requestHandlerMeta.middlewares;
            
            if(path && method){
                const fullPath = root === "/" ? path : `${root}${path}`;
                if(middlewares && middlewares.length > 0){
                    logger.debug("开始注册路由:%s,中间件个数:%s",fullPath,middlewares.length);
                    router[method](fullPath,...middlewares,handle); // 构造路由
                }else{
                    logger.debug("开始注册路由:%s",fullPath);
                    router[method](fullPath,handle); // 构造路由
                }
                if (methods) {
                    for (let classMethod of methods.values()) {
                       let classMethodParameters:ClassMethodParameter[] = classMethod.params;
                       if (classMethodParameters) {
                            let params:any[] = [];
                            router[method](fullPath,(req, res) => {
                                for (let classMethodParameter of classMethodParameters.values()) {
                                    if (classMethodParameter.paramType === 'path') {
                                        params.push(req.params[classMethodParameter.paramName]);
                                    }
                                }
                                params.unshift(res);
                                params.unshift(req);
                                pt[classMethod.methodName].apply(pt, params);
                            });
                       }
                    }
                }
            }
        }
    });
}