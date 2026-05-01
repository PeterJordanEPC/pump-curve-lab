const defaultLibraryCsv = `MODEL,ROTOR,FLOW_GPM,HEAD_FT,EFFICIENCY_PCT,POWER_HP\nHD5000,12 inch,1575,30.4,29,41.6\nHD4000,10 inch,1480,29.9,28,39.4\nHD8000,17 inch,2100,75,35,120\nHD8000,17 inch,2300,65,37,130\nHD6000,14 inch,1956,50.1,34,71.8\nHD2000,8 inch,607,45,22,18\nHD3000,9.5 inch,885,40,24,26`;

let curveRows = [];
let lastRecommendation = null;

const colors = ['#2563eb','#16a34a','#dc2626','#9333ea','#ea580c','#0891b2','#4f46e5','#d97706','#0f766e'];
const els = {
  curveFile: document.getElementById('curveFile'),
  projectFile: document.getElementById('projectFile'),
  libraryStats: document.getElementById('libraryStats'),
  curveTableWrap: document.getElementById('curveTableWrap'),
  summaryCards: document.getElementById('summaryCards'),
  recommendationBox: document.getElementById('recommendationBox'),
  comparisonWrap: document.getElementById('comparisonWrap'),
  curveChart: document.getElementById('curveChart'),
  chartLegend: document.getElementById('chartLegend'),
  useDefaultLibraryBtn: document.getElementById('useDefaultLibraryBtn'),
  showLibraryToolsBtn: document.getElementById('showLibraryToolsBtn'),
  libraryToolsPanel: document.getElementById('libraryToolsPanel'),
  calcTdhBtn: document.getElementById('calcTdhBtn'),
  exportJsonBtn: document.getElementById('exportJsonBtn'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  exportHtmlBtn: document.getElementById('exportHtmlBtn'),
  saveProjectBtn: document.getElementById('saveProjectBtn'),
  loadProjectBtn: document.getElementById('loadProjectBtn'),
  printBtn: document.getElementById('printBtn'),
  appForm: document.getElementById('appForm'),
  familyFilter: document.getElementById('familyFilter'),
};
const fieldIds = ['projectName','projectRef','flowRate','flowUnit','headValue','headUnit','workflowMode','pumpType','specificGravity','viscosity','staticHead','pipeLength','pipeDiameter','elevationFt','atmosphericPressure','pipeFactor','fittingsCount','motorServiceFactor','solidsSize','fluidTemp','materialPreference','percentSolidsByWeight','availableMotorHp','motorVoltage','motorFrequency','targetRpm','useVfd','suctionLift','suctionHoseLength','tankSurfacePressure','submergenceDepth','coolingMethod','powerCableLength'];

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
function buildCsv(rows){
  return ['MODEL,SOURCE,ROTOR,FLOW_GPM,HEAD_FT,EFFICIENCY_PCT,POWER_HP', ...rows.map(r => [r.model,r.source,r.rotor,r.flowGpm,r.headFt,r.efficiencyPct,r.powerHp].join(','))].join('\n');
}
function toGpm(value, unit) { if (unit === 'm3h') return value * 4.40287; if (unit === 'lps') return value * 15.8503; return value; }
function fromFeetHead(value, unit, sg=1) { if (unit === 'm') return value / 3.28084; if (unit === 'psi') return value * sg / 2.31; if (unit === 'bar') return value / 33.455; return value; }
function toFeetHead(value, unit, sg=1) { if (unit === 'm') return value * 3.28084; if (unit === 'psi') return value * 2.31 / sg; if (unit === 'bar') return value * 33.455 / sg; return value; }
function downloadFile(name, content, type) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }
function uniqueModels(rows) { return [...new Set(rows.map(r => r.model))].sort(); }
function activeRows() { const filter = els.familyFilter.value; return filter === 'all' ? curveRows : curveRows.filter(r => r.model === filter); }
function updateFamilyFilter() { const current = els.familyFilter.value; const models = uniqueModels(curveRows); els.familyFilter.innerHTML = `<option value="all">All loaded models</option>${models.map(m => `<option value="${m}">${m}</option>`).join('')}`; if (models.includes(current)) els.familyFilter.value = current; }
function getFormValues(){ const out={}; fieldIds.forEach(id => out[id] = document.getElementById(id).value); return out; }
function setFormValues(values={}){ fieldIds.forEach(id => { if (values[id] !== undefined) document.getElementById(id).value = values[id]; }); }

