// DompetKu — app.js
// Pengendali utama: state di memori, navigasi antar 4 bagian, dan semua
// pengendali (input, slider, tombol) yang menghitung ulang secara langsung.
// Penyimpanan: localStorage dipakai hanya kalau tersedia, dengan fallback
// memori penuh — situs tidak pernah bergantung pada penyimpanan.

import {
  CATEGORIES, INCOME_PRESETS, BPS_BENCHMARK, POVERTY_LINE,
  EXAMPLE_FAMILY, INITIAL_EXPENSES, TIPS, RULE_503020,
} from './data.js';
import {
  rupiah, rupiahSigned, split503020, compareToRule,
  dashboardSummary, goalMonths, emergencyFund,
} from './calc.js';
import {
  addExpense, updateExpense, removeExpense, totalSpending,
  renderExpenseTable, renderCategoryTotals, renderDonut, renderBenchmarkBars,
} from './tracker.js';

const $ = (id) => document.getElementById(id);
const moneyInput = (el) => Math.max(0, Math.round(Number(String(el.value).replace(/[^0-9]/g, '')) || 0));

// --- State (memori dulu; localStorage hanya bonus) -------------------------
const STORE_KEY = 'dompetku-v1';
let state = {
  income: EXAMPLE_FAMILY.income,
  incomeLabel: EXAMPLE_FAMILY.name + ' (contoh)',
  expenses: INITIAL_EXPENSES.map((e) => ({ ...e })),
  calcPct: { ...RULE_503020 },
  goal: { target: 12000000, monthly: 500000, saved: 2000000, name: 'DP motor baru' },
  emergencySaved: 3500000,
  editingId: null,
};

function loadStored() {
  try {
    const raw = window.localStorage && window.localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved && typeof saved === 'object') {
      if (Number.isFinite(saved.income)) state.income = saved.income;
      if (typeof saved.incomeLabel === 'string') state.incomeLabel = saved.incomeLabel;
      if (Array.isArray(saved.expenses) && saved.expenses.length) state.expenses = saved.expenses;
      if (saved.calcPct) state.calcPct = { ...RULE_503020, ...saved.calcPct };
      if (saved.goal) state.goal = { ...state.goal, ...saved.goal };
      if (Number.isFinite(saved.emergencySaved)) state.emergencySaved = saved.emergencySaved;
    }
  } catch {
    // Penyimpanan diblokir / rusak: tetap jalan dengan memori.
  }
}

function saveStored() {
  try {
    if (!window.localStorage) return;
    window.localStorage.setItem(STORE_KEY, JSON.stringify({
      income: state.income,
      incomeLabel: state.incomeLabel,
      expenses: state.expenses,
      calcPct: state.calcPct,
      goal: state.goal,
      emergencySaved: state.emergencySaved,
    }));
  } catch {
    // Abaikan: memori tetap sumber kebenaran.
  }
}

// --- Navigasi ---------------------------------------------------------------
const SECTIONS = ['dashboard', 'kalkulator', 'pelacak', 'target'];

