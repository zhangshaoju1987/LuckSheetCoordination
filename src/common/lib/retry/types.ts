export interface RetryOptions {
    retries?: number,
    factor?: number,
    minTimeout?: number,
    maxTimeout?: number,
    randomize?: boolean,
    forever?: boolean,
    unref?: Function,
    maxRetryTime?: number
}

export interface Counts{
    [propName:string]:number
}

/**
 * 超时行为
 */
export interface TimeoutOpt{
    /**
     * 超时时间,毫秒数
     */
    timeout:number,
    cb:Function
}