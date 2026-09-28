@echo off
chcp 936 >nul
title 找乐子网站 - 备份当前版本
setlocal EnableExtensions EnableDelayedExpansion

rem ---- auto 参数：后台自动完成（不暂停） ----
if /i "%~1"=="auto" set "NOPAUSE=1"
cd /d "%~dp0"

set "SRC=%~dp0"
set "SRC=%SRC:~0,-1%"
set "DST=E:\全面备份\zhaolezi备份"
set "VER=%DST%\zhaolezi版本记录.txt"

echo ==============================================
echo    找乐子网站 - 一键镜像备份
echo    源: %SRC%
echo    目: %DST%
echo    (robocopy 全站镜像，排除 .git 与运行时文件)
echo ==============================================
echo.

rem ---- 安全检查：备份脚本应只在源目录运行 ----
if /i not "%SRC%"=="E:\上传网页\zhaolezi" (
    echo  [!] 本备份脚本只应在 E:\上传网页\zhaolezi 目录中运行。
    echo      当前目录: %SRC%
    if not defined NOPAUSE pause
    exit /b 1
)

echo [1/2] 正在备份（覆盖为最新版本）...
robocopy "%SRC%" "%DST%" /E /XD ".git" "edge_profile" "uploaded_files" "node_modules" /XF "exec_log.json" ".env" "zhaolezi版本记录.txt" /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (
    echo     [!] 备份失败，请检查路径或权限
    if not defined NOPAUSE pause
    exit /b 1
)
echo     [OK] 备份完成，备份文件夹已更新为最新版本

echo.
echo [2/2] 写入版本记录时间戳...
for /f "delims=" %%t in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'"') do set "TS=%%t"
if not exist "%DST%" mkdir "%DST%" 2>nul
powershell -NoProfile -Command "Add-Content -LiteralPath '%VER%' -Encoding UTF8 -Value ('[备份当前] %TS% 已镜像备份到 %DST%')"
echo     [OK] 已写入版本记录!TS!
echo.
echo 完成！任务完成后请再运行一次本脚本，并在 zhaolezi版本记录.txt 追加详细修改记录。
echo 版本记录: %VER%
if not defined NOPAUSE pause
exit /b 0
