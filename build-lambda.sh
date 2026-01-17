#!/bin/bash

# Lambda関数のビルドとパッケージ化スクリプト

LAMBDA_NAME=${1:-sample}
LAMBDA_DIR="src/lambda/${LAMBDA_NAME}"
DIST_DIR="dist/lambda/${LAMBDA_NAME}"
ZIP_FILE="lambda-${LAMBDA_NAME}-deploy.zip"

echo "Building Lambda function: ${LAMBDA_NAME}"

# TypeScriptのコンパイル
npx tsc --project tsconfig.lambda.json

# distディレクトリが存在するか確認
if [ ! -d "${DIST_DIR}" ]; then
  echo "Error: ${DIST_DIR} does not exist"
  exit 1
fi

# node_modulesから必要な依存関係をコピー（必要に応じて）
# npm install --production --prefix ${DIST_DIR}

# zipファイルの作成
cd ${DIST_DIR}
zip -r ../../../${ZIP_FILE} .
cd ../../..

echo "Lambda package created: ${ZIP_FILE}"