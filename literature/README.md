# Literature

Wheel-mechanics academic papers by authors other than Matthew Ford. Kept
separate from `papers/` on purpose — that folder is specifically Ford's own
work (the source of this engine's method), and mixing other authors in
would blur that at a glance. See `papers/README.md` for his papers and
`CREDITS.md` for the full attribution picture.

| File | Citation |
|---|---|
| [`minguez-vogwell-2008-analytical-model-radial-stiffness.pdf`](./minguez-vogwell-2008-analytical-model-radial-stiffness.pdf) | Mínguez, J.M., Vogwell, J. (2008). "An analytical model to study the radial stiffness and spoke load distribution in a modern racing bicycle wheel." *Proceedings of the Institution of Mechanical Engineers, Part C: Journal of Mechanical Engineering Science*, 222(4), pp. 563-576. [DOI: 10.1243/09544062JMES802](https://doi.org/10.1243/09544062jmes802). Self-archived via University of Bath's Opus repository. |

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
