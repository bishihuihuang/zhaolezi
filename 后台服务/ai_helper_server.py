# AI三助手协同台 - 本地助手服务 v2.1
# -*- coding: utf-8 -*-
r"""
AI 三助手协同台 —— 本地助手服务（增强版）
================================================
功能：
  1. 浏览器管理：启动独立 Edge（独立 profile 保存登录态），管理 豆包/DeepSeek/千问 标签页
  2. AI 自动化：打开官网、上传文件、发送提示词、读取 AI 完整答复（失败时返回明确的降级信号）
  3. 执行引擎：在用户电脑上执行 AI 给出的命令 / PowerShell / Python 代码（危险命令拦截 + 日志）
  4. 文件中转：前端选择的文件保存到工作目录，供 selenium 上传到 AI

安全：
  - 仅监听 127.0.0.1，不对外网开放
  - 危险命令黑名单拦截（format / rm -rf / / del /s C:\ / reg delete 等）
  - 所有执行操作记录完整日志（命令、时间、返回码、输出）
  - 浏览器使用独立 profile，不影响用户日常 Edge
  - 不调用任何付费 API，全程使用免费网页对话

依赖：selenium>=4.6（自动管理 EdgeDriver）。未安装时服务仍可启动，浏览器相关接口返回友好提示。
"""
import json
import os
import sys
import re
import time
import threading
import subprocess
import shutil
import base64
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

# ================================================================
# 配置
# ================================================================
HOST = '127.0.0.1'
PORT = 8765
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# CDP调试端口（连接用户已运行的Edge，继承登录态）
CDP_PORT = 9222
# 独立profile（CDP不可用时的兜底）
PROFILE_DIR = os.path.join(BASE_DIR, 'edge_profile')
PROFILE_NAME = 'ai-helper'
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploaded_files')
DEFAULT_WORK_DIR = os.path.join(os.path.expanduser('~'), 'Desktop', 'AI任务工作目录')
LOG_FILE = os.path.join(BASE_DIR, 'exec_log.json')

APPS = {
    'doubao':   {'name': '豆包',     'url': 'https://www.doubao.com/chat/'},
    'deepseek': {'name': 'DeepSeek', 'url': 'https://chat.deepseek.com/'},
    'qwen':     {'name': '通义千问', 'url': 'https://tongyi.aliyun.com/qianwen/'},
}

# 别名映射（兼容不同写法）
APP_ALIASES = {
    'qianwen': 'qwen',
    'tongyi': 'qwen',
    'tongyiqianwen': 'qwen',
    'doubao.com': 'doubao',
    'deepseek.com': 'deepseek',
}

def resolve_app(app):
    """解析 AI 名称（处理别名和大小写）。"""
    if not app:
        return None
    key = str(app).strip().lower()
    if key in APPS:
        return key
    if key in APP_ALIASES:
        return APP_ALIASES[key]
    return None

# 危险命令模式（命中即拦截）
DANGEROUS_PATTERNS = [
    r'format\s+[a-zA-Z]:',           # format C:
    r'rm\s+-rf\s+(/|~|/\*)',         # rm -rf /
    r'del\s+/[sqf]+\s+[a-zA-Z]:\\',  # del /s /q C:\
    r'rd\s+/[sq]+\s+[a-zA-Z]:\\',    # rd /s /q C:\
    r'reg\s+delete',                   # reg delete
    r'diskpart',                       # diskpart
    r'cipher\s+/w:',                  # cipher /w
    r':\(\)\s*\{',                     # fork bomb
    r'mkfs',                           # mkfs
    r'dd\s+if=',                       # dd if=
    r'chmod\s+-R\s+777\s+/',         # chmod -R 777 /
    r'shutdown\s+/s',                  # shutdown /s
    r'taskkill\s+/f\s+/im\s+explorer', # kill explorer
]

# ================================================================
# 全局状态（线程安全）
# ================================================================
_lock = threading.Lock()
_ev = threading.Event()
_ev.set()

_state = {
    'driver': None,
    'tabs': {},            # app -> window handle
    'work_dir': DEFAULT_WORK_DIR,
    'exec_log': [],
    'selenium_available': None,
    'selenium_error': '',
    'cdp_mode': False,     # 是否通过CDP连接用户已运行的浏览器
    'op_log': [],          # 操作日志（内存）
    'msg_count': {},       # app -> 发送前的消息数量
    'browser_lock': False, # 浏览器操作并发锁
    'request_count': 0,    # 请求计数
}


def _s():
    return _state


def op_log(level, message):
    """记录操作日志（内存）"""
    entry = {
        'time': time.strftime('%Y-%m-%d %H:%M:%S'),
        'level': level,
        'message': str(message)[:500]
    }
    _state['op_log'].append(entry)
    if len(_state['op_log']) > 200:
        _state['op_log'] = _state['op_log'][-200:]
    # 同时输出到控制台（方便调试）
    try:
        print(f'[{entry["time"]}] [{level}] {entry["message"]}')
    except Exception:
        pass


def log_exec(entry):
    """记录执行日志（内存 + 文件）"""
    entry['time'] = time.strftime('%Y-%m-%d %H:%M:%S')
    _state['exec_log'].append(entry)
    try:
        with open(LOG_FILE, 'w', encoding='utf-8') as f:
            json.dump(_state['exec_log'][-500:], f, ensure_ascii=False, indent=2)
    except Exception:
        pass


# ================================================================
# 危险命令检测
# ================================================================
def is_dangerous(command):
    cmd_lower = command.lower()
    for pat in DANGEROUS_PATTERNS:
        if re.search(pat, cmd_lower):
            return True
    return False


