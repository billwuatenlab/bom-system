# BOM System — 部署紀錄 / Deployment Log

> **日期 / Date:** 2026-04-22
> **部署目標 / Target:** Windows Server (`35.234.53.249`)
> **部署者 / Deployed by:** Bill + Claude Opus 4.6

---

## 環境資訊 / Environment

| 項目 | 值 |
|------|------|
| **Server IP** | 35.234.53.249 |
| **OS** | Windows Server 2016 |
| **GCP Project** | midyear-byway-207211 |
| **GCP VM** | atenlab-erp (asia-east1-b, c2-standard-4) |
| **MSSQL Instance** | ATENLAB-ERP\ATENLABDBSERVER (SQL Server 2017) |
| **Database** | BOM |
| **DB User** | BomAdmin |
| **Node.js** | v24.15.0 |
| **Port** | 3001 |
| **URL** | http://35.234.53.249:3001 |
| **帳號** | admin@bom.local / admin123 |

---

## 技術架構 / Tech Stack

| 層級 | 技術 |
|------|------|
| **Frontend** | React 19 + TypeScript + Ant Design + Vite |
| **Backend** | Express.js + Prisma ORM |
| **Database** | Microsoft SQL Server 2017 |
| **Process Manager** | PM2 (auto-start on boot) |
| **Repository** | https://github.com/billwuatenlab/bom-system |

---

## 部署步驟紀錄 / Deployment Steps

### 1. 本機開發環境設定 (Mac)

1. **啟動 456 範例專案** — 前端 (port 5173) + 後端 (port 3001)
2. **本機安裝 Docker Desktop** — 因為 macOS 不支援原生 MSSQL
   - macOS 12 Monterey + Intel x86_64
   - Homebrew 安裝 Colima 失敗（QEMU 編譯失敗）
   - 下載舊版 Docker Desktop 4.28（支援 macOS 12）
   - 重啟 Docker Desktop 後成功連線
3. **本機建立 MSSQL 容器**
   ```
   docker run -d --name mssql-bom -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=BomSystem@2026" -e "MSSQL_PID=Express" -p 1433:1433 mcr.microsoft.com/mssql/server:2022-latest
   ```
4. **建立 BOM 資料庫 + 推送 Schema + Seed 資料**
   ```
   npx prisma db push
   npx tsx src/seed.ts
   ```
5. **本機驗證成功** — 前後端連線正常，Dashboard 顯示 6 個物料

### 2. 準備部署

1. **移除不需要的依賴** — `better-sqlite3`（只用 MSSQL）
2. **修復 TypeScript 編譯** — `package.json` 加 `"type": "module"`
3. **排除 migrate 檔案** — `tsconfig.json` exclude `migrate-to-mssql.ts`
4. **建置前後端**
   ```
   cd client && npm run build
   cd server && npm run build
   ```

### 3. GitHub 部署

1. **建立 GitHub repo** — `billwuatenlab/bom-system` (public)
2. **推送程式碼** — 含 `.gitignore` 排除 node_modules, .env, dist, deploy, EXE
3. **建立部署腳本** — `setup.ps1`, `fix-env.ps1`, `firewall.ps1`, `restart.ps1`, `install-service.ps1`

### 4. Windows Server 部署

1. **安裝 Git** — 從 https://git-scm.com 下載安裝 (v2.54.0)
2. **Node.js 已存在** — v24.15.0
3. **Clone repo**
   ```
   cd C:\
   git clone https://github.com/billwuatenlab/bom-system.git BOM
   ```
4. **MSSQL 設定**
   - Windows 驗證可用，但 Prisma 不支援 integratedSecurity
   - 用 SSMS 建立 `BOM` 資料庫
   - 用 SSMS 建立 SQL Login `BomAdmin` (password: BomSystem@2026)
   - 授予 `db_owner` 權限
5. **建立 .env** — 使用 `fix-env.ps1` 腳本
   ```
   DATABASE_URL="sqlserver://localhost\ATENLABDBSERVER;database=BOM;user=BomAdmin;password=BomSystem@2026;encrypt=true;trustServerCertificate=true"
   ```
