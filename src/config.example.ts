export default  {
    env:"test",
    redis:{
        channel:"redis.channel" ,
        connection:{
            host:"127.0.0.1",
            port:6379,
            password:"123456"
        },
        pool:{
            
        }
    },
    mongodb:{
        uri:""
    },
    sheet:{
        row_size:500,
        col_size:500
    },
    web_server:{
        /**如果为false，则为https必须配置tls证书 */
        isHttpOnly:false,
        listeningHost:'0.0.0.0',
        listeningPort:10002,
        tls       :
        {
            cert : `证书路径`,
            key  : `密钥路径`
        },
    },
}