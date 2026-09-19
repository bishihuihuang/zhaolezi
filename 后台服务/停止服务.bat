@echo off
cd /d "%~dp0"

echo 正在停止 AI 助手服务...

REM 查找并终止占用8765端口的进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8765" ^| findstr "LISTENING"') do (
    echo 终止进程 PID: %%a
    taskkill /F /PID %%a >nul 2>nul
)

REM 同时终止 pythonw 进程（如果是后台运行的）
taskkill /F /IM pythonw.exe >nul 2>nul

echo.
echo 服务已停止。
echo.
timeout /t 3 /nobreak >nul
exit /b 0
