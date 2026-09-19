@echo off
chcp 65001 >nul
title 自动化整理文件夹
cd /d "D:\Administrator\桌面\zhaolezi"

echo 正在建立分类文件夹...
mkdir "工具脚本\旧版验证" 2>nul
mkdir "工具脚本\上传与部署" 2>nul
mkdir "后台服务" 2>nul

echo 正在移动历史验证脚本...
move /y verify_*.js "工具脚本\旧版验证" >nul 2>nul

echo 正在移动上传与部署脚本...
move /y upload_*.js "工具脚本\上传与部署" >nul 2>nul
move /y push_via_api.js "工具脚本\上传与部署" >nul 2>nul

echo 正在移动后台服务文件...
move /y ai_helper_server.py "后台服务" >nul 2>nul
move /y 启动AI助手服务.bat "后台服务" >nul 2>nul
move /y 停止服务.bat "后台服务" >nul 2>nul
move /y 安装依赖.bat "后台服务" >nul 2>nul

echo.
echo 整理完毕！现在你的根目录清爽多了。
pause