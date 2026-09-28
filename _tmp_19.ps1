$src = 'E:\上传网页\zhaolezi\_原始未混淆版'
$p = "$src\19.html"
$bytes = [IO.File]::ReadAllBytes($p)
$enc = New-Object System.Text.UTF8Encoding($true)
$c = [IO.File]::ReadAllText($p, $enc)

# 1. 按钮区
$oldBtn = @'
                <!-- 保存按钮 -->
                <div class="save-area">
                    <button id="saveBtn" class="save-btn" disabled aria-label="保存网址">请输入网址</button>
                </div>
'@
$newBtn = @'
                <!-- 保存按钮 -->
                <div class="save-area" style="display:flex;gap:10px;">
                    <button id="saveBtn" class="save-btn" disabled aria-label="保存网址">请输入网址</button>
                    <button id="exportBtn" class="save-btn" aria-label="导出备忘录" title="导出为txt文件">导出</button>
                    <button id="importBtn" class="save-btn" aria-label="导入备忘录" title="从txt文件导入">导入</button>
                    <input type="file" id="importFile" accept=".txt" style="display:none;">
                </div>
'@
if ($c.Contains($oldBtn.TrimEnd()) -and -not $c.Contains('exportBtn')) {
    $c = $c.Replace($oldBtn.TrimEnd(), $newBtn.TrimEnd())
    Write-Output '按钮区已加'
} else {
    Write-Output ('按钮区skip 含exportBtn:' + $c.Contains('exportBtn'))
}

# 2. JS 逻辑
if (-not $c.Contains('exportBtn.addEventListener')) {
    $js = @'
        /* ---------- 导出/导入（#4 优化） ---------- */
        const exportBtn = document.getElementById('exportBtn');
        const importBtn = document.getElementById('importBtn');
        const importFile = document.getElementById('importFile');
        if (exportBtn) {
            exportBtn.addEventListener('click', function () {
                loadLinks();
                const lines = linksData.map(function (it) {
                    return (it.name || it.url) + '\n' + it.url;
                }).join('\n');
                const blob = new Blob(['找乐子备忘录导出 ' + new Date().toLocaleString() + '\n\n' + lines], { type: 'text/plain;charset=utf-8' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = '找乐子备忘录_' + new Date().toISOString().slice(0, 10) + '.txt';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(a.href);
                if (window.ZL && ZL.showToast) ZL.showToast('已导出备忘录');
            });
        }
        if (importBtn) {
            importBtn.addEventListener('click', function () { importFile.click(); });
        }
        if (importFile) {
            importFile.addEventListener('change', function () {
                const file = this.files[0];
                if (!file) return;
                const r = new FileReader();
                r.onload = function () {
                    const text = r.result;
                    const lines = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
                    const arr = [];
                    for (let i = 0; i < lines.length; i++) {
                        if (i + 1 < lines.length && /^https?:\/\//i.test(lines[i + 1])) {
                            arr.push({ name: lines[i], url: lines[i + 1] });
                            i++;
                        } else if (/^https?:\/\//i.test(lines[i])) {
                            arr.push({ name: generateDefaultName(lines[i]), url: lines[i] });
                        }
                    }
                    if (arr.length) {
                        loadLinks();
                        linksData = linksData.concat(arr);
                        saveLinks();
                        if (window.ZL && ZL.showToast) ZL.showToast('已导入 ' + arr.length + ' 条');
                    } else {
                        if (window.ZL && ZL.showToast) ZL.showToast('未识别到有效网址');
                    }
                };
                r.readAsText(file);
                this.value = '';
            });
        }
'@
    $c = $c.Replace('    </script>', $js + "`n    </script>")
    Write-Output 'JS已加'
}
[IO.File]::WriteAllText($p, $c, $enc)
Write-Output '19.html 完成'
