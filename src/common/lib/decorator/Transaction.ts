

/**
 * mysql 数据库事务注解
 * 类似于java spring的事物注解,通过切面添加事务,并捕获异常进行回滚
 * @returns 
 */
 export function Transaction(_target: any,_key:string,_descriptor:PropertyDescriptor){
       
    // const fn = descriptor.value;
    // descriptor.value = function() {
    //     try{
    //         fn()
    //     }catch(err){
    //     }
    // }
}