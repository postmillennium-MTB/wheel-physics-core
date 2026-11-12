// "My wheel" record shared by both wheel tools (js/my-wheel.js). Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../js/my-wheel.js');

function mem() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m };
}
const B = { hub: 'h6', std: '148', wheel: '29', tension: 120, spokes: '32' };

test('save then load returns the same build', () => {
  const s = mem();
  assert.equal(M.load(s), null);
  assert.equal(M.save(B, s), true);
  assert.deepEqual(M.load(s), B);
});

test('clear forgets it', () => {
  const s = mem();
  M.save(B, s);
  assert.equal(M.clear(s), true);
  assert.equal(M.load(s), null);
});

test('invalid builds are not saved and bad stored data reads as nothing', () => {
  const s = mem();
  assert.equal(M.save({ ...B, hub: 'custom' }, s), false);
  assert.equal(M.save({ ...B, wheel: '30' }, s), false);
  assert.equal(M.save({ ...B, tension: 200 }, s), false);
  assert.equal(M.save({ ...B, std: '142' }, s), false);
  s.setItem(M.KEY, '{not json');
  assert.equal(M.load(s), null);
  s.setItem(M.KEY, JSON.stringify({ v: 99, build: B }));
  assert.equal(M.load(s), null);
});

test('blocked storage fails quietly', () => {
  const bad = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  assert.equal(M.load(bad), null);
  assert.equal(M.save(B, bad), false);
  assert.equal(M.clear(bad), false);
});

test('a hash with a build counts as a shared link; view-only hashes do not', () => {
  assert.equal(M.linkHasBuild('#compare&h1=h6&h2=h7'), true);
  assert.equal(M.linkHasBuild('#w1=29&th=dmc12'), true);
  assert.equal(M.linkHasBuild('#sm=157'), false);
  assert.equal(M.linkHasBuild('#compare'), false);
  assert.equal(M.linkHasBuild('#simple'), false);
  assert.equal(M.linkHasBuild(''), false);
});

test('describe names the build', () => {
  assert.equal(M.describe(B, 'CK Centerlock 148x12'), 'CK Centerlock 148x12 · 29" · 32 spokes · 120 kgf');
});

test('serialize and parse round-trip; foreign text parses as nothing', () => {
  assert.deepEqual(M.parse(M.serialize(B)), B);
  assert.equal(M.serialize({ ...B, hub: 'x' }), null);
  assert.equal(M.parse('"hello"'), null);
  assert.equal(M.parse(null), null);
});
