// DompetKu — data.js
// Semua angka acuan di file ini sudah diverifikasi dan selalu ditampilkan
// bersama sumber + tahunnya di halaman. Keluarga Budi adalah CONTOH
// (bukan statistik) supaya dasbor tidak kosong saat pertama dibuka.

export const CATEGORIES = [
  { id: 'makan', label: 'Makan', group: 'food' },
  { id: 'rumah', label: 'Rumah', group: 'nonfood' },
  { id: 'transportasi', label: 'Transportasi', group: 'nonfood' },
  { id: 'pendidikan', label: 'Pendidikan', group: 'nonfood' },
  { id: 'kesehatan', label: 'Kesehatan', group: 'nonfood' },
  { id: 'hiburan', label: 'Hiburan', group: 'nonfood' },
  { id: 'lainnya', label: 'Lainnya', group: 'nonfood' },
];

export const categoryLabel = (id) => {
  const found = CATEGORIES.find((c) => c.id === id);
  return found ? found.label : 'Lainnya';
};

// Preset penghasilan bulanan (Upah Minimum Provinsi 2026).
export const INCOME_PRESETS = [
  { id: 'ump-jakarta', label: 'UMP Jakarta 2026', amount: 5729876, note: 'Pemprov DKI, Kepgub 1142/2025 · +6,17% dari 2025 (Rp5.396.761)' },
  { id: 'ump-bali', label: 'UMP Bali 2026', amount: 3207459, note: 'UMP Bali 2026' },
  { id: 'ump-jabar', label: 'UMP Jawa Barat 2026', amount: 2317601, note: 'UMP Jawa Barat 2026 — terendah dari 38 provinsi' },
  { id: 'keluarga-budi', label: 'Keluarga Budi (contoh)', amount: 7000000, note: 'Contoh: 2 dewasa + 2 anak' },
];

// Patokan pengeluaran BPS (Susenas/BPS 2025, via GoodStats):
// rata-rata Rp1,57 juta per kapita/bulan — pangan Rp776 ribu,
// non-pangan Rp794 ribu. Untuk rumah tangga 4 orang: Rp6.280.000/bulan
// (pangan Rp3.104.000 + non-pangan Rp3.176.000).
export const BPS_BENCHMARK = {
  perCapita: 1570000,
  foodPerCapita: 776000,
  nonFoodPerCapita: 794000,
  householdSize: 4,
  householdTotal: 6280000,
  householdFood: 3104000,
  householdNonFood: 3176000,
  source: 'BPS Susenas 2025 (via GoodStats)',
  // Susenas September 2025 (angka pembanding di catatan kaki):
  susenasSep2025: { perCapita: 1584473, food: 804430, nonFood: 780042 },
};

// Garis kemiskinan BPS, Maret 2025: Rp609.160 per kapita/bulan.
export const POVERTY_LINE = {
  perCapita: 609160,
  source: 'BPS, Maret 2025',
};

// Aturan 50/30/20 atas UMP Jakarta 2026 (dihitung, ditampilkan di halaman):
// kebutuhan Rp2.864.938 + keinginan Rp1.718.963 + tabungan Rp1.145.975
// = Rp5.729.876.
export const RULE_503020 = { needs: 50, wants: 30, savings: 20 };

// Keluarga contoh — label CONTOH selalu terlihat di halaman.
export const EXAMPLE_FAMILY = {
  name: 'Keluarga Budi',
  members: '2 dewasa + 2 anak',
  income: 7000000,
};

// Isi awal pelacak: 10 baris, total Rp6.100.000/bulan.
// Semua baris bisa diubah dan dihapus.
export const INITIAL_EXPENSES = [
  { id: 'e1', name: 'Belanja bulanan pasar & supermarket', category: 'makan', amount: 1800000 },
  { id: 'e2', name: 'Jajan & makan di luar', category: 'makan', amount: 600000 },
  { id: 'e3', name: 'Sewa rumah', category: 'rumah', amount: 1200000 },
  { id: 'e4', name: 'Listrik & air', category: 'rumah', amount: 350000 },
  { id: 'e5', name: 'Bensin & tol', category: 'transportasi', amount: 500000 },
  { id: 'e6', name: 'SPP & les anak', category: 'pendidikan', amount: 600000 },
  { id: 'e7', name: 'BPJS & obat-obatan', category: 'kesehatan', amount: 350000 },
  { id: 'e8', name: 'Langganan streaming', category: 'hiburan', amount: 150000 },
  { id: 'e9', name: 'Pulsa & internet', category: 'lainnya', amount: 250000 },
  { id: 'e10', name: 'Laundry & kebersihan rumah', category: 'lainnya', amount: 300000 },
];

// 4–5 tips konkret (bukan nasihat umum).
export const TIPS = [
  {
    title: 'Bayar tabungan dulu, bukan sisa',
    body: 'Begitu gajian masuk, pindahkan dulu 20% (Rp1.145.975 dari UMP Jakarta 2026) ke rekening terpisah. Yang ditabung dari sisa hampir selalu habis duluan.',
  },
  {
    title: 'Satu UMP belum cukup untuk 4 orang',
    body: 'Patokan BPS 2025 untuk rumah tangga 4 orang adalah Rp6.280.000/bulan — di atas satu UMP Jakarta 2026 (Rp5.729.876). Keluarga 4 orang umumnya butuh dua penghasilan, atau pengeluaran di bawah rata-rata.',
  },
  {
    title: 'Pisahkan uang makan dari uang jajan',
    body: 'BPS 2025: pangan Rp776 ribu per orang/bulan. Untuk 4 orang itu Rp3.104.000. Kalau jajan dicampur belanja dapur, pangan hampir selalu jebol tanpa terasa.',
  },
  {
    title: 'Dana darurat dulu sebelum investasi',
    body: 'Kumpulkan 3× pengeluaran bulanan dulu (untuk Keluarga Budi: Rp18.300.000), baru pikirkan investasi. Tanpa bantalan ini, satu musibah bisa memaksa utang berbunga.',
  },
  {
    title: 'Kenali garis kemiskinannya',
    body: 'Garis kemiskinan BPS (Maret 2025) adalah Rp609.160 per orang/bulan — untuk keluarga 4 orang, Rp2.436.640/bulan. Di bawah angka itu, sebuah keluarga resmi tergolong miskin menurut BPS.',
  },
];
