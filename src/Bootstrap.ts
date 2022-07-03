import Logger from "./common/lib/Logger";
import ConfigHelper from "./common/utils/ConfigHelper";
import LuckSheetCoordinationServer from "./server/LuckSheetCoordinationServer";

const logger: Logger = new Logger("Bootstrap");
const config = ConfigHelper.config;

logger.info("Start LuckSheetCoordinationServer, current enviroment is:%s", config.env);
process.on('uncaughtException', function (err) {
	logger.error("uncaughtException at process level, you must pay attentation to it");
	logger.error("%O", err);
});
LuckSheetCoordinationServer.getSigleton().start();