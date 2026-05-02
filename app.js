/* ── Pump Curve Lab  ─────────────────────────────────────────────── */
/* Eddy Pump lead-screening + pump-curve recommendation engine      */
/* Static browser app — no build step required                      */

// ── Default Eddy pump library ──────────────────────────────────────
// Covers every size band from 1-in through 16-in plus HH2000.
// Existing HD-series kept for CSV-upload backward compatibility.
const defaultLibraryCsv = `MODEL,ROTOR,FLOW_GPM,HEAD_FT,EFFICIENCY_PCT,POWER_HP
HD1000,1.5 inch,0,170,0,0
HD1000,1.5 inch,1,168,5,0.1
HD1000,1.5 inch,25,155,18,0.8
HD1000,1.5 inch,60,135,28,2.0
HD1000,1.5 inch,100,110,35,3.5
HD1000,1.5 inch,150,75,30,5.5
HD1000,1.5 inch,200,35,18,7.0
HD2000,3 inch,0,90,0,0
HD2000,3 inch,50,86,12,3.0
HD2000,3 inch,100,80,20,5.5
HD2000,3 inch,180,68,28,8.5
HD2000,3 inch,260,52,32,11.0
HD2000,3 inch,340,32,28,14.0
HD2000,3 inch,390,18,20,16.0
HH2000,3 inch,0,350,0,0
HH2000,3 inch,100,330,10,12.0
HH2000,3 inch,200,295,18,20.0
HH2000,3 inch,300,255,24,28.0
HH2000,3 inch,400,205,28,36.0
HH2000,3 inch,500,145,26,44.0
HH2000,3 inch,600,80,18,52.0
HD3000,4 inch,0,130,0,0
HD3000,4 inch,100,125,10,6.0
HD3000,4 inch,200,115,18,10.0
HD3000,4 inch,350,98,26,16.0
HD3000,4 inch,500,78,30,22.0
HD3000,4 inch,650,52,28,28.0
HD3000,4 inch,780,28,20,34.0
HD4000,6 inch,0,160,0,0
HD4000,6 inch,250,150,12,15.0
HD4000,6 inch,450,135,20,25.0
HD4000,6 inch,650,115,26,36.0
HD4000,6 inch,850,90,30,48.0
HD4000,6 inch,1050,58,28,58.0
HD4000,6 inch,1200,32,22,65.0
HD6000,8 inch,0,200,0,0
HD6000,8 inch,450,188,10,35.0
HD6000,8 inch,800,172,18,55.0
HD6000,8 inch,1200,148,24,80.0
HD6000,8 inch,1600,118,28,105.0
HD6000,8 inch,2000,80,26,130.0
HD6000,8 inch,2500,35,18,160.0
HD8000,10 inch,0,230,0,0
HD8000,10 inch,1400,210,14,90.0
HD8000,10 inch,2000,190,22,130.0
HD8000,10 inch,2500,165,28,160.0
HD8000,10 inch,3000,130,30,195.0
HD8000,10 inch,3400,90,26,230.0
HD8000,10 inch,3600,65,20,250.0
HD10000,12 inch,0,240,0,0
HD10000,12 inch,1600,225,12,120.0
HD10000,12 inch,2500,205,20,180.0
HD10000,12 inch,3200,178,26,240.0
HD10000,12 inch,4000,140,30,310.0
HD10000,12 inch,4600,100,26,370.0
HD10000,12 inch,5000,65,20,420.0
HD12000,14 inch,0,180,0,0
HD12000,14 inch,2600,168,12,200.0
HD12000,14 inch,3500,152,18,300.0
HD12000,14 inch,4500,130,24,420.0
HD12000,14 inch,5500,102,28,540.0
HD12000,14 inch,6500,68,26,660.0
HD12000,14 inch,7300,35,18,780.0`;

