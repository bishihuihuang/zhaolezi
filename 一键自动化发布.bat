@echo off
cd /d "%~dp0"
title 全自动构建与多路径发布 (增量秒传版)

echo ====================================================
echo   开始执行：自动化构建与全自动多路径推送
echo ====================================================

:: ====================================================
:: 第一步：生成防护盾，自动跳过隐私文件
:: ====================================================
echo [1/5] 正在隔离隐私文件 (edge_profile 等)...
(
echo edge_profile/
echo uploaded_files/
echo exec_log.json
echo node_modules/
echo .env
) > .gitignore

:: ====================================================
:: 第二步：自动混淆代码
:: ====================================================
echo.
echo [2/5] 正在执行代码混淆...
node _混淆工具.js

if %errorlevel% neq 0 (
    echo [错误] 混淆脚本执行失败！请检查 _混淆工具.js 是否在根目录。
    pause
    exit /b
)

:: ====================================================
:: 第三步：本地提交修改
:: ====================================================
echo.
echo [3/5] 正在提交本地修改...
git add .
git commit -m "自动构建更新: %date% %time%"
echo 本地提交完成。

:: ====================================================
:: 第四步：智能检测加速器
:: ====================================================
echo.
echo [4/5] 正在检查加速器状态...
tasklist | findstr /i "Steam++.exe WattToolkit.exe Watt Toolkit.exe" >nul
if %errorlevel% equ 0 (
    echo [加速器] 检测到加速器已在运行中，准备开始推送！
    timeout /t 3 /nobreak >nul
) else (
    echo.
    echo [重要提示] 未检测到加速器运行。
    echo 请你现在手动打开 Watt Toolkit，并点击“一键加速”。
    echo 加速成功后，按键盘上的任意键继续脚本...
    pause >nul
)

:: ====================================================
:: 第五步：多路径自动上传（共6次尝试）
:: 【核心优化】：加入 HTTP/1.1 和超大缓存设置，这是刚刚手动成功的秘诀！
:: ====================================================
echo.
echo [5/5] 开始多重路径上传流程...

:: 核心救命配置（解决大文件断流问题）
git config --global http.version HTTP/1.1
git config --global http.postBuffer 524288000

set /a max_attempts=6
set /a attempt=1

:push_loop
if %attempt% gtr %max_attempts% goto :push_failed

echo.
echo ----------------------------------------------------
echo   第 %attempt% / %max_attempts% 次尝试
echo ----------------------------------------------------

set /a mod=attempt %% 2

if %mod% equ 1 (
    echo [模式] 常规直连上传 (取消所有代理设置)...
    git config --global --unset http.proxy >nul 2>nul
    git config --global --unset https.proxy >nul 2>nul
) else (
    echo [模式] 加速器代理上传...
    echo 正在配置代理 (使用你截图中的端口 26561)...
    git config --global http.proxy http://127.0.0.1:26561
    git config --global https.proxy http://127.0.0.1:26561
)

echo 正在推送到 GitHub...
git push -u origin main -f

if %errorlevel% equ 0 (
    echo.
    echo ====================================================
    echo  推送成功！你的代码已安全上传到 GitHub。
    echo  网站将在 1-2 分钟后自动更新。
    echo ====================================================
    goto :push_success
)

echo.
echo 本次推送超时或失败，等待5秒后进行下一次尝试...
timeout /t 5 /nobreak >nul
set /a attempt+=1
goto :push_loop

:push_failed
echo.
echo ====================================================
echo [警告] 连续 %max_attempts% 次尝试均告失败！
echo 如果是【第一次全量上传】且包含大量音视频，请参考备用方案：
echo 临时把 .mp3 和图片移入“媒体备份”文件夹，等待推送成功后再移回来。
echo ====================================================
pause
exit /b

:push_success
pause
exit /b