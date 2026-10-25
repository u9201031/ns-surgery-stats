(() => {
  const STORAGE_KEY = "ns-surgery-records-v1";

  const state = {
    records: load(),
    view: "entry",
    year: new Date().getFullYear(),
    filterMonth: "",
    search: "",
    editingId: null,
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
  }

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 2800);
  }

  function uid() {
    return crypto.randomUUID();
  }

  function fillCategorySelect(selectEl, selected) {
    const opts = window.NSTaxonomy.selectableOptions();
    const groups = new Map();
    for (const o of opts) {
      if (!groups.has(o.major)) groups.set(o.major, []);
      groups.get(o.major).push(o);
    }
    selectEl.innerHTML = "";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "（依診斷／術式自動判定）";
    selectEl.appendChild(empty);
    for (const [major, list] of groups) {
      const og = document.createElement("optgroup");
      og.label = major;
      for (const o of list) {
        const opt = document.createElement("option");
        opt.value = o.id;
        opt.textContent = o.label === "—" ? major : o.label;
        if (o.tone === "red") opt.textContent += " ★";
        if (selected && selected === o.id) opt.selected = true;
        og.appendChild(opt);
      }
      selectEl.appendChild(og);
    }
  }

  function readForm() {
    return {
      date: $("#f-date").value,
      chartNo: $("#f-chart").value.trim(),
      name: $("#f-name").value.trim(),
      diagnosis: $("#f-dx").value.trim(),
      procedure: $("#f-op").value.trim(),
      surgeon: $("#f-surgeon").value.trim(),
      age: $("#f-age").value.trim(),
      sex: $("#f-sex").value,
      emergency: $("#f-e").value.trim(),
      la: $("#f-la").checked ? "LA" : "",
      tag: $("#f-tag").value.trim(),
      note: $("#f-note").value.trim(),
      categoryOverride: $("#f-category").value,
    };
  }

  function clearForm() {
    state.editingId = null;
    $("#form-title").textContent = "登錄手術病例";
    $("#btn-save").textContent = "新增並自動分類";
    $("#btn-cancel-edit").hidden = true;
    ["f-date", "f-chart", "f-name", "f-dx", "f-op", "f-surgeon", "f-age", "f-e", "f-tag", "f-note"].forEach((id) => {
      $(`#${id}`).value = "";
    });
    $("#f-sex").value = "";
    $("#f-la").checked = false;
    $("#f-category").value = "";
    $("#auto-hint").textContent = "";
    updateAutoHint();
  }

  function populateForm(rec) {
    state.editingId = rec.id;
    $("#form-title").textContent = "編輯手術病例";
    $("#btn-save").textContent = "儲存修改";
    $("#btn-cancel-edit").hidden = false;
    $("#f-date").value = rec.date || "";
    $("#f-chart").value = rec.chartNo || "";
    $("#f-name").value = rec.name || "";
    $("#f-dx").value = rec.diagnosis || "";
    $("#f-op").value = rec.procedure || "";
    $("#f-surgeon").value = rec.surgeon || "";
    $("#f-age").value = rec.age || "";
    $("#f-sex").value = rec.sex || "";
    $("#f-e").value = rec.emergency || "";
    $("#f-la").checked = String(rec.la || "").toUpperCase() === "LA";
    $("#f-tag").value = rec.tag || "";
    $("#f-note").value = rec.note || "";
    fillCategorySelect($("#f-category"), rec.manualCategory ? rec.categoryId : "");
    updateAutoHint();
  }

  function updateAutoHint() {
    const form = readForm();
    const existing = state.editingId
      ? state.records.find((r) => r.id === state.editingId)
      : null;
    const draft = {
      diagnosis: form.diagnosis,
      procedure: form.procedure,
      categoryCode: existing?.categoryCode || "",
      tag: form.tag,
    };
    const result = window.NSClassify.classify(draft);
    const override = form.categoryOverride;
    const finalId = override || result.categoryId;
    const label = window.NSClassify.labelOf(finalId);
    $("#auto-hint").innerHTML = override
      ? `手動指定：<strong>${label}</strong>`
      : `自動分類：<strong>${label}</strong>（${result.reason}，信心 ${result.confidence}）`;
  }

  function upsertRecord(e) {
    e.preventDefault();
    const form = readForm();
    if (!form.date || !form.chartNo) {
      toast("請填寫開刀日期與病歷號");
      return;
    }
    if (!form.diagnosis && !form.procedure) {
      toast("請至少填寫診斷或手術方式");
      return;
    }

    const existing = state.editingId
      ? state.records.find((r) => r.id === state.editingId)
      : null;
    const base = {
      date: form.date,
      chartNo: form.chartNo,
      name: form.name,
      diagnosis: form.diagnosis,
      procedure: form.procedure,
      surgeon: form.surgeon,
      age: form.age,
      sex: form.sex,
      categoryCode: existing?.categoryCode || "",
      emergency: form.emergency,
      la: form.la,
      tag: form.tag,
      note: form.note,
    };

    let categoryId;
    let confidence;
    let classifyReason;
    let manualCategory = false;

    if (form.categoryOverride) {
      categoryId = form.categoryOverride;
      confidence = "high";
      classifyReason = "手動指定";
      manualCategory = true;
    } else {
      const result = window.NSClassify.classify(base);
      categoryId = result.categoryId;
      confidence = result.confidence;
      classifyReason = result.reason;
    }

    if (state.editingId) {
      const i = state.records.findIndex((r) => r.id === state.editingId);
      if (i >= 0) {
        state.records[i] = {
          ...state.records[i],
          ...base,
          categoryId,
          confidence,
          classifyReason,
          manualCategory,
        };
      }
      toast("已更新病例");
    } else {
      state.records.push({
        id: uid(),
        ...base,
        categoryId,
        confidence,
        classifyReason,
        manualCategory,
        sourceSheet: "手動登錄",
      });
      toast("已新增並完成分類");
    }
    save();
    clearForm();
    renderAll();
  }

  function deleteRecord(id) {
    if (!confirm("確定刪除此筆病例？")) return;
    state.records = state.records.filter((r) => r.id !== id);
    save();
    renderAll();
    toast("已刪除");
  }

  function reclassifyAll() {
    let changed = 0;
    state.records = state.records.map((r) => {
      if (r.manualCategory) return r;
      const result = window.NSClassify.classify(r);
      if (result.categoryId !== r.categoryId || result.confidence !== r.confidence) changed += 1;
      return { ...r, categoryId: result.categoryId, confidence: result.confidence, classifyReason: result.reason };
    });
    save();
    renderAll();
    toast(`已重新自動分類（異動 ${changed} 筆）`);
  }

  function filteredRecords() {
    let list = state.records.slice();
    if (state.year) {
      list = window.NSStats.filterByYear(list, state.year);
    }
    if (state.filterMonth) {
      list = list.filter((r) => window.NSStats.ymKey(r.date) === state.filterMonth);
    }
    if (state.search) {
      const q = state.search.toLowerCase();
      list = list.filter((r) =>
        [r.chartNo, r.name, r.diagnosis, r.procedure, r.surgeon, r.categoryCode, window.NSClassify.labelOf(r.categoryId)]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    list.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.chartNo).localeCompare(String(b.chartNo)));
    return list;
  }

  function availableYears() {
    const set = new Set(state.records.map((r) => (r.date || "").slice(0, 4)).filter((y) => /^\d{4}$/.test(y)));
    set.add(String(new Date().getFullYear()));
    return [...set].map(Number).sort((a, b) => b - a);
  }

  function syncYearControls() {
    const years = availableYears();
    $$(".year-select").forEach((sel) => {
      const cur = String(state.year);
      sel.innerHTML = years.map((y) => `<option value="${y}">${y}年</option>`).join("");
      if (!years.includes(state.year)) state.year = years[0];
      sel.value = String(state.year);
    });
    const monthSel = $("#filter-month");
    if (monthSel) {
      const months = window.NSStats.monthKeysForYear(state.year);
      monthSel.innerHTML =
        `<option value="">全年</option>` +
        months.map((m) => `<option value="${m}">${Number(m.slice(5))}月</option>`).join("");
      monthSel.value = state.filterMonth;
    }
  }

  function renderKpis() {
    const yearRecs = window.NSStats.filterByYear(state.records, state.year);
    const surg = window.NSStats.surgeryTotals(state.records, state.year);
    const pats = window.NSStats.patientTotals(state.records, state.year);
    const multi = window.NSStats.multiSurgerySameMonth(state.records, state.year);
    const low = yearRecs.filter((r) => r.confidence === "low").length;
    $("#kpi-ops").textContent = surg.year;
    $("#kpi-patients").textContent = pats.year;
    $("#kpi-multi").textContent = multi.length;
    $("#kpi-review").textContent = low;
  }

  function renderList() {
    const list = filteredRecords();
    $("#list-count").textContent = `${list.length} 筆`;
    const tbody = $("#case-tbody");
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="muted">尚無資料。請登錄或匯入 Excel。</td></tr>`;
      return;
    }
    tbody.innerHTML = list
      .map((r) => {
        const conf = r.confidence || "low";
        return `<tr>
          <td class="mono">${r.date || ""}</td>
          <td class="mono">${escapeHtml(r.chartNo)}</td>
          <td>${escapeHtml(r.name || "—")}</td>
          <td>${escapeHtml(truncate(r.diagnosis, 60))}</td>
          <td>${escapeHtml(truncate(r.procedure, 60))}</td>
          <td>${escapeHtml(r.surgeon || "—")}</td>
          <td>
            <div>${escapeHtml(window.NSClassify.labelOf(r.categoryId))}</div>
            <span class="badge ${conf}">${conf}${r.manualCategory ? " · 手動" : ""}</span>
          </td>
          <td class="row-actions">
            <button class="btn" data-edit="${r.id}">編輯</button>
            <button class="btn danger" data-del="${r.id}">刪</button>
          </td>
        </tr>`;
      })
      .join("");
  }

  function renderStats() {
    const { months, table } = window.NSStats.buildCategoryCounts(state.records, state.year);
    const surg = window.NSStats.surgeryTotals(state.records, state.year);
    const pats = window.NSStats.patientTotals(state.records, state.year);

    const head = `<tr>
      <th>項目</th><th>細項</th>
      ${months.map((m) => `<th>${Number(m.slice(5))}月</th>`).join("")}
      <th>年度</th>
    </tr>`;

    let lastMajor = null;
    const body = window.NSTaxonomy.displayRows()
      .map((row) => {
        const counts = table[row.id];
        const showMajor = row.major !== lastMajor;
        lastMajor = row.major;
        const cls = [
          row.header ? "header-row" : "",
          row.tone === "red" ? "tone-red" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const label = row.label === "—" ? "" : row.label;
        const cells = months
          .map((m) => {
            const n = counts[m] || 0;
            return `<td class="num ${n ? "" : "zero"}">${n || ""}</td>`;
          })
          .join("");
        return `<tr class="${cls}">
          <td class="major">${showMajor ? escapeHtml(row.major) : ""}</td>
          <td class="label">${escapeHtml(label)}</td>
          ${cells}
          <td class="num">${counts.year || ""}</td>
        </tr>`;
      })
      .join("");

    const totalOps = `<tr class="total-row">
      <td class="major" colspan="2">手術總數</td>
      ${months.map((m) => `<td class="num">${surg.byMonth[m] || ""}</td>`).join("")}
      <td class="num">${surg.year}</td>
    </tr>`;
    const totalPats = `<tr class="total-row">
      <td class="major" colspan="2">手術病人數</td>
      ${months.map((m) => `<td class="num">${pats.byMonth[m] || ""}</td>`).join("")}
      <td class="num">${pats.year}</td>
    </tr>`;

    $("#stats-table").innerHTML = `<thead>${head}</thead><tbody>${body}${totalOps}${totalPats}</tbody>`;
  }

  function renderMulti() {
    const multi = window.NSStats.multiSurgerySameMonth(state.records, state.year);
    $("#multi-count").textContent = `${multi.length} 位病人`;
    const wrap = $("#multi-list");
    if (!multi.length) {
      wrap.innerHTML = `<p class="muted">本年度沒有同月開兩次以上手術的病人。</p>`;
      return;
    }
    wrap.innerHTML = multi
      .map((g) => {
        const rows = g.records
          .map(
            (r) => `<tr>
              <td class="mono">${r.date}</td>
              <td>${escapeHtml(truncate(r.diagnosis, 50))}</td>
              <td>${escapeHtml(truncate(r.procedure, 50))}</td>
              <td>${escapeHtml(r.surgeon || "")}</td>
              <td>${escapeHtml(window.NSClassify.labelOf(r.categoryId))}</td>
            </tr>`
          )
          .join("");
        return `<div class="panel" style="box-shadow:none;margin:0 0 10px">
          <div class="toolbar" style="margin:0 0 8px">
            <strong>${g.month}</strong>
            <span class="mono">${escapeHtml(g.chartNo)}</span>
            <span>${escapeHtml(g.name || "")}</span>
            <span class="badge red">${g.count} 次手術</span>
          </div>
          <div class="table-wrap" style="max-height:none">
            <table class="data"><thead><tr><th>日期</th><th>診斷</th><th>術式</th><th>醫師</th><th>分類</th></tr></thead><tbody>${rows}</tbody></table>
          </div>
        </div>`;
      })
      .join("");
  }

  function renderReview() {
    const yearRecs = window.NSStats.filterByYear(state.records, state.year);
    const list = yearRecs.filter((r) => r.confidence === "low" || (r.categoryId === "others" && !r.manualCategory));
    $("#review-count").textContent = `${list.length} 筆待確認`;
    const tbody = $("#review-tbody");
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="muted">沒有低信心或 Others 待確認病例。</td></tr>`;
      return;
    }
    tbody.innerHTML = list
      .map(
        (r) => `<tr>
          <td class="mono">${r.date}</td>
          <td class="mono">${escapeHtml(r.chartNo)}</td>
          <td>${escapeHtml(truncate(r.diagnosis, 40))}</td>
          <td>${escapeHtml(truncate(r.procedure, 40))}</td>
          <td>${escapeHtml(r.classifyReason || "")} → ${escapeHtml(window.NSClassify.labelOf(r.categoryId))}</td>
          <td><button class="btn" data-edit="${r.id}">修正分類</button></td>
        </tr>`
      )
      .join("");
  }

  function renderAll() {
    syncYearControls();
    renderKpis();
    renderList();
    renderStats();
    renderMulti();
    renderReview();
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function truncate(s, n) {
    const t = String(s || "");
    return t.length > n ? t.slice(0, n) + "…" : t;
  }

  function setView(name) {
    state.view = name;
    $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === name));
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
  }

  async function handleImport(file) {
    if (!file) return;
    try {
      const { records, warnings } = await window.NSExcel.parseFile(file);
      if (!records.length) {
        toast(warnings[0] || "沒有可匯入的資料");
        return;
      }
      const choice = prompt(
        `讀到 ${records.length} 筆病例。\n請輸入：\n1 = 合併加入現有資料\n2 = 清空後只保留本次匯入\n（取消則不匯入）`,
        "1"
      );
      if (choice == null) return;
      const mode = String(choice).trim();
      if (mode === "2") {
        if (!confirm("將清除現有資料並只保留本次匯入，確定？")) return;
        state.records = records;
        save();
        const years = records.map((r) => Number((r.date || "").slice(0, 4))).filter(Boolean);
        if (years.length) {
          const freq = {};
          years.forEach((y) => (freq[y] = (freq[y] || 0) + 1));
          state.year = Number(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]);
        }
        renderAll();
        toast(`已匯入 ${records.length} 筆`);
      } else if (mode === "1") {
        const key = (r) => `${r.date}|${r.chartNo}|${r.procedure}`;
        const existing = new Set(state.records.map(key));
        let added = 0;
        for (const r of records) {
          if (!existing.has(key(r))) {
            state.records.push(r);
            existing.add(key(r));
            added += 1;
          }
        }
        save();
        renderAll();
        toast(`合併完成：新增 ${added} 筆${warnings.length ? `（${warnings.length} 則警告）` : ""}`);
      } else {
        toast("已取消匯入");
      }
    } catch (err) {
      console.error(err);
      toast("匯入失敗：" + err.message);
    }
  }

  function bind() {
    fillCategorySelect($("#f-category"));

    $$(".tab").forEach((t) => t.addEventListener("click", () => setView(t.dataset.view)));

    $("#case-form").addEventListener("submit", upsertRecord);
    $("#btn-cancel-edit").addEventListener("click", clearForm);
    ["f-dx", "f-op", "f-tag", "f-category"].forEach((id) => {
      $(`#${id}`).addEventListener("input", updateAutoHint);
      $(`#${id}`).addEventListener("change", updateAutoHint);
    });

    $$(".year-select").forEach((sel) =>
      sel.addEventListener("change", () => {
        state.year = Number(sel.value);
        state.filterMonth = "";
        renderAll();
      })
    );

    $("#filter-month")?.addEventListener("change", (e) => {
      state.filterMonth = e.target.value;
      renderList();
    });

    $("#search")?.addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      renderList();
    });

    $("#import-file").addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      handleImport(file);
      e.target.value = "";
    });

    $("#btn-export-cases").addEventListener("click", () => window.NSExcel.exportCases(state.records));
    $("#btn-export-stats").addEventListener("click", () => window.NSExcel.exportStats(state.year, state.records));
    $("#btn-reclassify").addEventListener("click", reclassifyAll);
    $("#btn-print").addEventListener("click", () => {
      setView("stats");
      setTimeout(() => window.print(), 100);
    });
    $("#btn-clear").addEventListener("click", () => {
      if (!confirm("確定清除所有本機病例資料？此動作無法復原。")) return;
      state.records = [];
      save();
      renderAll();
      toast("已清空");
    });

    document.body.addEventListener("click", (e) => {
      const editId = e.target.closest("[data-edit]")?.dataset?.edit;
      const delId = e.target.closest("[data-del]")?.dataset?.del;
      if (editId) {
        const rec = state.records.find((r) => r.id === editId);
        if (rec) {
          populateForm(rec);
          setView("entry");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
      if (delId) deleteRecord(delId);
    });
  }

  bind();
  clearForm();
  renderAll();
  setView("entry");
})();