function showSection(name) {
  const target = SECTIONS.includes(name) ? name : 'dashboard';
  for (const s of SECTIONS) {
    const el = $('section-' + s);
    if (el) el.hidden = s !== target;
    const link = document.querySelector(`[data-nav="${s}"]`);
    if (link) link.setAttribute('aria-current', s === target ? 'page' : 'false');
  }
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function routeFromHash() {
  const hash = (window.location.hash || '').replace(/^#\/?/, '');
  showSection(hash);
}

// --- Dasbor -----------------------------------------------------------------
function renderDashboard() {
  const spent = totalSpending(state.expenses);
  const s = dashboardSummary(state.income, spent);
  $('dash-income').textContent = rupiah(s.income);
  $('dash-spent').textContent = rupiah(s.spent);
  $('dash-remaining').textContent = rupiahSigned(s.remaining);
  $('dash-remaining').classList.toggle('negative', s.remaining < 0);
  $('dash-rate').textContent = s.savingsRate.toFixed(1).replace('.', ',') + '%';
  const statusEl = $('dash-status');
  statusEl.textContent = s.statusText;
  statusEl.classList.toggle('ok', s.status === 'surplus');
  statusEl.classList.toggle('bad', s.status === 'defisit');
  $('dash-income-note').textContent = 'Penghasilan: ' + state.incomeLabel;
  $('dash-bench-note').textContent =
    `Patokan BPS 2025 untuk rumah tangga 4 orang: ${rupiah(BPS_BENCHMARK.householdTotal)}/bulan ` +
    `(pangan ${rupiah(BPS_BENCHMARK.householdFood)} + non-pangan ${rupiah(BPS_BENCHMARK.householdNonFood)}). ` +
    `Satu UMP Jakarta 2026 (${rupiah(5729876)}) berada di bawah patokan ini — keluarga 4 orang umumnya butuh dua penghasilan atau pengeluaran di bawah rata-rata.`;
  const d = renderDonut($('donut'), state.income, state.expenses);
  $('donut-needs').textContent = `${rupiah(d.needs)} · ${d.needsPct}%`;
  $('donut-wants').textContent = `${rupiah(d.wants)} · ${d.wantsPct}%`;
  $('donut-savings').textContent = `${rupiah(d.savings)} · ${d.savingsPct}%`;
}

// --- Kalkulator 50/30/20 -----------------------------------------------------
function renderCalculator() {
  const inc = state.income;
  $('calc-income').value = inc;
  const { needs, wants, savings } = state.calcPct;
  $('calc-needs-pct').value = needs;
  $('calc-wants-pct').value = wants;
  $('calc-savings-pct').value = savings;
  $('calc-needs-pct-label').textContent = needs + '%';
  $('calc-wants-pct-label').textContent = wants + '%';
  $('calc-savings-pct-label').textContent = savings + '%';
  const split = split503020(inc, needs, wants, savings);
  $('calc-needs-amount').textContent = rupiah(split.needs);
  $('calc-wants-amount').textContent = rupiah(split.wants);
  $('calc-savings-amount').textContent = rupiah(split.savings);
  $('calc-total-note').textContent =
    `Total ${rupiah(split.total)} dari penghasilan ${rupiah(inc)}. ` +
    (split.total === inc ? 'Pas 100%.' : `Selisih ${rupiah(Math.abs(split.total - inc))} dari penghasilan — geser slider sampai pas 100%.`);
  const ideal = split503020(inc, RULE_503020.needs, RULE_503020.wants, RULE_503020.savings);
  $('calc-ideal-needs').textContent = rupiah(ideal.needs);
  $('calc-ideal-wants').textContent = rupiah(ideal.wants);
  $('calc-ideal-savings').textContent = rupiah(ideal.savings);
  const cmp = (pct, rule) => compareToRule(pct, rule).text;
  $('calc-needs-cmp').textContent = cmp(needs, RULE_503020.needs);
  $('calc-wants-cmp').textContent = cmp(wants, RULE_503020.wants);
  $('calc-savings-cmp').textContent = cmp(savings, RULE_503020.savings);
  // Batang perbandingan: punyamu vs patokan.
  const bar = (id, mine, idealVal) => {
    const el = $(id);
    const max = Math.max(mine, idealVal, 1);
    el.innerHTML = '';
    const mineBar = document.createElement('div');
    mineBar.className = 'bar-fill compare-mine';
    mineBar.style.width = (mine / max) * 100 + '%';
    const idealMark = document.createElement('div');
    idealMark.className = 'bench-mark';
    idealMark.style.left = (idealVal / max) * 100 + '%';
    el.append(mineBar, idealMark);
  };
  bar('bar-needs', split.needs, ideal.needs);
  bar('bar-wants', split.wants, ideal.wants);
  bar('bar-savings', split.savings, ideal.savings);
}

// --- Pelacak -----------------------------------------------------------------
function renderTracker() {
  const spent = totalSpending(state.expenses);
  $('tracker-total').textContent = rupiah(spent);
  $('tracker-count').textContent = state.expenses.length + ' baris';
  renderExpenseTable($('expense-rows'), state.expenses, startEdit, deleteRow);
  renderCategoryTotals($('category-totals'), state.expenses);
  renderBenchmarkBars($('benchmark-bars'), state.expenses);
  $('bench-source').textContent =
    `Patokan: ${BPS_BENCHMARK.source} — rata-rata ${rupiah(BPS_BENCHMARK.perCapita)} per kapita/bulan ` +
    `(pangan ${rupiah(BPS_BENCHMARK.foodPerCapita)}, non-pangan ${rupiah(BPS_BENCHMARK.nonFoodPerCapita)}), ` +
    `dikalikan ${BPS_BENCHMARK.householdSize} orang. Pembanding: Susenas Sep 2025 ${rupiah(BPS_BENCHMARK.susenasSep2025.perCapita)}/kapita/bulan.`;
}

function startEdit(expense) {
  state.editingId = expense.id;
  $('exp-name').value = expense.name;
  $('exp-category').value = expense.category;
  $('exp-amount').value = expense.amount;
  $('exp-submit').textContent = 'Simpan perubahan';
  $('exp-cancel').hidden = false;
  $('exp-form-title').textContent = 'Ubah pengeluaran';
  $('exp-name').focus();
}

function cancelEdit() {
  state.editingId = null;
  $('exp-name').value = '';
  $('exp-amount').value = '';
  $('exp-category').value = 'makan';
  $('exp-submit').textContent = 'Tambah pengeluaran';
  $('exp-cancel').hidden = true;
  $('exp-form-title').textContent = 'Tambah pengeluaran';
  $('exp-error').textContent = '';
}

function deleteRow(expense) {
  state.expenses = removeExpense(state.expenses, expense.id);
  if (state.editingId === expense.id) cancelEdit();
  saveStored();
  renderAll();
}

// --- Target & dana darurat ----------------------------------------------------
function renderGoals() {
  const g = state.goal;
  $('goal-name').value = g.name;
  $('goal-target').value = g.target;
  $('goal-monthly').value = g.monthly;
  $('goal-saved').value = g.saved;
  const res = goalMonths(g.target, g.monthly, g.saved);
  if (res.done) {
    $('goal-result').textContent = `Tercapai! ${g.name} seharga ${rupiah(g.target)} sudah terkumpul.`;
  } else if (!Number.isFinite(res.months)) {
    $('goal-result').textContent = 'Isi tabungan bulanan lebih dari Rp0 untuk menghitung waktunya.';
  } else {
    const years = Math.floor(res.months / 12);
    const months = res.months % 12;
    const when = years > 0 ? `${years} tahun ${months} bulan` : `${months} bulan`;
    $('goal-result').textContent =
      `${g.name}: kurang ${rupiah(res.left)} lagi — dengan ${rupiah(g.monthly)}/bulan, tercapai dalam ${res.months} bulan (${when}).`;
  }
  $('emergency-saved').value = state.emergencySaved;
  const spent = totalSpending(state.expenses);
  $('emergency-spent').textContent = rupiah(spent);
  const ef = emergencyFund(spent, state.emergencySaved);
  $('emg3-target').textContent = rupiah(ef.three.target);
  $('emg3-left').textContent = ef.three.left === 0 ? 'Tercapai ✓' : `Kurang ${rupiah(ef.three.left)} · ${ef.three.pct}%`;
  $('emg3-bar').style.width = ef.three.pct + '%';
  $('emg6-target').textContent = rupiah(ef.six.target);
  $('emg6-left').textContent = ef.six.left === 0 ? 'Tercapai ✓' : `Kurang ${rupiah(ef.six.left)} · ${ef.six.pct}%`;
  $('emg6-bar').style.width = ef.six.pct + '%';
  $('poverty-note').textContent =
    `Garis kemiskinan ${POVERTY_LINE.source}: ${rupiah(POVERTY_LINE.perCapita)} per orang/bulan ` +
    `(${rupiah(POVERTY_LINE.perCapita * 4)} untuk keluarga 4 orang). Di bawah garis ini, sebuah keluarga tergolong miskin menurut BPS.`;
}

function renderTips() {
  const list = $('tips-list');
  list.innerHTML = '';
  for (const tip of TIPS) {
    const li = document.createElement('li');
    const h = document.createElement('h3');
    h.textContent = tip.title;
    const p = document.createElement('p');
    p.textContent = tip.body;
    li.append(h, p);
    list.appendChild(li);
  }
}

// --- Semua render --------------------------------------------------------------
function renderAll() {
  renderDashboard();
  renderCalculator();
  renderTracker();
  renderGoals();
}

// --- Pengendali ------------------------------------------------------------------
function bindControls() {
  // Nav
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      window.location.hash = '#/' + a.dataset.nav;
      routeFromHash();
    });
  });
  window.addEventListener('hashchange', routeFromHash);

  // Preset penghasilan (dasbor + kalkulator berbagi state.income).
  const presetBox = $('income-presets');
  for (const p of INCOME_PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn preset';
    btn.textContent = `${p.label} · ${rupiah(p.amount)}`;
    btn.title = p.note;
    btn.addEventListener('click', () => {
      state.income = p.amount;
      state.incomeLabel = p.label;
      $('income-custom').value = p.amount;
      saveStored();
      renderAll();
    });
    presetBox.appendChild(btn);
  }
  $('income-custom').addEventListener('input', () => {
    const v = moneyInput($('income-custom'));
    if (v > 0) {
      state.income = v;
      state.incomeLabel = 'Penghasilan sendiri';
      saveStored();
      renderAll();
    }
  });

  // Kalkulator: slider persen — jumlah ketiganya dijaga 100% dengan
  // menggeser tabungan sebagai penyeimbang bila perlu.
  const sliders = [
    ['calc-needs-pct', 'needs'],
    ['calc-wants-pct', 'wants'],
    ['calc-savings-pct', 'savings'],
  ];
  for (const [id, key] of sliders) {
    $(id).addEventListener('input', () => {
      state.calcPct[key] = Number($(id).value);
      const sum = state.calcPct.needs + state.calcPct.wants + state.calcPct.savings;
      if (sum !== 100) {
        const others = ['needs', 'wants', 'savings'].filter((k) => k !== key);
        const adjust = others[1]; // tabungan/keinginan jadi penyeimbang
        state.calcPct[adjust] = Math.max(0, Math.min(100, state.calcPct[adjust] + (100 - sum)));
      }
      saveStored();
      renderCalculator();
    });
  }
  $('calc-income').addEventListener('input', () => {
    const v = moneyInput($('calc-income'));
    if (v > 0) {
      state.income = v;
      state.incomeLabel = 'Penghasilan sendiri';
      $('income-custom').value = v;
      saveStored();
      renderAll();
    }
  });
  $('calc-reset').addEventListener('click', () => {
    state.calcPct = { ...RULE_503020 };
    saveStored();
    renderCalculator();
  });

  // Pelacak: form tambah/ubah.
  const catSelect = $('exp-category');
  for (const c of CATEGORIES) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.label;
    catSelect.appendChild(opt);
  }
  $('exp-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const name = $('exp-name').value;
    const category = $('exp-category').value;
    const amount = moneyInput($('exp-amount'));
    let res;
    if (state.editingId) {
      res = updateExpense(state.expenses, state.editingId, name, category, amount);
    } else {
      res = addExpense(state.expenses, name, category, amount);
    }
    if (!res.ok) {
      $('exp-error').textContent = res.error;
      return;
    }
    state.expenses = res.expenses;
    cancelEdit();
    saveStored();
    renderAll();
  });
  $('exp-cancel').addEventListener('click', cancelEdit);

  // Ekspor / impor JSON.
  $('export-json').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({
      income: state.income,
      incomeLabel: state.incomeLabel,
      expenses: state.expenses,
      calcPct: state.calcPct,
      goal: state.goal,
      emergencySaved: state.emergencySaved,
    }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dompetku-anggaran.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('import-json').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async () => {
    const file = $('import-file').files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (Number.isFinite(data.income)) state.income = data.income;
      if (typeof data.incomeLabel === 'string') state.incomeLabel = data.incomeLabel;
      if (Array.isArray(data.expenses)) state.expenses = data.expenses.filter((e) => e && e.name && Number.isFinite(e.amount));
      if (data.calcPct) state.calcPct = { ...RULE_503020, ...data.calcPct };
      if (data.goal) state.goal = { ...state.goal, ...data.goal };
      if (Number.isFinite(data.emergencySaved)) state.emergencySaved = data.emergencySaved;
      state.editingId = null;
      saveStored();
      renderAll();
      $('import-note').textContent = 'Data berhasil diimpor.';
    } catch {
      $('import-note').textContent = 'File tidak bisa dibaca — pastikan itu file JSON dari DompetKu.';
    }
    $('import-file').value = '';
  });
  $('reset-data').addEventListener('click', () => {
    state = {
      income: EXAMPLE_FAMILY.income,
      incomeLabel: EXAMPLE_FAMILY.name + ' (contoh)',
      expenses: INITIAL_EXPENSES.map((e) => ({ ...e })),
      calcPct: { ...RULE_503020 },
      goal: { target: 12000000, monthly: 500000, saved: 2000000, name: 'DP motor baru' },
      emergencySaved: 3500000,
      editingId: null,
    };
    try { window.localStorage && window.localStorage.removeItem(STORE_KEY); } catch { /* abaikan */ }
    cancelEdit();
    renderAll();
  });

  // Target & dana darurat.
  const goalFields = [
    ['goal-name', 'name', (v) => String(v)],
    ['goal-target', 'target', (el) => moneyInput(el)],
    ['goal-monthly', 'monthly', (el) => moneyInput(el)],
    ['goal-saved', 'saved', (el) => moneyInput(el)],
  ];
  for (const [id, key, parse] of goalFields) {
    $(id).addEventListener('input', () => {
      state.goal[key] = id === 'goal-name' ? parse($(id).value) : parse($(id));
      saveStored();
      renderGoals();
    });
  }
  $('emergency-saved').addEventListener('input', () => {
    state.emergencySaved = moneyInput($('emergency-saved'));
    saveStored();
    renderGoals();
  });
}

// --- Mulai ---------------------------------------------------------------------
loadStored();
bindControls();
renderTips();
renderAll();
routeFromHash();
