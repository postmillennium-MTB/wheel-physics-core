// usage: node extract_tool_hubs.mjs <kind widget|lab> <srcfile(index.html|data.js)> <outdir>
import fs from 'fs'; import vm from 'vm';
const [kind, src, out] = process.argv.slice(2);
const txt = fs.readFileSync(src,'utf8');
let H148,H157;
if (kind==='widget') {
  const grab = n => { const i=txt.indexOf('const '+n+' = ['); const j=txt.indexOf('];',i); return vm.runInNewContext(txt.slice(i+('const '+n+' = ').length, j+1)); };
  H148=grab('HUBS_148'); H157=grab('HUBS_157');
  const eng = txt.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
  fs.writeFileSync(out+'/engine.cjs', eng);
} else {
  const m = vm.runInNewContext('(()=>{'+txt.replace(/export const /g,'var ').replace(/^export .*$/gm,'')+';return {HUBS_148,HUBS_157};})()');
  H148=m.HUBS_148; H157=m.HUBS_157;
}
const hubs=[...H148.map(h=>({...h,std:148})),...H157.map(h=>({...h,std:157}))].map(h=>({name:h.id+' '+h.name,std:h.std,ds:h.ds,nds:h.nds,pds:h.pds,pnds:h.pnds}));
fs.writeFileSync(out+'/hub_catalogue.json', JSON.stringify({rim_constants:{EIL:50,EIR:150,GJ:22,EA_rim:11500000,modes:24},hubs},null,1));
console.log(kind, hubs.length,'hubs');
