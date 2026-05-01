const defaultLibraryCsv = `MODEL,ROTOR,FLOW_GPM,HEAD_FT,EFFICIENCY_PCT,POWER_HP
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
  validationSummary: $('validationSummary')
};
const fieldIds = ['projectName','projectRef','flowRate','flowUnit','headValue','headUnit','workflowMode','pumpType','specificGravity','viscosity','staticHead','pipeLength','pipeDiameter','elevationFt','atmosphericPressure','pipeFactor','fittingsCount','motorServiceFactor','solidsSize','fluidTemp','materialPreference','percentSolidsByWeight','availableMotorHp','motorVoltage','motorFrequency','targetRpm','useVfd','suctionLift','suctionHoseLength','tankSurfacePressure','submergenceDepth','coolingMethod','powerCableLength'];
const autoRunFieldSet = new Set(fieldIds);
const requiredCoreFieldIds = ['flowRate','headValue','specificGravity'];

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
  a.href = url;
  a.download = name;
  a.click();
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
function getFormValues() { const out = {}; fieldIds.forEach(id => out[id] = $(id).value); return out; }
function setFormValues(values={}) { fieldIds.forEach(id => { if (values[id] !== undefined) $(id).value = values[id]; }); }
function getFieldLabel(el) { return el?.closest('label')?.childNodes?.[0]?.textContent?.trim() || el?.id || 'Field'; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function roundMotorHp(value) { return Math.max(5, Math.ceil(value / 5) * 5); }

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
  updateAutoRunStatus(`Refreshing recommendation after ${reason}...`);
  autoRecommendTimer = setTimeout(() => {
    if (!curveRows.length) return;
    recommend();
    updateAutoRunStatus('Recommendation refreshed automatically.');
  }, 450);
}

function ensureInlineValidationNode(input) {
  let hint = input.parentElement.querySelector('.field-error');
  if (!hint) {
    hint = document.createElement('div');
    hint.className = 'field-error';
    input.parentElement.appendChild(hint);
  }
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

function interpolateCurvePoint(points, flow) {
  const pts = points.slice().sort((a,b) => a.flowGpm - b.flowGpm);
  if (!pts.length) return null;
  if (pts.length === 1) return { ...pts[0] };
  if (flow <= pts[0].flowGpm) return { ...pts[0], flowGpm: flow };
  if (flow >= pts[pts.length - 1].flowGpm) return { ...pts[pts.length - 1], flowGpm: flow };
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (flow >= a.flowGpm && flow <= b.flowGpm) {
      const t = (flow - a.flowGpm) / (b.flowGpm - a.flowGpm || 1);
      const lerp = (x, y) => x + (y - x) * t;
      return {
        model: a.model,
        rotor: a.rotor || b.rotor,
        source: a.source,
        flowGpm: flow,
        headFt: lerp(a.headFt, b.headFt),
        efficiencyPct: lerp(a.efficiencyPct || 0, b.efficiencyPct || 0),
        powerHp: lerp(a.powerHp || 0, b.powerHp || 0),
      };
    }
  }
  return { ...pts[pts.length - 1], flowGpm: flow };
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
    const prevSystem = systemPoints[i - 1];
    const currSystem = systemPoints[i];
    const prevPump = interpolateCurvePoint(pts, prevSystem.flowGpm);
    const currPump = interpolateCurvePoint(pts, currSystem.flowGpm);
    if (!prevPump || !currPump) continue;
    const diffA = prevPump.headFt - prevSystem.headFt;
    const diffB = currPump.headFt - currSystem.headFt;
    if (diffA === 0) return { flowGpm: prevSystem.flowGpm, headFt: prevSystem.headFt };
    if (diffA > 0 && diffB <= 0) {
      const t = diffA / (diffA - diffB || 1);
      return {
        flowGpm: prevSystem.flowGpm + (currSystem.flowGpm - prevSystem.flowGpm) * t,
        headFt: prevSystem.headFt + (currSystem.headFt - prevSystem.headFt) * t,
      };
    }
  }
  return null;
}

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
  return 'Outside current general recommendation band';
}

function avoidFiveInPumpNote() {
  return 'Avoid 5-in pump when making suggestions';
}

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
  } else {
    notes.push('Electric / flooded workflow: start from customer flow, TDH, slurry properties, then interpolate the family curve and manually validate motor sizing.');
  }
  if (ctx.targetFlowGpm >= 50 && ctx.targetFlowGpm < 200 && ctx.adjustedHeadFt > 120) notes.push('High-head exception triggered: in the 50 to 200 GPM band with head above 120 ft, prefer HH2000.');
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
  $('workflowGuidance').innerHTML = '<strong>PumpFlo-style workflow guidance:</strong><ul>' + notes.map(n => `<li>${n}</li>`).join('') + '</ul>';
  $('modeChecklist').innerHTML = `<strong>${mode.title} checklist:</strong><ul>${mode.checklist.map(n => `<li>${n}</li>`).join('')}</ul>`;
}

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
    if (ctx.suctionLift > 18) warnings.push('Self-prime warning: suction lift is above the preferred 18 ft guideline.');
    if (ctx.suctionLift >= 24) warnings.push('Self-prime danger: suction lift is near/above the practical hard limit around 24 ft.');
    if (ctx.suctionHoseLength > 200) warnings.push('Self-prime warning: suction hose length is above the usual 150 to 200 ft practical range.');
  }
  if (ctx.workflowMode === 'electric') {
    if (ctx.useVfd === 'yes' && ctx.targetRpm < 1800) warnings.push('Electric mode note: VFD / reduced RPM selected. Base motor HP must be checked against reduced-speed available HP.');
    if (ctx.materialPreference === 'abrasive' && ctx.targetRpm > 1500) warnings.push('Wear warning: abrasive slurry plus higher RPM will accelerate wear.');
  }
  if (ctx.workflowMode === 'submersible') {
    if (ctx.submergenceDepth < 8) warnings.push('Submersible warning: low submergence may affect cooling and stable operation.');
    if (ctx.coolingMethod === 'flooded' && ctx.fluidTemp > 120) warnings.push('Submersible warning: higher fluid temperature may require cooling review.');
    if (ctx.powerCableLength > 200) warnings.push('Submersible note: long power cable length should be checked for voltage drop.');
  }
  if (ctx.workflowMode === 'selfpriming') warnings.push('Self-prime motor note: include roughly 2 HP overhead for the vacuum pump package during final engineering review.');
  if (ctx.availableMotorHp > 0 && best && best.recommendedMotorHp > ctx.availableMotorHp) warnings.push(`Customer motor limit warning: best-fit recommendation wants ${best.recommendedMotorHp} HP but customer available motor is ${ctx.availableMotorHp} HP.`);
  if (ctx.motorVoltage && ctx.motorVoltage !== '460') warnings.push(`Motor voltage note: customer requested ${ctx.motorVoltage} V, so final motor availability and pricing should be confirmed.`);
  return warnings;
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
  const fluidPenalty = 1 + Math.max(0, sg - 1) * 0.08 + Math.max(0, viscosity - 1) * 0.0015 + Math.max(0, solidsSize - 0.5) * 0.01;
  const adjustedHeadFt = targetHeadFt * fluidPenalty;
  const base = { projectName: $('projectName').value, projectRef: $('projectRef').value, flowInput, flowUnit, headInput, headUnit, workflowMode, sg, viscosity, pumpType, serviceFactor, solidsSize, fluidTemp, materialPreference, percentSolidsByWeight, availableMotorHp, motorVoltage, motorFrequency, targetRpm, useVfd, suctionLift, suctionHoseLength, tankSurfacePressure, submergenceDepth, coolingMethod, powerCableLength, targetFlowGpm, targetHeadFt, adjustedHeadFt };
  return { ...base, modeAdjustedHeadFt: getModeAdjustedHead(base), wearPenalty: getWearPenalty(base) };
}

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

  const score = 100 - ((flowError * 55) + (headError * 30) + ((typePenalty + modePenalty + solidsPenalty + materialPenalty + selfPrimePenalty + submersiblePenalty + wearPenalty + customerHpPenalty + bepPenalty) * 100));

  const npshMarginFt = Math.max(0, Number($('atmosphericPressure').value || 14.7) * 2.31 - Number($('staticHead').value || 0) - Math.max(0, ctx.suctionLift || 0));

  return {
    ...curvePoint,
    dutyFlowGpm: dutyFlow,
    dutyHeadFt: dutyHead,
    dutyEfficiencyPct: dutyPoint.efficiencyPct,
    dutyPowerHp: dutyPoint.powerHp,
    recommendedMotorHp,
    flowErrorPct: flowError * 100,
    headErrorPct: headError * 100,
    score,
    operatingPoint,
    bep,
    porBand,
    bepProximityPct,
    npshMarginFt,
  };
}

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
    ...ctx,
    best,
    scored: grouped,
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
    ['Target Flow (gpm)', r.targetFlowGpm.toFixed(0)],
    ['Requested TDH (ft)', r.adjustedHeadFt.toFixed(1)],
    ['Operating Flow (gpm)', r.best.dutyFlowGpm.toFixed(0)],
    ['Operating Head (ft)', r.best.dutyHeadFt.toFixed(1)],
    ['Duty Efficiency (%)', r.best.dutyEfficiencyPct.toFixed(1)],
    ['NPSH Margin (ft)', r.best.npshMarginFt.toFixed(1)],
    ['Recommended Motor (HP)', String(r.best.recommendedMotorHp)],
  ];
  if (r.workflowMode === 'selfpriming') {
    return { title: 'Self-Priming Datasheet', rows: common.concat([
      ['Suction Lift (ft)', r.suctionLift.toFixed(1)],
      ['Suction Hose Length (ft)', r.suctionHoseLength.toFixed(1)],
      ['Tank Surface Pressure (psi)', r.tankSurfacePressure.toFixed(1)],
      ['Guidance', 'Keep suction lift at or below 18 ft preferred, with ~24 ft practical hard warning.'],
      ['Vacuum Pump Overhead', 'Add about 2 HP overhead during final self-prime motor review.']
    ]) };
  }
  if (r.workflowMode === 'submersible') {
    return { title: 'Submersible Datasheet', rows: common.concat([
      ['Submergence Depth (ft)', r.submergenceDepth.toFixed(1)],
      ['Cooling Method', r.coolingMethod],
      ['Power Cable Length (ft)', r.powerCableLength.toFixed(1)],
      ['Guidance', 'Confirm cooling, submergence stability, and cable voltage drop before release.']
    ]) };
  }
  return { title: 'Electric Process Datasheet', rows: common.concat([
    ['Motor Frequency (Hz)', String(r.motorFrequency)],
    ['Target RPM', String(r.targetRpm)],
    ['VFD Used', r.useVfd],
    ['Elevation (ft)', String(Number($('elevationFt').value || 0).toFixed(0))],
    ['Atmospheric Pressure (psi)', String(Number($('atmosphericPressure').value || 14.7).toFixed(2))],
    ['Guidance', 'Manual motor validation is still required, especially when reducing RPM with a VFD.'],
    ['Wear Guidance', 'For abrasive slurry, prefer lower RPM / larger rotor where practical to reduce wear.']
  ]) };
}

function renderRecommendation() {
  const r = lastRecommendation;
  const best = r.best;
  const warnings = r.modeWarnings || [];
  const porText = best.porBand ? `${best.porBand.low.toFixed(0)} to ${best.porBand.high.toFixed(0)} gpm` : 'N/A';
  const bepText = best.bep ? `${best.bep.flowGpm.toFixed(0)} gpm @ ${best.bep.efficiencyPct.toFixed(1)}%` : 'N/A';

  els.summaryCards.innerHTML = `
    <div class="executive-summary">
      <div class="exec-hero">
        <div class="exec-eyebrow">Recommended pump</div>
        <div class="exec-title">${best.model}</div>
        <p class="exec-sub">Requested ${r.targetFlowGpm.toFixed(0)} gpm at ${r.modeAdjustedHeadFt.toFixed(1)} ft, operating at about ${best.dutyFlowGpm.toFixed(0)} gpm and ${best.dutyHeadFt.toFixed(1)} ft where the pump and system curves intersect.</p>
        <div class="result-actions">
          <button type="button" class="primary" id="inlineExportHtmlBtn">Export datasheet</button>
          <button type="button" class="secondary" id="inlinePrintBtn">Print / Save PDF</button>
        </div>
      </div>
      <div class="exec-metrics">
        <div class="exec-metric"><div class="k">Recommended motor</div><div class="v">${best.recommendedMotorHp} HP</div></div>
        <div class="exec-metric"><div class="k">Fit score</div><div class="v">${best.score.toFixed(1)}</div></div>
        <div class="exec-metric"><div class="k">Duty efficiency</div><div class="v">${best.dutyEfficiencyPct.toFixed(1)}%</div></div>
        <div class="exec-metric"><div class="k">NPSH margin</div><div class="v">${best.npshMarginFt.toFixed(1)} ft</div></div>
        <div class="exec-metric"><div class="k">BEP</div><div class="v">${bepText}</div></div>
        <div class="exec-metric"><div class="k">POR band</div><div class="v">${porText}</div></div>
      </div>
    </div>`;

  const rows = r.scored.slice(0, 5).map((row, idx) => `
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
        <strong>Project:</strong> ${r.projectName} <br><strong>Reference:</strong> ${r.projectRef}<br>
        <strong>Workflow mode:</strong> ${getModeConfig(r.workflowMode).title}<br>
        <strong>Why this pump:</strong> Best balance of curve intersection, BEP proximity, flow/head error, and workflow-specific rules.
      </div>
      ${warnings.length ? `<div class="notice"><strong>Key warnings</strong><ul class="warning-list">${warnings.map(n => `<li>${n}</li>`).join('')}</ul></div>` : ''}
      <div class="result-note">
        <strong>Engineering note:</strong> ${r.avoidFiveInPump}. Final release should still confirm NPSH, solids handling, wear, and manufacturer-approved curve suitability.
      </div>
      <table class="table">
        <thead><tr><th>Pump</th><th>Rotor</th><th>Op Flow gpm</th><th>Op Head ft</th><th>Eff</th><th>Motor HP</th><th>Score</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  const compareRows = r.scored.slice(0, 5).map(row => `
    <tr>
      <td>${row.model}</td>
      <td>${row.source}</td>
      <td>${row.rotor}</td>
      <td>${row.dutyFlowGpm.toFixed(0)}</td>
      <td>${row.dutyHeadFt.toFixed(1)}</td>
      <td>${row.bepProximityPct ? row.bepProximityPct.toFixed(0) + '%' : 'N/A'}</td>
      <td>${row.flowErrorPct.toFixed(1)}%</td>
      <td>${row.headErrorPct.toFixed(1)}%</td>
      <td>${row.score.toFixed(1)}</td>
    </tr>`).join('');

  els.comparisonWrap.className = 'recommendation';
  els.comparisonWrap.innerHTML = `
    <p><strong>Top alternatives:</strong> Compare the leading candidates without crowding the main recommendation.</p>
    <table class="table"><thead><tr><th>Model</th><th>Source</th><th>Rotor</th><th>Op Flow</th><th>Op Head</th><th>BEP Proximity</th><th>Flow Error</th><th>Head Error</th><th>Score</th></tr></thead><tbody>${compareRows}</tbody></table>`;

  $('inlineExportHtmlBtn')?.addEventListener('click', exportHtml);
  $('inlinePrintBtn')?.addEventListener('click', () => window.print());
}

