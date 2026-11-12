/* ── "My wheel": one build remembered in the visitor's own browser ──────────
 * Shared by postmillennium-MTB/MTB-wheel-lab (build-time import) and
 * postmillennium-MTB/wheel-comparison-widget2 (pasted copy, same as
 * build-link.js). One file so both tools read and write the same record and
 * a wheel saved in one tool opens in the other.
 *
 * Not physics. It stores the settings of one build: a hub from the shared
 * catalogue (h1..h31, listed hubs only), its axle standard, wheel size,
 * drive-side tension and spoke count. Each tool then runs its own engine
 * (Matthew Ford's Mode Matrix method) on it as usual.
 *
 * Where it lives: localStorage under one key, on this device only. No
 * account, no server, no cookie; nothing leaves the browser. Storage can be
 * missing or blocked (private windows, blocked site data), so every call is
 * wrapped and simply reports "nothing saved" or "not saved".
 *
 * A shared link always wins: a tool applies the saved wheel only when the
 * address it was opened with carries no build of its own (linkHasBuild).
 *
 * Both tools must read the same storage, which means the same web origin.
 * The Lab runs on www.postmillenniumrenaissance.com itself; the widget runs
 * in an iframe served from postmillennium-mtb.github.io, whose own storage
 * the Lab cannot see. So when framed by the PMR page, the widget asks that
 * page to read and write the record for it (postMessage), passing the
 * stored text made by serialize() and reading it back with parse(). The
 * page only stores the text; both tools validate it with clean() on read.
 *
 * Same packaging rule as engine.js: no import/export keyword, so it works as
 * a plain <script>, under Node's require(), and through a bundler.
 */
var WheelMyWheel = (function () {
  var KEY = 'pmr-my-wheel';
  var VERSION = 1;
  var STANDARDS = ['148', '157'];
  var WHEEL_SIZES = ['26', '27.5', '29', '32'];
  var SPOKE_COUNTS = ['28', '32', '36'];
  // Widest range either tool offers (Lab 80-125, widget 95-125); each tool
  // snaps the saved value into its own range when it applies it.
  var TENSION_MIN = 80, TENSION_MAX = 125;
  var HUB_ID = /^h\d{1,3}$/;
  // Hash keys that carry a build (js/build-link.js). Others, such as the
  // widget's theme (th) or view (sm), do not count as a shared build.
  var BUILD_KEYS = ['h1', 'h2', 'w1', 'w2', 'td1', 'td2', 'ns'];

  function store(s) {
    if (s) return s;
    try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
  }

  // A clean copy of b, or null when any field is missing or not allowed.
  function clean(b) {
    if (!b || typeof b !== 'object') return null;
    var hub = String(b.hub || ''), std = String(b.std || ''), wheel = String(b.wheel || '');
    var spokes = String(b.spokes || ''), tension = Number(b.tension);
    if (!HUB_ID.test(hub) || STANDARDS.indexOf(std) < 0 || WHEEL_SIZES.indexOf(wheel) < 0 ||
        SPOKE_COUNTS.indexOf(spokes) < 0 || !isFinite(tension) ||
        tension < TENSION_MIN || tension > TENSION_MAX) return null;
    return { hub: hub, std: std, wheel: wheel, tension: tension, spokes: spokes };
  }

  // Stored text <-> build. parse() returns null for anything not a valid,
  // current-version record, so a damaged or foreign value reads as nothing.
  function serialize(b) {
    var c = clean(b);
    return c ? JSON.stringify({ v: VERSION, build: c }) : null;
  }
  function parse(text) {
    try {
      var rec = JSON.parse(text);
      return rec && rec.v === VERSION ? clean(rec.build) : null;
    } catch (e) { return null; }
  }

  function load(storage) {
    var s = store(storage);
    if (!s) return null;
    try { return parse(s.getItem(KEY)); } catch (e) { return null; }
  }

  // Returns true when saved. b = { hub, std, wheel, tension, spokes }.
  function save(b, storage) {
    var text = serialize(b), s = store(storage);
    if (!text || !s) return false;
    try { s.setItem(KEY, text); return true; } catch (e) { return false; }
  }

  function clear(storage) {
    var s = store(storage);
    if (!s) return false;
    try { s.removeItem(KEY); return true; } catch (e) { return false; }
  }

  // True when a URL hash carries any build setting, i.e. it is a shared or
  // bookmarked build that must open as sent rather than as "my wheel".
  function linkHasBuild(hash) {
    var found = false;
    String(hash || '').replace(/^#/, '').split('&').forEach(function (pair) {
      var k = pair.split('=')[0];
      if (pair.indexOf('=') > 0 && BUILD_KEYS.indexOf(k) >= 0) found = true;
    });
    return found;
  }

  // "Hope Pro5 6-Bolt 148x12 · 29" · 32 spokes · 120 kgf"
  function describe(b, hubName) {
    return (hubName || b.hub) + ' · ' + b.wheel + '" · ' + b.spokes +
      ' spokes · ' + b.tension + ' kgf';
  }

  return {
    KEY: KEY, load: load, save: save, clear: clear, clean: clean,
    serialize: serialize, parse: parse,
    linkHasBuild: linkHasBuild, describe: describe,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WheelMyWheel;
}
if (typeof window !== 'undefined') {
  window.WheelMyWheel = WheelMyWheel;
}
