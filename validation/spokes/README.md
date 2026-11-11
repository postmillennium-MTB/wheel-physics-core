# Per-spoke and torque validation

## At a glance

| | |
|---|---|
| Question | Do the engine's per-spoke outputs (spoke angles, built tensions, tension change per unit load at four load points, combined-load first slack, pedal and brake torque first slack) match Ford's code? |
| Type | Formulas (engine vs Ford, same inputs on both sides) |
| Rim used | Measured DT Swiss TK540 (260 / 211 / 75 N·m², EA 7.2 MN) since 2026-11-10 (the 2026-10-31 and 2026-11-07 baselines used the placeholder 50/150/22); ERDs 605 / 538 / 649 mm since 2026-11-11 (earlier baselines used 600 / 534 / 667) |
| Engine | `js/engine.js`, current `main` |
| Ford's code | bike-wheel-calc 6fc380c |
| Verdict | Pass: all 120 rows of `spokes_baseline_2026-11-11.csv`; worst differences 3.4e-14 (per-spoke tension, relative), 3.6e-13% (combined load) and 6.6e-13% (torque). Header comment of `run_spokes.mjs` lists what is compared. |
| Re-run | `cd validation/spokes && python3 reference_spokes.py && node run_spokes.mjs` |

## Method

`reference_spokes.py` computes reference values with bike-wheel-calc and
writes `reference_spokes.json`. `run_spokes.mjs` runs `js/engine.js`
(`calc`, `firstSlackCombined`, `firstSlackTorque`) on the same wheels and
fails on any difference beyond floating-point noise. It also prints the
load-between-spokes study, which is not a pass/fail check.

Baselines are dated CSVs, one row per hub and build (columns in the first
line of each file). A new engine or rim change gets a new dated baseline;
older ones are kept as history.

## Not covered

Everything here is linear up to first slack, as in the rest of
`validation/`. Hub and rim inputs are not traced here; see
`../input-check-2026-11-10/`.
