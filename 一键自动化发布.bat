@echo off
chcp 936 >nul
cd /d "%~dp0"
title Auto Publish

echo ============================================================
echo   Auto Obfuscate + Commit + Push
echo ============================================================

echo.
echo [1/5] Pulling latest from remote...
git pull --rebase origin main
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Pull failed!
    echo   Remote has changes you do not have locally.
    echo   Fix: resolve conflicts manually, then rerun.
    echo ============================================================
    pause
    exit /b 1
)

echo.
echo [2/5] Running obfuscator...
node "_混淆工具.js"
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Obfuscator failed!
    echo   Node.js not installed, or script error.
    echo ============================================================
    pause
    exit /b 1
)

echo.
echo [3/5] Staging all changes...
git add .
echo --- Changed files ---
git status --short
echo ---------------------

REM Check if there are any changes to commit
git diff --cached --quiet
if %errorlevel% equ 0 (
    echo.
    echo [INFO] No changes to commit.
    echo   If you edited source files, check:
    echo   - Did you edit files in _原始未混淆版/?
    echo   - Did the obfuscator regenerate root HTML files?
    echo ============================================================
    echo   No upload needed. Exiting.
    pause
    exit /b 0
)

echo.
echo [4/5] Committing...
git commit -m "auto update: %date% %time%"
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Commit failed!
    echo ============================================================
    pause
    exit /b 1
)

echo.
echo [5/5] Pushing to GitHub...
git push origin main
if %errorlevel% equ 0 (
    echo.
    echo ============================================================
    echo   SUCCESS! Upload complete.
    echo   Refresh in 1-2 minutes to see changes.
    echo ============================================================
) else (
    echo.
    echo ============================================================
    echo [ERROR] Push failed!
    echo Possible reasons:
    echo   1. REJECTED - remote has new commits
    echo      Fix: git pull --rebase origin main, then rerun
    echo   2. NETWORK ERROR - timeout / proxy
    echo      Fix: check network, disable VPN/proxy, retry
    echo   3. AUTH FAILED - wrong token/password
    echo      Fix: regenerate Personal Access Token on GitHub
    echo ============================================================
)

pause