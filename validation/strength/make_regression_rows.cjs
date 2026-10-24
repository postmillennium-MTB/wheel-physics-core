// Writes rows.json + hubs.json for regression_rows.py from MTB-wheel-lab's
// analysis/wheel-strength-regression (run from that folder after npm install):
//   node <this file> <outdir>
const fs = require('fs'), path = require('path');
const { buildRows } = require(path.resolve('build_dataset.js'));
const { ALL_HUBS } = require(path.resolve('hubs.js'));
const out = process.argv[2];
fs.writeFileSync(path.join(out, 'rows.json'), JSON.stringify(buildRows()));
const H = {}; ALL_HUBS.forEach((h) => { H[h.id] = h; });
fs.writeFileSync(path.join(out, 'hubs.json'), JSON.stringify(H));
