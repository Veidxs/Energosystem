const state = {
  uKv: 330,
  rBranch: 20,
  fault: false,
  entsoe: false,
  aes: 6000,
  tes: 2500,
  ges: 1200,
  vde: 1000,
  demand: 10500,
  chartMode: 'loss' // 'loss' | 'mix'
};

const el = {
  kpiFreq: document.getElementById('kpiFreq'),
  kpiFreqSub: document.getElementById('kpiFreqSub'),
  freqBadge: document.getElementById('freqBadge'),
  kpiBalance: document.getElementById('kpiBalance'),
  kpiBalanceSub: document.getElementById('kpiBalanceSub'),
  kpiLoss: document.getElementById('kpiLoss'),
  kpiLossSub: document.getElementById('kpiLossSub'),
  kpiEff: document.getElementById('kpiEff'),
  kpiEffSub: document.getElementById('kpiEffSub'),
  alertBanner: document.getElementById('alertBanner'),
  alertText: document.getElementById('alertText'),
  btnEntsoeQuick: document.getElementById('btnEntsoeQuick'),
  sliderR: document.getElementById('sliderR'),
  valR: document.getElementById('valR'),
  toggleFault: document.getElementById('toggleFault'),
  toggleEntsoe: document.getElementById('toggleEntsoe'),
  sliderAes: document.getElementById('sliderAes'),
  valAes: document.getElementById('valAes'),
  sliderTes: document.getElementById('sliderTes'),
  valTes: document.getElementById('valTes'),
  sliderGes: document.getElementById('sliderGes'),
  valGes: document.getElementById('valGes'),
  sliderVde: document.getElementById('sliderVde'),
  valVde: document.getElementById('valVde'),
  sliderDemand: document.getElementById('sliderDemand'),
  valDemand: document.getElementById('valDemand'),
  // Desktop SVG
  lineMain: document.getElementById('lineMain'),
  lineBackup: document.getElementById('lineBackup'),
  labelMain: document.getElementById('labelMain'),
  labelBackup: document.getElementById('labelBackup'),
  faultMarker: document.getElementById('faultMarker'),
  svgGenVal: document.getElementById('svgGenVal'),
  svgLoadVal: document.getElementById('svgLoadVal'),
  svgLoadBox: document.getElementById('svgLoadBox'),
  svgLoadSub: document.getElementById('svgLoadSub'),
  // Mobile SVG
  mLineMain: document.getElementById('mLineMain'),
  mLineBackup: document.getElementById('mLineBackup'),
  mLabelMain: document.getElementById('mLabelMain'),
  mLabelBackup: document.getElementById('mLabelBackup'),
  mFaultMarker: document.getElementById('mFaultMarker'),
  mSvgGenVal: document.getElementById('mSvgGenVal'),
  mSvgLoadVal: document.getElementById('mSvgLoadVal'),
  mSvgLoadBox: document.getElementById('mSvgLoadBox'),
  mSvgLoadSub: document.getElementById('mSvgLoadSub'),
  // Status & Chart
  gridStatusText: document.getElementById('gridStatusText'),
  tabLoss: document.getElementById('tabLoss'),
  tabMix: document.getElementById('tabMix'),
  chartTitle: document.getElementById('chartTitle'),
  formulaNote: document.getElementById('formulaNote')
};

const fmt = (n, dec = 0) =>
  n.toLocaleString('uk-UA', { minimumFractionDigits: dec, maximumFractionDigits: dec });

let chartInstance = null;
const ctx = document.getElementById('mainChart').getContext('2d');

function computeModel() {
  const rEq = state.fault ? state.rBranch : state.rBranch / 2;
  const pRefMw = 10;
  const currentA = (pRefMw * 1e6) / (state.uKv * 1e3);
  const rawLossMw = (currentA * currentA * rEq) / 1e6;
  const lossMw = Math.min(pRefMw, rawLossMw);
  const lossRatio = lossMw / pRefMw;
  const effPct = Math.max(0, (1 - lossRatio) * 100);

  const entsoeMw = state.entsoe ? 1200 : 0;
  const totalGen = state.aes + state.tes + state.ges + state.vde + entsoeMw;
  const sysLossMw = Math.round(state.demand * Math.min(0.35, lossRatio * 0.6 + 0.01));
  const balanceMw = totalGen - (state.demand + sysLossMw);

  const deltaF = Math.max(-1.5, Math.min(0.8, balanceMw / 2000));
  const freq = 50.0 + deltaF;
  const achrActive = freq < 49.5;

  return { rEq, currentA, lossMw, lossRatio, effPct, totalGen, entsoeMw, sysLossMw, balanceMw, freq, achrActive };
}

