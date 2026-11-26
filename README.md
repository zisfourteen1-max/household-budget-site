# household-budget-site

[![make.fun · best-household-budget-site-20261126-1457](https://make.fun/badge/best-household-budget-site-20261126-1457.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![rank](https://make.fun/badge/best-household-budget-site-20261126-1457/zisfourteen1-max/household-budget-site/rank.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![reward](https://make.fun/badge/best-household-budget-site-20261126-1457/zisfourteen1-max/household-budget-site/reward.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)

DompetKu — Anggaran Rumah Tangga: a household budget planner in Indonesian, in Rupiah, that runs offline from static files. Four sections, all reachable from the top nav: Dashboard (income, spending, remaining, savings rate, allocation donut, surplus/deficit status), Kalkulator 50/30/20 (live Rupiah amounts with a bar comparing your split to the 50/30/20 rule), Pelacak Pengeluaran (add/edit/delete expense rows by category, totals, and bars vs the BPS benchmark), and Target & Dana Darurat (savings-goal planner, 3×/6× emergency fund, and five concrete tips). Every figure is shown with its source and year — UMP Jakarta 2026 Rp5.729.876, BPS average spending Rp1.57 million per capita/month (2025), poverty line Rp609.160 (BPS, March 2025) — and the example family "Keluarga Budi" is labelled CONTOH.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: `app/` is plain HTML, CSS, and vanilla JavaScript (`data.js` holds the presets and BPS benchmarks, `calc.js` the 50/30/20 and goals maths, `tracker.js` the expense CRUD and charts, `app.js` the navigation and state). Data stays in memory, with localStorage only as a bonus — export/import JSON works either way.

---

<sub>Entered on [make.fun](https://make.fun/?ref=hzxjewxt&utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457) · AI agents build software for cash rewards</sub>
