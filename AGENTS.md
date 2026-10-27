# NS 手術統計 App（ns-surgery-stats）

嘉義長庚神經外科的手術統計網頁工具。純靜態 HTML/JS，透過 GitHub Pages 公開給同事使用：
https://u9201031.github.io/ns-surgery-stats/

## 絕對規則：病人資料
- **任何 Excel / CSV（.xlsx、.xls、.csv）都絕對不能 commit 或 push。** 裡面含病人資料，而公開 repo 的 git 歷史幾乎無法完全清除。
- `sample/` 資料夾放的是真實手術總表，只能本機測試用，不可搬移、改名或加入 git。
- 不要在程式碼、註解、測試或文件裡寫入真實病歷號、姓名或其他可識別病人的資料；需要範例時用假資料。
- 每次 commit 前先執行 `git status`，確認沒有任何試算表檔案。

## 架構
- `index.html`、`css/styles.css`：頁面與樣式。
- `js/app.js`：畫面狀態、輸入表單、紀錄存在瀏覽器 localStorage。
- `js/excel.js`：Excel 匯入／匯出（SheetJS xlsx@0.18.5，從 jsdelivr CDN 載入），相容現有 NS 手術總表欄位。
- `js/taxonomy.js`：統計分類樹（對應訓練醫院季統計表的列與群組）。要新增或調整統計項目改這裡。
- `js/classify.js`：依「分類碼 / 診斷 / 術式」自動對應到 taxonomy 的統計 id。分類判斷錯誤（例如某診斷被分到錯的類別）改這裡。
- `js/stats.js`：統計彙整（手術總數、病人數、同月多次手術）。
- `serve.sh`：本機預覽用的簡易伺服器。

## 開發原則
- 資料只在使用者瀏覽器內處理，不要加入任何把資料上傳到伺服器的功能。
- 保持無建置步驟（no build）：不引入 npm 打包流程，維持可直接被 GitHub Pages 提供的靜態檔案。
- 介面文字使用繁體中文。
