// Link format shared by both wheel tools (js/build-link.js). Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../js/build-link.js');

test('parseHash splits bare tab names from key=value pairs', () => {
  assert.deepEqual(L.parseHash('#compare&h1=h6&ns=32'),
    { bare: ['compare'], params: { h1: 'h6', ns: '32' } });
  assert.deepEqual(L.parseHash(''), { bare: [], params: {} });
});

test('parseHash survives a stray percent sign', () => {
  assert.equal(L.parseHash('#h1=%E0%A4%A').params.h1, '%E0%A4%A');
});

test('reads the widget hash it has always written', () => {
  const p = L.parseHash('#w1=29&w2=27.5&h1=h6&h2=h7&td1=120&td2=110&ns=32&th=mgb').params;
  assert.deepEqual(L.readSide(p, 1, 'lab'), { wheel: '29', tension: 120 });
  assert.deepEqual(L.readSide(p, 2, 'lab'), { wheel: '27.5', tension: 110 });
  assert.equal(L.readSpokes(p.ns), '32');
});

test('bad values come back null so the tool keeps its default', () => {
  const p = L.parseHash('#w1=30&td1=abc&ns=30&h1=x').params;
  assert.deepEqual(L.readSide(p, 1, 'lab'), { wheel: null, tension: null });
  assert.equal(L.readSpokes(p.ns), null);
  assert.equal(L.readHub(p.h1), null);
});

test('tension snaps to the destination range', () => {
  assert.equal(L.snapTension(85, L.TENSION.lab), 85);
  assert.equal(L.snapTension(85, L.TENSION.widget), 95);
  assert.equal(L.snapTension(200, L.TENSION.lab), 125);
  assert.equal(L.snapTension(117, L.TENSION.lab), 115);
});

test('Lab link carries the tab and one build setting', () => {
  assert.equal(L.labLink({ hub148: 'h6', hub157: 'h7', wheel: '29', tension: 120, spokes: '32' }),
    'https://www.postmillenniumrenaissance.com/wheel-lab/#compare&h1=h6&h2=h7&w1=29&td1=120&ns=32');
  assert.equal(L.labHash({ hub148: 'h6', hub157: null, wheel: '29', tension: null, spokes: '28' }, 'symmetry'),
    '#symmetry&h1=h6&w1=29&ns=28');
});

test('widget link writes the build to both sides and flags a clamp', () => {
  const r = L.widgetLink({ hubA: 'h6', hubB: 'h7', wheel: '27.5', tension: 85, spokes: '28' });
  assert.equal(r.url, 'https://www.postmillenniumrenaissance.com/wheel-comparison-widget2/'
    + '#h1=h6&h2=h7&w1=27.5&w2=27.5&td1=95&td2=95&ns=28');
  assert.equal(r.tensionClamped, true);
  assert.equal(L.widgetLink({ hubA: 'h6', hubB: 'h7', wheel: '29', tension: 120, spokes: '32' }).tensionClamped, false);
});

test('round trip: a Lab link read back gives the same build', () => {
  const b = { hub148: 'h28', hub157: 'h29', wheel: '32', tension: 100, spokes: '36' };
  const parsed = L.parseHash(L.labHash(b));
  assert.deepEqual(parsed.bare, ['compare']);
  const p = parsed.params, side = L.readSide(p, 1, 'lab');
  assert.deepEqual({ hub148: L.readHub(p.h1), hub157: L.readHub(p.h2),
    wheel: side.wheel, tension: side.tension, spokes: L.readSpokes(p.ns) }, b);
});
