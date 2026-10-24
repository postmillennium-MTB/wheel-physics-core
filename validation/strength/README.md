# Strength check: first spoke slack vs Ford's bike-wheel-calc

`validation/run.mjs` checks the engine's stiffness and buckling outputs
against Matthew Ford's `bike-wheel-calc`. It does not check `F_lat` and
`F_rad`, the first-spoke-slack strength figures, because the library has
no strength output to compare them with. This folder fills that gap by
computing first slack directly with Ford's own routines, then comparing
the result with what `js/engine.js` and the two tools report.

The method is Ford's Mode Matrix method (Ford, 2018, PhD thesis,
Northwestern University). The reference code is his `bike-wheel-calc`
(MIT, © 2015 Matthew Ford), used unmodified from
`third-party/dashdotrobot/bike-wheel-calc` at commit 6fc380c.

## How first slack is computed from Ford's code

1. Build the wheel the same way `validation/reference.py` does
   (`BicycleWheel`, 3-cross, rim centroid at ERD/2 + 11 mm).
2. Apply a 1 N point load with `ModeMatrix.F_ext`, at a spoke's rim point,
   in both directions, for the first four spokes (both sides, leading and
   trailing). A 16-position sweep around one lacing period confirmed that a
   load right at a spoke is the worst case.
3. Solve for rim displacement and get every spoke's tension change with
   `ModeMatrix.spoke_tension_change` (that is, `Spoke.calc_tension_change`).
4. First slack = the smallest load at which any spoke's tension reaches
   zero: min over spokes losing tension of `T0 / -dT`.

There are two variants:

- **smeared**: smeared spokes, lateral and radial uncoupled. These are the
  same settings `engine.js` uses for its stiffness terms, so the engine
  should match this to floating-point precision.
- **discrete**: individual spokes, lateral and radial coupled. This is
  Ford's more detailed model, run as a cross-check on the smeared
  simplification, not as a pass/fail target.

## Results, 2026-10-24

### Tools vs Ford, same settings: pass

| What | Cases | Worst difference |
| --- | --- | --- |
| F_lat and F_rad from both tools, 30 hubs × 4 setups × 4 branches (widget2 `main` + PR #9 branch, MTB-wheel-lab `main` + PR #9 branch) | 960 | 1.8 × 10⁻¹³ % |
| MTB-wheel-lab regression dataset (`build_dataset.js`), F_lat and tension ratio, all 2,400 rows | 4,800 | 1.8 × 10⁻¹³ % |
| `explorer.html`'s embedded DATA vs a fresh `build_explorer.js` run | 2,400 rows | identical |
| `explorer.html`'s inline `calc()` copy vs `js/engine.js` (carbon factor 0.75 / 1.0 / 1.35) | 4,320 | 0 |

The four setups are 29" (ERD 600) with 32 spokes at 100 kgf; 29" with 28
spokes at 120 kgf (the Lab default); 26" (ERD 534) with 32 spokes at 120
kgf; and 32" (ERD 667) with 32 spokes at 100 kgf. All use 2.0 mm spokes
and TK540 rim constants.

### Ford's discrete model vs the smeared simplification

`results_2026-10-24/first_slack_30_hubs.csv`:

| Setup | Lateral, discrete vs tools (median, range) | Radial, discrete vs tools (median, range) | 157 vs 148 average advantage, tools / discrete | 148-vs-157 pair verdicts that flip (of 225) |
| --- | --- | --- | --- | --- |
| 29", 32H, 100 kgf | +13.6%, +6.0 to +15.9% | +22.5%, +14.5 to +29.6% | +23.0% / +21.9% | 1 |
| 29", 28H, 120 kgf | +11.8%, +1.6 to +14.8% | +31.0%, +24.0 to +40.4% | +24.7% / +24.9% | 6 |
| 26", 32H, 120 kgf | +13.4%, +6.4 to +15.9% | +21.1%, +12.7 to +28.2% | +22.6% / +21.2% | 2 |
| 32", 32H, 100 kgf | +10.8%, −1.9 to +14.1% | +28.3%, +21.4 to +37.1% | +26.1% / +26.7% | 6 |

Every flipped verdict is a near tie (under 7% in both models). In most
wheels the smeared figures are conservative. The gap is smallest for
Project 321 G3 (148 and 157), KOM Xeno 148 and OneUp 157.

### Near buckling, the smeared figure overstates strength

`results_2026-10-24/regression_2400_rows.csv`, grouped by the engine's
`T_safety` (current tension as a % of critical buckling tension):

| T / T_c | Rows | Discrete vs tool F_lat, min | Median |
| --- | --- | --- | --- |
| under 50% | 1,471 | +6.5% | +13.8% |
| 50–70% | 824 | +2.2% | +11.4% |
| 70–80% | 85 | −4.3% | +5.1% |
| 80–90% | 19 | −25.2% | −4.7% |
| 90% and over | 1 | −49.5% | — |

The low rows are 120 kgf, 29" builds on soft rims (Stan's Flow S2, Race
Face ARC Offset 30 and, at the edge, DT Swiss XM 481), mostly with 1.8 mm
spokes, on KOM Xeno 148 and Project 321 G3 (148 and 157). This fits
Ford & Balogun (2017, `papers/ford-balogun-2017-radial-strength-and-collapse.pdf`):
lateral stiffness falls toward zero as tension approaches T_c, so close to
buckling, the rim's stability rather than spoke slack sets the strength.

