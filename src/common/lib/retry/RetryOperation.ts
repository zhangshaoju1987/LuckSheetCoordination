import { RetryOptions,Counts,TimeoutOpt } from "./types";

/**
 * 
 */
export default class RetryOperation {
    private _originalTimeouts: number[];
    private _timeouts: number[];
    private _options: RetryOptions;
    private _maxRetryTime: number;
    /**
     * 如果联合类型有一个是方法类型时,要用括号括起来
     */
    private _fn: ( (attempts:number)=>void )| null;
    private _errors: Error[];
    private _attempts: number;
    private _operationTimeout: any;
    private _operationTimeoutCb: any;
    private _timeout: NodeJS.Timeout | null;
    private _operationStart: number|undefined;
    private _timer: NodeJS.Timeout | null;
    private _cachedTimeouts: number[] | null | undefined;

    constructor(timeouts: number[], options: RetryOptions) {
        this._originalTimeouts = JSON.parse(JSON.stringify(timeouts));
        this._timeouts = timeouts;
        this._options = options || {};
        this._maxRetryTime = options && options.maxRetryTime || Infinity;
        this._fn = null;
        this._errors = [];
        this._attempts = 1;
        this._operationTimeout = null;
        this._operationTimeoutCb = null;
        this._timeout = null;
        this._timer = null;

        if (this._options.forever) {
            this._cachedTimeouts = this._timeouts.slice(0);
        }
    }
    reset() {
        this._attempts = 1;
        this._timeouts = this._originalTimeouts.slice(0);
    }
    stop() {
        if (this._timeout) {
            clearTimeout(this._timeout);
        }
        if (this._timer) {
            clearTimeout(this._timer);
        }

        this._timeouts = [];
        this._cachedTimeouts = null;
    }
    /**
     * @param err 
     * @returns 
     */
    retry(err: Error|undefined = undefined) {
        if (this._timeout) {
            clearTimeout(this._timeout);
        }

        if (!err) {
            return false;
        }
        var currentTime = new Date().getTime();
        if (err && currentTime - (this._operationStart as number) >= this._maxRetryTime) {
            this._errors.push(err);
            this._errors.unshift(new Error('RetryOperation timeout occurred'));
            return false;
        }

        this._errors.push(err);

        var timeout = this._timeouts.shift();
        if (timeout === undefined) {
            if (this._cachedTimeouts) {
                // retry forever, only keep last error
                this._errors.splice(0, this._errors.length - 1);
                timeout = this._cachedTimeouts.slice(-1)[0];
            } else {
                return false;
            }
        }

        var self = this;
        this._timer = setTimeout(function () {
            self._attempts++;

            if (self._operationTimeoutCb) {
                self._timeout = setTimeout(function () {
                    self._operationTimeoutCb(self._attempts);
                }, self._operationTimeout);

                if (self._options.unref) {
                    self._timeout.unref();
                }
            }

            self._fn && self._fn(self._attempts);
        }, timeout);

        if (this._options.unref) {
            this._timer.unref();
        }
        return true;
    }
    /**
     * 通过该方法来调用需要重试的业务逻辑方法
     * @param fn 在这里调用需要失败重试的业务方法
     * @param timeoutOps 
     */
    attempt(fn:(attempts:number)=>void, timeoutOps:TimeoutOpt|undefined = undefined){
        
        this._fn = fn;
        if (timeoutOps) {
            if (timeoutOps.timeout) {
                this._operationTimeout = timeoutOps.timeout;
            }
            if (timeoutOps.cb) {
                this._operationTimeoutCb = timeoutOps.cb;
            }
        }

        var self = this;
        if (this._operationTimeoutCb) {
            this._timeout = setTimeout(function () {
                self._operationTimeoutCb();
            }, self._operationTimeout);
        }

        this._operationStart = new Date().getTime();

        this._fn(this._attempts);
    }
    /**
     * @deprecated
     * @param fn 
     */
    try(fn:any) {
        this.attempt(fn);
    }
    /**
     * @deprecated
     * @param fn 
     */
    start(fn:any){
        this.attempt(fn);
    }

    errors(){
        
        return this._errors;
    }
    attempts(){

        return this._attempts;
    }

    mainError(){
        if (this._errors.length === 0) {
            return null;
        }
    
        var counts:Counts = {};
        var mainError = null;
        var mainErrorCount = 0;
    
        for (var i = 0; i < this._errors.length; i++) {
            var error = this._errors[i];
            var message = error.message;
            var count = (counts[message] || 0) + 1;
    
            counts[message] = count;
    
            if (count >= mainErrorCount) {
                mainError = error;
                mainErrorCount = count;
            }
        }
        return mainError;
    }
}