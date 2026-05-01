/* ── Pump Curve Lab  ─────────────────────────────────────────────── */
/* Eddy Pump lead-screening + pump-curve recommendation engine      */
/* Static browser app — no build step required                      */

// ── Default Eddy pump library ──────────────────────────────────────
// Covers every size band from 1-in through 16-in plus HH2000.
// Existing HD-series kept for CSV-upload backward compatibility.
const defaultLibraryCsv = `MODEL,ROTOR,FLOW_GPM,HEAD_FT,EFFICIENCY_PCT,POWER_HP
ED-1,1-in,0,45,0,0
ED-1,1-in,8,43,12,0.3
ED-1,1-in,18,39,22,0.7
ED-1,1-in,30,32,28,1.1
ED-1,1-in,42,22,25,1.6
ED-1,1-in,50,14,18,2.0
ED-2,2-in,0,82,0,0
ED-2,2-in,30,78,10,1.8
ED-2,2-in,60,72,18,3.2
ED-2,2-in,100,62,26,5.0
ED-2,2-in,140,48,30,6.8
ED-2,2-in,180,32,26,8.5
ED-2,2-in,200,22,20,9.5
HH2000,HH,0,185,0,0
HH2000,HH,30,178,8,5.0
HH2000,HH,60,168,14,8.5
HH2000,HH,100,150,20,12.0
HH2000,HH,140,128,24,15.5
HH2000,HH,180,100,22,19.0
HH2000,HH,200,82,18,22.0
ED-3,3-in,0,92,0,0
ED-3,3-in,60,87,10,4.5
ED-3,3-in,130,78,18,8.0
ED-3,3-in,200,68,24,11.0
ED-3,3-in,280,54,28,14.5
ED-3,3-in,350,40,26,17.5
ED-3,3-in,400,28,22,20.0
ED-4,4-in,0,75,0,0
ED-4,4-in,120,70,10,7.0
ED-4,4-in,250,64,17,12.0
ED-4,4-in,400,55,23,17.0
ED-4,4-in,550,45,27,22.0
ED-4,4-in,700,34,26,27.0
ED-4,4-in,850,22,22,31.0
ED-4,4-in,900,18,19,33.0
ED-6,6-in,0,82,0,0
ED-6,6-in,200,78,10,14.0
ED-6,6-in,450,72,18,24.0
ED-6,6-in,700,63,24,35.0
ED-6,6-in,1000,52,28,46.0
ED-6,6-in,1300,38,26,56.0
ED-6,6-in,1500,26,22,64.0
ED-6,6-in,1600,20,18,68.0
ED-8,8-in,0,98,0,0
ED-8,8-in,350,93,10,30.0
ED-8,8-in,700,86,18,50.0
ED-8,8-in,1100,76,24,72.0
ED-8,8-in,1600,62,30,95.0
ED-8,8-in,2000,48,28,112.0
ED-8,8-in,2400,32,22,130.0
ED-8,8-in,2500,26,18,138.0
ED-10,10-in,0,105,0,0
ED-10,10-in,500,99,10,50.0
ED-10,10-in,1000,90,18,78.0
ED-10,10-in,1600,80,24,105.0
ED-10,10-in,2200,66,28,135.0
ED-10,10-in,2800,50,28,160.0
ED-10,10-in,3200,36,24,180.0
ED-10,10-in,3500,24,18,200.0
ED-12,12-in,0,115,0,0
ED-12,12-in,700,108,10,70.0
ED-12,12-in,1500,98,18,115.0
ED-12,12-in,2500,84,24,160.0
ED-12,12-in,3500,68,28,210.0
ED-12,12-in,4500,50,26,260.0
ED-12,12-in,5500,32,22,310.0
ED-12,12-in,6000,22,18,340.0
ED-16,16-in,0,125,0,0
ED-16,16-in,1500,118,10,150.0
ED-16,16-in,3000,108,18,260.0
ED-16,16-in,5000,92,24,400.0
ED-16,16-in,7000,74,28,540.0
ED-16,16-in,9000,54,26,680.0
ED-16,16-in,11000,32,22,800.0
ED-16,16-in,12000,22,18,880.0
HD2000,8 inch,0,62,0,0
HD2000,8 inch,150,58,12,10
HD2000,8 inch,300,54,18,13
HD2000,8 inch,450,49,21,16
HD2000,8 inch,607,45,22,18
HD2000,8 inch,750,39,20,20
HD3000,9.5 inch,0,58,0,0
HD3000,9.5 inch,200,54,14,12
HD3000,9.5 inch,400,50,19,16
HD3000,9.5 inch,650,45,23,21
HD3000,9.5 inch,885,40,24,26
HD3000,9.5 inch,1050,34,22,28
HD4000,10 inch,0,48,0,0
HD4000,10 inch,300,45,14,18
HD4000,10 inch,600,41,19,24
HD4000,10 inch,1000,35,24,30
HD4000,10 inch,1480,29.9,28,39.4
HD4000,10 inch,1700,24,25,42
HD5000,12 inch,0,50,0,0
HD5000,12 inch,400,46,15,22
HD5000,12 inch,800,41,22,30
HD5000,12 inch,1200,35,27,36
HD5000,12 inch,1575,30.4,29,41.6
HD5000,12 inch,1900,23,25,45
HD6000,14 inch,0,72,0,0
HD6000,14 inch,500,67,16,35
HD6000,14 inch,1000,60,24,48
HD6000,14 inch,1500,54,30,60
HD6000,14 inch,1956,50.1,34,71.8
HD6000,14 inch,2300,42,30,80
HD8000,17 inch,0,100,0,0
HD8000,17 inch,500,93,14,55
HD8000,17 inch,1000,86,22,80
HD8000,17 inch,1500,79,28,100
HD8000,17 inch,2100,75,35,120
HD8000,17 inch,2300,65,37,130
HD8000,17 inch,2800,49,30,140`;

// ── Size-band mapping (used for scoring bonus) ─────────────────────
const sizeBandMap = {
  'ED-1': [5, 50],
  'ED-2': [50, 200],
  'HH2000': [50, 200],   // high-head variant
  'ED-3': [200, 400],
  'ED-4': [400, 900],
  'ED-6': [900, 1600],
  'ED-8': [1600, 2500],
  'ED-10': [2500, 3500],
  'ED-12': [3500, 6000],
  'ED-16': [6000, 12000],
};

let curveRows = [];
let lastRecommendation = null;
let autoRecommendTimer = null;

const colors = ['#2563eb','#16a34a','#dc2626','#9333ea','#ea580c','#0891b2','#4f46e5','#d97706','#0f766e'];
const $ = id => document.getElementById(id);
const els = {
  curveFile: $('curveFile'),
  projectFile: $('projectFile'),
  libraryStats: $('libraryStats'),
  curveTableWrap: $('curveTableWrap'),
  summaryCards: $('summaryCards'),
  recommendationBox: $('recommendationBox'),
  comparisonWrap: $('comparisonWrap'),
  curveChart: $('curveChart'),
  chartLegend: $('chartLegend'),
  useDefaultLibraryBtn: $('useDefaultLibraryBtn'),
  showLibraryToolsBtn: $('showLibraryToolsBtn'),
  libraryToolsPanel: $('libraryToolsPanel'),
  calcTdhBtn: $('calcTdhBtn'),
  exportJsonBtn: $('exportJsonBtn'),
  exportCsvBtn: $('exportCsvBtn'),
  exportHtmlBtn: $('exportHtmlBtn'),
  saveProjectBtn: $('saveProjectBtn'),
  loadProjectBtn: $('loadProjectBtn'),
  printBtn: $('printBtn'),
  appForm: $('appForm'),
  familyFilter: $('familyFilter'),
  validationSummary: $('validationSummary'),
  leadRecommendationBand: $('leadRecommendationBand'),
  formCard: $('formCard'),
};
const fieldIds = ['projectName','projectRef','applicationType','flowRate','flowUnit','headValue','headUnit','workflowMode','pumpType','specificGravity','viscosity','staticHead','pipeLength','pipeDiameter','elevationFt','atmosphericPressure','pipeFactor','fittingsCount','motorServiceFactor','solidsSize','fluidTemp','materialPreference','percentSolidsByWeight','availableMotorHp','motorVoltage','motorFrequency','targetRpm','useVfd','suctionLift','suctionHoseLength','tankSurfacePressure','submergenceDepth','coolingMethod','powerCableLength'];
const autoRunFieldSet = new Set(fieldIds);
const requiredCoreFieldIds = ['flowRate','headValue','specificGravity'];

