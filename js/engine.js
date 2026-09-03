/* ── Wheel physics engine ─────────────────────────────────────────────────────
 * THE canonical implementation. Both postmillennium-MTB/MTB-wheel-lab and
 * postmillennium-MTB/wheel-comparison-widget2 are meant to consume this file
 * directly (build-time import or a pinned script tag — see README.md), not
 * their own hand-copied version of it. If you are editing a copy of this file
 * inside one of those repos, stop — edit it here, validate it (see
 * validation/), then update the copy there. That is exactly the drift this
 * repo exists to prevent.
 *
 * Direct JavaScript port of Matt Ford's bike-wheel-calc library
 * (https://github.com/dashdotrobot/bike-wheel-calc), implementing the Mode
 * Matrix method from:
 *
 *   Ford, M.T. (2018). A Theoretical Analysis of the Bicycle Wheel.
 *   PhD thesis, Northwestern University.
 *
 * bike-wheel-calc is MIT-licensed, © 2015 Matthew Ford — see
 * python/LICENSE in this repo, vendored alongside the Python source this
 * file was ported from and validated against (python/bikewheelcalc/,
 * pinned to commit 6fc380c, 2019-01-31 — see README.md for how and why).
 * The method is Ford's; any porting error is this repo's, not his.
 *
 * Congruence targets (verified numerically against the Python library —
 * see validation/, worst-case diff 1.13e-13% across the full hub catalogue):
 *   ratio  ↔ BicycleWheel.apply_tension(T_right) tension balance
 *   K_lat  ↔ theory.calc_lat_stiff(N=24, smeared_spokes=True, tension=True,
 *                                  buckling=True, coupling=False, r0=False)
 *   K_rad  ↔ theory.calc_rad_stiff(same settings)
 *   T_c    ↔ theory.calc_buckling_tension(approx='linear', N=24)
 *
 * Model assumptions carried over from the library defaults:
 *   smeared (Smith–Pippard) spokes, no spoke offset (b = 0), no shear-center
 *   offset (y0 = 0), no warping stiffness (I_warp = 0), r0 = False.
 *
 * Strength metrics (F_lat, F_rad) are NOT library outputs. They are
 * first-spoke-slack thresholds built transparently on top of the library
 * stiffnesses — see comments at each formula.
 * ──────────────────────────────────────────────────────────────────────────── */

function spokeEA(d_mm) {
  // Spoke.EA = pi/4 * d^2 * E,  steel E = 210 GPa (library convention)
  return Math.PI / 4 * Math.pow(d_mm / 1000, 2) * 210e9;
}

/**
 * calc(erd_mm, hub, spkDS, spkNDS, tDS_kgf, EIL, EIR, GJ, EA_rim, Ns, N)
 *
 * hub: { ds, nds (center-to-flange, mm), pds, pnds (flange pitch dia, mm) }
 * Rim radius follows the validated convention R = ERD/2 + 11 mm (beam
 * centroid sits ~11 mm inboard of the nipple seat for a double-wall MTB rim).
 */
