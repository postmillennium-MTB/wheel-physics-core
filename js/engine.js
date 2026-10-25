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
 * bike-wheel-calc is MIT-licensed, © 2015 Matthew Ford — included as the
 * third-party/dashdotrobot/bike-wheel-calc git submodule in this repo,
 * pinned to commit 6fc380c, 2019-01-31, the Python source this file was
 * ported from and is validated against (see README.md for how and why).
 * The method is Ford's; any porting error is this repo's, not his.
 *
 * Congruence targets (verified numerically against the Python library —
 * see validation/, worst-case diff 3.7e-13% across 30 hubs × 4 build setups):
 *   ratio  ↔ BicycleWheel.apply_tension(T_right) tension balance
 *   K_lat  ↔ theory.calc_lat_stiff(N=24, smeared_spokes=True, tension=True,
 *                                  buckling=True, coupling=False, r0=False)
 *   K_rad  ↔ theory.calc_rad_stiff(same settings)
 *   T_c    ↔ theory.calc_buckling_tension_modematrix(N=24, smeared_spokes=False,
 *                                  coupling=True, r0=False)
 *   T_c_smeared ↔ theory.calc_buckling_tension(approx='linear', N=24)
 *   F_lat, F_rad ↔ first spoke slack from ModeMatrix(N=24), discrete spokes,
 *                  coupled, tension=True, r0=False (validation/reference.py)
 *   K_lat0 ↔ theory.calc_lat_stiff(same settings as K_lat but tension=False,
 *                  buckling=False): lateral stiffness at zero spoke tension
 *   F_taco ↔ NOT a library output. Ford & Balogun (2017), Eq. 2:
 *                  P = K0_lat · R · (1 − T/T_c), applied to the library's
 *                  K0_lat, T_avg and T_c (validation/reference.py does the same
 *                  arithmetic in Python). The paper calls it a rough
 *                  approximation; this checks the inputs and arithmetic, not
 *                  the approximation. Radial load only: Ford has no sideways
 *                  taco formula.
 *
 * Model assumptions carried over from the library defaults:
 *   smeared (Smith–Pippard) spokes, no spoke offset (b = 0), no shear-center
 *   offset (y0 = 0), no warping stiffness (I_warp = 0), r0 = False.
 *
 * Strength metrics (F_lat, F_rad) are NOT library outputs (the library has
 * no strength function). They are the point loads at which the first spoke
 * goes slack, computed with the library's own ModeMatrix (fully-discrete
 * spokes, lateral/radial coupled) and Spoke.calc_tension_change — see
 * firstSlackDiscrete below. validation/ checks them against bike-wheel-calc
 * to floating-point precision like the stiffness outputs.
 * ──────────────────────────────────────────────────────────────────────────── */

function spokeEA(d_mm) {
  // Spoke.EA = pi/4 * d^2 * E,  steel E = 210 GPa (library convention)
  return Math.PI / 4 * Math.pow(d_mm / 1000, 2) * 210e9;
}

/**
 * First-spoke-slack loads with fully-discrete spokes, lateral/radial coupled.
 * Port of bike-wheel-calc's ModeMatrix (mode_matrix.py) for the settings this
 * engine uses: no spoke offset (b = 0, so spokes carry no rim-rotation
 * terms), y0 = 0, I_warp = 0, r0 = False, 3-cross lacing laid out exactly as
 * BicycleWheel.lace_cross does. Unknowns per mode n >= 1 are
 * (u_c, u_s, v_c, v_s, w_c, w_s, phi_c, phi_s); mode 0 is (u, v, w, phi).
 * A unit point load is applied at each of the four spokes in one lacing
 * period (NDS/DS, leading/trailing), laterally and radially, in both
 * directions; the smallest load that brings any spoke to zero tension wins.
 * Returns loads in N and the side whose spoke slackens first.
 *
 * Also returns the critical (buckling) average tension of the same discrete
 * model, as theory.calc_buckling_tension_modematrix(smeared_spokes=False,
 * coupling=True, r0=False) computes it: the smallest positive T with
 * (K_matl − T·K_geom)·x = 0, K_matl = K_rim_matl + K_spk(tension=False),
 * K_geom = K_rim_geom − K_spk_geom. K_spk_geom weights each spoke by
 * 2|n_u|/T_d exactly as mode_matrix.py does.
 */