# ================================================================
# 执行引擎
# ================================================================
def exec_command(command, cmd_type='cmd', work_dir=None, timeout=120):
    """
    在用户电脑上执行命令。
    cmd_type: cmd / powershell / python
    返回 dict: {ok, returncode, stdout, stderr, command, error?}
    """
    command = (command or '').strip()
    if not command:
        return {'ok': False, 'error': '命令为空', 'command': command}

    if is_dangerous(command):
        log_exec({'command': command, 'type': cmd_type, 'blocked': True,
                  'error': '检测到危险命令，已自动拦截'})
        return {'ok': False, 'blocked': True,
                'error': '检测到危险命令，已自动拦截。如需执行请确认安全性后手动操作。',
                'command': command}

    work_dir = work_dir or _state['work_dir']
    try:
        os.makedirs(work_dir, exist_ok=True)
    except Exception as e:
        return {'ok': False, 'error': '无法创建工作目录: ' + str(e), 'command': command}

    try:
        if cmd_type == 'python':
            # 写入临时文件再执行，避免命令行转义问题
            tmp_file = os.path.join(work_dir, '_ai_tmp_exec_%d.py' % int(time.time() * 1000))
            with open(tmp_file, 'w', encoding='utf-8') as f:
                f.write('# -*- coding: utf-8 -*-\n')
                f.write(command)
            proc = subprocess.Popen(
                [sys.executable, tmp_file],
                cwd=work_dir,
                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                env=dict(os.environ, PYTHONIOENCODING='utf-8')
            )
            try:
                stdout, stderr = proc.communicate(timeout=timeout)
            finally:
                try:
                    os.remove(tmp_file)
                except Exception:
                    pass
            stdout = stdout.decode('utf-8', errors='replace')
            stderr = stderr.decode('utf-8', errors='replace')
            rc = proc.returncode

        elif cmd_type == 'powershell':
            proc = subprocess.Popen(
                ['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
                cwd=work_dir,
                stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            stdout, stderr = proc.communicate(timeout=timeout)
            stdout = stdout.decode('utf-8', errors='replace')
            stderr = stderr.decode('utf-8', errors='replace')
            rc = proc.returncode

        else:  # cmd
            # 用 /c 执行，chcp 65001 强制 UTF-8 输出
            full_cmd = 'chcp 65001 >nul 2>&1 && ' + command
            proc = subprocess.Popen(
                ['cmd', '/c', full_cmd],
                cwd=work_dir,
                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                shell=False
            )
            stdout, stderr = proc.communicate(timeout=timeout)
            stdout = stdout.decode('utf-8', errors='replace')
            stderr = stderr.decode('utf-8', errors='replace')
            rc = proc.returncode

        result = {
            'ok': rc == 0,
            'returncode': rc,
            'stdout': stdout[-6000:] if len(stdout) > 6000 else stdout,
            'stderr': stderr[-4000:] if len(stderr) > 4000 else stderr,
            'command': command,
            'type': cmd_type,
        }
        log_exec(result)
        return result

    except subprocess.TimeoutExpired:
        result = {'ok': False, 'error': '执行超时（%d秒），进程可能仍在运行' % timeout,
                  'command': command, 'type': cmd_type, 'timeout': True}
        log_exec(result)
        return result
    except Exception as e:
        result = {'ok': False, 'error': str(e), 'command': command, 'type': cmd_type}
        log_exec(result)
        return result


# ================================================================
# Selenium 懒加载
# ================================================================
def _ensure_selenium():
    """确保 selenium 可用。返回 (True, '') 或 (False, error_msg)。"""
    if _state['selenium_available'] is not None:
        return _state['selenium_available'], _state['selenium_error']
    try:
        import selenium  # noqa
        from selenium import webdriver  # noqa
        from selenium.webdriver.edge.options import Options  # noqa
        _state['selenium_available'] = True
        _state['selenium_error'] = ''
        return True, ''
    except ImportError as e:
        _state['selenium_available'] = False
        _state['selenium_error'] = str(e)
        return False, str(e)


def _selenium_modules():
    """导入并返回 selenium 相关模块。"""
    from selenium import webdriver
    from selenium.webdriver.edge.options import Options
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.common.exceptions import (
        TimeoutException, NoSuchElementException, ElementNotInteractableException,
        StaleElementReferenceException, WebDriverException
    )
    return {
        'webdriver': webdriver, 'Options': Options, 'By': By,
        'WebDriverWait': WebDriverWait, 'EC': EC,
        'TimeoutException': TimeoutException, 'NoSuchElementException': NoSuchElementException,
        'ElementNotInteractableException': ElementNotInteractableException,
        'StaleElementReferenceException': StaleElementReferenceException,
        'WebDriverException': WebDriverException,
    }


# ================================================================
# 浏览器管理
# ================================================================
def _kill_residual_edge(clean_profile=False, kill_all=False):
    """清理可能锁定 profile 目录的残留 Edge 进程。
    kill_all=True 时杀死所有Edge进程（用于解决启动失败问题）。
    clean_profile=True 时同时删除profile目录（用于修复损坏的profile）。"""
    killed = 0
    try:
        import subprocess
        if kill_all:
            # 杀死所有Edge进程
            result = subprocess.run(['taskkill', '/F', '/IM', 'msedge.exe'], capture_output=True, text=True, timeout=10)
            killed = result.stdout.count('成功') + result.stdout.count('SUCCESS')
            op_log('info', '已杀死所有Edge进程')
        else:
            # 只杀死使用我们profile的Edge进程
            result = subprocess.run(
                ['wmic', 'process', 'where', "name='msedge.exe'", 'get', 'processid,commandline'],
                capture_output=True, text=True, timeout=10
            )
            for line in result.stdout.split('\n'):
                if PROFILE_DIR.replace('\\', '\\\\') in line or 'ai-helper' in line or 'edge_profile' in line:
                    parts = line.strip().split()
                    if parts:
                        try:
                            pid = int(parts[-1])
                            subprocess.run(['taskkill', '/F', '/PID', str(pid)], capture_output=True, timeout=5)
                            killed += 1
                        except Exception:
                            pass
    except Exception:
        pass

    # 等待进程完全退出
    time.sleep(2)

    # 清理锁定文件
    try:
        import os
        if os.path.exists(PROFILE_DIR):
            for root, dirs, files in os.walk(PROFILE_DIR):
                for f in files:
                    if f.endswith('.lock') or f == 'SingletonLock' or f == 'SingletonCookie' or f == 'SingletonSocket':
                        try:
                            os.remove(os.path.join(root, f))
                        except Exception:
                            pass
    except Exception:
        pass

    # 如果需要，删除整个profile目录
    if clean_profile:
        try:
            import shutil
            if os.path.exists(PROFILE_DIR):
                shutil.rmtree(PROFILE_DIR, ignore_errors=True)
                op_log('info', '已删除损坏的profile目录，将重新创建')
        except Exception as e:
            op_log('warn', '删除profile目录失败: ' + str(e))

    if killed > 0:
        op_log('info', f'已清理{killed}个残留Edge进程')
    time.sleep(1)
    return killed


def _try_cdp_connect(mod):
    """尝试通过CDP连接用户已运行的Edge（继承登录态）。"""
    try:
        import urllib.request
        # 检查CDP端口是否可用
        resp = urllib.request.urlopen('http://127.0.0.1:%d/json/version' % CDP_PORT, timeout=3)
        info = json.loads(resp.read().decode('utf-8'))
        if 'webSocketDebuggerUrl' in info:
            opts = mod['Options']()
            opts.add_experimental_option('debuggerAddress', '127.0.0.1:%d' % CDP_PORT)
            driver = mod['webdriver'].Edge(options=opts)
            return driver
    except Exception:
        pass
    return None


def start_browser(max_retries=2):
    """启动浏览器。优先通过CDP连接用户已运行的Edge（继承登录态），失败则启动独立profile。"""
    op_log('info', '开始启动浏览器...')
    ok, err = _ensure_selenium()
    if not ok:
        op_log('error', 'selenium未安装: ' + str(err))
        return {'ok': False, 'error': '未安装 selenium。请双击运行「安装依赖.bat」，或执行 pip install selenium。详细错误: ' + err}

    if _state['driver'] is not None:
        op_log('info', '浏览器已在运行')
        return {'ok': True, 'message': '浏览器已在运行', 'already_started': True}

    mod = _selenium_modules()
    op_log('info', 'selenium模块加载完成')

    # 策略1：通过CDP连接用户已运行的Edge（继承登录态）
    op_log('info', '尝试通过CDP连接用户已运行的Edge...')
    driver = _try_cdp_connect(mod)
    if driver is not None:
        _state['driver'] = driver
        _state['tabs'] = {}
        _state['cdp_mode'] = True
        op_log('ok', 'CDP连接成功，继承登录态')
        return {'ok': True, 'message': '已连接到您正在使用的 Edge 浏览器（继承登录态）', 'cdp_mode': True}
    op_log('info', 'CDP连接失败，将启动独立profile')

    # 策略2：启动独立profile的Edge
    _state['cdp_mode'] = False
    last_error = ''
    last_error_type = ''
    # 启动前先清理残留进程
    op_log('info', '启动前清理残留Edge进程...')
    _kill_residual_edge()

    for attempt in range(max_retries + 1):
        try:
            op_log('info', f'启动Edge尝试 {attempt+1}/{max_retries+1}...')
            opts = mod['Options']()
            opts.add_argument('--user-data-dir=' + PROFILE_DIR)
            opts.add_argument('--profile-directory=' + PROFILE_NAME)
            opts.add_argument('--start-maximized')
            opts.add_argument('--disable-blink-features=AutomationControlled')
            opts.add_argument('--disable-infobars')
            opts.add_argument('--no-sandbox')
            opts.add_argument('--disable-extensions')
            opts.add_argument('--disable-popup-blocking')
            opts.add_argument('--disable-notifications')
            opts.add_argument('--disable-gpu')
            opts.add_argument('--no-first-run')
            opts.add_argument('--no-default-browser-check')
            opts.add_argument('--disable-features=msEdgeWelcome,msEdgeFirstRun,msEdgeBrowserRehydration')
            opts.add_argument('--disable-sync')
            opts.add_experimental_option('excludeSwitches', ['enable-automation'])
            opts.add_experimental_option('useAutomationExtension', False)

            op_log('info', f'profile目录: {PROFILE_DIR}')
            op_log('info', '正在启动Edge浏览器...')
            driver = mod['webdriver'].Edge(options=opts)
            op_log('ok', 'Edge启动成功')
            # 设置超时，避免页面加载卡住时等待5分钟
            try:
                driver.set_page_load_timeout(30)
                driver.set_script_timeout(30)
                op_log('info', '已设置页面加载超时30秒、脚本超时30秒')
            except Exception:
                pass
            try:
                driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
                    'source': 'Object.defineProperty(navigator, "webdriver", {get: () => undefined});'
                })
            except Exception:
                pass

            _state['driver'] = driver
            _state['tabs'] = {}
            op_log('ok', '浏览器启动完成')
            return {'ok': True, 'message': '浏览器已启动（独立profile），请在弹出的 Edge 窗口中完成各 AI 登录（仅需登录一次）',
                    'attempts': attempt + 1, 'cdp_mode': False}
        except Exception as e:
            last_error = str(e)
            last_error_type = type(e).__name__
            op_log('error', f'启动失败 (尝试{attempt+1}): [{last_error_type}] {last_error[:200]}')
            if attempt < max_retries:
                # 启动失败，清理残留进程后重试
                # 最后一次重试时杀死所有Edge进程并删除profile
                kill_all = (attempt == max_retries - 1)
                clean = kill_all
                op_log('info', f'清理残留Edge进程{"(全部)" if kill_all else ""}{"并删除profile" if clean else ""}，3秒后重试...')
                _kill_residual_edge(clean_profile=clean, kill_all=kill_all)
                time.sleep(3)
                continue

    error_msg = (f'浏览器启动失败（已重试{max_retries}次）。\n'
                 f'错误类型: {last_error_type}\n'
                 f'错误详情: {last_error}\n\n'
                 f'可能的原因:\n'
                 f'1. Edge浏览器未安装或版本过旧\n'
                 f'2. 已有Edge进程占用profile目录（请关闭所有Edge窗口后重试）\n'
                 f'3. profile目录权限不足\n'
                 f'4. 杀毒软件阻止了浏览器启动\n\n'
                 f'建议: 先关闭所有Edge浏览器窗口，再点击「启动浏览器」')
    op_log('error', f'最终启动失败: {error_msg}')
    return {'ok': False, 'error': error_msg, 'error_type': last_error_type, 'error_detail': last_error}


