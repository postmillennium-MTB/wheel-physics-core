# wheel-physics-core

The shared, validated wheel-strength physics engine behind
[MTB-wheel-lab](https://github.com/postmillennium-MTB/MTB-wheel-lab) and
[wheel-comparison-widget2](https://github.com/postmillennium-MTB/wheel-comparison-widget2).

**This repo exists so those two tools compute the same numbers from the
same math, provably, on every change.** Before this repo existed, each
tool carried its own hand-written JavaScript translation of the underlying
method, and they had quietly drifted apart: for the same hub and the same
inputs, one tool's lateral stiffness figure was reading roughly 90% higher
than the other's, and neither tool's own repo had anything checking for
that. See "Validation" below for how this repo catches that automatically
going forward.

---

## Whose math this is

The engine implements the **Mode Matrix method** for bicycle wheel
stress analysis, developed by **Matthew T. Ford**:

> Ford, M.T. (2018). *Reinventing the Wheel: Stress Analysis, Stability,
> and Optimization of the Bicycle Wheel.* PhD thesis, Northwestern University.

Ford also published a reference implementation of his own method, as open
source, at [github.com/dashdotrobot/bike-wheel-calc](https://github.com/dashdotrobot/bike-wheel-calc)
(MIT License, © 2015 Matthew Ford). **The method and the original
reference code are entirely his work.** This repo does two things with
it:

1. **Includes his Python source unmodified**, via the
   `third-party/dashdotrobot/bike-wheel-calc` git submodule, pinned to
   commit [`6fc380c`](https://github.com/dashdotrobot/bike-wheel-calc/commit/6fc380c3576307d825d24fdffbbcbc192a720300)
   (2019-01-31 — the repository has had no further commits since, so this
   is not a moving target).
2. **Provides a JavaScript port** (`js/engine.js`) of the specific
   functions both tools need, written to be checked against his Python
   continuously (see Validation below) rather than trusted by eye.

Any error in the JavaScript port is this repo's, not his. If you spot one,
it reflects on this port, not on the thesis or the original library.

All of his other wheel-related repos — including `bike-wheel-calc` above
— are archived the same way, as git submodules under
`third-party/dashdotrobot/`, and his published papers live in `papers/`.
They're here so wheel-strength-related tools built in this org have his
actual apps, notebooks, and derivations on hand to run and test against
natively — rather than everyone re-finding and re-cloning his repos
individually whenever a question comes up about how a number in
`engine.js` was originally derived or validated. See
[`CREDITS.md`](./CREDITS.md) for the full list, each one's license status,
and how to add more.

`bike-wheel-calc` is the one submodule under `third-party/dashdotrobot/`
that's also an actual build/validation dependency, not just an archived
reference — `validation/reference.py` imports directly from it (see
Validation below), and `.github/workflows/validate.yml` checks out
submodules specifically so that import works in CI. The other six are
there purely for reference and aren't consumed by anything.

---

## What's in this repo

```
third-party/dashdotrobot/bike-wheel-calc/   Ford's library, submoduled, MIT-licensed
js/engine.js              THE canonical JS engine both tools should consume
js/build-link.js          Link format the two tools use to hand a build to each other
js/share-text.js          "Copy result" wording both tools paste (not physics)
test/build-link.test.js   Tests for that link format (npm test)
test/share-text.test.js   Tests for the "Copy result" wording (npm test)
test/spokes.test.js       Sign conventions of the per-spoke output (npm test)
validation/reference.py   Computes ground-truth values via bike-wheel-calc
validation/run.mjs        Runs engine.js on the same inputs, diffs, PASS/FAIL
validation/hub_catalogue.json   The hub geometries used as the test matrix
validation/validation_baseline_*.csv   Dated results of each validation run
validation/spokes/         Per-spoke output check (spoke ring, load envelope, torque)
validation/insights/       Check of the INSIGHTS-tab outputs (wind-up stiffness and others)
validation/strength/       2026-10-24 study behind the switch to discrete-spoke strength
.github/workflows/validate.yml   Runs the validation on every push, automatically
```

## Validation

`js/engine.js` is checked against the real Python library — not eyeballed,
not trusted from a past run — using the 30-hub catalogue both tools
draw from, at four build setups (29" with 32 spokes at 100 kgf and 28
spokes at 120 kgf, 26" with 32 spokes at 120 kgf, 32" with 32 spokes at
100 kgf). Each run computes every metric two ways, once in the vendored
Python and once via `engine.js`, and fails loudly if they disagree by
more than floating-point noise:

- tension ratio and lateral and radial stiffness, via
  `theory.calc_lat_stiff()` / `calc_rad_stiff()`;
- critical buckling tension two ways: `T_c` from
  `theory.calc_buckling_tension_modematrix()` (fully-discrete spokes,
  coupled), and `T_c_smeared` from `calc_buckling_tension()` (smeared,
  linear approximation);
- lateral and radial strength (`F_lat`, `F_rad`, first spoke slack under a
  point load). The library has no strength function, so `reference.py`
  builds it from the library's own `ModeMatrix` (fully-discrete spokes,
  lateral/radial coupled) and `Spoke.calc_tension_change`.

**Current result: all 120 hub-setup rows pass.** Every metric agrees to
within 3.2 × 10⁻¹³%, except discrete `T_c` at 1.2 × 10⁻⁹% (and `F_taco`,
which uses it, at 5.8 × 10⁻¹⁰%): the library function
solves that eigenproblem with scipy's general `eig()`, which scatters by
that much from a symmetric solver (`eigh`) on the same matrices, and
`engine.js` agrees with `eigh` to about 10⁻¹²%. `run.mjs` allows 10⁻⁷% for
that one metric. See `validation/validation_baseline_2026-11-11.csv` for the
full row-by-row comparison.

**The rim the checks use** (`rim_constants` in `hub_catalogue.json`) is the
one both tools use for every build: the DT Swiss TK540 as measured by
Matthew Ford with the acoustic method in Ford, Peng and Balogun (2018)
(`papers/ford-peng-balogun-2018-acoustic-modal-testing.pdf`), from his
[rim stiffness library](https://bicyclewheel.info/rim-stiffness/):
EI_lat 260, EI_rad 211, GJ 75 N·m², and EA 7.2 MN from the rim's 550 g
mass, as Ford's own wheel-app derives it. Ford measured ten other rims the
same way and lists them in the same library (seven of them are also the rim
presets in `third-party/dashdotrobot/wheel-app/wheel-app/helpers.py`). Until
November 2026 the checks and both tools used EI_lat 50, EI_rad 150, GJ 22
N·m² and EA 11.5 MN, a placeholder with no source that was softer laterally
than any rim Ford measured; the dated baselines up to 2026-11-07 were run
on it. Switching changed no engine code, and every check passed on both.

**Effective rim diameter (ERD) by wheel size.** The tools and the checks use
one ERD per wheel size, each from a published manufacturer spec. They are
single typical values, not the TK540's own ERD, and real rims vary by a few
millimetres (see the second 29" figure below).

| Wheel size | ERD (mm) | Source |
|---|---|---|
| 26" | 538 | DT Swiss FR 560 26" ([spec page](https://www.dtswiss.com/en/components/rims-mtb/free-ride/fr-560), "Reference diameter ERD 538 mm") |
| 27.5" | 567 | Tenet Coven AL rim ([product page](https://www.ridetenet.com/products/coven-al-rim), "ERD 567 mm (27.5) / 605 mm (29)") |
| 29" | 605 | Tenet Coven AL rim, same page. Reserve 30\|XC lists 599 mm for 29" ([product page](https://reservewheels.com/products/30-xc)); 6 mm moves F_lat about 1.3% and lateral stiffness about 3% (`validation/input-check-2026-11-10/`) |
| 32" | 649 | Reserve 30\|XC 32" ([product page](https://reservewheels.com/products/30-xc), "32\" ERD 649mm") |

The rim radius the engine uses is ERD/2 + 11 mm (below). Until 2026-11-11 the
values were 534 / 559 / 600 / 667 mm, with no source recorded; the dated
baselines up to 2026-11-10 were run on them.

This runs automatically on every push via GitHub Actions
(`.github/workflows/validate.yml`) — not as a manual step someone has to
remember. That automation is the actual fix for the drift problem this
repo exists to solve: a hand-run check only catches drift if someone
happens to run it; a check that runs on every commit catches it every
time, whether anyone asks or not.

**Per-spoke output** (`calc(..., { spokes: true })`, `spokeTensions`,
`firstSlackCombined`, used by the Lab's spoke ring and load envelope) has
its own check in `validation/spokes/`. `reference_spokes.py` loads the
rim with `ModeMatrix.F_ext` at each of the four load points of one lacing
period and reads every spoke's change with `Spoke.calc_tension_change`;
it also applies a sideways and a straight-down load together, in one
`F_ext` call, at 13 angles. `run_spokes.mjs` compares all of it with the
engine. Current result, 120 builds: every spoke's tension change agrees to
a relative 5 × 10⁻¹⁴, combined-load first slack to 3 × 10⁻¹³%, and the
pure directions reproduce `F_rad` and `F_lat`. The same script also sweeps
the load point across a whole lacing period in 32 steps: no build slackens
a spoke sooner with the load between spokes than at a spoke, so loading at
spoke points (as `F_lat`, `F_rad` and the envelope do) is the worst case.
See `validation/spokes/spokes_baseline_2026-10-31.csv`. Adding the option
left every existing output unchanged: `run.mjs` reproduces
`validation_baseline_2026-10-25.csv` byte for byte.

**Torque (pedal and brake)**, added 2026-11-07 for the Lab's TORSION tab:
the per-spoke output also carries each spoke's tension change per newton
of *tangential* load at the four load points (`dT.tan`, `f = [0, 0, 1, 0]`,
+w along increasing rim angle) and the rim radius `R_m`. With the hub held
still, as in Ford's model, the ground's push on the tire is how pedal or
brake torque reaches the spokes, so a torque M is applied as a tangential
load M / R at the contact point. `spokeTensions` takes it as `torque`
(N·m) or `tan` (kgf), and `firstSlackTorque(result, { sign, rad })` gives
the torque at which the first spoke goes slack, optionally with a fixed
radial load (rider weight) at the same point. In the rigid-hub model it
makes no difference whether the torque enters at the cassette or at the
rotor. `reference_spokes.py` checks it against the library with the radial
and tangential components applied together in one `F_ext` call, both
torque directions, with and without a 60 kgf radial load. Current result,
120 builds: tangential tension changes agree to a relative 5 × 10⁻¹⁴ and
first-slack torque to 8 × 10⁻¹³%; the library's own lowest spoke tension
at that torque is zero to 4 × 10⁻¹⁵ of the DS tension. See
`validation/spokes/spokes_baseline_2026-11-07.csv`. `run.mjs`'s main
outputs are unchanged (same numbers as `validation_baseline_2026-10-25.csv`;
only hub names differ, from the 2026-11-07 rename).

**Insight outputs**, added 2026-11-06 for the Lab's INSIGHTS and TORSION
tabs, have their own check in `validation/insights/`: wind-up stiffness
`K_tor` (torque per degree of rim rotation relative to the hub, Ford's
`theory.calc_tor_stiff`), the number of spokes inside a point load's affected
length (`nSP_rad`, `nSP_lat`), lateral stiffness across spoke tension
(tension softening), and the smeared buckling tension of each buckling shape
n = 2..6 (`T_c_modes`). `reference_insights.py` computes them with the
library and `run_insights.mjs` compares. Result on 2026-11-11: 1,740
comparisons, worst difference 2.1 × 10⁻¹³%. `validation/insights/README.md`
lists the source of each output and two gaps in the library that the
reference script fills.

`validation/strength/` records the 2026-10-24 study that led to computing
strength with discrete spokes: the earlier smeared-spoke strength figures
differed from the discrete ones by up to 49% close to buckling.

**Re-running it yourself:**
```bash
git submodule update --init third-party/dashdotrobot/bike-wheel-calc
cd validation
pip install numpy scipy
python3 reference.py   # writes reference.csv, via the bike-wheel-calc submodule
node run.mjs            # runs engine.js, diffs against reference.csv, writes a dated baseline
cd spokes
python3 reference_spokes.py   # per-spoke reference values (about 2 minutes)
node run_spokes.mjs           # diffs engine.js's per-spoke output, writes a dated baseline
cd ../insights
python3 reference_insights.py # insight-output reference values
node run_insights.mjs         # diffs engine.js's insight outputs
cd ../..
npm test                      # build-link format and per-spoke sign conventions
```

## Model settings

`engine.js`'s header comment documents the exact library call each metric
corresponds to. In short: smeared (Smith–Pippard) spokes, no spoke offset,
no shear-center offset, no warping stiffness, N=24 harmonic modes,
3-cross lacing (fixed), and a rim centroid radius
of `ERD/2 + 11mm` (Ford §3.2 — the beam centroid sits inboard of the
nipple seat for a double-wall MTB rim). Lateral/radial *strength* (F_lat,
F_rad — the point load at which the first spoke reaches zero pre-tension)
are **not** library outputs. They are computed with the library's
fully-discrete-spoke `ModeMatrix` (lateral and radial coupled), so each
spoke sits at its real position rather than being averaged into a smeared
web. The critical buckling tension `T_c` (and `T_safety`, `T_c_DS`) comes
from the same discrete matrices, via the library's
`calc_buckling_tension_modematrix`, so the strength figures and the
buckling limit they are checked against belong to one model. It runs 4–11%
below the smeared linear estimate across the 120 validation rows; the smeared value
is still returned as `T_c_smeared`. The stiffness outputs keep the library's
`calc_lat_stiff` / `calc_rad_stiff` smeared settings. Rim buckling under
load (taco) is returned as `F_taco`: Ford & Balogun (2017) Eq. 2,
`P = K⁰_lat · R · (1 − T/T_c)`, with `K⁰_lat` (lateral stiffness at zero
spoke tension, `K_lat0`) and `R` (`R_rim`) from the engine and `T/T_c` the
discrete `T_safety`. The paper presents it as a rough approximation of the
radial load that folds the rim, and `bike-wheel-calc` has no taco function,
so validation checks that `K_lat0` matches the library's `calc_lat_stiff`
at zero tension (8.9 × 10⁻¹⁴%) and that `F_taco` is that formula applied to
the library's own inputs; it does not check the approximation itself. There
is no sideways taco formula. Eq. 4 of the same paper (where spoke buckling
and rim buckling coincide) is not implemented; see `papers/`.

The discrete solve is 196 unknowns at N = 24, split into independent blocks
by the lacing's four-spoke symmetry. A `calc()` call takes about 3–4 ms in
Node on a server CPU, plus about 3 ms the first time a geometry is seen
(the buckling eigenproblem; `T_c` does not depend on tension, so it is
cached per geometry). Callers that sweep many builds should cache results.

## How each tool should consume this

The two tools have different build setups, so "point both tools at it"
means something slightly different for each:

- **MTB-wheel-lab** has a real build step (npm + esbuild). It should
  `import { calc }` from this repo as a build-time dependency, so the
  engine text is pulled in automatically and baked into its single
  deployed `index.html` exactly as today — no hand-copying, no drift
  possible between what's in this repo and what's deployed.
- **wheel-comparison-widget2** is a hand-authored single file with no
  build step. `js/engine.js` is written to also work as a plain,
  non-module `<script src="...">` tag with no changes required on its
  end — either loaded live from a pinned tag/commit on a file CDN, or
  copied in and refreshed whenever this repo's engine changes, backstopped
  by the CI check above catching any copy that goes stale.

Either way: **this repo's `js/engine.js` is the one to edit.** A copy of
it living inside either tool's own repo is a copy, not a second source of
truth — change it here, validate it here, then update the copy.

## Build links between the tools

`js/build-link.js` is the one place that defines how a build (two hubs,
wheel size, drive-side tension, spoke count) travels in a URL, so the
widget's "Explore why in the Lab" link and the Lab's "Quick compare" link
land on the same build. It is not physics; it only carries settings. It
keeps the hash keys the widget already used for its shareable links (`h1`,
`h2`, `w1`, `w2`, `td1`, `td2`, `ns`), so links shared before this file
existed still open. A Lab link adds the tab name first, for example
`/wheel-lab/#compare&h1=h6&h2=h7&w1=29&td1=120&ns=32`, where `h1` is the
148x12 hub and `h2` the 157x12 hub. Tension is snapped to the destination's
range: the Lab offers 80-125 kgf, the widget 95-125 kgf.

The Lab imports it at build time like `engine.js`; the widget keeps a
pasted copy, same as its engine copy. `npm test` (also run in CI) checks
the format.

## "Copy result" text

`js/share-text.js` turns a comparison the tool has already computed into a
few plain-text lines for places that show no link preview, such as a
Pinkbike comment: lateral strength (`F_lat`, kgf) and lateral stiffness
(`K_lat`, N/mm) on separate labelled lines, the build, a credit to Ford's
Mode Matrix method, and the build link. It adds no numbers of its own. A
build at or past its buckling tension gets no strength percentage. Both
tools use this one file (the Lab imports it, the widget pastes it, like
`build-link.js`) so a result reads the same whichever tool it came from.

## License

`third-party/dashdotrobot/bike-wheel-calc/` is Matthew Ford's
`bike-wheel-calc`, MIT-licensed, included unmodified as a git submodule.
`js/engine.js` is a derivative port of that same work and carries the
same MIT terms.
Everything else in this repo (validation scripts, this README) is
© PostMillennium MTB, 2026.
