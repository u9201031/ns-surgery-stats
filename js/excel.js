/**
 * Excel 匯入／匯出（相容現有 NS 手術總表欄位）
 */
window.NSExcel = (() => {
  function excelDateToISO(v) {
    if (v == null || v === "") return "";
    if (v instanceof Date && !Number.isNaN(v.getTime())) {
      const y = v.getFullYear();
      const m = String(v.getMonth() + 1).padStart(2, "0");
      const d = String(v.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    if (typeof v === "number") {
      // Excel serial
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const date = new Date(epoch.getTime() + v * 86400000);
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, "0");
      const d = String(date.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    const s = String(v).trim();
    const m1 = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (m1) return `${m1[1]}-${m1[2].padStart(2, "0")}-${m1[3].padStart(2, "0")}`;
    const d2 = new Date(s);
    if (!Number.isNaN(d2.getTime())) return excelDateToISO(d2);
    return "";
  }

  function headerIndex(headers) {
    const map = {};
    headers.forEach((h, i) => {
      const key = String(h || "").trim().toLowerCase();
      if (key) map[key] = i;
    });
    const find = (...names) => {
      for (const n of names) {
        const k = n.toLowerCase();
        if (map[k] != null) return map[k];
      }
      return -1;
    };
    return {
      date: find("日期", "date", "手術日期", "開刀時間"),
      chartNo: find("病歷號", "病例號", "chart", "mrn"),
      age: find("年紀", "年齡", "age"),
      sex: find("性別", "sex", "gender"),
      name: find("姓名", "name"),
      diagnosis: find("診斷", "diagnosis", "dx"),
      procedure: find("術式", "手術方式", "procedure", "op"),
      la: find("la", "麻醉", "麻醉方式"),
      surgeon: find("主治", "執行醫師", "醫師", "vs", "surgeon"),
      emergency: find("e", "急診"),
      categoryCode: find("分類", "category", "分類碼"),
      note: find("備註", "note", "病理"),
      tag: find("tag", "標記"),
    };
  }

  function rowToRecord(row, idx, sheetName) {
    const date = excelDateToISO(row[idx.date]);
    const chartNo = row[idx.chartNo] != null ? String(row[idx.chartNo]).trim() : "";
    if (!date && !chartNo) return null;

    const diagnosis = idx.diagnosis >= 0 && row[idx.diagnosis] != null ? String(row[idx.diagnosis]).trim() : "";
    const procedure = idx.procedure >= 0 && row[idx.procedure] != null ? String(row[idx.procedure]).trim() : "";
    const surgeon = idx.surgeon >= 0 && row[idx.surgeon] != null ? String(row[idx.surgeon]).trim() : "";
    const categoryCode = idx.categoryCode >= 0 && row[idx.categoryCode] != null ? String(row[idx.categoryCode]).trim() : "";
    const tag = idx.tag >= 0 && row[idx.tag] != null ? String(row[idx.tag]).trim() : "";
    // 有些總表把「高位頸椎」「endoscopic」放在分類後欄
    let extraTag = tag;
    if (!extraTag && row.length > 12) {
      const maybe = row[12];
      if (maybe != null && String(maybe).trim() && !/^(統計|Local|急診)/.test(String(maybe))) {
        extraTag = String(maybe).trim();
      }
    }

    const base = {
      id: crypto.randomUUID(),
      date,
      chartNo,
      age: idx.age >= 0 && row[idx.age] != null ? String(row[idx.age]).trim() : "",
      sex: idx.sex >= 0 && row[idx.sex] != null ? String(row[idx.sex]).trim() : "",
      name: idx.name >= 0 && row[idx.name] != null ? String(row[idx.name]).trim() : "",
      diagnosis,
      procedure,
      la: (() => {
        if (idx.la < 0 || row[idx.la] == null) return "";
        const raw = String(row[idx.la]).trim();
        const u = raw.toUpperCase();
        if (u === "LA" || raw.includes("局麻") || u.includes("LOCAL")) return "局麻";
        if (u === "GA" || raw.includes("全麻") || u.includes("GENERAL")) return "全麻";
        if (raw === "局麻" || raw === "全麻") return raw;
        return raw;
      })(),
      surgeon,
      emergency: idx.emergency >= 0 && row[idx.emergency] != null ? String(row[idx.emergency]).trim() : "",
      categoryCode,
      tag: extraTag,
      note: idx.note >= 0 && row[idx.note] != null ? String(row[idx.note]).trim() : "",
      sourceSheet: sheetName || "",
      manualCategory: false,
    };

    const result = window.NSClassify.classify(base);
    base.categoryId = result.categoryId;
    base.confidence = result.confidence;
    base.classifyReason = result.reason;
    return base;
  }

  async function parseFile(file) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const records = [];
    const warnings = [];

    for (const sheetName of wb.SheetNames) {
      // 跳過純 list 輔助表也可匯入；若無「日期」欄則跳過
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
      if (!rows.length) continue;
      const headers = rows[0].map((h) => (h == null ? "" : String(h)));
      // 第一欄標題空白但內容是日期時，視為「日期」欄（例如 114總表）
      if (!headers[0] && rows.slice(1, 6).some((r) => r && r[0] instanceof Date)) headers[0] = "日期";
      const idx = headerIndex(headers);
      if (idx.date < 0 || idx.chartNo < 0) {
        warnings.push(`工作表「${sheetName}」缺少日期或病歷號欄，已跳過`);
        continue;
      }
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row.length) continue;
        try {
          const rec = rowToRecord(row, idx, sheetName);
          if (rec) records.push(rec);
        } catch (e) {
          warnings.push(`「${sheetName}」第 ${i + 1} 列匯入失敗: ${e.message}`);
        }
      }
    }
    return { records, warnings };
  }

  function exportCases(records) {
    const data = records.map((r, i) => ({
      序: i + 1,
      日期: r.date,
      病歷號: r.chartNo,
      年紀: r.age,
      性別: r.sex,
      姓名: r.name,
      診斷: r.diagnosis,
      術式: r.procedure,
      麻醉方式: r.la,
      執行醫師: r.surgeon,
      E: r.emergency,
      原分類碼: r.categoryCode,
      統計分類: window.NSClassify.labelOf(r.categoryId),
      分類ID: r.categoryId,
      信心: r.confidence,
      分類依據: r.classifyReason,
      標記: r.tag,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "病例明細");
    XLSX.writeFile(wb, `NS手術病例匯出_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportStats(year, records) {
    const { months, table } = window.NSStats.buildCategoryCounts(records, year);
    const surg = window.NSStats.surgeryTotals(records, year);
    const pats = window.NSStats.patientTotals(records, year);
    const monthLabels = months.map((m) => `${Number(m.slice(5))}月`);

    const aoa = [[`${year}年 神經外科手術病例統計`, ...monthLabels, "年度總計"]];
    let lastMajor = null;
    for (const row of window.NSTaxonomy.displayRows()) {
      const counts = table[row.id];
      const majorCell = row.major !== lastMajor ? row.major : "";
      lastMajor = row.major;
      const label = row.label === "—" ? "" : row.label;
      aoa.push([
        majorCell || null,
        label || (row.label === "—" ? row.major : label),
        ...months.map((m) => counts[m] || null),
        counts.year || null,
      ]);
    }
    aoa.push(["手術總數", null, ...months.map((m) => surg.byMonth[m] || null), surg.year]);
    aoa.push(["手術病人數", null, ...months.map((m) => pats.byMonth[m] || null), pats.year]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "統計總表");

    const multi = window.NSStats.multiSurgerySameMonth(records, year);
    const multiRows = multi.flatMap((g) =>
      g.records.map((r, i) => ({
        月份: g.month,
        病歷號: g.chartNo,
        姓名: g.name,
        同月次數: g.count,
        序: i + 1,
        日期: r.date,
        診斷: r.diagnosis,
        術式: r.procedure,
        醫師: r.surgeon,
        統計分類: window.NSClassify.labelOf(r.categoryId),
      }))
    );
    const ws2 = XLSX.utils.json_to_sheet(multiRows.length ? multiRows : [{ 說明: "本年度無同月多次手術" }]);
    XLSX.utils.book_append_sheet(wb, ws2, "同月多次手術");

    XLSX.writeFile(wb, `NS手術統計_${year}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return { parseFile, exportCases, exportStats, excelDateToISO };
})();
