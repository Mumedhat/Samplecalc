const designs = {
  twoMeans: {
    name: "Two independent means",
    unit: "per group",
    note: "Two-sample t test or z approximation for continuous endpoints.",
    fields: [
      ["delta", "Clinically meaningful difference", 10],
      ["sd", "Common standard deviation", 15]
    ],
    calc: (p) => {
      const zA = zForAlpha(p.alpha, p.tail);
      const zB = invNorm(p.power);
      const n = Math.pow(zA + zB, 2) * (1 + 1 / p.ratio) * Math.pow(p.sd, 2) / Math.pow(p.delta, 2);
      return { nPerGroup: Math.ceil(n), total: Math.ceil(n) + Math.ceil(n * p.ratio) };
    }
  },
  pairedMeans: {
    name: "Paired or repeated continuous outcome",
    unit: "paired observations",
    note: "Paired t test using the SD of within-subject/specimen differences.",
    fields: [["delta", "Mean paired difference", 8], ["sdDiff", "SD of paired differences", 12]],
    calc: (p) => ({ total: Math.ceil(Math.pow(zForAlpha(p.alpha, p.tail) + invNorm(p.power), 2) * Math.pow(p.sdDiff / p.delta, 2)) })
  },
  oneMeanPrecision: {
    name: "Single mean precision",
    unit: "observations",
    note: "Confidence interval half-width for one continuous mean.",
    fields: [["sd", "Expected standard deviation", 15], ["margin", "Desired margin of error", 4]],
    calc: (p) => ({ total: Math.ceil(Math.pow(zForAlpha(p.alpha, "two") * p.sd / p.margin, 2)) })
  },
  twoProportions: {
    name: "Two independent proportions",
    unit: "per group",
    note: "Two-proportion comparison with pooled null variance.",
    fields: [["p1", "Control proportion", 0.35], ["p2", "Treatment proportion", 0.6]],
    calc: (p) => {
      const pbar = (p.p1 + p.ratio * p.p2) / (1 + p.ratio);
      const se0 = Math.sqrt(pbar * (1 - pbar) * (1 + 1 / p.ratio));
      const se1 = Math.sqrt(p.p1 * (1 - p.p1) + p.p2 * (1 - p.p2) / p.ratio);
      const n = Math.pow(zForAlpha(p.alpha, p.tail) * se0 + invNorm(p.power) * se1, 2) / Math.pow(p.p2 - p.p1, 2);
      return { nPerGroup: Math.ceil(n), total: Math.ceil(n) + Math.ceil(n * p.ratio) };
    }
  },
  oneProportionPrecision: {
    name: "Single proportion precision",
    unit: "observations",
    note: "Confidence interval half-width for prevalence, response, or viability proportion.",
    fields: [["p", "Expected proportion", 0.5], ["margin", "Desired margin of error", 0.08]],
    calc: (p) => ({ total: Math.ceil(Math.pow(zForAlpha(p.alpha, "two"), 2) * p.p * (1 - p.p) / Math.pow(p.margin, 2)) })
  },
  correlation: {
    name: "Correlation",
    unit: "observations",
    note: "Fisher z transformation for Pearson or Spearman correlation.",
    fields: [["r", "Expected correlation", 0.35]],
    calc: (p) => ({ total: Math.ceil(3 + Math.pow((zForAlpha(p.alpha, p.tail) + invNorm(p.power)) / (0.5 * Math.log((1 + p.r) / (1 - p.r))), 2)) })
  },
  anova: {
    name: "One-way ANOVA",
    unit: "per group",
    note: "Approximate balanced ANOVA using Cohen's f.",
    fields: [["groups", "Number of groups", 3], ["f", "Cohen's f effect size", 0.25]],
    calc: (p) => {
      const n = Math.ceil(Math.pow(zForAlpha(p.alpha, "two") + invNorm(p.power), 2) / Math.pow(p.f, 2) + 1);
      return { nPerGroup: n, total: n * Math.max(2, Math.round(p.groups)) };
    }
  },
  equivalence: {
    name: "Equivalence / non-inferiority means",
    unit: "per group",
    note: "Two one-sided tests approximation using equivalence or non-inferiority margin.",
    fields: [["sd", "Common standard deviation", 15], ["margin", "Equivalence / NI margin", 8], ["trueDiff", "Expected true difference", 0]],
    calc: (p) => {
      const effective = Math.max(0.0001, p.margin - Math.abs(p.trueDiff));
      const n = 2 * Math.pow((invNorm(1 - p.alpha) + invNorm(p.power)) * p.sd / effective, 2);
      return { nPerGroup: Math.ceil(n), total: Math.ceil(n) * 2 };
    }
  },
  survival: {
    name: "Survival / time-to-event",
    unit: "events",
    note: "Log-rank event requirement by hazard ratio, with total N based on event probability.",
    fields: [["hr", "Hazard ratio", 0.65], ["eventRate", "Expected event probability", 0.5]],
    calc: (p) => {
      const events = Math.ceil(4 * Math.pow(zForAlpha(p.alpha, p.tail) + invNorm(p.power), 2) / Math.pow(Math.log(p.hr), 2));
      return { total: Math.ceil(events / p.eventRate), events };
    }
  },
  diagnostic: {
    name: "Diagnostic sensitivity / specificity",
    unit: "positive and negative cases",
    note: "Precision-based diagnostic accuracy sample size.",
    fields: [["sensitivity", "Expected sensitivity", 0.85], ["specificity", "Expected specificity", 0.9], ["margin", "Desired margin of error", 0.07]],
    calc: (p) => ({
      positives: Math.ceil(Math.pow(zForAlpha(p.alpha, "two"), 2) * p.sensitivity * (1 - p.sensitivity) / Math.pow(p.margin, 2)),
      negatives: Math.ceil(Math.pow(zForAlpha(p.alpha, "two"), 2) * p.specificity * (1 - p.specificity) / Math.pow(p.margin, 2))
    })
  },
  regression: {
    name: "Regression model planning",
    unit: "minimum observations",
    note: "Events/observations per parameter rule with power sanity check.",
    fields: [["predictors", "Candidate predictors", 6], ["eventsPerPredictor", "Events or observations per predictor", 15], ["eventRate", "Outcome/event rate", 0.3]],
    calc: (p) => ({ total: Math.ceil((p.predictors * p.eventsPerPredictor) / Math.max(0.001, p.eventRate)) })
  },
  animalResource: {
    name: "In vivo resource equation",
    unit: "total animals",
    note: "Ethical animal-study planning check: E = total animals - groups; target E commonly 10 to 20.",
    fields: [["groups", "Number of groups", 4], ["targetE", "Target error degrees of freedom", 15]],
    calc: (p) => ({ total: Math.ceil(p.groups + p.targetE), nPerGroup: Math.ceil((p.groups + p.targetE) / p.groups) })
  }
};

