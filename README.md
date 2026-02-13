# OpenClaw Railway Template

- 一鍵在 Railway 部署可用的 OpenClaw 機械人服務，內建：
- OpenRouter API 串接（Chat Completions）
- 記憶遷移與持久化（支援首次自動匯入、Volume 儲存）
- 健康檢查與 Docker 化

## 目錄結構
- 服務端: [server.js](file:///c:/Users/User/.trae/openclaw-railway-template/src/server.js)
- Docker: [Dockerfile](file:///c:/Users/User/.trae/openclaw-railway-template/Dockerfile)
- Railway 設定: [railway.toml](file:///c:/Users/User/.trae/openclaw-railway-template/railway.toml)
- 環境變數範例: [.env.example](file:///c:/Users/User/.trae/openclaw-railway-template/.env.example)

## 一鍵安裝方案
- 建議使用 GitHub 連結至 Railway（官方支援將公共 Repo 轉為模板）
- 步驟：
- 將本專案推送到 GitHub（公開 Repo）
- 於 Railway Dashboard 新建專案 → 選擇 Deploy from GitHub
- 首次部署前，於 Service → Variables 匯入 [.env.example](file:///c:/Users/User/.trae/openclaw-railway-template/.env.example) 內容並填入值
- 於 Service 設定附加 Volume（Mount Path 建議 /data），用於持久化記憶

## 是否需要先寫到 GitHub？
- 如要達成「一鍵模板」體驗，建議先托管到公共 GitHub Repo，再在 Railway 內將此專案轉為模板
- Railway 模板目前以公共 Repo 為前提，模板才可供他人一鍵部署
- 若僅自用，可直接以 CLI 上傳部署，但不具模板按鈕的體驗

## rclone + Gmail 設定
- 腳本位置: [scripts/openclaw_rclone_setup.sh](file:///c:/Users/User/.trae/openclaw-railway-template/scripts/openclaw_rclone_setup.sh)
- 在 Railway 服務的 Exec 執行：

```bash
WORKSPACE=/data/workspace EMAIL=info.j18.hk@gmail.com APP_PASSWORD=lmwovcqjosaqians CLIENT_ID=855956380197-bokefikbhf7mhe808ie2idqopu0k6mt7.apps.googleusercontent.com bash /data/workspace/scripts/openclaw_rclone_setup.sh
```

## GitHub Actions 自動部署
- 工作流: [.github/workflows/deploy-openclaw.yml](file:///c:/Users/User/.trae/openclaw-railway-template/.github/workflows/deploy-openclaw.yml)
- 在 GitHub Repo Secrets 設定：
- RAILWAY_TOKEN
- RAILWAY_PROJECT_ID
- RAILWAY_ENVIRONMENT_ID
- 推送到 master/main 或手動 workflow_dispatch 會觸發部署

## 記憶遷移設計
- 首次啟動時若偵測記憶檔不存在：
- 若設定 OLD_MEMORY_URL，服務將自動抓取該 URL 的 JSON 並存入記憶檔
- 若未設定，將建立空白記憶檔
- 記憶檔位置：
- 優先使用 Railway Volume 的路徑 `RAILWAY_VOLUME_MOUNT_PATH/memory.json`
- 若未附加 Volume，使用內部路徑 `/app/data/memory.json`
- API：
- GET /memory 讀取記憶
- POST /memory 覆寫記憶（JSON）

## OpenRouter 串接
- 端點：POST /chat
- 請求格式：

```json
{
  "messages": [
    { "role": "user", "content": "hello" }
  ],
  "temperature": 0.7,
  "max_tokens": 512
}
```

- 服務將自動將記憶注入為 system message 前置內容
- 環境變數：
- OPENROUTER_API_KEY（必填）
- OPENROUTER_MODEL（預設 openrouter/anthropic/claude-3.5-sonnet）

## 必填變數
- OPENROUTER_API_KEY
- 建議變數
- OPENROUTER_MODEL
- OLD_MEMORY_URL（首次自動匯入用）
- MEMORY_PATH（自訂記憶檔路徑，預設使用 Volume）
- PORT（預設 3000）

## 本地測試
- Node 18+：

```bash
npm ci
npm start
```

- 健康檢查：

```bash
curl http://localhost:3000/health
```

- 聊天示例：

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"你好\"}]}"
```

## 部署注意事項
- 若使用 Dockerfile，本專案已設定健康檢查路徑與啟動命令
- 請在 Railway 服務設定中附加 Volume 以確保記憶持久化
- 若從 GitHub 觸發部署，Railway 將自動提示匯入 .env.example 變數
