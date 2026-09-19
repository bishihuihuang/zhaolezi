@echo off
cd /d "%~dp0"
title 自动化构建与全自动多路径发布

echo ====================================================
echo   OmniRoute 网站一键构建与自动发布脚本
echo ====================================================

:: ====================================================
:: 第一步：生成防护盾，自动跳过隐私文件
:: ====================================================
echo [1/4] 正在隔离隐私文件 (edge_profile 等)...
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
echo [2/4] 正在执行代码混淆...
:: 因为你不喜欢挪动文件，这里默认 _混淆工具.js 就在根目录
node _混淆工具.js

if %errorlevel% neq 0 (
    echo [错误] 混淆脚本执行失败！请检查 _混淆工具.js 是否在根目录。
    pause
    exit /b
)

:: ====================================================
:: 第三步：提交更改
:: 【回答你的疑问】：Git 天然支持“只上传修改过的文件”。
:: 你只要没动过的文件和图片，Git 绝不会重复上传。
:: 只有你新添加的图片、音频，或者改过代码的混淆版 HTML 会被打包。
:: ====================================================
echo.
echo [3/4] 正在提交新的修改...
git add .
git commit -m "自动构建更新: %date% %time%"

:: ====================================================
:: 第四步：全自动多路径上传（共6次尝试）
:: 规则：第1次常规，第2次加速，第3-6次重复。
:: ====================================================
echo.
echo [4/4] 开始多重路径上传流程...

set /a max_attempts=6
set /a attempt=1

:push_loop
if %attempt% gtr %max_attempts% goto :push_failed

echo.
echo ----------------------------------------------------
echo   第 %attempt% / %max_attempts% 次尝试
echo ----------------------------------------------------

:: 判断奇偶：奇数常规，偶数加加速器
set /a mod=attempt %% 2

if %mod% equ 1 (
    echo [模式] 常规直连上传 (取消所有代理设置)...
    git config --global --unset http.proxy >nul 2>nul
    git config --global --unset https.proxy >nul 2>nul
) else (
    echo [模式] 加速器代理上传...
    echo 请确保你的 Watt Toolkit 等加速器已开启！
    echo 正在配置代理 (假定你的加速器端口为 7890)...
    git config --global http.proxy http://127.0.0.1:7890
    git config --global https.proxy http://127.0.0.1:7890
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
echo 请检查网络，或者确认你的加速器端口是否真的是 7890。
echo （如果不是，请用记事本打开本脚本，修改里面的 7890）
echo ====================================================
pause
exit /b

:push_success
pause
exit /b