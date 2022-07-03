import {RetryOptions} from "./types";
import RetryOperation from "./RetryOperation";

/**
 * https://github.com/vercel/async-retry
 * 重试的配置选项
 */

export function operation(options: RetryOptions) {
    var timeouts = _timeouts(options);
    return new RetryOperation(timeouts, {
        forever     : options && (options.forever || options.retries === Infinity),
        unref       : options && options.unref,
        maxRetryTime: options && options.maxRetryTime
    });
};

/**
 * 基于重试配置规划超时时间
 * @param options 
 * @returns 
 */
export function _timeouts(options: RetryOptions) {

    var opts: RetryOptions = {
        retries: 10,
        factor: 2,
        minTimeout: 1 * 1000,
        maxTimeout: Infinity,
        randomize: false
    };
    Object.assign(opts, options);
    if ((opts.minTimeout as number) > (opts.maxTimeout as number)) {
        throw new Error('配置选项设置不合理:最小超时时间大于最大超时时间');
    }

    var timeouts = [];
    for (var i = 0; i < (opts.retries as number); i++) {// 按重试次数进行重试的策略
        timeouts.push(createTimeout(i, opts));
    }

    if (options && options.forever && !timeouts.length) {// 一直重试的策略
        timeouts.push(createTimeout(i, opts));
    }

    timeouts.sort((a, b) => { return a - b; });// 超时时间按升序排列

    return timeouts;
}

/**
 * 创建一个超时时间
 * @param attempt 
 * @param opts 
 * @returns 
 */
export function createTimeout(attempt: number, opts: RetryOptions) {
    var random = (opts.randomize) ? (Math.random() + 1) : 1;

    var timeout = Math.round(random * Math.max((opts.minTimeout as number), 1) * Math.pow((opts.factor as number), attempt));
    timeout = Math.min(timeout, (opts.maxTimeout as number));

    return timeout;
}