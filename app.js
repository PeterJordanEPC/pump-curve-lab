const sampleCsv = `MODEL,ROTOR,FLOW_GPM,HEAD_FT,EFFICIENCY_PCT,POWER_HP\nHD5000,12 inch,1575,30.4,29,41.6\nHD4000,10 inch,1480,29.9,28,39.4\nHD8000,17 inch,2100,75,35,120\nHD8000,17 inch,2300,65,37,130\nHD6000,14 inch,1956,50.1,34,71.8\nHD2000,8 inch,607,45,22,18\nHD3000,9.5 inch,885,40,24,26`;

let curveRows = [];
let lastRecommendation = null;

const els = {
  curveFile: document.getElementById('curveFile'),
  libraryStats: document.getElementById('libraryStats'),
  curveTableWrap: document.getElementById('curveTableWrap'),
  summaryCards: document.getElementById('summaryCards'),
  recommendationBox: document.getElementById('recommendationBox'),
  curveChart: document.getElementById('curveChart'),
  loadSampleBtn: document.getElementById('loadSampleBtn'),
  calcTdhBtn: document.getElementById('calcTdhBtn'),
  appForm: document.getElementById('appForm'),
};

function parseCsv(text) {
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
    };
  }).filter(r => r.model && Number.isFinite(r.flowGpm) && Number.isFinite(r.headFt));
}