function interpolateFamily(modelRows, targetFlow) {
  const pts = modelRows.filter(r => Number.isFinite(r.flowGpm) && Number.isFinite(r.headFt)).sort((a,b)=>a.flowGpm-b.flowGpm);
  if (pts.length === 0) return null;
  if (pts.length === 1) return {...pts[0], interpolated: true};
  let lower = pts[0], upper = pts[pts.length - 1];
  for (let i = 0; i < pts.length - 1; i++) {
    if (targetFlow >= pts[i].flowGpm && targetFlow <= pts[i+1].flowGpm) { lower = pts[i]; upper = pts[i+1]; break; }
  }
  const span = upper.flowGpm - lower.flowGpm || 1;
  const t = Math.max(0, Math.min(1, (targetFlow - lower.flowGpm) / span));
  const lerp = (a,b) => a + (b-a) * t;
  return {
    model: lower.model,
    rotor: lower.rotor || upper.rotor,
    source: lower.source,
    flowGpm: targetFlow,
    headFt: lerp(lower.headFt, upper.headFt),
    efficiencyPct: lerp(lower.efficiencyPct || 0, upper.efficiencyPct || 0),
    powerHp: lerp(lower.powerHp || 0, upper.powerHp || 0),
    interpolated: true,
  };
}


function getGeneralPumpRecommendation(flowGpm, adjustedHeadFt) {
  if (flowGpm >= 5 && flowGpm < 50) return '1-in Pump';
  if (flowGpm >= 50 && flowGpm < 200) {
    if (adjustedHeadFt > 120) return 'HH2000';
    return '2-in Pump';
  }
  if (flowGpm >= 200 && flowGpm < 400) return '3-in Pump';
  if (flowGpm >= 400 && flowGpm < 900) return '4-in Pump';
  if (flowGpm >= 900 && flowGpm < 1600) return '6-in Pump';
  if (flowGpm >= 1600 && flowGpm < 2500) return '8-in Pump';
  if (flowGpm >= 2500 && flowGpm < 3500) return '10-in Pump';
  if (flowGpm >= 3500 && flowGpm < 6000) return '12-in Pump';
  if (flowGpm >= 6000 && flowGpm <= 12000) return '16-in Pump';
  return 'Outside current general recommendation band';
}

function avoidFiveInPumpNote() {
  return 'Avoid 5-in pump when making suggestions';
}




function applyWorkflowModeUI() {
  const mode = document.getElementById('workflowMode').value;
  const electric = document.getElementById('electricModeFields');
  const selfp = document.getElementById('selfPrimingModeFields');
  const subm = document.getElementById('submersibleModeFields');
  if (electric) electric.classList.toggle('hidden', mode !== 'electric');
  if (selfp) selfp.classList.toggle('hidden', mode !== 'selfpriming');
  if (subm) subm.classList.toggle('hidden', mode !== 'submersible');

  const pumpType = document.getElementById('pumpType');
  if (pumpType) {
    if (mode === 'selfpriming') pumpType.value = 'selfpriming';
    if (mode === 'submersible') pumpType.value = 'submersible';
    if (mode === 'electric' && pumpType.value === 'selfpriming') pumpType.value = 'flooded';
  }
}


function updateAtmosphericPressureFromElevation() {
  const elevationFt = Number(document.getElementById('elevationFt').value || 0);
  const atm = 14.7 * Math.pow(1 - 6.8754e-6 * elevationFt, 5.2559);
  document.getElementById('atmosphericPressure').value = Math.max(atm, 0).toFixed(2);
}

function getModeConfig(mode) {
  if (mode === 'selfpriming') {
    return {
      title: 'Self-Priming',
      checklist: [
        'Use suction lift logic, not just discharge TDH.',
        'Keep suction lift at or below 18 ft preferred.',
        'Treat ~24 ft suction lift as a practical hard warning zone.',
        'Watch suction hose length closely, roughly 150 to 200 ft max preferred.',
        'If suction head available goes negative, treat as a design failure until proven otherwise.'
      ]
    };
  }
  if (mode === 'submersible') {
    return {
      title: 'Submersible',
      checklist: [
        'Assume flooded suction and focus on duty point, slurry properties, and motor loading.',
        'Verify cable, cooling, and submergence constraints separately.',
        'Check solids size and wear material suitability for submerged service.'
      ]
    };
  }
  return {
    title: 'Electric Process',
    checklist: [
      'Start with customer flow, TDH, slurry properties, and operating frequency/RPM assumptions.',
      'Use interpolated family match as a screening step, then manually validate motor sizing.',
      'Prefer standard rotor sizes and avoid 5-in pumps unless strongly justified.'
    ]
  };
}