def close_browser():
    if _state['driver'] is not None:
        try:
            if _state.get('cdp_mode'):
                # CDP模式：只断开连接，不关闭用户的浏览器
                _state['driver'].close()
            else:
                _state['driver'].quit()
        except Exception:
            pass
        _state['driver'] = None
        _state['tabs'] = {}
        _state['cdp_mode'] = False
    return {'ok': True}


def _switch_to_app(app):
    """切换到指定 AI 的标签页。handle失效时通过URL匹配查找。"""
    driver = _state['driver']
    if driver is None:
        return None
    info = APPS.get(app)
    if info is None:
        return None
    target_url_keyword = info['url'].split('//')[1].split('/')[0]  # 域名关键词

    # 1. 先用保存的handle
    if app in _state['tabs']:
        try:
            driver.switch_to.window(_state['tabs'][app])
            # 验证当前标签页的URL是否正确
            try:
                cur_url = driver.current_url
                if target_url_keyword in cur_url:
                    return driver
            except Exception:
                pass
        except Exception:
            pass

    # 2. handle失效或URL不对，遍历所有标签页找匹配的
    try:
        handles = driver.window_handles
        for handle in handles:
            try:
                driver.switch_to.window(handle)
                cur_url = driver.current_url
                if target_url_keyword in cur_url:
                    _state['tabs'][app] = handle  # 更新保存的handle
                    op_log('info', f'通过URL匹配找到{app}标签页')
                    return driver
            except Exception:
                continue
    except Exception:
        pass

    # 3. 没找到，返回None
    return None


def open_ai(app):
    """在浏览器中打开指定 AI 官网（新标签页）。已有标签页时不刷新，直接切换。"""
    orig = app
    app = resolve_app(app)
    if app is None:
        return {'ok': False, 'error': '未知 AI: ' + str(orig)}
    if _state['driver'] is None:
        r = start_browser()
        if not r['ok']:
            return r

    driver = _state['driver']
    info = APPS[app]
    try:
        # 如果已有该标签页且有效，直接切换（不刷新，避免丢失登录态和对话）
        existing = _switch_to_app(app)
        if existing is not None:
            op_log('info', f'{app}标签页已存在，直接切换')
            return {'ok': True, 'app': app, 'url': info['url'], 'reused': True}

        # 新开标签页
        op_log('info', f'新开{app}标签页')
        driver.execute_script("window.open('" + info['url'] + "', '_blank');")
        time.sleep(3)
        # 记录最新的标签页 handle
        handles = driver.window_handles
        _state['tabs'][app] = handles[-1]
        driver.switch_to.window(handles[-1])
        time.sleep(3)
        return {'ok': True, 'app': app, 'url': info['url']}
    except Exception as e:
        return {'ok': False, 'error': '打开 ' + info['name'] + ' 失败: ' + str(e)}


# ================================================================
# AI 自动化通用工具
# ================================================================
def _find_chat_input(driver, mod):
    """找到聊天输入框（textarea 或 contenteditable 元素）。多策略查找。"""
    By = mod['By']
    candidates = []

    # 1. 所有可见的 textarea
    try:
        for ta in driver.find_elements(By.TAG_NAME, 'textarea'):
            try:
                if ta.is_displayed() and ta.is_enabled():
                    size = ta.size
                    if size.get('height', 0) > 15 and size.get('width', 0) > 50:
                        candidates.append((ta, 'textarea', size.get('height', 0)))
            except Exception:
                pass
    except Exception:
        pass

    # 2. 所有 contenteditable=true 的元素（不限标签）
    try:
        for ed in driver.find_elements(By.CSS_SELECTOR, '[contenteditable="true"]'):
            try:
                if ed.is_displayed():
                    size = ed.size
                    if size.get('height', 0) > 20 and size.get('width', 0) > 50:
                        candidates.append((ed, 'contenteditable', size.get('height', 0)))
            except Exception:
                pass
    except Exception:
        pass

    # 3. role=textbox 的元素
    try:
        for tb in driver.find_elements(By.CSS_SELECTOR, '[role="textbox"]'):
            try:
                if tb.is_displayed():
                    size = tb.size
                    if size.get('height', 0) > 15 and size.get('width', 0) > 50:
                        candidates.append((tb, 'contenteditable', size.get('height', 0)))
            except Exception:
                pass
    except Exception:
        pass

    # 4. class 包含 input/editor/textarea 的 div（兜底）
    try:
        for el in driver.find_elements(By.CSS_SELECTOR, 'div[class*="input"], div[class*="editor"], div[class*="textarea"]'):
            try:
                if el.is_displayed() and el.get_attribute('contenteditable') == 'true':
                    size = el.size
                    if size.get('height', 0) > 20:
                        candidates.append((el, 'contenteditable', size.get('height', 0)))
            except Exception:
                pass
    except Exception:
        pass

    if not candidates:
        return None, None

    # 按高度排序，取最大的（聊天输入框通常是页面上较大的输入区域）
    candidates.sort(key=lambda x: x[2], reverse=True)
    return candidates[0][0], candidates[0][1]


