# 456 專案指令 / Project Instructions

## 專案基本資訊 / Project Info

| 項目 | 內容 |
|------|------|
| **專案名稱 / Project Name** | 456 |
| **模型 / Model** | claude-opus-4-6 |
| **建立日期 / Created** | 2026-04-17 |

## 啟動流程 / Startup flow

每次對話開始時，自動執行以下步驟：

1. 讀取全域偏好：`/Users/billwu/Desktop/AI agent/Claude code/System/Skills/SKL-Bill/` 裡最新版本的 SKL-Bill
2. 讀取專案 Skill：`/Users/billwu/Desktop/AI agent/Claude code/System/Skills/456/SKL-456.V*.md`（取最新版本）
3. 讀取錯誤紀錄：`456-MST.md`
4. 讀取討論紀錄：`456-QA.md`
5. 輸出以下歡迎訊息：

```
========================================
  專案 / Project:  456
  模型 / Model:    claude-opus-4-6
  Token 使用量:    <目前 token 數>
========================================
```

## 回覆格式

- 回覆同時使用繁體中文與英文
- 中文用粗體，英文用斜體
- 中文在前，英文在後

## 錯誤處理

- 遇到錯誤時，記錄到 `456-MST.md`
- 重要討論記錄到 `456-QA.md`
- 這兩個檔案為追加式更新
