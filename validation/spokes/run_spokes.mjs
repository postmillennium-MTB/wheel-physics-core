#!/usr/bin/env node
/**
 * Checks engine.js's per-spoke output against reference_spokes.json, which
 * reference_spokes.py computes with Ford's bike-wheel-calc:
 *   - spoke rim angles, built tensions and load-point angles;
 *   - every spoke's tension change per unit lateral and radial load, at each
 *     of the four load points, element by element;
 *   - firstSlackCombined against first slack under a load the library
 *     applies with both components at once;
 *   - firstSlackCombined in the pure directions against the engine's own
 *     F_rad and F_lat (which ../run.mjs checks against the library).
 * Fails (non-zero exit) on any mismatch beyond floating-point noise. Also
 * prints the load-between-spokes study (not a pass/fail check).
 *
 * Usage: python3 reference_spokes.py && node run_spokes.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { calc, firstSlackCombined } from "../../js/engine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// dT entries near zero (spokes far from the load) are compared on an
// absolute scale: 1e-12 of the largest |dT| in that vector.
const MAX_REL = 1e-11, ABS_FLOOR = 1e-12, MAX_DIFF_PCT = 1e-9;

const catalogue = JSON.parse(readFileSync(join(__dirname, "..", "hub_catalogue.json"), "utf8"));
const R = catalogue.rim_constants;
const refs = JSON.parse(readFileSync(join(__dirname, "reference_spokes.json"), "utf8"));

let anyFail = false, worstDT = 0, worstComb = 0, worstSelf = 0;
const between = { rad: Infinity, lat_pos: Infinity, lat_neg: Infinity };
const outRows = [];
const pct = (a, b) => Math.abs((a / b - 1) * 100);

for (const ref of refs) {
  const hub = catalogue.hubs.find((h) => h.name === ref.hub_name);
  const got = calc(ref.erd_mm, { ds: hub.ds, nds: hub.nds, pds: hub.pds, pnds: hub.pnds },
                   2.0, 2.0, ref.tDS_kgf, R.EIL, R.EIR, R.GJ, R.EA_rim, ref.spokes, 24,
                   { spokes: true });
  const s = got.spokes;
  const fails = [];

  // Geometry and tensions, matched by index (both sort spokes by rim angle).
  let geo = 0;
  s.th.forEach((th, i) => { geo = Math.max(geo, Math.abs(th - ref.th[i])); });
  s.loadTh.forEach((th, j) => { geo = Math.max(geo, Math.abs(th - ref.loadTh[j])); });
  if (!(geo < 1e-12)) fails.push(`angles differ by ${geo}`);
  s.T.forEach((T, i) => { if (!(pct(T, ref.T_kgf[i]) < MAX_DIFF_PCT)) fails.push(`T[${i}]`); });

  // Per-spoke influence.
  let rowDT = 0;
  for (const comp of ["lat", "rad"]) {
    for (let j = 0; j < 4; j++) {
      const mine = s.dT[comp][j], theirs = ref.dT[comp][j];
      const big = Math.max(...theirs.map(Math.abs));
      for (let i = 0; i < theirs.length; i++) {
        const err = Math.abs(mine[i] - theirs[i]) / Math.max(Math.abs(theirs[i]), ABS_FLOOR * big / MAX_REL);
        rowDT = Math.max(rowDT, err);
      }
    }
  }
  if (!(rowDT < MAX_REL)) fails.push(`dT rel err ${rowDT.toExponential(2)}`);

  // Combined load, applied by the library in one go.
  let rowComb = 0;
  for (const c of ref.combined) {
    const phi = c.phi_deg * Math.PI / 180;
    const mine = firstSlackCombined(got, { lat: Math.cos(phi), rad: Math.sin(phi) }).scale;
    rowComb = Math.max(rowComb, pct(mine, c.scale_kgf));
  }
  if (!(rowComb < MAX_DIFF_PCT)) fails.push(`combined ${rowComb.toExponential(2)}%`);

  // Pure directions reproduce the engine's own validated strength figures.
  const rad = firstSlackCombined(got, { lat: 0, rad: 1 }).scale;
  const latP = firstSlackCombined(got, { lat: 1, rad: 0 }).scale;
  const latN = firstSlackCombined(got, { lat: -1, rad: 0 }).scale;
  const self = Math.max(pct(rad, got.F_rad), pct(Math.min(latP, latN), got.F_lat));
  if (!(self < MAX_DIFF_PCT)) fails.push(`pure directions vs F_rad/F_lat ${self.toExponential(2)}%`);

  for (const k of Object.keys(between)) {
    const b = ref.between[k];
    between[k] = Math.min(between[k], (b.swept_kgf / b.spoke_points_kgf - 1) * 100);
  }
  worstDT = Math.max(worstDT, rowDT); worstComb = Math.max(worstComb, rowComb); worstSelf = Math.max(worstSelf, self);
  const pass = fails.length === 0;
  if (!pass) { anyFail = true; console.log(`FAIL ${ref.hub_name} ${ref.erd_mm}/${ref.spokes}/${ref.tDS_kgf}: ${fails.join("; ")}`); }
  outRows.push([ref.hub_name, ref.erd_mm, ref.spokes, ref.tDS_kgf, rowDT, rowComb, self,
    (ref.between.rad.swept_kgf / ref.between.rad.spoke_points_kgf - 1) * 100,
    (ref.between.lat_pos.swept_kgf / ref.between.lat_pos.spoke_points_kgf - 1) * 100,
    (ref.between.lat_neg.swept_kgf / ref.between.lat_neg.spoke_points_kgf - 1) * 100,
    pass ? "PASS" : "FAIL"]);
}

const date = new Date().toISOString().slice(0, 10);
const header = "hub_name,erd_mm,spokes,tDS_kgf,dT_max_rel_err,combined_max_diff_pct,pure_vs_F_max_diff_pct,between_rad_pct,between_lat_nds_pct,between_lat_ds_pct,result";
writeFileSync(join(__dirname, `spokes_baseline_${date}.csv`),
  header + "\n" + outRows.map((r) => r.map((v) => (typeof v === "string" && v.includes(",") ? `"${v}"` : v)).join(",")).join("\n") + "\n");

console.log(`${refs.length} builds checked.`);
console.log(`  per-spoke dT: worst relative error ${worstDT.toExponential(2)}`);
console.log(`  combined load vs library: worst diff ${worstComb.toExponential(2)}%`);
console.log(`  pure directions vs F_rad/F_lat: worst diff ${worstSelf.toExponential(2)}%`);
console.log(`Study, load between spokes (lowest first slack across one lacing period vs at spoke points, most negative build):`);
console.log(`  radial ${between.rad.toFixed(3)}%, lateral toward nds ${between.lat_pos.toFixed(3)}%, toward ds ${between.lat_neg.toFixed(3)}%`);
console.log(anyFail ? "\nSome builds FAIL." : "\nAll builds PASS.");
process.exit(anyFail ? 1 : 0);
