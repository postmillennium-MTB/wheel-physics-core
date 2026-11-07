# 29" per-hub accuracy check, 2026-10-24

Checks the strength calculations of both live wheel tools, hub by hub, at
29" against Matthew Ford's own Python (`third-party/dashdotrobot/bike-wheel-calc`,
MIT), the reference implementation of his Mode Matrix method (PhD thesis,
Northwestern, 2018). The physics is Ford's; this folder records whether the
tools reproduce it.

## Versions tested

- Wheel Strength Lab: MTB-wheel-lab `main` 816d702; its engine is this
  repo's `js/engine.js` (byte-identical).
- 148 vs 157 widget: wheel-comparison-widget2 `main` 48262b8; its engine
  block is a copy of `js/engine.js`, differing only in comments.
- Both tools list the same 30 hubs (15 Boost 148, 15 Super Boost 157) with
  identical names and flange geometry, extracted with
  `../strength/extract_tool_hubs.mjs`.

## Builds

900 = 30 hubs x 28/32/36 spokes x drive-side tension 80-125 kgf in 5 kgf
steps (the Lab's slider; the widget offers 95-125). 29" = 600 mm ERD in both
tools. 2.0 mm spokes both sides, 3-cross, stock rim constants
(EI_lat 50, EI_rad 150, GJ 22 N m^2; EA 11.5 MN).

## Method

```
node make_cases_29.mjs <widget hub_catalogue.json> cases.json
for k in 0..7: python3 -I ford_cases.py <bike-wheel-calc> cases.json ford_$k.json $k 8
LAB_PHYSICS=<Lab src/physics.js> WIDGET_ENGINE=<widget engine.cjs> node compare_29.mjs
```

Pass rule is the same as `../run.mjs`: every output within 1e-9% of Ford,
1e-7% for T_c (Ford's buckling routine uses scipy `eig()`, which scatters
about 1e-9% from a symmetric solver).

## Result

900/900 builds pass in both tools. Worst difference from Ford, percent:
tension ratio 6.7e-14, K_lat 2.6e-13, K_rad 1.3e-13, T_c 8.9e-10,
F_lat 2.4e-13, F_rad 4.4e-13.

One build is past buckling: KOM Xeno Rear Boost 148x12, 36 spokes,
125 kgf (100.2% of T_c). Its numbers still match Ford's; his model treats
the wheel as unstable there.

Per hub (strength values are Ford's at 32 spokes, 120 kgf; errors are the
worst over that hub's 30 builds, both tools):

| Hub | Axle | F_lat kgf | F_rad kgf | T_c kgf | Worst F_lat/F_rad diff % | Worst T_c diff % | Pass |
| --- | --- | --- | --- | --- | --- | --- | --- |
| h10 Hydra Mountain 6-Bolt 148 | 148 | 23.87 | 221.3 | 152.2 | 4e-13 | 3e-11 | 30/30 |
| h5 Spank Hex J-Type Boost R148 | 148 | 23.82 | 225.4 | 149.7 | 2e-13 | 2e-11 | 30/30 |
| h17 Erase MTB IS 148x12 V2 | 148 | 23.76 | 221.6 | 151.3 | 4e-13 | 2e-11 | 30/30 |
| h12 I9 Hydra Centerlock 148 | 148 | 22.73 | 211.6 | 151.4 | 2e-13 | 1e-11 | 30/30 |
| h6 CK 148x12 Centerlock Rear | 148 | 22.40 | 223.5 | 144.9 | 3e-13 | 1e-10 | 30/30 |
| h28 DT Swiss 350 148 6-bolt | 148 | 21.55 | 218.6 | 143.7 | 3e-13 | 4e-11 | 30/30 |
| h14 I9 1/1 Mountain 6-Bolt 148 | 148 | 21.40 | 214.4 | 144.3 | 2e-13 | 9e-10 | 30/30 |
| h21 OneUp Rear Hub 148x12 | 148 | 21.30 | 211.0 | 145.8 | 4e-13 | 2e-11 | 30/30 |
| h20 Hadley 148x12 | 148 | 21.25 | 213.4 | 143.8 | 3e-13 | 6e-12 | 30/30 |
| h1 Onyx 148 MFU | 148 | 21.09 | 215.1 | 142.8 | 3e-13 | 2e-11 | 30/30 |
| h15 Hope Pro5 148 6-bolt | 148 | 20.53 | 221.6 | 138.2 | 3e-13 | 7e-12 | 30/30 |
| h30 e*thirteen Sidekick 148 Boost | 148 | 19.25 | 198.4 | 142.0 | 4e-13 | 2e-11 | 30/30 |
| h27 DMR Zone 148 Boost Centerlock | 148 | 19.18 | 198.7 | 141.5 | 3e-13 | 3e-11 | 30/30 |
| h23 KOM Xeno Rear Boost 148x12 | 148 | 18.72 | 256.5 | 128.4 | 3e-13 | 5e-12 | 30/30 (1 past buckling) |
| h8 Project 321 G3 148x12 | 148 | 18.72 | 235.2 | 129.5 | 3e-13 | 7e-12 | 30/30 |
| h4 Spank Hex J-Type R150/157 | 157 | 29.65 | 238.4 | 169.2 | 2e-13 | 1e-11 | 30/30 |
| h18 Erase MTB IS 157x12 V2 | 157 | 29.42 | 227.4 | 176.7 | 4e-13 | 4e-12 | 30/30 |
| h11 I9 Hydra 6-Bolt 150/157 | 157 | 28.93 | 230.3 | 171.9 | 3e-13 | 1e-11 | 30/30 |
| h7 CK 157 SB Centerlock Rear | 157 | 28.63 | 232.1 | 169.0 | 4e-13 | 2e-11 | 30/30 |
| h13 I9 Hydra Centerlock 157 SB | 157 | 27.60 | 217.9 | 173.9 | 3e-13 | 1e-11 | 30/30 |
| h29 DT Swiss 350 157 6-bolt | 157 | 27.37 | 225.1 | 168.5 | 3e-13 | 5e-11 | 30/30 |
| h19 Hadley 150/157 | 157 | 27.02 | 220.9 | 169.0 | 2e-13 | 9e-11 | 30/30 |
| h2 Onyx 150/157 | 157 | 26.75 | 221.4 | 167.0 | 3e-13 | 4e-12 | 30/30 |
| h24 KOM Xeno Rear Super Boost 157 | 157 | 26.53 | 252.7 | 150.4 | 2e-13 | 1e-11 | 30/30 |
| h16 Hope Pro5 157 SB 6-bolt | 157 | 26.39 | 225.5 | 161.9 | 4e-13 | 1e-11 | 30/30 |
| h3 Onyx 150/157 Vesper | 157 | 26.18 | 218.9 | 164.9 | 3e-13 | 6e-11 | 30/30 |
| h31 e*thirteen Sidekick Pro 157 SB | 157 | 24.58 | 207.0 | 166.2 | 4e-13 | 3e-11 | 30/30 |
| h22 OneUp Rear Hub 157x12 | 157 | 24.23 | 241.8 | 145.8 | 4e-13 | 2e-11 | 30/30 |
| h26 DMR Zone 157 SB Centerlock | 157 | 23.94 | 209.8 | 160.0 | 4e-13 | 4e-11 | 30/30 |
| h9 Project 321 G3 157 SB | 157 | 23.67 | 260.6 | 140.4 | 3e-13 | 2e-11 | 30/30 |

Files: `accuracy_29in_builds.csv` (one row per build: Ford, Lab and widget
values plus max difference per output), `accuracy_29in_by_hub.csv` (the
table above, unrounded).
