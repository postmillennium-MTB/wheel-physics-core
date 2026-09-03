#!/usr/bin/env python3
"""
Computes the reference (ground-truth) values for every hub in
hub_catalogue.json, using the unmodified, vendored dashdotrobot library
(python/bikewheelcalc/) with the exact settings js/engine.js documents
itself as matching:

    ratio  <- BicycleWheel.apply_tension(T_right=T_DS)
    K_lat  <- theory.calc_lat_stiff(N=24, smeared_spokes=True, tension=True,
                                     buckling=True, coupling=False, r0=False)
    K_rad  <- theory.calc_rad_stiff(same settings)
    T_c    <- theory.calc_buckling_tension(approx='linear', N=24)

Writes reference.csv, one row per hub. run.mjs then runs js/engine.js on the
same inputs and diffs the two.

Standard build conditions (matching wheel-comparison-widget2's established
baseline, so results are comparable to its own prior validation runs):
  29" wheel (ERD 600mm), 32 spokes, 2.0mm straight-gauge, 100kgf DS tension.
"""
import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "python"))
from bikewheelcalc import BicycleWheel, Rim, Hub
from bikewheelcalc.theory import calc_lat_stiff, calc_rad_stiff, calc_buckling_tension

ERD_MM = 600.0
SPOKES = 32
SPOKE_DIA_MM = 2.0
SPOKE_E = 210e9
T_DS_KGF = 100.0
N_MODES = 24


def build_wheel(hub, rim_constants):
    R = ERD_MM / 2 / 1000 + 0.011  # rim centroid radius, matches engine.js
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
    wheel.lace_cross(n_spokes=SPOKES, n_cross=3, diameter=SPOKE_DIA_MM / 1000, young_mod=SPOKE_E)
    wheel.apply_tension(T_right=T_DS_KGF * 9.81)
    return wheel


def main():
    root = Path(__file__).resolve().parent
    catalogue = json.loads((root / "hub_catalogue.json").read_text())
    rim_constants = catalogue["rim_constants"]

    rows = []
    for hub in catalogue["hubs"]:
        wheel = build_wheel(hub, rim_constants)

        s0, s1 = wheel.spokes[0], wheel.spokes[1]
        ratio = abs(s1.n[0]) / abs(s0.n[0]) if abs(s0.n[0]) > abs(s1.n[0]) else abs(s0.n[0]) / abs(s1.n[0])
        # apply_tension already enforces T_l/T_r via the same ratio; read it
        # back directly off the built wheel rather than re-deriving it.
        t_ds = max(wheel.spokes[0].tension, wheel.spokes[1].tension)
        t_nds = min(wheel.spokes[0].tension, wheel.spokes[1].tension)
        ratio_pct = 100.0 * t_nds / t_ds

        K_lat = calc_lat_stiff(wheel, N=N_MODES, smeared_spokes=True, tension=True,
                                buckling=True, coupling=False, r0=False)
        K_rad = calc_rad_stiff(wheel, N=N_MODES, smeared_spokes=True, tension=True,
                                buckling=True, coupling=False, r0=False)
        T_c, n_c = calc_buckling_tension(wheel, approx="linear", N=N_MODES)

        rows.append({
            "hub_name": hub["name"],
            "std": hub["std"],
            "ds_mm": hub["ds"], "nds_mm": hub["nds"],
            "pds_mm": hub["pds"], "pnds_mm": hub["pnds"],
            "ratio_pct": ratio_pct,
            "K_lat_Nmm": K_lat / 1000.0,
            "K_rad_Nmm": K_rad / 1000.0,
            "T_c_kgf": T_c / 9.81,
            "n_c": n_c,
        })
        print(f"  {hub['name']:32s} ratio={ratio_pct:7.4f}%  K_lat={K_lat/1000:9.4f} N/mm  "
              f"K_rad={K_rad/1000:9.4f} N/mm  T_c={T_c/9.81:8.4f} kgf")

    out = root / "reference.csv"
    with out.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    print(f"\nwrote {len(rows)} rows to {out}")


if __name__ == "__main__":
    main()
