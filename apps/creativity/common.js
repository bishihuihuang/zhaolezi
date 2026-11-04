
/* 防小白保护开始 */
(function(){
    var _0x1=document;
    var _0x2=null;
    var _isFirefox = typeof InstallTrigger !== 'undefined' || (navigator.userAgent && navigator.userAgent.indexOf('Firefox') !== -1);
    if(_0x1.body){
        _0x1.body.setAttribute('oncontextmenu','return false');
    }
    function _0xBlockNative(){
        var els=_0x1.querySelectorAll('input,textarea,[contenteditable="true"],select');
        for(var listIndex=0;listIndex<els.length;listIndex++){
            els[listIndex].setAttribute('oncontextmenu','return false');
        }
    }
    _0xBlockNative();
    if(_0x1.addEventListener){
        _0x1.addEventListener('DOMNodeInserted',function(){setTimeout(_0xBlockNative,100);});
    }
    var _0x3=_0x1.createElement('div');
    _0x3.style.cssText='position:fixed;z-index:2147483647;background:#1e1e1e;border:1px solid #3a3a3a;border-radius:6px;box-shadow:0 6px 16px rgba(0,0,0,.5);padding:4px 0;min-width:200px;display:none;font-family:"Microsoft YaHei","Segoe UI",sans-serif;font-size:13px;user-select:none;';
    _0x3.innerHTML='<div data-a="paste" style="display:flex;justify-content:space-between;align-items:center;height:28px;padding:0 20px;cursor:pointer;color:#fff;line-height:28px;">粘贴<span style="color:#cfcfcf;font-size:12px;">Ctrl+V</span></div><div data-a="cut" style="display:flex;justify-content:space-between;align-items:center;height:28px;padding:0 20px;cursor:pointer;color:#fff;line-height:28px;">剪切<span style="color:#cfcfcf;font-size:12px;">Ctrl+X</span></div><div data-a="copy" style="display:flex;justify-content:space-between;align-items:center;height:28px;padding:0 20px;cursor:pointer;color:#fff;line-height:28px;">复制<span style="color:#cfcfcf;font-size:12px;">Ctrl+C</span></div><div data-a="selectall" style="display:flex;justify-content:space-between;align-items:center;height:28px;padding:0 20px;cursor:pointer;color:#fff;line-height:28px;">全选<span style="color:#cfcfcf;font-size:12px;">Ctrl+A</span></div><div data-a="refresh" style="display:flex;justify-content:space-between;align-items:center;height:28px;padding:0 20px;cursor:pointer;color:#fff;line-height:28px;">刷新<span style="color:#cfcfcf;font-size:12px;">F5</span></div>';
    function _0xMount(){
        if(_0x1.body){_0x1.body.appendChild(_0x3);}
        else{_0x1.addEventListener('DOMContentLoaded',function(){if(_0x1.body){_0x1.body.appendChild(_0x3);}});}
    }
    _0xMount();
    _0x3.addEventListener('mouseover',function(event){if(event.target.getAttribute('data-a')||event.target.closest('[data-a]')){var targetEl=event.target.closest('[data-a]');if(targetEl)targetEl.style.background='#3a3a3a';}});
    _0x3.addEventListener('mouseout',function(event){if(event.target.getAttribute('data-a')||event.target.closest('[data-a]')){var targetEl=event.target.closest('[data-a]');if(targetEl)targetEl.style.background='';}});
    function _0x4(text){
        if(!text){return false;}
        if(navigator.clipboard&&navigator.clipboard.writeText){
            navigator.clipboard.writeText(text).catch(function(){});
            return true;
        }
        var ta=_0x1.createElement('textarea');
        ta.value=text;
        ta.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
        _0x1.body.appendChild(ta);
        ta.focus();ta.select();
        try{_0x1.execCommand('copy');}catch(err){}
        _0x1.body.removeChild(ta);
        return true;
    }
    function _0x5(el){
        if(el&&(el.tagName==='INPUT'||el.tagName==='TEXTAREA')){
            var startIdx=el.selectionStart||0,endIdx=el.selectionEnd||0;
            return el.value.substring(startIdx,endIdx);
        }
        return window.getSelection().toString();
    }
    function _0x7(el,txt){
        if(el.tagName==='INPUT'||el.tagName==='TEXTAREA'){
            var startIdx=el.selectionStart||0,endIdx=el.selectionEnd||0;
            el.value=el.value.substring(0,startIdx)+txt+el.value.substring(endIdx);
            el.selectionStart=el.selectionEnd=startIdx+txt.length;
            el.dispatchEvent(new Event('input',{bubbles:true}));
        }else{
            try{_0x1.execCommand('insertText',false,txt);}catch(err){}
        }
    }
    function _0xContextHandler(event){
        event.preventDefault();
        event.stopPropagation();
        if(event.stopImmediatePropagation){event.stopImmediatePropagation();}
        var targetEl=event.target;
        if(targetEl&&(targetEl.tagName==='INPUT'||targetEl.tagName==='TEXTAREA'||targetEl.isContentEditable)){
            targetEl.focus();
            _0x2=targetEl;
        }else{
            _0x2=_0x1.activeElement;
        }
        _0x3.style.display='block';
        _0x3.style.left=event.clientX+'px';
        _0x3.style.top=event.clientY+'px';
        setTimeout(function(){var rectResult=_0x3.getBoundingClientRect();if(rectResult.right>window.innerWidth){_0x3.style.left=(window.innerWidth-rectResult.width-5)+'px';}if(rectResult.bottom>window.innerHeight){_0x3.style.top=(window.innerHeight-rectResult.height-5)+'px';}},0);
        return false;
    }
    _0x1.addEventListener('contextmenu',_0xContextHandler,true);
    _0x1.addEventListener('contextmenu',_0xContextHandler,false);
    if(window.addEventListener){
        window.addEventListener('contextmenu',_0xContextHandler,true);
        window.addEventListener('contextmenu',_0xContextHandler,false);
    }
    _0x1.addEventListener('click',function(){_0x3.style.display='none';});
    _0x1.addEventListener('scroll',function(){_0x3.style.display='none';});
    _0x1.addEventListener('keydown',function(event){if(event.keyCode===27){_0x3.style.display='none';}});
    _0x3.addEventListener('click',function(event){
        var targetEl=event.target.closest('[data-a]');
        if(!targetEl){return;}
        var action=targetEl.getAttribute('data-a');
        _0x3.style.display='none';
        var el=_0x2||_0x1.activeElement;
        var isInput=el&&(el.tagName==='INPUT'||el.tagName==='TEXTAREA');
        var isEditable=el&&el.isContentEditable;
        if(action==='cut'){
            var txt=_0x5(el);
            if(txt){
                _0x4(txt);
                if(isInput){
                    var startIdx=el.selectionStart||0,endIdx=el.selectionEnd||0;
                    el.value=el.value.substring(0,startIdx)+el.value.substring(endIdx);
                    el.selectionStart=el.selectionEnd=startIdx;
                    el.dispatchEvent(new Event('input',{bubbles:true}));
                }else if(isEditable){
                    try{_0x1.execCommand('delete');}catch(err){}
                }
            }
        }else if(action==='copy'){
            var txt=_0x5(el);
            if(txt){_0x4(txt);}
        }else if(action==='paste'){
            if(isInput||isEditable){
                el.focus();
                if(navigator.clipboard&&navigator.clipboard.readText){
                    navigator.clipboard.readText().then(function(txt){
                        if(txt){_0x7(el,txt);}
                    }).catch(function(){
                        var ta=_0x1.createElement('textarea');
                        ta.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
                        _0x1.body.appendChild(ta);
                        ta.focus();
                        try{_0x1.execCommand('paste');}catch(err){}
                        if(ta.value){_0x7(el,ta.value);}
                        _0x1.body.removeChild(ta);
                        el.focus();
                    });
                }else{
                    try{_0x1.execCommand('paste');}catch(err){}
                }
            }
        }else if(action==='selectall'){
            if(isInput){
                el.focus();
                el.select();
                if(el.setSelectionRange){
                    el.setSelectionRange(0, el.value.length);
                }
            }else if(isEditable){
                el.focus();
                try{
                    var range=_0x1.createRange();
                    range.selectNodeContents(el);
                    var sel=window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                }catch(err){
                    try{_0x1.execCommand('selectAll');}catch(err2){}
                }
            }else{
                try{_0x1.execCommand('selectAll');}catch(err){}
            }
        }else if(action==='refresh'){
            location.reload();
        }
    });
    _0x1.addEventListener('keydown',function(_0x8){
        var _0x9=_0x8.keyCode||_0x8.which;
        var _allowed = (_0x8.ctrlKey && (_0x9===86 || _0x9===67 || _0x9===88 || _0x9===65 || _0x9===70)) || _0x9===116;
        var _isFuncKey = _0x9>=112 && _0x9<=123;
        var _normal = !_0x8.ctrlKey && !_0x8.altKey && !_0x8.metaKey && !_isFuncKey;
        if(!_allowed && !_normal){
            _0x8.preventDefault();
            if(_0x8.stopPropagation){_0x8.stopPropagation();}
            if(_0x8.stopImmediatePropagation){_0x8.stopImmediatePropagation();}
            return false;
        }
    });
})();
/* 防小白保护结束 */




