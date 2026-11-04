/** DOM element factory for the practice guide. */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') node.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') node.innerHTML = v;
    else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

// i18n. Spanish translations live in `translations.csv` next to index.html.
// The CSV is fetched on init (see bottom of file) and parsed into the
// `translations` map below. Until it loads, `t(en)` returns English; once
// loaded, switching the footer toggle to Español flips every visible string.
//
// `t(en)`           — look up `en` in the map, fall back to `en` itself
// `t(en, fallback)` — same, but use `fallback` if the CSV doesn't have a
//                     translation for `en`. Used for dynamic strings built
//                     with interpolation (question prompts, aria labels)
//                     where the exact `en` string varies per render and
//                     can't be a stable CSV key.
//
// CSV format: three columns — `en`, `es`, `context` (context is for
// translator notes; ignored at runtime).
const translations = new Map();
let translationsLoaded = false;
