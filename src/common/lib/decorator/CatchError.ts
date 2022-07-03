import "reflect-metadata";

/**
 * 捕获方法异常
 * 一般用于一些简单方法忽略异常
 * @param msg 
 * @returns 
 */
export function CatchError(msg:string){
    
    return function(_target: any,_key:string,descriptor:PropertyDescriptor){
       
        const fn = descriptor.value;
        descriptor.value = function() {
            try{
                fn()
            }catch(err){
                console.log(msg,err);
            }
        }
    }
}