def _set_input_text(driver, element, input_type, text):
    """在输入框中设置文本。优先用真实键盘输入（send_keys），确保触发编辑器状态；失败再用 JS。"""
    from selenium.webdriver.common.keys import Keys

    # 方法1：真实键盘输入（最可靠，能触发 React/Vue/ProseMirror 等编辑器）
    try:
        element.click()
        time.sleep(0.3)
        # 全选并删除已有内容
        element.send_keys(Keys.CONTROL, 'a')
        time.sleep(0.1)
        element.send_keys(Keys.DELETE)
        time.sleep(0.2)
        # 逐段输入（长文本一次性 send_keys 可能丢失字符）
        chunk_size = 200
        for i in range(0, len(text), chunk_size):
            element.send_keys(text[i:i+chunk_size])
            time.sleep(0.05)
        time.sleep(0.5)
        # 验证输入是否成功
        if input_type == 'textarea':
            val = element.get_attribute('value') or ''
        else:
            val = element.text or ''
        if len(val) > 5 or text[:10] in val:
            return True
    except Exception:
        pass

    # 方法2：JS 设置（兜底）
    try:
        if input_type == 'textarea':
            driver.execute_script(
                "var el=arguments[0]; el.value=arguments[1];"
                "el.dispatchEvent(new Event('input',{bubbles:true}));"
                "el.dispatchEvent(new Event('change',{bubbles:true}));",
                element, text
            )
        else:
            driver.execute_script(
                "var el=arguments[0]; el.focus(); el.innerHTML=arguments[1];"
                "el.dispatchEvent(new Event('input',{bubbles:true}));"
                "el.dispatchEvent(new Event('change',{bubbles:true}));"
                "el.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true}));"
                "el.dispatchEvent(new KeyboardEvent('keyup',{bubbles:true}));",
                element, text
            )
        time.sleep(0.5)
        return True
    except Exception:
        return False


def _click_send(driver, mod, input_type):
    """点击发送按钮，或按 Enter。优先在输入框附近找，避免误点页面其他 submit 按钮。"""
    By = mod['By']
    from selenium.webdriver.common.keys import Keys

    # 1. 最可靠：在输入框父容器内找发送按钮（最后一个可见且启用的按钮通常是发送）
    try:
        input_el, _ = _find_chat_input(driver, mod)
        if input_el is not None:
            # 向上找4层父容器，覆盖输入框+工具栏+容器
            parent = input_el
            best_parent = None
            for _ in range(5):
                try:
                    parent = parent.find_element(By.XPATH, '..')
                    btns_in_parent = parent.find_elements(By.TAG_NAME, 'button')
                    # 找到包含至少一个按钮的父容器
                    if len(btns_in_parent) >= 1:
                        best_parent = parent
                except Exception:
                    break
            if best_parent is not None:
                btns = best_parent.find_elements(By.TAG_NAME, 'button')
                # 从后往前找，发送按钮通常在最右边/最后
                for b in reversed(btns):
                    try:
                        if b.is_displayed() and b.is_enabled():
                            # 排除明显不是发送的按钮（有文字且不是发送相关）
                            txt = b.text.strip()
                            aria = (b.get_attribute('aria-label') or '').strip()
                            title = (b.get_attribute('title') or '').strip()
                            if txt and not any(k in txt for k in ['发送', 'Send', 'send']):
                                # 有文字但不是发送，跳过（除非是图标按钮无文字）
                                continue
                            b.click()
                            time.sleep(0.5)
                            return True
                    except Exception:
                        continue
    except Exception:
        pass

    # 2. 找页面上最后一个 button[type="submit"]（发送按钮通常在页面底部）
    try:
        btns = driver.find_elements(By.CSS_SELECTOR, 'button[type="submit"]')
        for b in reversed(btns):
            try:
                if b.is_displayed() and b.is_enabled():
                    # 检查是否在视口底部区域（发送按钮在页面底部）
                    loc = b.location
                    if loc.get('y', 0) > 200:  # 排除顶部导航栏
                        b.click()
                        time.sleep(0.5)
                        return True
            except Exception:
                continue
    except Exception:
        pass

    # 3. aria-label / title 含发送/send
    try:
        btns = driver.find_elements(By.CSS_SELECTOR,
            'button[aria-label*="发送"], button[aria-label*="Send"], '
            'button[title*="发送"], button[title*="Send"]')
        for b in reversed(btns):
            if b.is_displayed() and b.is_enabled():
                b.click()
                time.sleep(0.5)
                return True
    except Exception:
        pass

    # 4. 按 Enter（contenteditable 用 Ctrl+Enter 避免换行）
    try:
        input_el, itype = _find_chat_input(driver, mod)
        if input_el is not None:
            input_el.click()
            time.sleep(0.3)
            if itype == 'contenteditable':
                input_el.send_keys(Keys.CONTROL, Keys.ENTER)
            else:
                input_el.send_keys(Keys.ENTER)
            time.sleep(0.5)
            return True
    except Exception:
        pass
    return False


def _find_file_inputs(driver, mod):
    """找到所有文件上传 input。"""
    By = mod['By']
    inputs = []
    try:
        all_inputs = driver.find_elements(By.CSS_SELECTOR, 'input[type="file"]')
        for inp in all_inputs:
            inputs.append(inp)
    except Exception:
        pass
    return inputs


def _upload_via_input(driver, file_input, paths):
    """通过 input[type=file] 上传文件。先让元素可见，再 send_keys。"""
    try:
        driver.execute_script(
            "var el=arguments[0]; el.style.display='block';"
            "el.style.opacity='1'; el.style.position='static';"
            "el.style.visibility='visible'; el.style.width='100px'; el.style.height='30px';",
            file_input
        )
        time.sleep(0.3)
        # 多文件用换行分隔
        file_input.send_keys('\n'.join(paths))
        time.sleep(1)
        return True
    except Exception:
        return False


