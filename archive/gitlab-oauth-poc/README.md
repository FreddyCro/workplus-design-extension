# gitlab-oauth-poc

在裝 Plane 之前，先用一支小程式驗證「用公司 GitLab（misgitlab）當 OAuth 登入」走不走得通。
程式照抄 Plane 的 GitLab provider 流程（`scope=read_user` → `/oauth/token` → `/api/v4/user`），
並套用 Plane 的放行條件（`confirmed_at` 有值、`email` 有值）。

只用 Python 3 標準函式庫，不需要安裝任何套件。

## 設定

1. GitLab → 右上角頭像 → **Preferences → Applications → Add new application**
   - Name: `plane-oauth-test`
   - Redirect URI: `http://localhost:8765/auth/gitlab/callback/`
   - Confidential: ✔
   - Scopes: 只勾 **`read_user`**
2. `cp .env.example .env`，填入 Application ID 和 Secret（`.env` 已 gitignore）
3. `chmod 600 .env`

## 執行

```bash
python3 server.py
```

瀏覽器開 `http://localhost:8765/`（VS Code Remote 會自動轉 port）。

## 測試項目

| # | 項目 | 期望 |
|---|---|---|
| 4 | 正常登入 | 顯示「✅ Plane 會放行」，`email` 是公司信箱、`confirmed_at` 有值 |
| 5a | 授權頁按拒絕 | 顯示 `access_denied` 錯誤 |
| 5b | 篡改 state | 顯示「state 不符」 |
| 5c | 重用 code | 換 token 失敗，GitLab 回 `invalid_grant` |
| 5d | 偽造 error 回呼 | 顯示錯誤，不會放行 |
| 6 | 同事各自登入 | 每個人都是 ✅ |

每次成功登入的結果（不含 token）會存到 `results/*.json`，方便彙整步驟 6。

## 清理

GitLab → Preferences → Applications → 把 `plane-oauth-test` 刪掉；本機刪 `.env` 和 `results/`。