6. **執行部署腳本** — `setup.ps1`
   - npm install (backend + frontend)
   - prisma generate + db push
   - seed 初始資料
   - build backend + frontend
7. **Windows 防火牆** — `firewall.ps1` 開放 port 3001
8. **GCP 防火牆** — 使用 gcloud CLI 新增規則 `allow-bom-3001`
   ```
   gcloud compute firewall-rules create allow-bom-3001 --project=midyear-byway-207211 --direction=INGRESS --action=ALLOW --rules=tcp:3001 --source-ranges=0.0.0.0/0
   ```
9. **PM2 常駐服務** — `install-service.ps1`
   - 安裝 pm2 + pm2-windows-startup
   - `pm2 start dist/index.js --name bom-system`
   - `pm2 save` + `pm2-startup install`
   - 開機自動啟動

---

## 遇到的問題與解決 / Issues & Solutions

| # | 問題 | 原因 | 解決方式 |
|---|------|------|----------|
| 1 | Docker Desktop 不支援 macOS 12 | 最新版需要 macOS Sonoma | 下載舊版 Docker Desktop 4.28 |
| 2 | QEMU 編譯失敗 | macOS 12 Tier 3 不支援 | 改用 Docker Desktop |
| 3 | Docker Engine 500 錯誤 | brew docker CLI 版本不相容 | 重啟 Docker Desktop |
| 4 | `better-sqlite3` 需要 Visual Studio | node-gyp 編譯原生模組 | 從 package.json 移除（不需要 SQLite） |
| 5 | Prisma 不支援 Windows integratedSecurity | Prisma MSSQL driver 限制 | 建立 SQL Login `BomAdmin` |
| 6 | `CREATE DATABASE` 權限不足 | AdminA1ERP 帳號無 sysadmin | 用 SSMS 手動建立 BOM 資料庫 |
| 7 | PowerShell 複製斷行 | RDP 剪貼簿斷行 | 改用 .ps1 腳本檔 |
| 8 | Port 3001 外部連不上 | Windows + GCP 防火牆都要開 | 兩邊都加規則 |
| 9 | PM2 status stopped | Port 被舊 node 佔用 | `Stop-Process -Name node -Force` 後重啟 |
| 10 | .env 內容沒改到 | notepad 存檔問題 | 用 PowerShell 腳本寫入 |

---

## 一鍵部署指令 / One-Click Deploy

未來重新部署只需在 Windows Server 管理員 PowerShell 執行：

```powershell
powershell -ExecutionPolicy Bypass -File C:\BOM\deploy-full.ps1
```

或帶參數：

```powershell
powershell -ExecutionPolicy Bypass -File C:\BOM\deploy-full.ps1 -DbInstance "localhost\ATENLABDBSERVER" -DbUser "BomAdmin" -DbPassword "BomSystem@2026" -Port 3001
```

---

## 日常管理指令 / Management Commands

```powershell
# 查看狀態
pm2 status

# 查看日誌
pm2 logs bom-system

# 重啟
pm2 restart bom-system

# 停止
pm2 stop bom-system

# 更新程式碼
cd C:\BOM; git pull
cd server; npm install; npm run build
cd ..\client; npm install; npm run build
pm2 restart bom-system
```

---

## 檔案結構 / File Structure

```
C:\BOM\
├── deploy-full.ps1          # 一鍵部署腳本
├── setup.ps1                # 初始安裝腳本
├── fix-env.ps1              # .env 設定腳本
├── firewall.ps1             # Windows 防火牆腳本
├── restart.ps1              # 重啟診斷腳本
├── check-and-start.ps1      # 狀態檢查腳本
├── install-service.ps1      # PM2 服務安裝腳本
├── server/
│   ├── .env                 # 資料庫連線設定
│   ├── dist/                # 編譯後的後端
│   ├── src/                 # TypeScript 原始碼
│   ├── prisma/              # Schema 定義
│   └── uploads/             # 上傳檔案
└── client/
    ├── dist/                # 編譯後的前端（由後端 serve）
    └── src/                 # React 原始碼
```
