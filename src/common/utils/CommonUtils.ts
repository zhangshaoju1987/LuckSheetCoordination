import redis, { RedisClient } from "redis";
import moment, { Moment } from "moment";
import crypto from "crypto";
// import apn,{Provider} from "apn";
import { Request } from "express";
import ConfigHelper from "./ConfigHelper";
import Logger from "../lib/Logger";
import { IPRegion, LoginUser } from "../types";
const { config } = ConfigHelper;
// const apnProvider:Provider = new apn.Provider(config.apple_provider_info);
const redisClient = redis.createClient(config.redisOptions);
const ipSearcher = require('node-ip2region').create();

/**
 * 重写默认的ISO日期
 */
Date.prototype.toISOString = function () {
    return moment().format("YYYY-MM-DD HH:mm:ss.SSS");
};

const logger = new Logger('CommonUtils');
/**
 * 返回apple的apn实例
 * @returns 
 */
// function getApnProvider ():Provider {
//     return apnProvider;
// }

/**
 * 检查统一社会信用代码证是否合法
 * @param uscc 统一社会信用代码证
 * @returns 
 */
function checkUSCC(uscc: string | undefined) {
    if (!uscc) {
        return false;
    }
    let patrn = /^[0-9A-Z]+$/
    if (!patrn.test(uscc) || ![15, 18].includes(uscc.trim().length)) {
        return false;
    } else {
        if (uscc.length == 15) {
            if (/\d{15}/.test(uscc)) {
                return true;
            } else {
                return false;
            }
        } else {
            let anCode, // 统一社会信用代码的每一个值
                anCodeValue, // 统一社会信用代码每一个值的权重
                total = 0;
            let weightedFactors = [1, 3, 9, 27, 19, 26, 16, 17, 20, 29, 25, 13, 8, 24, 10, 30, 28]; //加权因子
            let str = '0123456789ABCDEFGHJKLMNPQRTUWXY';
            for (var i = 0; i < uscc.length - 1; i++) {
                anCode = uscc.substring(i, i + 1)
                anCodeValue = str.indexOf(anCode)
                total = total + anCodeValue * weightedFactors[i]
            }
            //权重与加权因子相乘之和
            let logicCheckCode = String(31 - (total % 31))
            if (logicCheckCode == '31') {
                logicCheckCode = '0'
            }
            //非 I O Z S V
            let Str = '0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F,G,H,J,K,L,M,N,P,Q,R,T,U,W,X,Y';
            let Array_Str = Str.split(',')
            logicCheckCode = Array_Str[parseInt(logicCheckCode)]
            let checkCode = uscc.substring(17, 18)
            if (logicCheckCode != checkCode) {
                return false;
            } else {
                return true;
            }
        }
    }
}



/**
 * 计算MD5
 * @param str 
 * @returns 
 */
function md5(str: string): string {

    var md5 = crypto.createHash('md5');
    var result = md5.update(str).digest('hex');
    return result;
}
/**
 * 获取指定范围的随机值
 * @param {number} min 
 * @param {number} max 
 */