The T / T_c column above uses the smeared buckling tension the tools
reported on 2026-10-24. Ford's discrete-spoke buckling tension
(`theory.calc_buckling_tension_modematrix`, `smeared_spokes=False`) is 4–11%
lower across the 120 rows of `validation/validation_baseline_2026-10-24.csv`,
so in the discrete model these builds sit closer to buckling than this
column shows. `js/engine.js` now reports the discrete value as `T_c`.

### Regression conclusions under Ford's discrete model

The regression was re-run with Y = Ford's discrete F_lat in place of the
engine's F_lat. Full outputs: `regression_tool_Y.txt`,
`regression_ford_discrete_Y.txt`.

| | Engine F_lat (as published) | Ford discrete F_lat |
| --- | --- | --- |
| R² | 0.945 | 0.927 |
| Largest standardized beta | rim_stiffness_index 0.578 | rim_stiffness_index 0.604 |
| Next | tension_ratio 0.426, flange_width 0.395 | flange_width 0.447, tension_ratio 0.341 |
| standard_157 | −0.020 (p 0.24) | −0.034 (p 0.07) |
| spoke_diameter | 0.005 (p 0.34) | 0.029 (p < 0.001) |

Rim stiffness still leads, and the axle standard still adds nothing beyond
hub geometry. Flange width and tension ratio trade places, and spoke
diameter becomes significant but small.

## Not covered

- Rim stiffness is TK540 (scaled by `rim_stiffness_index` in the
  regression rows); other measured rims were not run.
- All models here are linear up to first slack. Post-slack behaviour and
  permanent set are not modelled.
- MTB-wheel-lab's committed `dataset.json` and `wheel_strength_dataset.csv`
  are an older 30/150-row format and still carry h9's old 26 mm drive-side
  offset. `explorer.html` and a fresh `build_dataset.js` run do not use
  them. They were not part of these checks.

## Re-running

Needs numpy and scipy (plus pandas and statsmodels for the regression).
Set `OMP_NUM_THREADS=1` when running several Python processes at once.

```bash
BWC=third-party/dashdotrobot/bike-wheel-calc
cd validation/strength
# 30-hub first-slack check, one setup (ERD, spoke count, DS tension kgf):
python3 -I ford_first_slack.py ../../$BWC tool_hubs_30.json ford.json 600 28 120
node engine_first_slack.cjs ../../js/engine.js tool_hubs_30.json engine.json 600 28 120
# A tool's own engine and hub list (widget2 index.html, or the Lab's src/data.js):
node extract_tool_hubs.mjs widget path/to/index.html outdir/
# Regression rows: from MTB-wheel-lab/analysis/wheel-strength-regression after npm install
node path/to/make_regression_rows.cjs outdir/
python3 -I regression_rows.py ../../$BWC outdir/rows.json outdir/hubs.json out_0.json 0 1
```

`tool_hubs_30.json` is the 30-hub list both tools carried on 2026-10-24
(identical geometry in both). `validation/hub_catalogue.json` is older
(25 hubs) and is left unchanged here.
