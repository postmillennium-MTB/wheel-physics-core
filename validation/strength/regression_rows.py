"""Ford bike-wheel-calc first-slack F_lat + tension ratio for regression rows.
usage: python3 -I regression_rows.py <bwc path> <rows.json> <hubs.json> <out.json> <part> <nparts>"""
import sys, json, numpy as np
sys.path.insert(0, sys.argv[1])
from bikewheelcalc import BicycleWheel, Rim, Hub
from bikewheelcalc.mode_matrix import ModeMatrix
rows = json.load(open(sys.argv[2])); hubs = json.load(open(sys.argv[3]))
part, nparts = int(sys.argv[5]), int(sys.argv[6])
out = []
for i, r in enumerate(rows):
    if i % nparts != part: continue
    h = hubs[r['hub_id']]; idx = r['rim_stiffness_index']
    R = r['wheel_erd']/2/1000 + 0.011; E, G = 69e9, 26e9
    rim = Rim.general(radius=R, area=115e5*idx/E, I_rad=150*idx/E, I_lat=50*idx/E, J_tor=22*idx/G,
                      I_warp=0.0, young_mod=E, shear_mod=G)
    w = BicycleWheel(); w.rim = rim
    w.hub = Hub(diameter_nds=h['pnds']/1000, diameter_ds=h['pds']/1000, width_nds=h['nds']/1000, width_ds=h['ds']/1000)
    w.lace_cross(n_spokes=r['spoke_count'], n_cross=3, diameter=r['spoke_diameter']/1000, young_mod=210e9)
    w.apply_tension(T_right=r['tension_kgf']*9.81)
    t = [s.tension for s in w.spokes[:2]]; ratio = 100*min(t)/max(t)
    mm = ModeMatrix(w, N=24)
    T0 = np.array([s.tension for s in w.spokes])
    res = {}
    for name, smeared in (('smeared', True), ('discrete', False)):
        K = mm.K_rim(tension=True, r0=False) + mm.K_spk(tension=True, smeared_spokes=smeared)
        if smeared:
            ix = mm.get_ix_uncoupled(dim='lateral'); Ku = mm.get_K_uncoupled(K=K, dim='lateral')
        best = np.inf
        for s in w.spokes[:4]:
            for sign in (1., -1.):
                F = mm.F_ext(s.rim_pt[1], [sign, 0., 0., 0.])
                d = np.zeros(F.shape)
                if smeared: d[ix] = np.linalg.solve(Ku, F[ix])
                else: d = np.linalg.solve(K, F)
                dT = mm.spoke_tension_change(d); neg = dT < 0
                if neg.any(): best = min(best, np.min(T0[neg]/-dT[neg]))
        res[name] = best/9.81
    out.append(dict(i=i, ratio=ratio, F_lat_smeared=res['smeared'], F_lat_discrete=res['discrete']))
json.dump(out, open(sys.argv[4], 'w'))