def _detect_login_prompt(driver, mod):
    """检测是否弹出登录框（未登录时 AI 网站可能要求登录）。"""
    By = mod['By']
    try:
        # 检查页面上是否有登录相关的弹窗/按钮
        login_texts = driver.find_elements(By.XPATH,
            "//*[contains(text(),'登录') or contains(text(),'登陆') "
            "or contains(text(),'Log in') or contains(text(),'Sign in') "
            "or contains(text(),'登录后')]")
        for el in login_texts:
            try:
                if el.is_displayed():
                    # 排除导航栏上的静态"登录"文字，只检测弹窗中的
                    # 检查是否在 modal/dialog 中
                    parent = el
                    for _ in range(6):
                        try:
                            cls = parent.get_attribute('class') or ''
                            tag = parent.tag_name
                            if any(k in cls.lower() for k in ['modal', 'dialog', 'popup', 'mask', 'drawer', 'login-box']) or tag == 'dialog':
                                return True
                            parent = parent.find_element(By.XPATH, '..')
                        except Exception:
                            break
            except Exception:
                pass
    except Exception:
        pass
    return False


def _wait_generation_complete(driver, mod, timeout=90):
    """等待 AI 生成完成。单循环策略：停止按钮消失 + 文本稳定，同时检测登录弹窗。"""
    By = mod['By']
    deadline = time.time() + timeout

    # 先等几秒让 AI 开始生成
    time.sleep(4)

    # 记录初始文本（发送前的最后一条消息）
    initial_text = ''
    try:
        initial_text = _extract_last_message_text(driver, mod)
    except Exception:
        pass

    last_text = initial_text
    stable_count = 0
    stop_found = False
    login_detected = False

    while time.time() < deadline:
        # 检测登录弹窗
        if not login_detected and _detect_login_prompt(driver, mod):
            login_detected = True
            # 再等几秒确认不是瞬时闪烁
            time.sleep(3)
            if _detect_login_prompt(driver, mod):
                return 'login_required'

        # 检测停止按钮
        stop_visible = False
        try:
            stop_btns = driver.find_elements(By.CSS_SELECTOR,
                'button[aria-label*="停止"], button[title*="停止"], '
                'button[aria-label*="Stop"], button[title*="Stop"]')
            stop_visible = any(b.is_displayed() for b in stop_btns)
        except Exception:
            pass

        if stop_visible:
            stop_found = True
            stable_count = 0  # 还在生成，重置稳定计数
            time.sleep(2)
            continue
        elif stop_found:
            # 之前有停止按钮，现在消失了 → 生成完成
            time.sleep(1.5)
            return 'complete'

        # 没找到停止按钮：用文本稳定检测
        try:
            cur = _extract_last_message_text(driver, mod)
            if cur and cur != initial_text:
                # 有新内容了
                if cur == last_text:
                    stable_count += 1
                    if stable_count >= 4:  # 连续4次（约8秒）文本不变 → 完成
                        return 'complete'
                else:
                    stable_count = 0
                    last_text = cur
            else:
                # 还没有新内容，继续等
                stable_count = 0
        except Exception:
            pass

        time.sleep(2)

    # 超时：如果已经有新内容，返回当前文本；否则返回超时
    try:
        cur = _extract_last_message_text(driver, mod)
        if cur and cur != initial_text and len(cur) > 10:
            return 'complete'  # 有内容，认为完成了
    except Exception:
        pass
    return 'timeout'


def _extract_ai_reply_smart(driver):
    """智能提取AI答复：用JS分析页面，排除用户消息和UI元素，取最后一个AI答复。"""
    try:
        text = driver.execute_script(r'''
            (function() {
                var selectors = [
                    'article', '[role="article"]',
                    'div[class*="message"]', 'div[class*="msg"]',
                    'div[class*="chat-item"]', 'div[class*="chat-message"]',
                    'div[class*="response"]', 'div[class*="answer"]',
                    'div[class*="assistant"]', 'div[class*="reply"]',
                    'div[class*="bubble"]', 'div[class*="markdown-body"]',
                    'div[class*="prose"]', 'div[class*="markdown"]'
                ];
                var seen = new Set();
                var messages = [];
                for (var s = 0; s < selectors.length; s++) {
                    var els = document.querySelectorAll(selectors[s]);
                    for (var i = 0; i < els.length; i++) {
                        var el = els[i];
                        if (seen.has(el)) continue;
                        seen.add(el);
                        try {
                            var style = window.getComputedStyle(el);
                            if (style.display === 'none' || style.visibility === 'hidden') continue;
                            var txt = (el.innerText || el.textContent || '').trim();
                            if (txt.length < 20) continue;
                            var rect = el.getBoundingClientRect();
                            if (rect.height < 10) continue;
                            var cls = (el.className || '').toString().toLowerCase();
                            // 更严格的用户消息检测
                            var isUser = /user|self|my-message|user-message|self-message|my-msg|user-msg/.test(cls);
                            // 更严格的UI元素检测
                            var isUI = /login|signin|header|footer|sidebar|nav|toolbar|input-area|input-container|send-btn|button/.test(cls);
                            if (isUser || isUI) continue;
                            // 排除包含输入框的元素
                            if (el.querySelector('textarea, [contenteditable], input[type="text"], button')) continue;
                            // 排除太短的文本（可能是按钮或UI）
                            if (txt.length < 30) continue;
                            messages.push({txt: txt, y: rect.top + window.scrollY, cls: cls});
                        } catch(e) {}
                    }
                }
                if (messages.length === 0) return '';
                // 按Y坐标排序，取最后一个（最下面的）
                messages.sort(function(a, b) { return a.y - b.y; });
                // 从后往前找，跳过可能是用户消息的
                for (var i = messages.length - 1; i >= 0; i--) {
                    var m = messages[i];
                    // 再次确认不是用户消息
                    if (/user|self|my-/.test(m.cls)) continue;
                    if (m.txt.length >= 30) return m.txt;
                }
                return messages[messages.length - 1].txt;
            })();
        ''')
        if text and len(text.strip()) >= 30:
            return text.strip()
    except Exception:
        pass
    return ''


def _extract_last_message_text(driver, mod):
    """提取最后一条 AI 消息的文本。多策略：选择器匹配 + JS 兜底。"""
    # 优先用智能提取
    smart = _extract_ai_reply_smart(driver)
    if smart:
        return smart

    By = mod['By']
    candidates = []

    # 多种消息容器选择器（按优先级排序）
    selectors = [
        'article', '[role="article"]',
        'div[class*="message-content"]', 'div[class*="msg-content"]',
        'div[class*="chat-message"]', 'div[class*="message-item"]',
        'div[class*="msg-item"]', 'div[class*="response-content"]',
        'div[class*="answer-content"]', 'div[class*="assistant-message"]',
        'div[class*="assistant-content"]', 'div[class*="markdown-body"]',
        'div[class*="prose"]', 'div[class*="markdown"]',
        'div[class*="message"]', 'div[class*="response"]',
        'div[class*="answer"]', 'div[class*="assistant"]',
        'div[class*="reply"]', 'div[class*="bubble"]',
    ]
    seen_elements = set()
    for sel in selectors:
        try:
            elems = driver.find_elements(By.CSS_SELECTOR, sel)
            for el in elems:
                try:
                    el_id = str(id(el))
                    if el_id in seen_elements:
                        continue
                    seen_elements.add(el_id)
                    if el.is_displayed():
                        txt = el.text.strip()
                        if len(txt) > 15:
                            # 排除明显是 UI 元素的文本（太短或含特定关键词）
                            if not any(k in txt[:20] for k in ['登录', '下载', '新对话', '设置']):
                                candidates.append((el, txt))
                except Exception:
                    pass
        except Exception:
            pass

    if candidates:
        # 取最后一个（按位置排序）
        try:
            candidates.sort(key=lambda x: x[0].location.get('y', 0))
        except Exception:
            pass
        return candidates[-1][1]

    # 兜底：用 JS 找到页面中最后一个有实质文本的块级元素
    try:
        text = driver.execute_script('''
            // 找到所有可见的、有较长文本的块级元素
            var all = document.querySelectorAll('div, p, section, article');
            var best = '';
            var bestY = 0;
            for (var i = 0; i < all.length; i++) {
                var el = all[i];
                var style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden') continue;
                var txt = el.innerText || el.textContent || '';
                txt = txt.trim();
                if (txt.length > 30 && txt.length < 10000) {
                    var rect = el.getBoundingClientRect();
                    // 只取子元素文本不超过自身80%的元素（避免取到容器）
                    var childText = 0;
                    for (var j = 0; j < el.children.length; j++) {
                        childText += (el.children[j].innerText || '').length;
                    }
                    if (childText < txt.length * 0.8 && rect.top > bestY) {
                        best = txt;
                        bestY = rect.top;
                    }
                }
            }
            return best;
        ''')
        if text and len(text) > 15:
            return text.strip()
    except Exception:
        pass

    return ''