// ── CSV / data helpers ─────────────────────────────────────────────

function parseCsv(text, sourceName='uploaded') {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = lines.shift().split(',').map(h => h.trim());
  return lines.map(line => {
    const cols = line.split(',');
    const obj = {};
    headers.forEach((h, i) => obj[h] = (cols[i] || '').trim());
    return {
      model: obj.MODEL || obj['PUMP MODEL'] || 'Unknown',
      rotor: obj.ROTOR || obj['ROTOR SIZE'] || '',
      flowGpm: Number(String(obj.FLOW_GPM || obj['FLOW (GPM)'] || '0').replace(/[^0-9.\-]/g, '')),
      headFt: Number(String(obj.HEAD_FT || obj['HEAD (FT)'] || '0').replace(/[^0-9.\-]/g, '')),
      efficiencyPct: Number(String(obj.EFFICIENCY_PCT || obj['EFFICIENCY (%)'] || '0').replace(/[^0-9.\-]/g, '')),
      powerHp: Number(String(obj.POWER_HP || obj['POWER (HP)'] || '0').replace(/[^0-9.\-]/g, '')),
      source: sourceName,
    };
  }).filter(r => r.model && Number.isFinite(r.flowGpm) && Number.isFinite(r.headFt));
}

function buildCsv(rows) {
  return ['MODEL,SOURCE,ROTOR,FLOW_GPM,HEAD_FT,EFFICIENCY_PCT,POWER_HP', ...rows.map(r => [r.model,r.source,r.rotor,r.flowGpm,r.headFt,r.efficiencyPct,r.powerHp].join(','))].join('\n');
}

// ── Unit conversions ───────────────────────────────────────────────

function toGpm(value, unit) {
  if (unit === 'm3h') return value * 4.40287;
  if (unit === 'lps') return value * 15.8503;
  return value;
}
function fromFeetHead(value, unit, sg=1) {
  if (unit === 'm') return value / 3.28084;
  if (unit === 'psi') return value * sg / 2.31;
  if (unit === 'bar') return value / 33.455;
  return value;
}
function toFeetHead(value, unit, sg=1) {
  if (unit === 'm') return value * 3.28084;
  if (unit === 'psi') return value * 2.31 / sg;
  if (unit === 'bar') return value * 33.455 / sg;
  return value;
}
function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
function uniqueModels(rows) { return [...new Set(rows.map(r => r.model))].sort(); }
function activeRows() { const filter = els.familyFilter.value; return filter === 'all' ? curveRows : curveRows.filter(r => r.model === filter); }
function updateFamilyFilter() {
  const current = els.familyFilter.value;
  const models = uniqueModels(curveRows);
  els.familyFilter.innerHTML = `<option value="all">All loaded models</option>${models.map(m => `<option value="${m}">${m}</option>`).join('')}`;
  if (models.includes(current)) els.familyFilter.value = current;
}
function getFormValues() { const out = {}; fieldIds.forEach(id => { const el = $(id); if (el) out[id] = el.value; }); return out; }
function setFormValues(values={}) { fieldIds.forEach(id => { const el = $(id); if (el && values[id] !== undefined) el.value = values[id]; }); }
function getFieldLabel(el) { return el?.closest('label')?.childNodes?.[0]?.textContent?.trim() || el?.id || 'Field'; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function roundMotorHp(value) { return Math.max(5, Math.ceil(value / 5) * 5); }

// ── Auto-run helpers ───────────────────────────────────────────────

function updateAutoRunStatus(message='Auto-refresh is on for key project inputs.') {
  let el = $('autoRunStatus');
  if (!el) {
    el = document.createElement('div');
    el.id = 'autoRunStatus';
    el.className = 'autorun-status';
    document.querySelector('.sticky-actions')?.after(el);
  }
  el.innerHTML = `<strong>Auto-refresh:</strong> ${message}`;
}

function queueAutoRecommend(reason='inputs updated') {
  clearTimeout(autoRecommendTimer);
  updateAutoRunStatus(`Refreshing after ${reason}…`);
  autoRecommendTimer = setTimeout(() => {
    if (!curveRows.length) return;
    recommend();
    updateAutoRunStatus('Recommendation refreshed automatically.');
  }, 400);
}

// ── Validation ─────────────────────────────────────────────────────

function ensureInlineValidationNode(input) {
  let hint = input.parentElement.querySelector('.field-error');
  if (!hint) { hint = document.createElement('div'); hint.className = 'field-error'; input.parentElement.appendChild(hint); }
  return hint;
}
function setFieldError(input, message='') {
  if (!input) return;
  const hint = ensureInlineValidationNode(input);
  input.classList.toggle('input-error', Boolean(message));
  hint.textContent = message;
}
function validateCoreInputs() {
  const errors = [];
  requiredCoreFieldIds.forEach(id => {
    const input = $(id);
    const value = Number(input.value);
    let message = '';
    if (input.value === '') message = `${getFieldLabel(input)} is required.`;
    else if (!Number.isFinite(value) || value <= 0) message = `${getFieldLabel(input)} must be greater than zero.`;
    setFieldError(input, message);
    if (message) errors.push(message);
  });
  const sg = $('specificGravity');
  if (sg.value !== '' && Number(sg.value) < 0.1) {
    const message = 'Specific Gravity must be at least 0.1.';
    setFieldError(sg, message);
    if (!errors.includes(message)) errors.push(message);
  }
  if (els.validationSummary) {
    if (errors.length) {
      els.validationSummary.classList.remove('hidden');
      els.validationSummary.innerHTML = `<strong>Check these inputs:</strong><ul>${errors.map(err => `<li>${err}</li>`).join('')}</ul>`;
    } else {
      els.validationSummary.classList.add('hidden');
      els.validationSummary.innerHTML = '';
    }
  }
  return errors;
}

// ── Curve math ─────────────────────────────────────────────────────

function interpolateCurvePoint(points, flow) {
  const pts = points.slice().sort((a,b) => a.flowGpm - b.flowGpm);
  if (!pts.length) return null;
  if (pts.length === 1) return { ...pts[0] };
  if (flow <= pts[0].flowGpm) return { ...pts[0], flowGpm: flow };
  if (flow >= pts[pts.length-1].flowGpm) return { ...pts[pts.length-1], flowGpm: flow };
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i+1];
    if (flow >= a.flowGpm && flow <= b.flowGpm) {
      const t = (flow - a.flowGpm) / (b.flowGpm - a.flowGpm || 1);
      const lerp = (x, y) => x + (y - x) * t;
      return { model: a.model, rotor: a.rotor || b.rotor, source: a.source, flowGpm: flow, headFt: lerp(a.headFt, b.headFt), efficiencyPct: lerp(a.efficiencyPct||0, b.efficiencyPct||0), powerHp: lerp(a.powerHp||0, b.powerHp||0) };
    }
  }
  return { ...pts[pts.length-1], flowGpm: flow };
}

function findBepPoint(points) {
  return points.filter(p => Number.isFinite(p.efficiencyPct)).sort((a,b) => b.efficiencyPct - a.efficiencyPct)[0] || null;
}

