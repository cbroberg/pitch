/**
 * Server-side HTML protection injected into shared pitch content.
 *
 * IMPORTANT: This is a deterrent, not a guarantee. A technically capable
 * viewer can still extract the HTML via DevTools / network tab — no web
 * system can prevent that. These measures stop casual save/copy/right-click.
 */

const PROTECT_SNIPPET = `
<style id="pv-protect">
  * { -webkit-user-select: none !important; -moz-user-select: none !important; user-select: none !important; }
  input, textarea { -webkit-user-select: text !important; user-select: text !important; }
</style>
<script id="pv-protect-js">
(function () {
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); }, true);
  document.addEventListener('dragstart', function (e) { e.preventDefault(); }, true);
  document.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase();
    if ((e.metaKey || e.ctrlKey) && (k === 's' || k === 'u' || k === 'p')) { e.preventDefault(); e.stopPropagation(); }
    if (e.key === 'F12') { e.preventDefault(); }
  }, true);
})();
</script>
`;

function watermarkSnippet(label: string): string {
  const safe = label.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const tile = `${safe} · fortroligt`;
  return `
<style id="pv-watermark">
  #pv-watermark-overlay {
    position: fixed; inset: 0; pointer-events: none; z-index: 2147483647;
    overflow: hidden;
    background-image: repeating-linear-gradient(
      -30deg,
      transparent 0,
      transparent 240px
    );
  }
  #pv-watermark-overlay .pv-wm-row {
    position: absolute; white-space: nowrap; opacity: 0.10;
    font: 600 16px/1 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #888; transform: rotate(-30deg); transform-origin: left top;
  }
</style>
<div id="pv-watermark-overlay" aria-hidden="true"></div>
<script id="pv-watermark-js">
(function () {
  var overlay = document.getElementById('pv-watermark-overlay');
  if (!overlay) return;
  var text = ${JSON.stringify(tile)};
  function build() {
    overlay.innerHTML = '';
    var w = window.innerWidth, h = window.innerHeight;
    var stepX = 360, stepY = 180;
    for (var y = -h; y < h * 2; y += stepY) {
      for (var x = -w; x < w * 2; x += stepX) {
        var d = document.createElement('div');
        d.className = 'pv-wm-row';
        d.style.left = x + 'px';
        d.style.top = y + 'px';
        d.textContent = text;
        overlay.appendChild(d);
      }
    }
  }
  build();
  var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(build, 200); });
})();
</script>
`;
}

/**
 * Inject protection/watermark into an HTML document string.
 * Injected before </body> (fallback: appended).
 */
export function injectProtection(
  html: string,
  opts: { protect: boolean; watermark: boolean; watermarkLabel?: string },
): string {
  if (!opts.protect && !opts.watermark) return html;

  let snippet = '';
  if (opts.protect) snippet += PROTECT_SNIPPET;
  if (opts.watermark) snippet += watermarkSnippet(opts.watermarkLabel || 'Fortroligt');

  if (html.includes('</body>')) {
    return html.replace('</body>', `${snippet}</body>`);
  }
  return html + snippet;
}
