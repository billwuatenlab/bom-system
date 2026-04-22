# comm.V01 — BOM 系統平台規劃文件 / BOM System Platform Planning Document

> **版本 / Version:** V01
> **日期 / Date:** 2026-04-17
> **專案 / Project:** 456 — BOM 系統平台

---

# 第一章：專案執行詳細規劃 / Chapter 1: Detailed Project Execution Plan

---

## 1.1 專案概述 / Project Overview

**建立一個 BOM（Bill of Materials）系統平台，提供物料管理、庫存追蹤、階層式物料結構瀏覽及報表功能。**

*Build a BOM (Bill of Materials) system platform providing material management, inventory tracking, hierarchical material structure browsing, and reporting.*

---

## 1.2 技術架構 / Tech Stack

| 項目 | 選用技術 | 說明 |
|------|----------|------|
| **前端框架** | React + TypeScript | SPA 單頁應用 |
| **UI 元件庫** | Ant Design (antd) | 樹狀結構、表格、表單元件完善 |
| **狀態管理** | Zustand | 輕量、簡潔 |
| **後端** | Node.js + Express | REST API |
| **資料庫** | SQLite (初期) → PostgreSQL (擴展) | 輕量啟動，可遷移 |
| **ORM** | Prisma | 型別安全、遷移方便 |
| **終端機面板** | xterm.js | 右側常駐 Claude 終端（前端直連） |
| **國際化 i18n** | react-i18next | 繁體中文 + 英文雙語介面 |
| **Excel 匯入** | xlsx (SheetJS) | 物料批量匯入 |
| **建構工具** | Vite | 快速開發體驗 |

---

## 1.3 系統架構圖 / System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BOM 系統平台                              │
├──────────┬──────────┬──────────┬──────────┬─────────────────────┤
│  側邊欄   │          主要工作區域           │   終端機面板（右）   │
│  Sidebar │          Main Content           │   Terminal Panel   │
│          │                                  │                    │
│ ┌──────┐ │  ┌────────────────────────────┐ │  ┌──────────────┐  │
│ │總覽   │ │  │  Dashboard / 物料樹 / 作業  │ │  │  Claude 終端  │  │
│ │物料   │ │  │                            │ │  │              │  │
│ │作業   │ │  │                            │ │  │              │  │
│ │系統   │ │  │                            │ │  │              │  │
│ └──────┘ │  └────────────────────────────┘ │  └──────────────┘  │
├──────────┴──────────────────────────────────┴─────────────────────┤
│                        底部狀態列 / Status Bar                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1.4 功能模組規劃 / Module Planning

### 模組一：Overall 總覽儀表板

| 功能 | 說明 |
|------|------|
| **總物料數量** | 顯示系統中所有物料的總數，含分類統計 |
| **總庫存狀況** | 庫存總量、低庫存警示、庫存金額估算 |
| **工作狀況** | 近期進出庫紀錄、待處理項目、操作日誌 |

**元件：** *統計卡片 (Statistic Cards)、圖表 (Charts)、最近活動列表 (Recent Activity)*

---

### 模組二：物料總覽（樹狀結構）

| 功能 | 說明 |
|------|------|
| **樹狀物料視窗** | 以 Tree 元件呈現 BOM 階層結構（父件→子件→孫件…），最多 9 層 |
| **展開 / 收合** | 點擊節點展開或收合子層 |
| **搜尋物料** | 頂部搜尋欄，即時篩選並高亮匹配節點 |
| **物料詳情面板** | 點擊節點右側顯示物料詳細資訊 |

**資料結構：**
```
物料 (Material)
├── 子物料 A (Sub-material A)
│   ├── 子物料 A-1
│   └── 子物料 A-2
├── 子物料 B
└── 子物料 C
    └── 子物料 C-1
```

---

### 模組三：物料作業

| 功能 | 說明 |
|------|------|
| **Excel 匯入** | 支援 Excel (.xlsx) 批量匯入物料，含欄位對應與驗證 |
| **新增物料** | 表單輸入：料號、名稱、規格、單位、分類、父件關聯 |
| **修改物料** | 編輯現有物料屬性，保留修改歷史 |
| **進出庫** | 入庫 / 出庫操作，記錄數量、日期、經辦人、備註 |
| **報表** | 庫存報表、進出庫明細、物料異動歷史，支援匯出 CSV / PDF |

