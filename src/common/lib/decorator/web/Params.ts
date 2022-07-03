import "reflect-metadata";
import Logger from "../../Logger";

const logger = new Logger("Params");


export interface ClassMethodParameter{
    paramType:string,
    paramName:string,
    paramIndex:number
}

/**
 * 对类方法的封装
 */
export interface ClassMethod{

    methodName:string,
    params:ClassMethodParameter[]
}

/**
 * 
 * @param paramType 参数的业务类型
 * @param paramName 参数名称
 * @returns 
 */
let ParamFactory = (paramType: string, paramName: string) => {
    // 最后一个参数先得到增强，paramIndex会从大到小出现，paramIndex从0开始，第一个参数为0
    return (target:any, methodName: string, paramIndex: number) => {
        
        logger.info("检测到%s类型的参数[%s]增强，目标对象为:方法%s的第%d个参数，目标对象%s",paramType,paramName,methodName,paramIndex,target);
        const methods:Map<string,ClassMethod> = Reflect.getMetadata("methods",target)||new Map();
        
        const classMethod = methods.get(methodName)||{methodName,params:[]};
        const classMethodParameter:ClassMethodParameter = {paramType,paramName,paramIndex}
        // 因为是paramIndex是从后往前的，所以采用前插的策略
        classMethod.params.unshift(classMethodParameter);
        methods.set(methodName, classMethod);
        // 将需要按业务要求进行增强的参数绑定到原型上
        Reflect.defineMetadata("methods",methods,target);

    }
}
/**
 * 
 * @param paramType 参数的业务类型
 * @returns 
 */
let MethodParamFactory = (paramType: string) => {
    return (paramName: string) => {
        return ParamFactory(paramType, paramName)
    }
}

/**
 * 
 * list(@PathParam('name') name:string)
 * 
 */
export let PathParam = MethodParamFactory('path');