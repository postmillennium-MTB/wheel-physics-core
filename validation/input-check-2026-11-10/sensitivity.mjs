// Sensitivity of F_lat / K_lat / F_rad to each input the tools set, around the
// default build: 29" (ERD 600), 28 spokes, 120 kgf DS tension, 2.0 mm spokes,
// DT Swiss TK540 rim (Ford, Peng & Balogun 2018). Two hubs: CK 148 and CK 157.
// Engine: js/engine.js (checked against Ford's bike-wheel-calc in ../).
import { calc } from "../../js/engine.js";
const HUBS = {
  "CK148": { nds: 36.3, ds: 24,   pds: 57.4, pnds: 57.4 },
  "CK157": { nds: 40.3, ds: 28.8, pds: 57.4, pnds: 57.4 },
};
const RIM = { EIL: 260, EIR: 211, GJ: 75, EA: 72e5 };
const run = (erd, hub, dDS, dNDS, T, rim = RIM, Ns = 28) => {
  const r = calc(erd, hub, dDS, dNDS, T, rim.EIL, rim.EIR, rim.GJ, rim.EA, Ns, 24);
  return { F_lat: r.F_lat, K_lat: r.K_lat, F_rad: r.F_rad };
};
const rows = [];
const add = (input, change, fn) => {
  for (const [name, hub] of Object.entries(HUBS)) {
    const b = run(600, hub, 2, 2, 120), v = fn(hub);
    rows.push({ input, change, hub: name,
      dF_lat: (v.F_lat / b.F_lat - 1) * 100, dK_lat: (v.K_lat / b.K_lat - 1) * 100, dF_rad: (v.F_rad / b.F_rad - 1) * 100 });
  }
};
add("ERD (mm)", "+5", h => run(605, h, 2, 2, 120));
add("ERD (mm)", "-5", h => run(595, h, 2, 2, 120));
add("Flange offset DS and NDS (mm)", "+1 each", h => run(600, { ...h, nds: h.nds + 1, ds: h.ds + 1 }, 2, 2, 120));
add("Flange offset DS and NDS (mm)", "-1 each", h => run(600, { ...h, nds: h.nds - 1, ds: h.ds - 1 }, 2, 2, 120));
add("Flange (pull-circle) diameter (mm)", "+3 both", h => run(600, { ...h, pds: h.pds + 3, pnds: h.pnds + 3 }, 2, 2, 120));
add("Flange (pull-circle) diameter (mm)", "-3 both", h => run(600, { ...h, pds: h.pds - 3, pnds: h.pnds - 3 }, 2, 2, 120));
add("Spoke diameter (mm)", "1.8 both", h => run(600, h, 1.8, 1.8, 120));
add("Spoke diameter (mm)", "2.0 DS / 1.8 NDS", h => run(600, h, 2, 1.8, 120));
add("Spoke count", "32 (from 28)", h => run(600, h, 2, 2, 120, RIM, 32));
add("Rim EI_lat (N m^2)", "130 (min measured)", h => run(600, h, 2, 2, 120, { ...RIM, EIL: 130 }));
add("Rim EI_lat (N m^2)", "260 (TK540)", h => run(600, h, 2, 2, 120, { ...RIM, EIL: 260 }));
add("Rim EA (MN)", "5 (low end)", h => run(600, h, 2, 2, 120, { ...RIM, EA: 5e6 }));
add("Rim EA (MN)", "8 (high end)", h => run(600, h, 2, 2, 120, { ...RIM, EA: 8e6 }));
console.log("input,change,hub,dF_lat_pct,dK_lat_pct,dF_rad_pct");
for (const r of rows) console.log([r.input, r.change, r.hub, r.dF_lat, r.dK_lat, r.dF_rad].map(x => typeof x === "number" ? x.toFixed(1) : `"${x}"`).join(","));
