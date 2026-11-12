/* ── "Copy result": the comparison as plain text ─────────────────────────────
 * Shared by postmillennium-MTB/MTB-wheel-lab (build-time import) and
 * postmillennium-MTB/wheel-comparison-widget2 (pasted copy, same as
 * build-link.js). One file so both tools word a pasted result identically.
 *
 * Not physics. It only puts numbers the tool already computed with engine.js
 * (Matthew Ford's Mode Matrix method) into sentences a reader can paste into
 * a plain-text box such as a Pinkbike comment, which shows no link preview.
 *
 * Strength and stiffness get separate, labelled lines on purpose: they are
 * different properties and can disagree. Strength (F_lat) is the sideways
 * load at which the first spoke goes slack, in kgf. Stiffness (K_lat) is the
 * sideways load per millimetre of flex, in N/mm.
 *
 * resultText({
 *   a: { label: '148x12 (Onyx MFU)', F_lat: 38.3, K_lat: 95.1, wheel: '29', tension: 120 },
 *   b: { label: '157x12 (Onyx MFU)', F_lat: 45.8, K_lat: 99.4, wheel: '29', tension: 120 },
 *   spokes: '28',
 *   url: 'https://www.postmillenniumrenaissance.com/wheel-lab/#compare&...',
 * })
 *
 * A side whose F_lat is not a positive number (a build at or past its
 * buckling tension, where first-slack strength has no meaning) is reported
 * as such rather than given a percentage.
 *
 * Same packaging rule as engine.js: no import/export keyword, so it works as
 * a plain <script>, under Node's require(), and through a bundler.
 */
var WheelShareText = (function () {
  // Below this difference (percent) the two are called equal; matches the
  // widget's own verdict text.
  var EQUAL_PCT = 0.05;

  function ok(v) { return typeof v === 'number' && isFinite(v) && v > 0; }

  // Percent gap measured against the smaller value, as both tools' headlines
  // do. Whole percent from 1% up, one decimal below that.
  function pct(x, y) {
    var d = Math.abs(x - y) / Math.min(x, y) * 100;
    return { d: d, text: (d >= 1 ? Math.round(d) : Math.round(d * 10) / 10) + '%' };
  }

  function compare(a, b, key, digits, unit, adjective) {
    var va = a[key], vb = b[key];
    var pair = ' (' + a.label + ' ' + va.toFixed(digits) + ' ' + unit + ', ' +
      b.label + ' ' + vb.toFixed(digits) + ' ' + unit + ')';
    var p = pct(va, vb);
    if (p.d < EQUAL_PCT) return 'about the same' + pair;
    var win = va > vb ? a : b, lose = va > vb ? b : a;
    return win.label + ' is ' + p.text + ' ' + adjective + ' than ' + lose.label + pair;
  }

  function buildLine(a, b, spokes) {
    var sp = spokes ? spokes + ' spokes' : null;
    if (a.wheel === b.wheel && a.tension === b.tension) {
      return 'Build: ' + [a.wheel + '"', sp, a.tension + ' kgf drive-side spoke tension']
        .filter(Boolean).join(', ') + '.';
    }
    var side = function (s) { return s.label + ' ' + s.wheel + '" at ' + s.tension + ' kgf'; };
    return 'Build: ' + side(a) + '; ' + side(b) + (sp ? '; ' + sp : '') +
      ' (drive-side spoke tension).';
  }

  function resultText(r) {
    var a = r.a, b = r.b, lines = [];
    if (ok(a.F_lat) && ok(b.F_lat)) {
      lines.push('Lateral STRENGTH (sideways load before the first spoke goes slack): ' +
        compare(a, b, 'F_lat', 1, 'kgf', 'stronger') + '.');
    } else {
      var gone = [a, b].filter(function (s) { return !ok(s.F_lat); })
        .map(function (s) { return s.label; }).join(' and ');
      lines.push('Lateral STRENGTH: no figure for ' + gone +
        ', which is at or past its buckling tension.');
    }
    if (ok(a.K_lat) && ok(b.K_lat)) {
      lines.push('Lateral STIFFNESS (sideways load per mm of flex, a different property): ' +
        compare(a, b, 'K_lat', 0, 'N/mm', 'stiffer') + '.');
    }
    lines.push(buildLine(a, b, r.spokes));
    lines.push("Model: Matthew Ford's Mode Matrix method (Ford 2018, PhD thesis, Northwestern).");
    if (r.url) lines.push(r.url);
    return lines.join('\n');
  }

  return { resultText: resultText, EQUAL_PCT: EQUAL_PCT };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WheelShareText;
}
if (typeof window !== 'undefined') {
  window.WheelShareText = WheelShareText;
}