function getWorkflowGuidance(ctx) {
  const notes = [];
  if (ctx.pumpType === 'selfpriming') {
    notes.push('Self-priming workflow: use suction lift in the TDH calculator, keep lift at or below 18 ft preferred, and treat ~24 ft as a practical hard limit.');
    notes.push('Self-priming suction hose should generally stay around 150 to 200 ft max before the design becomes risky.');
  }
  if (ctx.pumpType !== 'selfpriming') {
    notes.push('Electric / flooded workflow: start from customer flow, TDH, slurry properties, then interpolate the family curve and manually validate motor sizing.');
  }
  if (ctx.targetFlowGpm >= 50 && ctx.targetFlowGpm < 200 && ctx.adjustedHeadFt > 120) {
    notes.push('High-head exception triggered: in the 50 to 200 GPM band with head above 120 ft, prefer HH2000.');
  }
  notes.push('Avoid 5-in pump recommendations unless there is a very strong reason to override the standard sizing rule.');
  notes.push('Use Job/engineering judgment on motor sizing. PumpFlo training showed manual override may be needed after VFD or RPM review.');
  if (ctx.materialPreference === 'abrasive') notes.push('Abrasive-slurry training note: a faster small-rotor pump can wear far faster than a slower large-rotor pump moving the same solids.');
  if (ctx.availableMotorHp > 0) notes.push('Customer motor limit entered: keep recommendations within available installed horsepower when possible.');
  return notes;
}

function updateWorkflowGuidance() {
  const ctx = buildContext();
  applyWorkflowModeUI();
  const notes = getWorkflowGuidance(ctx);
  const mode = getModeConfig(ctx.workflowMode);
  const box = document.getElementById('workflowGuidance');
  const checklist = document.getElementById('modeChecklist');
  if (box) box.innerHTML = '<strong>PumpFlo-style workflow guidance:</strong><ul>' + notes.map(n => `<li>${n}</li>`).join('') + '</ul>';
  if (checklist) checklist.innerHTML = `<strong>${mode.title} checklist:</strong><ul>${mode.checklist.map(n => `<li>${n}</li>`).join('')}</ul>`;
}



function getWearPenalty(ctx) {
  const abrasive = ctx.materialPreference === 'abrasive' ? 1 : 0;
  const solidsFactor = Math.max(0, ctx.percentSolidsByWeight - 20) * 0.002;
  const rpmFactor = Math.max(0, ctx.targetRpm - 1200) * 0.0008;
  return abrasive * (0.03 + solidsFactor + rpmFactor);
}

function getVfdAvailableHp(baseMotorHp, targetRpm, baseRpm) {
  const ratio = Math.max(targetRpm, 0) / Math.max(baseRpm, 1);
  return baseMotorHp * ratio;
}

function getModeAdjustedHead(ctx) {
  let adjusted = ctx.adjustedHeadFt;
  if (ctx.workflowMode === 'selfpriming') {
    adjusted += ctx.suctionLift * 0.9;
    adjusted += Math.max(0, ctx.suctionHoseLength - 100) * 0.03;
    adjusted -= ctx.tankSurfacePressure * 1.5;
  }
  if (ctx.workflowMode === 'submersible') {
    adjusted += Math.max(0, 8 - ctx.submergenceDepth) * 1.5;
  }
  return Math.max(adjusted, 0);
}

function getModeWarnings(ctx, best) {
  const warnings = [];
  if (ctx.workflowMode === 'selfpriming') {
    if (ctx.suctionLift > 18) warnings.push('Self-prime warning: suction lift is above the preferred 18 ft guideline.');
    if (ctx.suctionLift >= 24) warnings.push('Self-prime danger: suction lift is near/above the practical hard limit around 24 ft.');
    if (ctx.suctionHoseLength > 200) warnings.push('Self-prime warning: suction hose length is above the usual 150 to 200 ft practical range.');
  }
  if (ctx.workflowMode === 'electric') {
    if (ctx.useVfd === 'yes' && ctx.targetRpm < 1800) warnings.push(`Electric mode note: VFD / reduced RPM selected. Base motor HP must be checked against reduced-speed available HP, not just pump HP at duty point.`);
    if (ctx.materialPreference === 'abrasive' && ctx.targetRpm > 1500) warnings.push('Wear warning: abrasive slurry plus higher RPM will accelerate wear. Prefer a larger rotor / lower-speed solution when possible.');
    if (best && best.recommendedMotorHp < best.powerHp * ctx.sg) warnings.push('Motor sizing warning: recommended motor is close to calculated pump power after SG adjustment.');
  }
  if (ctx.workflowMode === 'submersible') {
    if (ctx.submergenceDepth < 8) warnings.push('Submersible warning: low submergence may affect cooling and stable operation.');
    if (ctx.coolingMethod === 'flooded' && ctx.fluidTemp > 120) warnings.push('Submersible warning: higher fluid temperature may require cooling review.');
    if (ctx.powerCableLength > 200) warnings.push('Submersible note: long power cable length should be checked for voltage drop.');
  }
  if (ctx.workflowMode === 'selfpriming') {
    warnings.push('Self-prime motor note: include roughly 2 HP overhead for the vacuum pump package during final engineering review.');
  }
  if (ctx.availableMotorHp > 0 && best && best.recommendedMotorHp > ctx.availableMotorHp) {
    warnings.push(`Customer motor limit warning: best-fit recommendation wants ${best.recommendedMotorHp} HP but customer available motor is ${ctx.availableMotorHp} HP.`);
  }
  if (ctx.motorVoltage && ctx.motorVoltage !== '460') {
    warnings.push(`Motor voltage note: customer requested ${ctx.motorVoltage} V, so final motor availability and pricing should be confirmed.`);
  }
  return warnings;
}