const TC_CACHE = new Map();
function discreteSpokeModel(R, hub, Ns, N, T_DS, T_NDS, EA_DS, EA_NDS,
                            T_avg, EIL, EIR, GJ, EA_rim) {
  const PI = Math.PI, M = 4 + 8 * N, nCross = 3, half = Ns / 2;
  // T_c depends on geometry and stiffness only, not on the tension level, so
  // a tension sweep of one build reuses it (and skips its matrices).
  const tcKey = [R, hub.ds, hub.nds, hub.pds, hub.pnds, Ns, N, EA_DS, EA_NDS,
                 EIL, EIR, GJ, EA_rim].join(',');
  const tcKnown = TC_CACHE.get(tcKey), needTc = tcKnown === undefined;

  // Spokes in rim-angle order — BicycleWheel.lace_cross_ds / lace_cross_nds.
  const spokes = [];
  function addSide(isDS) {
    const Rh = (isDS ? hub.pds : hub.pnds) / 2 / 1000;
    const z  = isDS ? -hub.ds / 1000 : hub.nds / 1000;
    for (let s = 0; s < half; s++) {
      const th  = 2 * PI / half * (isDS ? s + 0.5 : s);
      const dir = s % 2 === 0 ? 1 : -1;
      const dh  = 2 * PI / half * nCross * dir;           // hub minus rim angle
      const du = z, dv = R - Rh * Math.cos(dh), dw = Rh * Math.sin(dh);
      const L = Math.sqrt(du*du + dv*dv + dw*dw);
      spokes.push({ th, L, n: [du / L, dv / L, dw / L],
                    EA: isDS ? EA_DS : EA_NDS, T: isDS ? T_DS : T_NDS,
                    side: isDS ? 'DS' : 'NDS' });
    }
  }
  addSide(true); addSide(false);
  spokes.sort((a, b) => a.th - b.th);

  // B_theta rows for components c = 0..2 (u, v, w) at angle th, as sparse
  // (index, value) lists.
  function basis(th, c) {
    const idx = [c], val = [1];
    for (let n = 1; n <= N; n++) {
      idx.push(4 + 8 * (n - 1) + 2 * c, 4 + 8 * (n - 1) + 2 * c + 1);
      val.push(Math.cos(n * th), Math.sin(n * th));
    }
    return { idx, val };
  }

  // K: stiffness at the current tensions (strength). Km, Kg: the material
  // and geometric parts used for the buckling eigenproblem.
  const K = [], Km = [], Kg = [];
  for (let i = 0; i < M; i++) {
    K.push(new Float64Array(M));
    if (needTc) { Km.push(new Float64Array(M)); Kg.push(new Float64Array(M)); }
  }

  // The lacing repeats every four spokes (NDS/DS × leading/trailing), so the
  // wheel has P = Ns/4-fold rotational symmetry and the spoke terms only
  // couple modes n and m when n ≡ ±m (mod P). K is therefore block-diagonal
  // once the unknowns are grouped by that class; only those blocks are
  // assembled, and each is factored on its own (same result as one full
  // solve, many times faster). Ns not divisible by 4 falls back to a single
  // block.
  const P = Ns % 4 === 0 ? Ns / 4 : 0;
  const cls = new Int32Array(M);
  for (let i = 4; i < M; i++) {
    const n = Math.floor((i - 4) / 8) + 1;
    cls[i] = P ? Math.min(n % P, (P - n % P) % P) : 0;
  }
  const nCls = P ? Math.floor(P / 2) + 1 : 1;

  // K_rim_matl − T_avg·K_rim_geom (mode_matrix.py, y0 = 0, r0 = False).
  K[1][1] = 2 * PI * EA_rim / R;
  K[3][3] = 2 * PI * EIL / R;
  const geom = Ns / (2 * PI * R);
  for (let n = 1; n <= N; n++) {
    const i0 = 4 + 8 * (n - 1), n2 = n * n;
    const kvv = EIR * PI / (R*R*R) * n2*n2 + EA_rim * PI / R;
    const kww = EIR * PI / (R*R*R) * n2 + EA_rim * PI / R * n2;
    const kvw = -EIR * PI / (R*R*R) * n2*n - EA_rim * PI * n / R;
    const kuuM = EIL * PI / (R*R*R) * n2*n2 + GJ * PI / (R*R*R) * n2;
    const kuuG = geom * PI * n2;
    const kuu = kuuM - T_avg * kuuG;
    if (needTc) {
      Km[i0][i0] = kuuM; Km[i0+1][i0+1] = kuuM;
      Kg[i0][i0] = kuuG; Kg[i0+1][i0+1] = kuuG;
    }
    const kup = -(EIL * PI / (R*R) * n2 + GJ * PI / (R*R) * n2);
    const kpp = EIL * PI / R + GJ * PI / R * n2;
    K[i0+2][i0+2] = kvv; K[i0+3][i0+3] = kvv;
    K[i0+4][i0+4] = kww; K[i0+5][i0+5] = kww;
    K[i0+2][i0+5] = kvw; K[i0+5][i0+2] = kvw;
    K[i0+3][i0+4] = -kvw; K[i0+4][i0+3] = -kvw;
    K[i0][i0] = kuu; K[i0+1][i0+1] = kuu;
    K[i0][i0+6] = kup; K[i0+6][i0] = kup;
    K[i0+1][i0+7] = kup; K[i0+7][i0+1] = kup;
    K[i0+6][i0+6] = kpp; K[i0+7][i0+7] = kpp;
  }
  // Rim terms other than k_uu carry no tension, so Km starts as a copy of K
  // there (k_uu was set above without the tension term).
  if (needTc) for (let i = 0; i < M; i++) for (let j = 0; j < M; j++) {
    if (i >= 4 && i === j && ((i - 4) % 8) < 2) continue;
    Km[i][j] = K[i][j];
  }

  // K_spk_geom weight per spoke (mode_matrix.py): 2|n_u|/T_d, T_d from the
  // first two spokes (one per side).
  const T_dK = Math.abs(spokes[0].n[0] * spokes[1].n[1]) +
               Math.abs(spokes[1].n[0] * spokes[0].n[1]);

  // K_spk, discrete, tension=True: Σ B^T·k·B with k = (EA/L)·n⊗n + (T/L)·(I − n⊗n).
  for (const sp of spokes) {
    const b = [basis(sp.th, 0), basis(sp.th, 1), basis(sp.th, 2)];
    sp.b = b;
    // The same basis entries split by symmetry class.
    const g = b.map(bc => {
      const out = [];
      for (let c = 0; c < nCls; c++) out.push({ idx: [], val: [] });
      for (let p = 0; p < bc.idx.length; p++) {
        const o = out[cls[bc.idx[p]]];
        o.idx.push(bc.idx[p]); o.val.push(bc.val[p]);
      }
      return out;
    });
    for (let c = 0; c < 3; c++) {
      for (let d = 0; d < 3; d++) {
        const nn = sp.n[c] * sp.n[d], kf = ((c === d ? 1 : 0) - nn) / sp.L;
        const km = (sp.EA / sp.L) * nn;
        const k = km + sp.T * kf;
        const kg = -2 * Math.abs(sp.n[0]) / T_dK * kf;
        for (let cl = 0; cl < nCls; cl++) {
        const bc = g[c][cl], bd = g[d][cl];
        for (let p = 0; p < bc.idx.length; p++) {
          const i = bc.idx[p], row = K[i], bp = bc.val[p];
          if (needTc) {
            const rm = Km[i], rg = Kg[i];
            for (let q = 0; q < bd.idx.length; q++) {
              const j = bd.idx[q], bb = bp * bd.val[q];
              row[j] += k * bb; rm[j] += km * bb; rg[j] += kg * bb;
            }
          } else {
            for (let q = 0; q < bd.idx.length; q++) row[bd.idx[q]] += k * bp * bd.val[q];
          }
        }
        }
      }
    }
  }

  const blocks = [];
  let T_c = Infinity;
  for (let c = 0; c < nCls; c++) {
    const ix = [];
    for (let i = 0; i < M; i++) if (cls[i] === c) ix.push(i);
    if (!ix.length) continue;
    // LU factorization with partial pivoting of K[ix][ix].
    const m = ix.length, A = [], piv = new Int32Array(m);
    for (let i = 0; i < m; i++) {
      const row = new Float64Array(m), src = K[ix[i]];
      for (let j = 0; j < m; j++) row[j] = src[ix[j]];
      A.push(row);
    }
    for (let k = 0; k < m; k++) {
      let p = k, big = Math.abs(A[k][k]);
      for (let i = k + 1; i < m; i++) {
        const v = Math.abs(A[i][k]);
        if (v > big) { big = v; p = i; }
      }
      piv[k] = p;
      if (p !== k) { const t = A[p]; A[p] = A[k]; A[k] = t; }
      const pk = A[k][k], rk = A[k];
      for (let i = k + 1; i < m; i++) {
        const ri = A[i], f = ri[k] / pk;
        if (f === 0) continue;
        ri[k] = f;
        for (let j = k + 1; j < m; j++) ri[j] -= f * rk[j];
      }
    }
    blocks.push({ ix, A, piv });
    if (needTc) {
      const mu = maxGenEig(Km, Kg, ix);
      if (mu > 0) T_c = Math.min(T_c, 1 / mu);
    }
  }
  if (!needTc) T_c = tcKnown;
  else {
    if (TC_CACHE.size > 2000) TC_CACHE.clear();
    TC_CACHE.set(tcKey, T_c);
  }
  function solve(rhs) {
    const out = new Float64Array(M);
    for (const { ix, A, piv } of blocks) {
      const m = ix.length, x = new Float64Array(m);
      for (let i = 0; i < m; i++) x[i] = rhs[ix[i]];
      for (let k = 0; k < m; k++) {      // rows were swapped whole, so
        const p = piv[k];                 // apply every swap first
        if (p !== k) { const t = x[p]; x[p] = x[k]; x[k] = t; }
      }
      for (let k = 0; k < m; k++) {
        for (let i = k + 1; i < m; i++) x[i] -= A[i][k] * x[k];
      }
      for (let i = m - 1; i >= 0; i--) {
        let s = x[i];
        for (let j = i + 1; j < m; j++) s -= A[i][j] * x[j];
        x[i] = s / A[i][i];
      }
      for (let i = 0; i < m; i++) out[ix[i]] = x[i];
    }
    return out;
  }

  // Unit loads at the first four spokes' rim points (one lacing period).
  function slackLoad(comp) {
    let best = Infinity, gov = null;
    for (let j = 0; j < 4; j++) {
      const f = new Float64Array(M), bl = basis(spokes[j].th, comp);
      for (let p = 0; p < bl.idx.length; p++) f[bl.idx[p]] += bl.val[p];
      const d = solve(f);
      for (const sp of spokes) {
        // Rim displacement at this spoke, then ΔT per newton of load.
        let un = 0;
        for (let c = 0; c < 3; c++) {
          const bc = sp.b[c];
          let disp = 0;
          for (let p = 0; p < bc.idx.length; p++) disp += bc.val[p] * d[bc.idx[p]];
          un += sp.n[c] * disp;
        }
        const dT = -(sp.EA / sp.L) * un;
        if (dT === 0) continue;
        const load = sp.T / Math.abs(dT);   // load pushes one way or the other
        if (load < best) { best = load; gov = sp.side; }
      }
    }
    return { load: best, gov };
  }
  const lat = slackLoad(0), rad = slackLoad(1);
  return { F_lat: lat.load, latGov: lat.gov, F_rad: rad.load, radGov: rad.gov, T_c };
}

