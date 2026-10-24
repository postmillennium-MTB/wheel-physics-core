import fs from 'fs';
const { bracingAngleDeg } = await import(process.env.LAB_PHYSICS);
const html = fs.readFileSync(process.env.WIDGET_HTML,'utf8');
const i = html.indexOf('function bracingAngle(R, ds, pds)'); const j = html.indexOf('\n}', i) + 2;
const wBr = new Function(html.slice(i, j) + '; return bracingAngle;')();
const cat = JSON.parse(fs.readFileSync('lab/hub_catalogue.json'));
const out = [];
for (const Ns of [28, 32]) for (const h of cat.hubs)
  out.push({ hub: h.name, Ns, ds: h.ds, nds: h.nds, pds: h.pds, pnds: h.pnds,
    lab_ds: bracingAngleDeg(600, h.ds, h.pds, Ns), lab_nds: bracingAngleDeg(600, h.nds, h.pnds, Ns), widget_ds: wBr(300, h.ds, h.pds) });
fs.writeFileSync('angles_tools.json', JSON.stringify(out));
console.log(html.slice(i, j));