function calc(erd_mm, hub, spkDS, spkNDS, tDS_kgf, EIL, EIR, GJ, EA_rim, Ns, N) {
  const PI = Math.PI;
  const R  = erd_mm / 2 / 1000 + 0.011;     // rim centroid radius [m]
  const nCross = 3;

  // ── Spoke geometry — Spoke.__init__ in bicycle_wheel.py ──────────────────
  // du = hub z, dv = R − R_hub·cos(Δθ), dw = R_hub·sin(Δθ)
  const dth = 2 * PI / (Ns / 2) * nCross;   // hub-to-rim angular offset, 3-cross
  function spokeGeom(width_m, flange_dia_mm) {
    const Rh = flange_dia_mm / 2 / 1000;
    const du = width_m;
    const dv = R - Rh * Math.cos(dth);
    const dw = Rh * Math.sin(dth);
    const L  = Math.sqrt(du*du + dv*dv + dw*dw);
    return { L, nu: du / L, nv: dv / L, nw: dw / L };
  }
  const gDS  = spokeGeom(hub.ds  / 1000, hub.pds);   // drive side
  const gNDS = spokeGeom(hub.nds / 1000, hub.pnds);  // non-drive side

  // ── Tension balance — BicycleWheel.apply_tension(T_right=T_DS) ───────────
  const T_DS  = tDS_kgf * 9.81;                       // [N]
  const ratio = Math.abs(gDS.nu) / Math.abs(gNDS.nu); // T_NDS / T_DS
  const T_NDS = T_DS * ratio;

  // ── Smeared spoke stiffness k̄ — BicycleWheel.calc_kbar(tension=True) ─────
  // Per spoke: k = (EA/L)·n⊗n + (T/L)·(I − n⊗n).  Leading/trailing spokes
  // differ only in the sign of nw, so cross terms in nw cancel exactly and
  // each side contributes Ns/2 identical diagonal entries.
  const EA_DS = spokeEA(spkDS), EA_NDS = spokeEA(spkNDS);
  function kdiag(g, EA, T, n2) {            // n2 = squared direction cosine
    return (EA / g.L) * n2 + (T / g.L) * (1 - n2);
  }
  const half = Ns / 2, circ = 2 * PI * R;
  const kbar_uu = (half * (kdiag(gDS, EA_DS, T_DS, gDS.nu*gDS.nu) +
                           kdiag(gNDS, EA_NDS, T_NDS, gNDS.nu*gNDS.nu))) / circ;
  const kbar_vv = (half * (kdiag(gDS, EA_DS, T_DS, gDS.nv*gDS.nv) +
                           kdiag(gNDS, EA_NDS, T_NDS, gNDS.nv*gNDS.nv))) / circ;
  const kbar_ww = (half * (kdiag(gDS, EA_DS, T_DS, gDS.nw*gDS.nw) +
                           kdiag(gNDS, EA_NDS, T_NDS, gNDS.nw*gNDS.nw))) / circ;
  // kbar_up = kbar_pp = 0 (spoke offset b = 0); kbar_vw = 0 (leading/trailing
  // cancellation). Verified against the library's 4×4 kbar.

  // ── Average radial tension — T_avg = Σ T_s·n_v / Ns (ModeMatrix.K_rim) ───
  const T_avg = (half * (T_DS * gDS.nv + T_NDS * gNDS.nv)) / Ns;

  // ── Lateral stiffness — theory.calc_lat_stiff, coupling=False ────────────
  // Mode n = 0: only the smeared spokes resist rigid lateral translation.
  let C_lat = 1 / (circ * kbar_uu);
  // Modes n ≥ 1: solve the 2×2 (u, φ) system [ModeMatrix.K_rim_matl/-geom +
  // K_spk smeared].  Load at θ=0 excites cosine terms; u_n = Kpp/det.
  for (let n = 1; n <= N; n++) {
    const n2 = n * n;
    const Kuu = EIL * PI / (R*R*R) * n2*n2 + GJ * PI / (R*R*R) * n2
              + PI * R * kbar_uu
              - T_avg * (Ns / circ) * PI * n2;          // K_rim_geom k_uu
    const Kup = -(EIL * PI / (R*R) * n2 + GJ * PI / (R*R) * n2);
    const Kpp = EIL * PI / R + GJ * PI / R * n2;
    const det = Kuu * Kpp - Kup * Kup;
    C_lat += Kpp / det;
  }
  const K_lat = 1 / C_lat;                              // [N/m]

  // ── Radial stiffness — theory.calc_rad_stiff, coupling=False ─────────────
  // Mode n = 0: rim hoop (2π·EA/R) + smeared spokes.
  let C_rad = 1 / (2 * PI * EA_rim / R + circ * kbar_vv);
  // Modes n ≥ 1: 2×2 (v_cos, w_sin) system; K_rim_geom has no in-plane terms.
  for (let n = 1; n <= N; n++) {
    const n2 = n * n;
    const Kvv = EIR * PI / (R*R*R) * n2*n2 + EA_rim * PI / R
              + PI * R * kbar_vv;
    const Kww = EIR * PI / (R*R*R) * n2 + EA_rim * PI / R * n2
              + PI * R * kbar_ww;
    const Kvw = -(EIR * PI / (R*R*R) * n2*n + EA_rim * PI * n / R);
    const det = Kvv * Kww - Kvw * Kvw;
    C_rad += Kww / det;
  }
  const K_rad = 1 / C_rad;                              // [N/m]

  // ── Buckling tension — theory.calc_buckling_tension(approx='linear') ─────
  // Returns the critical AVERAGE radial tension T̄_c (the library's tension
  // measure); we also convert to the equivalent DS tension for builders.
  const kuu0 = (half * ((EA_DS / gDS.L) * gDS.nu*gDS.nu +
                        (EA_NDS / gNDS.L) * gNDS.nu*gNDS.nu)) / circ; // tension=False
  const T_d  = Math.abs(gNDS.nu * gDS.nv) + Math.abs(gDS.nu * gNDS.nv);
  const kbar_geom_uu = (half * (
      Math.abs(gDS.nu)  / T_d * (1 / gDS.L)  * (1 - gDS.nu*gDS.nu) +
      Math.abs(gNDS.nu) / T_d * (1 / gNDS.L) * (1 - gNDS.nu*gNDS.nu)
    )) / (PI * R);
  const kT = (circ / Ns) * kbar_geom_uu;
  const mu = GJ / EIL;                                  // I_warp = 0
  const luu = R*R*R*R / EIL * kuu0;                     // lup = lpp = 0 (b=0)
  let T_c_avg = Infinity, n_c = 0;
  for (let n = 2; n <= N; n++) {
    const n2 = n * n;
    const t_c = luu + (mu * n2 * (n2 - 1) * (n2 - 1)) / (1 + mu * n2);
    const Tcn = 2 * PI * EIL / (Ns * R * R) * t_c / (n2 - R * kT);
    if (Tcn > 0 && Tcn < T_c_avg) { T_c_avg = Tcn; n_c = n; }
  }
  // Equivalent DS tension at buckling: tension scales linearly, so
  // T_c(DS) = T̄_c · (T_DS / T̄_current)
  const T_c_DS_eq = T_c_avg * (T_DS / T_avg);
  const T_safety  = T_avg / T_c_avg;                    // = T_DS / T_c_DS_eq

  // ── Strength: first-spoke-slack thresholds (NOT library outputs) ─────────
  // Spoke.calc_tension_change: ΔT = −(EA/L)·(n·d).  A point load deflects the
  // rim locally by F/K (point-load stiffness already includes mode
  // concentration).  The first spoke at the load point reaches zero tension
  // when |ΔT| = T_pre. Linearized threshold — onset of slack, not collapse.
  //
  // Lateral: pushing the rim toward a flange slackens that side's spokes.
  //   u_slack(side) = T_side · L_side / (EA_side · |n_u,side|)
  const uSlackDS  = T_DS  * gDS.L  / (EA_DS  * Math.abs(gDS.nu));
  const uSlackNDS = T_NDS * gNDS.L / (EA_NDS * Math.abs(gNDS.nu));
  const latGov    = uSlackNDS <= uSlackDS ? 'NDS' : 'DS';
  const F_lat_N   = K_lat * Math.min(uSlackDS, uSlackNDS);
  //
  // Radial: load at the contact patch presses the rim inward; bottom spokes
  // lose tension. v_slack(side) = T_side · L_side / (EA_side · n_v,side)
  const vSlackDS  = T_DS  * gDS.L  / (EA_DS  * gDS.nv);
  const vSlackNDS = T_NDS * gNDS.L / (EA_NDS * gNDS.nv);
  const radGov    = vSlackNDS <= vSlackDS ? 'NDS' : 'DS';
  const F_rad_N   = K_rad * Math.min(vSlackDS, vSlackNDS);

  return {
    ratio:    ratio * 100,                 // NDS/DS tension, [%]
    T_NDS:    T_NDS / 9.81,                // [kgf]
    T_avg:    T_avg / 9.81,                // [kgf]
    K_lat:    K_lat / 1000,                // [N/mm]
    K_rad:    K_rad / 1000,                // [N/mm]
    T_c:      T_c_avg / 9.81,              // critical average tension [kgf]
    T_c_DS:   T_c_DS_eq / 9.81,            // equivalent DS tension [kgf]
    T_safety: T_safety * 100,              // current/critical [%]
    n_c,                                   // critical mode number
    F_lat:    F_lat_N / 9.81,              // [kgf]
    F_rad:    F_rad_N / 9.81,              // [kgf]
    latGov, radGov,                        // which side slacks first
    L_DS: gDS.L * 1000, L_NDS: gNDS.L * 1000,
  };
}

// Usable as-is, with no build step, in either consuming repo:
//   1. Plain <script src="engine.js"> (a bare script tag, NOT
//      type="module" — this file deliberately contains no `import`/`export`
//      keyword, which a non-module script would fail to parse). Defines the
//      top-level `calc` function directly, same as wheel-comparison-widget2's
//      current inline <script id="engine">, and also sets
//      window.WheelPhysicsCore = { calc } for callers that prefer a
//      namespaced reference.
//   2. Node's CommonJS require('./engine.js') — used by the validation
//      harness in this repo.
//   3. A bundler that understands CommonJS interop (esbuild, webpack, etc.)
//      can `import { calc } from '.../engine.js'` directly against the
//      module.exports below with no native ES `export` needed on this file.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calc };
}
if (typeof window !== 'undefined') {
  window.WheelPhysicsCore = { calc };
}
