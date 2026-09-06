# Credits

Everything in this repository that touches the actual physics of a spoked
wheel — the Mode Matrix method, the reference implementation, the acoustic
rim-testing technique, the interactive apps built on top of it — is
**Matthew Ford's work**, not this project's. This repo's own contribution
is limited to: porting his validated method to JavaScript (`js/engine.js`,
checked continuously against his Python for agreement, see the main
README's "Validation" section), archiving his other wheel-related repos
and papers for reference (this file and the two directories below), and
the hub/rim catalogues and regression analyses layered on top in the
sibling `MTB-wheel-lab` and `wheel-comparison-widget2` repos.

- **Matthew Ford, PhD** — Northwestern University (Mechanical Engineering),
  now at University of Washington Tacoma. Author of the Mode Matrix method,
  `bike-wheel-calc`, the acoustic rim-testing method, and every repository
  and paper referenced below.
  [github.com/dashdotrobot](https://github.com/dashdotrobot) ·
  [dashdotrobot.com](https://dashdotrobot.com)

## Vendored source (already in this repo, unchanged)

- `python/bikewheelcalc/` + `python/LICENSE` — Ford's `bike-wheel-calc`,
  MIT-licensed, copied verbatim at commit
  [`6fc380c`](https://github.com/dashdotrobot/bike-wheel-calc/commit/6fc380c3576307d825d24fdffbbcbc192a720300).
  See the main README for how it's used (validation ground truth for
  `js/engine.js`).

## Archived repos (`third-party/dashdotrobot/`)

Added as git submodules — each one points at Ford's own repo and commit,
so `git log` inside any of them shows his real authorship, not a copy
that's been re-attributed. `git submodule update --init --recursive`
after cloning to pull them in.

| Submodule | What it is | License |
|---|---|---|
| `bike-wheel-api` | RESTful service for wheel deformation/tension calculations | **none declared** |
| `wheel-app` | Bokeh GUI for the wheel calculator — source of the 7-rim stiffness preset table cited in `MTB-wheel-lab`'s regression README | GPLv3 |
| `wheel-app-js` | HTML/JS front-end for `wheel-app`'s API | **none declared** |
| `rim-testing` | Derivation notebooks + Monte Carlo error analysis for the four-point-bend rim test | **none declared** |
| `bmd2016` | Paper + code, "Buckling of the Bicycle Wheel," Bicycle and Motorcycle Dynamics Symposium 2016 | **none declared** |
| `phd-thesis` | Full PhD dissertation + all supporting code, data, and figures | **none declared** |

`bike-wheel-calc` itself is **not** re-added as a submodule here — it's
already vendored directly into `python/bikewheelcalc/` (see above), so a
submodule pointing at the same repo would just be a redundant second copy.

**License note:** four of these six repos declare no license at all,
meaning GitHub's default (all rights reserved, viewable but not
redistributable without permission) technically applies. They're linked
here as submodules — a pointer to Ford's own public repo, not a copy of
his content living inside this one — which is a much lower bar than
vendoring, but if any of that code ever gets *used* (built, imported,
shipped) rather than just archived for reference, get his explicit
sign-off first rather than assuming the personal relationship implies a
license.

## Papers (`papers/`)

Self-archived author manuscripts, added at the user's request with Ford's
knowledge. See `papers/README.md` for the full list and how to add more.
