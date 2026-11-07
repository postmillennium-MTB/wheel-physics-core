#!/usr/bin/env python3
"""
Reference values for the four "Insights" outputs, computed with Matthew
Ford's bike-wheel-calc (third-party/dashdotrobot/bike-wheel-calc, pinned
6fc380c), on the same wheels as ../reference.py (build_wheel is imported
from there, so the hubs, rim constants and spokes are identical).

1. K_tor  -- wind-up (torsional) stiffness, Ford's theory.calc_tor_stiff
             with the same settings as K_rad in reference.py (N=24,
             smeared_spokes=True, tension=True, buckling=True,
             coupling=False, r0=False). Ford's function returns R/w for a
             unit tangential load at the rim [N/rad]; multiplying by R gives
             torque per radian of rim rotation relative to the hub [N*m/rad].
             Thesis: stress-analysis chapter, "Loading case II: tangential
             point load".

2. n_SP   -- number of spokes inside the affected length of a point load
             (Ford thesis, spoke_stiffness.tex, after Hetenyi 1946):
                 n_SP = Ns/(pi*R) * (4*EI/k)^(1/4)
             radial: EI = EI_rad, k = k_vv (smeared spoke stiffness);
             lateral: EI = EI_lat * mu/(mu+1) with mu = GJ/EI_lat and
             k = k_uu, the combined bending/twist stiffness Ford uses in
             calc_Pn_lat. Equivalent to 2*calc_Pn_rad and 8*calc_Pn_lat.
             bike-wheel-calc 6fc380c calls calc_continuum_stiff in those
             functions without defining it; in Ford's thesis code it is the
             smeared stiffness sum(s.calc_k())/(2*pi*R), which is
             BicycleWheel.calc_kbar(tension=True). It is supplied here.

3. K_lat sweep -- theory.calc_lat_stiff (reference.py settings) at drive-side
             tensions 0, 10, ... kgf, for the tension-softening chart (Ford
             thesis, "Lateral stiffness vs. spoke tension").

4. T_c per mode n = 2..6 -- the smeared, linear-approximation critical
             tension for each mode, the per-mode expression inside
             theory.calc_buckling_tension(approx='linear') (calc_Tc_mode_lin),
             reproduced line for line because the library only returns the
             minimum. Ford, Papadopoulos & Balogun (2016).
"""
import csv
import json
import sys
from pathlib import Path

import numpy as np
from numpy import pi

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent))
sys.path.insert(0, str(ROOT.parent.parent / "third-party" / "dashdotrobot" / "bike-wheel-calc"))
import bikewheelcalc.theory as theory  # noqa: E402
from bikewheelcalc.theory import calc_lat_stiff, calc_tor_stiff, calc_buckling_tension  # noqa: E402
from reference import build_wheel  # noqa: E402

N_MODES = 24
SETUPS = [(600.0, 28, 120.0), (600.0, 32, 100.0)]
SWEEP = list(range(0, 201, 10))  # DS tension, kgf
MODES = [2, 3, 4, 5, 6]

# Missing helper in bike-wheel-calc 6fc380c (see docstring).
theory.calc_continuum_stiff = lambda wheel: wheel.calc_kbar(tension=True)


def tc_modes(wheel):
    """calc_Tc_mode_lin from theory.calc_buckling_tension, per mode [N, average tension]."""
    ns = len(wheel.spokes)
    R = wheel.rim.radius
    EI = wheel.rim.young_mod * wheel.rim.I_lat
    EIw = wheel.rim.young_mod * wheel.rim.I_warp
    GJ = wheel.rim.shear_mod * wheel.rim.J_tor
    kbar = wheel.calc_kbar(tension=False)
    kuu, kup, kpp = (kbar[0, 0], kbar[0, 3], kbar[3, 3])
    kT = (2*pi*R/ns)*wheel.calc_kbar_geom()[0, 0]

    def lin(n):
        mu = (GJ + EIw*n**2/R**2)/EI
        luu, lup, lpp = (R**4/EI) * np.array([kuu, kup, kpp])
        t_c = (luu +
               (mu*n**2*(n**2-1)**2 + (n**4+mu*n**2)*lpp
                + 2*n**2*(mu+1)*lup - lup**2)/(1+mu*n**2+lpp))
        return 2*pi*EI/(ns*R**2) * t_c/(n**2 - R*kT)
    return {n: lin(n) for n in MODES}


def main():
    cat = json.loads((ROOT.parent / "hub_catalogue.json").read_text())
    rc = cat["rim_constants"]
    rows, sweep_rows = [], []
    for erd, ns, tds in SETUPS:
        for hub in cat["hubs"]:
            w = build_wheel(hub, rc, erd, ns, tds)
            R = w.rim.radius
            T_avg = sum(s.tension * s.n[1] for s in w.spokes) / len(w.spokes)
            K_tor = calc_tor_stiff(w, N=N_MODES, smeared_spokes=True, tension=True,
                                   buckling=True, coupling=False, r0=False) * R
            n_sp_rad = 2 * theory.calc_Pn_rad(w)
            n_sp_lat = 8 * theory.calc_Pn_lat(w)
            T_c_s, n_c = calc_buckling_tension(w, approx="linear", N=N_MODES)
            tcm = tc_modes(w)
            assert abs(min(tcm.values()) - T_c_s) / T_c_s < 1e-12 or n_c > max(MODES)
            row = {"hub_name": hub["name"], "std": hub["std"], "erd_mm": erd, "spokes": ns,
                   "tDS_kgf": tds, "K_tor_Nm_per_deg": K_tor * pi / 180,
                   "n_sp_rad": n_sp_rad, "n_sp_lat": n_sp_lat, "n_c": n_c}
            # per-mode critical tension as equivalent drive-side tension [kgf]
            for n in MODES:
                row[f"Tc_n{n}_DS_kgf"] = tcm[n] * (tds * 9.81 / T_avg) / 9.81
            rows.append(row)
            for t in SWEEP:
                if t == 0:
                    ws = build_wheel(hub, rc, erd, ns, 1e-9)
                else:
                    ws = build_wheel(hub, rc, erd, ns, float(t))
                k = calc_lat_stiff(ws, N=N_MODES, smeared_spokes=True, tension=True,
                                   buckling=True, coupling=False, r0=False)
                sweep_rows.append({"hub_name": hub["name"], "erd_mm": erd, "spokes": ns,
                                   "tDS_kgf": t, "K_lat_Nmm": k / 1000})
            print(f"{erd:.0f} {ns} {tds:.0f}  {hub['name']:34s} K_tor={row['K_tor_Nm_per_deg']:8.2f} N*m/deg  "
                  f"nSP rad={n_sp_rad:5.2f} lat={n_sp_lat:5.2f}  n_c={n_c}")
    for name, data in [("reference_insights.csv", rows), ("reference_klat_sweep.csv", sweep_rows)]:
        with (ROOT / name).open("w", newline="") as f:
            wr = csv.DictWriter(f, fieldnames=list(data[0].keys()))
            wr.writeheader()
            wr.writerows(data)
    print(f"wrote {len(rows)} + {len(sweep_rows)} rows")


if __name__ == "__main__":
    main()
