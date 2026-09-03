# wheel-physics-core

The shared, validated wheel-strength physics engine behind
[MTB-wheel-lab](https://github.com/postmillennium-MTB/MTB-wheel-lab) and
[wheel-comparison-widget2](https://github.com/postmillennium-MTB/wheel-comparison-widget2).

**This repo exists so those two tools compute the same numbers from the
same math, provably, on every change — not because someone remembered to
check.** Before this repo existed, each tool carried its own hand-written
JavaScript translation of the underlying method, and they had quietly
drifted apart: for the same hub and the same inputs, one tool's lateral
stiffness figure was reading roughly 90% higher than the other's, and
neither tool's own repo had anything checking for that. See "Why this repo
exists" below for the specifics.

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

1. **Vendors his Python source unmodified** (`python/bikewheelcalc/`),
   pinned to commit [`6fc380c`](https://github.com/dashdotrobot/bike-wheel-calc/commit/6fc380c3576307d825d24fdffbbcbc192a720300)
   (2019-01-31 — the repository has had no further commits since, so this
   is not a moving target). His `LICENSE` file is carried over unchanged
   at `python/LICENSE`.
2. **Provides a JavaScript port** (`js/engine.js`) of the specific
   functions both tools need, written to be checked against his Python
   continuously (see Validation below) rather than trusted by eye.

Any error in the JavaScript port is this repo's, not his. If you spot one,
it reflects on this port, not on the thesis or the original library.

---

## What's in this repo

```
python/bikewheelcalc/     Ford's library, vendored verbatim, MIT-licensed
python/LICENSE            His unmodified license file
js/engine.js              THE canonical JS engine both tools should consume
validation/reference.py   Computes ground-truth values via the vendored Python
validation/run.mjs        Runs engine.js on the same inputs, diffs, PASS/FAIL
validation/hub_catalogue.json   The hub geometries used as the test matrix
validation/validation_baseline_*.csv   Dated results of each validation run
.github/workflows/validate.yml   Runs the validation on every push, automatically
```

## Validation

`js/engine.js` is checked against the real Python library — not eyeballed,
not trusted from a past run — using the full 25-hub catalogue both tools
draw from. Each run computes every metric (tension ratio, lateral
stiffness, radial stiffness, critical buckling tension) two ways — once
via `theory.calc_lat_stiff()` / `calc_rad_stiff()` / `calc_buckling_tension()`
in the vendored Python, once via `engine.js` — and fails loudly if they
disagree by more than floating-point noise.

**Current result: all 25 hubs pass, worst-case difference 1.11 × 10⁻¹³%.**
See `validation/validation_baseline_2026-09-03.csv` for the full row-by-row
comparison.

This runs automatically on every push via GitHub Actions
(`.github/workflows/validate.yml`) — not as a manual step someone has to
remember. That automation is the actual fix for the drift problem this
repo exists to solve: a hand-run check only catches drift if someone
happens to run it; a check that runs on every commit catches it every
time, whether anyone asks or not.

**Re-running it yourself:**
```bash
cd validation
pip install numpy scipy
python3 reference.py   # writes reference.csv from the vendored Python library
node run.mjs            # runs engine.js, diffs against reference.csv, writes a dated baseline
```

## Model settings

`engine.js`'s header comment documents the exact library call each metric
corresponds to. In short: smeared (Smith–Pippard) spokes, no spoke offset,
no shear-center offset, no warping stiffness, N=24 harmonic modes, linear
buckling approximation, 3-cross lacing (fixed), and a rim centroid radius
of `ERD/2 + 11mm` (Ford §3.2 — the beam centroid sits inboard of the
nipple seat for a double-wall MTB rim). Lateral/radial *strength* (F_lat,
F_rad — the load at which the first spoke reaches zero pre-tension) are
**not** library outputs; they're a first-order linear extension built on
top of the validated stiffnesses, documented at the point they're computed
in `engine.js`.

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

## License

`python/bikewheelcalc/` and `python/LICENSE` are Matthew Ford's
`bike-wheel-calc`, MIT-licensed, copied unmodified. `js/engine.js` is a
derivative port of that same work and carries the same MIT terms.
Everything else in this repo (validation scripts, this README) is
© PostMillennium MTB, 2026.
