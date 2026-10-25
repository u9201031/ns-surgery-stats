/**
 * 統計彙整：手術總數、病人數、同月多次手術
 */
window.NSStats = (() => {
  function ymKey(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  function monthKeysForYear(year) {
    return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  }

  function filterByYear(records, year) {
    return records.filter((r) => {
      const k = ymKey(r.date);
      return k && k.startsWith(`${year}-`);
    });
  }

  /** 每個統計列 × 各月的手術次數 */
  function buildCategoryCounts(records, year) {
    const months = monthKeysForYear(year);
    const leafIds = window.NSTaxonomy.displayRows()
      .filter((r) => !r.header)
      .map((r) => r.id);

    const counts = {};
    for (const id of leafIds) {
      counts[id] = Object.fromEntries(months.map((m) => [m, 0]));
      counts[id].year = 0;
    }

    const yearRecs = filterByYear(records, year);
    for (const r of yearRecs) {
      const m = ymKey(r.date);
      const id = r.categoryId || "others";
      if (!counts[id]) {
        counts[id] = Object.fromEntries(months.map((mm) => [mm, 0]));
        counts[id].year = 0;
      }
      counts[id][m] = (counts[id][m] || 0) + 1;
      counts[id].year += 1;
    }

    // header 加總
    const byId = window.NSTaxonomy.byId;
    function sumOf(id) {
      const row = byId[id];
      if (!row) return Object.fromEntries(months.map((m) => [m, 0]).concat([["year", 0]]));
      if (!row.header) return counts[id] || Object.fromEntries(months.map((m) => [m, 0]).concat([["year", 0]]));
      const out = Object.fromEntries(months.map((m) => [m, 0]));
      out.year = 0;
      for (const child of row.sumOf || []) {
        const c = sumOf(child);
        for (const m of months) out[m] += c[m] || 0;
        out.year += c.year || 0;
      }
      return out;
    }

    const table = {};
    for (const row of window.NSTaxonomy.displayRows()) {
      table[row.id] = sumOf(row.id);
    }
    return { months, table, yearRecs };
  }

  function surgeryTotals(records, year) {
    const months = monthKeysForYear(year);
    const yearRecs = filterByYear(records, year);
    const byMonth = Object.fromEntries(months.map((m) => [m, 0]));
    for (const r of yearRecs) {
      const m = ymKey(r.date);
      if (m) byMonth[m] += 1;
    }
    return { months, byMonth, year: yearRecs.length };
  }

  function patientTotals(records, year) {
    const months = monthKeysForYear(year);
    const yearRecs = filterByYear(records, year);
    const monthSets = Object.fromEntries(months.map((m) => [m, new Set()]));
    const yearSet = new Set();
    for (const r of yearRecs) {
      const chart = String(r.chartNo || "").trim();
      if (!chart) continue;
      const m = ymKey(r.date);
      yearSet.add(chart);
      if (m && monthSets[m]) monthSets[m].add(chart);
    }
    const byMonth = Object.fromEntries(months.map((m) => [m, monthSets[m].size]));
    return { months, byMonth, year: yearSet.size };
  }

  /** 同月開刀 ≥2 次的病人 */
  function multiSurgerySameMonth(records, year) {
    const yearRecs = year ? filterByYear(records, year) : records.slice();
    const groups = new Map();
    for (const r of yearRecs) {
      const chart = String(r.chartNo || "").trim();
      const m = ymKey(r.date);
      if (!chart || !m) continue;
      const key = `${chart}||${m}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
    const result = [];
    for (const [key, list] of groups) {
      if (list.length < 2) continue;
      const [chart, month] = key.split("||");
      list.sort((a, b) => String(a.date).localeCompare(String(b.date)));
      result.push({
        chartNo: chart,
        month,
        count: list.length,
        name: list[0].name || "",
        records: list,
      });
    }
    result.sort((a, b) => b.month.localeCompare(a.month) || b.count - a.count || a.chartNo.localeCompare(b.chartNo));
    return result;
  }

  /** 未分類 / 低信心（方便人工校對） */
  function needsReview(records, year) {
    const yearRecs = year ? filterByYear(records, year) : records;
    return yearRecs.filter((r) => r.confidence === "low" || !r.categoryId || r.categoryId === "others" && r.confidence !== "high");
  }

  return {
    ymKey,
    monthKeysForYear,
    filterByYear,
    buildCategoryCounts,
    surgeryTotals,
    patientTotals,
    multiSurgerySameMonth,
    needsReview,
  };
})();
