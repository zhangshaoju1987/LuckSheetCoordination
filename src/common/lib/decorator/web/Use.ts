import "reflect-metadata";
import { RequestHandler } from "express";
import {RequestHandlerMeta} from "./Request";
// import Logger from "../../lib/Logger";
// const logger = new Logger("Middleware");

/**
 * 使用中间件
 * 支持同时设置多个中间件
 * @param middleware 
 * @returns 
 */
export function Use(middleware:RequestHandler){

    //logger.info("开始构建中间件:%s",middleware.name);
    return function(target: any,key:string){

        const requestHandlerMetas:Map<string,RequestHandlerMeta> = Reflect.getMetadata("requestHandlerMetas",target)||new Map();
        const requestHandlerMeta = requestHandlerMetas.get(key)||{};
        
        // 一个请求可能有多个中间件,不能覆盖之前的,需要先提取出来
        const originMiddlewares:RequestHandler[] = requestHandlerMeta.middlewares ||[];
        originMiddlewares.push(middleware);

        // 覆盖原来的中间件
        requestHandlerMeta.middlewares = originMiddlewares;
        // 覆盖原来的meta
        requestHandlerMetas.set(key,requestHandlerMeta);

        Reflect.defineMetadata("requestHandlerMetas",requestHandlerMetas,target)
    }
}