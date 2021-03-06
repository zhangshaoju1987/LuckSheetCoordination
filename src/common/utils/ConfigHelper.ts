import config1 from "../../config";
import Logger from "../lib/Logger";

const logger = new Logger("ConfigHelp");

let config = config1;

let configPath = process.env.LuckSheetCoordinationServerConfigPath;
if(configPath){
    logger.info("Command line parameters:%s",process.argv.join(","));
    logger.info("Load configuration file from deploy path:"+configPath+"[Please make sure this path is exists and readable]");
    try{
        config      = require(configPath+"/config");
    }catch(error){
        logger.error("Got error when loading configuration file:%O",error);
        process.exit(1);
    }
}else{
    logger.info("Loading configuration file from relative path :"+"../../config");
}
export default  {
    config
}