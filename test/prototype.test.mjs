import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../prototype/code.js', import.meta.url), 'utf8').replace(/main\(\)\.catch[\s\S]*$/, '');
function harness() {
  let serial = 0;
  let writes = 0;
  let rejectedSelfLinks = 0;
  const messages = [];
  const makeNode = type => {
    const data = new Map();
    let storedReactions = [];
    const node = { type, id: String(++serial), name: type === 'FRAME' ? 'Frame' : type,
      x: 0, y: 0, width: type === 'TEXT' ? 160 : 100, height: type === 'TEXT' ? 20 : 100,
      children: [], reactions: [], characters: '', parent: null,
      getPluginData: key => data.get(key) || '', setPluginData: (key, value) => data.set(key, value),
      resize(w, h) { this.width = w; this.height = h; },
      appendChild(child) {
        if (child.parent) child.parent.children = child.parent.children.filter(n => n !== child);
        child.parent = this; this.children.push(child);
      },
      findAll(predicate) {
        return this.children.flatMap(child => [...(predicate(child) ? [child] : []), ...child.findAll(predicate)]);
      },
      async setReactionsAsync(value) { writes++; this.reactions = value; },
      seedReactions(value) { storedReactions = value; },
    };
    Object.defineProperty(node, 'reactions', {
      get: () => storedReactions,
      set(value) {
        let root = node;
        while (root.parent && root.parent.type !== 'PAGE') root = root.parent;
        for (const reaction of value) {
          for (const action of reaction.actions || (reaction.action ? [reaction.action] : [])) {
            if (action.type === 'NODE' && action.navigation === 'NAVIGATE' && action.destinationId === root.id) {
              rejectedSelfLinks++;
              throw 'for NAVIGATE actions, destinations must be a different top-level frame on the same page';
            }
          }
        }
        storedReactions = value;
      },
    });
    return node;
  };
  const page = makeNode('PAGE');
  const figma = { currentPage: page, loadFontAsync: async () => {},
    createFrame: () => { const n = makeNode('FRAME'); page.appendChild(n); return n; },
    createText: () => makeNode('TEXT'), createRectangle: () => makeNode('RECTANGLE'),
    notify: () => ({ cancel() {} }), viewport: { scrollAndZoomIntoView() {} },
    showUI() {}, ui: { postMessage: message => messages.push(message) }, closePlugin() {} };
  const context = { figma, console: { log() {}, error() {} },
    setTimeout: (callback, ms) => setTimeout(callback, Math.min(ms, 30)), clearTimeout };
  runInNewContext(source + '\nglobalThis.api = { main, recoverLinks, expandTextTargets, validClick, connectFrames };', context);
  return { ...context.api, figma, page, messages, makeNode, writes: () => writes, rejectedSelfLinks: () => rejectedSelfLinks };
}
const destination = node => node.reactions.find(r => r.trigger?.type === 'ON_CLICK')?.actions[0].destinationId;

test('full prototype generation connects other pages and leaves six active sidebar items on their own page', async () => {
  const h = harness(); await h.main();
  assert.equal(h.page.children.length, 10);
  const frames = h.page.children;
  for (const frame of frames) {
    const sidebar = frame.children.filter(n => n.type === 'FRAME' && n.x === 20);
    assert.equal(sidebar.length, 6);
    sidebar.forEach((button, i) => assert.equal(destination(button), frames[i] === frame ? undefined : frames[i].id));
  }
  for (const index of [1, 9]) {
    const back = frames[index].children.find(n => n.name === '返回研究总览 · 整块可点击');
    assert.equal(destination(back), frames[0].id);
    assert.equal(back.width, 260);
  }
  assert.equal(JSON.parse(h.page.getPluginData('visionTrendsRepairReport')).failures.length, 0);
  assert.equal(JSON.parse(h.page.getPluginData('visionTrendsRepairReport')).samePage, 6);
  assert.equal(h.rejectedSelfLinks(), 0);
  assert.equal(h.page.flowStartingPoints[0].nodeId, frames[0].id);
});

