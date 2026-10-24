#!/usr/bin/env python3
"""
Computes the reference (ground-truth) values for every hub in
hub_catalogue.json, using Ford's own bike-wheel-calc library, unmodified,
via the third-party/dashdotrobot/bike-wheel-calc git submodule (pinned to
commit 6fc380c), with the exact settings js/engine.js documents itself
as matching:

    ratio  <- BicycleWheel.apply_tension(T_right=T_DS)
    K_lat  <- theory.calc_lat_stiff(N=24, smeared_spokes=True, tension=True,
                                     buckling=True, coupling=False, r0=False)
    K_rad  <- theory.calc_rad_stiff(same settings)
    T_c    <- theory.calc_buckling_tension_modematrix(N=24, smeared_spokes=False,
                                                       coupling=True, r0=False)
    T_c_smeared <- theory.calc_buckling_tension(approx='linear', N=24)
    F_lat, F_rad <- first spoke slack under a unit point load, from
                    ModeMatrix (fully-discrete spokes, coupled, tension=True,
                    r0=False, N=24) and Spoke.calc_tension_change; the load
                    is applied at each of the first four spokes, laterally
                    or radially, in both directions, and the smallest load
                    that brings any spoke to zero tension is the strength.
                    bike-wheel-calc has no strength function, so this is
                    built from its own routines rather than called.

Writes reference.csv, one row per hub per build setup. run.mjs then runs js/engine.js on the
same inputs and diffs the two.

Build setups (2.0mm straight-gauge spokes throughout):
  29" (ERD 600), 32 spokes, 100 kgf DS -- wheel-comparison-widget2's original baseline
  29" (ERD 600), 28 spokes, 120 kgf DS -- MTB-wheel-lab's default build
  26" (ERD 534), 32 spokes, 120 kgf DS
  32" (ERD 667), 32 spokes, 100 kgf DS
"""
import csv
import json
import sys

import numpy as np
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "third-party" / "dashdotrobot" / "bike-wheel-calc"))
from bikewheelcalc import BicycleWheel, Rim, Hub
from bikewheelcalc.theory import (calc_lat_stiff, calc_rad_stiff, calc_buckling_tension,
                                  calc_buckling_tension_modematrix)
from bikewheelcalc.mode_matrix import ModeMatrix

SETUPS = [  # (ERD mm, spoke count, DS tension kgf)
    (600.0, 32, 100.0),
    (600.0, 28, 120.0),
    (534.0, 32, 120.0),
    (667.0, 32, 100.0),
]
SPOKE_DIA_MM = 2.0
SPOKE_E = 210e9
N_MODES = 24


def build_wheel(hub, rim_constants, erd_mm, n_spokes, t_ds_kgf):
    R = erd_mm / 2 / 1000 + 0.011  # rim centroid radius, matches engine.js
    E, G = 69e9, 26e9              # arbitrary split; only E*I / G*J products matter
    rim = Rim.general(
        radius=R,
        area=rim_constants["EA_rim"] / E,
        I_rad=rim_constants["EIR"] / E,
        I_lat=rim_constants["EIL"] / E,
        J_tor=rim_constants["GJ"] / G,
        I_warp=0.0,
        young_mod=E,
        shear_mod=G,
    )
    wheel = BicycleWheel()
    wheel.rim = rim
    wheel.hub = Hub(
        diameter_nds=hub["pnds"] / 1000,
        diameter_ds=hub["pds"] / 1000,
        width_nds=hub["nds"] / 1000,
        width_ds=hub["ds"] / 1000,
    )
    wheel.lace_cross(n_spokes=n_spokes, n_cross=3, diameter=SPOKE_DIA_MM / 1000, young_mod=SPOKE_E)
    wheel.apply_tension(T_right=t_ds_kgf * 9.81)
    return wheel


def first_slack(wheel, mm, K, comp):
    """Smallest point load [N] that brings any spoke to zero tension.

    Unit load at each of the first four spokes' rim points (one lacing
    period: NDS/DS, leading/trailing), in direction comp (0 = lateral,
    1 = radial), both signs. Spoke tension change per newton comes from
    ModeMatrix.spoke_tension_change, i.e. Spoke.calc_tension_change."""
    T0 = np.array([s.tension for s in wheel.spokes])
    best = np.inf
    for s in wheel.spokes[:4]:
        f = [0., 0., 0., 0.]
        f[comp] = 1.
        d = np.linalg.solve(K, mm.F_ext(s.rim_pt[1], f))
        dT = mm.spoke_tension_change(d)
        nz = dT != 0
        best = min(best, np.min(T0[nz] / np.abs(dT[nz])))  # either load sign
    return best


def main():
    root = Path(__file__).resolve().parent
    catalogue = json.loads((root / "hub_catalogue.json").read_text())
    rim_constants = catalogue["rim_constants"]

    rows = []
    for erd_mm, n_spokes, t_ds_kgf in SETUPS:
        print(f"ERD {erd_mm:.0f} mm, {n_spokes} spokes, {t_ds_kgf:.0f} kgf DS")
        for hub in catalogue["hubs"]:
            wheel = build_wheel(hub, rim_constants, erd_mm, n_spokes, t_ds_kgf)

            # apply_tension already enforces T_l/T_r; read it back directly
            # off the built wheel rather than re-deriving it.
            t_ds = max(wheel.spokes[0].tension, wheel.spokes[1].tension)
            t_nds = min(wheel.spokes[0].tension, wheel.spokes[1].tension)
            ratio_pct = 100.0 * t_nds / t_ds

            K_lat = calc_lat_stiff(wheel, N=N_MODES, smeared_spokes=True, tension=True,
                                    buckling=True, coupling=False, r0=False)
            K_rad = calc_rad_stiff(wheel, N=N_MODES, smeared_spokes=True, tension=True,
                                    buckling=True, coupling=False, r0=False)
            T_c_smeared, n_c = calc_buckling_tension(wheel, approx="linear", N=N_MODES)
            T_c = calc_buckling_tension_modematrix(wheel, smeared_spokes=False, coupling=True,
                                                   r0=False, N=N_MODES)

            mm = ModeMatrix(wheel, N=N_MODES)
            K = (mm.K_rim(tension=True, r0=False) +
                 mm.K_spk(tension=True, smeared_spokes=False))
            F_lat = first_slack(wheel, mm, K, 0)
            F_rad = first_slack(wheel, mm, K, 1)

            rows.append({
                "hub_name": hub["name"],
                "std": hub["std"],
                "erd_mm": erd_mm, "spokes": n_spokes, "tDS_kgf": t_ds_kgf,
                "ds_mm": hub["ds"], "nds_mm": hub["nds"],
                "pds_mm": hub["pds"], "pnds_mm": hub["pnds"],
                "ratio_pct": ratio_pct,
                "K_lat_Nmm": K_lat / 1000.0,
                "K_rad_Nmm": K_rad / 1000.0,
                "T_c_kgf": T_c / 9.81,
                "T_c_smeared_kgf": T_c_smeared / 9.81,
                "n_c": n_c,
                "F_lat_kgf": F_lat / 9.81,
                "F_rad_kgf": F_rad / 9.81,
            })
            print(f"  {hub['name']:32s} ratio={ratio_pct:7.4f}%  K_lat={K_lat/1000:9.4f} N/mm  "
                  f"T_c={T_c/9.81:8.4f} kgf  F_lat={F_lat/9.81:7.3f} kgf  F_rad={F_rad/9.81:8.3f} kgf")

    out = root / "reference.csv"
    with out.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    print(f"\nwrote {len(rows)} rows to {out}")


if __name__ == "__main__":
    main()