// ── Product family info (descriptions & family names) ────────────────
const PRODUCT_FAMILY_INFO = {
  'HD1000':  { family: 'Submersible / Self-Priming Slurry Pump', desc: '1-inch submersible or self-priming slurry pump for low-flow applications' },
  'HD2000':  { family: 'Heavy-Duty Slurry Pump',                desc: '2-inch heavy-duty slurry pump for moderate flow with high solids handling' },
  'HH2000':  { family: 'High-Head Slurry Pump',                 desc: '2-inch high-head slurry pump for applications requiring 120+ ft TDH' },
  'HD3000':  { family: 'Slurry Pump',                           desc: '3-inch slurry pump for mid-range industrial and dredging applications' },
  'HD4000':  { family: 'Heavy-Duty Slurry Pump',                desc: '4-inch heavy-duty pump for high-volume slurry and dredging operations' },
  'HD6000':  { family: 'Large-Scale Slurry Pump',               desc: '6-inch pump for large-scale dredging, mining, and industrial transfer' },
  'HD8000':  { family: 'Heavy Production Slurry Pump',          desc: '8-inch pump for major dredging and high-production slurry operations' },
  'HD10000': { family: 'Large Dredge / Industrial Pump',        desc: '10-inch pump for large dredging projects and heavy industrial applications' },
  'HD12000': { family: 'Ultra-Large Slurry Pump',               desc: '12-inch pump for the largest dredging and high-volume transfer projects' },
};

// ── Size-band mapping (used for scoring bonus) ─────────────────────
const sizeBandMap = {
  'HD1000': [1, 200],
  'HD2000': [50, 390],
  'HH2000': [100, 600],   // high-head variant
  'HD3000': [100, 780],
  'HD4000': [250, 1200],
  // HD5000 intentionally excluded (5-in pump)
  'HD6000': [450, 2500],
  'HD8000': [1400, 3600],
  'HD10000': [1600, 5000],
  'HD12000': [2600, 7300],
};

let curveRows = [];
let lastRecommendation = null;
let autoRecommendTimer = null;

const fluidPresets = {
  water: { sg: 1.0, viscosity: 1, temp: 70 },
  sand_seawater: { sg: 2.65, viscosity: 1.1, temp: 70 },
  pond_silt: { sg: 1.60, viscosity: 10, temp: 70 },
  clay_homogenized: { sg: 1.44, viscosity: 1000, temp: 70 },
  clay_cuttings: { sg: 1.40, viscosity: 10, temp: 70 },
  garnet_water: { sg: 3.20, viscosity: 1.1, temp: 70 },
  lime_slurry: { sg: 2.40, viscosity: 250, temp: 70 },
  waste_water: { sg: 1.10, viscosity: 1.1, temp: 70 },
  oil_sludge: { sg: 1.00, viscosity: 200, temp: 70 },
  crude_oil: { sg: 0.85, viscosity: 660, temp: 70 },
  oil_drill_cuttings: { sg: 1.80, viscosity: 25, temp: 70 },
};

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
  formCard: $('formCard'),
};
const fieldIds = ['projectName','projectRef','applicationType','flowRate','flowUnit','headValue','headUnit','workflowMode','pumpType','specificGravity','viscosity','fluidPreset','staticHead','pipeLength','pipeDiameter','elevationFt','atmosphericPressure','pipeFactor','fittingsCount','motorServiceFactor','solidsSize','fluidTemp','materialPreference','percentSolidsByWeight','availableMotorHp','motorVoltage','motorFrequency','targetRpm','useVfd','suctionLift','suctionHoseLength','tankSurfacePressure','submergenceDepth','coolingMethod','powerCableLength','dredgingDepth','dischargeDistance','dredgingMaterialType'];
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
function activeRows() {
  const filter = els.familyFilter.value;
  if (filter !== 'all') return curveRows.filter(r => r.model === filter);
  // When "all" is selected, exclude 5-in models unless user explicitly loaded them via CSV
  return curveRows.filter(r => {
    const isFiveIn = /5[\s-]?in/i.test(r.rotor) || /5[\s-]?in/i.test(r.model);
    if (isFiveIn && r.source === 'default-library') return false;
    return true;
  });
}
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

// ── Pump affinity laws ─────────────────────────────────────────────
// Q2 = Q1 × (N2/N1)       — flow scales linearly with speed
// H2 = H1 × (N2/N1)²      — head scales with square of speed
// P2 = P1 × (N2/N1)³      — power scales with cube of speed
// Efficiency is assumed constant across speed changes.
const BASE_RPM = 1800;

