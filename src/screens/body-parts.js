/** Body parts map + detail list. */
import { state, isSelected, findSelected, questionIdsForSymptom } from '../state.js';
import { tutorialProgressItems, isCurrentSessionComplete } from '../progress.js';
import { D } from '../data.js';
import { el } from '../dom.js';
import { t, tLabel, tSymptom, tOption, fillTemplate, joinSpokenSentences, setLanguage } from '../i18n.js';
import { go, logout, skipToNextSession, toggleSymptom, openEditSymptom } from '../navigation.js';
import { render } from '../render-ref.js';
import { readAloudButton, speakOptionButton, tapSpeakerTip, stopSpeaking } from '../speech.js';
import { categoryLabelFor, formatDateMDY } from '../utils.js';

import { siteHeader } from '../shell/header.js';
import { siteFooter } from '../shell/footer.js';
import { problemStation } from '../shell/problem-station.js';

export function bodyPartsScreen() {
  const isBack = !!state.showBodyBack;
  // The yellow tint always tracks the figure's RIGHT side: on the left of the
  // frame in the front view, on the right of the frame in the back view.
  const figureCol = el('div', { class: 'bp-figure-col' },
    el('div', { class: 'bp-figure' + (isBack ? ' is-back' : '') },
      el('div', { class: 'figure-labels' },
        el('span', {}, isBack ? t('Left')  : t('Right')),
        el('span', {}, isBack ? t('Right') : t('Left')),
      ),
      el('div', {
        class: 'body-svg',
        'data-svg-src': isBack ? '/assets/SPOTSBodyBackOptimized.svg' : '/assets/SPOTSBodyFrontOptimized.svg',
      }),
    ),
    el('button', {
      class: 'show-back',
      onclick: () => { state.showBodyBack = !state.showBodyBack; render(); },
    },
      el('span', { class: 'show-back-label' }, isBack ? t('Show Front') : t('Show Back')),
      el('img', { class: 'show-back-icon', src: '/assets/Rotate.svg', alt: '' }),
    ),
  );

  const body = el('div', { class: 'bp-layout' },
    figureCol,
    el('div', { class: 'bp-list-panel bp-list-panel--no-header' },
      el('div', { class: 'bp-list' },
        D.bodyParts.map(bp => el('div', {
          class: 'bp-row',
          onclick: () => {
            state.previousBodyPart = null;
            go('body-part-detail', { currentBodyPart: bp });
          },
        },
          el('img', { class: 'thumb', src: D.assetPath('BodyParts-Final', bp.image), alt: '' }),
          el('span', { class: 'row-label' }, tLabel(bp)),
          el('span', { class: 'chev' }, '›'),
        )),
      ),
    ),
  );

  return el('div', {},
    siteHeader(),
    el('main', { class: 'site-main' },
      el('h1', { class: 'page-title' }, t('Body Parts')),
      el('p', { class: 'page-subtitle' }, t('Pick the body part where you are having problems')),
      el('div', { class: 'two-col' },
        body,
        problemStation(),
      ),
    ),
    siteFooter(),
  );
}

// ---- Body Part DETAIL (figure on left, head + symptom list on right)

