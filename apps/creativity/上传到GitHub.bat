@echo off
rem ==========================================================================
rem  创意引擎 · 一键上传到 GitHub
rem
rem  *** 本文件必须保存为 GBK(ANSI) + CRLF 行尾，请勿改成 UTF-8 ***
rem  cmd.exe 读 UTF-8 批处理时会错位断行，中文行会被当成命令执行而报错。
rem  编辑器里若显示乱码，请「以 ANSI 打开」，不要「转存为 UTF-8」。
rem
rem  用法（在「创意」目录下）：
rem      双击打开                       —— 自动使用默认仓库地址，完整上传并推送
rem      上传到GitHub.bat 网址          —— 使用你指定的仓库地址
rem
rem  脚本做四件事：
rem      1. 初始化本地仓库（已初始化过也没关系）
rem      2. 从仓库地址推导 Pages 站点地址，跑 build.js --deploy 统一改写
rem         canonical / og:url / sitemap.xml / robots.txt 四处 URL，并做全量自检
rem      3. 暂存并提交（不删除任何文件、不 force push）
rem      4. 推送到远端
rem
rem  首次运行若还没配过 git 用户名/邮箱，本脚本会自动写入「本仓库本地配置」，
rem  只影响这个仓库，不改动你的全局 git 设置。
rem ==========================================================================
chcp 936 >nul
cd /d "%~dp0"
setlocal EnableExtensions EnableDelayedExpansion

rem --- 这里是改动点：如果没有传参数，就使用默认地址 ---
set "REPO=%~1"
if not defined REPO (
    set "REPO=https://github.com/bishihuihuang/creativity.git"
)
set "PAGES_URL="

where git >nul 2>nul
if errorlevel 1 (
    echo [x] 没找到 git。去 https://git-scm.com 装一个，或者直接在 GitHub 网页用「拖拽上传」。
    pause & exit /b 1
)

rem --- 首次运行兜底：git 没有身份信息时写入本仓库本地配置 ---
git config user.name >nul 2>nul
if errorlevel 1 (
    git config user.name "Your Name"
    git config user.email "your.email@example.com"
    echo [i] 检测到 git 还没配用户名/邮箱，已为本仓库写入占位值。
    echo     要换成你自己的，请在「创意」目录下运行：
    echo         git config user.name  "你的名字"
    echo         git config user.email "你的邮箱"
    echo     然后重新打开本脚本即可。
)

echo [1/4] 初始化仓库（已初始化过也没关系）
git init >nul 2>nul
git branch --show-current 2>nul | findstr /I "main" >nul
if errorlevel 1 (
    git branch -M main
)

echo.
echo [2/4] 生成 sitemap 与缓存清单，并统一改写站点地址
if defined REPO (
    rem 从仓库地址推导 Pages 地址：github.com/user/repo.git -^> user.github.io/repo
    for /f %%u in ('node -e "const m=process.argv[1].match(/github\.com[\/:]([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?\/?$/);if(m)console.log('https://'+m[1]+'.github.io/'+m[2])" "%REPO%"') do set "PAGES_URL=%%u"
)
if defined PAGES_URL (
    echo      部署地址推导为：!PAGES_URL!
    node 工具脚本/build.js --deploy !PAGES_URL!
    if errorlevel 1 (
        echo.
        echo [x] 构建自检没通过，先别上传。按上面的报错修好再跑一次本脚本。
        pause & exit /b 1
    )
) else (
    echo      [i] 没有仓库地址，跳过地址改写（可用 node 工具脚本/build.js --deploy 手动执行）。
)

echo.
echo [3/4] 暂存并提交
git add -A
git status --short
echo.
git commit -m "chore: 创意引擎站点更新"
if errorlevel 1 (
    echo     [i] 没有提交任何内容：工作区是干净的（上一次运行已提交过），继续即可。
)

echo.
echo [4/4] 推送到 %REPO%
git remote get-url origin >nul 2>nul
if errorlevel 1 (
    git remote add origin %REPO%
) else (
    git remote set-url origin %REPO%
)
git push -u origin main
if errorlevel 1 (
    echo.
    echo [x] push 失败。常见原因：
    echo     1. 还没登录 —— git push 时会自动弹浏览器授权窗口，同意即可。
    echo     2. 仓库不是 main 分支 —— 在 GitHub 仓库里确认 Branch 选的是 main。
    echo     3. 仓库名不存在 —— 先去 https://github.com/new 建好同名仓库再重试。
    pause & exit /b 1
)

echo.
echo  [v] 推送完成。1～2 分钟后访问：
if defined PAGES_URL (
    echo       !PAGES_URL!/
) else (
    echo       https://bishihuihuang.github.io/creativity/
)
echo.
echo  如果打不开，去仓库 Settings - Pages：
echo       Source = Deploy from a branch，Branch = main，Folder = /（根目录）
echo.
pause