function applyAffinityLaws(rows, targetRpm) {
  if (!targetRpm || targetRpm === BASE_RPM) return rows;
  const ratio = targetRpm / BASE_RPM;
  return rows.map(r => ({
    ...r,
    flowGpm: r.flowGpm * ratio,
    headFt: r.headFt * Math.pow(ratio, 2),
    powerHp: r.powerHp * Math.pow(ratio, 3),
    // Efficiency stays approximately constant per affinity laws
    efficiencyPct: r.efficiencyPct,
  }));
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
  if (flowGpm >= 1 && flowGpm < 50) return 'HD1000 (1-in)';
  if (flowGpm >= 50 && flowGpm < 200) return adjustedHeadFt > 120 ? 'HH2000 (2-in high-head)' : 'HD2000 (2-in)';
  if (flowGpm >= 200 && flowGpm < 400) return 'HD3000 (3-in)';
  if (flowGpm >= 400 && flowGpm < 900) return 'HD4000 (4-in)';
  if (flowGpm >= 900 && flowGpm < 1600) return 'HD6000 (6-in)';
  if (flowGpm >= 1600 && flowGpm < 2500) return 'HD8000 (8-in)';
  if (flowGpm >= 2500 && flowGpm < 3500) return 'HD8000 (8-in)';
  if (flowGpm >= 3500 && flowGpm < 6000) return 'HD10000 (10-in)';
  if (flowGpm >= 6000 && flowGpm <= 12000) return 'HD12000 (12-in)';
  return 'Outside standard range';
}

function getSizingRuleNote(flowGpm, adjustedHeadFt) {
  if (flowGpm >= 50 && flowGpm < 200 && adjustedHeadFt > 120) return 'High-head exception: HH2000 recommended instead of standard 2-in.';
  if (flowGpm < 5) return 'Below standard screening range — manual review recommended.';
  if (flowGpm > 12000) return 'Above standard screening range — manual review recommended.';
  return 'Based on EDDY Pump lead-screening flow bands.';
}


