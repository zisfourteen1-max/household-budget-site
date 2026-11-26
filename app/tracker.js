// DompetKu — tracker.js
// Daftar pengeluaran: tambah / ubah / hapus, total per kategori, dan
// grafiknya (donat alokasi + batang vs patokan BPS). Semua angka dirender
// dari data.js + calc.js — tidak ada angka yang ditulis tangan di HTML.

import { CATEGORIES, categoryLabel, BPS_BENCHMARK } from './data.js';
import { rupiah, rupiahShort, totalsByCategory, foodVsNonFood, allocationDonut } from './calc.js';

let nextId = 100;
export function newExpenseId() {
  nextId += 1;
  return 'u' + nextId;
}

// --- CRUD (murni array, supaya state di app.js tetap satu sumber) --------
export function addExpense(expenses, name, category, amount) {
  const clean = String(name || '').trim();
  const amt = Math.max(0, Math.round(Number(amount) || 0));
  if (!clean || amt <= 0) return { ok: false, error: 'Isi nama dan jumlah yang benar (lebih dari Rp0).' };
  if (!CATEGORIES.some((c) => c.id === category)) return { ok: false, error: 'Pilih kategori dulu.' };
  const row = { id: newExpenseId(), name: clean, category, amount: amt };
  return { ok: true, row, expenses: [...expenses, row] };
}

export function updateExpense(expenses, id, name, category, amount) {
  const clean = String(name || '').trim();
  const amt = Math.max(0, Math.round(Number(amount) || 0));
  if (!clean || amt <= 0) return { ok: false, error: 'Isi nama dan jumlah yang benar (lebih dari Rp0).' };
  if (!CATEGORIES.some((c) => c.id === category)) return { ok: false, error: 'Pilih kategori dulu.' };
  const next = expenses.map((e) => (e.id === id ? { ...e, name: clean, category, amount: amt } : e));
  return { ok: true, expenses: next };
}

export function removeExpense(expenses, id) {
  return expenses.filter((e) => e.id !== id);
}

export function totalSpending(expenses) {
  return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
}

// --- Render: tabel pengeluaran -------------------------------------------
export function renderExpenseTable(tbody, expenses, onEdit, onDelete) {
  tbody.innerHTML = '';
  if (expenses.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="4" class="empty">Belum ada pengeluaran. Tambahkan yang pertama di bawah.</td>';
    tbody.appendChild(tr);
    return;
  }
  for (const e of expenses) {
    const tr = document.createElement('tr');
    const tdName = document.createElement('td');
    tdName.textContent = e.name;
    const tdCat = document.createElement('td');
    const chip = document.createElement('span');
    chip.className = 'chip cat-' + e.category;
    chip.textContent = categoryLabel(e.category);
    tdCat.appendChild(chip);
    const tdAmt = document.createElement('td');
    tdAmt.className = 'num';
    tdAmt.textContent = rupiah(e.amount);
    const tdAct = document.createElement('td');
    tdAct.className = 'actions';
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn small';
    editBtn.textContent = 'Ubah';
    editBtn.addEventListener('click', () => onEdit(e));
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn small danger';
    delBtn.textContent = 'Hapus';
    delBtn.addEventListener('click', () => onDelete(e));
    tdAct.append(editBtn, delBtn);
    tr.append(tdName, tdCat, tdAmt, tdAct);
    tbody.appendChild(tr);
  }
}