const methodLibrary = [
  ["Continuous outcomes", "One/two-sample t tests, paired t tests, ANOVA, ANCOVA, repeated measures, equivalence and non-inferiority."],
  ["Categorical outcomes", "One/two proportions, chi-square, Fisher's exact planning, McNemar paired proportions, prevalence precision."],
  ["Association models", "Correlation, linear regression, logistic regression, Cox models, events-per-variable planning."],
  ["Time-to-event", "Log-rank tests, hazard ratio planning, accrual/event probability adjustments."],
  ["Diagnostic studies", "Sensitivity, specificity, ROC/AUC, positive and negative case requirements."],
  ["Laboratory studies", "Replicates, independent biological units, technical replicates, batch/block planning."],
  ["Animal studies", "3Rs-aware attrition, resource equation, randomized group comparisons, repeated measurements."],
  ["Multiplicity", "Bonferroni-adjusted alpha for multiple primary tests or families of hypotheses."],
  ["Literature synthesis", "Effect-size triangulation from similar studies, conservative pooled assumptions, reference appendix."]
];

const foundationalReferences = [
  "Cohen J. Statistical Power Analysis for the Behavioral Sciences. 2nd ed. Lawrence Erlbaum; 1988.",
  "Chow SC, Shao J, Wang H, Lokhnygina Y. Sample Size Calculations in Clinical Research. 3rd ed. Chapman and Hall/CRC; 2017.",
  "Julious SA. Sample Sizes for Clinical Trials. Chapman and Hall/CRC; 2009.",
  "Charan J, Kantharia ND. How to calculate sample size in animal studies? J Pharmacol Pharmacother. 2013;4(4):303-306.",
  "Buderer NMF. Statistical methodology: I. Incorporating the prevalence of disease into the sample size calculation for sensitivity and specificity. Acad Emerg Med. 1996;3(9):895-900.",
  "Percie du Sert N, et al. The ARRIVE guidelines 2.0: updated guidelines for reporting animal research. PLoS Biol. 2020;18(7):e3000410."
];

