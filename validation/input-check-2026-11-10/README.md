# Input check, 2026-11-10

Matthew Ford's Mode Matrix method is the math behind every number the tools
show (Ford 2018, *Reinventing the Wheel*, PhD thesis, Northwestern University).

## Why this check exists

`validation/` proves `js/engine.js` gives the same answer as Ford's
`bike-wheel-calc` for the same inputs. It does not ask where the inputs come
from. Until 2026-11-10 every check and both tools fed the engine a placeholder
rim (EI_lat 50, EI_rad 150, GJ 22 N·m², EA 11.5 MN) that is not in any of
Ford's repos and is softer laterally than any of the 11 rims he measured
(lowest 130 N·m²). It was replaced by Ford's measured DT Swiss TK540 in
core #24, Lab #35 and widget2 #21. This folder traces every other input.

## Inputs, and where each comes from

| Input | Value in the tools | Source status |
|---|---|---|
| Rim EI_lat / EI_rad / GJ | 260 / 211 / 75 N·m² | Sourced: Ford, Peng & Balogun 2018, TK540 row of the rim stiffness library. Slot mapping checked against Ford's `wheel-app/main.py` (lateral stiffness is I22, radial is I33; the engine's EIL and EIR enter the out-of-plane and in-plane terms the same way). |
| Rim EA | 7.2 MN | Derived the way Ford's wheel-app does it (E·m / (2πrρ), alloy 69 GPa, 2700 kg/m³, 550 g). The library lists no EA. Effect of 5–8 MN: under 0.7% on every output (`sensitivity.csv`). |
| Spoke Young's modulus | 210 GPa | Sourced: Ford's stainless steel preset (`helpers.py` `SPK_MATLS`). |
| Rim radius from ERD | ERD/2 + 11 mm | Sourced: Ford §3.2, as recorded in the engine header. |
| Mode count | 24 | Sourced: Ford's `SIM_OPTS_NMODES`. |
| Spoke diameter | 2.0 mm DS and NDS | A default, not a measurement. Real builds use 1.8–2.0 mm; effect in `sensitivity.csv`. |
| Spoke tension | 120 kgf DS (slider) | A user setting, not a fact about a wheel. |
| ERD by wheel size | 534 / 559 / 600 / 667 mm | **No source recorded.** Typical values for double-wall MTB rims; real ERD varies by rim model. ±5 mm moves F_lat about 1%. |
| Hub flange offsets (nds, ds) | per hub | Manufacturer document for 12 of 30 hubs (KOM, Hope, DT Swiss, DMR, OneUp, e*thirteen). **No source recorded for 18**: Onyx (3), Spank (2), CK (2), Project 321 (2), I9 (5), Hadley (2), Erase (2). |
| Hub flange diameters (pds, pnds) | per hub | Same coverage as offsets. |
| Lacing | 3-cross | Ford's `lace_cross`; matches the validation setup. |

## What an unsourced value is worth

`sensitivity.mjs` moves one input at a time around the default build (29",
28 spokes, 120 kgf, 2.0 mm spokes, TK540) for the CK 148 and CK 157 hubs.
Selected rows from `sensitivity.csv` (change in F_lat, K_lat, F_rad):

| Input change | F_lat | K_lat | F_rad |
|---|---|---|---|
| Flange offsets +1 mm each side | +3.9% / +3.1% | +5.4% / +4.8% | +1.2% / +0.9% |
| Flange offsets −1 mm each side | −3.9% / −3.2% | −5.3% / −4.7% | −1.3% / −0.9% |
| ERD ±5 mm | ∓1.1% | ∓2.6% | ∓0.3% |
| Flange diameter ±3 mm | under 0.1% | ±0.2% | under 0.1% |
| Spokes 1.8 mm instead of 2.0 | +2.2% | −17% | +5% |
| 32 spokes instead of 28 | +11% | +15% | +8% |
| Rim EI_lat 130 instead of 260 | −14% to −15% | −14% | +2% to +3% |
| Rim EA 5–8 MN | within 0.2% | 0.0% | within 0.6% |

(First figure CK 148, second CK 157, where two are shown.)

## Findings

1. The rim was the only input that was wrong by a large factor. Everything
   else above is either sourced, derived from Ford's own conventions, or a
   user-set default.
2. Flange offsets are the input that matters most and that lacks a source for
   18 of 30 hubs. A 1 mm error moves F_lat 3–4%. A 148-vs-157 gap of 19–25%
   is much larger than that, but hub-to-hub rankings among near neighbours
   could change. Each of those 18 hubs needs its manufacturer document, or a
   caliper measurement, recorded.
3. ERD and flange diameter are minor (about 1% and under 0.1% on F_lat).
4. Spoke diameter changes stiffness (K_lat) far more than strength (F_lat),
   which is the stiffness-versus-strength point the tools exist to make.

## Not checked

The manufacturer documents themselves were not re-read in this check; it
records which hubs have one. No hub dimension was measured.

Re-run: `node sensitivity.mjs > sensitivity.csv`
