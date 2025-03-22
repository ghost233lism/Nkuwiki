@echo off
echo 开始部署登录云函数...
echo 注意：此版本使用云ID作为用户主键，请确保服务器接口接受云ID

rem 删除旧的node_modules
if exist "node_modules" (
  echo 删除旧的依赖...
  rd /s /q node_modules
)

rem 安装依赖
echo 安装依赖...
npm install

rem 部署云函数
echo 部署云函数...
set ENV=nkuwiki-0g6bkdy9e8455d93
wx upload-function login --env %ENV%

echo 部署完成！
echo 重要提示：确保服务器端已实现/wxapp/users/sync接口并接受云ID作为用户标识！