let state = {
  lastResult: null,
  references: [
    { citation: "Example: prior in vivo efficacy study", design: "Two independent means", effect: 0.67, n: 36, notes: "Standardized mean difference from published group comparison." },
    { citation: "Example: in vitro dose-response study", design: "One-way ANOVA", effect: 0.25, n: 48, notes: "Moderate Cohen's f from viability assay." }
  ],
  attachments: []
};

const $ = (id) => document.getElementById(id);

function init() {
  $("design").innerHTML = Object.entries(designs).map(([key, d]) => `<option value="${key}">${d.name}</option>`).join("");
  $("testLibrary").innerHTML = methodLibrary.map(([title, body]) => `<div class="method-card"><strong>${title}</strong><span>${body}</span></div>`).join("");
  bindEvents();
  renderParamFields();
  renderReferences();
  calculate();
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => setTab(btn.dataset.tab)));
  $("design").addEventListener("change", renderParamFields);
  $("calculate").addEventListener("click", calculate);
  $("addReference").addEventListener("click", () => {
    state.references.push({ citation: "", design: designs[$("design").value].name, effect: "", n: "", notes: "" });
    renderReferences();
  });
  $("exportReport").addEventListener("click", exportReport);
  $("refreshReport").addEventListener("click", renderReport);
  $("analyzeText").addEventListener("click", analyzeStudyText);
  $("loadExample").addEventListener("click", loadExample);
  $("fileInput").addEventListener("change", handleFile);
}

function setTab(tab) {
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab").forEach(s => s.classList.toggle("active", s.id === tab));
  if (tab === "report") renderReport();
}

function renderParamFields() {
  const design = designs[$("design").value];
  $("paramFields").innerHTML = design.fields.map(([key, label, value]) =>
    `<label>${label}<input id="param_${key}" type="number" step="0.001" value="${value}"></label>`
  ).join("");
}

function getParams() {
  const design = designs[$("design").value];
  const params = {
    alpha: Number($("alpha").value) / Math.max(1, Number($("tests").value || 1)),
    rawAlpha: Number($("alpha").value),
    power: Number($("power").value),
    tail: $("tail").value,
    ratio: Number($("ratio").value || 1),
    attrition: Number($("attrition").value || 0)
  };
  design.fields.forEach(([key]) => params[key] = Number($(`param_${key}`).value));
  return params;
}

function calculate() {
  const key = $("design").value;
  const design = designs[key];
  const params = getParams();
  const result = design.calc(params);
  const total = result.total || (result.nPerGroup ? result.nPerGroup * 2 : result.positives + result.negatives);
  const adjusted = Math.ceil(total / (1 - params.attrition / 100));
  state.lastResult = { key, design: design.name, params, result, total, adjusted, unit: design.unit, note: design.note, createdAt: new Date().toLocaleString() };

  $("resultN").textContent = formatResult(result, false);
  $("resultUnit").textContent = design.unit;
  $("adjustedN").textContent = adjusted;
  $("methodName").textContent = design.name;
  $("methodNote").textContent = design.note + (Number($("tests").value) > 1 ? ` Alpha adjusted to ${params.alpha.toFixed(4)} for ${$("tests").value} tests.` : "");
  $("sidebarN").textContent = formatResult(result, true);
  $("sidebarDesign").textContent = `${design.name}; adjusted total ${adjusted}.`;
  renderReport();
}

function formatResult(result, compact) {
  if (result.positives) return `${result.positives} positive / ${result.negatives} negative`;
  if (result.events) return compact ? `${result.total} total` : `${result.events} events; ${result.total} total`;
  if (result.nPerGroup) return compact ? `${result.total} total` : `${result.nPerGroup} per group; ${result.total} total`;
  return `${result.total} total`;
}

function renderReferences() {
  $("referenceList").innerHTML = state.references.map((ref, i) => `
    <div class="reference-row">
      <label>Citation / DOI / URL <input data-ref="${i}" data-field="citation" value="${escapeAttr(ref.citation)}"></label>
      <label>Design <input data-ref="${i}" data-field="design" value="${escapeAttr(ref.design)}"></label>
      <label>Effect size <input type="number" step="0.001" data-ref="${i}" data-field="effect" value="${ref.effect}"></label>
      <label>Sample size <input type="number" step="1" data-ref="${i}" data-field="n" value="${ref.n}"></label>
      <label>Notes <input data-ref="${i}" data-field="notes" value="${escapeAttr(ref.notes)}"></label>
      <button class="icon-btn" title="Remove reference" data-remove="${i}">x</button>
    </div>
  `).join("");
  $("referenceList").querySelectorAll("input").forEach(input => input.addEventListener("input", updateReference));
  $("referenceList").querySelectorAll("[data-remove]").forEach(btn => btn.addEventListener("click", () => {
    state.references.splice(Number(btn.dataset.remove), 1);
    renderReferences();
  }));
  renderLiteratureSummary();
}

