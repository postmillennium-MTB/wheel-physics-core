#!/usr/bin/env python3
"""
Reference values for engine.js's per-spoke output (calc(..., {spokes: true}),
spokeTensions, firstSlackCombined), computed with Ford's bike-wheel-calc,
unmodified, from the third-party/dashdotrobot/bike-wheel-calc submodule.

Same hubs, rim constants and build setups as ../reference.py, and the same
model: ModeMatrix(N=24), K_rim(tension=True, r0=False) +
K_spk(tension=True, smeared_spokes=False).

For each build it writes:
  - every spoke's rim angle and built tension;
  - dT: each spoke's tension change per newton of point load
    (ModeMatrix.spoke_tension_change, i.e. Spoke.calc_tension_change), with
    the load at each of the first four spokes' rim points, laterally
    (f = [1, 0, 0, 0], +u) and radially (f = [0, 1, 0, 0], +v);
  - combined: first slack under a load with BOTH components applied in one
    F_ext call, f = [cos(phi), sin(phi), 0, 0], for phi = 0..180 deg in 15 deg
    steps. This checks the engine's superposition and sign conventions
    against a load the library applies directly, not against its own
    per-direction vectors.
  - between: a study, not a pass/fail check. The engine (like ../reference.py)
    only loads the rim at spoke points. Here the load point is also swept
    across one lacing period (four spoke spacings) in 32 steps, and the
    lowest first-slack load found is reported next to the spoke-point value.

Writes reference_spokes.json, which run_spokes.mjs reads.
"""
import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE.parent.parent / "third-party" / "dashdotrobot" / "bike-wheel-calc"))
from bikewheelcalc.mode_matrix import ModeMatrix
from reference import SETUPS, N_MODES, build_wheel

G = 9.81
PHIS_DEG = list(range(0, 181, 15))
N_BETWEEN = 32


def first_slack(T0, dT):
    """Smallest multiple of the applied load that brings a spoke to zero."""
    neg = dT < 0
    return np.min(T0[neg] / -dT[neg]) if neg.any() else np.inf


def main():
    catalogue = json.loads((HERE.parent / "hub_catalogue.json").read_text())
    rim_constants = catalogue["rim_constants"]
    rows = []
    for erd_mm, n_spokes, t_ds_kgf in SETUPS:
        print(f"ERD {erd_mm:.0f} mm, {n_spokes} spokes, {t_ds_kgf:.0f} kgf DS")
        for hub in catalogue["hubs"]:
            wheel = build_wheel(hub, rim_constants, erd_mm, n_spokes, t_ds_kgf)
            mm = ModeMatrix(wheel, N=N_MODES)
            K = (mm.K_rim(tension=True, r0=False) +
                 mm.K_spk(tension=True, smeared_spokes=False))
            T0 = np.array([s.tension for s in wheel.spokes])

            def dT_at(theta, f):
                return mm.spoke_tension_change(np.linalg.solve(K, mm.F_ext(theta, f)))

            load_th = [s.rim_pt[1] for s in wheel.spokes[:4]]
            dT = {"lat": [], "rad": []}
            for th in load_th:
                dT["lat"].append(dT_at(th, [1., 0., 0., 0.]).tolist())
                dT["rad"].append(dT_at(th, [0., 1., 0., 0.]).tolist())

            combined = []
            for phi in PHIS_DEG:
                f = [np.cos(np.radians(phi)), np.sin(np.radians(phi)), 0., 0.]
                scale = min(first_slack(T0, dT_at(th, f)) for th in load_th)
                combined.append({"phi_deg": phi, "scale_kgf": scale / G})

            # Load point swept across one lacing period, three directions.
            period = 4 * 2 * np.pi / n_spokes
            between = {}
            for name, f in (("rad", [0., 1., 0., 0.]), ("lat_pos", [1., 0., 0., 0.]),
                            ("lat_neg", [-1., 0., 0., 0.])):
                at_spokes = min(first_slack(T0, dT_at(th, f)) for th in load_th)
                swept = min(first_slack(T0, dT_at(load_th[0] + period * k / N_BETWEEN, f))
                            for k in range(N_BETWEEN))
                between[name] = {"spoke_points_kgf": at_spokes / G, "swept_kgf": swept / G}

            rows.append({
                "hub_name": hub["name"], "erd_mm": erd_mm, "spokes": n_spokes,
                "tDS_kgf": t_ds_kgf,
                "th": [s.rim_pt[1] for s in wheel.spokes],
                "T_kgf": (T0 / G).tolist(),
                "loadTh": load_th, "dT": dT,
                "combined": combined, "between": between,
            })
    out = HERE / "reference_spokes.json"
    out.write_text(json.dumps(rows))
    print(f"wrote {len(rows)} builds to {out}")


if __name__ == "__main__":
    main()
