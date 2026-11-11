// js/engine.js on the simulator's inputs; ERD from argv (rim centroid R = ERD/2 + 11 mm).
import { calc } from "../../js/engine.js";
const erd = Number(process.argv[2]);
const E = 69e9, R = erd / 2000 + 0.011, EA = E * 0.56 / (2 * Math.PI * R * 2700);
const HUBS = { "DMR Zone 148": [38, 21], "DMR Zone 157": [41, 25] };
const out = {};
for (const [name, [nds, ds]] of Object.entries(HUBS)) {
  const r = calc(erd, { nds, ds, pds: 56, pnds: 56 }, 2, 2, 100, 260, 210, 75, EA, 36, 24);
  out[name] = { T_nds_kgf: r.T_NDS, K_rad_N_mm: r.K_rad, K_lat_N_mm: r.K_lat,
                K_tor_N_deg: r.K_tor / R, T_max_avg_kgf: r.T_c_smeared,
                F_lat_kgf: r.F_lat, F_rad_kgf: r.F_rad };
}
console.log(JSON.stringify(out, null, 1));