function drawChart() {
  const svg = els.curveChart;
  svg.innerHTML = '';
  els.chartLegend.innerHTML = '';
  if (!curveRows.length || !lastRecommendation) return;

  const best = lastRecommendation.best;
  const rows = best.familyRows;
  const systemCurve = best.systemCurve.points;
  const width = 980, height = 520, m = { l: 86, r: 88, t: 26, b: 70 };
  const maxFlowRaw = Math.max(...rows.map(d => d.flowGpm), ...systemCurve.map(d => d.flowGpm), lastRecommendation.targetFlowGpm, best.dutyFlowGpm);
  const maxHeadRaw = Math.max(...rows.map(d => d.headFt), ...systemCurve.map(d => d.headFt), lastRecommendation.modeAdjustedHeadFt, best.dutyHeadFt);
  const maxEffRaw = Math.max(...rows.map(d => d.efficiencyPct || 0), 40);
  const maxFlow = maxFlowRaw * 1.15;
  const maxHead = maxHeadRaw * 1.15;
  const maxEff = Math.ceil(maxEffRaw / 10) * 10;
  const x = v => m.l + (v / maxFlow) * (width - m.l - m.r);
  const yHead = v => height - m.b - (v / maxHead) * (height - m.t - m.b);
  const yEff = v => height - m.b - (v / maxEff) * (height - m.t - m.b);

  const make = (tag, attrs = {}) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    svg.appendChild(el);
    return el;
  };

  make('rect', { x: 0, y: 0, width, height, fill: '#ffffff' });
  make('line', { x1: m.l, y1: height - m.b, x2: width - m.r, y2: height - m.b, stroke: '#94a3b8', 'stroke-width': '1.2' });
  make('line', { x1: m.l, y1: m.t, x2: m.l, y2: height - m.b, stroke: '#94a3b8', 'stroke-width': '1.2' });
  make('line', { x1: width - m.r, y1: m.t, x2: width - m.r, y2: height - m.b, stroke: '#cbd5e1', 'stroke-width': '1.2' });

  for (let i = 0; i <= 5; i++) {
    const flow = maxFlow * i / 5;
    const head = maxHead * i / 5;
    const eff = maxEff * i / 5;
    const gx = x(flow);
    const gy = yHead(head);
    make('line', { x1: gx, y1: m.t, x2: gx, y2: height - m.b, stroke: '#e2e8f0' });
    make('line', { x1: m.l, y1: gy, x2: width - m.r, y2: gy, stroke: '#e2e8f0' });
    make('text', { x: gx, y: height - m.b + 28, 'font-size': '12', fill: '#64748b', 'text-anchor': 'middle' }).textContent = flow.toFixed(0);
    make('text', { x: m.l - 10, y: gy + 4, 'font-size': '12', fill: '#64748b', 'text-anchor': 'end' }).textContent = head.toFixed(0);
    make('text', { x: width - m.r + 10, y: yEff(eff) + 4, 'font-size': '12', fill: '#7c3aed', 'text-anchor': 'start' }).textContent = eff.toFixed(0);
  }

  make('text', { x: (width + m.l - m.r) / 2, y: height - 18, 'font-size': '13', fill: '#475569', 'text-anchor': 'middle' }).textContent = 'Flow (gpm)';
  make('text', { x: 24, y: height / 2, 'font-size': '13', fill: '#475569', transform: `rotate(-90 24 ${height / 2})`, 'text-anchor': 'middle' }).textContent = 'Head (ft)';
  make('text', { x: width - 18, y: height / 2, 'font-size': '13', fill: '#7c3aed', transform: `rotate(90 ${width - 18} ${height / 2})`, 'text-anchor': 'middle' }).textContent = 'Efficiency (%)';

  if (best.porBand) {
    make('rect', {
      x: x(best.porBand.low),
      y: m.t,
      width: x(best.porBand.high) - x(best.porBand.low),
      height: height - m.t - m.b,
      fill: '#dcfce7',
      opacity: '0.45'
    });
  }

  const pumpPath = rows.map((p, i) => `${i ? 'L' : 'M'} ${x(p.flowGpm)} ${yHead(p.headFt)}`).join(' ');
  const effPath = rows.map((p, i) => `${i ? 'L' : 'M'} ${x(p.flowGpm)} ${yEff(p.efficiencyPct || 0)}`).join(' ');
  const systemPath = systemCurve.map((p, i) => `${i ? 'L' : 'M'} ${x(p.flowGpm)} ${yHead(p.headFt)}`).join(' ');

  make('path', { d: pumpPath, fill: 'none', stroke: '#2563eb', 'stroke-width': '3.2', 'stroke-linecap': 'round' });
  make('path', { d: systemPath, fill: 'none', stroke: '#dc2626', 'stroke-width': '2.6', 'stroke-dasharray': '8 6', 'stroke-linecap': 'round' });
  make('path', { d: effPath, fill: 'none', stroke: '#7c3aed', 'stroke-width': '2.6', 'stroke-dasharray': '6 4', 'stroke-linecap': 'round' });

  rows.forEach(p => make('circle', { cx: x(p.flowGpm), cy: yHead(p.headFt), r: 3.5, fill: '#2563eb' }));

  if (best.bep) {
    make('circle', { cx: x(best.bep.flowGpm), cy: yHead(best.bep.headFt), r: 7, fill: '#16a34a' });
    make('text', { x: clamp(x(best.bep.flowGpm) + 12, m.l + 20, width - m.r - 80), y: clamp(yHead(best.bep.headFt) - 10, m.t + 18, height - m.b - 18), 'font-size': '12', fill: '#166534' }).textContent = 'BEP';
  }

  const requestedX = x(lastRecommendation.targetFlowGpm);
  const requestedY = yHead(lastRecommendation.modeAdjustedHeadFt);
  make('circle', { cx: requestedX, cy: requestedY, r: 7, fill: '#111827' });
  make('text', { x: clamp(requestedX + 12, m.l + 20, width - m.r - 120), y: clamp(requestedY - 12, m.t + 18, height - m.b - 12), 'font-size': '12', fill: '#111827' }).textContent = 'Requested duty';

  const opX = x(best.dutyFlowGpm);
  const opY = yHead(best.dutyHeadFt);
  make('circle', { cx: opX, cy: opY, r: 7.5, fill: '#dc2626' });
  make('text', { x: clamp(opX + 12, m.l + 20, width - m.r - 150), y: clamp(opY + 18, m.t + 18, height - m.b - 12), 'font-size': '12', fill: '#dc2626' }).textContent = `${best.model} operating point`;

  const legendItems = [
    ['#2563eb', 'Pump curve'],
    ['#dc2626', 'System curve'],
    ['#7c3aed', 'Efficiency curve'],
    ['#16a34a', 'BEP'],
    ['#dcfce7', 'Preferred operating range']
  ];
  legendItems.forEach(([color, label], idx) => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<span class="legend-swatch${label === 'Preferred operating range' ? ' legend-block' : ''}" style="background:${color}"></span>${label}`;
    els.chartLegend.appendChild(item);
  });
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
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${ds.title}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}.brand{background:#0f172a;color:#fff;padding:18px 20px;border-radius:10px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f4f6}.note{margin-top:16px;padding:12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px}.section{margin-top:20px}</style></head><body><div class="brand"><h1>${ds.title}</h1><p>${r.projectName} | ${r.projectRef}</p></div><div class="section"><table><tbody>${dsRows}</tbody></table></div><div class="note">Prototype recommendation only. Verify NPSH, solids handling, wear, materials, and approved manufacturer curve fit before release.${r.modeWarnings.length ? '<ul>' + r.modeWarnings.map(n => `<li>${n}</li>`).join('') + '</ul>' : ''}</div><div class="section"><h2>Top Curve Matches</h2><table><thead><tr><th>Model</th><th>Source</th><th>Rotor</th><th>Op Flow</th><th>Op Head</th><th>Eff</th><th>Pump HP</th><th>Motor HP</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table></div></body></html>`;
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

curveRows = parseCsv(defaultLibraryCsv, 'default-library');
renderLibrary();
updateAtmosphericPressureFromElevation();
applyWorkflowModeUI();
updateWorkflowGuidance();
validateCoreInputs();
recommend();
updateAutoRunStatus();
