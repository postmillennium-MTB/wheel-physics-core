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

## Archived repos (`third-party/dashdotrobot/`)

Every one of Ford's other wheel-related repos lives here, with no
exception — including `bike-wheel-calc`, the one this engine is actually
built from and continuously validated against. Kept here so
wheel-strength-related tools in this org have Ford's actual apps,
notebooks, and derivations on hand to run and test against natively,
rather than everyone re-finding and re-cloning his repos individually.
Added as git submodules, not copies — each one points at Ford's own repo
and commit, so `git log` inside any of them shows his real authorship, not
a copy that's been re-attributed. `git submodule update --init --recursive`
after cloning to pull them all in.

| Submodule | What it is | License |
|---|---|---|
| `bike-wheel-calc` | The reference implementation of the Mode Matrix method this engine is ported from and validated against (see main README) — the one submodule here that's also a build/validation dependency, not just archived reference | MIT |
| `bike-wheel-api` | RESTful service for wheel deformation/tension calculations | **none declared** |
| `wheel-app` | Bokeh GUI for the wheel calculator — source of the 7-rim stiffness preset table cited in `MTB-wheel-lab`'s regression README | GPLv3 |
| `wheel-app-js` | HTML/JS front-end for `wheel-app`'s API | **none declared** |
| `rim-testing` | Derivation notebooks + Monte Carlo error analysis for the four-point-bend rim test | **none declared** |
| `bmd2016` | Paper + code, "Buckling of the Bicycle Wheel," Bicycle and Motorcycle Dynamics Symposium 2016 | **none declared** |
| `phd-thesis` | Full PhD dissertation + all supporting code, data, and figures | **none declared** |

**License note:** four of these seven repos declare no license at all,
meaning GitHub's default (all rights reserved, viewable but not
redistributable without permission) technically applies. They're linked
here as submodules — a pointer to Ford's own public repo, not a copy of
his content living inside this one — which is a much lower bar than
vendoring a copy would be, but if any of that code ever gets *used*
(built, imported, shipped) rather than just archived for reference, get
his explicit sign-off first rather than assuming the personal relationship
implies a license. `bike-wheel-calc` is the one exception in practice —
it's MIT-licensed and already the actual dependency `js/engine.js` is
validated against.

## Papers (`papers/`)

Self-archived author manuscripts, added at the user's request with Ford's
knowledge. See `papers/README.md` for the full list and how to add more.

## Literature (`literature/`)

Wheel-mechanics papers by authors other than Ford, kept in a separate
folder specifically so `papers/` stays unambiguously his. See
`literature/README.md` for the full list.

`literature/bike-tech-archive/` is a complete 24-issue run (1982 pilot
issue through Winter 1986) of *Bike Tech*, Rodale Press's technical
newsletter — scanned and hosted by
[bulgier.net](http://bulgier.net/pics/bike/Articles/Bike_Tech/), mirrored
here for durability. Includes Price & Akers (1985), "Stiffness
Characteristics of Bicycle Wheels," a paper widely cited elsewhere in this
repo's literature but previously unavailable as a PDF anywhere online.
See `bike-tech-archive/README.md` for the full issue index.
