const sampleCsv = `MODEL,ROTOR,FLOW_GPM,HEAD_FT,EFFICIENCY_PCT,POWER_HP\nHD5000,12 inch,1575,30.4,29,41.6\nHD4000,10 inch,1480,29.9,28,39.4\nHD8000,17 inch,2100,75,35,120\nHD8000,17 inch,2300,65,37,130\nHD6000,14 inch,1956,50.1,34,71.8\nHD2000,8 inch,607,45,22,18\nHD3000,9.5 inch,885,40,24,26`;

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
  loadSampleBtn: document.getElementById('loadSampleBtn'),
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
const fieldIds = ['projectName','projectRef','flowRate','flowUnit','headValue','headUnit','pumpType','specificGravity','viscosity','staticHead','pipeLength','pipeDiameter','pipeFactor','fittingsCount','motorServiceFactor','solidsSize','fluidTemp','materialPreference'];

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

function calcTdh() {
  const staticHead = Number(document.getElementById('staticHead').value || 0);
  const pipeLength = Number(document.getElementById('pipeLength').value || 0);
  const pipeDiameter = Number(document.getElementById('pipeDiameter').value || 0);
  const fittingsCount = Number(document.getElementById('fittingsCount').value || 0);
  const pipeFactor = Number(document.getElementById('pipeFactor').value || 140);
  const flowRate = toGpm(Number(document.getElementById('flowRate').value || 0), document.getElementById('flowUnit').value);
  const sg = Number(document.getElementById('specificGravity').value || 1);
  const viscosity = Number(document.getElementById('viscosity').value || 1);
  const equivalentLength = pipeLength + (fittingsCount * pipeDiameter * 2.5);
  const frictionBase = equivalentLength * Math.pow(Math.max(flowRate, 1) / 1000, 1.85) / Math.pow(Math.max(pipeFactor, 1), 1.85) / Math.pow(Math.max(pipeDiameter, 0.25), 4.87) * 12;
  const viscosityFactor = 1 + Math.max(0, viscosity - 1) * 0.0025;
  const sgFactor = 0.98 + (sg - 1) * 0.2;
  const tdhFt = staticHead + (frictionBase * viscosityFactor * sgFactor);
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
  const pumpType = document.getElementById('pumpType').value;
  const serviceFactor = Number(document.getElementById('motorServiceFactor').value || 1.15);
  const solidsSize = Number(document.getElementById('solidsSize').value || 0);
  const fluidTemp = Number(document.getElementById('fluidTemp').value || 70);
  const materialPreference = document.getElementById('materialPreference').value;
  const targetFlowGpm = toGpm(flowInput, flowUnit);
  const targetHeadFt = toFeetHead(headInput, headUnit, sg);
  const fluidPenalty = 1 + Math.max(0, sg - 1) * 0.08 + Math.max(0, viscosity - 1) * 0.0015 + Math.max(0, solidsSize - 0.5) * 0.01;
  const adjustedHeadFt = targetHeadFt * fluidPenalty;
  return { projectName: document.getElementById('projectName').value, projectRef: document.getElementById('projectRef').value, flowInput, flowUnit, headInput, headUnit, sg, viscosity, pumpType, serviceFactor, solidsSize, fluidTemp, materialPreference, targetFlowGpm, targetHeadFt, adjustedHeadFt };
}

function recommend(e) {
  if (e) e.preventDefault();
  const rows = activeRows();
  if (!rows.length) { alert('Load or upload pump curve data first.'); return; }
  const ctx = buildContext();
  const families = uniqueModels(rows).map(model => interpolateFamily(rows.filter(r => r.model === model), ctx.targetFlowGpm)).filter(Boolean);
  const scored = families.map(row => {
    const flowError = Math.abs(row.flowGpm - ctx.targetFlowGpm) / Math.max(ctx.targetFlowGpm, 1);
    const headError = Math.abs(row.headFt - ctx.adjustedHeadFt) / Math.max(ctx.adjustedHeadFt, 1);
    const typePenalty = ctx.pumpType === 'selfpriming' ? 0.05 : ctx.pumpType === 'submersible' ? 0.02 : 0;
    const solidsPenalty = Math.max(0, ctx.solidsSize - 1) * 0.01;
    const materialPenalty = ctx.materialPreference === 'abrasive' ? 0.01 : ctx.materialPreference === 'corrosive' ? 0.02 : 0;
    const score = 100 - ((flowError * 65) + (headError * 35) + ((typePenalty + solidsPenalty + materialPenalty) * 100));
    const recommendedMotorHp = Math.ceil((row.powerHp * ctx.sg * ctx.serviceFactor) / 5) * 5;
    return { ...row, score, recommendedMotorHp, flowErrorPct: flowError * 100, headErrorPct: headError * 100 };
  }).sort((a,b) => b.score - a.score);
  lastRecommendation = { 
    ...ctx,
    best: scored[0],
    scored,
    libraryCount: rows.length,
    modelCount: uniqueModels(rows).length,
    generalRecommendation: getGeneralPumpRecommendation(ctx.targetFlowGpm, ctx.adjustedHeadFt),
    avoidFiveInPump: avoidFiveInPumpNote(),
  };
  renderRecommendation();
  drawChart();
}

