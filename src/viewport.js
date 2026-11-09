/**
 * Viewport / embed layout helpers.
 *
 * Layman: When the tutorial opens inside the SPOTS app modal, keep the
 * desktop header even if the iframe is a bit narrow.
 *
 * Technical: `?embed=1` sets `html.embed-desktop` and forces
 * `isNarrowViewport()` false so JS chrome matches the CSS guard.
 */

const EMBED_CLASS = 'embed-desktop';
const NARROW_QUERY = '(max-width: 1023px)';
const WIDE_QUERY = '(min-width: 1024px)';

function readEmbedFlag() {
  try {
    return new URLSearchParams(window.location.search).get('embed') === '1';
  } catch {
    return false;
  }
}

/** True when opened with `?embed=1` (spots-app modal iframe). */
export const isEmbedDesktop = readEmbedFlag();

if (isEmbedDesktop) {
  document.documentElement.classList.add(EMBED_CLASS);
}

/** Phone/tablet chrome breakpoint, unless embed forces desktop. */
export function isNarrowViewport() {
  if (isEmbedDesktop) return false;
  return window.matchMedia(NARROW_QUERY).matches;
}

/**
 * Call `onWide` when crossing into ≥1024px (or always no-op in embed mode).
 * Mirrors the previous main.js matchMedia('(min-width: 1024px)') listener.
 */
export function onWideViewportChange(onWide) {
  if (isEmbedDesktop) return;
  window.matchMedia(WIDE_QUERY).addEventListener('change', (e) => {
    if (e.matches) onWide();
  });
}
