# Papers

Matthew Ford's published research on bicycle wheel mechanics. All author
credit belongs to him and his co-authors — see each entry below.

| File | Citation |
|---|---|
| [`ford-peng-balogun-2018-acoustic-modal-testing.pdf`](./ford-peng-balogun-2018-acoustic-modal-testing.pdf) | Ford, M., Peng, P., Balogun, O. (2018). "Acoustic Modal Testing of Bicycle Rims." *Journal of Nondestructive Evaluation*, 37(2). [DOI: 10.1007/s10921-018-0471-7](https://doi.org/10.1007/s10921-018-0471-7) |

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

Drop the PDF here, named `<first-author>-<year>-<short-slug>.pdf`, and add
a row to the table above with the full citation. If it's a paywalled
journal article, prefer the author's own self-archived manuscript (as
above — Ford hosts this exact file himself at
[dashdotrobot.com/pdfs/JNDE_2018_manuscript.pdf](https://dashdotrobot.com/pdfs/JNDE_2018_manuscript.pdf))
over a publisher PDF, and note in the table if it's a preprint/manuscript
version that differs from the final published typesetting.
