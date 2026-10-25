/* ── Build links between the two wheel tools ─────────────────────────────────
 * Shared by postmillennium-MTB/MTB-wheel-lab (build-time import) and
 * postmillennium-MTB/wheel-comparison-widget2 (pasted copy, same as
 * engine.js). One file so both tools read and write the same link format and
 * treat a bad or missing value the same way.
 *
 * Not physics. The math both tools run is engine.js (Matthew Ford's Mode
 * Matrix method); this file only carries a build -- two hubs, wheel size,
 * drive-side tension, spoke count -- from one tool to the other.
 *
 * Link format: the URL hash, as key=value pairs joined by "&". The keys are
 * the ones wheel-comparison-widget2 has written since 2026, so links already
 * shared from the widget keep working:
 *
 *   h1, h2    hub ids (h1..h31, the catalogue both tools share)
 *   w1, w2    wheel size: 26 | 27.5 | 29 | 32
 *   td1, td2  drive-side spoke tension, kgf
 *   ns        spoke count: 28 | 32 | 36
 *
 * The widget has two independent sides (1 = amber slot, 2 = blue slot), each
 * holding either axle standard. The Lab has one build setting shared by a
 * 148x12 slot and a 157x12 slot, so in a Lab link h1 is always the 148x12 hub
 * and h2 the 157x12 hub, and only w1/td1 are written. A Lab link may also
 * start with a bare tab name: #compare&h1=h6&h2=h7&...
 *
 * Tension ranges differ: the Lab slider runs 80-125 kgf, the widget offers
 * 95-125 kgf. Each link is snapped to its destination's range.
 *
 * Same packaging rule as engine.js: no import/export keyword, so it works as
 * a plain <script>, under Node's require(), and through a bundler.
 */
var WheelBuildLink = (function () {
  var PAGES = {
    lab: 'https://www.postmillenniumrenaissance.com/wheel-lab/',
    widget: 'https://www.postmillenniumrenaissance.com/wheel-comparison-widget2/',
  };
  var WHEEL_SIZES = ['26', '27.5', '29', '32'];
  var SPOKE_COUNTS = ['28', '32', '36'];
  var TENSION = {
    lab: { min: 80, max: 125, step: 5 },
    widget: { min: 95, max: 125, step: 5 },
  };
  var HUB_ID = /^h\d{1,3}$/;

  // A hash is typed, pasted and mangled by chat apps, so a stray "%" must not
  // throw: an undecodable piece is kept as text and then fails validation.
  function safeDecode(s) {
    try { return decodeURIComponent(s); } catch (e) { return s; }
  }

  // "#compare&h1=h6&ns=32" -> { bare: ['compare'], params: { h1: 'h6', ns: '32' } }
  function parseHash(hash) {
    var out = { bare: [], params: {} };
    String(hash || '').replace(/^#/, '').split('&').forEach(function (pair) {
      if (!pair) return;
      var i = pair.indexOf('=');
      if (i < 0) { out.bare.push(safeDecode(pair)); return; }
      var k = safeDecode(pair.slice(0, i));
      if (k) out.params[k] = safeDecode(pair.slice(i + 1));
    });
    return out;
  }

  // Nearest allowed tension, or null when the value is not a number.
  function snapTension(t, range) {
    var v = parseFloat(t);
    if (!isFinite(v)) return null;
    v = Math.round(v / range.step) * range.step;
    return Math.min(range.max, Math.max(range.min, v));
  }

  // Validated build from a parsed hash, for one side (1 or 2). A field that
  // is missing or not an allowed value comes back null, and the caller keeps
  // its own default for it.
  function readSide(params, side, dest) {
    var w = params['w' + side], t = params['td' + side];
    return {
      wheel: WHEEL_SIZES.indexOf(w) >= 0 ? w : null,
      tension: t == null || t === '' ? null : snapTension(t, TENSION[dest]),
    };
  }
  function readHub(v) { return HUB_ID.test(v || '') ? v : null; }
  function readSpokes(v) { return SPOKE_COUNTS.indexOf(v) >= 0 ? v : null; }

  function join(pairs) {
    return pairs.filter(function (p) { return p[1] != null && p[1] !== ''; })
      .map(function (p) { return p[0] + '=' + encodeURIComponent(p[1]); })
      .join('&');
  }

  // Lab link. b = { hub148, hub157, wheel, tension, spokes }; any may be
  // null and is then left out (the Lab keeps its default).
  function labHash(b, tab) {
    var t = b.tension == null ? null : snapTension(b.tension, TENSION.lab);
    var rest = join([['h1', readHub(b.hub148)], ['h2', readHub(b.hub157)],
      ['w1', WHEEL_SIZES.indexOf(b.wheel) >= 0 ? b.wheel : null],
      ['td1', t], ['ns', readSpokes(b.spokes)]]);
    return '#' + (tab || 'compare') + (rest ? '&' + rest : '');
  }
  function labLink(b, tab) { return PAGES.lab + labHash(b, tab); }

  // Widget link. b = { hubA, hubB, wheel, tension, spokes }: one build
  // setting, written to both sides. tensionClamped is true when the
  // widget's range moved the tension, so the caller can say so.
  function widgetLink(b) {
    var t = b.tension == null ? null : snapTension(b.tension, TENSION.widget);
    var w = WHEEL_SIZES.indexOf(b.wheel) >= 0 ? b.wheel : null;
    var hash = join([['h1', readHub(b.hubA)], ['h2', readHub(b.hubB)],
      ['w1', w], ['w2', w], ['td1', t], ['td2', t], ['ns', readSpokes(b.spokes)]]);
    return {
      url: PAGES.widget + (hash ? '#' + hash : ''),
      tensionClamped: t != null && t !== parseFloat(b.tension),
    };
  }

  return {
    PAGES: PAGES, WHEEL_SIZES: WHEEL_SIZES, SPOKE_COUNTS: SPOKE_COUNTS,
    TENSION: TENSION, parseHash: parseHash, snapTension: snapTension,
    readSide: readSide, readHub: readHub, readSpokes: readSpokes,
    labHash: labHash, labLink: labLink, widgetLink: widgetLink,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WheelBuildLink;
}
if (typeof window !== 'undefined') {
  window.WheelBuildLink = WheelBuildLink;
}