function buildSystemCurve(ctx, maxFlow) {
  const staticHead = Number($('staticHead').value || 0);
  const targetFlow = Math.max(ctx.targetFlowGpm, 1);
  const targetHead = Math.max(ctx.modeAdjustedHeadFt, staticHead);
  const k = (targetHead - staticHead) / Math.pow(targetFlow, 2);
  const points = [];
  for (let i = 0; i <= 40; i++) {
    const flow = (maxFlow * i) / 40;
    points.push({ flowGpm: flow, headFt: staticHead + k * Math.pow(flow, 2) });
  }
  return { points, staticHead, k };
}

function findOperatingPoint(pumpPoints, systemPoints) {
  const pts = pumpPoints.slice().sort((a,b) => a.flowGpm - b.flowGpm);
  for (let i = 1; i < systemPoints.length; i++) {
    const prevSys = systemPoints[i-1], currSys = systemPoints[i];
    const prevPump = interpolateCurvePoint(pts, prevSys.flowGpm);
    const currPump = interpolateCurvePoint(pts, currSys.flowGpm);
    if (!prevPump || !currPump) continue;
    const diffA = prevPump.headFt - prevSys.headFt;
    const diffB = currPump.headFt - currSys.headFt;
    if (diffA === 0) return { flowGpm: prevSys.flowGpm, headFt: prevSys.headFt };
    if (diffA > 0 && diffB <= 0) {
      const t = diffA / (diffA - diffB || 1);
      return { flowGpm: prevSys.flowGpm + (currSys.flowGpm - prevSys.flowGpm) * t, headFt: prevSys.headFt + (currSys.headFt - prevSys.headFt) * t };
    }
  }
  return null;
}

// ── Lead pump-sizing rules ─────────────────────────────────────────

function getGeneralPumpRecommendation(flowGpm, adjustedHeadFt) {
  if (flowGpm >= 5 && flowGpm < 50) return '1-in Pump';
  if (flowGpm >= 50 && flowGpm < 200) return adjustedHeadFt > 120 ? 'HH2000' : '2-in Pump';
  if (flowGpm >= 200 && flowGpm < 400) return '3-in Pump';
  if (flowGpm >= 400 && flowGpm < 900) return '4-in Pump';
  if (flowGpm >= 900 && flowGpm < 1600) return '6-in Pump';
  if (flowGpm >= 1600 && flowGpm < 2500) return '8-in Pump';
  if (flowGpm >= 2500 && flowGpm < 3500) return '10-in Pump';
  if (flowGpm >= 3500 && flowGpm < 6000) return '12-in Pump';
  if (flowGpm >= 6000 && flowGpm <= 12000) return '16-in Pump';
  return 'Outside standard range';
}

function getSizingRuleNote(flowGpm, adjustedHeadFt) {
  if (flowGpm >= 50 && flowGpm < 200 && adjustedHeadFt > 120) return 'High-head exception: HH2000 recommended instead of standard 2-in.';
  if (flowGpm < 5) return 'Below standard screening range — manual review recommended.';
  if (flowGpm > 12000) return 'Above standard screening range — manual review recommended.';
  return 'Based on EDDY Pump lead-screening flow bands.';
}

function avoidFiveInPumpNote() { return 'Avoid 5-in pump when making suggestions'; }

/** Map general recommendation text → preferred ED-model name */
function recommendedModelForBand(flowGpm, adjustedHeadFt) {
  if (flowGpm >= 5 && flowGpm < 50) return 'ED-1';
  if (flowGpm >= 50 && flowGpm < 200) return adjustedHeadFt > 120 ? 'HH2000' : 'ED-2';
  if (flowGpm >= 200 && flowGpm < 400) return 'ED-3';
  if (flowGpm >= 400 && flowGpm < 900) return 'ED-4';
  if (flowGpm >= 900 && flowGpm < 1600) return 'ED-6';
  if (flowGpm >= 1600 && flowGpm < 2500) return 'ED-8';
  if (flowGpm >= 2500 && flowGpm < 3500) return 'ED-10';
  if (flowGpm >= 3500 && flowGpm < 6000) return 'ED-12';
  if (flowGpm >= 6000 && flowGpm <= 12000) return 'ED-16';
  return null;
}

// ── Mode / workflow helpers ────────────────────────────────────────

function syncMirrorFields() {
  const mode = $('workflowMode').value;
  const viscosity = $('viscosity');
  const spMirror = $('viscositySelfPrimeMirror');
  const subMirror = $('viscositySubMirror');
  if (spMirror && viscosity && mode === 'selfpriming') viscosity.value = spMirror.value || viscosity.value;
  if (subMirror && viscosity && mode === 'submersible') viscosity.value = subMirror.value || viscosity.value;
}

function applyWorkflowModeUI() {
  const mode = $('workflowMode').value;
  const modeMap = {
    electric: ['electricModeFields','quickElectricFields'],
    selfpriming: ['selfPrimingModeFields','quickSelfPrimingFields'],
    submersible: ['submersibleModeFields','quickSubmersibleFields'],
  };
  Object.values(modeMap).flat().forEach(id => $(id)?.classList.add('hidden'));
  modeMap[mode].forEach(id => $(id)?.classList.remove('hidden'));
  const pumpType = $('pumpType');
  if (pumpType) {
    if (mode === 'selfpriming') pumpType.value = 'selfpriming';
    if (mode === 'submersible') pumpType.value = 'submersible';
    if (mode === 'electric' && pumpType.value === 'selfpriming') pumpType.value = 'flooded';
  }
  syncMirrorFields();
}

function updateAtmosphericPressureFromElevation() {
  const elevationFt = Number($('elevationFt').value || 0);
  const atm = 14.7 * Math.pow(1 - 6.8754e-6 * elevationFt, 5.2559);
  $('atmosphericPressure').value = Math.max(atm, 0).toFixed(2);
}

function getModeConfig(mode) {
  if (mode === 'selfpriming') return {
    title: 'Self-Priming',
    checklist: [
      'Use suction lift logic, not just discharge TDH.',
      'Keep suction lift at or below 18 ft preferred.',
      'Treat ~24 ft suction lift as a practical hard warning zone.',
      'Watch suction hose length closely, roughly 150–200 ft max preferred.',
      'If suction head available goes negative, treat as a design failure until proven otherwise.'
    ]
  };
  if (mode === 'submersible') return {
    title: 'Submersible',
    checklist: [
      'Assume flooded suction and focus on duty point, slurry properties, and motor loading.',
      'Verify cable, cooling, and submergence constraints separately.',
      'Check solids size and wear material suitability for submerged service.'
    ]
  };
  return {
    title: 'Electric Process',
    checklist: [
      'Start with customer flow, TDH, slurry properties, and operating frequency/RPM.',
      'Use interpolated family match as a screening step, then manually validate motor sizing.',
      'Prefer standard rotor sizes and avoid 5-in pumps.'
    ]
  };
}

function getWorkflowGuidance(ctx) {
  const notes = [];
  if (ctx.pumpType === 'selfpriming') {
    notes.push('Self-priming workflow: use suction lift in the TDH calculator, keep lift ≤ 18 ft preferred, treat ~24 ft as hard limit.');
    notes.push('Self-priming suction hose should stay around 150–200 ft max.');
  } else {
    notes.push('Electric / flooded workflow: start from customer flow, TDH, slurry, then interpolate the family curve and validate motor sizing.');
  }
  if (ctx.targetFlowGpm >= 50 && ctx.targetFlowGpm < 200 && ctx.adjustedHeadFt > 120) notes.push('High-head exception: 50–200 GPM with head > 120 ft → prefer HH2000.');
  notes.push('Avoid 5-in pump recommendations unless there is a very strong override reason.');
  notes.push('Use job/engineering judgment on motor sizing — manual override may be needed after VFD/RPM review.');
  if (ctx.materialPreference === 'abrasive') notes.push('Abrasive slurry: a faster small-rotor pump wears far faster than a slower large-rotor pump.');
  if (ctx.availableMotorHp > 0) notes.push('Customer motor limit entered: keep within available HP when possible.');
  return notes;
}

