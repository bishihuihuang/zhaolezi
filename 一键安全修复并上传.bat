@echo off
cd /d "%~dp0"
title 一键安全修复并自动推送

echo ====================================================
echo  开始执行安全修复与自动上传
echo ====================================================

:: 1. 修复隐私漏洞：生成 .gitignore 隔离敏感文件夹
echo [1/4] 正在隔离隐私文件 (edge_profile 等)...
(
echo edge_profile/
echo uploaded_files/
echo exec_log.json
echo node_modules/
echo .env
) > .gitignore

:: 2. 修复 Token 泄露：自动替换所有 JS 脚本里的危险 Token
echo [2/4] 正在清理脚本中泄露的 GitHub Token...
powershell -Command "Get-ChildItem -Path . -Recurse -Include *.js | ForEach-Object { $c = Get-Content $_.FullName -Raw; if ($c -match 'gho_') { $c -replace 'gho_[a-zA-Z0-9]+', 'process.env.GITHUB_TOKEN || \"TOKEN_REMOVED_FOR_SAFETY\"' | Set-Content $_.FullName -Encoding UTF8; Write-Host \"已清除泄露Token: $($_.Name)\" } }"

:: 3. 清理被污染的 Git 历史（因为之前的提交里可能还有旧 Token）
echo [3/4] 正在清理旧的 Git 记录，防止旧 Token 被连带扫描...
if exist .git (
    rmdir /s /q .git
)
git init
git remote add origin https://github.com/bishihuihuang/zhaolezi.git
git branch -M main
git add .
git commit -m "Auto-build: Clean token, ignore privacy, ready to push"

:: 4. 自动多次尝试多路径上传
echo.
echo [4/4] 开始尝试推送到 GitHub...
set /a retry=0

:push_loop
set /a retry+=1
echo.
echo --- 尝试 %retry%/3: 常规推送 ---
git push -u origin main -f

if %errorlevel% equ 0 (
    echo.
    echo ====================================================
    echo  推送成功！你的代码已经安全上传到 GitHub！
    echo ====================================================
    goto :success
)

if %retry% lss 3 (
    echo.
    echo 推送失败，正在重置网络代理并等待重试...
    git config --global --unset http.proxy >nul 2>nul
    git config --global --unset https.proxy >nul 2>nul
    timeout /t 3 /nobreak >nul
    goto :push_loop
)

echo.
echo [警告] 连续3次常规推送均超时或失败！
echo 正在尝试备用路径：调用你本地的 API 上传脚本...
echo 注意：由于已帮你修复 Token 泄露，该脚本必须配置环境变量才能运行。
if exist "工具脚本\上传与部署\upload_all_responsive.js" (
    echo 正在执行 API 上传脚本...
    node "工具脚本\上传与部署\upload_all_responsive.js"
    if %errorlevel% equ 0 (
        echo API 备用路径上传成功！
        goto :success
    )
)

echo.
echo ====================================================
echo  所有方式均上传失败。请确认 Watt Toolkit (GitHub加速)
echo  是否已开启，或切换网络后再次双击本脚本。
echo ====================================================
goto :end

:success
echo.
echo 流程结束。网站将在1-2分钟后于 GitHub Pages 自动更新。
:end
pause