@echo off
cd /d "%~dp0"

echo ============================================================
echo  AI 三助手协同台 - 本地助手服务
echo ------------------------------------------------------------

REM 检查 Python
where python >nul 2>nul
if errorlevel 1 (
    echo [错误] 未检测到 Python，请先安装 Python 并勾选 Add Python to PATH
    pause
    exit /b 1
)

REM 检查并安装 selenium
python -c "import selenium" 2>nul
if errorlevel 1 (
    echo [提示] 正在安装 selenium...
    python -m pip install selenium>=4.6
)

echo 依赖检测通过，正在启动服务...

REM 检查端口是否已被占用（服务已在运行）
netstat -ano | findstr ":8765" | findstr "LISTENING" >nul
if not errorlevel 1 (
    echo 服务已在运行，跳过启动。
    goto :openpage
)

REM 用 pythonw.exe 后台运行服务（无黑色窗口，不会被误关）
REM 先尝试 pythonw，失败则用 python
where pythonw >nul 2>nul
if errorlevel 1 (
    echo [提示] 未找到 pythonw，使用 python 后台运行...
    start /min "AI助手服务（请勿关闭此窗口）" cmd /c "python ai_helper_server.py"
) else (
    start "" pythonw.exe ai_helper_server.py
)

REM 等待服务启动（最多等待10秒）
echo 正在等待服务启动...
set /a count=0
:waitloop
set /a count+=1
if %count% gtr 10 (
    echo [警告] 服务启动超时，请检查是否有错误。
    goto :openpage
)
timeout /t 1 /nobreak >nul
netstat -ano | findstr ":8765" | findstr "LISTENING" >nul
if errorlevel 1 goto :waitloop

echo 服务启动成功！

:openpage
REM 自动打开 31.html
echo 正在打开 31.html...
start "" "%~dp031.html"

echo.
echo ============================================================
echo  全部启动完成！
echo.
echo  【使用步骤】
echo  1. 在 31.html 页面点击「启动浏览器」
echo  2. 在弹出的 Edge 窗口中登录 豆包/DeepSeek/千问
echo     （仅需登录一次，登录态会自动保存）
echo  3. 回到 31.html，对已登录的 AI 点「我已登录」
echo  4. 上传文件 + 输入任务 + 点「开始执行」= 全自动完成
echo.
echo  【注意】
echo  - 服务在后台运行，无需保持黑色窗口
echo  - 如需停止服务，关闭浏览器后运行「停止服务.bat」
echo ============================================================
echo.
timeout /t 5 /nobreak >nul
exit /b 0
