# Copy of ../tool-check-2026-10-24/ford_cases.py (unchanged).
# usage: python3 -I ford_cases.py <bwc_path> <cases.json> <out.json> <start> <step>
import sys, json, numpy as np
bwc, casef, outf, start, step = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
sys.path.insert(0, bwc)
from bikewheelcalc import BicycleWheel, Rim, Hub
from bikewheelcalc.theory import calc_lat_stiff, calc_rad_stiff, calc_buckling_tension, calc_buckling_tension_modematrix
from bikewheelcalc.mode_matrix import ModeMatrix
def wheel_for(c):
    R = c['erd']/2/1000 + 0.011; E, G = 69e9, 26e9
    w = BicycleWheel()
    w.rim = Rim.general(radius=R, area=c['EA']/E, I_rad=c['EIR']/E, I_lat=c['EIL']/E, J_tor=c['GJ']/G, I_warp=0., young_mod=E, shear_mod=G)
    h = c['hub']
    w.hub = Hub(diameter_nds=h['pnds']/1000, diameter_ds=h['pds']/1000, width_nds=h['nds']/1000, width_ds=h['ds']/1000)
    w.spokes = []
    w.lace_cross_ds(c['Ns']//2, 3, c['dDS']/1000, 210e9)
    w.lace_cross_nds(c['Ns']//2, 3, c['dNDS']/1000, 210e9)
    w.apply_tension(T_right=c['tDS']*9.81)
    return w
def first_slack(w, mm, K, comp):
    T0 = np.array([s.tension for s in w.spokes]); best = np.inf
    for s in w.spokes[:4]:
        f = [0.,0.,0.,0.]; f[comp] = 1.
        d = np.linalg.solve(K, mm.F_ext(s.rim_pt[1], f)); dT = mm.spoke_tension_change(d)
        nz = dT != 0; best = min(best, np.min(T0[nz]/np.abs(dT[nz])))
    return best
cases = json.load(open(casef)); out = []
for i in range(start, len(cases), step):
    c = cases[i]; w = wheel_for(c)
    T = sorted([w.spokes[0].tension, w.spokes[1].tension])
    r = {'i': i, 'ratio': 100*T[0]/T[1]}
    r['K_lat'] = calc_lat_stiff(w, N=24, smeared_spokes=True, tension=True, buckling=True, coupling=False, r0=False)/1000
    r['K_rad'] = calc_rad_stiff(w, N=24, smeared_spokes=True, tension=True, buckling=True, coupling=False, r0=False)/1000
    r['T_c_smeared'] = calc_buckling_tension(w, approx='linear', N=24)[0]/9.81
    r['T_c'] = calc_buckling_tension_modematrix(w, smeared_spokes=False, coupling=True, r0=False, N=24)/9.81
    mm = ModeMatrix(w, N=24); K = mm.K_rim(tension=True, r0=False) + mm.K_spk(tension=True, smeared_spokes=False)
    r['F_lat'] = first_slack(w, mm, K, 0)/9.81; r['F_rad'] = first_slack(w, mm, K, 1)/9.81
    out.append(r)
json.dump(out, open(outf, 'w'))
