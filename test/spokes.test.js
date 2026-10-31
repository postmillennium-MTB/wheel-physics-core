// Per-spoke output of js/engine.js (calc(..., {spokes: true}),
// spokeTensions, firstSlackCombined). Values are checked against Ford's
// bike-wheel-calc in validation/spokes/; these tests pin the conventions
// the Lab's spoke ring and load envelope rely on. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { calc, spokeTensions, firstSlackCombined } = require('../js/engine.js');

// CK 148 Centerlock, 29" ERD 600, 32 x 2.0 mm, 120 kgf, stock rim.
const HUB = { ds: 24, nds: 36.3, pds: 44, pnds: 44 };
const run = (opts) => calc(600, HUB, 2, 2, 120, 50, 150, 22, 11.5e6, 32, 24, opts);
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a / b - 1) < tol, `${a} vs ${b}`);

test('per-spoke output is opt-in and leaves the other outputs unchanged', () => {
  const plain = run(), withSpokes = run({ spokes: true });
  assert.equal(plain.spokes, undefined);
  // Same within rounding: T_c is cached after the first call, and the
  // cached path sums the stiffness terms in a different order.
  for (const k of Object.keys(plain)) {
    if (typeof plain[k] === 'number') close(withSpokes[k], plain[k], 1e-13);
    else assert.deepEqual(withSpokes[k], plain[k], k);
  }
  const s = withSpokes.spokes;
  assert.equal(s.T.length, 32);
  assert.equal(s.dT.lat.length, 4);
  assert.equal(s.dT.rad[0].length, 32);
});

test('pure directions give the validated first-slack loads', () => {
  const r = run({ spokes: true });
  close(firstSlackCombined(r, { lat: 0, rad: 1 }).scale, r.F_rad);
  // +lat is toward the nds side, which slackens the looser NDS spokes first.
  const nds = firstSlackCombined(r, { lat: 1, rad: 0 });
  close(nds.scale, r.F_lat);
  assert.equal(nds.side, 'NDS');
  assert.ok(firstSlackCombined(r, { lat: -1, rad: 0 }).scale > r.F_lat);
});

test('at the first-slack load exactly one spoke reaches zero', () => {
  const r = run({ spokes: true });
  const f = firstSlackCombined(r, { lat: 0, rad: 1 });
  const T = spokeTensions(r, { rad: f.scale, pos: f.pos });
  assert.ok(Math.abs(T[f.spoke]) < 1e-9);
  T.forEach((t, i) => { if (i !== f.spoke) assert.ok(t > -1e-9, `spoke ${i} at ${t}`); });
  // Radial push from the ground: the spoke at the load point loses tension.
  assert.equal(r.spokes.th[f.spoke], r.spokes.loadTh[f.pos]);
});

test('combined loads superpose', () => {
  const r = run({ spokes: true });
  const a = spokeTensions(r, { lat: 3, pos: 2 }), b = spokeTensions(r, { rad: 40, pos: 2 });
  const ab = spokeTensions(r, { lat: 3, rad: 40, pos: 2 });
  ab.forEach((t, i) => close(t - r.spokes.T[i], (a[i] - r.spokes.T[i]) + (b[i] - r.spokes.T[i]), 1e-12));
  const both = firstSlackCombined(r, { lat: 12, rad: 120 });
  assert.ok(both.scale < firstSlackCombined(r, { lat: 0, rad: 120 }).scale);
});
