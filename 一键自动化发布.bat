@echo off
cd /d "%~dp0"
title 一键快速上传

echo ====================================================
echo   开始执行本地构建与推送到 GitHub
echo ====================================================

:: 第一步：自动混淆
echo [1/3] 正在执行代码混淆...
node _混淆工具.js
if %errorlevel% neq 0 (
    echo 混淆失败！请检查 _混淆工具.js
    pause
    exit /b
)

:: 第二步：本地记录修改
echo.
echo [2/3] 正在提交本地修改...
git add .
git commit -m "自动构建更新: %date% %time%"

:: 第三步：原封不动地调用你手动成功的三条命令
echo.
echo [3/3] 开始推送到 GitHub（复刻手动成功命令）...
echo.

:: 1. 设置 HTTP 版本为 1.1（解决大文件断流）
git config --global http.version HTTP/1.1

:: 2. 增加缓冲区大小（容许大包传输）
git config --global http.postBuffer 524288000

:: 3. 执行最终推送
git push origin main -f

if %errorlevel% equ 0 (
    echo.
    echo ====================================================
    echo  推送成功！等待 1-2 分钟后刷新网页即可。
    echo ====================================================
) else (
    echo.
    echo ====================================================
    echo 推送失败！请手动打开 Watt Toolkit 并开启加速，然后重新运行本脚本。
    echo ====================================================
)

pause