function toGpm(value, unit) {
  if (unit === 'm3h') return value * 4.40287;
  if (unit === 'lps') return value * 15.8503;
  return value;
}
function fromGpm(value, unit) {
  if (unit === 'm3h') return value / 4.40287;
  if (unit === 'lps') return value / 15.8503;
  return value;
}
function toFeetHead(value, unit, sg=1) {
  if (unit === 'm') return value * 3.28084;
  if (unit === 'psi') return value * 2.31 / sg;
  if (unit === 'bar') return value * 33.455 / sg;
  return value;
}
function fromFeetHead(value, unit, sg=1) {
  if (unit === 'm') return value / 3.28084;
  if (unit === 'psi') return value * sg / 2.31;
  if (unit === 'bar') return value / 33.455;
  return value;
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

function recommend(e) {
  if (e) e.preventDefault();
  if (!curveRows.length) {
    alert('Load or upload pump curve data first.');
    return;
  }
  const flowInput = Number(document.getElementById('flowRate').value || 0);
  const flowUnit = document.getElementById('flowUnit').value;
  const headInput = Number(document.getElementById('headValue').value || 0);
  const headUnit = document.getElementById('headUnit').value;
  const sg = Number(document.getElementById('specificGravity').value || 1);
  const viscosity = Number(document.getElementById('viscosity').value || 1);
  const pumpType = document.getElementById('pumpType').value;
  const serviceFactor = Number(document.getElementById('motorServiceFactor').value || 1.15);

  const targetFlowGpm = toGpm(flowInput, flowUnit);
  const targetHeadFt = toFeetHead(headInput, headUnit, sg);
  const fluidPenalty = 1 + Math.max(0, sg - 1) * 0.08 + Math.max(0, viscosity - 1) * 0.0015;
  const adjustedHeadFt = targetHeadFt * fluidPenalty;

  const scored = curveRows.map(row => {
    const flowError = Math.abs(row.flowGpm - targetFlowGpm) / Math.max(targetFlowGpm, 1);
    const headError = Math.abs(row.headFt - adjustedHeadFt) / Math.max(adjustedHeadFt, 1);
    const typePenalty = pumpType === 'selfpriming' ? 0.05 : pumpType === 'submersible' ? 0.02 : 0;
    const score = 100 - ((flowError * 65) + (headError * 35) + (typePenalty * 100));
    const recommendedMotorHp = Math.ceil((row.powerHp * sg * serviceFactor) / 5) * 5;
    return { ...row, score, recommendedMotorHp, adjustedHeadFt };
  }).sort((a,b) => b.score - a.score);

  lastRecommendation = { targetFlowGpm, targetHeadFt, adjustedHeadFt, sg, viscosity, pumpType, best: scored[0], scored: scored.slice(0,5) };
  renderRecommendation();
  drawChart();
}

function renderRecommendation() {
  const r = lastRecommendation;
  const best = r.best;
  els.summaryCards.innerHTML = `
    <div class="tile"><div class="k">Target Flow</div><div class="v">${r.targetFlowGpm.toFixed(0)} gpm</div></div>
    <div class="tile"><div class="k">Adjusted TDH</div><div class="v">${r.adjustedHeadFt.toFixed(1)} ft</div></div>
    <div class="tile"><div class="k">Best Pump</div><div class="v">${best.model}</div></div>
    <div class="tile"><div class="k">Recommended Motor</div><div class="v">${best.recommendedMotorHp} HP</div></div>`;

  const rows = r.scored.map((row, idx) => `
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
    <h3>${best.model} recommended</h3>
    <p><strong>Why:</strong> Best combined match for target flow, adjusted head, fluid penalty, and pump style. Use <strong>${best.recommendedMotorHp} HP</strong> minimum motor sizing with service factor applied.</p>
    <p><strong>Updated curve note:</strong> The plotted operating point includes a fluid-adjusted head penalty for specific gravity and viscosity. Review NPSH, solids size, and material compatibility before release.</p>
    <table class="table">
      <thead><tr><th>Pump</th><th>Rotor</th><th>Flow gpm</th><th>Head ft</th><th>Pump HP</th><th>Motor HP</th><th>Score</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function drawChart() {
  const svg = els.curveChart;
  svg.innerHTML = '';
  if (!curveRows.length || !lastRecommendation) return;
  const width = 900, height = 420, m = {l:60,r:20,t:20,b:50};
  const data = curveRows;
  const maxFlow = Math.max(...data.map(d => d.flowGpm), lastRecommendation.targetFlowGpm) * 1.1;
  const maxHead = Math.max(...data.map(d => d.headFt), lastRecommendation.adjustedHeadFt) * 1.15;
  const x = v => m.l + (v / maxFlow) * (width - m.l - m.r);
  const y = v => height - m.b - (v / maxHead) * (height - m.t - m.b);
  const models = [...new Set(data.map(d => d.model))];
  const colors = ['#2563eb','#16a34a','#dc2626','#9333ea','#ea580c','#0891b2','#4f46e5'];

  const make = (tag, attrs={}) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k,v));
    svg.appendChild(el); return el;
  };
  make('line', {x1:m.l,y1:height-m.b,x2:width-m.r,y2:height-m.b,stroke:'#94a3b8'});
  make('line', {x1:m.l,y1:m.t,x2:m.l,y2:height-m.b,stroke:'#94a3b8'});
  for(let i=0;i<6;i++){
    const fx = maxFlow * i/5, hy = maxHead * i/5;
    make('text',{x:x(fx),y:height-m.b+20,'font-size':'12',fill:'#64748b','text-anchor':'middle'}).textContent = fx.toFixed(0);
    make('text',{x:m.l-8,y:y(hy)+4,'font-size':'12',fill:'#64748b','text-anchor':'end'}).textContent = hy.toFixed(0);
    if(i<5){ make('line',{x1:x(fx),y1:m.t,x2:x(fx),y2:height-m.b,stroke:'#e2e8f0'}); make('line',{x1:m.l,y1:y(hy),x2:width-m.r,y2:y(hy),stroke:'#e2e8f0'}); }
  }
  make('text',{x:width/2,y:height-10,'font-size':'13',fill:'#475569','text-anchor':'middle'}).textContent='Flow (gpm)';
  make('text',{x:18,y:height/2,'font-size':'13',fill:'#475569',transform:`rotate(-90 18 ${height/2})`,'text-anchor':'middle'}).textContent='Head (ft)';

  models.forEach((model, idx) => {
    const pts = data.filter(d => d.model === model).sort((a,b)=>a.flowGpm-b.flowGpm);
    const d = pts.map((p,i)=>`${i?'L':'M'} ${x(p.flowGpm)} ${y(p.headFt)}`).join(' ');
    make('path',{d,fill:'none',stroke:colors[idx%colors.length],'stroke-width':'2.5'});
  });

  const best = lastRecommendation.best;
  make('circle',{cx:x(lastRecommendation.targetFlowGpm),cy:y(lastRecommendation.adjustedHeadFt),r:7,fill:'#111827'});
  make('text',{x:x(lastRecommendation.targetFlowGpm)+10,y:y(lastRecommendation.adjustedHeadFt)-10,'font-size':'12',fill:'#111827'}).textContent='Requested duty point';
  make('circle',{cx:x(best.flowGpm),cy:y(best.headFt),r:7,fill:'#dc2626'});
  make('text',{x:x(best.flowGpm)+10,y:y(best.headFt)+16,'font-size':'12',fill:'#dc2626'}).textContent=`${best.model} operating point`;
}

function renderLibrary() {
  els.libraryStats.textContent = `${curveRows.length} curve points loaded across ${new Set(curveRows.map(r => r.model)).size} models.`;
  const preview = curveRows.slice(0, 10).map(r => `<tr><td>${r.model}</td><td>${r.rotor}</td><td>${r.flowGpm}</td><td>${r.headFt}</td><td>${r.efficiencyPct}</td><td>${r.powerHp}</td></tr>`).join('');
  els.curveTableWrap.innerHTML = `<table class="table"><thead><tr><th>Model</th><th>Rotor</th><th>Flow gpm</th><th>Head ft</th><th>Eff %</th><th>Power HP</th></tr></thead><tbody>${preview}</tbody></table>`;
}

els.loadSampleBtn.addEventListener('click', () => { curveRows = parseCsv(sampleCsv); renderLibrary(); recommend(); });
els.calcTdhBtn.addEventListener('click', calcTdh);
els.appForm.addEventListener('submit', recommend);
els.curveFile.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  curveRows = parseCsv(await file.text());
  renderLibrary();
});

curveRows = parseCsv(sampleCsv);
renderLibrary();
recommend();
