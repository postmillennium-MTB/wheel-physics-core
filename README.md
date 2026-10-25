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

> Ford, M.T. (2018). *A Theoretical Analysis of the Bicycle Wheel.*
> PhD thesis, Northwestern University.

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
test/build-link.test.js   Tests for that link format (npm test)
validation/reference.py   Computes ground-truth values via bike-wheel-calc
validation/run.mjs        Runs engine.js on the same inputs, diffs, PASS/FAIL
validation/hub_catalogue.json   The hub geometries used as the test matrix
validation/validation_baseline_*.csv   Dated results of each validation run
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
within 3.2 × 10⁻¹³%, except discrete `T_c` at 9 × 10⁻¹⁰%: the library function
solves that eigenproblem with scipy's general `eig()`, which scatters by
that much from a symmetric solver (`eigh`) on the same matrices, and
`engine.js` agrees with `eigh` to about 10⁻¹²%. `run.mjs` allows 10⁻⁷% for
that one metric. See `validation/validation_baseline_2026-10-24.csv` for the
full row-by-row comparison.

This runs automatically on every push via GitHub Actions
(`.github/workflows/validate.yml`) — not as a manual step someone has to
remember. That automation is the actual fix for the drift problem this
repo exists to solve: a hand-run check only catches drift if someone
happens to run it; a check that runs on every commit catches it every
time, whether anyone asks or not.

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
load (taco) is not yet modelled; see Ford & Balogun (2017) in `papers/`.

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

## License

`third-party/dashdotrobot/bike-wheel-calc/` is Matthew Ford's
`bike-wheel-calc`, MIT-licensed, included unmodified as a git submodule.
`js/engine.js` is a derivative port of that same work and carries the
same MIT terms.
Everything else in this repo (validation scripts, this README) is
© PostMillennium MTB, 2026.
