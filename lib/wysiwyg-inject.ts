/**
 * Runtime WYSIWYG injection — works on any pitch HTML regardless of how it was built.
 *
 * Strategy:
 * - Click on a text element → activate contenteditable, show toolbar
 * - Click on NON-text elements (navigation, buttons) → pass through so pitch can navigate
 * - While an element is active: all keyboard events are intercepted (no arrow-key slide change)
 * - ESC or click outside text → deactivate
 * - postMessage { type:'getHtml' } → edits applied to ORIGINAL HTML (received from parent
 *   via postMessage), preventing framework state pollution (active classes, inline styles, etc.)
 */
export const WYSIWYG_SCRIPT = `
<script id="__cc_wysiwyg">
(function () {
  /* ─── config ────────────────────────────────────────────────────────── */
  var SEMANTIC_SEL = 'h1,h2,h3,h4,h5,h6,p,li,td,th,blockquote,figcaption';
  var SKIP_SEL     = '#__cc_toolbar,#__cc_emoji_picker,#__cc_wysiwyg,script,style,noscript,svg,canvas,img,video,audio,iframe';
  var SKIP_TAGS    = new Set(['SCRIPT','STYLE','NOSCRIPT','SVG','CANVAS','IMG','VIDEO','AUDIO','IFRAME','INPUT','TEXTAREA','SELECT','BUTTON','A']);

  var EMOJIS = [
    '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😉','😊','😇','🥰','😍','🤩','😘',
    '😋','😛','😜','🤪','😎','🤓','🤔','😐','😑','😶','😏','😒','🙄','😬','😤','😡',
    '😠','🤬','😈','👿','💀','☠️','😱','😨','😰','😥','😢','😭','😓','😩','😫','🥱',
    '😴','🥳','🤯','🤠','🥸','😕','🙁','☹️','😮','😲','😳','🥺','😦','😧',
    '👋','✋','👌','✌️','🤞','🫶','👍','👎','✊','👏','🙌','🙏','💪','🤝',
    '👀','👄','💋','👅','🫀','🧠',
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','💕','💞','💓','💗','💖','💘','💝',
    '✅','❌','⭕','💯','🔥','⚡','🌟','💫','✨','🎉','🎊','🎈','🏆','🥇','🎯',
    '🌞','🌝','🌛','🌚','🌕','🌙','⭐','🌈','☀️','⛅','🌧️','⛈️','❄️','☃️','🌊',
    '🍎','🍊','🍋','🍇','🍓','🍒','🥑','🍕','🍔','🌮','🍜','🍣','🎂','🍰','🧁',
    '🍩','🍪','☕','🧃','🥤','🍺','🥂','🍾','🧋',
    '🐶','🐱','🐭','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🦄',
    '🐔','🦅','🦋','🐝','🌸','🌺','🌻','🌹','🌿','🍀','🍁','🍄',
    '📱','💻','🖥️','⌨️','📷','📸','🎥','🎬','📺','📻','🔊','📚','📖',
    '✏️','📝','✂️','🔑','🔒','💡','🔦','🧲','⚙️','🔧','🔨','🪛',
    '🚗','🚕','✈️','🚀','🛸','🚂','🚢','⛵','🚲','🛴','🏠','🏢','🗼','🗽',
    '💰','💵','💳','📈','📉','📊','💼','📋','📌','📎','🖊️','📬',
    '🎸','🎵','🎶','🎮','🕹️','🎲','🎭','🎨','🖼️','🎪','🎠','🎡',
    '⚽','🏀','🏈','⚾','🎾','🏐','🎱','🏓','🥊','🏋️','🤸','🧘',
    '1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','0️⃣',
    '▶️','⏸️','⏹️','⏭️','⏮️','🔀','🔁','➕','➖','✖️','➗',
    '🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤',
    '🇩🇰','🇸🇪','🇳🇴','🇺🇸','🇬🇧','🇩🇪','🇫🇷','🇪🇸',
  ];

  /* ─── state ──────────────────────────────────────────────────────────── */
  var activeEl    = null;
  var hoveredEl   = null;
  var toolbar     = null;
  var szInput     = null;
  var clrInput    = null;
  var emojiPicker = null;
  var savedRange  = null;
  var originalHtml = null;          /* received from parent via postMessage */
  var activatedInnerHTML = '';
  var edits       = {};             /* keyed by element path → {innerHTML, fontSize, color} */

  /* ─── helpers ────────────────────────────────────────────────────────── */
  function skip(el) {
    if (!el) return true;
    if (el.closest(SKIP_SEL)) return true;
    return false;
  }

  function hasDirectText(el) {
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3 && n.textContent.trim().length > 0) return true;
    }
    return false;
  }

  function findText(target) {
    var el = target;
    while (el && el !== document.body) {
      if (!skip(el) && !SKIP_TAGS.has(el.tagName)) {
        if (el.matches && el.matches(SEMANTIC_SEL)) return el;
        if (hasDirectText(el)) return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  function rgbToHex(rgb) {
    var m = String(rgb).match(/rgb\\\\((\\\\d+),\\\\s*(\\\\d+),\\\\s*(\\\\d+)\\\\)/);
    if (!m) return '#ffffff';
    return '#' + [m[1],m[2],m[3]].map(function(n){ return (+n).toString(16).padStart(2,'0'); }).join('');
  }

  /* ─── element path (for mapping edits to original HTML) ────────────── */
  function getPath(el) {
    var parts = [];
    var node = el;
    while (node && node !== document.body && node.parentElement) {
      var idx = 0;
      var sib = node.previousElementSibling;
      while (sib) {
        if (sib.tagName === node.tagName) idx++;
        sib = sib.previousElementSibling;
      }
      parts.unshift(node.tagName + ':' + idx);
      node = node.parentElement;
    }
    return parts.join('/');
  }

  function followPath(root, pathStr) {
    var parts = pathStr.split('/');
    var current = root;
    for (var p = 0; p < parts.length; p++) {
      var m = parts[p].match(/^([A-Z0-9]+):(\\\\d+)$/);
      if (!m) return null;
      var tag = m[1], idx = +m[2];
      var count = 0;
      var found = false;
      for (var c = 0; c < current.children.length; c++) {
        if (current.children[c].tagName === tag) {
          if (count === idx) {
            current = current.children[c];
            found = true;
            break;
          }
          count++;
        }
      }
      if (!found) return null;
    }
    return current;
  }

  /* ─── emoji cursor handling ──────────────────────────────────────────── */
  function saveRange() {
    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRange = sel.getRangeAt(0).cloneRange();
  }

  function insertEmoji(emoji) {
    if (!activeEl) return;
    activeEl.focus();
    if (savedRange) {
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
    }
    var sel2 = window.getSelection();
    if (sel2 && sel2.rangeCount > 0) {
      var range = sel2.getRangeAt(0);
      range.deleteContents();
      var tn = document.createTextNode(emoji);
      range.insertNode(tn);
      range.setStartAfter(tn);
      range.collapse(true);
      sel2.removeAllRanges();
      sel2.addRange(range);
    } else {
      document.execCommand('insertText', false, emoji);
    }
    savedRange = null;
    closeEmojiPicker();
  }

  function closeEmojiPicker() {
    if (emojiPicker) {
      emojiPicker.style.display = 'none';
    }
  }

  function toggleEmojiPicker(anchorEl) {
    if (!emojiPicker) buildEmojiPicker();
    if (emojiPicker.style.display !== 'none') {
      closeEmojiPicker();
      return;
    }
    saveRange();
    /* position below toolbar */
    var rect = anchorEl.getBoundingClientRect();
    emojiPicker.style.top = (rect.bottom + 6) + 'px';
    emojiPicker.style.left = Math.min(rect.left, window.innerWidth - 300) + 'px';
    emojiPicker.style.display = 'block';
  }

  function buildEmojiPicker() {
    var p = document.createElement('div');
    p.id = '__cc_emoji_picker';
    p.setAttribute('data-cc-skip','1');
    p.style.cssText = [
      'position:fixed;z-index:2147483646',
      'background:#18181b;border:1px solid #3f3f46;border-radius:10px',
      'padding:8px;width:288px;max-height:240px;overflow-y:auto',
      'box-shadow:0 8px 32px rgba(0,0,0,.7)',
      'display:none',
      'font-size:22px;line-height:1;',
    ].join(';');

    /* search */
    var search = document.createElement('input');
    search.type = 'text';
    search.placeholder = 'Search…';
    search.setAttribute('data-cc-skip','1');
    search.style.cssText = 'width:100%;box-sizing:border-box;background:#27272a;border:1px solid #52525b;color:#fff;border-radius:6px;padding:4px 8px;font-size:12px;margin-bottom:6px;outline:none;';
    search.addEventListener('mousedown', function(e){ e.stopPropagation(); });
    search.addEventListener('keydown', function(e){ e.stopPropagation(); });
    search.addEventListener('input', function(){
      var q = search.value.toLowerCase();
      grid.innerHTML = '';
      var list = q ? EMOJIS.filter(function(em){ return em.toLowerCase().includes(q); }) : EMOJIS;
      list.forEach(addEmoji);
    });
    p.appendChild(search);

    var grid = document.createElement('div');
    grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:2px;';
    EMOJIS.forEach(addEmoji);
    p.appendChild(grid);

    function addEmoji(em) {
      var btn = document.createElement('button');
      btn.textContent = em;
      btn.setAttribute('data-cc-skip','1');
      btn.title = em;
      btn.style.cssText = 'background:none;border:none;cursor:pointer;border-radius:4px;width:32px;height:32px;font-size:18px;display:flex;align-items:center;justify-content:center;';
      btn.addEventListener('mouseenter', function(){ btn.style.background='#3f3f46'; });
      btn.addEventListener('mouseleave', function(){ btn.style.background='none'; });
      btn.addEventListener('mousedown', function(e){
        e.preventDefault();
        e.stopPropagation();
        insertEmoji(em);
      });
      grid.appendChild(btn);
    }

    document.body.appendChild(p);
    emojiPicker = p;
  }

  /* ─── toolbar ────────────────────────────────────────────────────────── */
  function buildToolbar() {
    var t = document.createElement('div');
    t.id = '__cc_toolbar';
    t.setAttribute('data-cc-skip','1');
    t.style.cssText = [
      'position:fixed;top:10px;left:50%;transform:translateX(-50%)',
      'background:#18181b;border:1px solid #3f3f46;border-radius:10px',
      'padding:6px 10px;display:flex;gap:6px;align-items:center',
      'z-index:2147483647;box-shadow:0 8px 32px rgba(0,0,0,.7)',
      'font-family:system-ui,sans-serif;font-size:13px;color:#fff',
      'user-select:none;pointer-events:all',
    ].join(';');

    function mkBtn(html, title, cmd) {
      var b = document.createElement('button');
      b.innerHTML = html;
      b.title = title;
      b.setAttribute('data-cc-skip','1');
      b.style.cssText = 'background:none;border:1px solid #52525b;color:#fff;min-width:28px;height:28px;border-radius:5px;cursor:pointer;font-size:13px;padding:0 6px;';
      b.addEventListener('mouseenter', function(){ b.style.background='#3f3f46'; });
      b.addEventListener('mouseleave', function(){ b.style.background='none'; });
      b.addEventListener('mousedown', function(e){ e.preventDefault(); e.stopPropagation(); document.execCommand(cmd); });
      return b;
    }

    t.appendChild(mkBtn('<b>B</b>','Bold','bold'));
    t.appendChild(mkBtn('<i>I</i>','Italic','italic'));
    t.appendChild(mkBtn('<u>U</u>','Underline','underline'));

    var sep = document.createElement('div');
    sep.style.cssText = 'width:1px;height:20px;background:#3f3f46;';

    t.appendChild(sep.cloneNode());

    /* font size */
    var szWrap = document.createElement('label');
    szWrap.style.cssText = 'display:flex;align-items:center;gap:4px;color:#a1a1aa;font-size:12px;cursor:default;';
    szWrap.textContent = 'px ';
    szInput = document.createElement('input');
    szInput.type = 'number'; szInput.min = '6'; szInput.max = '400';
    szInput.setAttribute('data-cc-skip','1');
    szInput.style.cssText = 'width:48px;background:#27272a;border:1px solid #52525b;color:#fff;border-radius:5px;padding:2px 6px;font-size:12px;';
    szInput.addEventListener('mousedown', function(e){ e.stopPropagation(); });
    szInput.addEventListener('keydown', function(e){ e.stopPropagation(); });
    szInput.addEventListener('change', function(){
      if (activeEl) activeEl.style.fontSize = szInput.value + 'px';
    });
    szWrap.prepend(szInput);
    t.appendChild(szWrap);

    t.appendChild(sep.cloneNode());

    /* text color */
    var clrWrap = document.createElement('label');
    clrWrap.style.cssText = 'display:flex;align-items:center;gap:4px;color:#a1a1aa;font-size:12px;cursor:pointer;';
    clrWrap.textContent = 'Color';
    clrInput = document.createElement('input');
    clrInput.type = 'color';
    clrInput.setAttribute('data-cc-skip','1');
    clrInput.style.cssText = 'width:28px;height:24px;border:1px solid #52525b;border-radius:4px;cursor:pointer;padding:1px;background:none;';
    clrInput.addEventListener('mousedown', function(e){ e.stopPropagation(); });
    clrInput.addEventListener('input', function(){
      if (activeEl) activeEl.style.color = clrInput.value;
    });
    clrWrap.prepend(clrInput);
    t.appendChild(clrWrap);

    t.appendChild(sep.cloneNode());

    /* emoji button */
    var emojiBtn = document.createElement('button');
    emojiBtn.textContent = '😀';
    emojiBtn.title = 'Insert emoji';
    emojiBtn.setAttribute('data-cc-skip','1');
    emojiBtn.style.cssText = 'background:none;border:1px solid #52525b;color:#fff;min-width:28px;height:28px;border-radius:5px;cursor:pointer;font-size:16px;padding:0 4px;';
    emojiBtn.addEventListener('mouseenter', function(){ emojiBtn.style.background='#3f3f46'; });
    emojiBtn.addEventListener('mouseleave', function(){ emojiBtn.style.background='none'; });
    emojiBtn.addEventListener('mousedown', function(e){
      e.preventDefault();
      e.stopPropagation();
      toggleEmojiPicker(emojiBtn);
    });
    t.appendChild(emojiBtn);

    t.appendChild(sep.cloneNode());

    var doneBtn = document.createElement('button');
    doneBtn.textContent = 'Done';
    doneBtn.setAttribute('data-cc-skip','1');
    doneBtn.style.cssText = 'background:#2563eb;border:none;color:#fff;padding:0 12px;height:28px;border-radius:5px;cursor:pointer;font-size:12px;font-weight:600;';
    doneBtn.addEventListener('mousedown', function(e){ e.preventDefault(); e.stopPropagation(); deactivate(); });
    t.appendChild(doneBtn);

    document.body.appendChild(t);
    toolbar = t;
  }

  /* ─── activate / deactivate ──────────────────────────────────────────── */
  function activate(el) {
    if (activeEl === el) return;
    deactivate();

    activeEl = el;
    activatedInnerHTML = el.innerHTML;
    el.contentEditable = 'true';
    el.setAttribute('data-cc-editing','1');
    el.style.outline = '2px solid #2563eb';
    el.style.outlineOffset = '2px';
    el.style.cursor = 'text';
    el.focus();

    if (!toolbar) buildToolbar();
    toolbar.style.display = 'flex';

    var cs = window.getComputedStyle(el);
    szInput.value  = Math.round(parseFloat(cs.fontSize));
    clrInput.value = rgbToHex(cs.color);

    window.parent.postMessage({ type:'editingActive', editing:true }, '*');
  }

  function deactivate() {
    closeEmojiPicker();
    if (!activeEl) return;

    /* Record edit if anything changed */
    var htmlChanged = activeEl.innerHTML !== activatedInnerHTML;
    var hasFontSize = activeEl.style.fontSize !== '';
    var hasColor    = activeEl.style.color !== '';
    if (htmlChanged || hasFontSize || hasColor) {
      var p = getPath(activeEl);
      edits[p] = {
        innerHTML: activeEl.innerHTML,
        fontSize: activeEl.style.fontSize || '',
        color: activeEl.style.color || '',
      };
    }

    activeEl.contentEditable = 'false';
    activeEl.removeAttribute('data-cc-editing');
    activeEl.style.outline = '';
    activeEl.style.outlineOffset = '';
    activeEl.style.cursor = '';
    activeEl.blur();
    activeEl = null;
    savedRange = null;
    if (toolbar) toolbar.style.display = 'none';
    window.parent.postMessage({ type:'editingActive', editing:false }, '*');
  }

  /* ─── event interception ─────────────────────────────────────────────── */
  document.addEventListener('click', function(e) {
    if (e.target && e.target.closest('#__cc_toolbar')) return;
    if (e.target && e.target.closest('#__cc_emoji_picker')) return;

    var textEl = findText(e.target);

    if (textEl) {
      e.stopImmediatePropagation();
      e.preventDefault();
      closeEmojiPicker();
      activate(textEl);
    } else if (activeEl) {
      closeEmojiPicker();
      deactivate();
      /* let click through so navigation still works */
    }
  }, true);

  document.addEventListener('mousedown', function(e) {
    if (e.target && e.target.closest('#__cc_toolbar')) return;
    if (e.target && e.target.closest('#__cc_emoji_picker')) return;

    var textEl = findText(e.target);
    if (textEl) {
      e.stopImmediatePropagation();
      if (!activeEl || e.target !== activeEl) e.preventDefault();
    }
  }, true);

  document.addEventListener('keydown', function(e) {
    if (!activeEl) return;
    e.stopImmediatePropagation();
    if (e.key === 'Escape') { e.preventDefault(); deactivate(); }
  }, true);

  document.addEventListener('touchstart', function(e) {
    if (e.target && e.target.closest('#__cc_toolbar')) return;
    if (e.target && e.target.closest('#__cc_emoji_picker')) return;
    var textEl = findText(e.target);
    if (textEl) e.stopImmediatePropagation();
  }, true);

  /* ─── hover highlight ────────────────────────────────────────────────── */
  document.addEventListener('mouseover', function(e) {
    if (activeEl) return;
    var el = findText(e.target);
    if (el === hoveredEl) return;
    if (hoveredEl && hoveredEl !== activeEl) {
      hoveredEl.style.outline = '';
      hoveredEl.style.cursor  = '';
    }
    hoveredEl = el;
    if (el) {
      el.style.outline = '1px dashed rgba(37,99,235,.5)';
      el.style.cursor  = 'text';
    }
  });

  document.addEventListener('mouseout', function(e) {
    if (activeEl) return;
    var el = findText(e.target);
    if (el && el === hoveredEl && el !== activeEl) {
      el.style.outline = '';
      el.style.cursor  = '';
      hoveredEl = null;
    }
  });

  /* ─── postMessage API ────────────────────────────────────────────────── */
  window.addEventListener('message', function(e) {
    if (!e.data) return;

    /* Parent sends original HTML after wysiwygReady */
    if (e.data.type === 'setOriginal') {
      originalHtml = e.data.html;
    }

    if (e.data.type === 'getHtml') {
      deactivate();

      var html;
      var editKeys = Object.keys(edits);

      if (originalHtml && editKeys.length > 0) {
        /* Apply tracked edits to the ORIGINAL HTML via DOMParser.
           This avoids baking in framework runtime state (active classes,
           inline styles, injected DOM nodes, etc.). */
        var parser = new DOMParser();
        var origDoc = parser.parseFromString(originalHtml, 'text/html');

        for (var i = 0; i < editKeys.length; i++) {
          var edit = edits[editKeys[i]];
          var target = followPath(origDoc.body, editKeys[i]);
          if (target) {
            target.innerHTML = edit.innerHTML;
            if (edit.fontSize) target.style.fontSize = edit.fontSize;
            if (edit.color) target.style.color = edit.color;
          }
        }

        html = '<!DOCTYPE html>\\n' + origDoc.documentElement.outerHTML;
      } else if (originalHtml) {
        /* No edits were made — return original unchanged */
        html = originalHtml;
      } else {
        /* Fallback: no original available — clean DOM and dump */
        if (hoveredEl) {
          hoveredEl.style.outline = '';
          hoveredEl.style.cursor = '';
          hoveredEl = null;
        }
        document.querySelectorAll('*').forEach(function(el) {
          if (!el.style) return;
          if (el.style.outline) el.style.outline = '';
          if (el.style.outlineOffset) el.style.outlineOffset = '';
          if (el.style.cursor === 'text') el.style.cursor = '';
          var sv = el.getAttribute('style');
          if (sv !== null && sv.replace(/[;\\\\s]/g, '') === '') {
            el.removeAttribute('style');
          }
        });
        if (toolbar) toolbar.remove();
        if (emojiPicker) emojiPicker.remove();
        var s = document.getElementById('__cc_wysiwyg');
        if (s) s.remove();
        document.querySelectorAll('[contenteditable]').forEach(function(el){
          el.removeAttribute('contenteditable');
        });
        document.querySelectorAll('[data-cc-editing]').forEach(function(el){
          el.removeAttribute('data-cc-editing');
        });
        document.querySelectorAll('[data-cc-skip]').forEach(function(el){
          el.removeAttribute('data-cc-skip');
        });
        html = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
      }

      window.parent.postMessage({ type: 'htmlContent', html: html }, '*');
    }
  });

  window.parent.postMessage({ type:'wysiwygReady' }, '*');
})();
</script>
`;

/**
 * Injects the WYSIWYG script as the first element in <head> so our event
 * listeners are registered before any pitch scripts — ensuring capture-phase
 * priority.
 */
export function injectWysiwyg(html: string): string {
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch && headMatch.index !== undefined) {
    const insertAt = headMatch.index + headMatch[0].length;
    return html.slice(0, insertAt) + WYSIWYG_SCRIPT + html.slice(insertAt);
  }
  // fallback: before </body>
  const bodyEnd = html.toLowerCase().lastIndexOf('</body>');
  if (bodyEnd !== -1) {
    return html.slice(0, bodyEnd) + WYSIWYG_SCRIPT + html.slice(bodyEnd);
  }
  return html + WYSIWYG_SCRIPT;
}
