import Logger from "./common/lib/Logger";
import ConfigHelper from "./common/utils/ConfigHelper";
import "./service/web_service"

const logger: Logger = new Logger("Bootstrap");
const config = ConfigHelper.config;

async function runApp() {
	try {
		logger.info("开始启动信令服务器,当前运行环境:%s", config.env);
		// 绑定未知异常处理逻辑
		process.on('uncaughtException', function (err) {
			logger.error("进程级别捕获到了未知异常,请及时分析解决该异常");
			logger.error("%O", err);
		});

		// 运行会议信令服务器
        await Servers.MeetingServer.getSigleton().start();

	} catch (error) {
		logger.error('run() [error:"%o"]', error);
		process.exit(1);
	}
}
runApp();