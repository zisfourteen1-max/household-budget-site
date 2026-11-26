// DompetKu — calc.js
// Semua hitungan uang rumah tangga. Murni fungsi: tanpa DOM, tanpa state,
// supaya gampang dites (node --check dan hitung manual).

// Format angka menjadi "Rp7.000.000". Nol dan negatif tetap tampil wajar.
export function rupiah(n) {
  const v = Math.round(Number(n) || 0);
  return 'Rp' + Math.abs(v).toLocaleString('id-ID');
}

export function rupiahSigned(n) {
  const v = Math.round(Number(n) || 0);
  return (v < 0 ? '−' : '') + rupiah(v);
}

// "Rp6,1 jt" — versi ringkas untuk label grafik.
export function rupiahShort(n) {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1000000) {
    const jt = v / 1000000;
    const s = Number.isInteger(jt) ? String(jt) : jt.toFixed(1).replace('.', ',');
    return 'Rp' + s + ' jt';
  }
  if (Math.abs(v) >= 1000) return 'Rp' + Math.round(v / 1000) + ' rb';
  return rupiah(v);
}

// Aturan 50/30/20: bagi penghasilan menurut persen kebutuhan / keinginan /
// tabungan. Mengembalikan rupiah per kelompok dan totalnya.
export function split503020(income, needsPct, wantsPct, savingsPct) {
  const inc = Math.max(0, Number(income) || 0);
  const needs = Math.round((inc * needsPct) / 100);
  const wants = Math.round((inc * wantsPct) / 100);
  const savings = Math.round((inc * savingsPct) / 100);
  return { income: inc, needs, wants, savings, total: needs + wants + savings };
}

// Perbandingan pembagian pengunjung dengan patokan 50/30/20.
export function compareToRule(pct, rulePct) {
  const diff = Math.round((pct - rulePct) * 10) / 10;
  if (diff === 0) return { diff, text: 'pas dengan patokan' };
  if (diff > 0) return { diff, text: `${diff}% di atas patokan` };
  return { diff, text: `${Math.abs(diff)}% di bawah patokan` };
}

// Ringkasan dasbor: penghasilan, total belanja, sisa, dan tingkat tabungan.
export function dashboardSummary(income, totalSpending) {
  const inc = Math.max(0, Number(income) || 0);
  const spent = Math.max(0, Number(totalSpending) || 0);
  const remaining = inc - spent;
  const savingsRate = inc > 0 ? (remaining / inc) * 100 : 0;
  return {
    income: inc,
    spent,
    remaining,
    savingsRate,
    status: remaining >= 0 ? 'surplus' : 'defisit',
    statusText:
      remaining >= 0
        ? `Surplus ${rupiah(remaining)} — masih ada sisa untuk ditabung bulan ini.`
        : `Defisit ${rupiah(Math.abs(remaining))} — pengeluaran melebihi penghasilan bulan ini.`,
  };
}

// Bagi total belanja ke kebutuhan / keinginan / tabungan (sisa) untuk donat.
// Kebutuhan: Makan, Rumah, Transportasi, Pendidikan, Kesehatan.
// Keinginan: Hiburan, Lainnya. Sisa = penghasilan − belanja (dibatasi ≥ 0).
export function allocationDonut(income, expenses) {
  const needsCats = new Set(['makan', 'rumah', 'transportasi', 'pendidikan', 'kesehatan']);
  let needs = 0;
  let wants = 0;
  for (const e of expenses) {
    if (needsCats.has(e.category)) needs += e.amount;
    else wants += e.amount;
  }
  const spent = needs + wants;
  const savings = Math.max(0, (Number(income) || 0) - spent);
  const total = needs + wants + savings;
  const pct = (v) => (total > 0 ? Math.round((v / total) * 1000) / 10 : 0);
  return {
    needs, wants, savings, total,
    needsPct: pct(needs), wantsPct: pct(wants), savingsPct: pct(savings),
  };
}

// Perencana target tabungan: berapa bulan sampai tercapai.
export function goalMonths(target, monthlySaving, alreadySaved = 0) {
  const t = Math.max(0, Number(target) || 0);
  const s = Math.max(0, Number(monthlySaving) || 0);
  const have = Math.max(0, Number(alreadySaved) || 0);
  const left = Math.max(0, t - have);
  if (left === 0) return { months: 0, done: true, monthlyNeeded: 0, left: 0 };
  if (s <= 0) return { months: Infinity, done: false, monthlyNeeded: 0, left };
  return { months: Math.ceil(left / s), done: false, monthlyNeeded: s, left };
}

// Dana darurat: 3× dan 6× pengeluaran bulanan, plus progres.
export function emergencyFund(monthlySpending, alreadySaved = 0) {
  const spend = Math.max(0, Number(monthlySpending) || 0);
  const have = Math.max(0, Number(alreadySaved) || 0);
  const mk = (mult) => {
    const target = spend * mult;
    const left = Math.max(0, target - have);
    const pct = target > 0 ? Math.min(100, Math.round((have / target) * 100)) : 100;
    return { mult, target, left, pct };
  };
  return { three: mk(3), six: mk(6) };
}

// Total per kategori dari daftar pengeluaran.
export function totalsByCategory(expenses) {
  const totals = {};
  for (const e of expenses) {
    totals[e.category] = (totals[e.category] || 0) + e.amount;
  }
  return totals;
}

// Kelompok pangan vs non-pangan untuk perbandingan dengan patokan BPS.
export function foodVsNonFood(expenses) {
  let food = 0;
  let nonFood = 0;
  for (const e of expenses) {
    if (e.category === 'makan') food += e.amount;
    else nonFood += e.amount;
  }
  return { food, nonFood, total: food + nonFood };
}