function calcTdh() {
  const staticHead = Number(document.getElementById('staticHead').value || 0);
  const pipeLength = Number(document.getElementById('pipeLength').value || 0);
  const pipeDiameter = Number(document.getElementById('pipeDiameter').value || 0);
  const fittingsCount = Number(document.getElementById('fittingsCount').value || 0);
  const pipeFactor = Number(document.getElementById('pipeFactor').value || 140);
  const atmosphericPressure = Number(document.getElementById('atmosphericPressure').value || 14.7);
  const flowRate = toGpm(Number(document.getElementById('flowRate').value || 0), document.getElementById('flowUnit').value);
  const sg = Number(document.getElementById('specificGravity').value || 1);
  const viscosity = Number(document.getElementById('viscosity').value || 1);
  const equivalentLength = pipeLength + (fittingsCount * pipeDiameter * 2.5);
  const frictionBase = equivalentLength * Math.pow(Math.max(flowRate, 1) / 1000, 1.85) / Math.pow(Math.max(pipeFactor, 1), 1.85) / Math.pow(Math.max(pipeDiameter, 0.25), 4.87) * 12;
  const viscosityFactor = 1 + Math.max(0, viscosity - 1) * 0.0025;
  const sgFactor = 0.98 + (sg - 1) * 0.2;
  const atmosphericFactor = Math.max(0.85, atmosphericPressure / 14.7);
  const tdhFt = staticHead + (frictionBase * viscosityFactor * sgFactor / atmosphericFactor);
  document.getElementById('headValue').value = fromFeetHead(tdhFt, document.getElementById('headUnit').value, sg).toFixed(2);
  return tdhFt;
}

function buildContext() {
  const flowInput = Number(document.getElementById('flowRate').value || 0);
  const flowUnit = document.getElementById('flowUnit').value;
  const headInput = Number(document.getElementById('headValue').value || 0);
  const headUnit = document.getElementById('headUnit').value;
  const sg = Number(document.getElementById('specificGravity').value || 1);
  const viscosity = Number(document.getElementById('viscosity').value || 1);
  const workflowMode = document.getElementById('workflowMode').value;
  const pumpType = document.getElementById('pumpType').value;
  const serviceFactor = Number(document.getElementById('motorServiceFactor').value || 1.15);
  const solidsSize = Number(document.getElementById('solidsSize').value || 0);
  const fluidTemp = Number(document.getElementById('fluidTemp').value || 70);
  const materialPreference = document.getElementById('materialPreference').value;
  const percentSolidsByWeight = Number(document.getElementById('percentSolidsByWeight').value || 0);
  const availableMotorHp = Number(document.getElementById('availableMotorHp').value || 0);
  const motorVoltage = document.getElementById('motorVoltage').value;
  const targetFlowGpm = toGpm(flowInput, flowUnit);
  const targetHeadFt = toFeetHead(headInput, headUnit, sg);
  const motorFrequency = Number(document.getElementById('motorFrequency').value || 60);
  const targetRpm = Number(document.getElementById('targetRpm').value || 1400);
  const useVfd = document.getElementById('useVfd').value;
  const suctionLift = Number(document.getElementById('suctionLift').value || 0);
  const suctionHoseLength = Number(document.getElementById('suctionHoseLength').value || 0);
  const tankSurfacePressure = Number(document.getElementById('tankSurfacePressure').value || 0);
  const submergenceDepth = Number(document.getElementById('submergenceDepth').value || 0);
  const coolingMethod = document.getElementById('coolingMethod').value;
  const powerCableLength = Number(document.getElementById('powerCableLength').value || 0);
  const fluidPenalty = 1 + Math.max(0, sg - 1) * 0.08 + Math.max(0, viscosity - 1) * 0.0015 + Math.max(0, solidsSize - 0.5) * 0.01;
  const adjustedHeadFt = targetHeadFt * fluidPenalty;
  const base = { projectName: document.getElementById('projectName').value, projectRef: document.getElementById('projectRef').value, flowInput, flowUnit, headInput, headUnit, workflowMode, sg, viscosity, pumpType, serviceFactor, solidsSize, fluidTemp, materialPreference, percentSolidsByWeight, availableMotorHp, motorVoltage, motorFrequency, targetRpm, useVfd, suctionLift, suctionHoseLength, tankSurfacePressure, submergenceDepth, coolingMethod, powerCableLength, targetFlowGpm, targetHeadFt, adjustedHeadFt };
  return { ...base, modeAdjustedHeadFt: getModeAdjustedHead(base), wearPenalty: getWearPenalty(base) };
}

