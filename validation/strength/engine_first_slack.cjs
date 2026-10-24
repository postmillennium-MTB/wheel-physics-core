// usage: node engine_first_slack.cjs <engine.cjs> <hub_catalogue.json> <out.json> erd Ns tDS
const fs=require('fs'); const [eng,catf,outf,erd,ns,t]=process.argv.slice(2);
const {calc}=require(require('path').resolve(eng)); const cat=JSON.parse(fs.readFileSync(catf)); const R=cat.rim_constants;
const out=cat.hubs.map(h=>{const g=calc(+erd,{ds:h.ds,nds:h.nds,pds:h.pds,pnds:h.pnds},2,2,+t,R.EIL,R.EIR,R.GJ,R.EA_rim,+ns,24);
 return {name:h.name,std:h.std,F_lat:g.F_lat,F_rad:g.F_rad,latGov:g.latGov,radGov:g.radGov,K_lat:g.K_lat,T_safety:g.T_safety};});
fs.writeFileSync(outf,JSON.stringify(out,null,1));
