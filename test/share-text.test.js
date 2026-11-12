// "Copy result" text shared by both wheel tools (js/share-text.js). Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../js/share-text.js');

const side = (label, F_lat, K_lat, wheel = '29', tension = 120) => ({ label, F_lat, K_lat, wheel, tension });
const URL = 'https://www.postmillenniumrenaissance.com/wheel-lab/#compare&h1=h1&h2=h16';

test('strength and stiffness are separate, labelled lines', () => {
  const t = S.resultText({ a: side('148x12', 38.3, 95.4), b: side('157x12', 45.8, 99.6), spokes: '28', url: URL });
  const lines = t.split('\n');
  assert.equal(lines.length, 5);
  assert.equal(lines[0], 'Lateral STRENGTH (sideways load before the first spoke goes slack): ' +
    '157x12 is 20% stronger than 148x12 (45.8 vs 38.3 kgf).');
  assert.equal(lines[1], 'Lateral STIFFNESS (sideways load per mm of flex, a different property): ' +
    '157x12 is 4% stiffer than 148x12 (100 vs 95 N/mm).');
  assert.equal(lines[2], 'Build: 29", 28 spokes, 120 kgf drive-side spoke tension.');
  assert.match(lines[3], /Matthew Ford's Mode Matrix method/);
  assert.equal(lines[4], URL);
});

test('the winner is named whichever side it is on', () => {
  const t = S.resultText({ a: side('A', 50, 120), b: side('B', 40, 130), spokes: '32' });
  assert.match(t, /A is 25% stronger than B/);
  assert.match(t, /A is 25% stronger than B \(50.0 vs 40.0 kgf\)/);
  assert.match(t, /B is 8% stiffer than A \(130 vs 120 N\/mm\)/);
});

test('small gaps keep one decimal; a negligible gap is called equal', () => {
  assert.match(S.resultText({ a: side('A', 40, 100), b: side('B', 40.2, 100) }), /B is 0.5% stronger/);
  assert.match(S.resultText({ a: side('A', 40, 100), b: side('B', 40.01, 100) }), /STRENGTH[^\n]*: A and B are about the same \(40.0 vs 40.0 kgf\)/);
});

test('sides with different wheel or tension list each build', () => {
  const t = S.resultText({ a: side('148x12', 40, 100, '29', 120), b: side('157x12', 45, 105, '27.5', 110), spokes: '32' });
  assert.match(t, /Build: 148x12 29" at 120 kgf; 157x12 27.5" at 110 kgf; 32 spokes/);
});

test('a build past buckling gets no strength percentage', () => {
  const t = S.resultText({ a: side('148x12', 0, 90), b: side('157x12', 30, 95) });
  assert.match(t, /no figure for 148x12, which is at or past its buckling tension/);
  assert.doesNotMatch(t, /stronger/);
});

test('no url, no link line', () => {
  const t = S.resultText({ a: side('A', 40, 100), b: side('B', 45, 100) });
  assert.doesNotMatch(t, /https?:/);
});
