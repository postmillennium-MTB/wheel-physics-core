# Wheel simulator check, 2026-11-11

Compares `js/engine.js` with Matthew Ford's public wheel simulator at
bicyclewheel.info/wheel-simulator, which runs his Bike Wheel API (a wrapper
around his bike-wheel-calc; Ford 2018, *Reinventing the Wheel*, PhD thesis,
Northwestern University). The physics is Ford's; this folder records whether
the engine reproduces what his live tool shows.

## At a glance

| | |
|---|---|
| Question | Does the engine reproduce the numbers Ford's live simulator gives for the same wheel? |
| Type | Tool accuracy against Ford's published tool (formulas and inputs both entered by hand) |
| Rim used | Measured DT Swiss TK540 as typed into the simulator: 560 g, radial 210, lateral 260, torsional 75 N·m² (library values: 550 g, radial 211) |
| Engine | `js/engine.js` at 9824061 |
| Ford's code | bike-wheel-calc 6fc380c; bike-wheel-api b3d0ffd (both submodules here) |
| Verdict | Match on lateral stiffness (0.01%), torsional stiffness (0.13%) and maximum average tension (identical) once the rim radius is the simulator's 306 mm. Radial stiffness differs 2.3% (definition). Strength figures are different quantities. |
| Re-run | See "Re-running" |

## Inputs

One run by hand on 2026-11-11 (Jon), screenshots of the inputs kept in the
thread: 29"/700C (622), alloy rim 560 g, radial 210 / lateral 260 /
torsional 75 N·m²; hub flange distance left 38, right 21 mm (non-drive,
drive), flange diameter 56 mm; 36 steel spokes, 3-cross, 2.0 mm, 100 kgf on
the drive side, non-drive side "same as drive-side". The DMR Zone 148 hub.
The DMR Zone 157 (41 / 25 mm) is computed here but has not been run in the
simulator yet.

## What the simulator calls

`bike-wheel-api/bikewheelapi.py` calls `calc_rad_stiff`, `calc_lat_stiff`
and `calc_tor_stiff` with library defaults (N = 20 modes, smeared spokes,
radial and torsional with radial-tangential coupling on, lateral with it
off) and `calc_buckling_tension(approx='linear')`. The page's "Maximum
average tension" is that smeared linear result. The core's `T_c_smeared` is
the same quantity.

## Results, DMR Zone 148

| Output | Simulator (read off the page) | Ford's library, simulator settings, rim radius 306 mm | Engine, ERD 590 (rim radius 306 mm) | Engine, ERD 605, the tools' 29" value (rim radius 313.5 mm) |
|---|---|---|---|---|
| Non-drive-side tension (kgf) | 56 | 55.6 | 55.6 | 55.6 |
| Lateral stiffness (N/mm) | 150.3 | 150.30 | 150.29 | 138.7 |
| Torsional stiffness (N/deg) | 3286 | 3285.6 | 3290.4 | 3155 |
| Maximum average tension (kgf) | 335 | 334.79 | 334.79 | 318.5 |
| Radial stiffness (N/mm) | 5645 | 5644.8 | 5774 | 5566 |
| Lateral force to buckle spokes (kgf) | 34.8 | not computed by the library | 34.1 (first spoke slack) | 33.1 |
| Radial force to buckle spokes (kgf) | 155.1 | not computed by the library | 165.5 (first spoke slack) | 163.5 |

`ford_lib_R306.json` and `engine_erd590.json` hold the full output for the
DMR Zone 148 and 157.

## Findings

1. **The simulator's wheel has a rim radius of 306 mm; the tools' 29" rim
   has 313.5 mm.** With 306 mm, Ford's library run with the API's settings
   reproduces every stiffness and tension figure on the page to the printed
   digits. The tools use ERD 605 mm for 29" (a published rim spec, see the
   main README), which gives 313.5 mm (ERD/2 + 11 mm); entering ERD 590
   gives 306 mm. (When this check was run the tools used ERD 600, 311 mm.)
   The 7.5 mm radius difference alone moves lateral stiffness about 8% and
   maximum average tension about 5%. Why the simulator uses 306 mm for a 622
   rim is not stated on its instructions page; the API takes the radius as
   an input and its source was read, but the web client's was not.
2. **At the same radius the engine matches the simulator** on lateral
   stiffness (150.29 vs 150.30), torsional stiffness (0.13% apart, from 24
   vs 20 modes) and maximum average tension (identical to 7 digits).
3. **Radial stiffness is 2.3% apart because of a setting, not an error.**
   The simulator uses the library default, which includes radial-tangential
   coupling; the core reports radial stiffness with that coupling off
   (`reference.py`, `K_rad`). Which to show is a choice, noted for Jon.
4. **"Force to buckle spokes" is not computed by the library.** The page
   says only "the maximum force that can be applied before the first spoke
   buckles", with no formula. Ford's older wheel-app prints a one-spoke
   linear estimate; the engine computes exact first spoke slack from the
   full model. At the matched radius the engine's lateral figure is 2%
   below the simulator's and its radial figure 6% above. The simulator's
   formula was not found, so those two rows are a comparison of different
   calculations.
5. **The 148 vs 157 pair.** Ford's library at the simulator's settings gives
   the 157 a lateral stiffness of 177.3 vs 150.3 N/mm (+18%); the engine's
   first-slack lateral strength gives +19% (40.7 vs 34.1 kgf). The
   simulator's own DMR Zone 157 numbers are still to be read.

## Not covered

- One hub run by hand; no grid of builds.
- The simulator's strength formula, and the simulator version (the instructions
  page gives none).
- Hub and rim inputs are not traced here (see `../input-check-2026-11-10/`).

## Re-running

```bash
cd validation/simulator-check-2026-11-11
python3 -I simulator_equiv.py ../../third-party/dashdotrobot/bike-wheel-calc 306
node engine_equiv.mjs 590
```

Needs the `bike-wheel-calc` submodule and numpy and scipy.
