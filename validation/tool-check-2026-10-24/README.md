# Tool accuracy check, 2026-10-24

A check of the two live wheel tools against Matthew Ford's own Python
(`third-party/dashdotrobot/bike-wheel-calc`, MIT), the reference
implementation of his Mode Matrix method (PhD thesis, Northwestern, 2018).
All of the physics being checked is Ford's; this folder only records
whether the tools reproduce it.

## Versions tested

| Tool | Commit | Engine |
| --- | --- | --- |
| Wheel Strength Lab | MTB-wheel-lab `main` 985dd75 (fresh build matches deployed `index.html` byte for byte) | imports this repo at 33ed149 (identical to `main`) |
| 148 vs 157 widget | wheel-comparison-widget2 `main` fa650ab | pasted copy of `js/engine.js`; differs only in its 9-line header comment |

## Method

1. `make_cases.mjs` builds 380 wheels (`cases.json`):
   - 180 grid builds: all 30 hubs x 6 setups (ERD/spokes/DS tension:
     600/32/100, 600/28/120, 534/32/120, 667/32/100, 600/32/120,
     559/28/110), 2.0 mm spokes, stock rim.
   - 200 random builds (seed 20261024): ERD 534/559/600/667, 28/32/36
     spokes, 80-125 kgf, DS 1.8/2.0 mm, NDS 1.5/1.6/1.8/2.0 mm, rim
     stiffness scaled 0.6-1.6x.
2. `ford_cases.py` computes each build with bike-wheel-calc. Spokes are
   laced with `lace_cross_ds` / `lace_cross_nds` so the two sides can have
   different gauges. Outputs: tension ratio, `calc_lat_stiff` /
   `calc_rad_stiff` (smeared, no coupling), `calc_buckling_tension`
   (smeared linear), `calc_buckling_tension_modematrix` (discrete), and
   first-spoke-slack F_lat / F_rad from the discrete `ModeMatrix`.
3. `compare.mjs` runs the Lab's `computeWheelStrength` and the widget's
   `calc` on the same builds and writes `accuracy_380_builds.csv`
   (one row per build; `*_diff_pct` columns are |tool/Ford - 1| x 100).
4. `angles.mjs` extracts each tool's bracing-angle function; `angles.json`
   compares them with the angle implied by Ford's spoke geometry
   (hub flange point to rim centroid at ERD/2 + 11 mm, 3-cross).
5. The numbers each page prints for its default build were read off the
   served pages and compared by hand.

To re-run, set `LAB_PHYSICS` (path to the Lab's `src/physics.js` from
`wheel-lab-source.zip`), `WIDGET_ENGINE` (the widget's engine block saved
as CommonJS, e.g. via `validation/strength/extract_tool_hubs.mjs`) and
`WIDGET_HTML` (the widget's `index.html`). `compare.mjs` expects Ford
results split as `ford_0.json` ... `ford_7.json` (`ford_cases.py ... k 8`
for k = 0..7). `angles.mjs` expects the Lab's hub catalogue at
`lab/hub_catalogue.json`.

## Results: engine

Both tools gave identical results to each other on every build. Worst
difference from Ford, percent:

| Output | All 380 builds | 372 builds below buckling |
| --- | --- | --- |
| Tension ratio | 4.4e-14 | 4.4e-14 |
| K_lat | 5.3e-11 | 4.4e-13 |
| K_rad | 1.6e-13 | 1.6e-13 |
| T_c (discrete) | 5.9e-10 | 2.6e-10 |
| T_c_smeared | 1.1e-13 | 1.1e-13 |
| F_lat | 3.2e-11 | 3.7e-12 |
| F_rad | 3.6e-11 | 1.2e-12 |

Eight random builds are past buckling (tension above T_c); no grid build
is. T_c's larger scatter comes from Ford's function using scipy `eig()`
where the engine uses a symmetric solver (see the core validation
tolerance of 1e-7%).

## Results: what the pages show

| Page | Build | Shown | Ford |
| --- | --- | --- | --- |
| Widget headline F_lat | CK 148 vs CK 157, 29", 32H, 120 kgf | 22.4 / 28.6 kgf, +27.8% | 22.40 / 28.63 kgf |
| Lab Compare F_lat | same pair, 28H | 20.7 / 26.4 kgf, +27% | 20.73 / 26.37 kgf |
| Lab bracing angle | all hubs | matches | max diff 4e-14% |
| Widget bracing-angle label | all hubs | 9.3-13.9% high (CK 148 DS: 5.06 deg) | 4.56 deg for CK 148 DS |

## Not Ford's model (open at the time of this check)

- Lab Simulation and Deep Dive tabs use fixed 36/42 kgf thresholds that
  ignore the selected hub; the Analysis text describes an older
  sum-of-T-sin(alpha) model; Strength Metrics are static; "yield" and
  "margin-to-yield" describe what is first spoke slack. Fix:
  MTB-wheel-lab PR #9 (conflicts with merged #10; needs a rebuild).
- Widget bracing-angle label uses `atan(ds / (ERD/2 - pds/2))`. Display
  only. Fix: wheel-comparison-widget2 PR #9.
