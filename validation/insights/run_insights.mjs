#!/usr/bin/env node
/**
 * Diffs js/engine.js's insight outputs (K_tor, nSP_rad, nSP_lat, T_c_modes,
 * and K_lat across a tension sweep) against reference_insights.py's values
 * from Ford's bike-wheel-calc. Fails on any difference above floating-point
 * noise. Usage: python3 reference_insights.py && node run_insights.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { calc } from "../../js/engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const MAX = 1e-9; // percent
const cat = JSON.parse(readFileSync(join(here, "..", "hub_catalogue.json"), "utf8"));
const R = cat.rim_constants;
const csv = (f) => {
  const [h, ...rows] = readFileSync(join(here, f), "utf8").trim().split(/\r?\n/);
  const k = h.split(",");
  return rows.map((l) => Object.fromEntries(l.split(",").map((v, i) => [k[i], v])));
};
const run = (name, erd, ns, tds) => {
  const hub = cat.hubs.find((x) => x.name === name);
  return calc(erd, { ds: hub.ds, nds: hub.nds, pds: hub.pds, pnds: hub.pnds },
    2.0, 2.0, tds, R.EIL, R.EIR, R.GJ, R.EA_rim, ns, 24);
};
let worst = 0, fails = 0, n = 0;
const cmp = (label, mine, theirs) => {
  const d = Math.abs((mine / theirs - 1) * 100);
  worst = Math.max(worst, d); n++;
  if (!(d < MAX)) { fails++; console.log(`FAIL ${label}: engine ${mine} vs Ford ${theirs} (${d.toExponential(2)}%)`); }
};
for (const r of csv("reference_insights.csv")) {
  const g = run(r.hub_name, +r.erd_mm, +r.spokes, +r.tDS_kgf);
  const tag = `${r.hub_name} ${r.erd_mm}/${r.spokes}/${r.tDS_kgf}`;
  cmp(`${tag} K_tor`, g.K_tor, +r.K_tor_Nm_per_deg);
  cmp(`${tag} nSP_rad`, g.nSP_rad, +r.n_sp_rad);
  cmp(`${tag} nSP_lat`, g.nSP_lat, +r.n_sp_lat);
  for (const m of g.T_c_modes) cmp(`${tag} T_c n=${m.n}`, m.T_c_DS, +r[`Tc_n${m.n}_DS_kgf`]);
}
for (const r of csv("reference_klat_sweep.csv")) {
  const t = +r.tDS_kgf === 0 ? 1e-9 : +r.tDS_kgf;
  cmp(`${r.hub_name} K_lat @${r.tDS_kgf}`, run(r.hub_name, +r.erd_mm, +r.spokes, t).K_lat, +r.K_lat_Nmm);
}
console.log(`${n} comparisons, ${fails} failures, worst diff ${worst.toExponential(2)}%`);
process.exit(fails ? 1 : 0);
