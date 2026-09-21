@echo off
cd /d "%~dp0"
chcp 65001 >nul
title Auto Publish

echo ====================================================
echo   Auto Obfuscate + Commit + Push to GitHub
echo ====================================================

echo.
echo [0/4] Pulling latest from remote...
git pull --rebase origin main
if %errorlevel% neq 0 (
    echo [ERROR] Pull failed. Please resolve conflicts manually.
    pause
    exit /b 1
)

echo.
echo [1/4] Running obfuscator...
node "_混淆工具.js"
if %errorlevel% neq 0 (
    echo [ERROR] Obfuscator failed. Check _混淆工具.js
    pause
    exit /b 1
)

echo.
echo [2/4] Staging changes...
git add -u
git add ".gitignore" ".gitattributes" "manifest.json" "service-worker.js" "images/" "audio/"
echo --- Changed files ---
git status --short
echo ---------------------

echo.
echo [3/4] Committing...
git commit -m "auto update: %date% %time%"
if %errorlevel% neq 0 (
    echo [INFO] No changes to commit.
)

echo.
echo [4/4] Pushing to GitHub...
git push origin main
if %errorlevel% equ 0 (
    echo.
    echo ====================================================
    echo   SUCCESS! Refresh in 1-2 minutes.
    echo ====================================================
) else (
    echo.
    echo ====================================================
    echo   PUSH FAILED. Check network or sensitive info.
    echo   If rejected, run: git pull --rebase
    echo ====================================================
)

pause