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
    }
}