---

### 模組四：終端機常駐（Claude）

| 功能 | 說明 |
|------|------|
| **右側固定面板** | 可調整寬度，可收合/展開 |
| **Claude 互動** | 輸入指令與 Claude 對話，取得物料建議或操作協助 |
| **快捷操作** | 透過終端直接執行物料查詢、快速新增等 |

---

### 模組五：系統管理

| 功能 | 說明 |
|------|------|
| **系統狀態** | 資料庫連線、API 回應時間、磁碟使用量 |
| **帳號管理** | 使用者列表、角色權限（管理員/操作員/檢視者）、新增/停用帳號 |
| **操作日誌** | 系統操作紀錄，可篩選查詢 |

---

## 1.5 資料庫設計 / Database Schema

### 核心資料表

```sql
-- 物料主表 / Materials
CREATE TABLE materials (
  id            TEXT PRIMARY KEY,       -- 料號 Part Number
  name          TEXT NOT NULL,          -- 名稱
  specification TEXT,                   -- 規格
  unit          TEXT NOT NULL,          -- 單位 (pcs, kg, m...)
  category      TEXT,                   -- 分類
  description   TEXT,                   -- 描述
  stock_qty     REAL DEFAULT 0,         -- 庫存數量
  safety_stock  REAL DEFAULT 0,         -- 安全庫存
  created_at    DATETIME DEFAULT NOW,
  updated_at    DATETIME DEFAULT NOW
);

-- BOM 階層關聯 / BOM Structure
CREATE TABLE bom_relations (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id     TEXT NOT NULL,          -- 父件料號
  child_id      TEXT NOT NULL,          -- 子件料號
  quantity      REAL NOT NULL,          -- 用量
  unit          TEXT,                   -- 單位
  level         INTEGER CHECK(level <= 9), -- 階層深度（最多 9 層）
  FOREIGN KEY (parent_id) REFERENCES materials(id),
  FOREIGN KEY (child_id) REFERENCES materials(id)
);

-- 進出庫紀錄 / Inventory Transactions
CREATE TABLE inventory_transactions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  material_id   TEXT NOT NULL,
  type          TEXT NOT NULL,          -- 'IN' 入庫 / 'OUT' 出庫
  quantity      REAL NOT NULL,
  operator      TEXT,                   -- 經辦人
  remark        TEXT,                   -- 備註
  created_at    DATETIME DEFAULT NOW,
  FOREIGN KEY (material_id) REFERENCES materials(id)
);

-- 使用者 / Users
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE NOT NULL,   -- 員工 Email 登入
  name          TEXT NOT NULL,          -- 員工姓名
  password_hash TEXT NOT NULL,
  role          TEXT DEFAULT 'viewer',  -- admin / operator / viewer
  status        TEXT DEFAULT 'active',
  created_at    DATETIME DEFAULT NOW
);

-- 操作日誌 / Operation Logs
CREATE TABLE operation_logs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER,
  action        TEXT NOT NULL,
  target        TEXT,
  detail        TEXT,
  created_at    DATETIME DEFAULT NOW,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 1.6 專案目錄結構 / Project Directory Structure

```
456/
├── comm.V01.md              # 本文件
├── client/                  # 前端
│   ├── src/
│   │   ├── components/      # 共用元件
│   │   ├── pages/
│   │   │   ├── Dashboard/   # 模組一：總覽
│   │   │   ├── Materials/   # 模組二：物料總覽（樹狀）
│   │   │   ├── Operations/  # 模組三：物料作業
│   │   │   └── System/      # 模組五：系統管理
│   │   ├── layouts/
│   │   │   └── MainLayout.tsx  # 含側邊欄 + 終端面板
│   │   ├── store/           # Zustand 狀態
│   │   ├── api/             # API 呼叫
│   │   └── App.tsx
│   └── package.json
├── server/                  # 後端
│   ├── src/
│   │   ├── routes/          # API 路由
│   │   ├── controllers/     # 業務邏輯
│   │   ├── prisma/          # Schema & migrations
│   │   └── index.ts
│   └── package.json
└── package.json             # Workspace root
```

---

## 1.7 開發階段 / Development Phases

| 階段 | 內容 | 預估 |
|------|------|------|
| **Phase 1** | 專案骨架 + 佈局（側邊欄、主區域、終端面板） | 基礎框架 |
| **Phase 2** | 物料 CRUD + 資料庫 + API | 核心功能 |
| **Phase 3** | 樹狀結構 BOM 瀏覽 + 搜尋 | 核心功能 |
| **Phase 4** | 進出庫作業 + 庫存計算 | 核心功能 |
| **Phase 5** | 總覽儀表板 + 圖表 | 資訊呈現 |
| **Phase 6** | 報表匯出 (CSV/PDF) | 進階功能 |
| **Phase 7** | 系統管理 + 帳號權限 | 管理功能 |
| **Phase 8** | 終端機 Claude 整合 | 特色功能 |

---

---

# 第二章：專案軟體製作溝通文件 / Chapter 2: Project Software Communication Document

---

## 2.1 溝通紀錄 / Communication Log

### 📋 2026-04-17 — 初始需求確認 / Initial Requirements

**Bill 提出的需求：**

*Requirements from Bill:*

| # | 工作區 | 功能描述 |
|---|--------|----------|
| 1 | **Overall 總覽** | 總物料數量、總庫存狀況、工作狀況 |
| 2 | **物料總覽** | 樹枝狀物料視窗、階層展開/收合、搜尋物料 |
| 3 | **物料作業** | 新增、修改、進出庫、報表 |
| 4 | **終端機（右側常駐）** | Claude 終端面板 |
| 5 | **系統** | 系統狀態、帳號管理 |

---

## 2.2 待確認事項 / Items to Confirm

> **以下問題確認後即可開始執行製作。**
>
> *Confirm the following and we can start building.*

| # | 問題 | 預設方案 | 狀態 |
|---|------|----------|------|
| 1 | **物料料號格式？** | Excel 匯入（批量建立物料） | ✅ 已確認 |
| 2 | **BOM 階層深度限制？** | 最多 9 層 | ✅ 已確認 |
| 3 | **帳號登入方式？** | 員工 Email 登入 + JWT | ✅ 已確認 |
| 4 | **報表匯出格式？** | CSV + PDF（確認） | ✅ 已確認 |
| 5 | **語系？** | 繁體中文 + 英文（雙語介面） | ✅ 已確認 |
| 6 | **終端機 Claude 連接方式？** | 終端機直連（前端嵌入） | ✅ 已確認 |
| 7 | **是否需要多人同時操作？** | 是，支援多人（角色權限） | ✅ 已確認 |

---

## 2.3 後續溝通追加區 / Follow-up Communication

> **新的溝通內容請追加在此區下方。**
>
> *Append new communication below.*

---

### 📋 2026-04-17 — Bill 確認 7 項問題 / Bill Confirmed 7 Items

| # | 問題 | Bill 的回覆 | 影響範圍 |
|---|------|------------|----------|
| 1 | 物料料號格式 | **Excel 匯入** | 新增 xlsx 匯入功能，含欄位對應 |
| 2 | BOM 階層深度 | **最多 9 層** | DB 加 CHECK 約束，前端限制展開層數 |
| 3 | 帳號登入 | **員工 Email** | users 表改用 email 欄位登入 |
| 4 | 報表匯出 | **CSV + PDF 確認** | 維持原方案 |
| 5 | 語系 | **繁中 + 英文雙語** | 新增 react-i18next 國際化 |
| 6 | Claude 連接 | **終端機直連** | 前端 xterm.js 嵌入 |
| 7 | 多人操作 | **是** | 角色權限（admin/operator/viewer） |

**結論：所有問題已確認，可以開始執行製作。**

*Conclusion: All items confirmed. Ready to start building.*

---

<!-- END comm.V01 -->
