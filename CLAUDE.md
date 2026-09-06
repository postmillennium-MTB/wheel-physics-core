# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

## What this repo is

The shared, validated wheel-strength physics engine behind `MTB-wheel-lab`
and `wheel-comparison-widget2`. It implements Matthew Ford's **Mode
Matrix method** for bicycle wheel stress analysis (PhD thesis,
Northwestern, 2018). Read `README.md` first — it covers whose math this
is, what's vendored vs. ported, and how the two consuming tools should use
`js/engine.js`. Read `CREDITS.md` for the full attribution picture.

```
vendor/bike-wheel-calc/    Ford's bike-wheel-calc, vendored verbatim, MIT
js/engine.js              THE canonical JS engine — edit here, not in a copy
validation/                Checks engine.js against the vendored Python
papers/                    Ford's own published papers (his work, cited)
literature/                Wheel-mechanics papers by other authors
third-party/dashdotrobot/  Ford's other repos, archived as git submodules
CREDITS.md                 Full attribution + per-submodule license status
```

## Before touching wheel strength or stiffness calculations

**Check `papers/` and `literature/` first.** Both folders have a
`README.md` that maps each paper to the specific formula, assumption, or
engine output it underlies — not just a citation list. Before adding,
changing, or explaining any strength/stiffness calculation in this repo
(or in `MTB-wheel-lab`'s regression that consumes it), check whether an
existing paper already answers or bears on the question:

- **A formula or constant needs justifying or tracing to first
  principles** → check `papers/README.md`'s summaries first (each one
  names the specific engine output — buckling tension, `F_lat`/`F_rad`,
  rim stiffness — it's the theoretical source for), then the full PDF, then
  `third-party/dashdotrobot/phd-thesis`'s LaTeX source for the complete
  derivation chain if the paper's condensed version isn't enough.
- **A new beta, assumption, or model extension is being considered** (in
  this repo or in `MTB-wheel-lab`'s regression) → check whether it's
  already been treated in the literature, and whether that treatment
  agrees or disagrees with what this engine currently assumes. Ford's own
  papers get first read (they're this engine's actual theoretical basis);
  `literature/`'s other-author papers are independent cross-checks worth
  citing when they corroborate, contradict, or add nuance Ford's papers
  don't cover — e.g. Gavin (1996) on smeared-spoke lacing-pattern
  insensitivity, or Mínguez & Vogwell (2008)'s independent radial-
  stiffness derivation.
- **Something in `js/engine.js` or the regression looks like it needs a
  real citation instead of "this seemed reasonable"** → that's the
  signal to open the relevant paper rather than reason from first
  principles alone or guess at a rule of thumb. This repo's own
  `rim_stiffness_index` estimate (documented in `MTB-wheel-lab`'s
  regression README) is the example of what NOT to leave uncited when a
  real source could instead be found, checked, and referenced.

**Never fabricate a citation or a number attributed to a paper.** If a
claim can't be traced to a specific page/equation in one of the archived
PDFs or the vendored/submoduled code, say so explicitly rather than
presenting it as sourced. This mirrors the sourcing discipline already
used throughout `MTB-wheel-lab`'s regression README (verified vs.
estimated vs. derived, tiered honestly).

## Adding a new paper

Two folders, kept deliberately separate so authorship stays unambiguous
at a glance — don't merge them:

- `papers/` — **Matthew Ford's own work only.**
- `literature/` — wheel-mechanics papers by anyone else.

Convention for both: `<first-author>-<year>-<short-slug>.pdf`, plus a row
in that folder's citation table and a short "what's in it, briefly"
paragraph tying the paper to a specific formula, beta, or assumption it's
relevant to — not just a bare citation. See either README for the
established format before adding a new entry. If a paper turns out
relevant to something in `MTB-wheel-lab`'s regression or `js/engine.js`,
cross-reference it there too rather than leaving it only listed here.

## Working with `third-party/dashdotrobot/`

Six of Ford's other repos are archived there as git submodules (not
copies) for native reference — running his actual apps/notebooks/tests
rather than everyone re-cloning them separately. `bike-wheel-calc` is
**not** among them; it's already vendored directly in
`vendor/bike-wheel-calc/`, so don't re-add it as a submodule (redundant
second copy of the same repo).

Four of the six submodules declare no license at all (see `CREDITS.md`'s
table). They're fine to read, run locally, and cite for reference — get
Ford's explicit sign-off before *using* any of their code (building,
importing, shipping) rather than assuming the archival relationship
implies a license.

## Validation discipline

`js/engine.js` must keep agreeing with the vendored Python
(`vendor/bike-wheel-calc/bikewheelcalc/`) to floating-point precision — see `README.md`'s
"Validation" section and `.github/workflows/validate.yml`. Any change to
`engine.js` should be re-validated (`cd validation && python3 reference.py
&& node run.mjs`) before committing, not just eyeballed.

## Tone

Keep documentation direct and factual. Explain *why* a design choice was
made, not just what it is — but skip editorializing or self-congratulation
in README/doc prose (e.g., don't frame automated checks as compensating
for human carelessness). State results and limitations plainly.
