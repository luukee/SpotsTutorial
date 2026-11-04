/** EN/ES localization from /translations.csv. */
import { state } from './state.js';
import { render } from './render-ref.js';
import { stopSpeaking } from './speech.js';

const translations = new Map();
export let translationsLoaded = false;

export function t(en, fallbackEs) {
  if (state.language !== 'es' || !en) return en || '';
  const fromCsv = translations.get(en);
  if (fromCsv) return fromCsv;
  return fallbackEs || en;
}
// Data labels (body parts, activities, feelings) — keyed by `item.label`.

export function tLabel(item) {
  if (!item) return '';
  return t(item.label || item.name || '');
}
// Kept for clarity at call sites; same lookup as `t(name)`.

export function tSymptom(name) { return t(name); }

export function tOption(label) { return t(label); }

// Replace `{key}` placeholders in loc strings (Listen scripts, aria labels).

export function fillTemplate(str, vars) {
  return String(str).replace(/\{(\w+)\}/g, (_, key) => (
    vars[key] != null ? String(vars[key]) : ''
  ));
}

// Join spoken sentences so TTS pauses between clauses (mirrors spots-app
// joinSpokenSentences).

export function joinSpokenSentences(parts) {
  const cleaned = parts.map((part) => String(part || '').trim()).filter(Boolean);
  if (cleaned.length === 0) return '';
  return cleaned
    .map((part, index) => {
      if (index === cleaned.length - 1) return part;
      if (/[.!?]$/u.test(part)) return part;
      return part + '.';
    })
    .join(' ');
}

// ---- Read aloud (browser speechSynthesis; mirrors spots-app hooks) ----

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      cell += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(cell); cell = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; continue; }
    cell += c; i++;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export function loadTranslations() {
  return fetch('/translations.csv', { cache: 'no-cache' })
    .then(r => r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status)))
    .then(text => {
      // Strip UTF-8 BOM if present — Excel and some editors add one when
      // saving CSV, which would corrupt the first header column name and
      // break en/es column detection.
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      const rows = parseCsv(text);
      // First row is header. Find column indexes by name so column order can
      // be reordered in the spreadsheet without breaking the runtime.
      if (!rows.length) return;
      const header = rows[0].map(h => h.trim().toLowerCase());
      const enIdx = header.indexOf('en');
      const esIdx = header.indexOf('es');
      if (enIdx < 0 || esIdx < 0) {
        console.warn('translations.csv: missing en/es column');
        return;
      }
      for (let r = 1; r < rows.length; r++) {
        const en = (rows[r][enIdx] || '').trim();
        const es = (rows[r][esIdx] || '').trim();
        if (en && es) translations.set(en, es);
      }
      translationsLoaded = true;
    })
    .catch(err => {
      console.warn('translations.csv failed to load — falling back to English:', err);
    });
}

// Real Figma SVG nav icons (each already includes its colored circle background)
const NAV_ICONS = {
  'past-problems': './assets/SPOTSNavBarIcons/SPOTS-Prior-Problem-Icon_02.svg',
  'body-parts':    './assets/SPOTSNavBarIcons/SPOTS-Body-Parts-Icon_02.svg',
  'activities':    './assets/SPOTSNavBarIcons/SPOTS-Activities-Icon_02.svg',
  'feelings':      './assets/SPOTSNavBarIcons/SPOTS-Feelings-Icon_02.svg',
  'search':        './assets/SPOTSNavBarIcons/SPOTS-Search-Icon_02.svg',
  'report':        './assets/SPOTSNavBarIcons/SPOTS-Reports-Icon_01.svg',
};

// ----------------------------- header -----------------------------

export function setLanguage(lang) {
  if (lang !== 'en' && lang !== 'es') return;
  stopSpeaking();
  state.language = lang;
  try {
    document.documentElement.setAttribute('lang', lang);
    document.title = lang === 'es' ? 'Tutorial SPOTS' : 'SPOTS Tutorial';
  } catch (e) { /* SSR safety */ }
  render();
}

// Lightweight CSV parser — handles RFC 4180 double-quoted fields with
// escaped quotes (`""`). Returns array of rows; each row is array of strings.