function updateReference(event) {
  const i = Number(event.target.dataset.ref);
  state.references[i][event.target.dataset.field] = event.target.value;
  renderLiteratureSummary();
}

function renderLiteratureSummary() {
  const numeric = state.references.map(r => ({ effect: Number(r.effect), n: Number(r.n) })).filter(r => isFinite(r.effect) && r.effect > 0 && isFinite(r.n) && r.n > 0);
  let html = `<strong>${state.references.length} similar studies attached.</strong> Add DOI/URL/citation details and effect sizes from comparable endpoints.`;
  if (numeric.length) {
    const weighted = numeric.reduce((a, r) => a + r.effect * r.n, 0) / numeric.reduce((a, r) => a + r.n, 0);
    const conservative = quantile(numeric.map(r => r.effect), 0.25);
    html += `<br><span class="tag">Weighted effect ${weighted.toFixed(3)}</span><span class="tag">Conservative effect ${conservative.toFixed(3)}</span>`;
    html += `<br>For confirmatory work, use the conservative estimate when feasible, especially if publication bias or endpoint mismatch is likely.`;
  }
  $("literatureSummary").innerHTML = html;
}

async function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  state.attachments.push({ name: file.name, size: file.size, type: file.type || "unknown" });
  const name = file.name.toLowerCase();
  $("analysisOutput").innerHTML = `<strong>Reading:</strong> ${escapeHtml(file.name)}...`;
  try {
    if (name.endsWith(".txt") || name.endsWith(".md")) {
      $("studyText").value = await file.text();
    } else if (name.endsWith(".docx")) {
      $("studyText").value = await extractDocx(file);
    } else if (name.endsWith(".pdf")) {
      $("studyText").value = await extractPdf(file);
    }
    if ($("studyText").value.trim()) {
      $("analysisOutput").innerHTML = `<strong>Extracted:</strong> ${escapeHtml(file.name)}. Review the text, then run AI study analysis.`;
      analyzeStudyText();
      return;
    }
    $("analysisOutput").innerHTML = `<strong>Attached:</strong> ${escapeHtml(file.name)}. Text extraction did not return readable content; paste the abstract or methods text for automatic analysis.`;
  } catch (error) {
    $("analysisOutput").innerHTML = `<strong>Attached:</strong> ${escapeHtml(file.name)}. Automatic extraction is unavailable here (${escapeHtml(error.message)}). Paste the abstract or methods text for analysis.`;
  }
}

async function extractDocx(file) {
  if (!window.mammoth) throw new Error("DOCX library not loaded");
  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return result.value || "";
}

async function extractPdf(file) {
  const pdfjs = window.pdfjsLib || globalThis.pdfjsLib;
  if (!pdfjs) throw new Error("PDF library not loaded");
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const chunks = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    chunks.push(content.items.map(item => item.str).join(" "));
  }
  return chunks.join("\n\n");
}

