@echo off
chcp 936 >nul
cd /d "%~dp0"
title Auto Publish / 一键发布

echo ============================================================
echo   Auto Obfuscate + Commit + Push / 混淆+提交+推送
echo ============================================================

echo.
echo [0/4] Pulling latest from remote... / 拉取远程最新代码...
git pull --rebase origin main
if %errorlevel% neq 0 (
    echo.
    echo ============================================================
    echo [ERROR] Pull failed! / 拉取失败!
    echo ------------------------------------------------------------
    echo Reason / 原因分析:
    echo   Remote has changes you do not have locally.
    echo   远程仓库有你本地没有的改动。
    echo.
    echo Solution / 解决方案:
    echo   1. Run: git status   查看哪些文件冲突
    echo   2. Edit conflicted files manually, remove conflict markers
    echo      手动编辑冲突文件，删除冲突标记行
    echo   3. Run: git add .
    echo   4. Run: git rebase --continue
    echo   5. Run this bat again
    echo ============================================================
    pause
    exit /b 1
)

echo.
echo [1/4] Running obfuscator... / 执行混淆脚本...
node "_混淆工具.js"
if %errorlevel% neq 0 (
    echo.
    echo ============================================================
    echo [ERROR] Obfuscator failed! / 混淆失败!
    echo ------------------------------------------------------------
    echo Reason / 原因分析:
    echo   Node.js not installed, or script error.
    echo   Node.js 未安装，或脚本有语法错误。
    echo.
    echo Solution / 解决方案:
    echo   1. Run: node -v   确认 Node.js 已安装
    echo   2. If not, download from https://nodejs.org
    echo      如未安装，去 nodejs.org 下载安装
    echo   3. Check _混淆工具.js for syntax errors
    echo      检查脚本是否有语法错误
    echo ============================================================
    pause
    exit /b 1
)

echo.
echo [2/4] Staging changes... / 暂存改动文件...
git add -u
git add ".gitignore" ".gitattributes" "manifest.json" "service-worker.js" "images/" "audio/"
echo --- Changed files / 改动文件 ---
git status --short
echo -------------------------------

echo.
echo [3/4] Committing... / 提交改动...
git commit -m "auto update: %date% %time%"
if %errorlevel% neq 0 (
    echo [INFO] No changes to commit. / 没有需要提交的改动。
)

echo.
echo [4/4] Pushing to GitHub... / 推送到 GitHub...
git push origin main
if %errorlevel% equ 0 (
    echo.
    echo ============================================================
    echo   SUCCESS! / 发布成功!
    echo ------------------------------------------------------------
echo   Refresh in 1-2 minutes to see changes.
    echo   等待 1-2 分钟刷新页面即可看到更新。
    echo ============================================================
) else (
    echo.
    echo ============================================================
    echo [ERROR] Push failed! / 推送失败!
    echo ------------------------------------------------------------
    echo Possible reasons / 可能原因:
    echo.
    echo 1. REJECTED - remote has new commits
    echo    远程又有新提交，本地不是最新
    echo    Fix: git pull --rebase origin main  then rerun
    echo.
    echo 2. NETWORK ERROR - timeout / proxy
    echo    网络超时或代理问题
    echo    Fix: check network, disable VPN/proxy, retry
    echo.
    echo 3. AUTH FAILED - wrong token/password
    echo    认证失败，Token 或密码错误
    echo    Fix: regenerate Personal Access Token on GitHub
    echo.
    echo 4. SENSITIVE INFO - GitHub blocked content
    echo    GitHub 拦截了敏感信息
    echo    Fix: check code for tokens/passwords, remove and retry
    echo ============================================================
)

pause
