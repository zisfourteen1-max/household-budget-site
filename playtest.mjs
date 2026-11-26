// DompetKu play-test via CDP. Usage:
//   node playtest.mjs   (chrome must already run with --remote-debugging-port=9222)
const CDP_PORT = process.env.CDP_PORT || '9222';
const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json();
const page = list.find((t) => t.type === 'page');
if (!page) throw new Error('no page target');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const errors = [];
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const mid = ++id;
  pending.set(mid, { resolve, reject });
  ws.send(JSON.stringify({ id: mid, method, params }));
});
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id).resolve(msg.result);
    pending.delete(msg.id);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    errors.push('EXCEPTION: ' + JSON.stringify(msg.params.exceptionDetails).slice(0, 500));
  } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    errors.push('CONSOLE ERROR: ' + JSON.stringify(msg.params.args).slice(0, 500));
  } else if (msg.method === 'Network.loadingFailed') {
    errors.push('NETWORK FAILED: ' + JSON.stringify(msg.params).slice(0, 300));
  }
};
await new Promise((r) => { ws.onopen = r; });
await send('Runtime.enable');
await send('Page.enable');
await send('Network.enable');

const evalJs = async (expr) => {
  // Run inside an IIFE + indirect eval so `const` declarations in one
  // snippet never collide with the next snippet's (same global scope).
  const wrapped = `(function(){ return eval(${JSON.stringify(expr)}) })()`;
  const r = await send('Runtime.evaluate', { expression: wrapped, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error('eval failed: ' + JSON.stringify(r.exceptionDetails).slice(0, 500));
  return r.result.value;
};

let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures += 1;
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (extra ? ' — ' + extra : ''));
};

// Load dashboard from a clean slate (a previous crashed run may have
// left edited state in localStorage).
await send('Page.navigate', { url: 'http://localhost:8080/#/dashboard' });
await new Promise((r) => setTimeout(r, 1200));
await evalJs(`localStorage.clear()`);
await send('Page.reload', { ignoreCache: true });
await new Promise((r) => setTimeout(r, 1500));
check('dashboard totals render', (await evalJs(`document.getElementById('dash-income').textContent`)) === 'Rp7.000.000');
check('dashboard remaining', (await evalJs(`document.getElementById('dash-remaining').textContent`)) === 'Rp900.000');
check('dashboard status surplus', (await evalJs(`document.getElementById('dash-status').textContent`)).includes('Surplus Rp900.000'));
check('donut has 3 segments', (await evalJs(`document.querySelectorAll('#donut circle').length`)) === 3);
check('donut legend needs', (await evalJs(`document.getElementById('donut-needs').textContent`)).includes('Rp5.400.000'));

// Preset: UMP Jakarta.
await evalJs(`[...document.querySelectorAll('#income-presets .btn')].find(b => b.textContent.includes('UMP Jakarta')).click()`);
await new Promise((r) => setTimeout(r, 300));
check('UMP preset changes income', (await evalJs(`document.getElementById('dash-income').textContent`)) === 'Rp5.729.876');
check('UMP preset flips to deficit', (await evalJs(`document.getElementById('dash-status').textContent`)).includes('Defisit Rp370.124'));
await evalJs(`[...document.querySelectorAll('#income-presets .btn')].find(b => b.textContent.includes('Keluarga Budi')).click()`);
await new Promise((r) => setTimeout(r, 300));
check('back to Keluarga Budi', (await evalJs(`document.getElementById('dash-income').textContent`)) === 'Rp7.000.000');

