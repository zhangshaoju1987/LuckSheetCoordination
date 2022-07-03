#!/bin/bash

rm -rf build
mkdir build
npm install 
tsc -p .
# var definiation
OUTPUT_DIR="./output"
MAIN_JS="./build/bootstrap.js"
PROJECT_DIR=`pwd`
PROJECT_NAME="LuckSheetCoordination"
BIN_DIR=${OUTPUT_DIR}/${PROJECT_NAME}/bin
CONF_DIR=${OUTPUT_DIR}/${PROJECT_NAME}/conf
LIB_DIR=${OUTPUT_DIR}/${PROJECT_NAME}/lib
LOG_DIR=${OUTPUT_DIR}/${PROJECT_NAME}/log
CERT_DIR=${OUTPUT_DIR}/${PROJECT_NAME}/cert
PLUGIN_DIR=${OUTPUT_DIR}/${PROJECT_NAME}/plugins

EXEC_FILENAME="LuckSheet_CoordinationServer"

echo -e "Project Dir:\t${PROJECT_DIR}"
echo -e "Project Name:\t${PROJECT_NAME}"
echo -e "Build Directory:\t${PROJECT_DIR}/${OUTPUT_DIR}"

if [ ! -f ${MAIN_JS} ]
then
    echo -e "You must run this script under project directory : LuckSheetCoordination"
    exit;
fi

if [ -d "output" ]
then
    rm -rf output
fi

mkdir -p $OUTPUT_DIR $BIN_DIR $CONF_DIR $LIB_DIR $LOG_DIR $CERT_DIR $PLUGIN_DIR

echo -e "Start build executable file:${EXEC_FILENAME}"
pkg . --targets node16-linux-x64 --output ${BIN_DIR}/${EXEC_FILENAME}
cp ./startup.sh ${BIN_DIR}
chmod 755 ${BIN_DIR}/*
echo -e "Copy config template files"
cp ./build/*.js ${CONF_DIR}/
cp ./certs/* ${CERT_DIR}/

cd ${OUTPUT_DIR}
tar -cf ${PROJECT_NAME}.tar.gz ${PROJECT_NAME}