function renderLeadRecommendationBand() {
  const ctx = buildContext();
  const generalRecommendation = getGeneralPumpRecommendation(ctx.targetFlowGpm, ctx.modeAdjustedHeadFt);
  const ruleNote = getSizingRuleNote(ctx.targetFlowGpm, ctx.modeAdjustedHeadFt);
  if (!els.leadRecommendationBand) return;
  els.leadRecommendationBand.innerHTML = `
    <div>
      <div class="lead-band-title">Lead recommendation</div>
      <div class="lead-band-pump">${generalRecommendation}</div>
      <div class="lead-band-copy">${ruleNote}</div>
      <div class="rule-note">${avoidFiveInPumpNote()}.</div>
    </div>
    <div class="lead-band-grid">
      <div class="lead-band-tile"><div class="k">Flow</div><div class="v">${ctx.targetFlowGpm.toFixed(0)} gpm</div></div>
      <div class="lead-band-tile"><div class="k">Adj. head</div><div class="v">${ctx.modeAdjustedHeadFt.toFixed(1)} ft</div></div>
      <div class="lead-band-tile"><div class="k">Workflow</div><div class="v">${getModeConfig(ctx.workflowMode).title}</div></div>
      <div class="lead-band-tile"><div class="k">Sp. gravity</div><div class="v">${ctx.sg.toFixed(2)}</div></div>
    </div>`;
}

function updateWorkflowGuidance() {
  const ctx = buildContext();
  applyWorkflowModeUI();
  renderLeadRecommendationBand();
  const notes = getWorkflowGuidance(ctx);
  const mode = getModeConfig(ctx.workflowMode);
  $('workflowGuidance').innerHTML = '<strong>Workflow guidance:</strong><ul>' + notes.map(n => `<li>${n}</li>`).join('') + '</ul>';
  $('modeChecklist').innerHTML = `<strong>${mode.title} checklist:</strong><ul>${mode.checklist.map(n => `<li>${n}</li>`).join('')}</ul>`;
}

// ── Penalty / adjustment helpers ───────────────────────────────────

function getWearPenalty(ctx) {
  const abrasive = ctx.materialPreference === 'abrasive' ? 1 : 0;
  const solidsFactor = Math.max(0, ctx.percentSolidsByWeight - 20) * 0.002;
  const rpmFactor = Math.max(0, ctx.targetRpm - 1200) * 0.0008;
  return abrasive * (0.03 + solidsFactor + rpmFactor);
}

function getModeAdjustedHead(ctx) {
  let adjusted = ctx.adjustedHeadFt;
  if (ctx.workflowMode === 'selfpriming') {
    adjusted += ctx.suctionLift * 0.9;
    adjusted += Math.max(0, ctx.suctionHoseLength - 100) * 0.03;
    adjusted -= ctx.tankSurfacePressure * 1.5;
  }
  if (ctx.workflowMode === 'submersible') adjusted += Math.max(0, 8 - ctx.submergenceDepth) * 1.5;
  return Math.max(adjusted, 0);
}

function getModeWarnings(ctx, best) {
  const warnings = [];
  if (ctx.workflowMode === 'selfpriming') {
    if (ctx.suctionLift > 18) warnings.push('Self-prime warning: suction lift above preferred 18 ft.');
    if (ctx.suctionLift >= 24) warnings.push('Self-prime danger: near/above practical hard limit (~24 ft).');
    if (ctx.suctionHoseLength > 200) warnings.push('Self-prime warning: suction hose above 150–200 ft practical range.');
  }
  if (ctx.workflowMode === 'electric') {
    if (ctx.useVfd === 'yes' && ctx.targetRpm < 1800) warnings.push('VFD / reduced RPM: base motor HP must be checked.');
    if (ctx.materialPreference === 'abrasive' && ctx.targetRpm > 1500) warnings.push('Wear warning: abrasive slurry + high RPM accelerates wear.');
  }
  if (ctx.workflowMode === 'submersible') {
    if (ctx.submergenceDepth < 8) warnings.push('Low submergence may affect cooling and stability.');
    if (ctx.coolingMethod === 'flooded' && ctx.fluidTemp > 120) warnings.push('High fluid temp — review cooling.');
    if (ctx.powerCableLength > 200) warnings.push('Long cable — check voltage drop.');
  }
  if (ctx.workflowMode === 'selfpriming') warnings.push('Self-prime motor: include ~2 HP overhead for vacuum pump package.');
  if (ctx.availableMotorHp > 0 && best && best.recommendedMotorHp > ctx.availableMotorHp) warnings.push(`Motor limit: needs ${best.recommendedMotorHp} HP but customer available is ${ctx.availableMotorHp} HP.`);
  if (ctx.motorVoltage && ctx.motorVoltage !== '460') warnings.push(`Non-standard voltage (${ctx.motorVoltage} V) — confirm motor availability.`);
  return warnings;
}

// ── TDH calculator ─────────────────────────────────────────────────

function calcTdh() {
  const staticHead = Number($('staticHead').value || 0);
  const pipeLength = Number($('pipeLength').value || 0);
  const pipeDiameter = Number($('pipeDiameter').value || 0);
  const fittingsCount = Number($('fittingsCount').value || 0);
  const pipeFactor = Number($('pipeFactor').value || 140);
  const atmosphericPressure = Number($('atmosphericPressure').value || 14.7);
  const flowRate = toGpm(Number($('flowRate').value || 0), $('flowUnit').value);
  const sg = Number($('specificGravity').value || 1);
  const viscosity = Number($('viscosity').value || 1);
  const equivalentLength = pipeLength + (fittingsCount * pipeDiameter * 2.5);
  const frictionBase = equivalentLength * Math.pow(Math.max(flowRate, 1) / 1000, 1.85) / Math.pow(Math.max(pipeFactor, 1), 1.85) / Math.pow(Math.max(pipeDiameter, 0.25), 4.87) * 12;
  const viscosityFactor = 1 + Math.max(0, viscosity - 1) * 0.0025;
  const sgFactor = 0.98 + (sg - 1) * 0.2;
  const atmosphericFactor = Math.max(0.85, atmosphericPressure / 14.7);
  const tdhFt = staticHead + (frictionBase * viscosityFactor * sgFactor / atmosphericFactor);
  $('headValue').value = fromFeetHead(tdhFt, $('headUnit').value, sg).toFixed(2);
  validateCoreInputs();
  return tdhFt;
}

// ── Context builder ────────────────────────────────────────────────

function buildContext() {
  const flowInput = Number($('flowRate').value || 0);
  const flowUnit = $('flowUnit').value;
  const headInput = Number($('headValue').value || 0);
  const headUnit = $('headUnit').value;
  const sg = Number($('specificGravity').value || 1);
  const viscosity = Number($('viscosity').value || 1);
  const workflowMode = $('workflowMode').value;
  const pumpType = $('pumpType').value;
  const serviceFactor = Number($('motorServiceFactor').value || 1.15);
  const solidsSize = Number($('solidsSize').value || 0);
  const fluidTemp = Number($('fluidTemp').value || 70);
  const materialPreference = $('materialPreference').value;
  const percentSolidsByWeight = Number($('percentSolidsByWeight').value || 0);
  const availableMotorHp = Number($('availableMotorHp').value || 0);
  const motorVoltage = $('motorVoltage').value;
  const targetFlowGpm = toGpm(flowInput, flowUnit);
  const targetHeadFt = toFeetHead(headInput, headUnit, sg);
  const motorFrequency = Number($('motorFrequency').value || 60);
  const targetRpm = Number($('targetRpm').value || 1400);
  const useVfd = $('useVfd').value;
  const suctionLift = Number($('suctionLift').value || 0);
  const suctionHoseLength = Number($('suctionHoseLength').value || 0);
  const tankSurfacePressure = Number($('tankSurfacePressure').value || 0);
  const submergenceDepth = Number($('submergenceDepth').value || 0);
  const coolingMethod = $('coolingMethod').value;
  const powerCableLength = Number($('powerCableLength').value || 0);
  const applicationType = $('applicationType')?.value || 'Pumping';
  const fluidPenalty = 1 + Math.max(0, sg - 1) * 0.08 + Math.max(0, viscosity - 1) * 0.0015 + Math.max(0, solidsSize - 0.5) * 0.01;
  const adjustedHeadFt = targetHeadFt * fluidPenalty;
  const base = { projectName: $('projectName').value, projectRef: $('projectRef').value, applicationType, flowInput, flowUnit, headInput, headUnit, workflowMode, sg, viscosity, pumpType, serviceFactor, solidsSize, fluidTemp, materialPreference, percentSolidsByWeight, availableMotorHp, motorVoltage, motorFrequency, targetRpm, useVfd, suctionLift, suctionHoseLength, tankSurfacePressure, submergenceDepth, coolingMethod, powerCableLength, targetFlowGpm, targetHeadFt, adjustedHeadFt };
  return { ...base, modeAdjustedHeadFt: getModeAdjustedHead(base), wearPenalty: getWearPenalty(base) };
}

