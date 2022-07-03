import "reflect-metadata";
import { RequestHandler } from "express";

import Logger from "../../Logger";
const logger = new Logger("HttpRequest");


export enum HttpMethod  {
    GET = "get",
    POST = "post",
    OPTIONS = "options",
    PUT = "put",
    DELETE = "delete",
    PATCH = "patch",
    TRACE = "trace",
    CONNECT= "connect",
    HEAD = "head",
    All = "all"
}

export interface RequestHandlerMeta{
    path?:string,
    method?:HttpMethod,
    handle?:any,
    middlewares?:RequestHandler[]
}


/**
 * 返回指定请求的装饰器
 * @param method 
 * @returns 
 */
function getRequestDecorator(method:HttpMethod){

    logger.debug("创建Http请求:%s",method);
    return function(path:string){
        return function(target:any,key:string,descriptor:PropertyDescriptor){
            
            const requestHandlerMetas:Map<string,RequestHandlerMeta> = Reflect.getMetadata("requestHandlerMetas",target)||new Map();
            const requestHandlerMeta = requestHandlerMetas.get(key)||{};

            // 一个请求只执行一次,直接覆盖
            requestHandlerMeta.method = method;
            requestHandlerMeta.path = path;
            requestHandlerMeta.handle = descriptor.value;

            // 将覆盖后的元数据设置回去
            requestHandlerMetas.set(key,requestHandlerMeta);

            // 保存到metadata
            Reflect.defineMetadata("requestHandlerMetas",requestHandlerMetas,target);
        }
    }
}

/**
 * 将一个方法标记成Get请求处理器
 */
export const Get = getRequestDecorator(HttpMethod.GET);
/**
 * 将一个方法标记成Post请求处理器
 */
export const Post = getRequestDecorator(HttpMethod.POST);
/**
 * 将一个方法标记成Options请求处理器
 */
 export const Options = getRequestDecorator(HttpMethod.OPTIONS);
 /**
 * 将一个方法标记成Put请求处理器
 */
  export const Put = getRequestDecorator(HttpMethod.PUT);
/**
 * 将一个方法标记成Delete请求处理器
 */
export const Delete = getRequestDecorator(HttpMethod.DELETE);
/**
 * 将一个方法标记成Patch请求处理器
 */
 export const Patch = getRequestDecorator(HttpMethod.PATCH);
 /**
 * 将一个方法标记成Patch请求处理器
 */
export const Trace = getRequestDecorator(HttpMethod.TRACE);
/**
 * 将一个方法标记成Patch请求处理器
 */
export const Connect = getRequestDecorator(HttpMethod.CONNECT);
/**
 * 将一个方法标记成Patch请求处理器
 */
export const Head = getRequestDecorator(HttpMethod.HEAD);

/**
 * 将一个方法标记成Patch请求处理器
 */
 export const All = getRequestDecorator(HttpMethod.All);