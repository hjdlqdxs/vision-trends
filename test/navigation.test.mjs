import test from 'node:test';
import assert from 'node:assert/strict';
import { keywordLink, researchBackLink, librarySearchParams, clearKeywordLink } from '../public/charts.js';

const queryOf = hash => new URLSearchParams(hash.slice(hash.indexOf('?') + 1));

test('overview keyword drilldown returns to the original conference and year after reload', () => {
  const hash = keywordLink('Diffusion models', new URLSearchParams('conference=CVPR&year=2024'), 'overview');
  const params = queryOf(hash);
  assert.equal(params.get('conference'), 'CVPR');
  assert.equal(params.get('keyword'), 'Diffusion models');
  assert.deepEqual(researchBackLink(params), { href: '#/overview?conference=CVPR&year=2024', label: '返回研究总览' });
  assert.deepEqual(researchBackLink(new URLSearchParams(params.toString())), researchBackLink(params));
});

test('annual chart returns to the actual displayed year', () => {
  const hash = keywordLink('3D vision', new URLSearchParams('conference=ECCV&year=2024'), 'evolution');
  assert.deepEqual(researchBackLink(queryOf(hash)), { href: '#/evolution?conference=ECCV&year=2024', label: '返回年度演变' });
});

test('searching and switching a keyword in the library retains the original overview scope', () => {
  const params = queryOf(keywordLink('3D vision', new URLSearchParams('conference=CVPR&year=2024'), 'overview'));
  const updated = librarySearchParams(new URLSearchParams('q=diffusion&conference=ICCV&year=2023&exact=on'), params);
  assert.equal(updated.get('keyword'), '3D vision');
  assert.equal(updated.get('exact'), 'true');
  assert.equal(updated.get('conference'), 'ICCV');
  updated.set('page', '2');
  assert.equal(researchBackLink(queryOf(keywordLink('Diffusion models', updated, 'papers'))).href, '#/overview?conference=CVPR&year=2024');
});

test('clearing a keyword keeps conference, year, search and the return destination', () => {
  const params = queryOf(keywordLink('3D vision', new URLSearchParams('conference=ECCV&year=2024'), 'overview'));
  params.set('q', 'vision'); params.set('page', '3');
  const cleared = queryOf(clearKeywordLink(params));
  assert.equal(cleared.has('keyword'), false);
  assert.equal(cleared.has('page'), false);
  assert.equal(cleared.get('conference'), 'ECCV');
  assert.equal(cleared.get('year'), '2024');
  assert.equal(cleared.get('q'), 'vision');
  assert.equal(researchBackLink(cleared).href, '#/overview?conference=ECCV&year=2024');
});

test('old bookmarks without an origin still return to a matching overview', () => {
  assert.equal(researchBackLink(new URLSearchParams('conference=ICCV&keyword=Tracking')).href, '#/overview?conference=ICCV');
  assert.equal(researchBackLink(new URLSearchParams()).href, '#/overview');
});

test('return destinations are restricted to internal research pages', () => {
  for (const returnTo of ['https://example.com', 'javascript:alert(1)', '#/papers?returnTo=x']) {
    assert.equal(researchBackLink(new URLSearchParams({ returnTo })).href, '#/overview');
  }
  const back = researchBackLink(new URLSearchParams({ returnTo: '#/overview?conference=CVPR&year=2024&q=discard-me' }));
  assert.equal(back.href, '#/overview?conference=CVPR&year=2024');
});
