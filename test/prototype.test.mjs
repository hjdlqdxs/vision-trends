import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../prototype/code.js', import.meta.url), 'utf8');
const names = ['研究总览', '论文资料库', '采集工作台', '热度走势', '年度演变', '关于与数据', '论文详情', '编辑论文', '删除确认', '关键词查询结果'];
async function simulate({ stuck = false, partial = false, preserve = false } = {}) {
  let calls = 0;
  let creates = 0;
  let closed;
  const done = new Promise(resolve => { closed = resolve; });
  const button = { type: 'FRAME', name: 'Frame', x: 20, children: [{ type: 'TEXT', characters: '论文资料库' }],
    reactions: preserve ? [{ userDefined: true }] : [], getPluginData: () => '', setPluginData: () => {},
    setReactionsAsync: async function (reactions) { calls++; if (stuck) return new Promise(() => {}); this.reactions = reactions; } };
  const frames = names.map((name, i) => ({ type: 'FRAME', id: String(i), name: `${String(i + 1).padStart(2, '0')} ${name}`,
    findAll: () => i === 0 ? [button] : [] }));
  button.parent = frames[0];
  const figma = { currentPage: { children: partial ? frames.slice(0, 1) : frames },
    createFrame: () => { creates++; throw new Error('Must not recreate existing design'); },
    loadFontAsync: () => { throw new Error('No font loading needed during recovery'); },
    notify: () => ({ cancel() {} }), viewport: { scrollAndZoomIntoView() {} }, closePlugin: message => closed(message) };
  runInNewContext(source, { figma, console: { log() {}, error() {} },
    setTimeout: (callback, ms) => setTimeout(callback, ms === 25000 ? 100 : 20), clearTimeout });
  const message = await done;
  return { message, calls, creates, button, figma };
}
test('prototype rerun reuses the original ten frames and restores missing navigation', async () => {
  const result = await simulate();
  assert.equal(result.creates, 0);
  assert.equal(result.calls, 1);
  assert.equal(result.button.reactions[0].actions[0].destinationId, '1');
  assert.match(result.message, /10张画板已保留/);
});
test('prototype recovery preserves existing user-edited interactions', async () => {
  const result = await simulate({ preserve: true });
  assert.equal(result.calls, 0);
  assert.equal(result.button.reactions[0].userDefined, true);
});
test('a stalled Figma interaction API closes the plugin with a timeout instead of hanging', async () => {
  const result = await simulate({ stuck: true });
  assert.match(result.message, /超时/);
  assert.equal(result.creates, 0);
  assert.equal(result.figma.currentPage.children.length, 10);
});
test('partial designs are left untouched and reported rather than duplicated', async () => {
  const result = await simulate({ partial: true });
  assert.match(result.message, /部分原型画板/);
  assert.equal(result.creates, 0);
  assert.equal(result.calls, 0);
});