/**
 * Largest eigenvalue mu of Kg·x = mu·Km·x on the rows/columns ix, with Km
 * symmetric positive definite: Cholesky Km = L·Lᵀ, then the symmetric
 * C = L⁻¹·Kg·L⁻ᵀ, whose largest eigenvalue is found by tridiagonal
 * reduction and bisection.
 * The buckling tension is 1/mu for the largest positive mu, the same as the
 * smallest positive root of Km·x = T·Kg·x that scipy's eig() returns in
 * theory.calc_buckling_tension_modematrix.
 */
function maxGenEig(Km, Kg, ix) {
  const m = ix.length, L = new Float64Array(m * m), C = new Float64Array(m * m);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j <= i; j++) {
      let s = Km[ix[i]][ix[j]];
      for (let k = 0; k < j; k++) s -= L[i*m + k] * L[j*m + k];
      if (i === j) {
        if (!(s > 0)) return NaN;         // Km not positive definite
        L[i*m + i] = Math.sqrt(s);
      } else L[i*m + j] = s / L[j*m + j];
    }
  }
  // Y = L⁻¹·Kg (column by column, stored transposed: Y[j*m + i] = Y_ij),
  // then C = L⁻¹·Yᵀ, which is L⁻¹·Kg·L⁻ᵀ since Kg is symmetric.
  const Y = new Float64Array(m * m);
  for (let j = 0; j < m; j++) {
    for (let i = 0; i < m; i++) {
      let s = Kg[ix[i]][ix[j]];
      for (let k = 0; k < i; k++) s -= L[i*m + k] * Y[j*m + k];
      Y[j*m + i] = s / L[i*m + i];
    }
  }
  for (let j = 0; j < m; j++) {          // column j of C = L⁻¹·(row j of Y)
    for (let i = 0; i < m; i++) {
      let s = Y[i*m + j];
      for (let k = 0; k < i; k++) s -= L[i*m + k] * C[k*m + j];
      C[i*m + j] = s / L[i*m + i];
    }
  }
  for (let i = 0; i < m; i++) for (let j = 0; j < i; j++) {
    const v = 0.5 * (C[i*m + j] + C[j*m + i]); C[i*m + j] = v; C[j*m + i] = v;
  }
  // Householder reduction to tridiagonal form, then bisection with Sturm
  // counts for the largest eigenvalue.
  const v = new Float64Array(m), pv = new Float64Array(m);
  for (let k = 0; k < m - 2; k++) {
    let norm = 0;
    for (let i = k + 1; i < m; i++) norm += C[i*m + k] * C[i*m + k];
    norm = Math.sqrt(norm);
    if (norm === 0) continue;
    const alpha = C[(k+1)*m + k] > 0 ? -norm : norm;
    v.fill(0);
    for (let i = k + 1; i < m; i++) v[i] = C[i*m + k];
    v[k+1] -= alpha;
    let vn = 0;
    for (let i = k + 1; i < m; i++) vn += v[i] * v[i];
    vn = Math.sqrt(vn);
    if (vn === 0) continue;
    for (let i = k + 1; i < m; i++) v[i] /= vn;
    // A ← H·A·H with H = I − 2vvᵀ: A − 2(v·wᵀ + w·vᵀ), w = p − (vᵀp)·v, p = A·v.
    for (let i = k; i < m; i++) {
      let t = 0;
      for (let j = k + 1; j < m; j++) t += C[i*m + j] * v[j];
      pv[i] = t;
    }
    let vp = 0;
    for (let i = k + 1; i < m; i++) vp += v[i] * pv[i];
    for (let i = k; i < m; i++) pv[i] -= vp * v[i];
    for (let i = k; i < m; i++) {
      const vi = v[i], pi = pv[i], o = i*m;
      for (let j = k; j < m; j++) C[o + j] -= 2 * (vi * pv[j] + pi * v[j]);
    }
  }
  const d = new Float64Array(m), e = new Float64Array(m);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < m; i++) {
    d[i] = C[i*m + i];
    if (i < m - 1) e[i] = C[(i+1)*m + i];
  }
  for (let i = 0; i < m; i++) {            // Gershgorin bounds
    const r = (i > 0 ? Math.abs(e[i-1]) : 0) + (i < m - 1 ? Math.abs(e[i]) : 0);
    lo = Math.min(lo, d[i] - r); hi = Math.max(hi, d[i] + r);
  }
  const below = x => {                     // eigenvalues less than x
    let cnt = 0, q = 1;
    for (let i = 0; i < m; i++) {
      q = d[i] - x - (i > 0 ? e[i-1] * e[i-1] / q : 0);
      if (q === 0) q = 1e-300;
      if (q < 0) cnt++;
    }
    return cnt;
  };
  for (let it = 0; it < 200 && hi - lo > 1e-15 * Math.max(Math.abs(lo), Math.abs(hi)); it++) {
    const mid = 0.5 * (lo + hi);
    if (below(mid) < m) lo = mid; else hi = mid;
  }
  return 0.5 * (lo + hi);
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
  // Modes n ≥ 1: solve the 2×2 (u, φ) system [ModeMatrix.K_rim_matl/-geom +
  // K_spk smeared].  Load at θ=0 excites cosine terms; u_n = Kpp/det.
  // withTension / withBuckling are the library's tension= (spoke tension
  // stiffening, via kbar) and buckling= (rim geometric term, K_rim tension=)
  // switches. Both on gives K_lat; both off gives K⁰_lat, the stiffness at
  // zero spoke tension, which Ford & Balogun (2017) Eq. 2 needs.
  function latStiff(withTension, withBuckling) {
    const kuu = (half * (kdiag(gDS, EA_DS, withTension ? T_DS : 0, gDS.nu*gDS.nu) +
                         kdiag(gNDS, EA_NDS, withTension ? T_NDS : 0, gNDS.nu*gNDS.nu))) / circ;
    const Tg = withBuckling ? T_avg : 0;
    let C = 1 / (circ * kuu);
    for (let n = 1; n <= N; n++) {
      const n2 = n * n;
      const Kuu = EIL * PI / (R*R*R) * n2*n2 + GJ * PI / (R*R*R) * n2
                + PI * R * kuu
                - Tg * (Ns / circ) * PI * n2;             // K_rim_geom k_uu
      const Kup = -(EIL * PI / (R*R) * n2 + GJ * PI / (R*R) * n2);
      const Kpp = EIL * PI / R + GJ * PI / R * n2;
      const det = Kuu * Kpp - Kup * Kup;
      C += Kpp / det;
    }
    return 1 / C;                                          // [N/m]
  }
  const K_lat  = latStiff(true, true);                    // [N/m]
  const K_lat0 = latStiff(false, false);                  // [N/m] zero tension

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

  // ── Buckling tension, smeared — theory.calc_buckling_tension(approx='linear')
  // The critical AVERAGE radial tension T̄_c (the library's tension measure).
  // Kept for comparison (T_c_smeared); T_c below is the discrete-spoke value.
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
  let T_c_smeared = Infinity, n_c = 0;
  for (let n = 2; n <= N; n++) {
    const n2 = n * n;
    const t_c = luu + (mu * n2 * (n2 - 1) * (n2 - 1)) / (1 + mu * n2);
    const Tcn = 2 * PI * EIL / (Ns * R * R) * t_c / (n2 - R * kT);
    if (Tcn > 0 && Tcn < T_c_smeared) { T_c_smeared = Tcn; n_c = n; }
  }

  // ── Strength: first-spoke-slack loads (NOT library outputs) ──────────────
  // The library has no strength output. Strength here is the point load at
  // which the first spoke reaches zero tension, computed with the library's
  // own building blocks: ModeMatrix with fully-discrete spokes, lateral and
  // radial coupled (each spoke at its real rim angle, with its own n vector),
  // and Spoke.calc_tension_change, ΔT = −(EA/L)·(n·d). Validated against
  // validation/reference.py, which runs exactly that in bike-wheel-calc.
  // Linear up to first slack; post-slack behaviour and rim buckling under
  // load (taco) are not modelled here.
  const slack = discreteSpokeModel(R, hub, Ns, N, T_DS, T_NDS, EA_DS, EA_NDS,
                                   T_avg, EIL, EIR, GJ, EA_rim);
  const F_lat_N = slack.F_lat, latGov = slack.latGov;
  const F_rad_N = slack.F_rad, radGov = slack.radGov;

  // ── Buckling tension, discrete — theory.calc_buckling_tension_modematrix
  // (smeared_spokes=False, coupling=True, r0=False), from the same matrices
  // as the strength figures, so the buckling limit and the strength come
  // from one model. Equivalent DS tension: tension scales linearly, so
  // T_c(DS) = T̄_c · (T_DS / T̄_current).
  const T_c_avg   = slack.T_c;
  const T_c_DS_eq = T_c_avg * (T_DS / T_avg);
  const T_safety  = T_avg / T_c_avg;                    // = T_DS / T_c_DS_eq

  // Smeared-spoke equivalents (Ford & Balogun 2017, Eq. 3 form): the load at
  // which the spoke under a point load reaches zero tension, using the
  // smeared stiffnesses above. Kept for comparison only; the discrete values
  // above are the strength figures. u_slack = T·L / (EA·|n_u|), likewise v.
  const uSlackDS  = T_DS  * gDS.L  / (EA_DS  * Math.abs(gDS.nu));
  const uSlackNDS = T_NDS * gNDS.L / (EA_NDS * Math.abs(gNDS.nu));
  const vSlackDS  = T_DS  * gDS.L  / (EA_DS  * gDS.nv);
  const vSlackNDS = T_NDS * gNDS.L / (EA_NDS * gNDS.nv);
  const F_lat_smeared_N = K_lat * Math.min(uSlackDS, uSlackNDS);
  const F_rad_smeared_N = K_rad * Math.min(vSlackDS, vSlackNDS);

  return {
    ratio:    ratio * 100,                 // NDS/DS tension, [%]
    T_NDS:    T_NDS / 9.81,                // [kgf]
    T_avg:    T_avg / 9.81,                // [kgf]
    K_lat:    K_lat / 1000,                // [N/mm]
    K_lat0:   K_lat0 / 1000,               // [N/mm] lateral stiffness at zero spoke tension
    R_rim:    R * 1000,                    // [mm] rim centroid radius
    K_rad:    K_rad / 1000,                // [N/mm]
    T_c:      T_c_avg / 9.81,              // critical average tension [kgf]
    T_c_DS:   T_c_DS_eq / 9.81,            // equivalent DS tension [kgf]
    T_safety: T_safety * 100,              // current/critical [%]
    n_c,                                   // critical mode number (smeared)
    T_c_smeared: T_c_smeared / 9.81,       // [kgf] smeared, linear approx.
    F_lat:    F_lat_N / 9.81,              // [kgf]
    F_taco:   Math.max(0, K_lat0 * R * (1 - T_safety)) / 9.81, // [kgf] rim-buckling load, F&B 2017 Eq. 2
    F_rad:    F_rad_N / 9.81,              // [kgf]
    F_lat_smeared: F_lat_smeared_N / 9.81, // [kgf] smeared-spoke comparison
    F_rad_smeared: F_rad_smeared_N / 9.81, // [kgf] smeared-spoke comparison
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