# ================================================================
# AI 操作：上传文件
# ================================================================
def ai_upload_files(app, file_paths):
    """上传文件到指定 AI 对话框。"""
    orig = app
    app = resolve_app(app)
    if app is None:
        return {'ok': False, 'error': '未知 AI: ' + str(orig), 'fallback': 'manual_upload'}
    if _state['driver'] is None:
        return {'ok': False, 'error': '浏览器未启动', 'fallback': 'manual_upload'}

    driver = _switch_to_app(app)
    if driver is None:
        return {'ok': False, 'error': '标签页失效，请重新打开', 'fallback': 'manual_upload'}

    mod = _selenium_modules()
    valid_paths = [p for p in file_paths if os.path.isfile(p)]
    if not valid_paths:
        return {'ok': False, 'error': '没有有效的文件路径', 'fallback': 'manual_upload'}

    # 策略1：直接找 input[type=file]
    try:
        inputs = _find_file_inputs(driver, mod)
        for inp in inputs:
            if _upload_via_input(driver, inp, valid_paths):
                time.sleep(2)
                return {'ok': True, 'app': app, 'uploaded': len(valid_paths), 'method': 'file_input'}
    except Exception:
        pass

    # 策略2：点击上传按钮后等待 input 出现
    try:
        By = mod['By']
        upload_btns = driver.find_elements(
            By.CSS_SELECTOR,
            'button[aria-label*="上传"], button[title*="上传"], '
            'button[aria-label*="附件"], button[title*="附件"], '
            'button[aria-label*="文件"], button[title*="文件"]'
        )
        for btn in upload_btns:
            if btn.is_displayed():
                btn.click()
                time.sleep(1.5)
                inputs = _find_file_inputs(driver, mod)
                for inp in inputs:
                    if _upload_via_input(driver, inp, valid_paths):
                        time.sleep(2)
                        return {'ok': True, 'app': app, 'uploaded': len(valid_paths), 'method': 'button_click'}
    except Exception:
        pass

    # 策略3：找 "+" 按钮（DeepSeek 风格）
    try:
        By = mod['By']
        plus_btns = driver.find_elements(By.CSS_SELECTOR, 'button')
        for btn in plus_btns:
            try:
                txt = btn.text.strip()
                if txt in ('+', '＋') or (btn.get_attribute('aria-label') or '').strip() in ('+', '添加', '更多'):
                    if btn.is_displayed():
                        btn.click()
                        time.sleep(1.5)
                        # 菜单中可能有"上传文件"选项
                        menu_items = driver.find_elements(By.XPATH, "//*[contains(text(),'文件') or contains(text(),'上传')]")
                        for mi in menu_items:
                            if mi.is_displayed():
                                mi.click()
                                time.sleep(1)
                                break
                        inputs = _find_file_inputs(driver, mod)
                        for inp in inputs:
                            if _upload_via_input(driver, inp, valid_paths):
                                time.sleep(2)
                                return {'ok': True, 'app': app, 'uploaded': len(valid_paths), 'method': 'plus_menu'}
            except Exception:
                continue
    except Exception:
        pass

    return {'ok': False, 'error': '自动上传失败（未找到文件上传控件）', 'fallback': 'manual_upload',
            'files': [os.path.basename(p) for p in valid_paths]}


# ================================================================
# AI 操作：发送提示词
# ================================================================
def _is_login_page(driver):
    """检测当前页面是否为登录页（未登录时AI网站会跳转）。"""
    try:
        mod = _selenium_modules()
        By = mod['By']
        url = driver.current_url.lower()
        # URL 包含登录关键词
        if any(k in url for k in ['sign_in', 'signin', 'login', 'log-in', 'auth', 'accounts/login']):
            return True
        # 页面标题包含登录关键词
        title = (driver.title or '').lower()
        if any(k in title for k in ['登录', '登陆', 'login', 'sign in']):
            return True
        # 页面文本包含大量登录相关内容
        try:
            body_text = driver.find_element(By.TAG_NAME, 'body').text[:500]
            login_keywords = ['发送验证码', '密码登录', '扫码登录', '手机号登录', '注册登录', '登录即代表']
            count = sum(1 for k in login_keywords if k in body_text)
            if count >= 2:
                return True
        except Exception:
            pass
    except Exception:
        pass
    return False


def ai_send_prompt(app, prompt, max_retries=2):
    """发送提示词到指定 AI。失败时自动刷新页面重试（最多 max_retries 次）。"""
    orig = app
    app = resolve_app(app)
    if app is None:
        return {'ok': False, 'error': '未知 AI: ' + str(orig), 'fallback': 'manual_send'}
    if _state['driver'] is None:
        # 自动启动浏览器
        r = start_browser()
        if not r['ok']:
            return {'ok': False, 'error': '浏览器未启动且自动启动失败: ' + r.get('error', ''), 'fallback': 'manual_send'}

    last_error = ''
    for attempt in range(max_retries + 1):
        driver = _switch_to_app(app)
        if driver is None:
            # 标签页失效，自动重新打开
            try:
                open_ai(app)
                time.sleep(3)
                driver = _switch_to_app(app)
            except Exception as e:
                last_error = '标签页失效且重新打开失败: ' + str(e)
                continue
        if driver is None:
            last_error = '标签页失效'
            continue

        mod = _selenium_modules()

        try:
            # 滚动到底部
            try:
                driver.execute_script('window.scrollTo(0, document.body.scrollHeight);')
            except Exception:
                pass

            input_el, input_type = _find_chat_input(driver, mod)
            if input_el is None:
                # 检查是否在登录页面
                if _is_login_page(driver):
                    return {'ok': False, 'error': APPS[app]['name'] + ' 需要登录，请先在浏览器中登录',
                            'fallback': 'manual_send', 'need_login': True}
                if attempt < max_retries:
                    # 刷新页面重试
                    last_error = '未找到聊天输入框，正在刷新页面重试...'
                    try:
                        driver.get(APPS[app]['url'])
                        time.sleep(4)
                    except Exception:
                        pass
                    continue
                return {'ok': False, 'error': '未找到聊天输入框（可能未登录或页面未加载完成）', 'fallback': 'manual_send'}

            input_el.click()
            time.sleep(0.5)
            if not _set_input_text(driver, input_el, input_type, prompt):
                if attempt < max_retries:
                    last_error = '输入文本失败，重试...'
                    continue
                return {'ok': False, 'error': '输入文本失败', 'fallback': 'manual_send'}
            time.sleep(0.5)

            if not _click_send(driver, mod, input_type):
                if attempt < max_retries:
                    last_error = '未找到发送按钮，重试...'
                    continue
                return {'ok': False, 'error': '未找到发送按钮，且回车发送失败', 'fallback': 'manual_send'}

            # 验证发送是否成功：输入框应被清空
            time.sleep(2)
            try:
                verify_el, verify_type = _find_chat_input(driver, mod)
                if verify_el is not None:
                    if verify_type == 'textarea':
                        remaining = verify_el.get_attribute('value') or ''
                    else:
                        remaining = verify_el.text or ''
                    if len(remaining) > 10:
                        # 输入框仍有文本，发送可能没成功，重试点击发送
                        time.sleep(1)
                        _click_send(driver, mod, verify_type)
                        time.sleep(2)
            except Exception:
                pass

            # 记录发送后的消息数，用于后续只提取新消息
            try:
                count = driver.execute_script('return document.querySelectorAll("article, [role=article], div[class*=message], div[class*=msg]").length')
                _state['msg_count'][app] = count
                op_log('info', f'记录{app}发送后消息数: {count}')
            except Exception:
                pass

            return {'ok': True, 'app': app, 'sent': True, 'attempts': attempt + 1}
        except Exception as e:
            last_error = '发送失败: ' + str(e)
            if attempt < max_retries:
                time.sleep(2)
                continue

    return {'ok': False, 'error': last_error or '发送失败（已重试' + str(max_retries) + '次）', 'fallback': 'manual_send'}