function recommend(e) {
  if (e) e.preventDefault();
  const rows = activeRows();
  if (!rows.length) { alert('Load or upload pump curve data first.'); return; }
  const ctx = buildContext();
  const families = uniqueModels(rows).map(model => interpolateFamily(rows.filter(r => r.model === model), ctx.targetFlowGpm)).filter(Boolean);
  const scored = families.map(row => {
    const flowError = Math.abs(row.flowGpm - ctx.targetFlowGpm) / Math.max(ctx.targetFlowGpm, 1);
    const headError = Math.abs(row.headFt - ctx.modeAdjustedHeadFt) / Math.max(ctx.modeAdjustedHeadFt, 1);
    const typePenalty = ctx.pumpType === 'selfpriming' ? 0.05 : ctx.pumpType === 'submersible' ? 0.02 : 0;
    const modePenalty = ctx.workflowMode === 'selfpriming' ? 0.03 : ctx.workflowMode === 'submersible' ? 0.01 : 0;
    const solidsPenalty = Math.max(0, ctx.solidsSize - 1) * 0.01;
    const materialPenalty = ctx.materialPreference === 'abrasive' ? 0.01 : ctx.materialPreference === 'corrosive' ? 0.02 : 0;
    const selfPrimePenalty = ctx.workflowMode === 'selfpriming' ? Math.max(0, ctx.suctionLift - 18) * 0.004 + Math.max(0, ctx.suctionHoseLength - 150) * 0.0008 : 0;
    const submersiblePenalty = ctx.workflowMode === 'submersible' ? Math.max(0, 8 - ctx.submergenceDepth) * 0.01 : 0;
    const wearPenalty = ctx.wearPenalty + (ctx.workflowMode !== 'submersible' && ctx.materialPreference === 'abrasive' && ctx.targetRpm > 1500 ? 0.02 : 0);
    const customerHpPenalty = ctx.availableMotorHp > 0 && row.powerHp * ctx.sg * ctx.serviceFactor > ctx.availableMotorHp ? 0.08 : 0;
    const score = 100 - ((flowError * 65) + (headError * 35) + ((typePenalty + modePenalty + solidsPenalty + materialPenalty + selfPrimePenalty + submersiblePenalty + wearPenalty + customerHpPenalty) * 100));
    let recommendedMotorHp = Math.ceil((row.powerHp * ctx.sg * ctx.serviceFactor) / 5) * 5;
    if (ctx.workflowMode === 'electric' && ctx.useVfd === 'yes' && ctx.targetRpm < 1800) {
      const minBaseMotor = (row.powerHp * ctx.sg * ctx.serviceFactor) / Math.max(ctx.targetRpm / 1800, 0.1);
      recommendedMotorHp = Math.ceil(minBaseMotor / 5) * 5;
    }
    if (ctx.workflowMode === 'selfpriming') {
      recommendedMotorHp = Math.ceil((recommendedMotorHp + 2) / 5) * 5;
    }
    return { ...row, score, recommendedMotorHp, flowErrorPct: flowError * 100, headErrorPct: headError * 100 };
  }).sort((a,b) => b.score - a.score);
  const best = scored[0];
  lastRecommendation = { 
    ...ctx,
    best,
    scored,
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


function getModeDatasheet(r) {
  const common = [
    ['Project', r.projectName || 'Untitled'],
    ['Reference', r.projectRef || ''],
    ['Workflow Mode', getModeConfig(r.workflowMode).title],
    ['Best Pump', r.best.model],
    ['General Recommendation', r.generalRecommendation],
    ['Curve Recommendation', r.best.model],
    ['Target Flow (gpm)', r.targetFlowGpm.toFixed(0)],
    ['Adjusted TDH (ft)', r.adjustedHeadFt.toFixed(1)],
    ['Mode Adjusted TDH (ft)', r.modeAdjustedHeadFt.toFixed(1)],
    ['Specific Gravity', r.sg.toFixed(2)],
    ['Viscosity (cP)', r.viscosity.toFixed(1)],
    ['Recommended Motor (HP)', String(r.best.recommendedMotorHp)],
  ];
  if (r.workflowMode === 'selfpriming') {
    return {
      title: 'Self-Priming Datasheet',
      rows: common.concat([
        ['Suction Lift (ft)', r.suctionLift.toFixed(1)],
        ['Suction Hose Length (ft)', r.suctionHoseLength.toFixed(1)],
        ['Tank Surface Pressure (psi)', r.tankSurfacePressure.toFixed(1)],
        ['Guidance', 'Keep suction lift at or below 18 ft preferred, with ~24 ft practical hard warning.'],
        ['Vacuum Pump Overhead', 'Add about 2 HP overhead during final self-prime motor review.']
      ])
    };
  }
  if (r.workflowMode === 'submersible') {
    return {
      title: 'Submersible Datasheet',
      rows: common.concat([
        ['Submergence Depth (ft)', r.submergenceDepth.toFixed(1)],
        ['Cooling Method', r.coolingMethod],
        ['Power Cable Length (ft)', r.powerCableLength.toFixed(1)],
        ['Guidance', 'Confirm cooling, submergence stability, and cable voltage drop before release.']
      ])
    };
  }
  return {
    title: 'Electric Process Datasheet',
    rows: common.concat([
      ['Motor Frequency (Hz)', String(r.motorFrequency)],
      ['Target RPM', String(r.targetRpm)],
      ['VFD Used', r.useVfd],
      ['Elevation (ft)', String(Number(document.getElementById('elevationFt').value || 0).toFixed(0))],
      ['Atmospheric Pressure (psi)', String(Number(document.getElementById('atmosphericPressure').value || 14.7).toFixed(2))],
      ['Guidance', 'Manual motor validation is still required, especially when reducing RPM with a VFD.'],
      ['Wear Guidance', 'For abrasive slurry, prefer lower RPM / larger rotor where practical to reduce wear.']
    ])
  };
}

function renderRecommendation() {
  const r = lastRecommendation; const best = r.best;
  const warnings = r.modeWarnings || [];
  els.summaryCards.innerHTML = `
    <div class="executive-summary">
      <div class="exec-hero">
        <div class="exec-eyebrow">Recommended pump</div>
        <div class="exec-title">${best.model}</div>
        <p class="exec-sub">${getModeConfig(r.workflowMode).title} mode, ${r.targetFlowGpm.toFixed(0)} gpm target, ${r.modeAdjustedHeadFt.toFixed(1)} ft mode-adjusted TDH.</p>
        <div class="result-actions">
          <button type="button" class="primary" id="inlineExportHtmlBtn">Export datasheet</button>
          <button type="button" class="secondary" id="inlinePrintBtn">Print / Save PDF</button>
        </div>
      </div>
      <div class="exec-metrics">
        <div class="exec-metric"><div class="k">Recommended motor</div><div class="v">${best.recommendedMotorHp} HP</div></div>
        <div class="exec-metric"><div class="k">General size band</div><div class="v">${r.generalRecommendation}</div></div>
        <div class="exec-metric"><div class="k">Rotor</div><div class="v">${best.rotor || 'TBD'}</div></div>
        <div class="exec-metric"><div class="k">Fit score</div><div class="v">${best.score.toFixed(1)}</div></div>
      </div>
    </div>`;
  const rows = r.scored.slice(0, 5).map((row, idx) => `
    <tr>
      <td>${idx === 0 ? '<span class="badge">Best Fit</span> ' : ''}${row.model}</td>
      <td>${row.rotor}</td>
      <td>${row.flowGpm.toFixed(0)}</td>
      <td>${row.headFt.toFixed(1)}</td>
      <td>${row.powerHp.toFixed(1)}</td>
      <td>${row.recommendedMotorHp}</td>
      <td>${row.score.toFixed(1)}</td>
    </tr>`).join('');
  els.recommendationBox.className = 'recommendation';
  els.recommendationBox.innerHTML = `
    <div class="supporting-grid">
      <div class="result-note">
        <strong>Project:</strong> ${r.projectName} <br><strong>Reference:</strong> ${r.projectRef}<br>
        <strong>Workflow mode:</strong> ${getModeConfig(r.workflowMode).title}<br>
        <strong>Why this pump:</strong> Best interpolated fit for the requested duty point, fluid penalty, and workflow-specific rules.
      </div>
      ${warnings.length ? `<div class="notice"><strong>Key warnings</strong><ul class="warning-list">${warnings.map(n => `<li>${n}</li>`).join('')}</ul></div>` : ''}
      <div class="result-note">
        <strong>Engineering note:</strong> ${r.avoidFiveInPump}. Final release should still confirm NPSH, solids handling, wear, and manufacturer-approved curve suitability.
      </div>
      <table class="table">
        <thead><tr><th>Pump</th><th>Rotor</th><th>Flow gpm</th><th>Head ft</th><th>Pump HP</th><th>Motor HP</th><th>Score</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  const compareRows = r.scored.slice(0,5).map(row => `
    <tr>
      <td>${row.model}</td>
      <td>${row.source}</td>
      <td>${row.rotor}</td>
      <td>${row.flowGpm.toFixed(0)}</td>
      <td>${row.headFt.toFixed(1)}</td>
      <td>${row.flowErrorPct.toFixed(1)}%</td>
      <td>${row.headErrorPct.toFixed(1)}%</td>
      <td>${row.score.toFixed(1)}</td>
    </tr>`).join('');
  els.comparisonWrap.className = 'recommendation';
  els.comparisonWrap.innerHTML = `
    <p><strong>Top alternatives:</strong> Compare the leading candidates without cluttering the main recommendation.</p>
    <table class="table"><thead><tr><th>Model</th><th>Source</th><th>Rotor</th><th>Interpolated Flow</th><th>Interpolated Head</th><th>Flow Error</th><th>Head Error</th><th>Score</th></tr></thead><tbody>${compareRows}</tbody></table>`;
  document.getElementById('inlineExportHtmlBtn')?.addEventListener('click', exportHtml);
  document.getElementById('inlinePrintBtn')?.addEventListener('click', () => window.print());
}

function drawChart() {
  const svg = els.curveChart; svg.innerHTML = ''; els.chartLegend.innerHTML = '';
  if (!curveRows.length || !lastRecommendation) return;
  const rows = activeRows(); const width = 900, height = 420, m = {l:60,r:20,t:20,b:50};
  const maxFlow = Math.max(...rows.map(d => d.flowGpm), lastRecommendation.targetFlowGpm) * 1.1;
  const maxHead = Math.max(...rows.map(d => d.headFt), lastRecommendation.adjustedHeadFt) * 1.15;
  const x = v => m.l + (v / maxFlow) * (width - m.l - m.r); const y = v => height - m.b - (v / maxHead) * (height - m.t - m.b);
  const models = uniqueModels(rows);
  const make = (tag, attrs={}) => { const el = document.createElementNS('http://www.w3.org/2000/svg', tag); Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k,v)); svg.appendChild(el); return el; };
  make('line', {x1:m.l,y1:height-m.b,x2:width-m.r,y2:height-m.b,stroke:'#94a3b8'}); make('line', {x1:m.l,y1:m.t,x2:m.l,y2:height-m.b,stroke:'#94a3b8'});
  for(let i=0;i<6;i++){ const fx = maxFlow*i/5, hy = maxHead*i/5; make('text',{x:x(fx),y:height-m.b+20,'font-size':'12',fill:'#64748b','text-anchor':'middle'}).textContent = fx.toFixed(0); make('text',{x:m.l-8,y:y(hy)+4,'font-size':'12',fill:'#64748b','text-anchor':'end'}).textContent = hy.toFixed(0); if(i<5){ make('line',{x1:x(fx),y1:m.t,x2:x(fx),y2:height-m.b,stroke:'#e2e8f0'}); make('line',{x1:m.l,y1:y(hy),x2:width-m.r,y2:y(hy),stroke:'#e2e8f0'}); } }
  make('text',{x:width/2,y:height-10,'font-size':'13',fill:'#475569','text-anchor':'middle'}).textContent='Flow (gpm)'; make('text',{x:18,y:height/2,'font-size':'13',fill:'#475569',transform:`rotate(-90 18 ${height/2})`,'text-anchor':'middle'}).textContent='Head (ft)';
  models.forEach((model, idx) => { const pts = rows.filter(d => d.model === model).sort((a,b)=>a.flowGpm-b.flowGpm); const d = pts.map((p,i)=>`${i?'L':'M'} ${x(p.flowGpm)} ${y(p.headFt)}`).join(' '); const color = colors[idx % colors.length]; make('path',{d,fill:'none',stroke:color,'stroke-width':'2.5'}); const item = document.createElement('div'); item.className = 'legend-item'; item.innerHTML = `<span class="legend-swatch" style="background:${color}"></span>${model}`; els.chartLegend.appendChild(item); });
  const best = lastRecommendation.best; make('circle',{cx:x(lastRecommendation.targetFlowGpm),cy:y(lastRecommendation.adjustedHeadFt),r:7,fill:'#111827'}); make('text',{x:x(lastRecommendation.targetFlowGpm)+10,y:y(lastRecommendation.adjustedHeadFt)-10,'font-size':'12',fill:'#111827'}).textContent='Requested duty point'; make('circle',{cx:x(best.flowGpm),cy:y(best.headFt),r:7,fill:'#dc2626'}); make('text',{x:x(best.flowGpm)+10,y:y(best.headFt)+16,'font-size':'12',fill:'#dc2626'}).textContent=`${best.model} operating point`;
}

function renderLibrary() {
  updateFamilyFilter();
  const models = uniqueModels(curveRows).length;
  const sources = [...new Set(curveRows.map(r => r.source))].join(', ');
  els.libraryStats.textContent = `${curveRows.length} curve points loaded across ${models} models. Sources: ${sources}.`;
  const banner = document.querySelector('.default-library-banner strong');
  if (banner) banner.textContent = sources.includes('default-library') ? 'Default Eddy curve library active' : 'Custom curve library active';
  const preview = curveRows.slice(0, 12).map(r => `<tr><td>${r.model}</td><td>${r.source}</td><td>${r.rotor}</td><td>${r.flowGpm}</td><td>${r.headFt}</td><td>${r.efficiencyPct}</td><td>${r.powerHp}</td></tr>`).join('');
  els.curveTableWrap.innerHTML = `<table class="table"><thead><tr><th>Model</th><th>Source</th><th>Rotor</th><th>Flow gpm</th><th>Head ft</th><th>Eff %</th><th>Power HP</th></tr></thead><tbody>${preview}</tbody></table>`;
}

function exportJson() { if (!lastRecommendation) return alert('Run a recommendation first.'); downloadFile('pump-curve-lab-report.json', JSON.stringify({ project: getFormValues(), curves: curveRows, recommendation: lastRecommendation }, null, 2), 'application/json'); }
function exportCsv() { if (!lastRecommendation) return alert('Run a recommendation first.'); const lines = ['MODEL,SOURCE,ROTOR,FLOW_GPM,HEAD_FT,PUMP_HP,MOTOR_HP,SCORE']; lastRecommendation.scored.forEach(r => lines.push([r.model,r.source,r.rotor,r.flowGpm,r.headFt,r.powerHp,r.recommendedMotorHp,r.score.toFixed(1)].join(','))); downloadFile('pump-curve-lab-comparison.csv', lines.join('\n'), 'text/csv'); }
function exportHtml() { if (!lastRecommendation) return alert('Run a recommendation first.'); const r = lastRecommendation; const ds = getModeDatasheet(r); const rows = r.scored.map(x => `<tr><td>${x.model}</td><td>${x.source}</td><td>${x.rotor}</td><td>${x.flowGpm.toFixed(0)}</td><td>${x.headFt.toFixed(1)}</td><td>${x.powerHp.toFixed(1)}</td><td>${x.recommendedMotorHp}</td><td>${x.score.toFixed(1)}</td></tr>`).join(''); const dsRows = ds.rows.map(([k,v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join(''); const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${ds.title}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111} .brand{background:#0f172a;color:#fff;padding:18px 20px;border-radius:10px} table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f4f6}.note{margin-top:16px;padding:12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px} .section{margin-top:20px}</style></head><body><div class="brand"><h1>${ds.title}</h1><p>${r.projectName} | ${r.projectRef}</p></div><div class="section"><table><tbody>${dsRows}</tbody></table></div><div class="note">Prototype recommendation only. Verify NPSH, solids handling, wear, materials, and approved manufacturer curve fit before release.${r.modeWarnings.length ? '<ul>' + r.modeWarnings.map(n => `<li>${n}</li>`).join('') + '</ul>' : ''}</div><div class="section"><h2>Top Curve Matches</h2><table><thead><tr><th>Model</th><th>Source</th><th>Rotor</th><th>Flow gpm</th><th>Head ft</th><th>Pump HP</th><th>Motor HP</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table></div></body></html>`; downloadFile(`${ds.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.html`, html, 'text/html'); }
function saveProject() { const payload = { project: getFormValues(), curvesCsv: buildCsv(curveRows) }; downloadFile(`${(document.getElementById('projectName').value || 'pump-project').replace(/\s+/g,'-').toLowerCase()}.json`, JSON.stringify(payload, null, 2), 'application/json'); }
function loadProjectFile(file) { const reader = new FileReader(); reader.onload = () => { const payload = JSON.parse(reader.result); if (payload.project) setFormValues(payload.project); if (payload.curvesCsv) curveRows = parseCsv(payload.curvesCsv, 'project-load'); renderLibrary(); recommend(); }; reader.readAsText(file); }

els.useDefaultLibraryBtn.addEventListener('click', () => { curveRows = parseCsv(defaultLibraryCsv, 'default-library'); renderLibrary(); updateAtmosphericPressureFromElevation(); applyWorkflowModeUI(); updateWorkflowGuidance(); recommend(); });
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
document.getElementById('workflowMode').addEventListener('change', () => { applyWorkflowModeUI(); updateWorkflowGuidance(); });
document.getElementById('elevationFt').addEventListener('input', updateAtmosphericPressureFromElevation);
els.appForm.addEventListener('input', updateWorkflowGuidance);
els.appForm.addEventListener('change', updateWorkflowGuidance);
els.appForm.addEventListener('submit', recommend);
els.curveFile.addEventListener('change', async (e) => { const files = [...e.target.files]; if (!files.length) return; const parsed = []; for (const file of files) parsed.push(...parseCsv(await file.text(), file.name)); curveRows = parsed; renderLibrary(); recommend(); });
curveRows = parseCsv(defaultLibraryCsv, 'default-library'); renderLibrary(); updateAtmosphericPressureFromElevation(); applyWorkflowModeUI(); updateWorkflowGuidance(); recommend();
