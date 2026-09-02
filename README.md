# 南港機廠社宅 · 青創入口網

台北市南港機廠社宅青年創新回饋計畫的內部協作平台，整合資料彙整、活動填報、報名管理與上刊排程。

## 功能概覽

| 區塊 | 說明 |
|------|------|
| **01 資料彙整區** | 核銷資訊、核定總表、經費資材清單、活動後必備資料清單等常用連結 |
| **02 內部活動表單** | 青創伙伴提交活動資訊；建立後自動產生 `/活動/{slug}` 報名連結 |
| **03 活動資料區** | 我的活動、複製報名連結、查看報名名單 |
| **04 工作區** | 上刊月曆、活動月曆、活動資料表（所有登入青創可瀏覽；狀態編輯僅管理員） |
| **公開入口 `/活動`** | 社宅居民不需登入，瀏覽已公開活動並線上報名 |

## 登入與權限

| 角色 | 帳號 | 權限 |
|------|------|------|
| 青創伙伴 | `NJ01`…`NJ33` | 首頁全部區塊（資料、填報、活動資料、工作區瀏覽） |
| 平台組管理員 | `ADMIN` | 上述全部 + 工作區編輯/刪除/CSV + `/admin` 帳號後台 |
| 社宅居民 | — | 僅 `/活動` 與 `/活動/{slug}` 公開頁（不需登入） |

- 預設密碼：`123456`（首次登入強制修改）
- 首頁 `/` 一定需要登入；公開活動入口為 `/活動`

## 技術架構

- **前端**：Next.js 16（App Router）、React 19、TypeScript、Tailwind CSS 4
- **執行環境**：[vinext](https://github.com/nicolo-ribaudo/vinext)（Vite 驅動的 Next.js 執行時）
- **託管**：[OpenAI Sites](https://developers.openai.com/codex/sites)（Cloudflare Workers）
- **資料庫**：Cloudflare D1（SQLite）
- **檔案儲存**：Cloudflare R2（活動圖片上傳，選用）

## 環境需求

- Node.js **≥ 22.13.0**
- [pnpm](https://pnpm.io/)（建議）

## 本機開發

```bash
pnpm install
cp .env.example .env.local   # 設定 SESSION_SECRET
pnpm dev
```

開啟 [http://localhost:3000](http://localhost:3000)，會導向登入頁。

公開活動入口：[http://localhost:3000/活動](http://localhost:3000/活動)

測試帳號：

- 管理員：`ADMIN` / `123456`
- 青創伙伴：`NJ01` / `123456`（首次登入需改密碼）

## 部署

本專案透過 **OpenAI Sites** 託管。Deploy 前請在 Sites 環境變數設定 `SESSION_SECRET`。

Deploy 後第一次 API 請求會自動建表、seed 帳號，並為既有活動 backfill `slug`。

## 環境變數

| 變數 | 必填 | 說明 |
|------|------|------|
| `SESSION_SECRET` | **是** | Session 簽章用隨機長字串 |
| `NEXT_PUBLIC_SITE_URL` | 否 | 正式站網址，用於 Open Graph |

## API

### 驗證

- `POST /api/auth/login` — 登入
- `POST /api/auth/logout` — 登出
- `GET /api/auth/me` — 目前登入者
- `POST /api/auth/change-password` — 變更密碼

### 活動（需登入）

- `GET /api/activities` — 列出全部活動
- `GET /api/activities?scope=mine` — 我的活動
- `POST /api/activities` — 新增活動（回傳 `publicUrl`）
- `PATCH /api/activities` — 更新追蹤狀態（管理員）
- `DELETE /api/activities?id={id}` — 刪除（管理員）
- `GET /api/activities/{id}/registrations` — 報名名單（活動擁有者或管理員）

### 公開活動（不需登入）

- `GET /api/public/activities` — 已公開活動列表
- `GET /api/public/activities/{slug}` — 單一活動
- `POST /api/public/activities/{slug}/register` — 提交報名

### 圖片上傳（需登入，R2 啟用時）

- `POST /api/uploads` — 上傳圖片
- `GET /api/files/uploads/{filename}` — 讀取圖片（公開活動頁可存取 `uploads/` 路徑）

## 授權

Private — 南港機廠社宅青年創新回饋計畫內部使用。
