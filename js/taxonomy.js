/**
 * NS 手術統計分類樹（對應訓練醫院季統計表／圖檔結構）
 * id 用於統計計數；header=true 僅作群組列，不直接計數
 */
window.NSTaxonomy = (() => {
  const rows = [
    { id: "brain.glioma.high", major: "Brain Tumor", label: "High grade", indent: 2, parent: "brain.glioma" },
    { id: "brain.glioma.low", major: "Brain Tumor", label: "Low grade", indent: 2, parent: "brain.glioma" },
    { id: "brain.glioma", major: "Brain Tumor", label: "Glioma", indent: 1, header: true, sumOf: ["brain.glioma.high", "brain.glioma.low"], tone: "green" },
    { id: "brain.meningioma", major: "Brain Tumor", label: "Meningioma", indent: 1 },
    { id: "brain.pituitary", major: "Brain Tumor", label: "Pituitary tumor", indent: 1 },
    { id: "brain.acoustic", major: "Brain Tumor", label: "Acoustic neuroma", indent: 1 },
    { id: "brain.metastasis", major: "Brain Tumor", label: "Brain metastasis", indent: 1, tone: "red" },
    { id: "brain.others", major: "Brain Tumor", label: "Others", indent: 1 },

    { id: "vascular.aneurysm", major: "Vascular", label: "Aneurysm (Microsurgery)", indent: 1 },
    { id: "vascular.avm", major: "Vascular", label: "AVM (Excision)", indent: 1 },
    { id: "vascular.ecic", major: "Vascular", label: "EC-IC bypass", indent: 1 },
    { id: "vascular.endarterectomy", major: "Vascular", label: "Endarterectomy", indent: 1 },
    { id: "vascular.cavernoma", major: "Vascular", label: "Cavernoma (Excision)", indent: 1 },
    { id: "vascular.davf", major: "Vascular", label: "Dural AVF (Microsurgery)", indent: 1 },

    { id: "cva.ich", major: "CVA", label: "Spontaneous ICH", indent: 1 },
    { id: "cva.dc", major: "CVA", label: "Decompression for Infarction", indent: 1 },

    { id: "spine.tumor.malignant", major: "Spine", label: "(1) Malignant", indent: 2, parent: "spine.tumor" },
    { id: "spine.tumor.benign", major: "Spine", label: "(2) Benign", indent: 2, parent: "spine.tumor" },
    { id: "spine.tumor", major: "Spine", label: "Tumor", indent: 1, header: true, sumOf: ["spine.tumor.malignant", "spine.tumor.benign"], tone: "green" },
    { id: "spine.hivd.cervical", major: "Spine", label: "(1) Cervical", indent: 2, parent: "spine.hivd" },
    { id: "spine.hivd.lumbar", major: "Spine", label: "(2) Lumbar", indent: 2, parent: "spine.hivd" },
    { id: "spine.hivd", major: "Spine", label: "HIVD", indent: 1, header: true, sumOf: ["spine.hivd.cervical", "spine.hivd.lumbar"], tone: "green" },
    { id: "spine.stenosis.cervical", major: "Spine", label: "(1) Cervical", indent: 2, parent: "spine.stenosis" },
    { id: "spine.stenosis.lumbar", major: "Spine", label: "(2) Lumbar", indent: 2, parent: "spine.stenosis" },
    { id: "spine.stenosis", major: "Spine", label: "Stenosis", indent: 1, header: true, sumOf: ["spine.stenosis.cervical", "spine.stenosis.lumbar"], tone: "green" },
    { id: "spine.inst.highCervical", major: "Spine", label: "(1) High Cervical", indent: 2, parent: "spine.inst" },
    { id: "spine.inst.lowCervical", major: "Spine", label: "(2) Low Cervical", indent: 2, parent: "spine.inst" },
    { id: "spine.inst.lumbar", major: "Spine", label: "(3) Lumbar", indent: 2, parent: "spine.inst" },
    { id: "spine.inst.imageGuided", major: "Spine", label: "(4) Image guided", indent: 2, parent: "spine.inst" },
    { id: "spine.inst", major: "Spine", label: "Other Instrumentation", indent: 1, header: true, sumOf: ["spine.inst.highCervical", "spine.inst.lowCervical", "spine.inst.lumbar", "spine.inst.imageGuided"], tone: "green" },
    { id: "spine.others", major: "Spine", label: "Others", indent: 1 },

    { id: "head.edh", major: "Head injury", label: "EDH", indent: 1 },
    { id: "head.asdh", major: "Head injury", label: "Acute SDH", indent: 1 },
    { id: "head.csdh", major: "Head injury", label: "Chronic SDH", indent: 1 },
    { id: "head.tich", major: "Head injury", label: "Traumatic ICH", indent: 1 },

    { id: "cranioplasty", major: "Cranioplasty", label: "—", indent: 0 },

    { id: "infection.aspiration", major: "Infection (abscess, empyema)", label: "Aspiration", indent: 1 },
    { id: "infection.drainage", major: "Infection (abscess, empyema)", label: "Drainage", indent: 1 },
    { id: "infection.excision", major: "Infection (abscess, empyema)", label: "Excision", indent: 1 },

    { id: "vpshunt", major: "VP Shunt", label: "—", indent: 0 },

    { id: "func.lesioning", major: "Functional", label: "Lesioning (Deep)", indent: 1, tone: "red" },
    { id: "func.prtr", major: "Functional", label: "Percutaneous procedure (TN)", indent: 1, tone: "red" },
    { id: "func.dbs", major: "Functional", label: "DBS", indent: 1 },
    { id: "func.scs", major: "Functional", label: "SCS", indent: 1, tone: "red" },
    { id: "func.stimulator", major: "Functional", label: "刺激器置入/更換", indent: 1, tone: "red" },
    { id: "func.itpump", major: "Functional", label: "IT pump", indent: 1, tone: "red" },
    { id: "func.mvd", major: "Functional", label: "MVD", indent: 1 },
    { id: "func.hyperhidrosis", major: "Functional", label: "Hyperhidrosis", indent: 1 },

    { id: "peripheral.cts", major: "Peripheral nerves", label: "Carpal tunnel syndrome", indent: 1 },
    { id: "peripheral.pns", major: "Peripheral nerves", label: "PNS", indent: 1 },

    { id: "epilepsy", major: "Epilepsy surgery", label: "—", indent: 0 },

    { id: "endo.aneurysm", major: "Endovascular surgery", label: "Aneurysm (Coiling)", indent: 1 },
    { id: "endo.avm", major: "Endovascular surgery", label: "AVM", indent: 1 },
    { id: "endo.davf", major: "Endovascular surgery", label: "Dural AVF", indent: 1 },
    { id: "endo.carotid", major: "Endovascular surgery", label: "Carotid angioplasty / stent", indent: 1 },
    { id: "endo.thrombectomy", major: "Endovascular surgery", label: "Thrombectomy", indent: 1, tone: "red" },
    { id: "endo.transarterial", major: "Endovascular surgery", label: "Transarterial, other", indent: 1, tone: "red" },
    { id: "endo.transvenous", major: "Endovascular surgery", label: "Transvenous, other", indent: 1, tone: "red" },

    { id: "srs.vas.avm", major: "Stereotactic Radiosurgery (SRS)", label: "(1) AVM", indent: 2, parent: "srs.vascular" },
    { id: "srs.vas.cavernoma", major: "Stereotactic Radiosurgery (SRS)", label: "(2) Cavernoma", indent: 2, parent: "srs.vascular" },
    { id: "srs.vas.davf", major: "Stereotactic Radiosurgery (SRS)", label: "(3) Dural AVF", indent: 2, parent: "srs.vascular" },
    { id: "srs.vascular", major: "Stereotactic Radiosurgery (SRS)", label: "Vascular", indent: 1, header: true, sumOf: ["srs.vas.avm", "srs.vas.cavernoma", "srs.vas.davf"], tone: "green" },
    { id: "srs.tum.mal.met", major: "Stereotactic Radiosurgery (SRS)", label: "(a) Metastases", indent: 3, parent: "srs.tum.malignant" },
    { id: "srs.tum.mal.primary", major: "Stereotactic Radiosurgery (SRS)", label: "(b) Primary", indent: 3, parent: "srs.tum.malignant" },
    { id: "srs.tum.malignant", major: "Stereotactic Radiosurgery (SRS)", label: "(1) Malignant", indent: 2, header: true, sumOf: ["srs.tum.mal.met", "srs.tum.mal.primary"], tone: "green", parent: "srs.tumors" },
    { id: "srs.tum.ben.meningioma", major: "Stereotactic Radiosurgery (SRS)", label: "(a) Meningiomas", indent: 3, parent: "srs.tum.benign" },
    { id: "srs.tum.ben.schwannoma", major: "Stereotactic Radiosurgery (SRS)", label: "(b) Schwannomas", indent: 3, parent: "srs.tum.benign" },
    { id: "srs.tum.ben.pituitary", major: "Stereotactic Radiosurgery (SRS)", label: "(c) Pituitary", indent: 3, parent: "srs.tum.benign" },
    { id: "srs.tum.ben.tn", major: "Stereotactic Radiosurgery (SRS)", label: "(d) Trigeminal neuralgia", indent: 3, parent: "srs.tum.benign" },
    { id: "srs.tum.benign", major: "Stereotactic Radiosurgery (SRS)", label: "(2) Benign", indent: 2, header: true, sumOf: ["srs.tum.ben.meningioma", "srs.tum.ben.schwannoma", "srs.tum.ben.pituitary", "srs.tum.ben.tn"], tone: "green", parent: "srs.tumors" },
    { id: "srs.tumors", major: "Stereotactic Radiosurgery (SRS)", label: "Tumors", indent: 1, header: true, sumOf: ["srs.tum.malignant", "srs.tum.benign"], tone: "green" },

    { id: "others", major: "Others", label: "—", indent: 0 },
  ];

  /** 顯示順序（major 首次出現時顯示大類） */
  const displayOrder = [
    "brain.glioma", "brain.glioma.high", "brain.glioma.low",
    "brain.meningioma", "brain.pituitary", "brain.acoustic", "brain.metastasis", "brain.others",
    "vascular.aneurysm", "vascular.avm", "vascular.ecic", "vascular.endarterectomy", "vascular.cavernoma", "vascular.davf",
    "cva.ich", "cva.dc",
    "spine.tumor", "spine.tumor.malignant", "spine.tumor.benign",
    "spine.hivd", "spine.hivd.cervical", "spine.hivd.lumbar",
    "spine.stenosis", "spine.stenosis.cervical", "spine.stenosis.lumbar",
    "spine.inst", "spine.inst.highCervical", "spine.inst.lowCervical", "spine.inst.lumbar", "spine.inst.imageGuided",
    "spine.others",
    "head.edh", "head.asdh", "head.csdh", "head.tich",
    "cranioplasty",
    "infection.aspiration", "infection.drainage", "infection.excision",
    "vpshunt",
    "func.lesioning", "func.prtr", "func.dbs", "func.scs", "func.stimulator", "func.itpump", "func.mvd", "func.hyperhidrosis",
    "peripheral.cts", "peripheral.pns",
    "epilepsy",
    "endo.aneurysm", "endo.avm", "endo.davf", "endo.carotid", "endo.thrombectomy", "endo.transarterial", "endo.transvenous",
    "srs.vascular", "srs.vas.avm", "srs.vas.cavernoma", "srs.vas.davf",
    "srs.tumors", "srs.tum.malignant", "srs.tum.mal.met", "srs.tum.mal.primary",
    "srs.tum.benign", "srs.tum.ben.meningioma", "srs.tum.ben.schwannoma", "srs.tum.ben.pituitary", "srs.tum.ben.tn",
    "others",
  ];

  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));

  function selectableOptions() {
    return displayOrder
      .map((id) => byId[id])
      .filter((r) => r && !r.header)
      .map((r) => ({
        id: r.id,
        text: r.label === "—" ? r.major : `${r.major} › ${r.label}`,
        major: r.major,
        label: r.label,
        tone: r.tone || "",
      }));
  }

  function displayRows() {
    return displayOrder.map((id) => byId[id]).filter(Boolean);
  }

  return { rows, byId, displayOrder, displayRows, selectableOptions };
})();
