# validation/

Every check here compares `js/engine.js`, or the two tools built on it,
with Matthew Ford's own code (`third-party/dashdotrobot/bike-wheel-calc`,
Ford 2018, *Reinventing the Wheel*, PhD thesis, Northwestern University),
or traces what is fed into it. The physics is Ford's.

Two kinds of question get mixed up, so each check names its type:

- **Formulas:** do the engine and Ford's code give the same answer for the
  same inputs? This says nothing about whether the inputs are right.
- **Inputs:** where does each number fed in come from? (The placeholder rim
  used until 2026-11-10 passed every formulas check.)

A **tool accuracy** check is a formulas check run on the tools' own builds.

## Index

| Check | Date | Type | Verdict |
|---|---|---|---|
| Core check: `reference.py` + `run.mjs`, baselines `validation_baseline_*.csv` (see the main README's Validation section; also `npm test`) | per baseline, latest 2026-11-10 | Formulas | Pass: 120 hub-setup rows, worst 1.8e-10% (discrete T_c) |
| [`spokes/`](spokes/) | 2026-11-10 baseline | Formulas | Pass |
| [`insights/`](insights/) | 2026-11-06 | Formulas | Pass: 1,740 comparisons, worst 2.1e-11% |
| [`tool-check-2026-10-24/`](tool-check-2026-10-24/) | 2026-10-24 | Tool accuracy | Pass on 380 builds; page issues listed |
| [`29in-hub-check-2026-10-24/`](29in-hub-check-2026-10-24/) | 2026-10-24 | Tool accuracy | Pass: 900/900 builds |
| [`strength/`](strength/) | 2026-10-24 | Strength model | Pass vs Ford; discrete vs smeared differences documented |
| [`input-check-2026-11-10/`](input-check-2026-11-10/) | 2026-11-10 | Inputs | Rim was the only large error (fixed); ERD unsourced |

The two 2026-10-24 tool checks and `strength/` ran on the placeholder rim
(50 / 150 / 22 N·m²); their pass/fail results hold, their absolute strength
numbers do not describe a real rim.

## Format for a new check

Folder name `<what>-check-<date>/` (or `<what>/` for a standing check), with
a `README.md` in this order:

1. `# <Title>, <date>`, then one paragraph crediting Ford's method.
2. `## At a glance`: a table with Question, Type (Formulas, Inputs, Tool
   accuracy, Strength model), Rim used, Engine commit, Ford's code commit,
   Verdict, Re-run.
3. `## Versions tested`, `## Method`, `## Results` (tables, pass rule
   stated), `## Not covered`.
4. Scripts and dated CSVs next to the README; rename a CSV with a new date
   rather than overwriting it.

Add a row to the index above.
