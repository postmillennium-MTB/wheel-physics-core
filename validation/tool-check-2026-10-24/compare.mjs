import fs from 'fs'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { computeWheelStrength } = await import(process.env.LAB_PHYSICS);
const widget = require(process.env.WIDGET_ENGINE).calc;
const cases = JSON.parse(fs.readFileSync('cases.json'));
const ford = [].concat(...[0,1,2,3,4,5,6,7].map(k => JSON.parse(fs.readFileSync(`ford_${k}.json`)))).sort((a,b)=>a.i-b.i);
const keys = ['ratio','K_lat','K_rad','T_c','T_c_smeared','F_lat','F_rad'];
const rows = []; const worst = {lab:{}, widget:{}};
for (const f of ford) {
  const c = cases[f.i];
  const args = [c.erd, c.hub, c.dDS, c.dNDS, c.tDS, c.EIL, c.EIR, c.GJ, c.EA, c.Ns, 24];
  const L = computeWheelStrength(...args), W = widget(...args);
  const row = {i:f.i, tag:c.tag, hub:c.hub.name, erd:c.erd, Ns:c.Ns, tDS:c.tDS, dDS:c.dDS, dNDS:c.dNDS, rim_scale:+(c.EIL/50).toFixed(2), buckling_pct:L.T_safety};
  for (const k of keys) {
    for (const [n, m] of [['lab', L], ['widget', W]]) {
      const d = Math.abs(m[k]/f[k] - 1) * 100;
      worst[n][k] = Math.max(worst[n][k] || 0, d);
      row[`${n}_${k}_diff_pct`] = d;
    }
    row[`ford_${k}`] = f[k]; row[`tool_${k}`] = L[k];
  }
  rows.push(row);
}
const hdr = Object.keys(rows[0]);
fs.writeFileSync('accuracy_380_builds.csv', [hdr.join(','), ...rows.map(r => hdr.map(h => JSON.stringify(r[h])).join(','))].join('\n') + '\n');
console.log('rows', rows.length);
for (const n of ['lab','widget']) console.log(n, Object.entries(worst[n]).map(([k,v]) => `${k} ${v.toExponential(1)}%`).join('  '));
const b = rows.filter(r => !(r.buckling_pct < 100)).length, near = rows.filter(r => r.buckling_pct >= 90 && r.buckling_pct < 100).length;
console.log('past buckling', b, ' 90-100%', near, ' tag counts', JSON.stringify(rows.reduce((a,r)=>(a[r.tag]=(a[r.tag]||0)+1,a),{})));
