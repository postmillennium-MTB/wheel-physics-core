// usage: node make_cases_29.mjs <hub_catalogue.json> <out.json>
// Every hub at 29" (ERD 600 mm, both tools' value), 28/32/36 spokes,
// DS tension 80-125 kgf in 5 kgf steps (the Lab slider; the widget offers 95-125), 2.0 mm spokes, stock rim.
import fs from 'fs';
const cat = JSON.parse(fs.readFileSync(process.argv[2])); const R = cat.rim_constants;
const cases = [];
for (const h of cat.hubs) for (const Ns of [28, 32, 36]) for (const tDS of [80, 85, 90, 95, 100, 105, 110, 115, 120, 125])
  cases.push({ tag: '29in', hub: h, erd: 600, Ns, tDS, dDS: 2, dNDS: 2, EIL: R.EIL, EIR: R.EIR, GJ: R.GJ, EA: R.EA_rim });
fs.writeFileSync(process.argv[3], JSON.stringify(cases));
console.log(cases.length, 'cases');
