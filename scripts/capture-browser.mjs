import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const tabs = await (await fetch('http://127.0.0.1:9224/json')).json();
const socket = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(resolve => socket.onopen = resolve);
let serial = 0;
const pending = new Map();
const errors = [];
socket.onmessage = event => {
  const data = JSON.parse(event.data);
  if (data.id && pending.has(data.id)) { const p = pending.get(data.id); pending.delete(data.id); data.error ? p.reject(new Error(data.error.message)) : p.resolve(data.result); }
  if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails);
};
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => { const id = ++serial; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
}
async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ' ' + result.exceptionDetails.exception?.description);
  return result.result.value;
}
async function waitFor(expression) {
  for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await new Promise(r => setTimeout(r, 100)); }
  throw new Error('Timed out: ' + expression);
}
const root = fileURLToPath(new URL('../', import.meta.url));
mkdirSync(`${root}/docs/screenshots`, { recursive: true });
await cdp('Page.enable'); await cdp('Runtime.enable');
const browserVersion = await cdp('Browser.getVersion');
await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });
async function navigate(hash, selector) {
  await cdp('Page.navigate', { url: `http://127.0.0.1:3000/#/${hash}` });
  await waitFor(`!!document.querySelector(${JSON.stringify(selector)})`);
  await evaluate('document.fonts.ready');
}
async function shot(name, full = true) {
  const metrics = await cdp('Page.getLayoutMetrics');
  const size = metrics.cssContentSize;
  const data = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
    ...(full ? { clip: { x: 0, y: 0, width: size.width, height: size.height, scale: 1 } } : {}) });
  writeFileSync(`${root}/docs/screenshots/${name}.png`, Buffer.from(data.data, 'base64'));
}
await navigate('overview', '.graph-node'); await shot('01-overview');
console.log('overview', await evaluate('document.querySelector(".metric strong").textContent'));
await evaluate('document.querySelector(".graph-node").click()');
await waitFor('!!document.querySelector("#search-form")');
await shot('02-keyword-results');
if (!(await evaluate('location.hash.includes("keyword=")'))) throw new Error('Graph drilldown failed');
await navigate('papers', '#add-paper'); await shot('03-library');
await evaluate('document.querySelector("#add-paper").click()'); await waitFor('!!document.querySelector("#paper-form")'); await shot('04-create-dialog', false);
await evaluate(`document.querySelector('#edit-title').value='Browser QA temporary paper';document.querySelector('#edit-abstract').value='Diffusion models and point clouds';document.querySelector('#paper-form').requestSubmit(document.querySelector('#paper-form button[type=submit]'))`);
await waitFor('!document.querySelector("#modal").open');
await waitFor('document.querySelector("#app").innerText.includes("Browser QA temporary paper")');
const added = await (await fetch('http://127.0.0.1:3000/api/papers?q=Browser%20QA%20temporary%20paper')).json();
const id = added.papers[0].id;
await evaluate(`document.querySelector('[data-edit="${id}"]').click()`); await waitFor('document.querySelector("#modal").open && document.querySelector("#edit-title")?.value === "Browser QA temporary paper"'); await shot('05-edit-dialog', false);
await evaluate(`document.querySelector('#edit-keywords').value='Manual QA';document.querySelector('#paper-form').requestSubmit(document.querySelector('#paper-form button[type=submit]'))`);
await waitFor('!document.querySelector("#modal").open');
await waitFor(`!!document.querySelector('[data-delete="${id}"]')`);
await evaluate(`document.querySelector('[data-delete="${id}"]').click()`); await waitFor('!!document.querySelector("#confirm-delete")'); await shot('06-delete-confirm', false);
await evaluate('document.querySelector("#confirm-delete").click()'); await waitFor('!document.querySelector("#modal").open');
await navigate('paper/1', '.abstract'); await shot('07-paper-detail');
await navigate('import', '#crawl-titles'); await shot('08-single-import');
await evaluate('document.querySelector("[data-mode=batch]").click()'); await shot('09-batch-import');
await evaluate('document.querySelector("[data-mode=edition]").click()'); await shot('10-edition-import');
await navigate('trends?keyword=Diffusion%20models', '#trend-chart svg'); await shot('11-trends');
await evaluate('document.querySelector("#play").click()'); await new Promise(r => setTimeout(r, 1500));
if (!(await evaluate('document.querySelector("#current-year").textContent === "2023"'))) throw new Error('Animation did not advance');
await evaluate('document.querySelector("#play").click()');
for (let i = 0; i < 4; i++) { await evaluate(`document.querySelector('#year-slider').value=${i};document.querySelector('#year-slider').dispatchEvent(new Event('input'))`); await shot(`trend-frame-${i}`, false); }
await navigate('evolution', '#evolution-bars'); await shot('12-evolution');
await navigate('about', '.edition-cards'); await shot('13-about');
await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await navigate('overview', '.graph-node'); await shot('14-mobile');
const horizontalOverflow = await evaluate('document.documentElement.scrollWidth > window.innerWidth');
if (horizontalOverflow) throw new Error('Mobile horizontal overflow');
writeFileSync(`${root}/docs/browser-test.json`, JSON.stringify({ testedAt: new Date().toISOString(), browser: browserVersion.product, checks: ['dashboard loaded', 'graph click filters papers', 'create via dialog', 'edit via dialog', 'delete with confirmation', 'paper details', 'three import modes', 'trend animation advances', 'annual chart', 'about provenance', '390px mobile layout'], uncaughtErrors: errors, horizontalOverflow }, null, 2));
console.log('browser QA complete; exceptions', errors.length);
socket.close();
if (errors.length) throw new Error('Uncaught browser exceptions: see docs/browser-test.json');
