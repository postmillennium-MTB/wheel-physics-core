"""First-spoke-slack loads computed directly with Ford's bike-wheel-calc.
usage: python3 -I ford_first_slack.py <bwc_path> <hub_catalogue.json> <out.json> erd Ns tDS
For each hub: build wheel exactly as validation/reference.py does, apply a unit
point load at a spoke's rim point with ModeMatrix, get every spoke's tension
change via Spoke.calc_tension_change, and find the load at which the first
spoke reaches zero tension. Two variants:
  smeared  - same settings as engine.js stiffness (smeared spokes, uncoupled)
  discrete - Ford's full model: individual spokes, coupled lateral/radial
"""
import sys, json, numpy as np
sys.path.insert(0, sys.argv[1])
from bikewheelcalc import BicycleWheel, Rim, Hub
from bikewheelcalc.mode_matrix import ModeMatrix
cat = json.load(open(sys.argv[2])); RC = cat['rim_constants']
ERD, NS, TDS = float(sys.argv[4]), int(sys.argv[5]), float(sys.argv[6])
N = 24
SWEEP = len(sys.argv) > 7

def build(h):
    R = ERD/2/1000 + 0.011; E, G = 69e9, 26e9
    rim = Rim.general(radius=R, area=RC['EA_rim']/E, I_rad=RC['EIR']/E, I_lat=RC['EIL']/E,
                      J_tor=RC['GJ']/G, I_warp=0.0, young_mod=E, shear_mod=G)
    w = BicycleWheel(); w.rim = rim
    w.hub = Hub(diameter_nds=h['pnds']/1000, diameter_ds=h['pds']/1000,
                width_nds=h['nds']/1000, width_ds=h['ds']/1000)
    w.lace_cross(n_spokes=NS, n_cross=3, diameter=0.002, young_mod=210e9)
    w.apply_tension(T_right=TDS*9.81)
    return w

def first_slack(w, mm, K, comp, smeared, dim):
    best = np.inf
    # load at the rim point of one NDS spoke and one DS spoke, both directions
    sp = 2*np.pi/len(w.spokes)
    thetas = [s.rim_pt[1] for s in w.spokes[:4]] if not SWEEP else [i*sp/4 for i in range(16)]
    for th in thetas:
        for sign in (1., -1.):
            f = [0., 0., 0., 0.]; f[comp] = sign
            F = mm.F_ext(th, f)
            d = np.zeros(F.shape)
            if smeared:
                ix = mm.get_ix_uncoupled(dim=dim)
                d[ix] = np.linalg.solve(mm.get_K_uncoupled(K=K, dim=dim), F[ix])
            else:
                d = np.linalg.solve(K, F)
            dT = mm.spoke_tension_change(d)          # per 1 N of load
            T0 = np.array([sp.tension for sp in w.spokes])
            neg = dT < 0
            if neg.any():
                best = min(best, np.min(T0[neg] / -dT[neg]))
    return best / 9.81   # kgf

out = []
for h in cat['hubs']:
    w = build(h); mm = ModeMatrix(w, N=N)
    Ks = mm.K_rim(tension=True, r0=False) + mm.K_spk(tension=True, smeared_spokes=True)
    Kd = mm.K_rim(tension=True, r0=False) + mm.K_spk(tension=True, smeared_spokes=False)
    out.append(dict(name=h['name'], std=h['std'],
        lat_smeared=first_slack(w, mm, Ks, 0, True, 'lateral'),
        rad_smeared=first_slack(w, mm, Ks, 1, True, 'radial'),
        lat_discrete=first_slack(w, mm, Kd, 0, False, None),
        rad_discrete=first_slack(w, mm, Kd, 1, False, None)))
json.dump(out, open(sys.argv[3], 'w'), indent=1)
