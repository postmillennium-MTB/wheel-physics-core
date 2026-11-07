# Literature

Wheel-mechanics academic papers by authors other than Matthew Ford. Kept
separate from `papers/` on purpose — that folder is specifically Ford's own
work (the source of this engine's method), and mixing other authors in
would blur that at a glance. See `papers/README.md` for his papers and
`CREDITS.md` for the full attribution picture.

| File | Citation |
|---|---|
| [`brandt-1981-the-bicycle-wheel.pdf`](./brandt-1981-the-bicycle-wheel.pdf) | Brandt, J. (1981). *The Bicycle Wheel.* Avocet, Inc. Book, not a peer-reviewed paper — see the copyright note below. |
| [`gavin-1996-spoke-patterns-and-spoke-fatigue.pdf`](./gavin-1996-spoke-patterns-and-spoke-fatigue.pdf) | Gavin, H.P. (1996). "Bicycle-Wheel Spoke Patterns and Spoke Fatigue." *ASCE Journal of Engineering Mechanics*, 122(8), pp. 736-742. |
| [`minguez-vogwell-2008-analytical-model-radial-stiffness.pdf`](./minguez-vogwell-2008-analytical-model-radial-stiffness.pdf) | Mínguez, J.M., Vogwell, J. (2008). "An analytical model to study the radial stiffness and spoke load distribution in a modern racing bicycle wheel." *Proceedings of the Institution of Mechanical Engineers, Part C: Journal of Mechanical Engineering Science*, 222(4), pp. 563-576. [DOI: 10.1243/09544062JMES802](https://doi.org/10.1243/09544062jmes802). Self-archived via University of Bath's Opus repository. |
| [`bike-tech-archive/bike-tech-v4n3-jun1985.pdf`](./bike-tech-archive/bike-tech-v4n3-jun1985.pdf) | Price, D., Akers, A. (1985). "Stiffness Characteristics of Bicycle Wheels." *Bike Tech*, 4(3), pp. 1-7, Rodale Press, Emmaus, PA. Widely cited (e.g. by Gavin 1996 above) but had no PDF anywhere online until this archive — see `bike-tech-archive/README.md` for the full periodical run it came from. |
| [`bike-tech-archive/bike-tech-v3n4-aug1984.pdf`](./bike-tech-archive/bike-tech-v3n4-aug1984.pdf) | Allen, J.S. (1984). "A Musical Test for Correct Spoke Tension." *Bike Tech*, 3(4), Aug. 1984, Rodale Press. Inside the archived issue. |

## Copyright note on the Brandt book

Unlike the self-archived academic PDFs above (author manuscripts the
authors themselves distribute freely), *The Bicycle Wheel* is a
commercially published, still-in-print book with no author-granted
self-archiving permission. It's kept here because it's the foundational
practical/engineering text modern wheel theory builds on — Ford's own
thesis and papers cite it, and it's the common reference wheelbuilders and
researchers both work from — but its copyright status is materially
different from everything else in this repo. Treat it as internal
reference only, not something to link publicly or redistribute outside
this org.

## What's in the Brandt book, briefly

The practitioner's counterpart to the academic papers here: tension
symmetry, "stress-relieving" a new build, radial elasticity from a
wheelbuilder's rather than a theorist's perspective, spoke pattern and
lacing practice. Where a paper's formula needs grounding in *why* a
wheelbuilder does something a certain way (rather than just what the math
says), this is the reference — Ford's own thesis treats it as the
starting practical framing his theoretical work formalizes.

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

## What's in the Price & Akers paper, briefly

Built five otherwise-identical rear wheels (36h Normandy hi-flange hubs,
DT 15-gauge/1.8mm straight-gauge spokes, AVA aluminum 700c tubular rims,
~420g, all standardized to 136 lb/605N spoke tension) differing only in
lacing pattern — radial, 1-cross, 2-cross, 3-cross, 4-cross — and measured
torsional and lateral/radial stiffness on an MTS electro-hydraulic test
machine at Iowa State University. Per the authors: results "generally
confirm some long-standing articles of faith of the wheelbuilding trade"
but "raise certain questions about wheel stiffness that builders should
know about." Also directly compares their measured values against the
calculated predictions in two contemporary wheelbuilding books — worth
reading for anyone using this repo's rim/spoke betas who wants a second,
independently-measured (not modeled) stiffness dataset from a different
lacing-pattern angle than Gavin (1996) above.

Its torsional measurements are the measured counterpart to the engine's
wind-up stiffness, `K_tor` (Ford's `theory.calc_tor_stiff`), which the
Lab's TORSION tab shows. They have not been compared with `K_tor`: the
test wheels (36 spokes, 700c tubular rim, five lacing patterns) differ from
the engine's fixed 3-cross MTB setup, so any comparison would have to
rebuild those wheels in the engine first. If that is done, record the
result here.

## What's in the Allen article, briefly

John S. Allen treats a plucked spoke as a string: its pitch depends on the
stress in the spoke, not its gauge, so a pitch pipe can check tension. His
Table 1 gives the measured pitch for each spoke length at one stress. The
Lab's INSIGHTS tab uses that table for its spoke-pitch chart and keyboard.
It is not part of `js/engine.js`; the engine supplies only the drive- and
non-drive-side tensions the chart turns into notes.

## Cited by the tools, no PDF here

The Wheel Strength Lab's INSIGHTS tab and ISO notes cite these. They are
not archived (books, a 1901 proceedings paper, a paid standard), so they
are listed here to keep the attribution in one place. The citations below
are copied from the Lab's INSIGHTS tab; they have not been re-checked
against the originals.

| Citation | Where it is used |
|---|---|
| Smith, B.A. (1901). "The Bicycle Wheel." *Report of the Meeting of the Australasian Association for the Advancement of Science*, 8, pp. 197–203. | Origin of the smeared-spoke idea Ford's stiffness formulas use; INSIGHTS "spokes sharing a hit" chart |
| Pippard, A.J.S., Francis, W.E. (1931). "On a Theoretical and Experimental Investigation of the Stresses in a Radially Spoked Wire Wheel under Loads Applied to the Rim." *Philosophical Magazine*, 11(69), pp. 233–285. [DOI: 10.1080/14786443109461681](https://doi.org/10.1080/14786443109461681) | Same (the "Smith–Pippard" smeared-spoke approximation) |
| Hetényi, M. (1946). *Beams on Elastic Foundation.* University of Michigan Press. | Deflection shape and affected length behind `nSP_rad` / `nSP_lat` |
| ISO 4210-7:2023, *Cycles — Safety requirements for bicycles — Part 7: Wheels and rims test methods*, §4.2 static strength test. | Text notes under the lateral-strength charts in both tools. The ISO test checks for permanent bending; `F_lat` (first spoke slack) is an earlier, elastic limit, so the two are not the same threshold |

## Adding more

Same convention as `papers/`: `<first-author>-<year>-<slug>.pdf`, plus a
citation row and a short summary above. If a paper here ends up directly
relevant to a specific assumption or beta in `MTB-wheel-lab`'s regression
or `js/engine.js`'s model, cite it there too rather than leaving it only
listed here unreferenced.