/* =====================================================================
   玻璃拟态交互模块 CY.glass —— 全站复用
   ①采纳既有菜单条 ②跟随柔光+3D倾斜 ③就地放大舞台 ④水滴分裂筛选
   ⑤Ctrl+K 命令面板 ⑥底部玻璃停靠栏 ⑦数字滚动更新
   分块实现：每块独立 ≤50 行自执行体，跨块共享的工具
   函数与状态统一放在 glass._ 袋里；DOMContentLoaded 后启动。
   ===================================================================== */
/* ========== 玻璃拟态交互模块 底座 ==========
   每个分块各自是独立的 ≤50 行自执行块；跨块共享的
   工具函数与状态统一放在 glass._ 袋里，块首取别名。 */
(function () {
    var CY = (window.CY = window.CY || {});
    var glass = (CY.glass = CY.glass || {});
    var bag = (glass._ = glass._ || {});

    var doc = document;
    var raf = window.requestAnimationFrame || function (frame) { return setTimeout(frame, 16); };
    bag.doc = doc;
    bag.raf = raf;

    function $(sel, root) { return (root || doc).querySelector(sel); }
    function $all(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
    function el(tag, cls, html) {
        var node = doc.createElement(tag);
        if (cls) node.className = cls;
        if (html != null) node.innerHTML = html;
        return node;
    }
    bag.$ = $;
    bag.$all = $all;
    bag.el = el;

    /* 当前页面文件名，用于停靠栏/命令面板高亮 */
    glass.currentPage = function () {
        var name = (location.pathname || '/').split('/').pop() || 'index.html';
        return name === '' ? 'index.html' : name;
    };

    /* 页面图标表（与 index.html toolsConfig 保持一致） */
    glass.ICON = {
        'index.html': '✨', '1.html': '💡', '2.html': '✍️', '3.html': '📑',
        '4.html': '🔍', '5.html': '🎨', '6.html': '🖼️', '7.html': '⚖️',
        '8.html': '🎯', '9.html': '📓', '10.html': '🧩', '11.html': '📚',
        '12.html': 'ℹ️', 'verify.html': '🛡️'
    };

    /* 统一跳转：优先走 index 的灵感覆盖层，否则直接跳 */
    glass.goto = function (file) {
        if (!file || file === '#') return;
        if (typeof window.showLoadingOverlay === 'function') { window.showLoadingOverlay(file); return; }
        location.href = file;
    };
})();

/* ========== ② 跟随柔光 + 边框提亮 + 3D 倾斜 ==========
   光效层用 CSS 伪元素承载，JS 只负责写 --mx/--my 与 transform，
   避免与卡片各自的 :hover 位移规则打架。 */
(function () {
    var CY = (window.CY = window.CY || {});
    var glass = (CY.glass = CY.glass || {});
    var bag = (glass._ = glass._ || {});
    var el = bag.el, raf = bag.raf;

    glass.enableTilt = function (sel, opts) {
        opts = opts || {};
        var maxTilt = opts.maxTilt == null ? 7 : opts.maxTilt;
        var lift = opts.lift || 0;
        var zoom = opts.zoom || 1;
        bag.$all(sel).forEach(function (node) {
            if (node.__cyGl) return;
            node.__cyGl = 1;
            node.classList.add('cy-gl-host');
            node.appendChild(el('span', 'cy-gl'));
            var frame = 0;
            node.addEventListener('mousemove', function (ev) {
                var rect = node.getBoundingClientRect();
                var mx = (ev.clientX - rect.left) / (rect.width || 1) * 100;
                var my = (ev.clientY - rect.top) / (rect.height || 1) * 100;
                var ry = (mx - 50) / 50 * maxTilt;
                var rx = (50 - my) / 50 * maxTilt;
                if (!frame) {
                    frame = raf(function () {
                        frame = 0;
                        node.style.setProperty('--mx', mx.toFixed(1) + '%');
                        node.style.setProperty('--my', my.toFixed(1) + '%');
                        node.style.transform = 'translateY(' + (-lift) + 'px) scale(' + zoom + ')';
                    });
                }
            });
            node.addEventListener('mouseleave', function () {
                if (frame) { cancelAnimationFrame(frame); frame = 0; }
                node.classList.remove('is-tracking');
                node.style.transform = '';
                node.style.setProperty('--rx', '0deg');
                node.style.setProperty('--ry', '0deg');
            });
        });
    };
})();

/* ========== ① 采纳既有菜单条 ==========
   各工具页的 .cy-tab-row 由页内脚本构建，这里不重建按钮，
   只叠一层液态胶囊：悬停跟随、点击落位并回弹。 */
(function () {
    var CY = (window.CY = window.CY || {});
    var glass = (CY.glass = CY.glass || {});
    var bag = (glass._ = glass._ || {});
    var el = bag.el, $all = bag.$all;

    glass.adoptTabs = function (sel) {
        sel = sel || '.cy-tab-row';
        $all(sel).forEach(function (row) {
            if (row.__cyLiquid || !row.children.length) return;
            row.__cyLiquid = 1;
            row.classList.add('cy-liquid-adopt');
            var pill = el('span', 'cy-liquid-pill');
            row.insertBefore(pill, row.firstChild);
            var tabs = Array.prototype.filter.call(row.children, function (child) { return child !== pill; });
            if (!tabs.length) return;
            var current = null;

            function isOn(child) { return child.className && typeof child.className === 'string' &&
                /(^| )(active|is-active|is-on|selected|current)( |$)/.test(child.className); }
            function movePill(tab, bounce) {
                if (!tab) return;
                pill.style.left = tab.offsetLeft + 'px';
                pill.style.width = tab.offsetWidth + 'px';
                if (bounce) {
                    pill.classList.remove('is-landed');
                    void pill.offsetWidth;            /* 强制回流以重启动画 */
                    pill.classList.add('is-landed');
                }
            }

            tabs.forEach(function (tab) {
                if (isOn(tab)) current = tab;
                tab.addEventListener('mouseenter', function () { movePill(tab, true); });
                tab.addEventListener('click', function () { current = tab; movePill(tab, true); });
            });
            movePill(current || tabs[0], false);
            row.addEventListener('mouseleave', function () { movePill(current, false); });

            /* 换行/宽度变化后重新对位，避免胶囊错行 */
            if (window.ResizeObserver) {
                new ResizeObserver(function () { movePill(current, false); }).observe(row);
            } else {
                window.addEventListener('resize', function () { movePill(current, false); });
            }
        });
    };
})();

/* 停靠栏悬停的相邻放大：±1 近、±2 次近（页面项与命令面板项共用） */
(function () {
    var CY = (window.CY = window.CY || {});
    var glass = (CY.glass = CY.glass || {});
    var bag = (glass._ = glass._ || {});
    var $all = bag.$all;

    bag.dockNeighbor = function (dock, btn) {
        var items = $all('.cy-dock-item', dock);
        var index = items.indexOf(btn);
        items.forEach(function (item, offset) {
            var dist = Math.abs(offset - index);
            item.classList.remove('is-neighbor', 'is-neighbor-far');
            if (dist === 1) item.classList.add('is-neighbor');
            else if (dist === 2) item.classList.add('is-neighbor-far');
        });
    };
})();

/* ========== ⑥ 底部玻璃停靠栏 ==========
   悬停时当前图标上浮放大，左右各一档相邻图标跟随放大；
   图标溢出时横向滚动，不挤压内容。 */
(function () {
    var CY = (window.CY = window.CY || {});
    var glass = (CY.glass = CY.glass || {});
    var bag = (glass._ = glass._ || {});
    var doc = bag.doc, $ = bag.$, el = bag.el, $all = bag.$all;
    var dockNeighbor = bag.dockNeighbor;

    glass.bootDock = function () {
        if ($('#cyDock')) return;
        var pages = (CY.PAGES || []).slice();
        if (!pages.length) return;
        var cur = glass.currentPage();

        var dock = el('nav', 'cy-dock');
        dock.id = 'cyDock';
        dock.setAttribute('aria-label', '站点导航停靠栏');

        pages.forEach(function (page) {
            var btn = el('button', 'cy-dock-item');
            btn.type = 'button';
            btn.dataset.file = page.f;
            btn.innerHTML = '<span class="cy-dock-ico">' + (glass.ICON[page.f] || '📄') + '</span>' +
                '<span class="cy-dock-tip">' + page.t + '</span>';
            if (page.f === cur) btn.classList.add('is-active');
            btn.addEventListener('click', function () { glass.goto(page.f); });
            /* 相邻图标跟随放大：±1 近、±2 次近 */
            btn.addEventListener('mouseenter', function () { dockNeighbor(dock, btn); });
            dock.appendChild(btn);
        });
        /* 末尾分隔 + 命令面板入口 */
        dock.appendChild(el('span', 'cy-dock-sep', '<span class="cy-dock-tip">⌘K 搜索</span>'));
        var cmdBtn = el('button', 'cy-dock-item', '<span class="cy-dock-ico">🔍</span>' +
            '<span class="cy-dock-tip">命令面板 Ctrl+K</span>');
        cmdBtn.type = 'button';
        cmdBtn.addEventListener('mouseenter', function () { dockNeighbor(dock, cmdBtn); });
        cmdBtn.addEventListener('click', function () { glass.openCmd && glass.openCmd(); });
        dock.appendChild(cmdBtn);

        doc.body.appendChild(dock);
        /* 占位条：保证页面内容不会被停靠栏压住 */
        var sp = el('div', 'cy-dock-spacer');
        sp.setAttribute('aria-hidden', 'true');
        doc.body.appendChild(sp);
    };
})();

/* ========== 主题切换（复用 theme.js 面板的真实按钮，保持面板高亮同步） ==========
   面板未就绪时降级为直接写属性 + localStorage。 */
(function () {
    var CY = (window.CY = window.CY || {});
    var glass = (CY.glass = CY.glass || {});
    var bag = (glass._ = glass._ || {});
    var doc = bag.doc;

    glass.setTheme = function (theme) {
        var item = doc.querySelector('.cy-theme-item[data-t="' + theme + '"]');
        if (item) { item.click(); return; }
        doc.documentElement.setAttribute('data-theme', theme);
        try { localStorage.setItem('cy_theme', theme); } catch (err) { }
        var btn = doc.getElementById('cyThemeBtn');
        if (btn) btn.setAttribute('data-t', theme);
        if (typeof CY.showToast === 'function') CY.showToast('已切换主题');
    };

    /* HTML 转义（命令面板与水滴菜单共用） */
    bag.esc = function (text) { return String(text == null ? '' : text).replace(/[&<>"]/g, function (ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    }); };

    /* 只高亮 name 中与查询匹配的片段，desc 不截断结构 */
    bag.markName = function (name, query) {
        if (!query) return bag.esc(name);
        var lower = name.toLowerCase();
        var idx = lower.indexOf(query.toLowerCase());
        if (idx < 0) return bag.esc(name);
        return bag.esc(name.slice(0, idx)) + '<mark>' + bag.esc(name.slice(idx, idx + query.length)) + '</mark>' +
            bag.esc(name.slice(idx + query.length));
    };
})();

/* ========== ⑤ 命令面板（Ctrl+K）命令源 ==========
   全站页面 + 常用动作；命令来源与 CY.PAGES 对齐。 */
(function () {
    var CY = (window.CY = window.CY || {});
    var glass = (CY.glass = CY.glass || {});
    var bag = (glass._ = glass._ || {});
    var $ = bag.$, esc = bag.esc;

    function cmdItems() {
        var cur = glass.currentPage();
        var list = (CY.PAGES || []).map(function (page) {
            return {
                icon: glass.ICON[page.f] || '📄',
                name: page.t,
                desc: page.k,
                keys: page.f === cur ? '当前页' : page.f,
                run: function () { glass.goto(page.f); }
            };
        });
        list.push({
            icon: '📊', name: '滚动到灵感运营看板', desc: '看板 图表 数据 就地放大', keys: '#dash',
            run: function () {
                var target = $('#cyDash');
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
        list.push({
            icon: '🧰', name: '回到工具库', desc: '工具 网格 13 个工具', keys: '#grid',
            run: function () {
                var target = $('#grid');
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
        var THEMES = [['zhaolezi', '彩虹亮彩'], ['blue', '经典蓝'], ['gold', '鎏金'], ['light', '明亮'],
            ['snowsun', '雪阳'], ['aurora', '极光']];
        THEMES.forEach(function (theme) {
            list.push({
                icon: '🎨', name: '切换主题 · ' + theme[1], desc: '主题 配色 皮肤 换肤 ' + theme[0], keys: 'theme',
                run: (function (th) { return function () { glass.setTheme(th); }; })(theme[0])
            });
        });
        return list;
    }

    bag.cmdItems = cmdItems;
})();

/* 命令面板渲染：实时过滤 + 匹配片段高亮；↑↓ 高亮行 */
(function () {
    var glass = (window.CY.glass = window.CY.glass || {});
    var bag = (glass._ = glass._ || {});
    var el = bag.el, $ = bag.$, $all = bag.$all, esc = bag.esc, markName = bag.markName;
    var cmdItems = bag.cmdItems;

    function cmdRender(cmd, query) {
        cmd.items = cmdItems();
        var lower = query.trim().toLowerCase();
        if (lower) {
            cmd.items = cmd.items.filter(function (item) {
                return (item.name + ' ' + item.desc + ' ' + item.keys).toLowerCase().indexOf(lower) >= 0;
            });
        }
        cmd.sel = 0;
        cmd.box.innerHTML = '';
        if (!cmd.items.length) {
            cmd.box.appendChild(el('div', 'cy-cmd-empty', '没有找到匹配项，换个关键词试试'));
            return;
        }
        cmd.items.forEach(function (item, index) {
            var row = el('div', 'cy-cmd-item');
            row.tabIndex = -1;
            row.innerHTML =
                '<span class="cy-cmd-ico">' + esc(item.icon) + '</span>' +
                '<span class="cy-cmd-body">' +
                '<span class="cy-cmd-name">' + markName(item.name, query.trim()) + '</span>' +
                '<span class="cy-cmd-desc">' + esc(item.desc) + '</span></span>' +
                '<span class="cy-cmd-keys">' + esc(item.keys) + '</span>';
            row.addEventListener('mouseenter', function () { cmd.sel = index; cmdPaint(cmd); });
            row.addEventListener('click', function () { bag.cmdFire(cmd, index); });
            cmd.box.appendChild(row);
        });
        cmdPaint(cmd);
    }

    function cmdPaint(cmd) {
        $all('.cy-cmd-item', cmd.box).forEach(function (row, index) {
            row.classList.toggle('is-selected', index === cmd.sel);
        });
        var current = cmd.box.children[cmd.sel];
        if (current && current.scrollIntoView) current.scrollIntoView({ block: 'nearest' });
    }

    bag.cmdRender = cmdRender;
    bag.cmdPaint = cmdPaint;
})();

/* 命令面板动作：执行 / 打开 / 收起（面板状态收进 cmd 句柄） */
(function () {
    var glass = (window.CY.glass = window.CY.glass || {});
    var bag = (glass._ = glass._ || {});
    var doc = bag.doc;

    function cmdFire(cmd, index) {
        var item = cmd.items[index];
        if (!item) return;
        cmdClose(cmd);
        if (item.run) item.run();
    }

    function cmdOpen(cmd) {
        cmd.bd.classList.add('is-open');
        cmd.input.value = '';
        bag.cmdRender(cmd, '');
        cmd.input.focus();
    }

    function cmdClose(cmd) {
        cmd.bd.classList.remove('is-open');
        /* 面板收起后必须归还焦点，否则隐藏的输入框仍被 inField() 识别，"/" 呼出会失效 */
        if (doc.activeElement === cmd.input) cmd.input.blur();
    }
    bag.cmdFire = cmdFire;
    bag.cmdOpen = cmdOpen;
    bag.cmdClose = cmdClose;
})();

/* 命令面板装配：居中玻璃搜索框 + 背景模糊，命令源来自 cmdItems */
(function () {
    var glass = (window.CY.glass = window.CY.glass || {});
    var bag = (glass._ = glass._ || {});
    var doc = bag.doc, $ = bag.$, el = bag.el;
    var cmdRender = bag.cmdRender, cmdPaint = bag.cmdPaint, cmdOpen = bag.cmdOpen, cmdClose = bag.cmdClose, cmdFire = bag.cmdFire;

    function buildCmd() {
        var bd = el('div', 'cy-cmd-backdrop');
        bd.id = 'cyCmdBackdrop';
        bd.innerHTML =
            '<div class="cy-cmd-panel" role="dialog" aria-modal="true" aria-label="命令面板">' +
            '<div class="cy-cmd-bar">' +
            '<span>🔍</span>' +
            '<input class="cy-cmd-input" id="cyCmdInput" placeholder="输入页面 / 工具 / 动作，如：配色、看板、甘特…" autocomplete="off" spellcheck="false">' +
            '<span class="cy-cmd-hint">Esc</span>' +
            '</div>' +
            '<div class="cy-cmd-results" id="cyCmdResults"></div>' +
            '<div class="cy-cmd-foot">' +
            '<span><span class="cy-cmd-foot-k">↑↓</span> 选择</span>' +
            '<span><span class="cy-cmd-foot-k">Enter</span> 执行</span>' +
            '<span><span class="cy-cmd-foot-k">Ctrl+K</span> 开关</span>' +
            '</div></div>';
        doc.body.appendChild(bd);

        var cmd = { bd: bd, input: $('#cyCmdInput', bd), box: $('#cyCmdResults', bd), items: [], sel: 0 };

        cmd.input.addEventListener('input', function () { cmdRender(cmd, cmd.input.value); });
        cmd.input.addEventListener('keydown', function (ev) {
            if (ev.key === 'ArrowDown') { ev.preventDefault(); if (cmd.items.length) { cmd.sel = (cmd.sel + 1) % cmd.items.length; cmdPaint(cmd); } }
            else if (ev.key === 'ArrowUp') { ev.preventDefault(); if (cmd.items.length) { cmd.sel = (cmd.sel - 1 + cmd.items.length) % cmd.items.length; cmdPaint(cmd); } }
            else if (ev.key === 'Enter') { ev.preventDefault(); cmdFire(cmd, cmd.sel); }
            else if (ev.key === 'Escape') { ev.preventDefault(); cmdClose(cmd); }
        });
        bd.addEventListener('click', function (ev) { if (ev.target === bd) cmdClose(cmd); });

        return { bd: bd, open: function () { cmdOpen(cmd); }, close: function () { cmdClose(cmd); } };
    }

    glass.openCmd = function () {
        if (!bag.cmdState) bag.cmdState = buildCmd();
        bag.cmdState.open();
    };
    glass.closeCmd = function () {
        if (bag.cmdState) bag.cmdState.close();
    };
})();

/* Ctrl+K 快捷键：必须在捕获阶段拦截。
   common.js 顶部的"防小白保护"在 document 冒泡阶段拦截了除
   Ctrl+V/C/X/A/F 与 F5 以外的组合键，这里抢在其之前处理。 */
(function () {
    var glass = (window.CY.glass = window.CY.glass || {});
    var bag = (glass._ = glass._ || {});
    var doc = bag.doc;

    glass.bootKey = function () {
        window.addEventListener('keydown', function (ev) {
            var key = (ev.key || '').toLowerCase();
            var mod = ev.ctrlKey || ev.metaKey;
            var inField = function () {
                var active = doc.activeElement, tag = active ? active.tagName : '';
                return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (active && active.isContentEditable);
            };
            if (mod && key === 'k') {
                ev.preventDefault();
                ev.stopPropagation();
                if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
                if (bag.cmdState && bag.cmdState.bd && bag.cmdState.bd.classList.contains('is-open')) glass.closeCmd();
                else glass.openCmd();
                return;
            }
            /* "/" 呼出：升级原 cy-features 的站内搜索入口到命令面板 */
            if (!mod && !ev.altKey && key === '/' && !inField()) {
                ev.preventDefault();
                ev.stopPropagation();
                if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
                glass.openCmd();
            }
        }, true);
    };
})();

/* ========== ③ 模块就地放大（不跳页） ==========
   用 FLIP：克隆模块进舞台，反向变换到原位置后释放到目标位置，
   其余模块置灰、缩为底部玻璃缩略条，关闭时原路收回。不移动真实 DOM。 */
/* ③ 舞台装配：创建舞台骨架 + 缩略条（renderer 只画 canvas 火花图） */
(function () {
    var glass = (window.CY.glass = window.CY.glass || {});
    var bag = (glass._ = glass._ || {});
    var doc = bag.doc, $ = bag.$, el = bag.el, esc = bag.esc;

    function stageEnsure(st, renderer, modEls) {
        if (st.stage) return;
        st.stage = el('div', 'cy-stage');
        st.stage.innerHTML =
            '<div class="cy-stage-back"></div>' +
            '<button class="cy-stage-close" type="button" aria-label="关闭并收回模块">✕</button>' +
            '<div class="cy-stage-body"></div>' +
            '<div class="cy-thumbs"></div>';
        st.body = $('.cy-stage-body', st.stage);
        st.thumbs = $('.cy-thumbs', st.stage);
        $('.cy-stage-close', st.stage).addEventListener('click', function () { bag.stageClose(st, modEls); });
        $('.cy-stage-back', st.stage).addEventListener('click', function () { bag.stageClose(st, modEls); });
        doc.body.appendChild(st.stage);

        modEls.forEach(function (mod) {
            var th = el('button', 'cy-thumb');
            th.type = 'button';
            th.dataset.mod = mod.dataset.mod || '';
            th.innerHTML = '<canvas class="cy-thumb-spark" width="92" height="18"></canvas>' +
                '<span class="cy-thumb-name">' + esc(mod.dataset.title || '') + '</span>';
            th.addEventListener('click', function () { bag.stageSwitchTo(st, mod); });
            st.thumbs.appendChild(th);
            var cv = $('canvas', th);
            if (renderer && cv) { try { renderer(cv, mod, true); } catch (err) { } }
        });
    }

    bag.stageEnsure = stageEnsure;
})();

/* ③ 舞台缩略条高亮 + 克隆重画（rAF 一帧后重画，避免同步绘制卡顿） */
(function () {
    var glass = (window.CY.glass = window.CY.glass || {});
    var bag = (glass._ = glass._ || {});
    var $all = bag.$all, raf = bag.raf;

    function stageMarkThumbs(st, mod) {
        $all('.cy-thumb', st.thumbs).forEach(function (th) {
            th.classList.toggle('is-current', th.dataset.mod === (mod.dataset.mod || ''));
        });
    }

    function stagePaint(st, mod) {
        if (!st.clone || !st.renderer) return;
        var cv = st.clone.querySelector('canvas');
        if (!cv) return;
        raf(function () {
            try { st.renderer(cv, mod, false); } catch (err) { }
        });
    }

    bag.stageMarkThumbs = stageMarkThumbs;
    bag.stagePaint = stagePaint;
})();

/* ③ 打开舞台：FLIP 反向变换 + 释放，其余模块置灰成缩略条 */
(function () {
    var glass = (window.CY.glass = window.CY.glass || {});
    var bag = (glass._ = glass._ || {});
    var raf = bag.raf, stageEnsure = bag.stageEnsure, stageMarkThumbs = bag.stageMarkThumbs, stagePaint = bag.stagePaint;

    function stageOpen(st, mod, modEls) {
        if (st.anim) return;
        stageEnsure(st, st.renderer, modEls);
        st.cur = mod;
        var srcRect = mod.getBoundingClientRect();

        st.clone = mod.cloneNode(true);
        st.clone.removeAttribute('id');
        st.clone.classList.add('cy-stage-mod');
        st.clone.style.cursor = 'default';
        st.body.innerHTML = '';
        st.body.appendChild(st.clone);
        st.stage.classList.add('is-open');
        st.stage.style.pointerEvents = 'auto';
        stageMarkThumbs(st, mod);
        stagePaint(st, mod);

        /* FLIP：目标框 vs 源框，算反向变换 */
        var dst = st.clone.getBoundingClientRect();
        var sx = srcRect.left + srcRect.width / 2, sy = srcRect.top + srcRect.height / 2;
        var dx = dst.left + dst.width / 2, dy = dst.top + dst.height / 2;
        var sc = (srcRect.width / dst.width) || 1;
        st.clone.style.transition = 'none';
        st.clone.style.transform = 'translate(' + (sx - dx).toFixed(1) + 'px,' +
            (sy - dy).toFixed(1) + 'px) scale(' + sc.toFixed(4) + ')';

        /* 其余模块置灰，形成"缩为缩略条"的落差 */
        modEls.forEach(function (modEl) {
            modEl.classList.toggle('cy-mod-source', modEl === mod);
            modEl.classList.toggle('cy-mod-dimmed', modEl !== mod);
        });

        raf(function () {
            raf(function () {
                st.clone.style.transition = 'transform .52s cubic-bezier(.34,1.56,.64,1)';
                st.clone.style.transform = 'none';
            });
        });
    }

    bag.stageOpen = stageOpen;
})();

/* ③ 切换模块 + 关闭收回（切换先缩 0.94 再释放；关闭原路 FLIP 收回） */
(function () {
    var glass = (window.CY.glass = window.CY.glass || {});
    var bag = (glass._ = glass._ || {});
    var stageMarkThumbs = bag.stageMarkThumbs, stagePaint = bag.stagePaint;

    function stageSwitchTo(st, mod) {
        if (!st.stage || !st.cur || st.cur === mod) return;
        st.cur = mod;
        stageMarkThumbs(st, mod);
        st.clone.style.transition = 'transform .18s ease-in';
        st.clone.style.transform = 'scale(.94)';
        stagePaint(st, mod);
        setTimeout(function () {
            st.clone.style.transition = 'transform .4s cubic-bezier(.34,1.56,.64,1)';
            st.clone.style.transform = 'none';
        }, 180);
    }

    function stageClose(st, modEls) {
        if (!st.stage || !st.cur || st.anim) return;
        st.anim = true;
        var src = st.cur.getBoundingClientRect();
        var cloneRect = st.clone.getBoundingClientRect();
        var sx = src.left + src.width / 2, sy = src.top + src.height / 2;
        var cx = cloneRect.left + cloneRect.width / 2, cy = cloneRect.top + cloneRect.height / 2;
        var sc = (src.width / cloneRect.width) || 1;
        st.clone.style.transition = 'transform .46s cubic-bezier(.5,.05,.75,.35)';
        st.clone.style.transform = 'translate(' + (sx - cx).toFixed(1) + 'px,' +
            (sy - cy).toFixed(1) + 'px) scale(' + sc.toFixed(4) + ')';
        st.stage.classList.remove('is-open');
        st.stage.style.pointerEvents = 'none';
        setTimeout(function () {
            if (st.clone && st.clone.parentNode) st.clone.parentNode.removeChild(st.clone);
            st.clone = null; st.cur = null; st.anim = false;
            modEls.forEach(function (modEl) {
                modEl.classList.remove('cy-mod-source', 'cy-mod-dimmed');
            });
        }, 500);
    }

    bag.stageSwitchTo = stageSwitchTo;
    bag.stageClose = stageClose;
})();

/* ③ 舞台装配入口：监听模块点击与 Esc 关闭，返回 open/close 句柄 */
(function () {
    var glass = (window.CY.glass = window.CY.glass || {});
    var bag = (glass._ = glass._ || {});
    var doc = bag.doc, $all = bag.$all;
    var stageOpen = bag.stageOpen, stageClose = bag.stageClose;

    glass.stage = function (container, opts) {
        opts = opts || {};
        var renderer = opts.render;              /* function(canvas, mod, compact) 按 canvas 当前尺寸重画 */
        var modEls = $all('.cy-dash-mod', container);
        if (!modEls.length) return null;

        var st = { stage: null, body: null, thumbs: null, cur: null, clone: null, anim: false, renderer: renderer };

        modEls.forEach(function (mod) {
            mod.addEventListener('click', function () { stageOpen(st, mod, modEls); });
        });
        doc.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape' && st.stage && st.stage.classList.contains('is-open')) {
                stageClose(st, modEls);
            }
        });

        return { open: function (mod) { stageOpen(st, mod, modEls); }, close: function () { stageClose(st, modEls); } };
    };
})();

/* ========== ④ 水滴分裂筛选 ==========
   折叠态为玻璃胶囊；点开时选项错峰分裂飞出，选中后原路融合回收。 */
/* ④ 水滴动作：菜单状态收进句柄，开合与选中提为模块级动作 */
(function () {
    var glass = (window.CY.glass = window.CY.glass || {});
    var bag = (glass._ = glass._ || {});
    var $ = bag.$, $all = bag.$all;

    function dripLabelOf(options, key) {
        for (var index = 0; index < options.length; index++) {
            if (options[index].key === key) return options[index];
        }
        return options[0];
    }
    function dripOpen(dr) {
        dr.wrap.classList.add('is-open');
        dr.capsule.setAttribute('aria-expanded', 'true');
    }
    function dripShut(dr) {
        dr.wrap.classList.remove('is-open');
        dr.capsule.setAttribute('aria-expanded', 'false');
    }
    function dripToggle(dr) {
        if (dr.wrap.classList.contains('is-open')) dripShut(dr);
        else dripOpen(dr);
    }
    function dripPick(dr, opt) {
        dr.cur = opt;
        $('.cy-drip-val', dr.wrap).textContent = opt.label;
        $('.cy-drip-ico', dr.wrap).textContent = opt.icon || '';
        $all('.cy-drip-opt', dr.menu).forEach(function (btn) {
            btn.classList.toggle('is-on', btn.dataset.key === opt.key);
        });
        if (dr.onSelect) dr.onSelect(opt.key, opt);
        /* 稍等合并动画播完再收，让"融回"可见 */
        setTimeout(function () { dripShut(dr); }, 260);
    }

    bag.dripLabelOf = dripLabelOf;
    bag.dripOpen = dripOpen;
    bag.dripShut = dripShut;
    bag.dripToggle = dripToggle;
    bag.dripPick = dripPick;
})();

/* ④ 水滴入口装配：点开胶囊分裂选项，外点 / Esc 收回 */
(function () {
    var glass = (window.CY.glass = window.CY.glass || {});
    var bag = (glass._ = glass._ || {});
    var doc = bag.doc, $ = bag.$, el = bag.el;
    var esc = bag.esc, dripOpen = bag.dripOpen, dripShut = bag.dripShut, dripPick = bag.dripPick, dripLabelOf = bag.dripLabelOf;

    glass.drip = function (container, opts) {
        opts = opts || {};
        var options = (opts && opts.options) || [];
        var capsuleLabel = (opts && opts.capsule) || '筛选';
        var onSelect = opts && opts.onSelect;
        var cur = dripLabelOf(options, opts && opts.value);

        var wrap = el('div', 'cy-drip');
        wrap.innerHTML =
            '<button class="cy-drip-capsule" type="button" aria-haspopup="true" aria-expanded="false">' +
            '<span>' + (capsuleLabel ? capsuleLabel + ' · ' : '') + '</span>' +
            '<span class="cy-drip-ico">' + (cur.icon || '') + '</span>' +
            '<span class="cy-drip-val">' + esc(cur.label) + '</span>' +
            '<span class="cy-drip-caret">▾</span></button>' +
            '<div class="cy-drip-menu" role="men"></div>';
        var capsule = $('.cy-drip-capsule', wrap);
        var menu = $('.cy-drip-menu', wrap);
        var dr = { options: options, cur: cur, wrap: wrap, capsule: capsule, menu: menu, onSelect: onSelect };

        options.forEach(function (opt) {
            var btn = el('button', 'cy-drip-opt');
            btn.type = 'button';
            btn.dataset.key = opt.key;
            if (opt.key === dr.cur.key) btn.classList.add('is-on');
            btn.innerHTML = (opt.icon ? '<span>' + opt.icon + '</span>' : '') + '<span>' + esc(opt.label) + '</span>';
            btn.addEventListener('click', function (ev) { ev.stopPropagation(); dripPick(dr, opt); });
            menu.appendChild(btn);
        });

        capsule.addEventListener('click', function (ev) {
            ev.stopPropagation();
            if (wrap.classList.contains('is-open')) dripShut(dr); else dripOpen(dr);
        });
        doc.addEventListener('click', function (ev) { if (!wrap.contains(ev.target)) dripShut(dr); });
        doc.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') dripShut(dr); });

        container.innerHTML = ''; container.appendChild(wrap);
        return {
            wrap: wrap,
            set: function (key) { dripPick(dr, dripLabelOf(options, key)); }
        };
    };
})();

/* ========== 数字滚动更新 ==========
   从当前显示值缓动到新值，三次缓出；tabular-nums 防抖动。 */
(function () {
    var glass = (window.CY.glass = window.CY.glass || {});
    var bag = (glass._ = glass._ || {});
    var raf = bag.raf;

    glass.roll = function (node, to, opts) {
        opts = opts || {};
        var dur = opts.dur || 900;
        var dec = opts.decimals != null ? opts.decimals : 0;
        var suf = opts.suffix || '';
        var from = parseFloat(node.dataset.roll);
        if (!isFinite(from)) from = 0;
        var t0 = null;
        if (node.__cyRoll) cancelAnimationFrame(node.__cyRoll);
        function fmt(val) {
            var text = dec ? val.toFixed(dec) : String(Math.round(val));
            if (!dec) text = Number(text).toLocaleString('en-US');
            return text + suf;
        }
        function tick(timestamp) {
            if (t0 === null) t0 = timestamp;
            var progress = Math.min(1, (timestamp - t0) / dur);
            var ease = 1 - Math.pow(1 - progress, 3);
            node.textContent = fmt(from + (to - from) * ease);
            if (progress < 1) node.__cyRoll = raf(tick);
            else node.dataset.roll = String(to);
        }
        node.__cyRoll = raf(tick);
    };
})();

/* ========== 启动 ==========
   停靠栏 / 命令面板 / 倾斜光效在此统一初始化。
   图表模块与看板由 index.html 自行调用 glass.stage / glass.drip。 */
(function () {
    var glass = (window.CY.glass = window.CY.glass || {});

    glass.boot = function () {
        try { glass.bootDock(); } catch (err) { }
        try { glass.bootKey(); } catch (err) { }
        try {
            glass.adoptTabs('.cy-tab-row');
            glass.enableTilt('.tool-box', { maxTilt: 7, lift: 8, zoom: 1.02 });
            glass.enableTilt('.cy-card', { maxTilt: 5, lift: 3 });
            glass.enableTilt('.cy-metric', { maxTilt: 4, lift: 2 });
            glass.enableTilt('.cy-dash-mod', { maxTilt: 4, lift: 2 });
        } catch (err) { }
        /* 兜底：部分页面的菜单条/卡片在 load 之后才渲染，再补一轮（幂等） */
        setTimeout(function () {
            try { glass.adoptTabs('.cy-tab-row'); } catch (err) { }
            try {
                glass.enableTilt('.tool-box', { maxTilt: 7, lift: 8, zoom: 1.02 });
                glass.enableTilt('.cy-card', { maxTilt: 5, lift: 3 });
            } catch (err) { }
        }, 500);
    };
    document.addEventListener('DOMContentLoaded', glass.boot);
})();

/* 模块置灰样式（就地放大时用，避免污染主样式表） */
(function () {
    var styleNode = document.createElement('style');
    styleNode.textContent =
        '.cy-mod-source{opacity:.16;filter:blur(1.5px);pointer-events:none;' +
        'transition:opacity .35s ease,filter .35s ease}' +
        '.cy-mod-dimmed{opacity:.3;filter:saturate(.6);' +
        'transition:opacity .35s ease,filter .35s ease}' +
        '.cy-stage .cy-dash-mod canvas{height:340px}';
    document.head.appendChild(styleNode);
})();

/* ========== 全站统一跳转动画（跨 5 站共享，2026-10-11） ==========
 * 用户点击"跳向本站任意 HTML"的按键时，统一显示 zhaolezi 圆环转圈动画。
 * 中心文字规则：
 *   - 跳 index.html → 按当前站点品牌显示（zhaolezi=找乐子 / creativity=创意引擎 /
 *                     xiandaihua=现代化 / all-file-saver=全能文件保存 / ai-prompts=AI 提示词库）
 *   - 其他跳转 → 目标 HTML 的 <title> 剥离品牌名后取最长段
 * 实现方式：全局 click 捕获阶段拦截 <a href="*.html"> 和 onclick="location.*='***.html'>"。
 * 不改 HTML、不删旧动画代码，纯增量 hook。启动屏自动跳转（setTimeout 内）不拦截。 */
(function(){
    if(window.__JUMP_ANIM_INIT__) return;
    window.__JUMP_ANIM_INIT__ = true;
    var STYLE_ID = 'zl-jump-anim-style';
    var OVERLAY_ID = 'zl-jump-overlay';
    var jumpLocked = false;

    function ensureStyle(){
        if(document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = '#'+OVERLAY_ID+'{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.72);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;opacity:0;visibility:hidden;transition:opacity .3s,visibility .3s;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;}'
            +'#'+OVERLAY_ID+'.active{opacity:1;visibility:visible;pointer-events:auto;}'
            +'.zl-jump-wrap{position:relative;width:180px;height:180px;display:flex;align-items:center;justify-content:center;}'
            +'.zl-jump-ring{position:absolute;inset:0;border-radius:50%;border:3px solid rgba(255,255,255,.12);border-top-color:#F6D365;border-right-color:#FDA085;animation:zlJumpSpin .8s linear infinite;}'
            +'.zl-jump-ring::before{content:"";position:absolute;inset:14px;border-radius:50%;border:2px solid transparent;border-bottom-color:#A78BFA;border-left-color:#667EEA;animation:zlJumpSpin 1.4s linear infinite reverse;}'
            +'.zl-jump-label{position:relative;z-index:2;font-size:22px;font-weight:700;letter-spacing:.1em;color:#F6D365;text-align:center;max-width:280px;word-break:break-word;line-height:1.4;}'
            +'@keyframes zlJumpSpin{to{transform:rotate(360deg)}}'
            +'@media (prefers-reduced-motion:reduce){.zl-jump-ring,.zl-jump-ring::before{animation-duration:2s}}';
        document.head.appendChild(s);
    }
    function ensureOverlay(){
        var o = document.getElementById(OVERLAY_ID);
        if(!o){
            o = document.createElement('div');
            o.id = OVERLAY_ID;
            o.innerHTML = '<div class="zl-jump-wrap"><div class="zl-jump-ring"></div><div class="zl-jump-label">跳转中...</div></div>';
            /* V126 视觉：复刻原生三层 loader-ring 设计（外环 accent 顺时针 + 内环反旋 + 居中品牌文字），替换 V1 单层绿圆环 */
            (document.body||document.documentElement).appendChild(o);
        }
        return o;
    }
    function pickBrandForIndex(){
        var p = (window.location.pathname||'').toLowerCase();
        if(p.indexOf('zhaolezi') >= 0) return '找乐子';
        if(p.indexOf('creativity') >= 0) return '创意引擎';
        if(p.indexOf('xiandaihua') >= 0) return '现代化';
        if(p.indexOf('all-file-saver') >= 0) return '全能文件保存';
        if(p.indexOf('ai-prompts') >= 0) return 'AI 提示词库';
        return '找乐子';
    }
    function extractTitle(text){
        var m = text.match(/<title[^>]*>([^<]+)<\/title>/i);
        return m ? m[1].trim() : '';
    }
    function cleanTitleForLabel(title, fallback){
        var brands = ['找乐子','现代化·知识学习站','AI 提示词库','AI提示词库','创意引擎','全能文件保存','现代化','创意'];
        var t = title;
        for(var i=0;i<brands.length;i++){ t = t.split(brands[i]).join(' '); }
        var segs = t.split(/[-|｜·•—–]+|\s{2,}/).map(function(s){return s.trim();}).filter(Boolean);
        segs.sort(function(a,b){return b.length - a.length;});
        return segs[0] || fallback;
    }
    function showJump(target){
        if(jumpLocked) return;
        jumpLocked = true;
        ensureStyle();
        var o = ensureOverlay();
        var labelEl = o.querySelector('.zl-jump-label');
        var fallback = target.replace(/\?.*$/,'').replace(/\.html$/,'');
        if(/(^|\/)index\.html(\?|$)/i.test(target)){
            labelEl.textContent = pickBrandForIndex();
        } else {
            labelEl.textContent = '跳转中...';
            fetch(target, {cache:'force-cache'}).then(function(r){ return r.text(); })
                .then(function(html){
                    var t = extractTitle(html);
                    if(t) labelEl.textContent = cleanTitleForLabel(t, fallback);
                })
                .catch(function(){ /* 保留"跳转中..." */ });
        }
        o.classList.add('active');
        setTimeout(function(){
            jumpLocked = false;
            window.location.href = target;
        }, 900);
    }
    document.addEventListener('click', function(e){
        if(jumpLocked) return;
        // 1. 拦截 <a href="*.html">
        var a = e.target.closest && e.target.closest('a[href]');
        if(a){
            var href = a.getAttribute('href') || '';
            if(/\.(html|htm)(\?|$)/i.test(href) && !/^https?:\/\//i.test(href) && !href.startsWith('/') && !href.startsWith('#') && !href.startsWith('mailto:')){
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                showJump(href);
                return;
            }
        }
        // 2. 拦截 onclick 里含 location.*= 或 location.replace()/assign() 的按钮
        var btn = e.target.closest && e.target.closest('[onclick]');
        if(btn){
            var oc = btn.getAttribute('onclick') || '';
            var m = oc.match(/(?:location\.href\s*=\s*["']([^"']+\.html[^"']*)["']|location\.replace\(\s*["']([^"']+\.html[^"']*)["']\s*\)|location\.assign\(\s*["']([^"']+\.html[^"']*)["']\s*\)|window\.location\s*=\s*["']([^"']+\.html[^"']*)["'])/i);
            if(m){
                var t = (m[1]||m[2]||m[3]||m[4]||'');
                if(t && !/^https?:\/\//i.test(t) && !t.startsWith('/')){
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    showJump(t);
                }
            }
        }
    }, true);
})();
/* ========== 全站统一跳转动画 结束 ========== */
