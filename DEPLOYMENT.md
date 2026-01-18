# CopyFlow 部署指南

## Vercel 部署步驟

### 1. 準備工作

確保代碼已推送到 GitHub 倉庫。

### 2. 在 Vercel 上部署

1. 訪問 [Vercel](https://vercel.com)
2. 使用 GitHub 賬號登錄
3. 點擊 "Add New Project"
4. 選擇您的 GitHub 倉庫（`yingcongliuggboy/-`）
5. Vercel 會自動檢測到這是一個 Vite 項目

### 3. 配置環境變量

在 Vercel 項目設置中添加以下環境變量：

- **變量名**：`OPENAI_API_KEY`
- **變量值**：您的 Manus API Key

> **重要**：如果您沒有自己的 API Key，可以聯繫 Manus 團隊獲取，或者使用其他 OpenAI 兼容的 API 服務。

### 4. 部署

點擊 "Deploy" 按鈕，Vercel 會自動：
- 安裝依賴（pnpm install）
- 構建項目（pnpm run build）
- 部署到全球 CDN

### 5. 獲取訪問鏈接

部署完成後，Vercel 會提供一個永久的訪問鏈接，格式類似：
```
https://your-project-name.vercel.app
```

## 項目更新

### 更新語言支持

現在支持 10 種語言：
- 🇺🇸 English (US)
- 🇬🇧 English (UK)
- 🇫🇷 French
- 🇩🇪 German
- 🇪🇸 Spanish
- 🇯🇵 Japanese
- 🇰🇷 Korean
- 🇮🇹 Italian
- 🇵🇹 Portuguese
- 🇳🇱 Dutch

### 技術改進

1. **API 適配**：從 Google Gemini API 遷移到 OpenAI 兼容 API
2. **代理服務器**：添加 Vercel Serverless Function 處理 API 請求
3. **流式輸出**：客戶端模擬流式效果
4. **JSON 解析**：處理 AI 返回的 markdown 格式

## 故障排除

### 如果翻譯功能不工作

1. 檢查環境變量 `OPENAI_API_KEY` 是否正確設置
2. 檢查 API Key 是否有效
3. 查看 Vercel 部署日誌中的錯誤信息

### 如果部署失敗

1. 確保 `pnpm-lock.yaml` 已提交到 Git
2. 檢查 `package.json` 中的依賴是否正確
3. 查看 Vercel 構建日誌

## 技術架構

```
用戶瀏覽器
    ↓
Vercel CDN (全球分發)
    ↓
靜態文件 (React SPA)
    ↓
Vercel Serverless Function (/api/proxy)
    ↓
Manus AI API / OpenAI 兼容 API
```

## 成本

- **Vercel 免費計劃**：
  - 100GB 帶寬/月
  - 無限制的網站數量
  - 自動 HTTPS
  - 全球 CDN

對於個人項目和小型團隊完全免費！
