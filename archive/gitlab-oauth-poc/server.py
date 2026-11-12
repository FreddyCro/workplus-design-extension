#!/usr/bin/env python3
"""
GitLab OAuth PoC — 模擬 Plane 的 GitLab 登入流程，不裝 Plane。

流程完全照 Plane 的 apps/api/plane/authentication/provider/oauth/gitlab.py：
  1. /login            產生 state → 302 到 {GITLAB_HOST}/oauth/authorize (scope=read_user)
  2. /auth/gitlab/callback/  驗 state → 用 code 換 token → GET /api/v4/user
  3. 套用 Plane 的放行條件：confirmed_at 必須有值、email 必須有值
只用 Python 標準函式庫。
"""
import html
import json
import os
import secrets
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RESULTS_DIR = ROOT / "results"


# ---------- config ----------
def load_env():
    env_file = ROOT / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


load_env()
GITLAB_HOST = os.environ.get("GITLAB_HOST", "https://gitlab.com").rstrip("/")
CLIENT_ID = os.environ.get("GITLAB_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("GITLAB_CLIENT_SECRET", "")
PORT = int(os.environ.get("LISTEN_PORT", "8765"))
WEB_URL = os.environ.get("WEB_URL", f"http://localhost:{PORT}").rstrip("/")
REDIRECT_URI = f"{WEB_URL}/auth/gitlab/callback/"
SCOPE = "read_user"  # 與 Plane 相同

CONFIGURED = bool(CLIENT_ID and CLIENT_SECRET and GITLAB_HOST)

# ---------- in-memory state ----------
PENDING_STATES = {}  # state -> created_at
SESSIONS = {}  # sid -> result dict
LAST_CODE = {"code": None}  # 給「重用 code」測試用
EVENT_LOG = []  # 最近事件，顯示在首頁


def log(event, **kw):
    entry = {"t": datetime.now().strftime("%H:%M:%S"), "event": event, **kw}
    EVENT_LOG.append(entry)
    del EVENT_LOG[:-30]
    print(json.dumps(entry, ensure_ascii=False), file=sys.stderr)


# ---------- GitLab calls（與 Plane 相同的端點）----------
def exchange_code(code):
    data = urllib.parse.urlencode(
        {
            "grant_type": "authorization_code",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "redirect_uri": REDIRECT_URI,
            "code": code,
        }
    ).encode()
    req = urllib.request.Request(
        f"{GITLAB_HOST}/oauth/token", data=data, method="POST",
        headers={"Accept": "application/json"},
    )
    return _json_call(req)


def fetch_user(access_token):
    req = urllib.request.Request(
        f"{GITLAB_HOST}/api/v4/user",
        headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
    )
    return _json_call(req)


def _json_call(req):
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        try:
            body = json.loads(body)
        except json.JSONDecodeError:
            pass
        return e.code, body
    except urllib.error.URLError as e:
        return 0, {"error": "network", "reason": str(e.reason)}


# ---------- Plane 的放行判斷 ----------
def plane_verdict(user):
    """回傳 (ok, checks)。checks 為 [(名稱, 通過?, 說明)]"""
    checks = []
    confirmed = bool(user.get("confirmed_at"))
    checks.append((
        "confirmed_at 有值（email 已驗證）", confirmed,
        "Plane 會擋 confirmed_at 為空的帳號（GHSA-7j95-vh8g-f365）",
    ))
    email = user.get("email")
    checks.append(("email 有值", bool(email), "Plane 用 email 當帳號主鍵"))
    checks.append((
        "GitLab 帳號狀態為 active（僅供參考，Plane 不檢查）", user.get("state") == "active",
        f"GitLab 回傳 state = {user.get('state')}",
    ))
    ok = confirmed and bool(email)
    return ok, checks


# ---------- HTML ----------
PAGE = """<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GitLab OAuth PoC</title>
<style>
:root{--bg:#f6f7f9;--card:#fff;--fg:#1f2328;--muted:#656d76;--ok:#1a7f37;--bad:#cf222e;--warn:#9a6700;--line:#d0d7de;--accent:#fc6d26}
@media(prefers-color-scheme:dark){:root{--bg:#0d1117;--card:#161b22;--fg:#e6edf3;--muted:#8b949e;--line:#30363d}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.6 system-ui,-apple-system,"Noto Sans TC",sans-serif}
main{max-width:860px;margin:0 auto;padding:32px 16px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:24px 0 8px}
.sub{color:var(--muted);margin:0 0 20px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:18px 20px;margin:14px 0}
.btn{display:inline-block;padding:10px 18px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--fg);text-decoration:none;font-weight:600;margin:4px 6px 4px 0;cursor:pointer}
.btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.btn.small{padding:6px 12px;font-size:13px;font-weight:500}
.ok{color:var(--ok)}.bad{color:var(--bad)}.warn{color:var(--warn)}
.verdict{font-size:20px;font-weight:700;padding:12px 16px;border-radius:8px;border:2px solid}
.verdict.ok{border-color:var(--ok)}.verdict.bad{border-color:var(--bad)}
table{border-collapse:collapse;width:100%;font-size:14px}td,th{border-bottom:1px solid var(--line);padding:7px 8px;text-align:left;vertical-align:top}
th{color:var(--muted);font-weight:600}
code,pre{font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}
pre{background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:12px;overflow:auto;max-height:360px}
.kv td:first-child{color:var(--muted);white-space:nowrap;width:160px}
.log{font-size:13px;color:var(--muted)}
details summary{cursor:pointer;color:var(--muted)}
</style></head><body><main>@@BODY@@</main></body></html>"""


def esc(s):
    return html.escape("" if s is None else str(s))


def render_index(session):
    parts = ["<h1>GitLab OAuth PoC</h1>",
             f"<p class='sub'>模擬 Plane 的 GitLab 登入流程 · GitLab：<code>{esc(GITLAB_HOST)}</code> · "
             f"Redirect URI：<code>{esc(REDIRECT_URI)}</code></p>"]

    if not CONFIGURED:
        parts.append("<div class='card'><b class='bad'>尚未設定</b><br>請複製 <code>.env.example</code> 為 "
                     "<code>.env</code>，填入 GitLab OAuth App 的 Client ID / Secret 後重啟 server。</div>")
    else:
        parts.append("<div class='card'><b class='ok'>已設定</b>　Client ID：<code>"
                     f"{esc(CLIENT_ID[:8])}…</code>（Secret 不顯示）</div>")

    parts.append("<h2>步驟 4：正常登入</h2><div class='card'>"
                 "<a class='btn primary' href='/login'>用 GitLab 登入</a>"
                 "<span class='log'>　→ 會跳到 GitLab 授權頁，同意後回到這裡顯示結果</span></div>")

    if session:
        parts.append(render_result_block(session))

    parts.append("<h2>步驟 5：例外情況</h2><div class='card'>"
                 "<p class='log'>每一種都應該<b>失敗</b>，且不能誤放行。</p>"
                 "<a class='btn small' href='/login'>(a) 到授權頁按「拒絕」</a>"
                 "<a class='btn small' href='/login?tamper=1'>(b) 篡改 state</a>"
                 + ("<a class='btn small' href='/replay'>(c) 重用上一次的 code</a>" if LAST_CODE["code"]
                    else "<span class='btn small' style='opacity:.5'>(c) 重用 code（先成功登入一次）</span>")
                 + "<a class='btn small' href='/auth/gitlab/callback/?error=access_denied&error_description=manual'>(d) 偽造 error 回呼</a>"
                 "</div>")

    if EVENT_LOG:
        rows = "".join(f"<tr><td>{esc(e['t'])}</td><td>{esc(e['event'])}</td>"
                       f"<td><code>{esc(json.dumps({k: v for k, v in e.items() if k not in ('t', 'event')}, ensure_ascii=False))}</code></td></tr>"
                       for e in reversed(EVENT_LOG))
        parts.append(f"<h2>事件紀錄</h2><div class='card log'><table><tr><th>時間</th><th>事件</th><th>細節</th></tr>{rows}</table></div>")
    return PAGE.replace("@@BODY@@", "".join(parts))


def render_result_block(res):
    ok = res["verdict_ok"]
    cls = "ok" if ok else "bad"
    txt = "✅ Plane 會放行這個帳號" if ok else "⛔ Plane 會拒絕這個帳號"
    u = res["user"]
    checks = "".join(
        f"<tr><td class='{'ok' if p else 'bad'}'>{'✔' if p else '✘'}</td><td>{esc(n)}</td><td class='log'>{esc(d)}</td></tr>"
        for n, p, d in res["checks"])
    kv = "".join(f"<tr><td>{esc(k)}</td><td><code>{esc(u.get(k))}</code></td></tr>"
                 for k in ("id", "username", "name", "email", "confirmed_at", "state", "external", "two_factor_enabled", "avatar_url"))
    tok = res["token"]
    tokinfo = {k: tok.get(k) for k in ("token_type", "scope", "expires_in", "created_at")}
    tokinfo["access_token"] = (tok.get("access_token") or "")[:6] + "…（已截斷）"
    return (f"<div class='card'><div class='verdict {cls}'>{txt}</div>"
            f"<h2>Plane 檢查項目</h2><table>{checks}</table>"
            f"<h2>/api/v4/user 回傳（Plane 會用的欄位）</h2><table class='kv'>{kv}</table>"
            f"<details><summary>完整 user JSON</summary><pre>{esc(json.dumps(u, ensure_ascii=False, indent=2))}</pre></details>"
            f"<details><summary>token 回應</summary><pre>{esc(json.dumps(tokinfo, ensure_ascii=False, indent=2))}</pre></details>"
            f"<p class='log'>結果已存到 <code>results/{esc(res['saved_as'])}</code></p>"
            "<a class='btn small' href='/logout'>清除這次結果</a></div>")


def render_error(title, detail, extra=None):
    body = (f"<h1 class='bad'>⛔ {esc(title)}</h1><div class='card'><p>{esc(detail)}</p>"
            + (f"<pre>{esc(json.dumps(extra, ensure_ascii=False, indent=2))}</pre>" if extra else "")
            + "<a class='btn' href='/'>回首頁</a></div>")
    return PAGE.replace("@@BODY@@", body)


# ---------- handler ----------
class Handler(BaseHTTPRequestHandler):
    server_version = "gitlab-oauth-poc/0.1"

    def log_message(self, fmt, *args):  # 安靜一點，只印我們自己的 log
        pass

    # helpers
    def _sid(self):
        c = SimpleCookie(self.headers.get("Cookie", ""))
        return c["sid"].value if "sid" in c else None

    def _send_html(self, body, status=HTTPStatus.OK, set_cookie=None):
        data = body.encode()
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        if set_cookie:
            self.send_header("Set-Cookie", set_cookie)
        self.end_headers()
        self.wfile.write(data)

    def _redirect(self, url, set_cookie=None):
        self.send_response(HTTPStatus.FOUND)
        self.send_header("Location", url)
        self.send_header("Cache-Control", "no-store")
        if set_cookie:
            self.send_header("Set-Cookie", set_cookie)
        self.end_headers()

    # routes
    def do_GET(self):
        url = urllib.parse.urlsplit(self.path)
        q = dict(urllib.parse.parse_qsl(url.query))
        path = url.path
        if path == "/":
            return self._send_html(render_index(SESSIONS.get(self._sid())))
        if path == "/login":
            return self.r_login(q)
        if path == "/auth/gitlab/callback/" or path == "/auth/gitlab/callback":
            return self.r_callback(q)
        if path == "/replay":
            return self.r_replay()
        if path == "/logout":
            SESSIONS.pop(self._sid(), None)
            return self._redirect("/", "sid=; Path=/; Max-Age=0")
        if path == "/healthz":
            return self._send_html("ok")
        self._send_html(render_error("404", path), HTTPStatus.NOT_FOUND)

    def r_login(self, q):
        if not CONFIGURED:
            return self._send_html(render_error("尚未設定", "請先填好 .env"), HTTPStatus.SERVICE_UNAVAILABLE)
        state = secrets.token_urlsafe(32)
        PENDING_STATES[state] = time.time()
        sent_state = state
        if q.get("tamper"):
            sent_state = "tampered-" + secrets.token_hex(4)  # 送給 GitLab 的 state 與本地記錄不符
            log("login.tamper", sent_state=sent_state)
        else:
            log("login.start", state=state[:8] + "…")
        params = {  # 與 Plane 相同
            "client_id": CLIENT_ID,
            "redirect_uri": REDIRECT_URI,
            "response_type": "code",
            "scope": SCOPE,
            "state": sent_state,
        }
        self._redirect(f"{GITLAB_HOST}/oauth/authorize?{urllib.parse.urlencode(params)}")

    def r_callback(self, q):
        # 1. GitLab 回報錯誤（使用者按拒絕等）
        if "error" in q:
            log("callback.error", error=q.get("error"), desc=q.get("error_description"))
            return self._send_html(render_error(
                f"GitLab 回報錯誤：{q.get('error')}",
                q.get("error_description", ""), None), HTTPStatus.BAD_REQUEST)
        # 2. 驗 state
        state = q.get("state", "")
        if state not in PENDING_STATES:
            log("callback.bad_state", state=state[:16])
            return self._send_html(render_error(
                "state 不符", "回呼帶的 state 不是本站發出的，拒絕繼續（CSRF 防護生效）。",
                {"state": state}), HTTPStatus.BAD_REQUEST)
        del PENDING_STATES[state]
        code = q.get("code")
        if not code:
            return self._send_html(render_error("缺少 code", ""), HTTPStatus.BAD_REQUEST)
        return self._finish(code, "callback")

    def r_replay(self):
        code = LAST_CODE["code"]
        if not code:
            return self._redirect("/")
        log("replay.start", code=code[:8] + "…")
        return self._finish(code, "replay")

    def _finish(self, code, origin):
        # 3. code → token
        st, tok = exchange_code(code)
        if st != 200 or "access_token" not in tok:
            log(f"{origin}.token_fail", status=st, body=tok)
            return self._send_html(render_error(
                f"換 token 失敗（HTTP {st}）",
                "重用 code 或 code 過期時 GitLab 會回 invalid_grant，這是正確行為。", tok),
                HTTPStatus.BAD_REQUEST)
        LAST_CODE["code"] = code
        # 4. token → user
        st, user = fetch_user(tok["access_token"])
        if st != 200:
            log(f"{origin}.user_fail", status=st, body=user)
            return self._send_html(render_error(f"取得 user 失敗（HTTP {st}）", "", user), HTTPStatus.BAD_GATEWAY)
        # 5. Plane 的判斷
        ok, checks = plane_verdict(user)
        log(f"{origin}.success", username=user.get("username"), email=user.get("email"),
            confirmed_at=user.get("confirmed_at"), plane_ok=ok)
        # 存檔（不含 token）
        RESULTS_DIR.mkdir(exist_ok=True)
        fname = f"{datetime.now():%Y%m%d-%H%M%S}-{user.get('username', 'unknown')}.json"
        (RESULTS_DIR / fname).write_text(json.dumps(
            {"origin": origin, "plane_ok": ok, "checks": [(n, p) for n, p, _ in checks], "user": user},
            ensure_ascii=False, indent=2))
        sid = secrets.token_urlsafe(16)
        SESSIONS[sid] = {"user": user, "token": tok, "verdict_ok": ok, "checks": checks, "saved_as": fname}
        self._redirect("/", f"sid={sid}; Path=/; HttpOnly; SameSite=Lax")


def main():
    print(f"[gitlab-oauth-poc] http://localhost:{PORT}/  GitLab={GITLAB_HOST}  configured={CONFIGURED}",
          file=sys.stderr)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
