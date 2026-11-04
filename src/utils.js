import { t } from './i18n.js';

export function categoryLabelFor(sym) {
  const SEARCH = t('Search');
  const PAST = t('Past Problems');
  const BODY = t('Body Parts');
  const ACT = t('Activities');
  const FEEL = t('Feelings');
  const byOrigin = {
    'search': SEARCH,
    'past-problems': PAST,
    'body-parts': BODY,
    'body-part-detail': BODY,
    'activities': ACT,
    'activity-detail': ACT,
    'feelings': FEEL,
  };
  if (byOrigin[sym.originScreen]) return byOrigin[sym.originScreen];
  const byCat = {
    'body_parts': BODY,
    'activities': ACT,
    'feelings': FEEL,
    'search': SEARCH,
    'prior-problems': PAST,
  };
  return byCat[sym.category] || t('Problem');
}

export function formatDateMDY(d) {
  const dt = d instanceof Date ? d : (d ? new Date(d) : new Date());
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${dt.getFullYear()}`;
}

// Trash glyph for the Problem Station row remove action. Inlined SVG so we
// can color it via `currentColor` (red) without a separate asset fetch.
export const TRASH_SVG =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<polyline points="3 6 5 6 21 6"/>' +
  '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>' +
  '<path d="M10 11v6"/><path d="M14 11v6"/>' +
  '<path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>' +
  '</svg>';