function renderChart(m) {
  if (chartInstance) {
    chartInstance.destroy();
  }
  const isMobile = window.innerWidth < 640;

  if (state.chartMode === 'loss') {
    el.chartTitle.textContent = 'Крива теплових втрат P_втр(U) для 10 МВт';
    el.formulaNote.textContent = `Формула: I = P / U, P_втр = I² · R_екв (R_екв = ${m.rEq} Ом). Напруга ${state.uKv} кВ підсвічена на графіку.`;
    const voltages = [10, 35, 110, 220, 330, 750];
    const losses = voltages.map(u => {
      const iA = (10 * 1e6) / (u * 1e3);
      return Math.min(10, Number(((iA * iA * m.rEq) / 1e6).toFixed(4)));
    });
    const colors = voltages.map(u => (u === state.uKv ? '#A63A2B' : '#353C44'));

    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: voltages.map(u => u + ' кВ'),
        datasets: [{
          label: 'Теплові втрати (МВт з 10 МВт)',
          data: losses,
          backgroundColor: colors,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 200 },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: c => `Втрати: ${fmt(c.parsed.y, 4)} МВт (${fmt((c.parsed.y / 10) * 100, 2)}%)`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 10,
            title: { display: !isMobile, text: 'Втрати, МВт', color: '#5A544D' },
            grid: { color: '#DDD0BE' },
            ticks: { color: '#5A544D', font: { size: isMobile ? 10 : 12 } }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#1E2226', font: { weight: '600', size: isMobile ? 10 : 12 } }
          }
        }
      }
    });
  } else {
    el.chartTitle.textContent = 'Поточна структура генерації в симуляції';
    const total = Math.max(1, m.totalGen);
    el.formulaNote.textContent = `АЕС дають ${fmt((state.aes / total) * 100, 1)}% поточного балансу (у 2021 р. в Україні — 55,1%).`;
    const labels = ['АЕС', 'ТЕС і ТЕЦ', 'ГЕС і ГАЕС', 'СЕС і ВЕС'];
    const values = [state.aes, state.tes, state.ges, state.vde];
    const bgColors = ['#262B31', '#5C5145', '#8C7D6B', '#C2B39E'];
    if (state.entsoe) {
      labels.push('ENTSO-E');
      values.push(1200);
      bgColors.push('#2E6B4E');
    }

    chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: bgColors,
          borderColor: '#F7F1E8',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 200 },
        plugins: {
          legend: {
            position: isMobile ? 'bottom' : 'right',
            labels: {
              color: '#1E2226',
              boxWidth: isMobile ? 12 : 16,
              padding: isMobile ? 10 : 14,
              font: { size: isMobile ? 11 : 12, weight: '600' }
            }
          }
        }
      }
    });
  }
}

function updateSvgPair(m) {
  const genText = `${fmt(m.totalGen)} МВт`;
  const loadText = `${fmt(state.demand)} МВт`;
  const loadColor = m.achrActive ? '#A63A2B' : '#353C44';
  const loadSub = m.achrActive ? 'АЧР · Обмеження' : '380 / 220 В';

  // Desktop SVG
  el.svgGenVal.textContent = genText;
  el.svgLoadVal.textContent = loadText;
  el.labelMain.textContent = state.fault ? 'ОБРИВ ОСНОВНОЇ ЛЕП' : `Основна ЛЕП · ${state.uKv} кВ`;
  el.labelMain.setAttribute('fill', state.fault ? '#A63A2B' : '#262B31');
  el.svgLoadBox.setAttribute('fill', loadColor);
  el.svgLoadSub.textContent = loadSub;

  // Mobile SVG
  el.mSvgGenVal.textContent = genText;
  el.mSvgLoadVal.textContent = loadText;
  el.mLabelMain.textContent = state.fault ? 'ОБРИВ' : `${state.uKv} кВ`;
  el.mLabelMain.setAttribute('fill', state.fault ? '#A63A2B' : '#262B31');
  el.mSvgLoadBox.setAttribute('fill', loadColor);
  el.mSvgLoadSub.textContent = loadSub;

  if (state.fault) {
    el.lineMain.setAttribute('stroke', '#A63A2B');
    el.lineMain.setAttribute('class', 'flow-broken');
    el.lineBackup.setAttribute('stroke', '#262B31');
    el.lineBackup.setAttribute('stroke-width', '4.2');
    el.lineBackup.setAttribute('class', 'flow-heavy');
    el.labelBackup.textContent = `Резервна гілка (перевантажена · ${state.uKv} кВ)`;
    el.faultMarker.setAttribute('opacity', '1');

    el.mLineMain.setAttribute('stroke', '#A63A2B');
    el.mLineMain.setAttribute('class', 'flow-broken');
    el.mLineBackup.setAttribute('stroke', '#262B31');
    el.mLineBackup.setAttribute('stroke-width', '4');
    el.mLineBackup.setAttribute('class', 'flow-heavy');
    el.mLabelBackup.textContent = 'Резерв (×2)';
    el.mFaultMarker.setAttribute('opacity', '1');

    el.gridStatusText.textContent = 'Аварія ЛЕП: струм іде резервним кільцем (R × 2)';
    el.gridStatusText.className = 'text-xs font-semibold text-[#A63A2B]';
  } else {
    el.lineMain.setAttribute('stroke', '#262B31');
    el.lineMain.setAttribute('class', 'flow-active');
    el.lineBackup.setAttribute('stroke', '#5C5145');
    el.lineBackup.setAttribute('stroke-width', '3');
    el.lineBackup.setAttribute('class', 'flow-active');
    el.labelBackup.textContent = 'Резервна гілка кільця';
    el.faultMarker.setAttribute('opacity', '0');

    el.mLineMain.setAttribute('stroke', '#262B31');
    el.mLineMain.setAttribute('class', 'flow-active');
    el.mLineBackup.setAttribute('stroke', '#5C5145');
    el.mLineBackup.setAttribute('stroke-width', '3');
    el.mLineBackup.setAttribute('class', 'flow-active');
    el.mLabelBackup.textContent = 'Резерв';
    el.mFaultMarker.setAttribute('opacity', '0');

    el.gridStatusText.textContent = 'Обидві гілки кільця активні';
    el.gridStatusText.className = 'text-xs font-semibold text-[#2E6B4E]';
  }
}