// Calculator: move savings slider to 25%.
await send('Page.navigate', { url: 'http://localhost:8080/#/kalkulator' });
await new Promise((r) => setTimeout(r, 800));
await evalJs(`
  const s = document.getElementById('calc-savings-pct');
  s.value = 25; s.dispatchEvent(new Event('input', { bubbles: true }));
`);
await new Promise((r) => setTimeout(r, 300));
check('slider recalcs savings', (await evalJs(`document.getElementById('calc-savings-amount').textContent`)) === 'Rp1.750.000');
check('slider label updates', (await evalJs(`document.getElementById('calc-savings-pct-label').textContent`)) === '25%');
await evalJs(`document.getElementById('calc-reset').click()`);
await new Promise((r) => setTimeout(r, 300));
check('reset restores 50/30/20', (await evalJs(`document.getElementById('calc-savings-amount').textContent`)) === 'Rp1.400.000');

// Tracker: add, edit, delete.
await send('Page.navigate', { url: 'http://localhost:8080/#/pelacak' });
await new Promise((r) => setTimeout(r, 800));
const before = await evalJs(`document.getElementById('tracker-total').textContent`);
await evalJs(`
  document.getElementById('exp-name').value = 'Test pulsa';
  document.getElementById('exp-category').value = 'lainnya';
  document.getElementById('exp-amount').value = '100000';
  document.getElementById('exp-submit').click();
`);
await new Promise((r) => setTimeout(r, 300));
check('add expense updates total', (await evalJs(`document.getElementById('tracker-total').textContent`)) === 'Rp6.200.000', `was ${before}`);
check('new row in table', (await evalJs(`[...document.querySelectorAll('#expense-rows td')].some(td => td.textContent === 'Test pulsa')`)) === true);
// Edit it: click its Ubah button, change amount to 50000.
await evalJs(`
  const row = [...document.querySelectorAll('#expense-rows tr')].find(tr => tr.textContent.includes('Test pulsa'));
  row.querySelectorAll('button')[0].click();
`);
await new Promise((r) => setTimeout(r, 200));
check('edit mode shows cancel', (await evalJs(`!document.getElementById('exp-cancel').hidden`)) === true);
await evalJs(`
  document.getElementById('exp-amount').value = '50000';
  document.getElementById('exp-submit').click();
`);
await new Promise((r) => setTimeout(r, 300));
check('edit updates total', (await evalJs(`document.getElementById('tracker-total').textContent`)) === 'Rp6.150.000');
// Delete it.
await evalJs(`
  const row2 = [...document.querySelectorAll('#expense-rows tr')].find(tr => tr.textContent.includes('Test pulsa'));
  row2.querySelectorAll('button')[1].click();
`);
await new Promise((r) => setTimeout(r, 300));
check('delete restores total', (await evalJs(`document.getElementById('tracker-total').textContent`)) === 'Rp6.100.000');
check('benchmark bars render', (await evalJs(`document.querySelectorAll('#benchmark-bars .bench-row').length`)) === 3);
check('category totals render', (await evalJs(`document.querySelectorAll('#category-totals .cat-row').length`)) >= 7);

// Goals: change monthly saving, check result text.
await send('Page.navigate', { url: 'http://localhost:8080/#/target' });
await new Promise((r) => setTimeout(r, 800));
await evalJs(`
  const m = document.getElementById('goal-monthly');
  m.value = '1000000'; m.dispatchEvent(new Event('input', { bubbles: true }));
`);
await new Promise((r) => setTimeout(r, 300));
check('goal recalcs to 10 months', (await evalJs(`document.getElementById('goal-result').textContent`)).includes('10 bulan'));
check('tips render (5)', (await evalJs(`document.querySelectorAll('#tips-list li').length`)) === 5);
check('poverty note present', (await evalJs(`document.getElementById('poverty-note').textContent`)).includes('Rp609.160'));
check('emergency 3x target', (await evalJs(`document.getElementById('emg3-target').textContent`)) === 'Rp18.300.000');

// No console/network errors across the whole session.
await new Promise((r) => setTimeout(r, 500));
console.log(errors.length === 0 ? 'PASS no console/network errors' : 'FAIL errors:\n' + errors.join('\n'));
if (errors.length) failures += 1;
ws.close();
process.exit(failures ? 1 : 0);
