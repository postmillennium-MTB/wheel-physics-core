// usage: LAB_PHYSICS=<lab src/physics.js> WIDGET_ENGINE=<widget engine.cjs> node compare_29.mjs
// Reads cases.json + ford_0..7.json in the cwd; writes accuracy_29in_builds.csv
// (one row per build) and accuracy_29in_by_hub.csv (one row per hub).
// Pass rule = core validation/run.mjs: 1e-9% per output, 1e-7% for T_c.
import fs from 'fs'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { computeWheelStrength } = await import(process.env.LAB_PHYSICS);
const widget = require(process.env.WIDGET_ENGINE).calc;
const cases = JSON.parse(fs.readFileSync('cases.json'));
const ford = [].concat(...[0,1,2,3,4,5,6,7].map(k => JSON.parse(fs.readFileSync(`ford_${k}.json`)))).sort((a, b) => a.i - b.i);
if (ford.length !== cases.length) throw new Error(`ford ${ford.length} vs cases ${cases.length}`);
const keys = ['ratio', 'K_lat', 'K_rad', 'T_c', 'F_lat', 'F_rad'];
const tol = k => k === 'T_c' ? 1e-7 : 1e-9;
const csv = (f, rows) => { const h = Object.keys(rows[0]); fs.writeFileSync(f, [h.join(','), ...rows.map(r => h.map(k => JSON.stringify(r[k])).join(','))].join('\n') + '\n'); };
const rows = [], hubs = new Map();
for (const f of ford) {
  const c = cases[f.i];
  const args = [c.erd, c.hub, c.dDS, c.dNDS, c.tDS, c.EIL, c.EIR, c.GJ, c.EA, c.Ns, 24];
  const L = computeWheelStrength(...args), W = widget(...args);
  const r = { hub: c.hub.name, std: c.hub.std, Ns: c.Ns, tDS: c.tDS, buckling_pct: +(c.tDS / f.T_c * 100).toFixed(2) };
  let pass = true;
  for (const k of keys) {
    const dl = Math.abs(L[k] / f[k] - 1) * 100, dw = Math.abs(W[k] / f[k] - 1) * 100;
    r[`ford_${k}`] = f[k]; r[`lab_${k}`] = L[k]; r[`widget_${k}`] = W[k];
    r[`max_diff_pct_${k}`] = Math.max(dl, dw);
    if (!(Math.max(dl, dw) <= tol(k))) pass = false;
  }
  r.pass = pass; rows.push(r);
  const h = hubs.get(r.hub) || { hub: r.hub, std: r.std, builds: 0, pass: 0, past_buckling: 0, ford_F_lat_32H_120: null, tool_F_lat_32H_120: null, ford_F_rad_32H_120: null, ford_T_c_32H: null };
  h.builds++; if (pass) h.pass++; if (r.buckling_pct >= 100) h.past_buckling++;
  for (const k of ['F_lat', 'F_rad', 'T_c']) h[`max_diff_pct_${k}`] = Math.max(h[`max_diff_pct_${k}`] || 0, r[`max_diff_pct_${k}`]);
  if (c.Ns === 32 && c.tDS === 120) Object.assign(h, { ford_F_lat_32H_120: f.F_lat, tool_F_lat_32H_120: L.F_lat, ford_F_rad_32H_120: f.F_rad, ford_T_c_32H: f.T_c });
  hubs.set(r.hub, h);
}
csv('accuracy_29in_builds.csv', rows); csv('accuracy_29in_by_hub.csv', [...hubs.values()]);
const worst = Object.fromEntries(keys.map(k => [k, Math.max(...rows.map(r => r[`max_diff_pct_${k}`]))]));
console.log('builds', rows.length, 'pass', rows.filter(r => r.pass).length, 'past buckling', rows.filter(r => r.buckling_pct >= 100).length);
console.log('worst %', Object.entries(worst).map(([k, v]) => `${k} ${v.toExponential(1)}`).join('  '));
