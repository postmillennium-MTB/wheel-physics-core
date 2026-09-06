# Literature

Wheel-mechanics academic papers by authors other than Matthew Ford. Kept
separate from `papers/` on purpose — that folder is specifically Ford's own
work (the source of this engine's method), and mixing other authors in
would blur that at a glance. See `papers/README.md` for his papers and
`CREDITS.md` for the full attribution picture.

| File | Citation |
|---|---|
| [`gavin-1996-spoke-patterns-and-spoke-fatigue.pdf`](./gavin-1996-spoke-patterns-and-spoke-fatigue.pdf) | Gavin, H.P. (1996). "Bicycle-Wheel Spoke Patterns and Spoke Fatigue." *ASCE Journal of Engineering Mechanics*, 122(8), pp. 736-742. |
| [`minguez-vogwell-2008-analytical-model-radial-stiffness.pdf`](./minguez-vogwell-2008-analytical-model-radial-stiffness.pdf) | Mínguez, J.M., Vogwell, J. (2008). "An analytical model to study the radial stiffness and spoke load distribution in a modern racing bicycle wheel." *Proceedings of the Institution of Mechanical Engineers, Part C: Journal of Mechanical Engineering Science*, 222(4), pp. 563-576. [DOI: 10.1243/09544062JMES802](https://doi.org/10.1243/09544062jmes802). Self-archived via University of Bath's Opus repository. |

## Books (no PDF hosted)

| Citation | Why it's here without a file |
|---|---|
| Brandt, J. (1981). *The Bicycle Wheel.* Avocet, Inc. | The foundational practical/engineering text modern wheel theory builds on — Ford's thesis and papers cite it, and it's the common reference wheelbuilders and researchers both work from. Commercially published and still in print, so no PDF is hosted here; cite it by name when its framing (spoke tension, "stress-relieving," radial elasticity) is the actual source of an assumption. |

## What's in the Gavin paper, briefly

Strain-gauge instrumented three rear wheels with different spoke lacing
patterns (radial, cross patterns) and measured spoke strain under both
lab radial loads and actual road riding. Models the wheel as a circular
beam on a prestressed elastic foundation (the interlaced spokes smeared
into a continuous radial stiffness) — a precursor to the "smeared spoke"
treatment `wheel-physics-core` also uses (see the main README's "Model
settings": Smith-Pippard smeared spokes). Headline finding: **spoke
lacing pattern has little effect on spoke strain or fatigue life** under
radial load — the pattern matters much less than commonly assumed for
this failure mode. Cited as prior work ("Gavin [9]") in Ford's 2018
acoustic-testing paper regarding the coupling between a rim's out-of-plane
bending and torsional stiffness.

## What's in the Mínguez & Vogwell paper, briefly

An independent analytical treatment of radial stiffness and spoke-load
distribution, considering spoke pretension's effect on load distribution
and strength — a different derivation path than Ford's Mode Matrix method,
worth having as a cross-check on the radial-stiffness side rather than
taking Ford's approach as the only treatment in the literature. Not yet
compared line-by-line against `js/engine.js`'s radial-stiffness output —
if that comparison gets done, record the result here.

## Adding more

Same convention as `papers/`: `<first-author>-<year>-<slug>.pdf`, plus a
citation row and a short summary above. If a paper here ends up directly
relevant to a specific assumption or beta in `MTB-wheel-lab`'s regression
or `js/engine.js`'s model, cite it there too rather than leaving it only
listed here unreferenced.
