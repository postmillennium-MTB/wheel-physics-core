#!/usr/bin/env node
/**
 * Runs js/engine.js on the same hub_catalogue.json + build conditions
 * reference.py already computed, and diffs every metric against
 * reference.csv. Fails (non-zero exit) if any hub's diff exceeds
 * MAX_DIFF_PCT, which is set to floating-point noise, not a "close enough"
 * tolerance -- the whole point of vendoring the Python is that the JS port
 * should be able to match it exactly.
 *
 * Usage: python3 reference.py && node run.mjs
 * (reference.py must run first -- this script only reads reference.csv,
 * it doesn't invoke Python itself, so this repo's CI can cache/parallelize
 * the two steps if useful.)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { calc } from "../js/engine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAX_DIFF_PCT = 1e-9; // floating-point noise; a real formula mismatch is orders of magnitude larger

const catalogue = JSON.parse(readFileSync(join(__dirname, "hub_catalogue.json"), "utf8"));
const R = catalogue.rim_constants;

const refText = readFileSync(join(__dirname, "reference.csv"), "utf8").trim().split("\n");
const refHeader = refText[0].split(",");
const refRows = refText.slice(1).map((line) => {
  const cells = line.split(",");
  return Object.fromEntries(refHeader.map((h, i) => [h, cells[i]]));
});

const ERD_MM = 600, SPOKES = 32, SPOKE_DIA = 2.0, T_DS = 100;

let worstDiff = 0;
let anyFail = false;
const outRows = [];

for (const hub of catalogue.hubs) {
  const ref = refRows.find((r) => r.hub_name === hub.name);
  if (!ref) {
    console.error(`no reference row for ${hub.name} -- did reference.py run on this catalogue?`);
    process.exit(1);
  }

  const got = calc(
    ERD_MM,
    { ds: hub.ds, nds: hub.nds, pds: hub.pds, pnds: hub.pnds },
    SPOKE_DIA, SPOKE_DIA, T_DS,
    R.EIL, R.EIR, R.GJ, R.EA_rim,
    SPOKES, 24
  );

  const checks = [
    ["ratio_pct", got.ratio, +ref.ratio_pct],
    ["K_lat_Nmm", got.K_lat, +ref.K_lat_Nmm],
    ["K_rad_Nmm", got.K_rad, +ref.K_rad_Nmm],
    ["T_c_kgf", got.T_c, +ref.T_c_kgf],
  ];

  let hubMaxDiff = 0;
  for (const [, mine, theirs] of checks) {
    const diff = theirs === 0 ? Math.abs(mine) : Math.abs((mine / theirs - 1) * 100);
    hubMaxDiff = Math.max(hubMaxDiff, diff);
  }
  worstDiff = Math.max(worstDiff, hubMaxDiff);
  const pass = hubMaxDiff < MAX_DIFF_PCT;
  if (!pass) anyFail = true;

  console.log(
    `${pass ? "PASS" : "FAIL"}  ${hub.name.padEnd(32)}  max_diff=${hubMaxDiff.toExponential(2)}%`
  );

  outRows.push({
    hub_name: hub.name,
    std: hub.std,
    erd_mm: ERD_MM, tDS_kgf: T_DS, spk_mm: SPOKE_DIA, Ns: SPOKES, N: 24,
    EIL_Nm2: R.EIL, EIR_Nm2: R.EIR, GJ_Nm2: R.GJ, EA_rim_N: R.EA_rim,
    hub_ds_mm: hub.ds, hub_nds_mm: hub.nds, hub_pds_mm: hub.pds, hub_pnds_mm: hub.pnds,
    ref_ratio_pct: ref.ratio_pct, engine_ratio_pct: got.ratio,
    ref_K_lat_Nmm: ref.K_lat_Nmm, engine_K_lat_Nmm: got.K_lat,
    ref_K_rad_Nmm: ref.K_rad_Nmm, engine_K_rad_Nmm: got.K_rad,
    ref_T_c_kgf: ref.T_c_kgf, engine_T_c_kgf: got.T_c,
    max_diff_pct: hubMaxDiff,
    pass_fail: pass ? "PASS" : "FAIL",
  });
}

const date = new Date().toISOString().slice(0, 10);
const outPath = join(__dirname, `validation_baseline_${date}.csv`);
const header = Object.keys(outRows[0]);
const csv = [header.join(","), ...outRows.map((r) => header.map((h) => r[h]).join(","))].join("\n");
writeFileSync(outPath, csv + "\n");

console.log(`\n${outRows.length} hubs checked. Worst-case diff: ${worstDiff.toExponential(2)}%.`);
console.log(`Results written to ${outPath}`);

if (anyFail) {
  console.error(`\nFAILED: engine.js diverges from the reference Python library beyond floating-point noise.`);
  process.exit(1);
}
console.log(`\nAll hubs PASS.`);