/** Map general recommendation text → preferred model name */
function recommendedModelForBand(flowGpm, adjustedHeadFt) {
  if (flowGpm >= 1 && flowGpm < 50) return 'HD1000';
  if (flowGpm >= 50 && flowGpm < 200) return adjustedHeadFt > 120 ? 'HH2000' : 'HD2000';
  if (flowGpm >= 200 && flowGpm < 400) return 'HD3000';
  if (flowGpm >= 400 && flowGpm < 900) return 'HD4000';
  if (flowGpm >= 900 && flowGpm < 1600) return 'HD6000';
  if (flowGpm >= 1600 && flowGpm < 2500) return 'HD8000';
  if (flowGpm >= 2500 && flowGpm < 3500) return 'HD8000';
  if (flowGpm >= 3500 && flowGpm < 6000) return 'HD10000';
  if (flowGpm >= 6000 && flowGpm <= 12000) return 'HD12000';
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
    electric:    ['electricModeFields','quickElectricFields'],
    floodedsuc:  ['electricModeFields','quickElectricFields'],
    selfpriming: ['selfPrimingModeFields','quickSelfPrimingFields'],
    submersible: ['submersibleModeFields','quickSubmersibleFields'],
  };
  Object.values(modeMap).flat().forEach(id => $(id)?.classList.add('hidden'));
  (modeMap[mode] || modeMap['electric']).forEach(id => $(id)?.classList.remove('hidden'));
  const pumpType = $('pumpType');
  if (pumpType) {
    if (mode === 'selfpriming') pumpType.value = 'selfpriming';
    if (mode === 'submersible') pumpType.value = 'submersible';
    if (mode === 'floodedsuc') pumpType.value = 'flooded';
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
  if (mode === 'floodedsuc') return {
    title: 'Flooded Suction',
    checklist: [
      'Pump centerline is below fluid source — no priming needed.',
      'Confirm positive suction head is maintained at all operating conditions.',
      'Check for water hammer risk on discharge side with long pipelines.',
      'Prefer standard rotor sizes.'
    ]
  };
  return {
    title: 'Electric Process',
    checklist: [
      'Start with customer flow, TDH, slurry properties, and operating frequency/RPM.',
      'Use interpolated family match as a screening step, then manually validate motor sizing.',
      'Prefer standard rotor sizes.'
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
  notes.push('Largest rotor principle: Select the largest diameter rotor that fits the pump casing for available HP — larger rotors at lower speed last longer in abrasive service.');
  notes.push('Use job/engineering judgment on motor sizing — manual override may be needed after VFD/RPM review.');
  if (ctx.materialPreference === 'abrasive') notes.push('Abrasive slurry: a faster small-rotor pump wears far faster than a slower large-rotor pump.');
  if (ctx.availableMotorHp > 0) notes.push('Customer motor limit entered: keep within available HP when possible.');
  return notes;
}


function updateWorkflowGuidance() {
  const ctx = buildContext();
  applyWorkflowModeUI();
  const notes = getWorkflowGuidance(ctx);
  const mode = getModeConfig(ctx.workflowMode);
  $('workflowGuidance').innerHTML = '<strong>Workflow guidance:</strong><ul>' + notes.map(n => `<li>${n}</li>`).join('') + '</ul>';
  $('modeChecklist').innerHTML = `<strong>${mode.title} checklist:</strong><ul>${mode.checklist.map(n => `<li>${n}</li>`).join('')}</ul>`;
  // Update admin summary strip
  const summaryEl = $('adminProjectSummary');
  if (summaryEl) {
    const name = $('projectName')?.value || 'Untitled';
    const ref = $('projectRef')?.value || '';
    summaryEl.textContent = ref ? `${name} — ${ref}` : name;
  }
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

function getPipeVelocityWarning(ctx) {
  const pipeDia = Number($('pipeDiameter')?.value || 0);
  if (!pipeDia || pipeDia <= 0) return null;
  const areaFt2 = Math.PI * Math.pow(pipeDia / 12 / 2, 2);
  const velocityFps = (ctx.targetFlowGpm / 448.83) / areaFt2;
  const isSand = ctx.materialPreference === 'abrasive' || ctx.applicationType === 'Dredging';
  const minVelocity = isSand ? 15 : 5;
  const materialType = isSand ? 'sand/abrasive (settling slurry)' : 'silt/sewage/clay (non-settling)';
  if (velocityFps < minVelocity) {
    return `⚠️ Pipeline velocity is ${velocityFps.toFixed(1)} ft/sec in ${pipeDia}" pipe — below the ${minVelocity} ft/sec minimum for ${materialType}. Risk of settling and plugging.`;
  }
  return null;
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
    if (ctx.workflowMode === 'electric' && ctx.useVfd === 'yes' && ctx.targetRpm && ctx.targetRpm < 1800) {
      const baseRpm = 1800;
      const speedRatio = ctx.targetRpm / baseRpm;
      const availableHpFraction = Math.pow(speedRatio, 3);
      if (best && best.recommendedMotorHp > 0) {
        const requiredBaseHp = best.recommendedMotorHp / availableHpFraction;
        const roundedBaseHp = Math.max(5, Math.ceil(requiredBaseHp / 5) * 5);
        warnings.push(`VFD cube law: At ${ctx.targetRpm} RPM (${(speedRatio*100).toFixed(0)}% of 1800), motor delivers ${(availableHpFraction*100).toFixed(0)}% of rated HP. Need ${roundedBaseHp} HP base motor to get ${best.recommendedMotorHp} HP at operating speed.`);
      }
    }
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
  const pipeWarning = getPipeVelocityWarning(ctx);
  if (pipeWarning) warnings.push(pipeWarning);
  return warnings;
}

// ── TDH calculator ─────────────────────────────────────────────────

// 1 yd³ = 201.974 US gallons
function calcProductionRate() {
  const qty = Number($('projectQuantity')?.value || 0);
  const hours = Number($('pumpingHours')?.value || 0);
  const solidsPct = Number($('productionSolidsPct')?.value || 30) / 100;
  const resultEl = $('productionResult');
  if (!qty || !hours || hours <= 0) {
    if (resultEl) resultEl.textContent = 'Enter quantity and hours to calculate.';
    return;
  }
  const yd3PerHr = qty / hours;
  const gallonsPerHr = yd3PerHr * 201.974;
  const slurryGpm = gallonsPerHr / 60 / solidsPct;
  const cleanGpm = gallonsPerHr / 60;
  if (resultEl) {
    resultEl.innerHTML = `<strong>Production:</strong> ${yd3PerHr.toFixed(1)} yd³/hr<br>` +
      `<strong>Clean flow:</strong> ${cleanGpm.toFixed(0)} GPM<br>` +
      `<strong>Slurry flow at ${(solidsPct*100).toFixed(0)}% solids:</strong> ${slurryGpm.toFixed(0)} GPM<br>` +
      `<em>Tip: Use the slurry flow value as your Flow Rate above.</em>`;
  }
}

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
  // Hard-penalise any 5-in model — only usable if someone deliberately filters to it
  const isFiveIn = /5[\s-]?in/i.test(curvePoint.rotor) || /5[\s-]?in/i.test(curvePoint.model);
  const fiveInPenalty = isFiveIn ? 0.60 : 0;

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
    const rawFamilyRows = rows.filter(r => r.model === model).sort((a,b) => a.flowGpm - b.flowGpm);
    // Apply pump affinity laws if operating at non-base RPM with VFD
    const useAffinity = ctx.workflowMode === 'electric' && ctx.useVfd === 'yes' && ctx.targetRpm && ctx.targetRpm !== BASE_RPM;
    const familyRows = useAffinity ? applyAffinityLaws(rawFamilyRows, ctx.targetRpm) : rawFamilyRows;
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
  const ctx = buildContext();
  const matRec = ctx.materialPreference === 'abrasive' ? 
    'Recommended material: <strong>High Chrome</strong> (pH 2–14, abrasive-rated). For maximum wear life with abrasive slurry, prefer lower RPM and larger rotor.' :
    ctx.materialPreference === 'corrosive' ?
    'Recommended material: <strong>316 Stainless Steel</strong> (pH 0–14, corrosion-rated). Not compatible with muriatic acids.' :
    'Standard material suitable for this application.';

  const bestFamilyInfo = PRODUCT_FAMILY_INFO[best.model] || null;
  els.summaryCards.innerHTML = `
    <div class="executive-summary">
      <div class="exec-hero">
        <div class="exec-eyebrow">${bestFamilyInfo ? bestFamilyInfo.family : 'Recommended pump'}</div>
        <div class="exec-title">${best.model}</div>
        ${bestFamilyInfo ? `<div style="font-size:13px;color:#4338ca;font-weight:600;margin-bottom:4px">${bestFamilyInfo.desc}</div>` : ''}
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
      <div class="result-note"><strong>Note:</strong> Verify NPSH, solids handling, wear, and manufacturer-approved curve before release.</div>
      <div class="result-note"><strong>Material:</strong> ${matRec}</div>
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
  // (library banner removed — always uses default or uploaded library)
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

function getChartSvgMarkup() {
  const svg = els.curveChart;
  if (!svg || !svg.innerHTML) return '';
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', '980');
  clone.setAttribute('height', '560');
  return new XMLSerializer().serializeToString(clone);
}

function getChartDataUri() {
  const markup = getChartSvgMarkup();
  if (!markup) return '';
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(markup)));
}

function exportHtml() {
  if (!lastRecommendation) return alert('Run a recommendation first.');
  const r = lastRecommendation;
  const ds = getModeDatasheet(r);
  const rows = r.scored.map(x => `<tr><td>${x.model}</td><td>${x.source}</td><td>${x.rotor}</td><td>${x.dutyFlowGpm.toFixed(0)}</td><td>${x.dutyHeadFt.toFixed(1)}</td><td>${x.dutyEfficiencyPct.toFixed(1)}%</td><td>${x.dutyPowerHp.toFixed(1)}</td><td>${x.recommendedMotorHp}</td><td>${x.score.toFixed(1)}</td></tr>`).join('');
  const dsRows = ds.rows.map(([k,v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('');
  const chartUri = getChartDataUri();
  const chartSection = chartUri ? `<div class="section"><h2>Pump Curve</h2><img src="${chartUri}" style="width:100%;max-width:980px;height:auto;border:1px solid #ddd;border-radius:10px" alt="Pump curve diagram" /></div>` : '';
  const legendHtml = `<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:10px;font-size:13px;color:#64748b"><span>🔵 Pump curve</span><span>🔴 System curve</span><span>🟣 Efficiency</span><span>🟢 BEP</span><span>⬛ Requested</span><span>🔴 Operating point</span><span>🟩 Preferred range</span></div>`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${ds.title}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111;max-width:1100px;margin:0 auto}.brand{background:#0f172a;color:#fff;padding:18px 20px;border-radius:10px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f4f6}.note{margin-top:16px;padding:12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px}.section{margin-top:24px;page-break-inside:avoid}@media print{.brand{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="brand"><h1>${ds.title}</h1><p>${r.projectName} | ${r.projectRef} | ${r.applicationType}</p></div><div class="section"><table><tbody>${dsRows}</tbody></table></div>${chartSection}${chartUri ? legendHtml : ''}<div class="note">Verify NPSH, solids handling, wear, materials, and approved manufacturer curve fit before release.${r.modeWarnings.length ? '<ul>' + r.modeWarnings.map(n => `<li>${n}</li>`).join('') + '</ul>' : ''}</div><div class="section"><h2>Top Curve Matches</h2><table><thead><tr><th>Model</th><th>Source</th><th>Rotor</th><th>Op Flow</th><th>Op Head</th><th>Eff</th><th>Pump HP</th><th>Motor HP</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table></div></body></html>`;
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
els.calcTdhBtn.addEventListener('click', () => { calcTdh(); queueAutoRecommend('TDH calculated'); });
$('calcProductionBtn')?.addEventListener('click', calcProductionRate);
$('fluidPreset')?.addEventListener('change', e => {
  const preset = fluidPresets[e.target.value];
  if (!preset) return;
  $('specificGravity').value = preset.sg;
  $('viscosity').value = preset.viscosity;
  $('fluidTemp').value = preset.temp;
  const spMirror = $('viscositySelfPrimeMirror');
  const subMirror = $('viscositySubMirror');
  if (spMirror) spMirror.value = preset.viscosity;
  if (subMirror) subMirror.value = preset.viscosity;
  validateCoreInputs();
  updateWorkflowGuidance();
  queueAutoRecommend('fluid preset');
});
// If head field is clicked while empty, hint the TDH calculator
$('headValue')?.addEventListener('focus', () => {
  const val = $('headValue').value;
  if (!val || val === '0') {
    const panel = $('tdhCalcPanel');
    if (panel && !panel.open) { panel.open = true; panel.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }
});
els.exportJsonBtn.addEventListener('click', exportJson);
els.exportCsvBtn.addEventListener('click', exportCsv);
els.exportHtmlBtn.addEventListener('click', exportHtml);
els.saveProjectBtn.addEventListener('click', saveProject);
els.loadProjectBtn.addEventListener('click', () => els.projectFile.click());
els.projectFile.addEventListener('change', e => { const file = e.target.files[0]; if (file) loadProjectFile(file); });
els.printBtn.addEventListener('click', () => window.print());
els.familyFilter.addEventListener('change', () => recommend());
$('workflowMode').addEventListener('change', () => { applyWorkflowModeUI(); updateWorkflowGuidance(); validateCoreInputs(); queueAutoRecommend('workflow mode change'); });
// Application type auto-configuration
const appTypeEl = $('applicationType');
function applyApplicationTypeDefaults(appType) {
  const slurryPanel = $('slurryPanel');
  const dredgingFields = $('quickDredgingFields');
  // Show/hide dredging-specific fields
  if (dredgingFields) dredgingFields.classList.toggle('hidden', appType !== 'Dredging');
  if (appType === 'Dredging') {
    // Auto-open slurry panel
    if (slurryPanel) slurryPanel.open = true;
    // Auto-set fluid preset to sand_seawater
    const presetEl = $('fluidPreset');
    if (presetEl && presetEl.value === 'custom') {
      presetEl.value = 'sand_seawater';
      const preset = fluidPresets['sand_seawater'];
      $('specificGravity').value = preset.sg;
      $('viscosity').value = preset.viscosity;
      $('fluidTemp').value = preset.temp;
      const spMirror = $('viscositySelfPrimeMirror');
      const subMirror = $('viscositySubMirror');
      if (spMirror) spMirror.value = preset.viscosity;
      if (subMirror) subMirror.value = preset.viscosity;
    }
  } else if (appType === 'Dewatering') {
    // Auto-set workflow to submersible if not already set
    const modeEl = $('workflowMode');
    if (modeEl && modeEl.value === 'electric') {
      modeEl.value = 'submersible';
      applyWorkflowModeUI();
    }
  }
}
if (appTypeEl) appTypeEl.addEventListener('change', () => {
  applyApplicationTypeDefaults(appTypeEl.value);
  updateWorkflowGuidance();
  validateCoreInputs();
  queueAutoRecommend('application type');
});
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
