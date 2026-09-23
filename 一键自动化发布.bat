@echo off
chcp 936 >nul
cd /d "%~dp0"
title Auto Publish / 一键自动发布

echo ============================================================
echo   Auto Obfuscate + Commit + Push / 混淆+提交+推送
echo ============================================================

echo.
echo [1/5] Pulling latest from remote... / 拉取远程最新代码...
git pull --rebase --autostash origin main
if %errorlevel% neq 0 (
    echo.
    echo ============================================================
    echo [ERROR] Pull failed! / 拉取失败!
    echo ------------------------------------------------------------
    echo Reason / 原因:
    echo   Remote has changes you do not have locally.
    echo   远程有你本地没有的新提交。
    echo.
    echo Solution / 解决方案:
    echo   1. Run: git status   查看哪些文件冲突
    echo   2. Edit conflicted files manually
    echo      手动编辑冲突文件，删除冲突标记
    echo   3. Run: git add .
    echo   4. Run: git rebase --continue
    echo   5. Run this bat again
    echo ============================================================
    pause
    exit /b 1
)

echo.
echo [2/5] Running obfuscator... / 运行混淆脚本...
node "_混淆工具.js"
if %errorlevel% neq 0 (
    echo.
    echo ============================================================
    echo [ERROR] Obfuscator failed! / 混淆失败!
    echo ------------------------------------------------------------
    echo Reason / 原因:
    echo   Node.js not installed, or script error.
    echo   Node.js 未安装，或脚本有语法错误。
    echo.
    echo Solution / 解决方案:
    echo   1. Run: node -v   确认 Node.js 已安装
    echo   2. If not, download from https://nodejs.org
    echo      如果没装，去 nodejs.org 下载安装
    echo   3. Check _混淆工具.js for syntax errors
    echo      检查脚本是否有语法错误
    echo ============================================================
    pause
    exit /b 1
)

echo.
echo [3/5] Staging all changes... / 暂存所有改动文件...
git add .
echo --- Changed files / 改动的文件 ---
git status --short
echo ------------------------------------

REM Check if there are any changes to commit
git diff --cached --quiet
if %errorlevel% equ 0 (
    echo.
    echo ============================================================
    echo [INFO] No changes to commit. / 没有需要提交的改动。
    echo ------------------------------------------------------------
    echo If you edited source files, check:
    echo 如果你改了源文件，请检查:
    echo   - Did you edit files in _原始未混淆版/?
    echo     你是否修改了 _原始未混淆版/ 里的文件？
    echo   - Did the obfuscator regenerate root HTML files?
    echo     混淆脚本是否重新生成了根目录的 HTML？
    echo ============================================================
    echo   No upload needed. Exiting.
    echo   不需要上传，退出。
    pause
    exit /b 0
)

echo.
echo [4/5] Committing... / 提交改动...
git commit -m "auto update: %date% %time%"
if %errorlevel% neq 0 (
    echo.
    echo ============================================================
    echo [ERROR] Commit failed! / 提交失败!
    echo ============================================================
    pause
    exit /b 1
)

echo.
echo [5/5] Pushing to GitHub... / 推送到 GitHub...
git push origin main
if %errorlevel% equ 0 (
    echo.
    echo ============================================================
    echo   SUCCESS! Upload complete. / 上传成功！
    echo ------------------------------------------------------------
    echo   Refresh in 1-2 minutes to see changes.
    echo   等待 1-2 分钟刷新页面就能看到效果。
    echo ============================================================
) else (
    echo.
    echo ============================================================
    echo [ERROR] Push failed! / 推送失败!
    echo ------------------------------------------------------------
    echo Possible reasons / 可能原因:
    echo.
    echo 1. REJECTED - remote has new commits
    echo    远程有新提交，被拒绝
    echo    Fix: git pull --rebase --autostash origin main  then rerun
    echo.
    echo 2. NETWORK ERROR - timeout / proxy
    echo    网络超时，被代理/防火墙挡住
    echo    Fix: check network, disable VPN/proxy, retry
    echo.
    echo 3. AUTH FAILED - wrong token/password
    echo    认证失败，Token 或密码错误
    echo    Fix: regenerate Personal Access Token on GitHub
    echo.
    echo 4. SENSITIVE INFO - GitHub blocked content
    echo    GitHub 检测到敏感信息
    echo    Fix: check code for tokens/passwords, remove and retry
    echo ============================================================
)

pause