# Papers

Matthew Ford's published research on bicycle wheel mechanics. All author
credit belongs to him and his co-authors — see each entry below.

| File | Citation |
|---|---|
| [`ford-2018-a-theoretical-analysis-of-the-bicycle-wheel.pdf`](./ford-2018-a-theoretical-analysis-of-the-bicycle-wheel.pdf) | Ford, M.T. (2018). *A Theoretical Analysis of the Bicycle Wheel.* PhD thesis, Northwestern University. The primary source — every other paper here is a conference/journal excerpt of a chapter of this. Full LaTeX source, chapter-by-chapter, is also in `third-party/dashdotrobot/phd-thesis`. |
| [`ford-zhang-balogun-2016-buckling-and-collapse-abstract.pdf`](./ford-zhang-balogun-2016-buckling-and-collapse-abstract.pdf) | Ford, M., Zhang, L., Balogun, O. (2016). "Buckling and Collapse of the Bicycle Wheel." *XXIV ICTAM (International Congress of Theoretical and Applied Mechanics)*, Montreal. 2-page extended abstract. |
| [`ford-papadopoulos-balogun-2016-buckling-of-the-bicycle-wheel.pdf`](./ford-papadopoulos-balogun-2016-buckling-of-the-bicycle-wheel.pdf) | Ford, M., Papadopoulos, J.M., Balogun, O. (2016). "Buckling of the Bicycle Wheel." *Proceedings, Bicycle and Motorcycle Dynamics 2016 Symposium*, Milwaukee, WI. Companion paper/code to `third-party/dashdotrobot/bmd2016`. |
| [`ford-balogun-2017-radial-strength-and-collapse.pdf`](./ford-balogun-2017-radial-strength-and-collapse.pdf) | Ford, M., Balogun, O. (2017). "Analytical Model for the Radial Strength and Collapse of the Bicycle Wheel." *6th International Cycling Safety Conference*, Davis, CA. CC BY 4.0. |
| [`ford-papadopoulos-balogun-2017-radial-collapse-slides.pdf`](./ford-papadopoulos-balogun-2017-radial-collapse-slides.pdf) | Ford, M., Papadopoulos, J.M., Balogun, O. (2017). "Radial collapse of the bicycle wheel: Experiments and theory." Conference slide deck, 6th International Cycling Safety Conference, Davis, CA — companion presentation to the paper above. |
| [`ford-peng-balogun-2018-acoustic-modal-testing.pdf`](./ford-peng-balogun-2018-acoustic-modal-testing.pdf) | Ford, M., Peng, P., Balogun, O. (2018). "Acoustic Modal Testing of Bicycle Rims." *Journal of Nondestructive Evaluation*, 37(2). [DOI: 10.1007/s10921-018-0471-7](https://doi.org/10.1007/s10921-018-0471-7) |

## The thesis

`ford-2018-a-theoretical-analysis-of-the-bicycle-wheel.pdf` is the
dissertation the Mode Matrix method (this engine's basis, see the main
README's "Whose math this is") and all three papers below come from. If a
number or an assumption in `js/engine.js` needs tracing back to first
principles rather than to a paper's condensed version of it, this is the
document to check first — it's the only one with the full derivation
chain, not just the publishable excerpt.

## What's in the buckling and radial-strength papers, briefly

These derive the theory that `wheel-physics-core`'s buckling-tension and
strength calculations are built on:

- **"Buckling and Collapse of the Bicycle Wheel" (2016 ICTAM abstract)** —
  a 2-page extended abstract distinguishing two related failure modes:
  elastic buckling under uniform spoke tension alone, vs. dynamic collapse
  when the wheel is loaded through the hub (the more realistic loading
  case, validated with non-linear FE). Its headline finding — raising
  spoke tension raises the failure load *except* when tension is already
  close to the buckling threshold, where the wheel becomes unstable to
  even a small disturbance — is the qualitative reason this analysis
  treats build tension as a beta with a clear upper bound (see
  `tension_kgf` in `MTB-wheel-lab`'s regression) rather than "more is
  strictly better."
- **"Buckling of the Bicycle Wheel" (2016)** derives the formula for the
  maximum spoke tension a wheel can withstand before the rim buckles
  laterally ("tacos"): `T_cr = 2*R*K_t / (n_s*(n^2 - R/l_s))`, where `K_t`
  is a combined bending/torsion/spoke-stiffness mode stiffness, `n_s` is
  spoke count, and `n >= 2` is the buckling mode number — this is the
  theoretical basis for `wheel-physics-core`'s critical buckling tension
  output. Companion code lives in `third-party/dashdotrobot/bmd2016`.
- **"Analytical Model for the Radial Strength and Collapse" (2017)**
  analyzes the *other* failure mode — spokes going slack under radial
  load, rather than the rim buckling — and combines both failure modes
  into a single tension-independent wheel-strength expression. This is
  the direct theoretical ancestor of `F_lat`/`F_rad` (first-spoke-slack
  strength) as computed in `js/engine.js` and used throughout
  `MTB-wheel-lab`'s regression analysis. The companion slide deck
  (`ford-papadopoulos-balogun-2017-radial-collapse-slides.pdf`) is a
  faster way into the intuition — FEA plots of the spoke-buckling/collapse
  boundary and the rim-buckling load ratio — before reading the full
  derivation.

## What's in the acoustic-testing paper, briefly

Measures a rim's radial bending stiffness (`EI11`) and lateral-torsional
stiffness (`GJ`, coupled with `EI22` via `mu = GJ/EI22`) by suspending the
bare rim from a string, striking it with a rubber-wrapped screwdriver
handle (once on the inner circumference for radial modes, once on the
sidewall for lateral-torsional modes), and recording the ringing with a
phone's built-in microphone. Peaks in the FFT spectrum are matched to known
mode-frequency equations (Eqns. 1-2 in the paper) to solve for stiffness,
given the rim's known mass and radius.

Reported accuracy vs. a direct mechanical test (diametral compression for
`EI11`, four-point bending for `GJ`): **`EI11` within 8%, `GJ` within
11%**. Tested on 7 real, named rims — the same 7 (Alex ALX-295, DT Swiss
R460, both Sun-Ringle CR18 sizes, Alex X404, both Alex Y2000 sizes) whose
resulting `EIrad`/`EIlat`/`GJ` values appear as the hardcoded preset table
in `third-party/dashdotrobot/wheel-app/wheel-app/helpers.py` — meaning that
table is this paper's actual peer-reviewed, dual-validated (acoustic +
mechanical) result set, not app-default guesses. See
`MTB-wheel-lab`'s `analysis/wheel-strength-regression/README.md` for how
that table is used (as a reference/calibration point, not joined into the
regression — all 7 are narrow road/hybrid rims, not the wide tubeless MTB
rims in that catalogue).

## Adding more papers

This folder is Ford's own published work specifically — a paper by anyone
else, however relevant, goes in the sibling `literature/` folder instead
(same convention, own README), so this folder's author stays unambiguous
at a glance.

Drop the PDF here, named `<first-author>-<year>-<short-slug>.pdf`, and add
a row to the table above with the full citation. If it's a paywalled
journal article, prefer the author's own self-archived manuscript (as
above — Ford hosts this exact file himself at
[dashdotrobot.com/pdfs/JNDE_2018_manuscript.pdf](https://dashdotrobot.com/pdfs/JNDE_2018_manuscript.pdf))
over a publisher PDF, and note in the table if it's a preprint/manuscript
version that differs from the final published typesetting.