function analyzeStudyText() {
  const text = $("studyText").value.trim();
  if (!text) {
    $("analysisOutput").innerHTML = "Paste study text or upload a TXT/MD file first.";
    return;
  }
  const lower = text.toLowerCase();
  const inferred = [];
  if (/\banimal\b|\bmice\b|\bmouse\b|\brats?\b|\brabbits?\b|\bin vivo\b|tumou?r volume|body weight/.test(lower)) inferred.push("In vivo");
  if (/cell|culture|well|plate|viability|mtt|western blot|pcr|elisa|in vitro/.test(lower)) inferred.push("In vitro");
  const designKey = inferDesignKey(lower);
  setDesign(designKey);

  const nums = extractParameters(text, designKey);
  const applied = {};
  Object.entries(nums).forEach(([key, value]) => {
    const input = $(`param_${key}`);
    if (input) {
      input.value = value;
      applied[key] = value;
    }
  });
  if (nums.alpha) { $("alpha").value = nums.alpha; applied.alpha = nums.alpha; }
  if (nums.power) { $("power").value = nums.power; applied.power = nums.power; }
  if (nums.attrition) { $("attrition").value = nums.attrition; applied.attrition = nums.attrition; }
  if (nums.ratio) { $("ratio").value = nums.ratio; applied.ratio = nums.ratio; }
  calculate();
  const suggestions = generateSuggestions(lower);
  const assumptions = getActiveAssumptions();
  $("analysisOutput").innerHTML = `
    <strong>Detected:</strong> ${inferred.length ? inferred.join(", ") : "General academic study"}; ${designs[$("design").value].name}.
    <br><strong>Applied extracted parameters:</strong> ${Object.keys(applied).length ? Object.entries(applied).map(([k,v]) => `${k}=${v}`).join(", ") : "No direct numeric assumptions found; calculator defaults retained."}
    <br><strong>Assumptions used for this calculation:</strong> ${assumptions.map(([k,v]) => `${k}=${v}`).join(", ")}
    <br><strong>AI suggestions:</strong><ul>${suggestions.map(s => `<li>${s}</li>`).join("")}</ul>
  `;
}

function inferDesignKey(lower) {
  if (/survival|hazard|kaplan|cox|log-rank|mortality|time-to-event/.test(lower)) return "survival";
  if (/sensitivity|specificity|diagnostic|roc|auc/.test(lower)) return "diagnostic";
  if (/correlation|pearson|spearman/.test(lower)) return "correlation";
  if (/non.?inferiority|equivalence|equivalent/.test(lower)) return "equivalence";
  if (/regression|predictors?|logistic|multivariable|cox model/.test(lower)) return "regression";
  if (/resource equation|error degrees of freedom|target e/.test(lower)) return "animalResource";
  if (/anova|three groups|multiple groups|dose|doses|more than two groups|between groups/.test(lower)) return "anova";
  if (/prevalence|precision|margin of error|confidence interval width/.test(lower) && /proportion|rate|percentage|%/.test(lower)) return "oneProportionPrecision";
  if (/proportion|prevalence|response rate|percentage endpoint|success rate|viability|mortality proportion|incidence proportion|binary outcome|categorical outcome/.test(lower)) return "twoProportions";
  if (/paired|before and after|pre-post|pretest|posttest|within-subject|matched/.test(lower)) return "pairedMeans";
  if (/precision|margin of error|confidence interval width/.test(lower)) return "oneMeanPrecision";
  return "twoMeans";
}

function setDesign(key) {
  $("design").value = key;
  renderParamFields();
}