// ── Scoring ────────────────────────────────────────────────────────

function scoreCandidate(curvePoint, ctx, familyRows, operatingPoint) {
  const bep = findBepPoint(familyRows);
  const dutyFlow = operatingPoint?.flowGpm ?? curvePoint.flowGpm;
  const dutyHead = operatingPoint?.headFt ?? curvePoint.headFt;
  const dutyPoint = interpolateCurvePoint(familyRows, dutyFlow) || curvePoint;
  const flowError = Math.abs(dutyFlow - ctx.targetFlowGpm) / Math.max(ctx.targetFlowGpm, 1);
  const headError = Math.abs(dutyHead - ctx.modeAdjustedHeadFt) / Math.max(ctx.modeAdjustedHeadFt, 1);
  const typePenalty = ctx.pumpType === 'selfpriming' ? 0.05 : ctx.pumpType === 'submersible' ? 0.02 : 0;
  const modePenalty = ctx.workflowMode === 'selfpriming' ? 0.03 : ctx.workflowMode === 'submersible' ? 0.01 : 0;
  const solidsPenalty = Math.max(0, ctx.solidsSize - 1) * 0.01;
  const materialPenalty = ctx.materialPreference === 'abrasive' ? 0.01 : ctx.materialPreference === 'corrosive' ? 0.02 : 0;
  const selfPrimePenalty = ctx.workflowMode === 'selfpriming' ? Math.max(0, ctx.suctionLift - 18) * 0.004 + Math.max(0, ctx.suctionHoseLength - 150) * 0.0008 : 0;
  const submersiblePenalty = ctx.workflowMode === 'submersible' ? Math.max(0, 8 - ctx.submergenceDepth) * 0.01 : 0;
  const wearPenalty = ctx.wearPenalty + (ctx.workflowMode !== 'submersible' && ctx.materialPreference === 'abrasive' && ctx.targetRpm > 1500 ? 0.02 : 0);
  const customerHpPenalty = ctx.availableMotorHp > 0 && dutyPoint.powerHp * ctx.sg * ctx.serviceFactor > ctx.availableMotorHp ? 0.08 : 0;

  // ── SIZE-BAND BONUS — strongly prefer the model that matches the lead rule
  const preferredModel = recommendedModelForBand(ctx.targetFlowGpm, ctx.modeAdjustedHeadFt);
  const sizeBandBonus = (preferredModel && curvePoint.model === preferredModel) ? 0.20 : 0;
  // Penalise 5-in models if they ever appear via CSV upload
  const fiveInPenalty = /5[\s-]?in/i.test(curvePoint.rotor) || /5[\s-]?in/i.test(curvePoint.model) ? 0.40 : 0;

  let bepPenalty = 0;
  let porBand = null;
  let bepProximityPct = null;
  if (bep?.flowGpm) {
    porBand = { low: bep.flowGpm * 0.7, high: bep.flowGpm * 1.2 };
    bepProximityPct = (dutyFlow / bep.flowGpm) * 100;
    if (dutyFlow < porBand.low || dutyFlow > porBand.high) bepPenalty = 0.12;
    else if (dutyFlow < bep.flowGpm * 0.8 || dutyFlow > bep.flowGpm * 1.1) bepPenalty = 0.05;
  }

  let recommendedMotorHp = roundMotorHp(dutyPoint.powerHp * ctx.sg * ctx.serviceFactor);
  if (ctx.workflowMode === 'electric' && ctx.useVfd === 'yes' && ctx.targetRpm < 1800) {
    const minBaseMotor = (dutyPoint.powerHp * ctx.sg * ctx.serviceFactor) / Math.max(ctx.targetRpm / 1800, 0.1);
    recommendedMotorHp = roundMotorHp(minBaseMotor);
  }
  if (ctx.workflowMode === 'selfpriming') recommendedMotorHp = roundMotorHp(recommendedMotorHp + 2);

  const score = 100
    + sizeBandBonus * 100
    - fiveInPenalty * 100
    - ((flowError * 55) + (headError * 30) + ((typePenalty + modePenalty + solidsPenalty + materialPenalty + selfPrimePenalty + submersiblePenalty + wearPenalty + customerHpPenalty + bepPenalty) * 100));

  const npshMarginFt = Math.max(0, Number($('atmosphericPressure').value || 14.7) * 2.31 - Number($('staticHead').value || 0) - Math.max(0, ctx.suctionLift || 0));

  return {
    ...curvePoint, dutyFlowGpm: dutyFlow, dutyHeadFt: dutyHead, dutyEfficiencyPct: dutyPoint.efficiencyPct, dutyPowerHp: dutyPoint.powerHp, recommendedMotorHp,
    flowErrorPct: flowError * 100, headErrorPct: headError * 100, score, operatingPoint, bep, porBand, bepProximityPct, npshMarginFt,
  };
}

// ── Recommend ──────────────────────────────────────────────────────

function recommend(e) {
  if (e) e.preventDefault();
  const errors = validateCoreInputs();
  if (errors.length) return;
  const rows = activeRows();
  if (!rows.length) { alert('Load or upload pump curve data first.'); return; }

  const ctx = buildContext();
  const grouped = uniqueModels(rows).map(model => {
    const familyRows = rows.filter(r => r.model === model).sort((a,b) => a.flowGpm - b.flowGpm);
    const interpolatedDuty = interpolateCurvePoint(familyRows, ctx.targetFlowGpm);
    if (!interpolatedDuty) return null;
    const maxFlow = Math.max(...familyRows.map(r => r.flowGpm), ctx.targetFlowGpm) * 1.15;
    const systemCurve = buildSystemCurve(ctx, maxFlow);
    const operatingPoint = findOperatingPoint(familyRows, systemCurve.points) || { flowGpm: ctx.targetFlowGpm, headFt: interpolatedDuty.headFt };
    const scored = scoreCandidate(interpolatedDuty, ctx, familyRows, operatingPoint);
    return { model, familyRows, systemCurve, ...scored };
  }).filter(Boolean).sort((a,b) => b.score - a.score);

  const best = grouped[0];
  lastRecommendation = {
    ...ctx, best, scored: grouped,
    libraryCount: rows.length,
    modelCount: uniqueModels(rows).length,
    generalRecommendation: getGeneralPumpRecommendation(ctx.targetFlowGpm, ctx.modeAdjustedHeadFt),
    avoidFiveInPump: avoidFiveInPumpNote(),
    workflowNotes: getWorkflowGuidance(ctx),
    modeWarnings: getModeWarnings(ctx, best),
  };

  renderRecommendation();
  drawChart();
}

// ── Datasheet (for export) ─────────────────────────────────────────