export function bodyPartDetailScreen() {
  const bp = state.currentBodyPart;
  const symptoms = D.bodyPartSymptoms[bp.key] || [];
  const bpLabel = tLabel(bp);
  const bodyPartListenText = symptoms.length === 0
    ? fillTemplate(
        t(
          'You picked {bodyPart}. There are no symptoms to choose from right now.',
          'Elegiste {bodyPart}. Ahora mismo no hay síntomas para elegir.',
        ),
        { bodyPart: bpLabel },
      )
    : joinSpokenSentences([
        fillTemplate(
          t(
            'You picked {bodyPart}. Which of these do you feel?',
            'Elegiste {bodyPart}. ¿Cuál de estos sientes?',
          ),
          { bodyPart: bpLabel },
        ),
        tapSpeakerTip(),
      ]);
  const list = el('div', { class: 'symptom-list' },
    symptoms.map(name => {
      const selected = isSelected('body_parts', bp.key, name);
      const displayName = tSymptom(name);
      return el('div', {
        class: 'symptom-row' + (selected ? ' is-selected' : ''),
        role: 'button',
        tabindex: '0',
        'aria-pressed': selected ? 'true' : 'false',
        onclick: () => toggleSymptom('body_parts', bp.key, bp.label, name),
        onkeydown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleSymptom('body_parts', bp.key, bp.label, name);
          }
        },
      },
        el('span', { class: 'symptom-row-label' }, displayName),
        speakOptionButton(displayName),
      );
    }),
  );

  const isSkin = bp.key === 'skin';
  const skinPart = D.bodyParts.find(b => b.key === 'skin');
  const prev = state.previousBodyPart;

  const footerActions = [];
  if (!isSkin && skinPart) {
    footerActions.push(el('button', {
      type: 'button',
      class: 'bp-detail-action bp-detail-action--secondary',
      onclick: () => {
        state.previousBodyPart = bp;
        go('body-part-detail', { currentBodyPart: skinPart });
      },
    }, t('Go to Skin', 'Ir a Piel')));
  }
  if (isSkin && prev) {
    const prevLabel = tLabel(prev);
    footerActions.push(el('button', {
      type: 'button',
      class: 'bp-detail-action bp-detail-action--secondary',
      onclick: () => {
        const restore = state.previousBodyPart;
        state.previousBodyPart = null;
        go('body-part-detail', { currentBodyPart: restore });
      },
    }, fillTemplate(
      t('← Back to {bodyPart}', '← Volver a {bodyPart}'),
      { bodyPart: prevLabel },
    )));
  }
  footerActions.push(el('button', {
    type: 'button',
    class: 'bp-detail-action bp-detail-action--primary',
    'aria-label': t('Back to all body parts', 'Volver a todas las partes del cuerpo'),
    onclick: () => go('body-parts'),
  }, t('← All Body Parts')));

  const detail = el('div', { class: 'bp-list-panel' },
    el('div', { class: 'panel-header' },
      el('span', { class: 'panel-title' }, bpLabel),
    ),
    readAloudButton(bodyPartListenText),
    el('img', { class: 'bp-detail-figure', src: D.assetPath('BodyParts-Final', bp.image), alt: '' }),
    list,
    el('div', { class: 'bp-detail-actions' }, ...footerActions),
  );

  return el('div', {},
    siteHeader(),
    el('main', { class: 'site-main' },
      el('h1', { class: 'page-title' }, t('Body Parts')),
      el('p', { class: 'page-subtitle' }, t('Pick the body part where you are having problems')),
      el('div', { class: 'two-col' },
        el('div', { class: 'bp-layout' },
          el('div', { class: 'bp-figure-col' },
            el('div', { class: 'bp-figure' + (state.showBodyBack ? ' is-back' : '') },
              el('div', { class: 'figure-labels' },
                el('span', {}, state.showBodyBack ? t('Left') : t('Right')),
                el('span', {}, state.showBodyBack ? t('Right') : t('Left')),
              ),
              el('div', {
                class: 'body-svg',
                'data-svg-src': state.showBodyBack
                  ? '/assets/SPOTSBodyBackOptimized.svg'
                  : '/assets/SPOTSBodyFrontOptimized.svg',
              }),
            ),
            el('button', {
              class: 'show-back',
              onclick: () => { state.showBodyBack = !state.showBodyBack; render(); },
            },
              el('span', { class: 'show-back-label' }, state.showBodyBack ? t('Show Front') : t('Show Back')),
              el('img', { class: 'show-back-icon', src: '/assets/Rotate.svg', alt: '' }),
            ),
          ),
          detail,
        ),
        problemStation(),
      ),
    ),
    siteFooter(),
  );
}

