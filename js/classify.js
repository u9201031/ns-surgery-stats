/**
 * 依「分類碼 / 診斷 / 術式」自動對應統計項目
 */
window.NSClassify = (() => {
  const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

  /** 既有總表「分類」欄 → 統計 id（可再由診斷細分） */
  const CODE_MAP = {
    li: "spine.inst.lumbar",
    ld: "spine.hivd.lumbar",
    ls: "spine.stenosis.lumbar",
    cd: "spine.hivd.cervical",
    cs: "spine.stenosis.cervical",
    ci: "spine.inst.lowCervical",
    ti: "spine.others",
    ts: "spine.stenosis.lumbar",
    td: "spine.hivd.lumbar",
    "spine tumor": "spine.tumor.benign",
    "spine others": "spine.others",
    "cspine others": "spine.others",
    "lspine others": "spine.others",
    "spine rf": "spine.others",
    tumor: "brain.others",
    aneurysm: "vascular.aneurysm",
    avm: "vascular.avm",
    avf: "vascular.davf",
    endarterectomy: "vascular.endarterectomy",
    ich: "cva.ich",
    dc: "cva.dc",
    edh: "head.edh",
    asdh: "head.asdh",
    csdh: "head.csdh",
    tich: "head.tich",
    "t ich": "head.tich",
    cranioplasty: "cranioplasty",
    crainoplasty: "cranioplasty",
    "vp shunt": "vpshunt",
    prtr: "func.prtr",
    mvd: "func.mvd",
    cts: "peripheral.cts",
    pns: "peripheral.pns",
    ia: "endo.thrombectomy",
    "aneurysym (coiling)": "endo.aneurysm",
    "aneurysm (coiling)": "endo.aneurysm",
    "aneurysm(coil)": "endo.aneurysm",
    coiling: "endo.aneurysm",
    tae: "endo.transarterial",
    "transarterial, other": "endo.transarterial",
    stent: "endo.carotid",
    "cc fistula": "endo.davf",
    abscess: "infection.excision",
    "brain empyema": "infection.drainage",
    nb: "others",
    picc: "others",
    evd: "others",
    icp: "others",
    others: "others",
    "高位頸椎": "spine.inst.highCervical",
  };

  function has(text, ...keys) {
    const t = norm(text);
    return keys.some((k) => t.includes(norm(k)));
  }

  function refineBrainTumor(dx, op) {
    const t = `${dx} ${op}`;
    if (has(t, "metastas", "metastasis", "brain meta", "lung cancer", "adenocarcinoma")) return "brain.metastasis";
    if (has(t, "meningioma", "menigioma", "memingioma")) return "brain.meningioma";
    if (has(t, "pituitary", "pituitary adenoma", "cushing", "acromegaly")) return "brain.pituitary";
    if (has(t, "acoustic", "vestibular schwannoma", "cp angle schwannoma")) return "brain.acoustic";
    if (has(t, "glioblastoma", "gbm", "high grade glioma", "anaplastic", "grade iv", "grade 4", "grade iii", "grade 3")) return "brain.glioma.high";
    if (has(t, "low grade", "grade ii", "grade 2", "astrocytoma", "oligodendroglioma", "glioma")) {
      if (has(t, "glioblastoma", "gbm", "high grade", "anaplastic")) return "brain.glioma.high";
      if (has(t, "low grade", "grade ii", "grade 2")) return "brain.glioma.low";
      if (has(t, "glioma", "astrocytoma", "oligodendro")) return "brain.glioma.high";
    }
    return "brain.others";
  }

  function refineSpineTumor(dx, op) {
    const t = `${dx} ${op}`;
    if (has(t, "metastas", "malignant", "cancer", "carcinoma", "sarcoma", "lymphoma")) return "spine.tumor.malignant";
    if (has(t, "schwannoma", "meningioma", "neurofibroma", "ependymoma", "hemangioma", "benign")) return "spine.tumor.benign";
    return "spine.tumor.benign";
  }

  function refineSRS(dx, op) {
    const t = `${dx} ${op}`;
    if (has(t, "avm")) return "srs.vas.avm";
    if (has(t, "cavernoma", "cavernous")) return "srs.vas.cavernoma";
    if (has(t, "dural avf", "davf", "avf")) return "srs.vas.davf";
    if (has(t, "metastas")) return "srs.tum.mal.met";
    if (has(t, "meningioma", "menigioma")) return "srs.tum.ben.meningioma";
    if (has(t, "acoustic", "schwannoma", "cp angle")) return "srs.tum.ben.schwannoma";
    if (has(t, "pituitary")) return "srs.tum.ben.pituitary";
    if (has(t, "trigeminal", "neuralgia", "tn")) return "srs.tum.ben.tn";
    return "srs.tum.ben.meningioma";
  }

  function fromKeywords(dx, op, tags) {
    const t = `${dx} ${op} ${tags}`;

    if (has(t, "srs", "gamma knife", "radiosurgery", "cyberknife")) return refineSRS(dx, op);

    if (has(t, "thrombectomy", "mechanical thrombectomy", "mtici")) return "endo.thrombectomy";
    if (has(t, "coil embolization", "coiling") && has(t, "aneurysm")) return "endo.aneurysm";
    if (has(t, "carotid stent", "carotid angioplasty", "cas ")) return "endo.carotid";
    if (has(t, "transvenous")) return "endo.transvenous";
    if (has(t, "transarterial", "t.a.e", "tae")) return "endo.transarterial";
    if (has(t, "cc fistula", "ccf") && has(t, "coil", "embol")) return "endo.davf";

    if (has(t, "clipping") && has(t, "aneurysm")) return "vascular.aneurysm";
    if (has(t, "endarterectomy")) return "vascular.endarterectomy";
    if (has(t, "ec-ic", "ecic", "bypass") && has(t, "bypass")) return "vascular.ecic";
    if (has(t, "cavernoma") && has(t, "excision", "removal", "resection")) return "vascular.cavernoma";
    if (has(t, "dural avf", "davf") && !has(t, "coil", "embol", "endo")) return "vascular.davf";
    if (has(t, "avm") && has(t, "excision", "resection", "removal") && !has(t, "srs")) return "vascular.avm";

    if (has(t, "decompressive craniectomy", "decompression for infarction", "malignant mca", "infarction") && has(t, "decompress", "craniectomy", "dc")) return "cva.dc";
    if (has(t, "spontaneous") && has(t, "ich", "intracerebral hematoma", "putaminal", "basal ganglia ich")) return "cva.ich";
    if (has(t, "nontraumatic") && has(t, "ich")) return "cva.ich";
    if (has(t, "ich", "intracerebral hematoma", "putaminal") && !has(t, "traumatic", "trauma", "SDH", "EDH")) {
      if (!has(t, "traumatic")) return "cva.ich";
    }

    if (has(t, "epidural hematoma", " edh") || /\bedh\b/i.test(t)) return "head.edh";
    if (has(t, "chronic subdural", "csdh", "chronic sdh")) return "head.csdh";
    if (has(t, "acute sdh", "asdh", "acute subdural")) return "head.asdh";
    if (has(t, "traumatic ich", "tich") || (has(t, "traumatic") && has(t, "ich"))) return "head.tich";

    if (has(t, "cranioplasty")) return "cranioplasty";
    if (has(t, "vp shunt", "v-p shunt", "vps ", "ventriculoperitoneal")) return "vpshunt";

    if (has(t, "empyema", "abscess")) {
      if (has(t, "aspiration")) return "infection.aspiration";
      if (has(t, "drainage", "burr hole")) return "infection.drainage";
      return "infection.excision";
    }

    if (has(t, "hyperhidrosis", "sympathectomy", "oversweating")) return "func.hyperhidrosis";
    if (has(t, "percutaneous") && has(t, "trigeminal", "rhizotomy", "prtr", "radiofrequency")) return "func.prtr";
    if (has(t, "dbs", "deep brain stimulation")) return "func.dbs";
    if (has(t, "scs", "spinal cord stimulat")) return "func.scs";
    if (has(t, "it pump", "intrathecal pump", "baclofen pump")) return "func.itpump";
    if (has(t, "stimulator") && has(t, "置入", "更換", "replacement", "implantation", "change")) return "func.stimulator";
    if (has(t, "mvd", "microvascular decompression")) return "func.mvd";
    if (has(t, "lesioning") && has(t, "deep", "pallido", "thalamo")) return "func.lesioning";

    if (has(t, "carpal tunnel", "median nerve decompression", "cts")) return "peripheral.cts";
    if (has(t, "peripheral nerve", "pns", "neurolysis") && !has(t, "carpal")) return "peripheral.pns";

    if (has(t, "epilepsy", "seizure surgery", "temporal lobectomy", "callosotomy")) return "epilepsy";

    if (has(t, "spine tumor", "spinal tumor", "intradural", "extradural tumor", "vertebral metastasis")) return refineSpineTumor(dx, op);
    if (has(t, "brain tumor", "craniotomy for tumor", "tumor removal", "meningioma", "glioma", "pituitary", "metastasis", "cp angle tumor")) {
      return refineBrainTumor(dx, op);
    }

    if (has(t, "microdiskectomy", "microdiscectomy", "discectomy", "diskectomy", "hivd")) {
      if (has(t, "cervical", "c3", "c4", "c5", "c6", "c7", "acdf")) return "spine.hivd.cervical";
      return "spine.hivd.lumbar";
    }
    if (has(t, "stenosis") && has(t, "laminectomy") && !has(t, "tps", "fixation", "fusion", "tlif", "plif")) {
      if (has(t, "cervical", "c1", "c2", "c3", "c4", "c5", "c6")) return "spine.stenosis.cervical";
      return "spine.stenosis.lumbar";
    }
    if (has(t, "tps", "tlif", "plif", "fixation", "instrumentation", "pedicle")) {
      if (has(t, "c1", "c2", "occipito", "高位")) return "spine.inst.highCervical";
      if (has(t, "cervical", "acdf", "c3", "c4", "c5", "c6", "c7")) return "spine.inst.lowCervical";
      if (has(t, "ict", "navigation", "o-arm", "image guided")) return "spine.inst.imageGuided";
      return "spine.inst.lumbar";
    }

    return null;
  }

  /**
   * @returns {{ categoryId: string, confidence: 'high'|'medium'|'low', reason: string }}
   */
  function classify(record) {
    const code = norm(record.categoryCode);
    const dx = record.diagnosis || "";
    const op = record.procedure || "";
    const tags = [record.tag, record.stv].filter(Boolean).join(" ");
    const isSRS = has(op, "srs") || has(dx, "srs") || code === "srs";

    if (isSRS) {
      return { categoryId: refineSRS(dx, op), confidence: "high", reason: "SRS" };
    }

    if (code && CODE_MAP[code]) {
      let id = CODE_MAP[code];
      let reason = `分類碼 ${record.categoryCode}`;

      if (code === "tumor") {
        id = refineBrainTumor(dx, op);
        reason += " + 診斷細分";
      } else if (code === "spine tumor") {
        id = refineSpineTumor(dx, op);
        reason += " + 診斷細分";
      } else if (code === "ci") {
        if (has(tags, "高位頸椎") || has(dx + op, "c1", "c2", "occipito", "jefferson", "dens")) {
          id = "spine.inst.highCervical";
          reason += " → High Cervical";
        } else if (has(op, "ict", "navigation", "image")) {
          // keep low cervical but note image-guided as secondary preference only if clearly tagged
          id = "spine.inst.lowCervical";
        }
      } else if (code === "li" && has(op, "ict", "navigation") && has(tags, "image")) {
        id = "spine.inst.imageGuided";
      }

      return { categoryId: id, confidence: "high", reason };
    }

    const kw = fromKeywords(dx, op, tags);
    if (kw) {
      return { categoryId: kw, confidence: "medium", reason: "診斷/術式關鍵字" };
    }

    return { categoryId: "others", confidence: "low", reason: "無法自動分類 → Others" };
  }

  function labelOf(categoryId) {
    const row = window.NSTaxonomy.byId[categoryId];
    if (!row) return categoryId || "未分類";
    return row.label === "—" ? row.major : `${row.major} › ${row.label}`;
  }

  return { classify, labelOf, CODE_MAP };
})();
