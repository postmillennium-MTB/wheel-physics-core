// usage: node make_cases.mjs <hub_catalogue.json> <out.json>
import fs from 'fs';
const cat = JSON.parse(fs.readFileSync(process.argv[2])); const R = cat.rim_constants;
const cases = [];
const add = (tag, hub, erd, Ns, tDS, dDS, dNDS, s) => cases.push({tag, hub, erd, Ns, tDS, dDS, dNDS, EIL: R.EIL*s, EIR: R.EIR*s, GJ: R.GJ*s, EA: R.EA_rim*s});
// A: every hub at the 4 standard setups + each tool's default build (29", 120 kgf, 28H Lab / 32H widget already covered)
for (const [erd, Ns, t] of [[600,32,100],[600,28,120],[534,32,120],[667,32,100],[600,32,120],[559,28,110]])
  for (const h of cat.hubs) add('grid', h, erd, Ns, t, 2, 2, 1);
// B: random builds across the ranges the two tools' controls reach (seeded)
let seed = 20261024; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = a => a[Math.floor(rnd() * a.length)];
for (let k = 0; k < 200; k++)
  add('random', pick(cat.hubs), pick([534,559,600,667]), pick([28,32,36]), pick([80,90,100,110,120,125]),
      pick([1.8,2.0]), pick([1.5,1.6,1.8,2.0]), +(0.6 + rnd()).toFixed(2));
fs.writeFileSync(process.argv[3], JSON.stringify(cases));
console.log(cases.length, 'cases');
