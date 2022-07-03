#!/bin/bash

cd `dirname $0`
BIN_DIR=`pwd`
cd ..
DEPLOY_DIR=`pwd`
CONF_DIR=${DEPLOY_DIR}/conf
PLUGIN_DIR=${DEPLOY_DIR}/plugins
CONF_FILE=${CONF_DIR}/config.js
EXEC_FILENAME="LuckSheet_CoordinationServer"
EXEC_FILE=${BIN_DIR}/${EXEC_FILENAME}
LOG_DIR=${DEPLOY_DIR}/log
LOG_FILE=${LOG_DIR}/${EXEC_FILENAME}.log
LIB_DIR=${DEPLOY_DIR}/lib


# 检查运行用户
RUN_USER=`whoami`
if [ ${RUN_USER} != "bigbrain_media" ]
then
    echo -e "\e[31m 为了大规模部署时,便于管理,我们限制只能使用[bigbrain_media]用户(su bigbrain_media)运行,如果没有请创建该用户"
    echo -e "\e[35m 对于Ubuntu系统(推荐18.4),使用命令: sudo useradd -m -s /bin/bash bigbrain_media"
    exit 1;
fi

# 限制运行目录
if [ ${DEPLOY_DIR} != "/opt/bigbrain_signaling-server" ]
then
    echo -e "\e[31m 为了大规模部署时,便于管理,我们限制只能部署在目录:[/opt/bigbrain_signaling-server],有如下目录结构;(bin|lib|log|conf)下 \e[0m"
    exit 1
fi

# 检查文件
if [ ! -f ${EXEC_FILE} ]
then
    echo -e "\e[31m 找不到主程序:${EXEC_FILE} \e[0m"
    exit 1  
fi

if [ ! -f ${CONF_FILE} ]
then
    echo -e "\e[31m 缺失配置文件:${CONF_FILE} \e[0m"
    exit 1  
fi
echo -e "\e[33m 使用配置文件;${CONF_FILE}\e[0m"

# 检查必要的命令
CRONOLOG=`which cronolog`
if [ "${CRONOLOG}" == "" ]
then
    echo -e "\e[31m 请安装cronolog,本程序依赖cronolog进行日志分割处理 \e[0m"
    exit 1
fi

# 检查程序是否重复运行
PID=`ps -ef | grep ${EXEC_FILENAME} | grep -v grep | grep -v cronolog | awk '{print $2}' | awk 'BEGIN{ORS=" "}{print $0}'`
if [ "${PID}" != "" ]
then
   echo -e "\e[31m 检测到${EXEC_FILENAME}正在运行 pid=[${PID}],单机只能部署一个实例,请勿重复运行。\e[0m" 
   echo -e "\e[33m 您可能需要执行 kill -9 ${PID} (请慎重,除非您明确知道自己在做什么以及可能造成的后果)\e[0m" 
   exit 1
fi

export DEBUG='LuckSheetCoordination:INFO* LuckSheetCoordination:WARN*  LuckSheetCoordination:ERROR*'
export LuckSheetCoordinationServerConfigPath=${CONF_DIR}
export LuckSheetCoordinationServerDeployPath=${DEPLOY_DIR}
export NODE_ENV=production
PARAM_1=${CONF_DIR}
chmod 755 ${EXEC_FILE}
nohup ${EXEC_FILE} ${PARAM_1} 2>&1 | cronolog ${LOG_FILE}.%Y-%m-%d >> /dev/null &
#${EXEC_FILE} ${PARAM_1}

echo -e "\e[33m 正在启动服务......"
sleep 1
PID=`ps -ef | grep ${EXEC_FILENAME} | grep -v grep | grep -v cronolog | awk '{print $2}' | awk 'BEGIN{ORS=" "}{print $0}'`
if [ "$PID" == "" ]
then
    echo -e "\n\t\e[31m ERROR::启动失败 \e[0m\n"
    exit 1
fi


echo -e "\e[33m 子进程PID=[${PID}] \e[0m"
t1=`date '+%Y-%m-%d'`
echo -e "\e[33m 查看日志文件:\n tail -200f ${LOG_FILE}.${t1} \e[0m"
