function extractParameters(text, designKey) {
  const lower = text.toLowerCase();
  const out = {};
  const power = matchValue(lower, [
    /(?:power|1-?β|1-?beta)[^\d]{0,30}(0\.\d+|[5-9]\d(?:\.\d+)?%?)/,
    /(\d+(?:\.\d+)?)%\s+power/
  ]);
  const alpha = matchValue(lower, [
    /(?:alpha|α|significance|type i error)[^\d]{0,30}(0\.\d+|\d+(?:\.\d+)?%)/,
    /(?:p\s*[<≤=]\s*)(0\.\d+)/
  ]);
  const attrition = matchValue(lower, [/(?:attrition|dropout|loss to follow-up|failed cultures?|unusable specimens?|missing data)[^\d]{0,30}(\d+(?:\.\d+)?%?)/]);
  const ratio = lower.match(/(?:allocation ratio|randomi[sz]ed)\D{0,30}(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)/);
  if (power) out.power = normalizePercent(power);
  if (alpha) out.alpha = normalizePercent(alpha);
  if (attrition) out.attrition = Math.min(80, normalizePercent(attrition) * 100);
  if (ratio) out.ratio = Number(ratio[2]) / Number(ratio[1]);

  const sd = matchValue(lower, [
    /(?:standard deviation|sd|s\.d\.|common sd|pooled sd)[^\d]{0,30}(\d+(?:\.\d+)?)/,
    /(\d+(?:\.\d+)?)\s*(?:mm3|mg|ng\/ml|pg\/ml|%|units?)?\s*(?:standard deviation|sd|s\.d\.)/
  ]);
  const margin = matchValue(lower, [
    /(?:margin of error|precision|half-width|ci half-width|non.?inferiority margin|equivalence margin|margin)[^\d]{0,30}(\d+(?:\.\d+)?%?)/,
    /(?:within|±|\+\/-)\s*(\d+(?:\.\d+)?%?)/
  ]);
  const diff = matchValue(lower, [
    /(?:mean difference|clinically meaningful difference|minimal important difference|expected difference|delta|difference of)[^\d]{0,30}(\d+(?:\.\d+)?)/,
    /(?:effect|change|reduction|increase)[^\d]{0,30}(\d+(?:\.\d+)?)/
  ]);
  const groupMeans = extractGroupMeans(lower);

  if (["twoMeans", "pairedMeans", "oneMeanPrecision", "equivalence"].includes(designKey) && sd) out.sd = Number(sd);
  if (designKey === "pairedMeans" && sd) out.sdDiff = Number(sd);
  if (["twoMeans", "pairedMeans"].includes(designKey)) {
    if (diff) out.delta = Number(diff);
    else if (groupMeans.length >= 2) out.delta = round(Math.abs(groupMeans[1] - groupMeans[0]), 3);
  }
  if (["oneMeanPrecision", "oneProportionPrecision", "diagnostic", "equivalence"].includes(designKey) && margin) {
    const value = String(margin).includes("%") || Number(margin) <= 1 ? normalizePercent(margin) : Number(margin);
    out.margin = value;
  }
  if (designKey === "equivalence") {
    const trueDiff = matchValue(lower, [/(?:true difference|expected true difference|assumed difference)[^\d-]{0,30}(-?\d+(?:\.\d+)?)/]);
    if (trueDiff) out.trueDiff = Number(trueDiff);
  }

  const pcts = extractRelevantPercentages(lower);
  if (designKey === "twoProportions") {
    const control = extractPercentAfterKeyword(lower, ["control", "placebo", "untreated", "baseline"]);
    const treatment = extractPercentAfterKeyword(lower, ["treatment", "treated", "intervention", "experimental", "test group"]);
    if (control && treatment) {
      out.p1 = normalizePercent(control);
      out.p2 = normalizePercent(treatment);
    } else if (pcts.length >= 2) {
      out.p1 = pcts[0];
      out.p2 = pcts[1];
    }
  }
  if (designKey === "oneProportionPrecision" && pcts.length >= 1) out.p = pcts[0];

  if (designKey === "correlation") {
    const r = matchValue(lower, [/(?:correlation|pearson|spearman|r\s*=)[^\d-]{0,30}(-?0?\.\d+)/]);
    if (r) out.r = Math.min(0.99, Math.max(-0.99, Math.abs(Number(r))));
  }
  if (designKey === "anova") {
    const groups = matchValue(lower, [/(?:groups|arms|doses)[^\d]{0,20}(\d+)/, /(\d+)\s+(?:groups|arms|doses)/]);
    const f = matchValue(lower, [/(?:cohen'?s?\s*f|effect size f|f effect size)[^\d]{0,20}(0?\.\d+)/]);
    const eta = matchValue(lower, [/(?:eta squared|η2|eta2)[^\d]{0,20}(0?\.\d+)/]);
    if (groups) out.groups = Math.max(2, Math.round(Number(groups)));
    if (f) out.f = Number(f);
    else if (eta) out.f = round(Math.sqrt(Number(eta) / Math.max(0.001, 1 - Number(eta))), 3);
  }
  if (designKey === "survival") {
    const hr = matchValue(lower, [/(?:hazard ratio|hr)[^\d]{0,20}(0?\.\d+|\d+(?:\.\d+)?)/]);
    const eventRate = matchValue(lower, [/(?:event rate|event probability|mortality|incidence)[^\d]{0,30}(\d+(?:\.\d+)?%?)/]);
    if (hr) out.hr = Math.max(0.05, Math.min(5, Number(hr)));
    if (eventRate) out.eventRate = normalizePercent(eventRate);
  }
  if (designKey === "diagnostic") {
    const sensitivity = matchValue(lower, [/(?:sensitivity|sens)[^\d]{0,30}(\d+(?:\.\d+)?%?|0?\.\d+)/]);
    const specificity = matchValue(lower, [/(?:specificity|spec)[^\d]{0,30}(\d+(?:\.\d+)?%?|0?\.\d+)/]);
    if (sensitivity) out.sensitivity = normalizePercent(sensitivity);
    if (specificity) out.specificity = normalizePercent(specificity);
  }
  if (designKey === "regression") {
    const predictors = matchValue(lower, [/(?:predictors|covariates|variables|parameters)[^\d]{0,20}(\d+)/, /(\d+)\s+(?:predictors|covariates|variables)/]);
    const epp = matchValue(lower, [/(?:events per predictor|events per variable|epv|observations per predictor)[^\d]{0,20}(\d+)/]);
    const eventRate = matchValue(lower, [/(?:event rate|outcome rate|prevalence|incidence)[^\d]{0,30}(\d+(?:\.\d+)?%?)/]);
    if (predictors) out.predictors = Math.max(1, Math.round(Number(predictors)));
    if (epp) out.eventsPerPredictor = Math.max(5, Math.round(Number(epp)));
    if (eventRate) out.eventRate = normalizePercent(eventRate);
  }
  if (designKey === "animalResource") {
    const groups = matchValue(lower, [/(?:groups|arms)[^\d]{0,20}(\d+)/, /(\d+)\s+(?:groups|arms)/]);
    const targetE = matchValue(lower, [/(?:target e|error degrees of freedom|resource equation e)[^\d]{0,20}(\d+)/]);
    if (groups) out.groups = Math.max(2, Math.round(Number(groups)));
    if (targetE) out.targetE = Math.max(5, Math.round(Number(targetE)));
  }
  return out;
}

function matchValue(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function normalizePercent(value) {
  const raw = String(value).trim();
  const number = Number(raw.replace("%", ""));
  if (!isFinite(number)) return 0;
  return raw.includes("%") || number > 1 ? number / 100 : number;
}

function extractRelevantPercentages(text) {
  const mentions = [];
  for (const match of text.matchAll(/(\d+(?:\.\d+)?)%/g)) {
    const start = Math.max(0, match.index - 35);
    const end = Math.min(text.length, match.index + 35);
    const context = text.slice(start, end);
    if (/power|alpha|significance|confidence|attrition|dropout|loss|missing|sd|standard deviation/.test(context)) continue;
    const value = Number(match[1]) / 100;
    if (value > 0 && value < 1) mentions.push(value);
  }
  return mentions;
}

function extractPercentAfterKeyword(text, keywords) {
  for (const keyword of keywords) {
    const index = text.indexOf(keyword);
    if (index === -1) continue;
    const snippet = text.slice(index, index + 90);
    const match = snippet.match(/(\d+(?:\.\d+)?)%/);
    if (match) return match[0];
  }
  return null;
}

function extractGroupMeans(text) {
  const means = [];
  const control = extractMeanAfterKeyword(text, ["control", "placebo", "untreated", "baseline"]);
  const treatment = extractMeanAfterKeyword(text, ["treatment", "treated", "intervention", "experimental"]);
  if (control !== null) means.push(control);
  if (treatment !== null) means.push(treatment);
  if (means.length >= 2) return means;
  return [...text.matchAll(/(?:mean|average)[^\d-]{0,20}(-?\d+(?:\.\d+)?)/g)].map(match => Number(match[1])).slice(0, 2);
}

function extractMeanAfterKeyword(text, keywords) {
  for (const keyword of keywords) {
    const index = text.indexOf(keyword);
    if (index === -1) continue;
    const snippet = text.slice(index, index + 100);
    const match = snippet.match(/(?:mean|average)[^\d-]{0,20}(-?\d+(?:\.\d+)?)/);
    if (match) return Number(match[1]);
  }
  return null;
}

function getActiveAssumptions() {
  const params = getParams();
  const fields = designs[$("design").value].fields.map(([key]) => [key, params[key]]);
  return [
    ...fields,
    ["alpha", params.rawAlpha],
    ["power", params.power],
    ["attrition", `${params.attrition}%`]
  ];
}

function round(value, places) {
  const factor = Math.pow(10, places);
  return Math.round(value * factor) / factor;
}

function generateSuggestions(lower) {
  const list = [];
  if (!/random/.test(lower)) list.push("Add a clear randomization method and allocation concealment where applicable.");
  if (!/blind|masked/.test(lower)) list.push("State whether outcome assessment can be blinded or masked.");
  if (!/primary endpoint|primary outcome/.test(lower)) list.push("Define one primary endpoint before choosing secondary analyses.");
  if (!/attrition|dropout|failed|missing/.test(lower)) list.push("Justify attrition, failed cultures, unusable specimens, and missing-data handling.");
  if (!/effect size|standard deviation|pilot|previous|literature/.test(lower)) list.push("Ground the effect size and variance in pilot data or closely similar studies.");
  if (/cell|culture|well|plate/.test(lower)) list.push("Separate biological replicates from technical replicates; sample size should usually count independent biological units.");
  if (/\banimal\b|\bmice\b|\brats?\b|\bin vivo\b/.test(lower)) list.push("Report 3Rs justification, humane endpoints, sex/strain, housing blocks, and cage-level clustering risk.");
  return list;
}

function renderReport() {
  const r = state.lastResult;
  if (!r) return;
  const refs = state.references.filter(x => x.citation || x.effect || x.n);
  $("reportPreview").innerHTML = `
    <h2>${escapeHtml($("studyTitle").value)}</h2>
    <p><strong>Setting:</strong> ${escapeHtml($("studySetting").value)} | <strong>Endpoint:</strong> ${escapeHtml($("endpoint").value || "Not specified")}</p>
    <h3>Sample Size Recommendation</h3>
    <p>${formatResult(r.result, false)} before attrition. Adjusted total: <strong>${r.adjusted}</strong> with ${r.params.attrition}% attrition.</p>
    <p><strong>Design:</strong> ${r.design}. <strong>Method:</strong> ${r.note}</p>
    <table><tbody>
      <tr><th>Alpha</th><td>${r.params.rawAlpha}</td><th>Adjusted alpha</th><td>${r.params.alpha.toFixed(4)}</td></tr>
      <tr><th>Power</th><td>${r.params.power}</td><th>Tail</th><td>${r.params.tail}</td></tr>
      <tr><th>Allocation ratio</th><td>${r.params.ratio}</td><th>Calculated</th><td>${r.createdAt}</td></tr>
    </tbody></table>
    <h3>Literature Basis</h3>
    ${refs.length ? `<table><thead><tr><th>Reference</th><th>Design</th><th>Effect</th><th>N</th><th>Notes</th></tr></thead><tbody>${refs.map(ref => `<tr><td>${escapeHtml(ref.citation)}</td><td>${escapeHtml(ref.design)}</td><td>${ref.effect}</td><td>${ref.n}</td><td>${escapeHtml(ref.notes)}</td></tr>`).join("")}</tbody></table>` : "<p>No similar studies entered.</p>"}
    <h3>Foundational Method References</h3>
    <ul>${foundationalReferences.map(ref => `<li>${escapeHtml(ref)}</li>`).join("")}</ul>
    <h3>AI Suggestions</h3>
    <ul>${generateSuggestions(($("studyText").value || "").toLowerCase()).map(s => `<li>${s}</li>`).join("")}</ul>
    <h3>Important Use Note</h3>
    <p>This app provides transparent planning calculations and literature-aware decision support. Final parameters should be reviewed by a qualified biostatistician and aligned with the exact protocol, endpoint distribution, clustering, repeated measures, and regulatory or ethics requirements.</p>
  `;
}

function exportReport() {
  calculate();
  renderReport();
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Sample size report</title><style>body{font-family:Arial,sans-serif;line-height:1.5;padding:30px;color:#16201d}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #ccd6cf;padding:8px;text-align:left}h1,h2,h3{color:#176a5d}</style></head><body>${$("reportPreview").innerHTML}</body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "sample-size-report.html";
  a.click();
  URL.revokeObjectURL(a.href);
}

function loadExample() {
  $("studyTitle").value = "Nanoparticle treatment effect on tumor volume in mice";
  $("studySetting").value = "In vivo";
  $("endpoint").value = "Tumor volume at day 21";
  setDesign("twoMeans");
  $("param_delta").value = 120;
  $("param_sd").value = 150;
  $("attrition").value = 12;
  $("studyText").value = "This in vivo mouse study compares tumor volume between randomized treatment and control groups. The primary endpoint is tumor volume at day 21. Prior literature suggests a mean difference of 120 mm3 and standard deviation of 150 mm3. Power is 80% with alpha 0.05. Blinded assessment and attrition from humane endpoints will be reported.";
  calculate();
  analyzeStudyText();
}

function zForAlpha(alpha, tail) {
  return invNorm(1 - (tail === "two" ? alpha / 2 : alpha));
}

function invNorm(p) {
  if (p <= 0 || p >= 1) return NaN;
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const plow = 0.02425, phigh = 1 - plow;
  let q, r;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (phigh < p) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  q = p - 0.5;
  r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

function quantile(arr, q) {
  const sorted = [...arr].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, s => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[s]));
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/`/g, "&#096;");
}

init();