function updateUI() {
  const m = computeModel();

  el.valR.textContent = `${state.rBranch} Ом (екв.: ${m.rEq} Ом)`;
  el.valAes.textContent = `${fmt(state.aes)} МВт`;
  el.valTes.textContent = `${fmt(state.tes)} МВт`;
  el.valGes.textContent = `${fmt(state.ges)} МВт`;
  el.valVde.textContent = `${fmt(state.vde)} МВт`;
  el.valDemand.textContent = `${fmt(state.demand)} МВт`;

  document.querySelectorAll('.u-btn').forEach(btn => {
    const active = Number(btn.dataset.u) === state.uKv;
    btn.className = active
      ? 'u-btn py-2.5 sm:py-1.5 rounded-lg text-xs font-bold bg-[#262B31] text-[#F7F1E8] transition'
      : 'u-btn py-2.5 sm:py-1.5 rounded-lg text-xs font-bold bg-[#E5D8C6] text-[#1E2226] hover:bg-[#D8C7B0] transition';
  });

  el.kpiFreq.textContent = `${fmt(m.freq, 2)} Гц`;
  if (m.achrActive) {
    el.freqBadge.textContent = 'АЧР';
    el.freqBadge.className = 'text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#A63A2B] text-[#F7F1E8]';
    el.kpiFreq.className = 'text-xl sm:text-3xl font-bold mt-1.5 text-[#A63A2B]';
  } else if (m.freq < 49.8 || m.freq > 50.2) {
    el.freqBadge.textContent = 'УВАГА';
    el.freqBadge.className = 'text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#B45309]/20 text-[#92400E]';
    el.kpiFreq.className = 'text-xl sm:text-3xl font-bold mt-1.5 text-[#92400E]';
  } else {
    el.freqBadge.textContent = 'НОРМА';
    el.freqBadge.className = 'text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#2E6B4E]/15 text-[#2E6B4E]';
    el.kpiFreq.className = 'text-xl sm:text-3xl font-bold mt-1.5 text-[#1E2226]';
  }

  const sign = m.balanceMw >= 0 ? '+' : '';
  el.kpiBalance.textContent = `${sign}${fmt(m.balanceMw)} МВт`;
  el.kpiBalance.className = m.balanceMw < -300
    ? 'text-xl sm:text-3xl font-bold mt-1.5 text-[#A63A2B]'
    : 'text-xl sm:text-3xl font-bold mt-1.5 text-[#1E2226]';
  el.kpiBalanceSub.textContent = `${fmt(m.totalGen)} / ${fmt(state.demand)} МВт`;

  el.kpiLoss.textContent = `${fmt(m.lossMw, m.lossMw < 0.1 ? 4 : 2)} МВт`;
  el.kpiLossSub.textContent = `I = ${fmt(m.currentA, 1)} А · R = ${m.rEq} Ом`;

  el.kpiEff.textContent = `${fmt(m.effPct, 2)}%`;
  el.kpiEffSub.textContent = `Напруга: ${state.uKv} кВ`;

  if (m.achrActive) {
    el.alertBanner.classList.remove('hidden');
    el.alertText.textContent = `Частота впала до ${fmt(m.freq, 2)} Гц (< 49,50 Гц). Спрацювала автоматика АЧР — частину навантаження відключено.`;
    el.btnEntsoeQuick.classList.toggle('hidden', state.entsoe);
  } else if (m.effPct < 50) {
    el.alertBanner.classList.remove('hidden');
    el.alertText.textContent = `Критичні теплові втрати (${fmt(100 - m.effPct, 1)}%) при ${state.uKv} кВ (I = ${fmt(m.currentA, 0)} А). Підвищте напругу до 110–750 кВ.`;
    el.btnEntsoeQuick.classList.add('hidden');
  } else {
    el.alertBanner.classList.add('hidden');
  }

  updateSvgPair(m);
  renderChart(m);
}