function getModeDatasheet(r) {
  const common = [
    ['Project', r.projectName || 'Untitled'],
    ['Reference', r.projectRef || ''],
    ['Application', r.applicationType || 'Pumping'],
    ['Workflow Mode', getModeConfig(r.workflowMode).title],
    ['Lead Screening Size', r.generalRecommendation],
    ['Best Curve Match', r.best.model],
    ['Target Flow (gpm)', r.targetFlowGpm.toFixed(0)],
    ['Requested TDH (ft)', r.adjustedHeadFt.toFixed(1)],
    ['Operating Flow (gpm)', r.best.dutyFlowGpm.toFixed(0)],
    ['Operating Head (ft)', r.best.dutyHeadFt.toFixed(1)],
    ['Duty Efficiency (%)', r.best.dutyEfficiencyPct.toFixed(1)],
    ['NPSH Margin (ft)', r.best.npshMarginFt.toFixed(1)],
    ['Recommended Motor (HP)', String(r.best.recommendedMotorHp)],
  ];
  if (r.workflowMode === 'selfpriming') return { title: 'Self-Priming Datasheet', rows: common.concat([
    ['Suction Lift (ft)', r.suctionLift.toFixed(1)], ['Suction Hose (ft)', r.suctionHoseLength.toFixed(1)], ['Tank Pressure (psi)', r.tankSurfacePressure.toFixed(1)],
    ['Guidance', 'Keep lift ≤ 18 ft preferred; ~24 ft practical limit. Add ~2 HP for vacuum pump.']
  ]) };
  if (r.workflowMode === 'submersible') return { title: 'Submersible Datasheet', rows: common.concat([
    ['Submergence (ft)', r.submergenceDepth.toFixed(1)], ['Cooling', r.coolingMethod], ['Cable Length (ft)', r.powerCableLength.toFixed(1)],
    ['Guidance', 'Confirm cooling, submergence stability, and cable voltage drop.']
  ]) };
  return { title: 'Electric Process Datasheet', rows: common.concat([
    ['Frequency (Hz)', String(r.motorFrequency)], ['Target RPM', String(r.targetRpm)], ['VFD', r.useVfd],
    ['Elevation (ft)', String(Number($('elevationFt').value || 0).toFixed(0))],
    ['Atm Pressure (psi)', String(Number($('atmosphericPressure').value || 14.7).toFixed(2))],
    ['Guidance', 'Manual motor validation required, especially with VFD / reduced RPM.']
  ]) };
}

// ── Render recommendation ──────────────────────────────────────────

function renderRecommendation() {
  const r = lastRecommendation;
  const best = r.best;
  const warnings = r.modeWarnings || [];
  const porText = best.porBand ? `${best.porBand.low.toFixed(0)}–${best.porBand.high.toFixed(0)} gpm` : 'N/A';
  const bepText = best.bep ? `${best.bep.flowGpm.toFixed(0)} gpm @ ${best.bep.efficiencyPct.toFixed(1)}%` : 'N/A';

  els.summaryCards.innerHTML = `
    <div class="executive-summary">
      <div class="exec-hero">
        <div class="exec-eyebrow">Recommended pump</div>
        <div class="exec-title">${best.model}</div>
        <p class="exec-sub">Lead screen: <strong>${r.generalRecommendation}</strong>. Curve fit: <strong>${best.model}</strong> — operating at ~${best.dutyFlowGpm.toFixed(0)} gpm / ${best.dutyHeadFt.toFixed(1)} ft.</p>
        <div class="result-actions" style="margin-top:14px">
          <button type="button" class="primary" id="inlineExportHtmlBtn">Export datasheet</button>
          <button type="button" class="secondary" id="inlinePrintBtn">Print / Save PDF</button>
        </div>
      </div>
      <div class="exec-metrics">
        <div class="exec-metric"><div class="k">Lead size</div><div class="v">${r.generalRecommendation}</div></div>
        <div class="exec-metric"><div class="k">Motor</div><div class="v">${best.recommendedMotorHp} HP</div></div>
        <div class="exec-metric"><div class="k">Fit score</div><div class="v">${best.score.toFixed(1)}</div></div>
        <div class="exec-metric"><div class="k">Efficiency</div><div class="v">${best.dutyEfficiencyPct.toFixed(1)}%</div></div>
        <div class="exec-metric"><div class="k">NPSH margin</div><div class="v">${best.npshMarginFt.toFixed(1)} ft</div></div>
        <div class="exec-metric"><div class="k">BEP</div><div class="v">${bepText}</div></div>
      </div>
    </div>`;

  const topRows = r.scored.slice(0, 5).map((row, idx) => `
    <tr>
      <td>${idx === 0 ? '<span class="badge">Best Fit</span> ' : ''}${row.model}</td>
      <td>${row.rotor}</td>
      <td>${row.dutyFlowGpm.toFixed(0)}</td>
      <td>${row.dutyHeadFt.toFixed(1)}</td>
      <td>${row.dutyEfficiencyPct.toFixed(1)}%</td>
      <td>${row.recommendedMotorHp}</td>
      <td>${row.score.toFixed(1)}</td>
    </tr>`).join('');

  els.recommendationBox.className = 'recommendation';
  els.recommendationBox.innerHTML = `
    <div class="supporting-grid">
      <div class="result-note">
        <strong>Project:</strong> ${r.projectName} &nbsp;|&nbsp; <strong>Ref:</strong> ${r.projectRef} &nbsp;|&nbsp; <strong>Application:</strong> ${r.applicationType}<br>
        <strong>Workflow:</strong> ${getModeConfig(r.workflowMode).title} &nbsp;|&nbsp; <strong>Lead size:</strong> ${r.generalRecommendation}<br>
        <strong>Why this pump:</strong> Best balance of size-band match, curve intersection, BEP proximity, and workflow rules.
      </div>
      ${warnings.length ? `<div class="notice"><strong>Key warnings</strong><ul class="warning-list">${warnings.map(n => `<li>${n}</li>`).join('')}</ul></div>` : ''}
      <div class="result-note"><strong>Note:</strong> ${r.avoidFiveInPump}. Verify NPSH, solids handling, wear, and manufacturer-approved curve before release.</div>
      <div class="table-scroll-wrap"><table class="table">
        <thead><tr><th>Pump</th><th>Rotor</th><th>Op Flow</th><th>Op Head</th><th>Eff</th><th>Motor HP</th><th>Score</th></tr></thead>
        <tbody>${topRows}</tbody>
      </table></div>
    </div>`;

  const compareRows = r.scored.slice(0, 5).map(row => `
    <tr>
      <td>${row.model}</td><td>${row.source}</td><td>${row.rotor}</td>
      <td>${row.dutyFlowGpm.toFixed(0)}</td><td>${row.dutyHeadFt.toFixed(1)}</td>
      <td>${row.bepProximityPct ? row.bepProximityPct.toFixed(0) + '%' : 'N/A'}</td>
      <td>${row.flowErrorPct.toFixed(1)}%</td><td>${row.headErrorPct.toFixed(1)}%</td><td>${row.score.toFixed(1)}</td>
    </tr>`).join('');

  els.comparisonWrap.className = 'recommendation';
  els.comparisonWrap.innerHTML = `
    <p><strong>Top alternatives:</strong></p>
    <div class="table-scroll-wrap"><table class="table">
      <thead><tr><th>Model</th><th>Source</th><th>Rotor</th><th>Op Flow</th><th>Op Head</th><th>BEP Prox</th><th>Flow Err</th><th>Head Err</th><th>Score</th></tr></thead>
      <tbody>${compareRows}</tbody>
    </table></div>`;

  $('inlineExportHtmlBtn')?.addEventListener('click', exportHtml);
  $('inlinePrintBtn')?.addEventListener('click', () => window.print());
}

// ── Chart ──────────────────────────────────────────────────────────