// --- Render: total per kategori ------------------------------------------
export function renderCategoryTotals(container, expenses) {
  const totals = totalsByCategory(expenses);
  const total = totalSpending(expenses);
  container.innerHTML = '';
  for (const cat of CATEGORIES) {
    const amt = totals[cat.id] || 0;
    if (amt === 0) continue;
    const pct = total > 0 ? Math.round((amt / total) * 100) : 0;
    const row = document.createElement('div');
    row.className = 'cat-row';
    const label = document.createElement('span');
    label.className = 'cat-label';
    label.textContent = cat.label;
    const barWrap = document.createElement('div');
    barWrap.className = 'bar-track';
    const bar = document.createElement('div');
    bar.className = 'bar-fill cat-' + cat.id;
    bar.style.width = Math.max(pct, 2) + '%';
    barWrap.appendChild(bar);
    const val = document.createElement('span');
    val.className = 'cat-value num';
    val.textContent = `${rupiah(amt)} · ${pct}%`;
    row.append(label, barWrap, val);
    container.appendChild(row);
  }
  if (container.children.length === 0) {
    container.textContent = 'Belum ada pengeluaran.';
  }
}

// --- Render: donat alokasi (SVG) -----------------------------------------
export function renderDonut(svg, income, expenses) {
  const d = allocationDonut(income, expenses);
  const R = 80;
  const C = 2 * Math.PI * R;
  const seg = (value, offset, color) => {
    const len = (value / (d.total || 1)) * C;
    return `<circle r="${R}" cx="100" cy="100" fill="none" stroke="${color}" stroke-width="34"
      stroke-dasharray="${len.toFixed(1)} ${(C - len).toFixed(1)}"
      stroke-dashoffset="${(-offset).toFixed(1)}" transform="rotate(-90 100 100)"/>`;
  };
  const needsLen = (d.needs / (d.total || 1)) * C;
  const wantsLen = (d.wants / (d.total || 1)) * C;
  svg.innerHTML =
    seg(d.needs, 0, '#2e7d4f') +
    seg(d.wants, needsLen, '#e8a33d') +
    seg(d.savings, needsLen + wantsLen, '#7fb069') +
    `<text x="100" y="96" text-anchor="middle" class="donut-center-num">${rupiahShort(d.total)}</text>
     <text x="100" y="118" text-anchor="middle" class="donut-center-label">per bulan</text>`;
  return d;
}

// --- Render: batang vs patokan BPS ----------------------------------------
export function renderBenchmarkBars(container, expenses) {
  const { food, nonFood, total } = foodVsNonFood(expenses);
  const b = BPS_BENCHMARK;
  const rows = [
    { label: 'Pangan (punyamu)', value: food, bench: b.householdFood, benchLabel: 'Patokan BPS: ' + rupiah(b.householdFood) },
    { label: 'Non-pangan (punyamu)', value: nonFood, bench: b.householdNonFood, benchLabel: 'Patokan BPS: ' + rupiah(b.householdNonFood) },
    { label: 'Total (punyamu)', value: total, bench: b.householdTotal, benchLabel: 'Patokan BPS: ' + rupiah(b.householdTotal) },
  ];
  container.innerHTML = '';
  for (const r of rows) {
    const max = Math.max(r.value, r.bench);
    const wrap = document.createElement('div');
    wrap.className = 'bench-row';
    const head = document.createElement('div');
    head.className = 'bench-head';
    const lab = document.createElement('span');
    lab.textContent = r.label;
    const val = document.createElement('span');
    val.className = 'num';
    val.textContent = rupiah(r.value);
    head.append(lab, val);
    const track = document.createElement('div');
    track.className = 'bar-track bench-track';
    const fill = document.createElement('div');
    fill.className = 'bar-fill bench-you';
    fill.style.width = (max > 0 ? (r.value / max) * 100 : 0) + '%';
    const mark = document.createElement('div');
    mark.className = 'bench-mark';
    mark.style.left = (max > 0 ? (r.bench / max) * 100 : 0) + '%';
    mark.title = r.benchLabel;
    track.append(fill, mark);
    const foot = document.createElement('div');
    foot.className = 'bench-foot';
    const verdict = r.value <= r.bench ? 'di bawah patokan ✓' : 'di atas patokan — cek lagi';
    foot.textContent = `${r.benchLabel} · ${verdict}`;
    wrap.append(head, track, foot);
    container.appendChild(wrap);
  }
}