function applyPreset(name) {
  if (name === 'normal') {
    Object.assign(state, { uKv: 330, rBranch: 20, fault: false, entsoe: false, aes: 6000, tes: 2500, ges: 1200, vde: 1000, demand: 10500 });
  } else if (name === 'peak') {
    Object.assign(state, { uKv: 330, rBranch: 20, fault: false, entsoe: false, aes: 6000, tes: 2200, ges: 1200, vde: 200, demand: 12200 });
  } else if (name === 'fault') {
    Object.assign(state, { uKv: 330, rBranch: 20, fault: true, entsoe: false, aes: 6000, tes: 2500, ges: 1200, vde: 1000, demand: 10500 });
  } else if (name === 'lowv') {
    Object.assign(state, { uKv: 10, rBranch: 20, fault: false, entsoe: false, aes: 6000, tes: 2500, ges: 1200, vde: 1000, demand: 10500, chartMode: 'loss' });
  }
  syncInputsFromState();
  document.querySelectorAll('.preset-btn').forEach(b => {
    const active = b.dataset.preset === name;
    b.className = active
      ? 'preset-btn px-3 py-2.5 sm:py-1.5 rounded-lg text-xs font-semibold bg-[#262B31] text-[#F7F1E8] hover:bg-[#353C44] transition text-left sm:text-center'
      : 'preset-btn px-3 py-2.5 sm:py-1.5 rounded-lg text-xs font-semibold bg-[#E5D8C6] text-[#1E2226] hover:bg-[#D8C7B0] transition text-left sm:text-center';
  });
  updateUI();
}

function syncInputsFromState() {
  el.sliderR.value = state.rBranch;
  el.toggleFault.checked = state.fault;
  el.toggleEntsoe.checked = state.entsoe;
  el.sliderAes.value = state.aes;
  el.sliderTes.value = state.tes;
  el.sliderGes.value = state.ges;
  el.sliderVde.value = state.vde;
  el.sliderDemand.value = state.demand;
}

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
});

document.querySelectorAll('.u-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    state.uKv = Number(btn.dataset.u);
    updateUI();
  });
});

el.sliderR.addEventListener('input', e => { state.rBranch = Number(e.target.value); updateUI(); });
el.toggleFault.addEventListener('change', e => { state.fault = e.target.checked; updateUI(); });
el.toggleEntsoe.addEventListener('change', e => { state.entsoe = e.target.checked; updateUI(); });
el.btnEntsoeQuick.addEventListener('click', () => {
  state.entsoe = true;
  el.toggleEntsoe.checked = true;
  updateUI();
});

el.sliderAes.addEventListener('input', e => { state.aes = Number(e.target.value); updateUI(); });
el.sliderTes.addEventListener('input', e => { state.tes = Number(e.target.value); updateUI(); });
el.sliderGes.addEventListener('input', e => { state.ges = Number(e.target.value); updateUI(); });
el.sliderVde.addEventListener('input', e => { state.vde = Number(e.target.value); updateUI(); });
el.sliderDemand.addEventListener('input', e => { state.demand = Number(e.target.value); updateUI(); });

el.tabLoss.addEventListener('click', () => {
  state.chartMode = 'loss';
  el.tabLoss.className = 'flex-1 sm:flex-none px-3 py-1.5 sm:py-1 rounded-md text-xs font-bold bg-[#262B31] text-[#F7F1E8] transition';
  el.tabMix.className = 'flex-1 sm:flex-none px-3 py-1.5 sm:py-1 rounded-md text-xs font-bold text-[#1E2226] transition';
  updateUI();
});

el.tabMix.addEventListener('click', () => {
  state.chartMode = 'mix';
  el.tabMix.className = 'flex-1 sm:flex-none px-3 py-1.5 sm:py-1 rounded-md text-xs font-bold bg-[#262B31] text-[#F7F1E8] transition';
  el.tabLoss.className = 'flex-1 sm:flex-none px-3 py-1.5 sm:py-1 rounded-md text-xs font-bold text-[#1E2226] transition';
  updateUI();
});

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => renderChart(computeModel()), 150);
});

updateUI();
