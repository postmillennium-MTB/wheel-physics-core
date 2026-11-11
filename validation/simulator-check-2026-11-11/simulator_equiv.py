"""Ford's bike-wheel-calc run the way the bicyclewheel.info wheel simulator's
API runs it (third-party/dashdotrobot/bike-wheel-api/bikewheelapi.py):
calc_rad_stiff / calc_lat_stiff / calc_tor_stiff with library defaults (N=20
modes, smeared spokes, coupling per function default) and
calc_buckling_tension(approx='linear'). Rim centroid radius is an input
(the simulator's value is found by fit, see README).

Usage: python3 -I simulator_equiv.py <path to bike-wheel-calc> <rim_radius_mm>
"""
import sys, json, warnings
import numpy as np
warnings.filterwarnings("ignore")
sys.path.insert(0, sys.argv[1])
from bikewheelcalc import BicycleWheel, Rim, Hub
from bikewheelcalc.theory import (calc_lat_stiff, calc_rad_stiff, calc_tor_stiff,
                                  calc_buckling_tension)

R = float(sys.argv[2]) / 1000
RIM_MASS, EI_RAD, EI_LAT, GJ = 0.560, 210.0, 260.0, 75.0   # as entered in the simulator
E_RIM, G_RIM, RHO = 69e9, 26e9, 2700.0
HUBS = {"DMR Zone 148": (38, 21), "DMR Zone 157": (41, 25)}  # (non-drive, drive) flange distance, mm

out = {}
for name, (nds, ds) in HUBS.items():
    w = BicycleWheel()
    w.hub = Hub(diameter_nds=0.056, diameter_ds=0.056, width_nds=nds / 1000, width_ds=ds / 1000)
    w.rim = Rim.general(radius=R, area=RIM_MASS / (2 * np.pi * R * RHO), I_rad=EI_RAD / E_RIM,
                        I_lat=EI_LAT / E_RIM, J_tor=GJ / G_RIM, I_warp=0.0,
                        young_mod=E_RIM, shear_mod=G_RIM)
    w.lace_cross(n_spokes=36, n_cross=3, diameter=0.002, young_mod=210e9)
    w.apply_tension(T_right=100 * 9.81)
    Kr, Kl, Kt = calc_rad_stiff(w), calc_lat_stiff(w), calc_tor_stiff(w)
    Tc, nc = calc_buckling_tension(w, approx="linear")
    t = [s.tension / 9.81 for s in w.spokes[:2]]
    out[name] = {"T_nds_kgf": min(t), "K_rad_N_mm": Kr / 1e3, "K_lat_N_mm": Kl / 1e3,
                 "K_tor_N_deg": Kt * np.pi / 180, "T_max_avg_kgf": Tc / 9.81}
print(json.dumps(out, indent=1))