# ================================================================
# AI 操作：读取答复
# ================================================================
def ai_read_reply(app, timeout=90, max_retries=2):
    """读取 AI 的完整答复（等待生成完成）。失败时自动重试（最多 max_retries 次）。"""
    orig = app
    app = resolve_app(app)
    if app is None:
        return {'ok': False, 'error': '未知 AI: ' + str(orig), 'fallback': 'manual_read'}
    if _state['driver'] is None:
        return {'ok': False, 'error': '浏览器未启动', 'fallback': 'manual_read'}

    last_error = ''
    for attempt in range(max_retries + 1):
        driver = _switch_to_app(app)
        if driver is None:
            # 标签页失效，自动重新打开
            try:
                open_ai(app)
                time.sleep(3)
                driver = _switch_to_app(app)
            except Exception as e:
                last_error = '标签页失效: ' + str(e)
                continue
        if driver is None:
            last_error = '标签页失效'
            continue

        mod = _selenium_modules()

        try:
            # 第一次用正常超时，重试时用更长的超时
            cur_timeout = timeout if attempt == 0 else timeout + 60
            status = _wait_generation_complete(driver, mod, timeout=cur_timeout)
            if status == 'login_required':
                return {'ok': False, 'error': '检测到登录弹窗，请先在浏览器中登录 ' + APPS[app]['name'],
                        'fallback': 'manual_read', 'need_login': True}
            time.sleep(1)
            text = _extract_last_message_text(driver, mod)
            if not text or len(text) < 5:
                if attempt < max_retries:
                    # 提取失败，再等一会儿重试
                    last_error = '未提取到答复，等待后重试...'
                    time.sleep(3)
                    continue
                # 最后一次失败，返回页面预览帮助诊断
                try:
                    page_text = driver.find_element(By.TAG_NAME, 'body').text[:1000]
                except Exception:
                    page_text = ''
                return {'ok': False, 'error': '未能提取到 AI 答复（答复可能为空或页面结构变化）',
                        'fallback': 'manual_read', 'page_preview': page_text, 'status': status,
                        'attempts': attempt + 1}
            return {'ok': True, 'app': app, 'reply': text, 'length': len(text), 'status': status,
                    'attempts': attempt + 1}
        except Exception as e:
            last_error = '读取答复失败: ' + str(e)
            if attempt < max_retries:
                time.sleep(3)
                continue

    return {'ok': False, 'error': last_error or '读取失败（已重试' + str(max_retries) + '次）', 'fallback': 'manual_read'}


# ================================================================
# AI 操作：检查登录状态（辅助，主要靠用户手动确认）
# ================================================================
def ai_check_login(app):
    """检查是否已登录。优先检测登录页面和登录按钮。"""
    if _state['driver'] is None:
        return {'ok': True, 'logged_in': False, 'confidence': 'low', 'reason': '浏览器未启动'}
    driver = _switch_to_app(app)
    if driver is None:
        return {'ok': True, 'logged_in': False, 'confidence': 'low', 'reason': '标签页未打开'}
    mod = _selenium_modules()
    try:
        # 1. 检测是否在登录页面
        if _is_login_page(driver):
            return {'ok': True, 'logged_in': False, 'confidence': 'high', 'reason': '检测到登录页面'}
        # 2. 检查是否有可见的登录按钮
        By = mod['By']
        try:
            login_btns = driver.find_elements(By.XPATH,
                "//button[contains(text(),'登录') or contains(text(),'登陆') or contains(text(),'Log in') or contains(text(),'Sign in')] | "
                "//a[contains(text(),'登录') or contains(text(),'登陆') or contains(text(),'Log in')] | "
                "//span[contains(text(),'登录') or contains(text(),'登陆')]")
            visible_logins = [b for b in login_btns if b.is_displayed()]
            if visible_logins:
                return {'ok': True, 'logged_in': False, 'confidence': 'high', 'reason': '检测到登录按钮'}
        except Exception:
            pass
        # 3. 检查是否有输入框（已登录状态）
        input_el, _ = _find_chat_input(driver, mod)
        if input_el is not None:
            return {'ok': True, 'logged_in': True, 'confidence': 'medium', 'reason': '找到聊天输入框'}
        # 4. 无法确定
        return {'ok': True, 'logged_in': False, 'confidence': 'low', 'reason': '无法确定登录状态'}
    except Exception as e:
        return {'ok': True, 'logged_in': False, 'confidence': 'low', 'reason': '检测异常: ' + str(e)}


# ================================================================
# 文件中转：前端文件保存到本地
# ================================================================
def save_uploaded_files(files_data):
    """
    保存前端上传的文件到 UPLOAD_DIR。
    files_data: [{name, content_b64}]
    返回: {ok, paths: [绝对路径...]}
    """
    try:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        paths = []
        for fd in files_data:
            name = fd.get('name', 'file')
            b64 = fd.get('content_b64', '')
            if not b64:
                continue
            # 处理 data URL 前缀
            if ',' in b64 and b64.startswith('data:'):
                b64 = b64.split(',', 1)[1]
            content = base64.b64decode(b64)
            # 避免文件名冲突
            safe_name = re.sub(r'[\\/:*?"<>|]', '_', name)
            dest = os.path.join(UPLOAD_DIR, safe_name)
            counter = 1
            while os.path.exists(dest):
                base, ext = os.path.splitext(safe_name)
                dest = os.path.join(UPLOAD_DIR, '%s_%d%s' % (base, counter, ext))
                counter += 1
            with open(dest, 'wb') as f:
                f.write(content)
            paths.append(dest)
        return {'ok': True, 'paths': paths}
    except Exception as e:
        return {'ok': False, 'error': str(e)}