test('rerunning reuses frames and hotspots, preserves visuals and avoids rewriting correct interactions', async () => {
  const h = harness(); await h.main();
  const before = h.page.findAll(() => true).length;
  const writes = h.writes();
  h.page.children[0].fills = [{ customColor: 'student-change' }];
  await h.main();
  assert.equal(h.page.children.length, 10);
  assert.equal(h.page.findAll(() => true).length, before);
  assert.equal(h.writes(), writes);
  assert.equal(h.page.children[0].fills[0].customColor, 'student-change');
});

test('wrong sidebar targets are corrected while unrelated hover events remain', async () => {
  const h = harness(); await h.main();
  const frame = h.page.children[1];
  const button = frame.children.find(n => n.type === 'FRAME' && n.x === 20);
  button.reactions[0].actions[0].destinationId = 'nonexistent';
  button.reactions.push({ trigger: { type: 'ON_HOVER' }, actions: [] });
  await h.main();
  assert.equal(destination(button), h.page.children[0].id);
  assert.equal(button.reactions.some(r => r.trigger.type === 'ON_HOVER'), true);
});

test('text click targets are removed from button children so the entire parent handles clicks', async () => {
  const h = harness(); await h.main();
  const button = h.page.children[1].children.find(n => n.type === 'FRAME' && n.x === 20);
  const label = button.children[0];
  label.reactions = [{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId: 'wrong' }] }];
  await h.main();
  assert.equal(label.reactions.length, 0);
  assert.equal(destination(button), h.page.children[0].id);
});

test('a stalled async Figma call falls back to the writable reactions property', async () => {
  const h = harness(); await h.main();
  const first = h.page.children[2].children.find(n => n.type === 'FRAME' && n.x === 20);
  first.reactions = [];
  first.setReactionsAsync = () => new Promise(() => {});
  const other = h.page.children[1].children.find(n => n.type === 'FRAME' && n.x === 20);
  other.reactions = [];
  await h.main();
  const report = JSON.parse(h.page.getPluginData('visionTrendsRepairReport'));
  assert.equal(report.failures.length, 0);
  assert.equal(destination(other), h.page.children[0].id);
  assert.match(h.messages.at(-1).status, /修复完成/);
});

test('repair removes stale clicks on the active parent and text while keeping unrelated events', async () => {
  const h = harness(); await h.main();
  const overview = h.page.children[0];
  const active = overview.children.find(n => n.type === 'FRAME' && n.x === 20);
  active.seedReactions([{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', navigation: 'NAVIGATE', destinationId: overview.id }] },
    { trigger: { type: 'ON_HOVER' }, actions: [] }]);
  active.children[0].reactions = [{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', navigation: 'NAVIGATE', destinationId: h.page.children[1].id }] }];
  await h.main();
  assert.equal(destination(active), undefined);
  assert.equal(active.reactions[0].trigger.type, 'ON_HOVER');
  assert.equal(active.children[0].reactions.length, 0);
  assert.equal(h.rejectedSelfLinks(), 0);
  assert.equal(JSON.parse(h.page.getPluginData('visionTrendsRepairReport')).failures.length, 0);
});

test('partial designs are left untouched rather than duplicated', async () => {
  const h = harness();
  const frame = h.figma.createFrame(); frame.name = '01 研究总览';
  await assert.rejects(h.main(), /部分原型画板/);
  assert.equal(h.page.children.length, 1);
});

test('paper title hotspots, edit, delete and dialog actions lead to their intended destinations', async () => {
  const h = harness(); await h.main();
  for (const index of [1, 9]) {
    const buttons = h.page.children[index].findAll(n => n.type === 'FRAME');
    for (const button of buttons) {
      const label = button.children.find(n => n.type === 'TEXT')?.characters;
      if (label === '编辑') assert.equal(destination(button), h.page.children[7].id);
      if (label === '删除') assert.equal(destination(button), h.page.children[8].id);
    }
    const hits = h.page.children[index].findAll(n => n.type === 'RECTANGLE' && n.getPluginData('visionTrendsHitFor'));
    assert.equal(hits.length, 4);
    hits.forEach(hit => assert.equal(destination(hit), h.page.children[6].id));
  }
  for (const index of [7, 8]) {
    const cancel = h.page.children[index].findAll(n => n.type === 'FRAME' && n.children.some(c => c.characters === '取消'))[0];
    assert.equal(destination(cancel), h.page.children[1].id);
  }
});