function renderRecommendation() {
  const r = lastRecommendation; const best = r.best;
  els.summaryCards.innerHTML = `
    <div class="tile"><div class="k">Target Flow</div><div class="v">${r.targetFlowGpm.toFixed(0)} gpm</div></div>
    <div class="tile"><div class="k">Adjusted TDH</div><div class="v">${r.adjustedHeadFt.toFixed(1)} ft</div></div>
    <div class="tile"><div class="k">Curve-Based Recommendation</div><div class="v">${best.model}</div></div>
    <div class="tile"><div class="k">Recommended Motor</div><div class="v">${best.recommendedMotorHp} HP</div></div>
    <div class="tile"><div class="k">General Recommendation</div><div class="v">${r.generalRecommendation}</div></div>
    <div class="tile"><div class="k">Sizing Rule</div><div class="v">${r.avoidFiveInPump}</div></div>`;
  const rows = r.scored.slice(0, 8).map((row, idx) => `
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
    <h3>Recommendation summary</h3>
    <div class="notice">Prototype output only. Final engineering release should still confirm NPSH, solids handling, wear, and manufacturer-approved curve suitability.</div>
    <p><strong>Project:</strong> ${r.projectName} <br><strong>Reference:</strong> ${r.projectRef}</p>
    <p><strong>General recommendation:</strong> ${r.generalRecommendation}</p>
    <p><strong>Curve-based recommendation:</strong> ${best.model}</p>
    <p><strong>Why:</strong> The general recommendation follows your size-band rules. The curve-based recommendation is the best interpolated family match for target flow, adjusted head, fluid penalty, pump type, and motor service factor.</p>
    <p><strong>Recommended motor:</strong> ${best.recommendedMotorHp} HP minimum, based on ${best.powerHp.toFixed(1)} pump HP × SG ${r.sg.toFixed(2)} × service factor ${r.serviceFactor.toFixed(2)}.</p>
    <p><strong>Rule reminder:</strong> ${r.avoidFiveInPump}</p>
    <p><strong>Updated curve note:</strong> The plotted operating point includes a fluid-adjusted head penalty for specific gravity, viscosity, and solids burden.</p>
    <table class="table">
      <thead><tr><th>Pump</th><th>Rotor</th><th>Flow gpm</th><th>Head ft</th><th>Pump HP</th><th>Motor HP</th><th>Score</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
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
    <p><strong>General recommendation:</strong> ${r.generalRecommendation}</p>
    <p><strong>Top curve-based match:</strong> ${best.model}</p>
    <table class="table"><thead><tr><th>Model</th><th>Source</th><th>Rotor</th><th>Interpolated Flow</th><th>Interpolated Head</th><th>Flow Error</th><th>Head Error</th><th>Score</th></tr></thead><tbody>${compareRows}</tbody></table>`;
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
  const preview = curveRows.slice(0, 12).map(r => `<tr><td>${r.model}</td><td>${r.source}</td><td>${r.rotor}</td><td>${r.flowGpm}</td><td>${r.headFt}</td><td>${r.efficiencyPct}</td><td>${r.powerHp}</td></tr>`).join('');
  els.curveTableWrap.innerHTML = `<table class="table"><thead><tr><th>Model</th><th>Source</th><th>Rotor</th><th>Flow gpm</th><th>Head ft</th><th>Eff %</th><th>Power HP</th></tr></thead><tbody>${preview}</tbody></table>`;
}

function exportJson() { if (!lastRecommendation) return alert('Run a recommendation first.'); downloadFile('pump-curve-lab-report.json', JSON.stringify({ project: getFormValues(), curves: curveRows, recommendation: lastRecommendation }, null, 2), 'application/json'); }
function exportCsv() { if (!lastRecommendation) return alert('Run a recommendation first.'); const lines = ['MODEL,SOURCE,ROTOR,FLOW_GPM,HEAD_FT,PUMP_HP,MOTOR_HP,SCORE']; lastRecommendation.scored.forEach(r => lines.push([r.model,r.source,r.rotor,r.flowGpm,r.headFt,r.powerHp,r.recommendedMotorHp,r.score.toFixed(1)].join(','))); downloadFile('pump-curve-lab-comparison.csv', lines.join('\n'), 'text/csv'); }
function exportHtml() { if (!lastRecommendation) return alert('Run a recommendation first.'); const r = lastRecommendation; const rows = r.scored.map(x => `<tr><td>${x.model}</td><td>${x.source}</td><td>${x.rotor}</td><td>${x.flowGpm.toFixed(0)}</td><td>${x.headFt.toFixed(1)}</td><td>${x.powerHp.toFixed(1)}</td><td>${x.recommendedMotorHp}</td><td>${x.score.toFixed(1)}</td></tr>`).join(''); const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Pump Curve Lab Report</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111} .brand{background:#0f172a;color:#fff;padding:18px 20px;border-radius:10px} table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f4f6}.note{margin-top:16px;padding:12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px}</style></head><body><div class="brand"><h1>Pump Curve Lab Report</h1><p>${r.projectName} | ${r.projectRef}</p></div><p><strong>Best pump:</strong> ${r.best.model}<br><strong>Target flow:</strong> ${r.targetFlowGpm.toFixed(0)} gpm<br><strong>Adjusted TDH:</strong> ${r.adjustedHeadFt.toFixed(1)} ft<br><strong>Specific gravity:</strong> ${r.sg}<br><strong>Viscosity:</strong> ${r.viscosity} cP<br><strong>Pump type:</strong> ${r.pumpType}<br><strong>Recommended motor:</strong> ${r.best.recommendedMotorHp} HP</p><div class="note">Prototype recommendation only. Verify NPSH, solids handling, wear, materials, and approved manufacturer curve fit before release.</div><table><thead><tr><th>Model</th><th>Source</th><th>Rotor</th><th>Flow gpm</th><th>Head ft</th><th>Pump HP</th><th>Motor HP</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table></body></html>`; downloadFile('pump-curve-lab-report.html', html, 'text/html'); }
function saveProject() { const payload = { project: getFormValues(), curvesCsv: buildCsv(curveRows) }; downloadFile(`${(document.getElementById('projectName').value || 'pump-project').replace(/\s+/g,'-').toLowerCase()}.json`, JSON.stringify(payload, null, 2), 'application/json'); }
function loadProjectFile(file) { const reader = new FileReader(); reader.onload = () => { const payload = JSON.parse(reader.result); if (payload.project) setFormValues(payload.project); if (payload.curvesCsv) curveRows = parseCsv(payload.curvesCsv, 'project-load'); renderLibrary(); recommend(); }; reader.readAsText(file); }

els.loadSampleBtn.addEventListener('click', () => { curveRows = parseCsv(sampleCsv, 'sample-library'); renderLibrary(); recommend(); });
els.calcTdhBtn.addEventListener('click', calcTdh);
els.exportJsonBtn.addEventListener('click', exportJson);
els.exportCsvBtn.addEventListener('click', exportCsv);
els.exportHtmlBtn.addEventListener('click', exportHtml);
els.saveProjectBtn.addEventListener('click', saveProject);
els.loadProjectBtn.addEventListener('click', () => els.projectFile.click());
els.projectFile.addEventListener('change', e => { const file = e.target.files[0]; if (file) loadProjectFile(file); });
els.printBtn.addEventListener('click', () => window.print());
els.familyFilter.addEventListener('change', () => recommend());
els.appForm.addEventListener('submit', recommend);
els.curveFile.addEventListener('change', async (e) => { const files = [...e.target.files]; if (!files.length) return; const parsed = []; for (const file of files) parsed.push(...parseCsv(await file.text(), file.name)); curveRows = parsed; renderLibrary(); recommend(); });
curveRows = parseCsv(sampleCsv, 'sample-library'); renderLibrary(); recommend();