function drawChart() {
  const svg = els.curveChart;
  svg.innerHTML = '';
  els.chartLegend.innerHTML = '';
  if (!curveRows.length || !lastRecommendation) return;

  const best = lastRecommendation.best;
  const rows = best.familyRows;
  const systemCurve = best.systemCurve.points;
  const width = 980, height = 560;
  const m = { l: 80, r: 82, t: 48, b: 72 };
  const maxFlowRaw = Math.max(...rows.map(d => d.flowGpm), ...systemCurve.map(d => d.flowGpm), lastRecommendation.targetFlowGpm, best.dutyFlowGpm);
  const maxHeadRaw = Math.max(...rows.map(d => d.headFt), ...systemCurve.map(d => d.headFt), lastRecommendation.modeAdjustedHeadFt, best.dutyHeadFt);
  const maxEffRaw = Math.max(...rows.map(d => d.efficiencyPct || 0), 40);
  const maxFlow = maxFlowRaw * 1.15;
  const maxHead = maxHeadRaw * 1.15;
  const maxEff = Math.ceil(maxEffRaw / 10) * 10;
  const plotW = width - m.l - m.r;
  const plotH = height - m.t - m.b;
  const x = v => m.l + (v / maxFlow) * plotW;
  const yHead = v => height - m.b - (v / maxHead) * plotH;
  const yEff = v => height - m.b - (v / maxEff) * plotH;

  const make = (tag, attrs = {}) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    svg.appendChild(el);
    return el;
  };

  // Defs — gradient for pump curve fill
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `<linearGradient id="pumpFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2563eb" stop-opacity="0.15"/><stop offset="100%" stop-color="#2563eb" stop-opacity="0.02"/></linearGradient>`;
  svg.appendChild(defs);

  // Background
  make('rect', { x: 0, y: 0, width, height, fill: '#ffffff', rx: 12 });

  // Title
  make('text', { x: width / 2, y: 28, 'font-size': '16', 'font-weight': '700', fill: '#0f172a', 'text-anchor': 'middle' }).textContent = `${best.model} — Pump Curve`;

  // Grid
  make('line', { x1: m.l, y1: height - m.b, x2: width - m.r, y2: height - m.b, stroke: '#94a3b8', 'stroke-width': '1.2' });
  make('line', { x1: m.l, y1: m.t, x2: m.l, y2: height - m.b, stroke: '#94a3b8', 'stroke-width': '1.2' });
  make('line', { x1: width - m.r, y1: m.t, x2: width - m.r, y2: height - m.b, stroke: '#cbd5e1', 'stroke-width': '1' });

  for (let i = 0; i <= 5; i++) {
    const flow = maxFlow * i / 5;
    const head = maxHead * i / 5;
    const eff = maxEff * i / 5;
    const gx = x(flow), gy = yHead(head);
    if (i > 0) {
      make('line', { x1: gx, y1: m.t, x2: gx, y2: height - m.b, stroke: '#e2e8f0', 'stroke-dasharray': '4 4' });
      make('line', { x1: m.l, y1: gy, x2: width - m.r, y2: gy, stroke: '#e2e8f0', 'stroke-dasharray': '4 4' });
    }
    make('text', { x: gx, y: height - m.b + 28, 'font-size': '13', fill: '#475569', 'text-anchor': 'middle' }).textContent = flow.toFixed(0);
    make('text', { x: m.l - 10, y: gy + 4, 'font-size': '13', fill: '#475569', 'text-anchor': 'end' }).textContent = head.toFixed(0);
    make('text', { x: width - m.r + 10, y: yEff(eff) + 4, 'font-size': '13', fill: '#7c3aed', 'text-anchor': 'start' }).textContent = eff.toFixed(0);
  }

  make('text', { x: (width + m.l - m.r) / 2, y: height - 14, 'font-size': '14', 'font-weight': '600', fill: '#334155', 'text-anchor': 'middle' }).textContent = 'Flow (gpm)';
  make('text', { x: 20, y: (height + m.t - m.b) / 2, 'font-size': '14', 'font-weight': '600', fill: '#334155', transform: `rotate(-90 20 ${(height + m.t - m.b) / 2})`, 'text-anchor': 'middle' }).textContent = 'Head (ft)';
  make('text', { x: width - 14, y: (height + m.t - m.b) / 2, 'font-size': '14', 'font-weight': '600', fill: '#7c3aed', transform: `rotate(90 ${width - 14} ${(height + m.t - m.b) / 2})`, 'text-anchor': 'middle' }).textContent = 'Efficiency (%)';

  // POR band
  if (best.porBand) {
    make('rect', { x: x(best.porBand.low), y: m.t, width: x(best.porBand.high) - x(best.porBand.low), height: plotH, fill: '#dcfce7', opacity: '0.4' });
  }

  // Pump curve fill
  const pumpPath = rows.map((p, i) => `${i ? 'L' : 'M'} ${x(p.flowGpm)} ${yHead(p.headFt)}`).join(' ');
  const lastPt = rows[rows.length - 1];
  const firstPt = rows[0];
  const fillPath = pumpPath + ` L ${x(lastPt.flowGpm)} ${height - m.b} L ${x(firstPt.flowGpm)} ${height - m.b} Z`;
  make('path', { d: fillPath, fill: 'url(#pumpFill)' });

  // Curves
  make('path', { d: pumpPath, fill: 'none', stroke: '#2563eb', 'stroke-width': '3.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });

  const effPath = rows.map((p, i) => `${i ? 'L' : 'M'} ${x(p.flowGpm)} ${yEff(p.efficiencyPct || 0)}`).join(' ');
  make('path', { d: effPath, fill: 'none', stroke: '#7c3aed', 'stroke-width': '2.5', 'stroke-dasharray': '6 4', 'stroke-linecap': 'round' });

  const systemPath = systemCurve.map((p, i) => `${i ? 'L' : 'M'} ${x(p.flowGpm)} ${yHead(p.headFt)}`).join(' ');
  make('path', { d: systemPath, fill: 'none', stroke: '#dc2626', 'stroke-width': '2.8', 'stroke-dasharray': '8 6', 'stroke-linecap': 'round' });

  // Data points on pump curve
  rows.forEach(p => make('circle', { cx: x(p.flowGpm), cy: yHead(p.headFt), r: 4, fill: '#2563eb', stroke: '#fff', 'stroke-width': '1.5' }));

  // BEP
  if (best.bep) {
    make('circle', { cx: x(best.bep.flowGpm), cy: yHead(best.bep.headFt), r: 8, fill: '#16a34a', stroke: '#fff', 'stroke-width': '2' });
    make('text', { x: clamp(x(best.bep.flowGpm) + 14, m.l + 20, width - m.r - 80), y: clamp(yHead(best.bep.headFt) - 12, m.t + 18, height - m.b - 18), 'font-size': '13', 'font-weight': '700', fill: '#166534' }).textContent = 'BEP';
  }

  // Requested duty point (black diamond shape via larger marker)
  const reqX = x(lastRecommendation.targetFlowGpm);
  const reqY = yHead(lastRecommendation.modeAdjustedHeadFt);
  make('rect', { x: reqX - 6, y: reqY - 6, width: 12, height: 12, fill: '#111827', transform: `rotate(45 ${reqX} ${reqY})`, rx: 2 });
  make('text', { x: clamp(reqX + 14, m.l + 20, width - m.r - 120), y: clamp(reqY - 14, m.t + 18, height - m.b - 12), 'font-size': '13', 'font-weight': '700', fill: '#111827' }).textContent = 'Requested';

  // Operating point (red circle with white ring)
  const opX = x(best.dutyFlowGpm);
  const opY = yHead(best.dutyHeadFt);
  make('circle', { cx: opX, cy: opY, r: 9, fill: '#dc2626', stroke: '#fff', 'stroke-width': '3' });
  make('text', { x: clamp(opX + 14, m.l + 20, width - m.r - 150), y: clamp(opY + 22, m.t + 18, height - m.b - 12), 'font-size': '13', 'font-weight': '700', fill: '#dc2626' }).textContent = 'Operating point';

  // Legend
  const legendItems = [
    ['#2563eb', 'line', 'Pump curve'],
    ['#dc2626', 'dash', 'System curve'],
    ['#7c3aed', 'dash', 'Efficiency'],
    ['#16a34a', 'dot', 'BEP'],
    ['#111827', 'diamond', 'Requested'],
    ['#dc2626', 'dot', 'Operating point'],
    ['#dcfce7', 'block', 'Preferred range']
  ];
  legendItems.forEach(([color, type, label]) => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    const swatchClass = type === 'block' ? 'legend-swatch legend-block' : 'legend-swatch';
    item.innerHTML = `<span class="${swatchClass}" style="background:${color}"></span>${label}`;
    els.chartLegend.appendChild(item);
  });
}