function getRandomNumBetweenAnd(min: number, max: number): number {

    return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * 创建一个随机的会议号(风格类似于手机号)
 */
function createNewMeetingNo(): string {

    const first: number = getRandomNumBetweenAnd(600, 619);         // 注册用户小于200w时,超过200w时改成620~639
    const second: number = getRandomNumBetweenAnd(1000, 9999);
    const third: number = getRandomNumBetweenAnd(1009, 9999);

    return `${first}-${second}-${third}`;
}

/**
 * 创建一个随机的会议号(风格类似于手机号)
 */
function createRandomAccessCodeOfDesktop(): string {

    const first = getRandomNumBetweenAnd(1000, 9999);
    const second = getRandomNumBetweenAnd(1000, 9999);
    const third = getRandomNumBetweenAnd(1009, 9999);

    return `${first}-${second}-${third}`;
}

/**
 * 
 * @returns 
 */
function getRedisClient(): RedisClient {
    return redisClient;
}
/**
 * 获取redis的key
 * @param {String} key 
 */
async function redisGet(key: string): Promise<string | null> {
    const redisClient = getRedisClient();
    return new Promise((resolve) => {
        redisClient.get(key, (error, str: string | null) => {
            if (error) {
                logger.error("%O", error);
                resolve(null);
            } else {
                logger.info("redis-> %s ---> %s", key, str);
                resolve(str);
            }
        });
    });
}

/**
 * 获取redis的key
 * 像Redis,Mysql,JSON这种存储动态类型数据的,接口返回最好是any,不要写成object。any可以灵活的按实际情况转向任何类型
 * @param {String} key 
 */
async function redisGetObject(key: string): Promise<any> {
    const redisClient = getRedisClient();
    return new Promise((resolve) => {
        redisClient.get(key, (error, str: string | null) => {
            if (error) {
                logger.error("查询redis出现错误%O",error);
                resolve(null);
            }else if(!str){
                logger.error("redis查询数据为空key=%s",key);
                resolve(null);
            } else {
                resolve(JSON.parse(str));
            }
        });
    });
}

/**
 * 获取当前时间(moment识别的日期格式掩码和java不太一样)
 */
function getNowInStringFormat(): string {

    return moment().format("YYYY-MM-DD HH:mm:ss");
}

/**
 * 根据小时数推演基于当前时间的时间点 <br>
 * 正数:向前推算时间（早于当前时间）<br>
 * 负数:向后推算时间（晚于当前时间）<br>
 */
function calcTimeByHour(hours: number): string {

    return moment().subtract(hours, "hours").format("YYYY-MM-DD HH:mm:ss");
}

/**
 * 根据月份数推演基于当前时间的时间点 <br>
 * 正数:向前推算时间（早于当前时间）<br>
 * 负数:向后推算时间（晚于当前时间）<br>
 */
function calcTimeByMonth(months: number): string {

    return moment().subtract(months, "months").format("YYYY-MM-DD HH:mm:ss");
}

/**
 * 根据秒数推演基于当前时间的时间点 <br>
 * 正数:向前推算时间（早于当前时间）<br>
 * 负数:向后推算时间（晚于当前时间）<br>
 */
function calcTimeBySeconds(minutes: number): string {

    return moment().subtract(minutes, "seconds").format("YYYY-MM-DD HH:mm:ss");
}

/**
 * 根据天数推演基于当前时间的时间点 <br>
 * 正数:向前推算时间（早于当前时间）<br>
 * 负数:向后推算时间（晚于当前时间）<br>
 */
function calcTimeByDays(days: number): string {

    return moment().subtract(days, "d").format("YYYY-MM-DD HH:mm:ss");
}

/**
 * 将字符串转化为日期
 */
function str2Day(day: string): Moment {

    return moment(day, "YYYY-MM-DD");
}

/**
 * 将字符串转化为日期时间
 */
function str2Datetime(datetime: string): Moment {

    return moment(datetime, "YYYY-MM-DD HH:mm:ss");
}

/**
 * 两个时间之间的秒数,不区分前后,返回绝对值
 * @param {String} datetime1 
 * @param {String} datetime2 
 */
function secondsBetween(datetime1: string, datetime2: string): number {

    if (!datetime1 || !datetime1) {
        throw new Error("参数不合法");
    }
    const d1 = moment(datetime1, "YYYY-MM-DD HH:mm:ss");
    const d2 = moment(datetime2, "YYYY-MM-DD HH:mm:ss");
    return Math.abs(d1.diff(d2, "seconds"));

}

/**
 * 两个时间之间的分钟数,不区分前后,返回绝对值
 * @param {String} datetime1 
 * @param {String} datetime2 
 */
function minutesBetween(datetime1: string, datetime2: string): number {

    if (!datetime1 || !datetime1) {
        throw new Error("参数不合法datetime1=[" + datetime1 + "],datetime2=[" + datetime2 + "]");
    }
    const d1 = moment(datetime1, "YYYY-MM-DD HH:mm:ss");
    const d2 = moment(datetime2, "YYYY-MM-DD HH:mm:ss");
    return Math.abs(d1.diff(d2, "minutes"));

}

/**
 * 两个时间之间的天数,不区分前后,返回绝对值
 * @param {String} datetime1 
 * @param {String} datetime2 
 */
function daysbetween(datetime1: string, datetime2: string): number {

    if (!datetime1 || !datetime1) {
        throw new Error("参数不合法");
    }
    const d1 = moment(datetime1, "YYYY-MM-DD HH:mm:ss");
    const d2 = moment(datetime2, "YYYY-MM-DD HH:mm:ss");
    return Math.abs(d1.diff(d2, "days"));

}

/**
 * 暂停指定的时间(毫秒)
 */
async function sleep(ms: number): Promise<any> {

    return new Promise((resolve) => setTimeout(() => {resolve({}) }, ms));
}

/**
 * 根据token获取登录用户
 * @param {String} token 
 */
async function getLoginUser(token: string | any): Promise<LoginUser | null> {

    if (!token) {
        return Promise.resolve(null);
    }
    const sessionId = "SessionID_" + token;
    const userInfo = await redisGetObject(sessionId);
    if (userInfo) {
        //重新延长登录时间
        logger.debug("延迟sessionId " + sessionId);
        getRedisClient().expire(sessionId, config.session.timeout);
        return Promise.resolve(userInfo);
    } else {
        logger.error("sessionId过期了 " + sessionId);
        return Promise.resolve(null);
    }
}


/**
 * 使用aes256gcm进行加解密操作
 * @param {string} key 32 位 的密钥
 * @returns
 */
function aes256gcm(key: string){

    const ALGO = 'aes-256-gcm';

    /**
     * encrypt returns base64-encoded ciphertext
     * @param str 
     * @returns 
     */
    const encrypt = (str: string) => {
        // Hint: the `iv` should be unique (but not necessarily random).
        // `randomBytes` here are (relatively) slow but convenient for demonstration.
        const iv: any = Buffer.from(crypto.randomBytes(16));
        const cipher = crypto.createCipheriv(ALGO, key, iv);

        // Hint: Larger inputs (it's GCM, after all!) should use the stream API
        let enc: string = cipher.update(str, 'utf8', 'base64');
        enc += cipher.final('base64');
        return [enc, iv, cipher.getAuthTag()];
    };

    /**
     * decrypt decodes base64-encoded ciphertext into a utf8-encoded string
     * @param enc 
     * @param iv 
     * @param authTag 
     * @returns 
     */
    const decrypt = (enc: string, iv: crypto.BinaryLike, authTag: NodeJS.ArrayBufferView) => {
        const decipher = crypto.createDecipheriv(ALGO, key, iv);
        decipher.setAuthTag(authTag);
        let str = decipher.update(enc, 'base64', 'utf8');
        str += decipher.final('utf8');
        return str;
    };

    return {
        encrypt,
        decrypt,
    };
};


/**
* 使用aes128gcm进行加解密操作
* @param {string} key 16 位 的密钥
* @returns
*/
function aes128gcm(key: string) {

    const ALGO = 'aes-128-gcm';

    // encrypt returns base64-encoded ciphertext
    const encrypt = (str: string) => {
        // Hint: the `iv` should be unique (but not necessarily random).
        // `randomBytes` here are (relatively) slow but convenient for
        // demonstration.
        const iv = Buffer.from(crypto.randomBytes(16));
        const cipher = crypto.createCipheriv(ALGO, key, iv);

        // Hint: Larger inputs (it's GCM, after all!) should use the stream API
        let enc = cipher.update(str, 'utf8', 'base64');
        enc += cipher.final('base64');
        return [enc, iv, cipher.getAuthTag()];
    };

    // decrypt decodes base64-encoded ciphertext into a utf8-encoded string
    const decrypt = (enc: string, iv: Buffer, authTag: NodeJS.ArrayBufferView) => {
        const decipher = crypto.createDecipheriv(ALGO, key, iv);
        decipher.setAuthTag(authTag);
        let str = decipher.update(enc, 'base64', 'utf8');
        str += decipher.final('utf8');
        return str;
    };

    return {
        encrypt,
        decrypt,
    };
};

/**
 * 返回指定长度的密钥（base64字符串）
 * @param {*} len 密钥的长度8(aes64gcm),16(aes128gcm),32(aes256gcm)
 */
function createAesGCMKey(len: number): string {
    if (len !== 8 && len !== 16 && len !== 32) {
        throw new Error("不支持的密钥长度:" + len);
    }
    const KEY = Buffer.from(crypto.randomBytes(len));
    return KEY.toString("base64");
}

/**
 * aes加密
 * @param {String} data 
 * @param {String} key 
 * @returns 
 */
function aesEncrypt(data: string, key: string) {
    const cipher = crypto.createCipher('aes256', key,);
    var crypted = cipher.update(data, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
}

/**
 * aes解密
 * @param {String} encrypted 
 * @param {String} key 
 * @returns 
 */
function aesDecrypt(encrypted: string, key: string) {
    const decipher = crypto.createDecipher('aes256', key);
    var decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

/**
 * 打乱一个数组
 * @param {Array} arr 
 * @returns 
 */
function shuffleArray(arr: []) {
    var i = arr.length, t, j;
    if (i <= 1) {
        return; // 曾经这里出现过死循环的bug,i==0时
    }
    while (--i) {
        j = Math.floor(Math.random() * i);
        t = arr[i];
        arr[i] = arr[j];
        arr[j] = t;
    }
}
/**
 * Express框架下获取客户端ip
 * @param {Request} req 
 * @returns 
 */
function getClientIp(req: Request) {
    return req.headers['x-forwarded-for'] || req.socket.remoteAddress
}

/**
 * ip地址转换成区域信息
 * @param ip 
 * @returns 
 */
function ip2Region(ip:string):IPRegion|null{

    try{
        const region:string = ipSearcher.memorySearchSync(ip);
        const strs :string[] = region.split("|");
        const ipRegion:IPRegion = {
            ip,
            country:strs[0],
            provice:strs[2],
            city:strs[3],
            isp:strs[4]
        }
        return ipRegion;
    }catch(err){
        logger.error("ip地址有问题:%O",err);
        return null;
    }
}

/**
 * 是否包含非法字符
 * @param str0 
 */
function hasIllegalChar(str0: any) {

    const str:string = str0+"";
    if (str.toLowerCase().indexOf("@") != -1 ||
        str.toLowerCase().indexOf("*") != -1 ||
        str.toLowerCase().indexOf("null") != -1 ||
        str.toLowerCase().indexOf("undefined") != -1 ||
        str.toLowerCase().indexOf("void") != -1 ||
        str.toLowerCase().indexOf("#") != -1 ||
        str.toLowerCase().indexOf(".") != -1 ||
        str.toLowerCase().indexOf("+") != -1 ||
        str.toLowerCase().indexOf("&") != -1 ||
        str.toLowerCase().indexOf("|") != -1 ||
        str.toLowerCase().indexOf("-") != -1 ||
        str.toLowerCase().indexOf("!") != -1 ||
        str.toLowerCase().indexOf("%") != -1 ||
        str.toLowerCase().indexOf("~") != -1 ||
        str.toLowerCase().indexOf("'") != -1 ||
        str.toLowerCase().indexOf("\"") != -1 ||
        str.toLowerCase().indexOf("裸") != -1 ||
        str.toLowerCase().indexOf("赌") != -1 ||
        str.toLowerCase().indexOf("毒") != -1 ||
        str.toLowerCase().indexOf("热线") != -1 ||
        str.toLowerCase().indexOf("接待") != -1 ||
        str.toLowerCase().indexOf("客服") != -1 ||
        str.toLowerCase().indexOf("财富") != -1 ||
        str.toLowerCase().indexOf("人工") != -1 ||
        str.toLowerCase().indexOf("服务") != -1 ||
        str.toLowerCase().indexOf("股票") != -1 ||
        str.toLowerCase().indexOf("期货") != -1 ||
        str.toLowerCase().indexOf("公安") != -1 ||
        str.toLowerCase().indexOf("政治") != -1 ||
        str.toLowerCase().indexOf("国家") != -1 ||
        str.toLowerCase().indexOf("政府") != -1 ||
        str.toLowerCase().indexOf("检察") != -1 ||
        str.toLowerCase().indexOf("监察") != -1 ||
        str.toLowerCase().indexOf("专线") != -1 ||
        str.toLowerCase().indexOf("银行") != -1 ||
        str.toLowerCase().indexOf("交易") != -1 ||
        str.toLowerCase().indexOf("中心") != -1 ||
        str.toLowerCase().indexOf("近平") != -1 ||
        str.toLowerCase().indexOf("经理") != -1 ||
        str.toLowerCase().indexOf("币") != -1 ||
        str.toLowerCase().indexOf("订单") != -1 ||
        str.toLowerCase().indexOf("助理") != -1 ||
        str.toLowerCase().indexOf("and") != -1 ||
        str.toLowerCase().indexOf("or") != -1 ||
        str.toLowerCase().indexOf("rm") != -1 ||
        str.toLowerCase().indexOf("select") != -1 ||
        str.toLowerCase().indexOf("update") != -1 ||
        str.toLowerCase().indexOf("delete") != -1 ||
        str.toLowerCase().indexOf("insert") != -1 ||
        str.toLowerCase().indexOf("false") != -1 ||
        str.toLowerCase().indexOf("true") != -1 ||
        str.toLowerCase().indexOf("1=1") != -1 ||
        str.toLowerCase().indexOf("truncate") != -1||
        str.toLowerCase().trim().endsWith("总") ||
        str.toLowerCase().trim().startsWith("小") 
    ) {
        return true;
    }

    // 防止哈哈，呵呵，丽丽，张张之类的名称
    if(str.length >= 2 && str[0] == str[1]){
        return true;
    }

    return false;
}

/**
 * 是否是数字
 * @param val 
 * @returns 
 */
function isNumber(val: any) {
    if (typeof val == "number") {
        return true;
    }
    if (val.trim() == "") {
        return false;
    }
    return !isNaN(val);
}

/**
 * 字符串是否以数字开头
 * @param val 
 */
function startsWithNumber(str:string){
    if(!str || str.trim().length == 0){
        return false;
    }
    const first = str.trim().charAt(0);
    return isNumber(first);
}

export default {
    startsWithNumber,
    isNumber,
    hasIllegalChar,
    getClientIp,
    shuffleArray,
    aesDecrypt,
    aesEncrypt,
    aes128gcm,
    aes256gcm,
    createAesGCMKey,
    // getApnProvider,
    getRandomNumBetweenAnd,
    createRandomAccessCodeOfDesktop,
    createNewMeetingNo,
    redisGet,
    redisGetObject,
    getRedisClient,
    sleep,
    getNowInStringFormat,
    calcTimeByHour,
    calcTimeByMonth,
    calcTimeBySeconds,
    calcTimeByDays,
    str2Datetime,
    str2Day,
    secondsBetween,
    minutesBetween,
    daysbetween,
    getLoginUser,
    md5,
    createMeetingNoByMobile,
    checkUSCC,
    ip2Region
}