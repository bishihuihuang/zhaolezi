@echo off
title 代码收集工具 - 全面提取
echo 正在收集代码，提取过程可能耗时十几秒，请稍候...

:: 设定目标文件夹和输出文件
set "TARGET_DIR=D:\Administrator\桌面\zhaolezi"
set "OUTPUT_FILE=D:\Administrator\桌面\zhaolezi_代码合集.txt"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$root = '%TARGET_DIR%';" ^
    "$out = '%OUTPUT_FILE%';" ^
    "if (Test-Path $out) { Remove-Item $out -Force };" ^
    "$extensions = '.html','.htm','.js','.css','.py','.json','.bat','.md','.txt';" ^
    "$files = Get-ChildItem -Path $root -Recurse -File | Where-Object {" ^
    "  $extensions -contains $_.Extension -and" ^
    "  $_.FullName -notmatch '\\\\\.git\\\\' -and" ^
    "  $_.FullName -notmatch '\\\\node_modules\\\\' -and" ^
    "  $_.FullName -notmatch '\\\\edge_profile\\\\' -and" ^
    "  $_.FullName -notmatch '\\\\uploaded_files\\\\' -and" ^
    "  ($_.FullName -match '\\\\_原始未混淆版\\\\' -or $_.Name -notmatch '^[0-9]+\.html$' -and $_.Name -ne 'index.html')" ^
    "};" ^
    "foreach ($f in $files) {" ^
    "  Add-Content -Path $out -Value ('==================================================');" ^
    "  Add-Content -Path $out -Value ('--- 文件路径: ' + $f.FullName);" ^
    "  Add-Content -Path $out -Value ('==================================================');" ^
    "  Get-Content -Path $f.FullName -Raw -Encoding UTF8 | Add-Content -Path $out -Encoding UTF8;" ^
    "  Add-Content -Path $out -Value \"`n`n\";" ^
    "}"
echo.
echo ===================================================
echo  收集完成！文件已保存到：D:\Administrator\桌面\zhaolezi_代码合集.txt
echo  请把这个 txt 文件发给我（如果太大可以打包）。
echo ===================================================
pause