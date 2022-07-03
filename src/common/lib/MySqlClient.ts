import mysql, { MysqlError, Pool, PoolConnection } from "mysql";
import Logger from "./Logger";
import ConfigHelper from "../utils/ConfigHelper";

const logger = new Logger("MySqlClient");
const { config } = ConfigHelper;

/**
 * 单例模式mysql客户端
 * 外部不允许调用构造方法,只能使用静态方法:getInstance获取
 */
export default class MySqlClient {
    private _pool: Pool;
    private static _instance: MySqlClient;
    private constructor() {
        /*创建一个数据库连接池,由于是单例模式只会执行一次*/
        this._pool = mysql.createPool(config.mySqlOptions);
    }

    /**
     * 从连接池获取数据库连接
     */
    private getConnection(): Promise<PoolConnection> {
        return new Promise((resolve, reject) => {
            this._pool.getConnection((err: MysqlError, conn: PoolConnection) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(conn);
                return;
            });
        });
    }

    /**
   * 执行插入操作
   * @param sql
   */
    async executeInsert(sql: string, values: any[]): Promise<any> {
        if (!sql.startsWith("insert") && !sql.startsWith("INSERT")) {
            throw new Error("该Api只接受insert语句");
        }
        const connection = await this.getConnection();
        return new Promise((resolve, reject) => {
            connection.query(sql, values, (err, res) => {
                connection.release();
                if (err) {
                    logger.error("executeInsert出现错误,执行sql:%s", sql);
                    reject(err);
                    return;
                }
                resolve(res);
                return;
            });
        });
    }

    /**
     * 执行更新操作
     * @param sql
     */
    async executeUpdate(sql: string, values: any[]): Promise<any> {
        if (!sql.startsWith("update") && !sql.startsWith("UPDATE")) {
            throw new Error("该Api只接受update语句");
        }
        const connection = await this.getConnection();
        return new Promise((resolve, reject) => {
            connection.query(sql, values, (err, res) => {
                connection.release();
                if (err) {
                    logger.error("executeUpdate出现错误,执行sql:%s", sql);
                    reject(err);
                    return;
                }
                if (res.changedRows == 0 && res.affectedRows == 0) {
                    logger.warn("语句 %s 没有对数据库做出任何修改,参数%o", sql, values);
                }
                resolve(res);
                return;
            });
        });
    }

    /**
     * node里都可以用这一个完成所有的CRUD操作
     * 请使用executeSelect|Update|Insert 等方法代替
     * @deprecated
     * @param sql 
     */
    async executeSql(sql: string) {

        return this.executeSQL(sql);
    }
    /**
     * node里都可以用这一个完成所有的CRUD操作
     * 请使用executeSelect|Update|Insert 等方法代替
     * @deprecated
     * @param sql 
     */
    async executeSQL(sql: string) {
        if (sql.startsWith("select") || sql.startsWith("SELECT")) {

            throw new Error("该Api只接受update,delete,insert语句");
        }
        const connection = await this.getConnection();
        return new Promise((resolve, reject) => {
            connection.query(sql, (err, res) => {
                connection.release();
                if (err) {
                    logger.error("executeSQL出现错误,执行sql:%s", sql);
                    reject(err);
                    return;
                }
                if (res.changedRows == 0 && res.affectedRows == 0) {
                    logger.warn("修改语句 %s 没有对数据库做出任何修改", sql);
                }
                resolve(res);
                return;
            });
        });
    }


    /**
     * 执行查询语句
     * sql 语句必须以select 开头
     * @param sql 
     */
    async executeSelect(sql: string,values:any[] = []): Promise<any> {
        if (!sql.startsWith("select") && !sql.startsWith("SELECT")) {

            throw new Error("该Api只接受select语句查询");
        }
        const connection = await this.getConnection();
        return new Promise((resolve, reject) => {
            connection.query(sql,values, (err, res) => {
                connection.release();
                if (err) {
                    logger.error("executeSelect出现错误,执行sql:%s,%o", sql,values);
                    reject(err);
                    return;
                }
                if (res.length != 0) {
                    resolve(res);
                } else {
                    if(sql.toLocaleLowerCase().indexOf("meeting") < 0 ){
                        logger.warn("查询语句 %s 没有获取到查询结果",mysql.format(sql,values));
                    }
                    resolve(null);
                }
                return;
            });
        });
    }

    /**
     * 获取唯一的记录
     * sql 语句必须以select 开头,limit 1结尾
     * @param sql 
     */
    async getUnique(sql: string, values: any[] = []): Promise<any> {
        if (!sql.startsWith("select") && !sql.startsWith("SELECT")) {

            throw new Error("该Api只接受select语句查询");
        }
        if (!sql.endsWith("limit 1") && !sql.endsWith("LIMIT 1")) {

            throw new Error("该Api限制sql必须以limit 1结尾");
        }
        const connection = await this.getConnection();
        return new Promise((resolve, reject) => {
            connection.query(sql, values, (err, res) => {
                connection.release();
                if (err) {
                    logger.error("getUnique出现错误,执行sql:%s,%o", sql,values);
                    reject(err);
                    return;
                }
                if (res.length != 0) {
                    resolve(res[0]);
                } else {
                    if(sql.toLocaleLowerCase().indexOf("meeting_join_record") < 0){
                        logger.warn("Unique查询语句 %s 没有获取到查询结果",mysql.format(sql,values));
                    }
                    resolve(null);
                }
                return;
            });
        });
    }
    /**
     * 获取MySqlClient唯一实例
     */
    static getSingleton() {
        if (!MySqlClient._instance) {
            MySqlClient._instance = new MySqlClient();
        }
        return MySqlClient._instance;
    }
}