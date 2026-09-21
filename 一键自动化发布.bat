@echo off
cd /d "%~dp0"
chcp 936 >nul
title 一键自动化发布

echo ====================================================
echo   一键混淆 + 提交 + 推送 GitHub
echo ====================================================

:: 第零步：先拉远程最新（rebase，避免 rejected）
echo.
echo [0/4] 拉取远程最新代码...
git pull --rebase origin main
if %errorlevel% neq 0 (
    echo.
    echo [错误] 拉取失败，可能有冲突。请手动解决后重新运行。
    pause
    exit /b 1
)

:: 第一步：混淆（确定性输出，未改的文件产物字节不变，git 不会重复提交）
echo.
echo [1/4] 执行混淆...
node "_混淆工具.js"
if %errorlevel% neq 0 (
    echo [错误] 混淆失败，请检查 _混淆工具.js
    pause
    exit /b 1
)

:: 第二步：精确暂存改动（不用 git add .，避免误加临时文件）
echo.
echo [2/4] 暂存改动...
git add -u
git add ".gitignore" ".gitattributes" "manifest.json" "service-worker.js" "images/" "audio/" "一键自动化发布.bat" "_混淆工具.js"
echo --- 当前改动 ---
git status --short
echo ----------------

:: 第三步：提交
echo.
echo [3/4] 提交...
git commit -m "自动更新: %date% %time%"
if %errorlevel% neq 0 (
    echo [提示] 没有需要提交的改动，直接推送。
)

:: 第四步：推送
echo.
echo [4/4] 推送到 GitHub...
git push origin main
if %errorlevel% equ 0 (
    echo.
    echo ====================================================
    echo   发布成功！等待 1-2 分钟刷新页面即可。
    echo ====================================================
) else (
    echo.
    echo ====================================================
    echo   推送失败！请检查网络或敏感信息提示。
    echo   若提示 rejected，请先手动 git pull --rebase。
    echo ====================================================
)

pause