@echo off
title 安装 AI 助手服务依赖
echo ============================================================
echo  AI 三助手协同台 - 依赖安装
echo ------------------------------------------------------------
echo  正在安装 selenium（浏览器自动化所需）...
echo  这会自动管理 ChromeDriver，无需手动下载。
echo ============================================================
echo.

where python >nul 2>nul
if errorlevel 1 (
    echo [错误] 未检测到 Python。
    echo 请先安装 Python 3.8+：https://www.python.org/downloads/
    echo 安装时务必勾选 "Add Python to PATH"。
    echo.
    pause
    exit /b 1
)

python -m pip install --upgrade pip
python -m pip install selenium>=4.6

if errorlevel 1 (
    echo.
    echo [错误] 依赖安装失败，请检查网络连接后重试。
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  依赖安装完成！现在可以双击「启动AI助手服务.bat」启动服务。
echo ============================================================
echo.
pause