// ── Library / preview ──────────────────────────────────────────────

function renderLibrary() {
  updateFamilyFilter();
  const models = uniqueModels(curveRows).length;
  const sources = [...new Set(curveRows.map(r => r.source))].join(', ');
  els.libraryStats.textContent = `${curveRows.length} curve points loaded across ${models} models. Sources: ${sources}.`;
  const banner = document.querySelector('.default-library-banner strong');
  if (banner) banner.textContent = sources.includes('default-library') ? 'Default Eddy curve library active' : 'Custom curve library active';
  const preview = curveRows.slice(0, 16).map(r => `<tr><td>${r.model}</td><td>${r.source}</td><td>${r.rotor}</td><td>${r.flowGpm}</td><td>${r.headFt}</td><td>${r.efficiencyPct}</td><td>${r.powerHp}</td></tr>`).join('');
  els.curveTableWrap.innerHTML = `<div class="table-scroll-wrap"><table class="table"><thead><tr><th>Model</th><th>Source</th><th>Rotor</th><th>Flow gpm</th><th>Head ft</th><th>Eff %</th><th>Power HP</th></tr></thead><tbody>${preview}</tbody></table></div>`;
}

// ── Export / save / load ───────────────────────────────────────────

function exportJson() {
  if (!lastRecommendation) return alert('Run a recommendation first.');
  downloadFile('pump-curve-lab-report.json', JSON.stringify({ project: getFormValues(), curves: curveRows, recommendation: lastRecommendation }, null, 2), 'application/json');
}

function exportCsv() {
  if (!lastRecommendation) return alert('Run a recommendation first.');
  const lines = ['MODEL,SOURCE,ROTOR,OPERATING_FLOW_GPM,OPERATING_HEAD_FT,DUTY_EFFICIENCY_PCT,PUMP_HP,MOTOR_HP,SCORE'];
  lastRecommendation.scored.forEach(r => lines.push([r.model,r.source,r.rotor,r.dutyFlowGpm.toFixed(0),r.dutyHeadFt.toFixed(1),r.dutyEfficiencyPct.toFixed(1),r.dutyPowerHp.toFixed(1),r.recommendedMotorHp,r.score.toFixed(1)].join(',')));
  downloadFile('pump-curve-lab-comparison.csv', lines.join('\n'), 'text/csv');
}

function exportHtml() {
  if (!lastRecommendation) return alert('Run a recommendation first.');
  const r = lastRecommendation;
  const ds = getModeDatasheet(r);
  const rows = r.scored.map(x => `<tr><td>${x.model}</td><td>${x.source}</td><td>${x.rotor}</td><td>${x.dutyFlowGpm.toFixed(0)}</td><td>${x.dutyHeadFt.toFixed(1)}</td><td>${x.dutyEfficiencyPct.toFixed(1)}%</td><td>${x.dutyPowerHp.toFixed(1)}</td><td>${x.recommendedMotorHp}</td><td>${x.score.toFixed(1)}</td></tr>`).join('');
  const dsRows = ds.rows.map(([k,v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${ds.title}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}.brand{background:#0f172a;color:#fff;padding:18px 20px;border-radius:10px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f4f6}.note{margin-top:16px;padding:12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px}.section{margin-top:20px}</style></head><body><div class="brand"><h1>${ds.title}</h1><p>${r.projectName} | ${r.projectRef} | ${r.applicationType}</p></div><div class="section"><table><tbody>${dsRows}</tbody></table></div><div class="note">Prototype recommendation only. Verify NPSH, solids handling, wear, materials, and approved manufacturer curve fit before release.${r.modeWarnings.length ? '<ul>' + r.modeWarnings.map(n => `<li>${n}</li>`).join('') + '</ul>' : ''}</div><div class="section"><h2>Top Curve Matches</h2><table><thead><tr><th>Model</th><th>Source</th><th>Rotor</th><th>Op Flow</th><th>Op Head</th><th>Eff</th><th>Pump HP</th><th>Motor HP</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table></div></body></html>`;
  downloadFile(`${ds.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.html`, html, 'text/html');
}

function saveProject() {
  const payload = { project: getFormValues(), curvesCsv: buildCsv(curveRows) };
  downloadFile(`${($('projectName').value || 'pump-project').replace(/\s+/g,'-').toLowerCase()}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

function loadProjectFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const payload = JSON.parse(reader.result);
    if (payload.project) setFormValues(payload.project);
    if (payload.curvesCsv) curveRows = parseCsv(payload.curvesCsv, 'project-load');
    renderLibrary();
    applyWorkflowModeUI();
    updateWorkflowGuidance();
    validateCoreInputs();
    recommend();
  };
  reader.readAsText(file);
}

// ── Sticky form card logic ─────────────────────────────────────────
function checkFormSticky() {
  if (!els.formCard) return;
  const formH = els.formCard.getBoundingClientRect().height;
  const viewH = window.innerHeight;
  els.formCard.classList.toggle('is-sticky', formH < viewH - 40);
}

// ── Event wiring ───────────────────────────────────────────────────

els.useDefaultLibraryBtn.addEventListener('click', () => {
  curveRows = parseCsv(defaultLibraryCsv, 'default-library');
  renderLibrary();
  updateAtmosphericPressureFromElevation();
  applyWorkflowModeUI();
  updateWorkflowGuidance();
  validateCoreInputs();
  recommend();
  updateAutoRunStatus();
});
els.showLibraryToolsBtn.addEventListener('click', () => { if (els.libraryToolsPanel) els.libraryToolsPanel.open = true; els.libraryToolsPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
els.calcTdhBtn.addEventListener('click', calcTdh);
els.exportJsonBtn.addEventListener('click', exportJson);
els.exportCsvBtn.addEventListener('click', exportCsv);
els.exportHtmlBtn.addEventListener('click', exportHtml);
els.saveProjectBtn.addEventListener('click', saveProject);
els.loadProjectBtn.addEventListener('click', () => els.projectFile.click());
els.projectFile.addEventListener('change', e => { const file = e.target.files[0]; if (file) loadProjectFile(file); });
els.printBtn.addEventListener('click', () => window.print());
els.familyFilter.addEventListener('change', () => recommend());
$('workflowMode').addEventListener('change', () => { applyWorkflowModeUI(); updateWorkflowGuidance(); validateCoreInputs(); queueAutoRecommend('workflow mode change'); });
$('elevationFt').addEventListener('input', () => { updateAtmosphericPressureFromElevation(); queueAutoRecommend('elevation update'); });
els.appForm.addEventListener('input', e => { if (autoRunFieldSet.has(e.target.id)) { validateCoreInputs(); updateWorkflowGuidance(); queueAutoRecommend(e.target.id); } });
els.appForm.addEventListener('change', e => { if (autoRunFieldSet.has(e.target.id)) { validateCoreInputs(); updateWorkflowGuidance(); queueAutoRecommend(e.target.id); } });
els.appForm.addEventListener('submit', recommend);
els.curveFile.addEventListener('change', async e => {
  const files = [...e.target.files];
  if (!files.length) return;
  const parsed = [];
  for (const file of files) parsed.push(...parseCsv(await file.text(), file.name));
  curveRows = parsed;
  renderLibrary();
  recommend();
});
window.addEventListener('resize', checkFormSticky);

// ── Boot ───────────────────────────────────────────────────────────
curveRows = parseCsv(defaultLibraryCsv, 'default-library');
renderLibrary();
updateAtmosphericPressureFromElevation();
applyWorkflowModeUI();
updateWorkflowGuidance();
validateCoreInputs();
recommend();
updateAutoRunStatus();
checkFormSticky();