# ================================================================
# HTTP 服务
# ================================================================
class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # 静默

    def _send_json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def _read_body(self):
        length = int(self.headers.get('Content-Length', 0))
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode('utf-8'))
        except Exception:
            return {}

    def do_GET(self):
        path = urlparse(self.path).path

        if path == '/health':
            self._send_json(200, {'ok': True, 'name': 'ai-helper-enhanced', 'version': 'v2.1',
                                   'selenium': _state['selenium_available'],
                                   'browser_running': _state['driver'] is not None})
            return

        if path == '/api/status':
            self._send_json(200, {
                'ok': True,
                'selenium_available': _state['selenium_available'],
                'selenium_error': _state['selenium_error'],
                'browser_running': _state['driver'] is not None,
                'tabs': {k: True for k in _state['tabs']},
                'work_dir': _state['work_dir'],
                'log_count': len(_state['exec_log']),
            })
            return

        if path == '/api/log':
            self._send_json(200, {'ok': True, 'logs': _state['exec_log'][-200:], 'op_logs': _state['op_log'][-100:]})
            return

        if path == '/api/debug/page':
            # 调试接口：返回当前页面状态
            info = {'ok': True, 'driver': _state['driver'] is not None,
                    'tabs': dict(_state['tabs']), 'handles': []}
            if _state['driver'] is not None:
                try:
                    d = _state['driver']
                    mod = _selenium_modules()
                    By = mod['By']
                    info['current_url'] = d.current_url
                    info['current_title'] = d.title
                    info['current_handle'] = d.current_window_handle
                    info['handles'] = d.window_handles
                    try:
                        body_text = d.find_element(By.TAG_NAME, 'body').text
                        info['body_text_length'] = len(body_text)
                        info['body_text_preview'] = body_text[:500]
                    except Exception as e:
                        info['body_text_error'] = str(e)
                    # 检查每个标签页
                    for app, handle in list(_state['tabs'].items()):
                        try:
                            d.switch_to.window(handle)
                            info['tab_%s_url' % app] = d.current_url
                            info['tab_%s_title' % app] = d.title
                        except Exception as e:
                            info['tab_%s_error' % app] = str(e)
                    # 切回原标签页
                    try:
                        d.switch_to.window(info['current_handle'])
                    except Exception:
                        pass
                except Exception as e:
                    info['error'] = str(e)
            self._send_json(200, info)
            return

        available_routes = [
            '/api/browser/start', '/api/browser/close',
            '/api/ai/open', '/api/ai/upload', '/api/ai/send', '/api/ai/read',
            '/api/ai/send_and_read', '/api/ai/check_login',
            '/api/exec', '/api/log/clear', '/api/set_workdir',
            '/api/files/save', '/api/reset'
        ]
        op_log('error', f'404 Not Found: path={path}')
        self._send_json(404, {'ok': False, 'error': 'not found: ' + path,
                               'received_path': path,
                               'available_routes': available_routes,
                               'hint': '请确认服务已重启为最新版本(v2.1+)'})

    def do_POST(self):
        raw_path = self.path
        path = urlparse(self.path).path
        # 去掉末尾斜杠，兼容 /api/browser/start/ 形式
        if len(path) > 1 and path.endswith('/'):
            path = path.rstrip('/')
        body = self._read_body()
        op_log('info', f'POST请求: raw_path={raw_path}, path={path}, method={self.command}')
        # 调试：记录请求路径
        op_log('debug', f'请求路径: {path}')

        # ---- 浏览器管理 ----
        if path == '/api/browser/start':
            self._send_json(200, start_browser())
            return
        if path == '/api/browser/close':
            self._send_json(200, close_browser())
            return

        # ---- AI 操作 ----
        if path == '/api/ai/open':
            self._send_json(200, open_ai(body.get('app', '')))
            return
        if path == '/api/ai/upload':
            self._send_json(200, ai_upload_files(body.get('app', ''), body.get('files', [])))
            return
        if path == '/api/ai/send':
            self._send_json(200, ai_send_prompt(body.get('app', ''), body.get('prompt', '')))
            return
        if path == '/api/ai/read':
            self._send_json(200, ai_read_reply(body.get('app', ''), body.get('timeout', 90)))
            return
        if path == '/api/ai/send_and_read':
            app = body.get('app', '')
            prompt = body.get('prompt', '')
            timeout = body.get('timeout', 90)
            r1 = ai_send_prompt(app, prompt)
            if not r1['ok']:
                self._send_json(200, r1)
                return
            r2 = ai_read_reply(app, timeout)
            self._send_json(200, r2)
            return
        if path == '/api/ai/check_login':
            self._send_json(200, ai_check_login(body.get('app', '')))
            return

        # ---- 执行引擎 ----
        if path == '/api/exec':
            self._send_json(200, exec_command(
                body.get('command', ''),
                body.get('type', 'cmd'),
                body.get('work_dir'),
                body.get('timeout', 120)
            ))
            return
        if path == '/api/log/clear':
            _state['exec_log'] = []
            try:
                if os.path.exists(LOG_FILE):
                    os.remove(LOG_FILE)
            except Exception:
                pass
            self._send_json(200, {'ok': True})
            return
        if path == '/api/set_workdir':
            p = body.get('path', '').strip()
            if p:
                _state['work_dir'] = p
                try:
                    os.makedirs(p, exist_ok=True)
                except Exception as e:
                    self._send_json(200, {'ok': False, 'error': str(e)})
                    return
            self._send_json(200, {'ok': True, 'work_dir': _state['work_dir']})
            return

        # ---- 文件中转 ----
        if path == '/api/files/save':
            self._send_json(200, save_uploaded_files(body.get('files', [])))
            return

        # ---- 重置 ----
        if path == '/api/reset':
            close_browser()
            _state['exec_log'] = []
            _state['work_dir'] = DEFAULT_WORK_DIR
            self._send_json(200, {'ok': True})
            return

        available_routes = [
            '/api/browser/start', '/api/browser/close',
            '/api/ai/open', '/api/ai/upload', '/api/ai/send', '/api/ai/read',
            '/api/ai/send_and_read', '/api/ai/check_login',
            '/api/exec', '/api/log/clear', '/api/set_workdir',
            '/api/files/save', '/api/reset'
        ]
        op_log('error', f'404 Not Found: path={path}')
        self._send_json(404, {'ok': False, 'error': 'not found: ' + path,
                               'received_path': path,
                               'available_routes': available_routes,
                               'hint': '请确认服务已重启为最新版本(v2.1+)'})


# ================================================================
# 主函数
# ================================================================
def main():
    # 预检查 selenium
    _ensure_selenium()

    os.makedirs(DEFAULT_WORK_DIR, exist_ok=True)
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # 加载历史日志
    try:
        if os.path.exists(LOG_FILE):
            with open(LOG_FILE, 'r', encoding='utf-8') as f:
                _state['exec_log'] = json.load(f)
    except Exception:
        pass

    print('=' * 60)
    print(' AI 三助手协同台 —— 本地助手服务（增强版）')
    print(' 地址: http://%s:%d' % (HOST, PORT))
    print(' 工作目录: %s' % _state['work_dir'])
    print(' Selenium: %s' % ('可用' if _state['selenium_available'] else '未安装（浏览器功能不可用，请运行 安装依赖.bat）'))
    print(' 安全: 仅监听本机 | 危险命令拦截 | 完整执行日志')
    print(' 停止: 关闭本窗口或按 Ctrl+C')
    print('=' * 60)

    server = ThreadingHTTPServer((HOST, PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n正在关闭浏览器...')
        close_browser()
        print('服务已停止。')


if __name__ == '__main__':
    main()