// ----------------------------- body SVG hotspots -----------------------------
// Mirrors InteractiveBody.tsx in spots-app: load the SVG inline so we can
// attach click + hover handlers to each .body-part group.
const bodySvgCache = {};

export function loadAndWireBodySvgs() {
  const containers = document.querySelectorAll('.body-svg[data-svg-src]:not([data-wired])');
  containers.forEach((container) => {
    container.setAttribute('data-wired', '1');
    const src = container.getAttribute('data-svg-src');
    // Cache the fetch PROMISE (not just the resolved text) so concurrent
    // calls for the same URL share a single network roundtrip. When the
    // CSV-completion re-render runs while the SVG fetch is in flight, the
    // newly-created container hits this cached promise and gets the same
    // text — no extra request, no race.
    if (!bodySvgCache[src]) {
      const p = fetch(src)
        .then(r => r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status)))
        .catch(err => {
          // Don't lock the failure into the cache — drop it so a subsequent
          // render gets a clean retry. Otherwise one network hiccup would
          // leave the body figure permanently broken for the session.
          console.warn('body svg fetch failed', src, err);
          if (bodySvgCache[src] === p) delete bodySvgCache[src];
          return '';
        });
      bodySvgCache[src] = p;
    }
    bodySvgCache[src].then(text => {
      // Skip if `render()` recreated the DOM before the fetch resolved —
      // the closure-captured container is now detached. The new container
      // will run loadAndWireBodySvgs() itself and hit the cached promise.
      if (!text || !container.isConnected) return;
      container.innerHTML = text;
      const svg = container.querySelector('svg');
      if (!svg) return;
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      wireBodyHotspots(svg);
    });
  });
}

// Body parts whose visible artwork is too small for an easy hover target.
// We inject an invisible circular hit-zone behind each so the user can find
// them without pixel-perfect aim.
const ZONE_PARTS = new Set(['left_eye', 'right_eye', 'nose', 'mouth']);

export function ensureHotspotZone(group) {
  if (group.querySelector('.hotspot-zone')) return;
  let bbox;
  try { bbox = group.getBBox(); } catch (e) { return; }
  if (!bbox || (bbox.width === 0 && bbox.height === 0)) return;
  const pad = 7;
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;
  const r = Math.max(bbox.width, bbox.height) / 2 + pad;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', String(cx));
  circle.setAttribute('cy', String(cy));
  circle.setAttribute('r', String(r));
  circle.setAttribute('class', 'hotspot-zone');
  // Insert as first child so the actual eye/nose/mouth artwork renders on top.
  group.insertBefore(circle, group.firstChild);
}

export function wireBodyHotspots(svg) {
  const groups = svg.querySelectorAll('.body-part');
  groups.forEach((g) => {
    const partKey = (g.getAttribute('data-partview') || g.id || '').toLowerCase();
    const bp = D.bodyParts.find(b => b.key === partKey);
    if (!bp) return;
    if (ZONE_PARTS.has(partKey)) ensureHotspotZone(g);
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', tLabel(bp));
    function openPart() {
      state.previousBodyPart = null;
      go('body-part-detail', { currentBodyPart: bp });
    }
    g.addEventListener('click', openPart);
    g.addEventListener('mouseenter', () => g.classList.add('highlighted'));
    g.addEventListener('mouseleave', () => g.classList.remove('highlighted'));
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openPart();
      }
    });
  });
  // Reveal facial-feature rings only while the cursor is inside the Head
  // region (Head's mouseenter fires when entering Head OR any descendant).
  const head = svg.querySelector('.body-part[data-partview="Head" i], #Head.body-part');
  if (head) {
    head.addEventListener('mouseenter', () => svg.classList.add('head-hover'));
    head.addEventListener('mouseleave', () => svg.classList.remove('head-hover'));
  }
}
