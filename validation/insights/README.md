# Insights validation

## At a glance

| | |
|---|---|
| Question | Do the four outputs behind the Lab's INSIGHTS tab (K_tor, nSP, K_lat vs tension, per-mode T_c) match Ford's code? |
| Type | Formulas (engine vs Ford, same inputs on both sides) |
| Rim used | Measured DT Swiss TK540 (260 / 211 / 75 N·m², EA 7.2 MN) since 2026-11-10; the 2026-11-06 run used the placeholder 50/150/22 |
| Engine | `js/engine.js`, current `main` |
| Ford's code | bike-wheel-calc 6fc380c |
| Verdict | Pass: 1,740 comparisons, worst difference 2.1e-11% (2026-11-06 run) |
| Re-run | `cd validation/insights && python3 reference_insights.py && node run_insights.mjs` |

Checks four outputs that the Wheel Strength Lab's INSIGHTS tab shows. Each
one comes from Matthew Ford's work (thesis, Northwestern 2018, and his
bike-wheel-calc library) or from a classic result he cites.

| Engine output | What it is | Source | Ford's code |
|---|---|---|---|
| `K_tor` [N·m/deg] | Wind-up stiffness: torque per degree of rim rotation relative to the hub (braking, pedalling) | Ford thesis, stress-analysis chapter, "Loading case II: tangential point load" | `theory.calc_tor_stiff` (× R) |
| `nSP_rad`, `nSP_lat` | Spokes inside the affected length of a point load, n_SP = Ns/(πR)·(4EI/k)^¼ | Ford thesis, `spoke_stiffness.tex`, after Hetényi (1946), *Beams on Elastic Foundation*; the smeared-spoke idea is Smith (1901) and Pippard & Francis (1931) | `2·calc_Pn_rad`, `8·calc_Pn_lat` |
| `K_lat` across tension | Lateral stiffness vs. spoke tension (tension softening) | Ford thesis, "Lateral stiffness vs. spoke tension" | `theory.calc_lat_stiff` |
| `T_c_modes` | Smeared critical tension for each buckling shape n = 2..6 | Ford, Papadopoulos & Balogun (2016), "Buckling of the Bicycle Wheel" | per-mode term inside `theory.calc_buckling_tension(approx='linear')` |

`reference_insights.py` computes the reference values with bike-wheel-calc;
`run_insights.mjs` runs `js/engine.js` on the same wheels and fails on any
difference above 1e-9 %. Result on 2026-11-06: 1,740 comparisons (30 hubs ×
two builds, plus a 0–200 kgf K_lat sweep), worst difference 2.1e-11 %.

Two notes on the library:

- bike-wheel-calc 6fc380c calls `calc_continuum_stiff` inside `calc_Pn_lat` /
  `calc_Pn_rad` but never defines it. In Ford's thesis code it is the smeared
  spoke stiffness, the same as `BicycleWheel.calc_kbar(tension=True)`, so the
  reference script supplies that.
- The library returns only the lowest buckling tension, so the per-mode
  expression (`calc_Tc_mode_lin`) is reproduced line for line in the
  reference script. Its minimum is asserted equal to the library's result.

The lowest per-mode value is the smeared-spoke buckling tension
(`T_c_smeared`). The tools' headline buckling tension `T_c` uses Ford's
discrete-spoke Mode Matrix, which runs 4–11% lower; the per-mode bars show
which shape is preferred, not the headline limit.
