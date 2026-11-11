/** Guided hint / walkthrough stages (kept together this phase). */
import { state, isSelected, findSelected, questionIdsForSymptom } from './state.js';
import { tutorialProgressItems, isCurrentSessionComplete } from './progress.js';
import { D } from './data.js';
import { el } from './dom.js';
import { t, tLabel, tSymptom, tOption, fillTemplate, joinSpokenSentences, setLanguage } from './i18n.js';
import { go, logout, skipToNextSession, toggleSymptom, openEditSymptom } from './navigation.js';
import { render } from './render-ref.js';
import { readAloudButton, speakOptionButton, tapSpeakerTip, stopSpeaking } from './speech.js';
import { categoryLabelFor, formatDateMDY, TRASH_SVG } from './utils.js';
import { NAV_ICONS } from './nav-icons.js';
import { siteHeader, logoCorner, navButton } from './shell/header.js';
import { siteFooter } from './shell/footer.js';
import { problemStation } from './shell/problem-station.js';

// Reusable cursor SVG (white-fill black-stroke pointer) for walkthrough demos.
const HINT_CURSOR_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M3 2 L3 19 L8 14.5 L11 21 L14 19.5 L11 13 L18 13 Z" ' +
  'fill="#ffffff" stroke="#101828" stroke-width="1.4" stroke-linejoin="round"/>' +
  '</svg>';

export function hintMiniHeader(concreteKey, extras, opts) {
  const concreteAvatar = !!(opts && opts.concreteAvatar);
  const SLOTS = [
    { key: 'past-problems', dotClass: 'hnd-past' },
    { key: 'body-parts',    dotClass: 'hnd-body' },
    { key: 'activities',    dotClass: 'hnd-act' },
    { key: 'feelings',      dotClass: 'hnd-feel' },
    { key: 'search',        dotClass: 'hnd-search' },
    { key: 'report',        dotClass: 'hnd-report' },
  ];
  const navChildren = SLOTS.map(slot => {
    if (slot.key === concreteKey) {
      return el('img', {
        class: 'hint-mini-navicon hint-mini-navicon-' + slot.key.replace('-', ''),
        src: NAV_ICONS[slot.key],
        alt: '',
      });
    }
    return el('div', { class: 'hint-nav-dot ' + slot.dotClass });
  });
  const avatarEl = concreteAvatar
    ? el('span', { class: 'hint-mini-avatar concrete' },
        el('img', { src: '/assets/avatarAsset.svg', alt: '' }),
      )
    : el('div', { class: 'hint-mini-avatar' });
  return el('div', { class: 'hint-mini-header' },
    el('img', { class: 'hint-mini-corner', src: '/assets/Spots-curve.svg', alt: '' }),
    el('div', { class: 'hint-mini-nav' }, ...navChildren),
    el('div', { class: 'hint-mini-user' },
      avatarEl,
    ),
    extras || null,
  );
}

// Mini home screen — shared across all demos. Renders the same abstract
// home layout as the Search demo (Past Problems + abstract graph in a
// left column, Problem Station card on the right). The `concreteKey`
// controls which nav slot renders as the real `_02` SVG; pass the
// demo's nav slot key so the cursor can glide to it before clicking.

export function hintMiniHome(concreteKey, navTargetExtra, opts) {
  return el('div', { class: 'hint-screen hint-screen-home' },
    hintMiniHeader(concreteKey, navTargetExtra || null, opts || null),
    el('div', { class: 'hint-mini-body' },
      el('div', { class: 'hint-mini-row' },
        el('div', { class: 'hint-mini-left' },
          el('div', { class: 'hint-mini-card hint-mini-past' },
            el('div', { class: 'hint-mini-card-bar wide' }),
            el('div', { class: 'hint-mini-card-bar' }),
            el('div', { class: 'hint-mini-card-bar short' }),
          ),
          el('div', { class: 'hint-mini-card hint-mini-graph' },
            el('div', { class: 'hint-mini-card-bar wide' }),
            el('div', { class: 'hint-mini-graph-bars' },
              el('div', { class: 'hint-mini-graph-bar', style: { width: '70%', background: 'var(--spots-red)' } }),
              el('div', { class: 'hint-mini-graph-bar', style: { width: '52%', background: 'var(--spots-green)' } }),
              el('div', { class: 'hint-mini-graph-bar', style: { width: '38%', background: 'var(--spots-teal)' } }),
            ),
          ),
        ),
        el('div', { class: 'hint-mini-card hint-mini-station' },
          el('div', { class: 'hint-mini-card-bar wide' }),
          el('div', { class: 'hint-mini-card-bar' }),
          el('div', { class: 'hint-mini-card-bar short' }),
        ),
      ),
    ),
  );
}

// ---- Hint demo: Body Parts ------------------------------------------------
// Flow: home → cursor → Body Parts nav (real SVG, teal) → click → swap to
// mini body-parts list screen → cursor → Left Foot region on the real body
// figure → hover/click → swap to detail screen → cursor clicks one symptom
// row → freeze on highlight.

export function bodyPartsHintStage() {
  return el('div', { class: 'hint-stage hint-bp-stage' },
    // SCREEN 0: mini home (cursor sits idle here, then glides to nav)
    hintMiniHome('body-parts', el('div', { class: 'hint-target hint-bp-target-nav-home' })),
    // SCREEN 1: body-parts list — real body figure rendered via <img>
    el('div', { class: 'hint-screen hint-bp-screen-list' },
      hintMiniHeader('body-parts', el('div', { class: 'hint-target hint-bp-target-nav' })),
      el('div', { class: 'hint-bp-body' },
        el('div', { class: 'hint-blurb-line title' }),
        el('div', { class: 'hint-blurb-line short centered' }),
        el('div', { class: 'hint-bp-row' },
          el('div', { class: 'hint-bp-figure' },
            el('img', {
              class: 'hint-bp-body-img',
              src: '/assets/SPOTSBodyFrontOptimized.svg',
              alt: '',
            }),
            // Glow disc layered over the Left Foot region of the figure.
            // CSS-positioned (no SVG injection needed for this non-
            // interactive demo).
            el('div', { class: 'hint-bp-leftfoot-glow' }),
          ),
          // Body-parts list — mirrors the real `.bp-row` chassis wrapped in
          // the production `.bp-list-panel` chassis (white card, blue-light
          // outline, rounded). Without the panel chassis the rows look
          // naked vs. the real screen.
          el('div', { class: 'hint-bp-list-panel' },
            el('div', { class: 'hint-bp-list' },
              el('div', { class: 'hint-bp-parts-row' },
                el('div', { class: 'hint-bp-parts-thumb' }),
                el('div', { class: 'hint-bp-parts-label wide' }),
                el('span', { class: 'hint-bp-parts-chev' }, '›'),
              ),
              // Concrete callback for Left Foot: real production thumbnail
              // (assets/body-parts/foot.svg) in the thumb slot so
              // the user recognizes the body part the cursor will navigate
              // to on screen 2. Label + chevron stay abstract.
              el('div', { class: 'hint-bp-parts-row' },
                el('img', {
                  class: 'hint-bp-parts-thumb hint-bp-parts-thumb-img',
                  src: '/assets/body-parts/foot.svg',
                  alt: '',
                }),
                el('div', { class: 'hint-bp-parts-label' }),
                el('span', { class: 'hint-bp-parts-chev' }, '›'),
              ),
              el('div', { class: 'hint-bp-parts-row' },
                el('div', { class: 'hint-bp-parts-thumb' }),
                el('div', { class: 'hint-bp-parts-label short' }),
                el('span', { class: 'hint-bp-parts-chev' }, '›'),
              ),
              el('div', { class: 'hint-bp-parts-row' },
                el('div', { class: 'hint-bp-parts-thumb' }),
                el('div', { class: 'hint-bp-parts-label' }),
                el('span', { class: 'hint-bp-parts-chev' }, '›'),
              ),
              el('div', { class: 'hint-bp-parts-row' },
                el('div', { class: 'hint-bp-parts-thumb' }),
                el('div', { class: 'hint-bp-parts-label short' }),
                el('span', { class: 'hint-bp-parts-chev' }, '›'),
              ),
            ),
          ),
        ),
        // The pulse target sits over the Left Foot glow
        el('div', { class: 'hint-target hint-bp-target-foot' }),
      ),
    ),
    // SCREEN 2: body-part detail (Left Foot symptoms)
    el('div', { class: 'hint-screen hint-bp-screen-detail' },
      hintMiniHeader('body-parts'),
      el('div', { class: 'hint-bp-detail' },
        el('div', { class: 'hint-blurb-line title' }),
        el('div', { class: 'hint-bp-detail-row' },
          el('div', { class: 'hint-bp-figure small' },
            el('img', {
              class: 'hint-bp-body-img',
              src: '/assets/SPOTSBodyFrontOptimized.svg',
              alt: '',
            }),
          ),
          // Mirrors `.symptom-row` rows inside the same `.bp-list-panel`
          // chassis used by the real body-part detail screen (white card,
          // blue-light outline, rounded).
          el('div', { class: 'hint-bp-list-panel detail' },
            el('div', { class: 'hint-bp-detail-list' },
              el('div', { class: 'hint-bp-detail-label' }),
              el('div', { class: 'hint-bp-symptom-row concrete hint-bp-symptom-target' },
                el('span', { class: 'hint-bp-symptom-name' }, tSymptom('Foot pain')),
                el('span', { class: 'hint-bp-check' }),
                el('div', { class: 'hint-target hint-bp-target-symptom' }),
              ),
              el('div', { class: 'hint-bp-symptom-row abstract' },
                el('span', { class: 'hint-bp-symptom-bar short' }),
                el('span', { class: 'hint-bp-check' }),
              ),
              el('div', { class: 'hint-bp-symptom-row abstract' },
                el('span', { class: 'hint-bp-symptom-bar' }),
                el('span', { class: 'hint-bp-check' }),
              ),
            ),
          ),
        ),
      ),
    ),
    el('div', { class: 'hint-cursor hint-bp-cursor', html: HINT_CURSOR_SVG }),
  );
}

// ---- Hint demo: Activities ------------------------------------------------
// Flow: idle → cursor → Activities nav (real SVG, green) → click → swap to
// mini activities grid → cursor → Sleep card → click → modal opens with
// symptom list → cursor → "Fatigue" (the 2nd row, not the first) → freeze.

export function activitiesHintStage() {
  return el('div', { class: 'hint-stage hint-act-stage' },
    // SCREEN 0: mini home
    hintMiniHome('activities', el('div', { class: 'hint-target hint-act-target-nav-home' })),
    // SCREEN 1: activities grid
    el('div', { class: 'hint-screen hint-act-screen-grid' },
      hintMiniHeader('activities', el('div', { class: 'hint-target hint-act-target-nav' })),
      el('div', { class: 'hint-act-body' },
        el('div', { class: 'hint-blurb-line title' }),
        el('div', { class: 'hint-blurb-line short centered' }),
        el('div', { class: 'hint-act-grid' },
          // Abstract cards now mirror the real `.picker-card` chassis:
          // small label-bar at top, large inner gray "image area" below.
          el('div', { class: 'hint-act-card abstract' },
            el('span', { class: 'hint-act-card-label-bar' }),
            el('div', { class: 'hint-act-card-inner' }),
          ),
          el('div', { class: 'hint-act-card abstract' },
            el('span', { class: 'hint-act-card-label-bar' }),
            el('div', { class: 'hint-act-card-inner' }),
          ),
          el('div', { class: 'hint-act-card abstract' },
            el('span', { class: 'hint-act-card-label-bar' }),
            el('div', { class: 'hint-act-card-inner' }),
          ),
          // Sleep — concrete. Mirrors the real `.picker-card` chassis
          // (top label + real Activities-Final/Sleeping.jpg illustration
          // filling most of the card).
          el('div', { class: 'hint-act-card concrete' },
            el('div', { class: 'hint-act-card-label' }, t('Sleeping')),
            el('img', {
              class: 'hint-act-card-thumb',
              src: '/assets/Activities-Final/Sleeping.jpg',
              alt: '',
            }),
            el('div', { class: 'hint-target hint-act-target-sleep' }),
          ),
          el('div', { class: 'hint-act-card abstract' },
            el('span', { class: 'hint-act-card-label-bar' }),
            el('div', { class: 'hint-act-card-inner' }),
          ),
          el('div', { class: 'hint-act-card abstract' },
            el('span', { class: 'hint-act-card-label-bar' }),
            el('div', { class: 'hint-act-card-inner' }),
          ),
        ),
      ),
    ),
    // SCREEN 2: activity-detail modal showing Sleep symptom list.
    // Real modal layout: title → large activity illustration → symptom
    // rows (orange-outlined pills, name left, blue radio right, NO thumb).
    el('div', { class: 'hint-screen hint-act-screen-modal' },
      hintMiniHeader('activities'),
      el('div', { class: 'hint-act-body dim' }),
      el('div', { class: 'hint-act-modal' },
        el('div', { class: 'hint-act-modal-title' }, t('Sleeping')),
        el('img', {
          class: 'hint-act-modal-image',
          src: '/assets/Activities-Final/Sleeping.jpg',
          alt: 'Sleeping',
        }),
        // Activity-modal symptom row chassis: orange-outlined pill, name
        // on left, blue radio circle on right. NO thumbnail. Abstract rows
        // render placeholder text-bars; concrete Fatigue row carries the
        // word "Fatigue".
        el('div', { class: 'hint-act-modal-list' },
          el('div', { class: 'hint-act-symptom-row abstract' },
            el('span', { class: 'hint-bp-symptom-bar' }),
            el('span', { class: 'hint-act-check' }),
          ),
          // 2nd row — Fatigue (concrete, the cursor lands here)
          el('div', { class: 'hint-act-symptom-row concrete hint-act-symptom-target' },
            el('span', { class: 'hint-act-symptom-name' }, tSymptom('Fatigue')),
            el('span', { class: 'hint-act-check' }),
            el('div', { class: 'hint-target hint-act-target-symptom' }),
          ),
          el('div', { class: 'hint-act-symptom-row abstract' },
            el('span', { class: 'hint-bp-symptom-bar short' }),
            el('span', { class: 'hint-act-check' }),
          ),
          el('div', { class: 'hint-act-symptom-row abstract' },
            el('span', { class: 'hint-bp-symptom-bar' }),
            el('span', { class: 'hint-act-check' }),
          ),
        ),
      ),
    ),
    el('div', { class: 'hint-cursor hint-act-cursor', html: HINT_CURSOR_SVG }),
  );
}

// ---- Hint demo: Feelings --------------------------------------------------
// Flow: idle → cursor → Feelings nav (real SVG, --spots-feelings) → click →
// swap to mini feelings grid → cursor → "Worried" card → click → toggleSymptom
// would normally open the question modal directly (feelings flow has no
// intermediate list page). For the hint we render an "abstracted feelings
// list" view so the user sees the click effect before stopping. The cursor
// lands on the second-from-top row (not first). Demo stops at row click.

export function feelingsHintStage() {
  return el('div', { class: 'hint-stage hint-feel-stage' },
    // SCREEN 0: mini home
    hintMiniHome('feelings', el('div', { class: 'hint-target hint-feel-target-nav-home' })),
    // SCREEN 1: feelings grid — mirrors Activities chassis: label strip
    // at top + dominant illustration below. Blue-outlined cards.
    el('div', { class: 'hint-screen hint-feel-screen-grid' },
      hintMiniHeader('feelings', el('div', { class: 'hint-target hint-feel-target-nav' })),
      el('div', { class: 'hint-feel-body' },
        el('div', { class: 'hint-blurb-line title' }),
        el('div', { class: 'hint-blurb-line short centered' }),
        el('div', { class: 'hint-feel-grid' },
          // Abstract card chassis: small label-bar at top + gray inner
          // image area filling remainder, blue border.
          el('div', { class: 'hint-feel-card abstract' },
            el('span', { class: 'hint-feel-card-label-bar' }),
            el('div', { class: 'hint-feel-card-inner' }),
          ),
          // Worried — concrete. Real Anxiety.jpg (the production asset
          // for "Worried or nervous feelings"; see data.js feelings list)
          // fills the bulk of the card.
          el('div', { class: 'hint-feel-card concrete' },
            el('div', { class: 'hint-feel-card-label' }, t('Worried')),
            el('img', {
              class: 'hint-feel-card-thumb',
              src: '/assets/Feelings-Final/Anxiety.jpg',
              alt: '',
            }),
            el('div', { class: 'hint-target hint-feel-target-worried' }),
          ),
          el('div', { class: 'hint-feel-card abstract' },
            el('span', { class: 'hint-feel-card-label-bar' }),
            el('div', { class: 'hint-feel-card-inner' }),
          ),
          el('div', { class: 'hint-feel-card abstract' },
            el('span', { class: 'hint-feel-card-label-bar' }),
            el('div', { class: 'hint-feel-card-inner' }),
          ),
          el('div', { class: 'hint-feel-card abstract' },
            el('span', { class: 'hint-feel-card-label-bar' }),
            el('div', { class: 'hint-feel-card-inner' }),
          ),
          el('div', { class: 'hint-feel-card abstract' },
            el('span', { class: 'hint-feel-card-label-bar' }),
            el('div', { class: 'hint-feel-card-inner' }),
          ),
        ),
      ),
    ),
    // SCREEN 2: feelings detail modal — mirrors Activities modal:
    // title → large Anxiety.jpg illustration → symptom rows (orange-pill,
    // name left, blue radio right, no thumb).
    el('div', { class: 'hint-screen hint-feel-screen-list' },
      hintMiniHeader('feelings'),
      el('div', { class: 'hint-feel-body dim' }),
      el('div', { class: 'hint-feel-modal' },
        el('div', { class: 'hint-feel-modal-title' }, t('Worried')),
        el('img', {
          class: 'hint-feel-modal-image',
          src: '/assets/Feelings-Final/Anxiety.jpg',
          alt: 'Worried',
        }),
        el('div', { class: 'hint-feel-modal-list' },
          // Abstract row 0
          el('div', { class: 'hint-act-symptom-row abstract' },
            el('span', { class: 'hint-bp-symptom-bar' }),
            el('span', { class: 'hint-act-check' }),
          ),
          // Row 1 — concrete pick (Worried or nervous feelings)
          el('div', { class: 'hint-act-symptom-row concrete hint-feel-symptom-target' },
            el('span', { class: 'hint-act-symptom-name' }, tSymptom('Worried or nervous feelings')),
            el('span', { class: 'hint-act-check' }),
            el('div', { class: 'hint-target hint-feel-target-symptom' }),
          ),
          el('div', { class: 'hint-act-symptom-row abstract' },
            el('span', { class: 'hint-bp-symptom-bar short' }),
            el('span', { class: 'hint-act-check' }),
          ),
          el('div', { class: 'hint-act-symptom-row abstract' },
            el('span', { class: 'hint-bp-symptom-bar' }),
            el('span', { class: 'hint-act-check' }),
          ),
        ),
      ),
    ),
    el('div', { class: 'hint-cursor hint-feel-cursor', html: HINT_CURSOR_SVG }),
  );
}

// ---- Hint demo: Past Problems --------------------------------------------
// Flow: idle → cursor → Past Problems nav (real SVG, orange) → click → swap
// to mini past-problems screen → cursor → "Headache" row → click → swap to
// question-modal-open state (modal frame visible, abstract option rows) →
// freeze on modal.

export function pastProblemsHintStage() {
  return el('div', { class: 'hint-stage hint-pp-stage' },
    // SCREEN 0: mini home
    hintMiniHome('past-problems', el('div', { class: 'hint-target hint-pp-target-nav-home' })),
    // SCREEN 1: past-problems list
    el('div', { class: 'hint-screen hint-pp-screen-list' },
      hintMiniHeader('past-problems', el('div', { class: 'hint-target hint-pp-target-nav' })),
      el('div', { class: 'hint-pp-body' },
        el('div', { class: 'hint-blurb-line title' }),
        el('div', { class: 'hint-blurb-line short centered' }),
        // Real `.pp-row` chassis: checkbox | info (name + date) | dots | chev.
        // Abstract rows mirror that grid with placeholder bars in each slot.
        el('div', { class: 'hint-pp-list' },
          // Headache row (concrete) — first row, gets clicked
          el('div', { class: 'hint-pp-row concrete' },
            el('span', { class: 'hint-pp-checkbox' }),
            el('div', { class: 'hint-pp-info' },
              el('span', { class: 'hint-pp-name' }, tSymptom('Headache')),
              el('span', { class: 'hint-pp-date' }, t('Reported recently')),
            ),
            el('div', { class: 'hint-pp-row-dots' },
              el('span', { class: 'hint-pp-row-dot' }),
              el('span', { class: 'hint-pp-row-dot' }),
            ),
            el('span', { class: 'hint-pp-chev' }, '›'),
            el('div', { class: 'hint-target hint-pp-target-row' }),
          ),
          el('div', { class: 'hint-pp-row abstract' },
            el('span', { class: 'hint-pp-checkbox' }),
            el('div', { class: 'hint-pp-info' },
              el('span', { class: 'hint-pp-name-bar' }),
              el('span', { class: 'hint-pp-date-bar' }),
            ),
            el('div', { class: 'hint-pp-row-dots' },
              el('span', { class: 'hint-pp-row-dot' }),
              el('span', { class: 'hint-pp-row-dot' }),
            ),
            el('span', { class: 'hint-pp-chev abstract' }, '›'),
          ),
          el('div', { class: 'hint-pp-row abstract' },
            el('span', { class: 'hint-pp-checkbox' }),
            el('div', { class: 'hint-pp-info' },
              el('span', { class: 'hint-pp-name-bar short' }),
              el('span', { class: 'hint-pp-date-bar' }),
            ),
            el('div', { class: 'hint-pp-row-dots' },
              el('span', { class: 'hint-pp-row-dot' }),
              el('span', { class: 'hint-pp-row-dot' }),
            ),
            el('span', { class: 'hint-pp-chev abstract' }, '›'),
          ),
        ),
      ),
    ),
    // SCREEN 2: past-problems list with question modal overlay
    el('div', { class: 'hint-screen hint-pp-screen-modal' },
      hintMiniHeader('past-problems'),
      el('div', { class: 'hint-pp-body dim' }),
      el('div', { class: 'hint-pp-modal' },
        el('div', { class: 'hint-pp-modal-title' }, tSymptom('Headache')),
        el('div', { class: 'hint-pp-modal-prompt' }),
        el('div', { class: 'hint-pp-modal-options' },
          el('div', { class: 'hint-pp-modal-option' },
            el('span', { class: 'hint-bp-symptom-bar' }),
          ),
          el('div', { class: 'hint-pp-modal-option' },
            el('span', { class: 'hint-bp-symptom-bar short' }),
          ),
          el('div', { class: 'hint-pp-modal-option' },
            el('span', { class: 'hint-bp-symptom-bar' }),
          ),
          el('div', { class: 'hint-pp-modal-option' },
            el('span', { class: 'hint-bp-symptom-bar short' }),
          ),
        ),
        el('div', { class: 'hint-pp-modal-dots' },
          el('span', { class: 'hint-pp-dot active' }),
          el('span', { class: 'hint-pp-dot' }),
          el('span', { class: 'hint-pp-dot' }),
        ),
      ),
    ),
    el('div', { class: 'hint-cursor hint-pp-cursor', html: HINT_CURSOR_SVG }),
  );
}

// ---- Hint demo: Edit a problem -----------------------------------------
// Problem Station rows are clickable — clicking one re-opens the question
// modal in edit mode (pre-fills the user's previous answer; writes back
// live). Demo teaches that you click a row to revise a rating.
// Flow (10s loop):
//   0.00–0.05  cursor idle bottom-right; home visible (concrete Headache row)
//   0.05–0.22  cursor glides up to the Headache row in the Problem Station
//   0.22–0.25  click pulse on the row
//   0.25–0.30  home fades out → modal fades in
//   0.30–0.50  cursor glides down to a different rating option in the modal
//   0.50–0.55  click pulse on the new option; option highlights as selected
//   0.55–0.95  HOLD on highlighted option
//   0.95–1.00  fade back to start

export function editProblemsHintStage() {
  return el('div', { class: 'hint-stage hint-edit-stage' },
    // SCREEN 0: home with a concrete Problem Station card on the right.
    // Inside the card: a concrete "Headache" row (gray border, name + 3
    // answer dots — 1 filled green to mimic an in-progress symptom) plus
    // an abstract row beneath it. Everything else (header nav, left-column
    // cards) stays abstract so the eye lands on the click target.
    el('div', { class: 'hint-screen hint-edit-screen-home' },
      hintMiniHeader(null),
      el('div', { class: 'hint-mini-body' },
        el('div', { class: 'hint-mini-row' },
          el('div', { class: 'hint-mini-left' },
            el('div', { class: 'hint-mini-card hint-mini-past' },
              el('div', { class: 'hint-mini-card-bar wide' }),
              el('div', { class: 'hint-mini-card-bar' }),
              el('div', { class: 'hint-mini-card-bar short' }),
            ),
            el('div', { class: 'hint-mini-card hint-mini-graph' },
              el('div', { class: 'hint-mini-card-bar wide' }),
              el('div', { class: 'hint-mini-graph-bars' },
                el('div', { class: 'hint-mini-graph-bar', style: { width: '70%', background: 'var(--spots-red)' } }),
                el('div', { class: 'hint-mini-graph-bar', style: { width: '52%', background: 'var(--spots-green)' } }),
                el('div', { class: 'hint-mini-graph-bar', style: { width: '38%', background: 'var(--spots-teal)' } }),
              ),
            ),
          ),
          el('div', { class: 'hint-mini-card hint-edit-station' },
            el('div', { class: 'hint-edit-station-title' }, t('Problem Station')),
            el('div', { class: 'hint-edit-station-rows' },
              el('div', { class: 'hint-edit-ps-row concrete' },
                el('span', { class: 'hint-edit-ps-name' }, tSymptom('Headache')),
                el('span', { class: 'hint-edit-ps-dots' },
                  el('span', { class: 'hint-edit-ps-dot is-on' }),
                  el('span', { class: 'hint-edit-ps-dot' }),
                  el('span', { class: 'hint-edit-ps-dot' }),
                ),
                el('div', { class: 'hint-target hint-edit-target-row' }),
              ),
              el('div', { class: 'hint-edit-ps-row abstract' },
                el('span', { class: 'hint-edit-ps-name-bar' }),
                el('span', { class: 'hint-edit-ps-dots' },
                  el('span', { class: 'hint-edit-ps-dot' }),
                  el('span', { class: 'hint-edit-ps-dot' }),
                  el('span', { class: 'hint-edit-ps-dot' }),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
    // SCREEN 1: question modal overlay over a dimmed home body.
    // Modal mirrors the real edit-mode modal: title "Headache", prompt bar,
    // 4 rating pills in escalating blue intensities (2nd one is pre-selected
    // to reflect the user's prior answer), then progress dots, then
    // Close / Next buttons. The cursor clicks the 3rd option, which then
    // becomes the highlighted selection.
    el('div', { class: 'hint-screen hint-edit-screen-modal' },
      hintMiniHeader(null),
      el('div', { class: 'hint-mini-body dim' }),
      el('div', { class: 'hint-edit-modal' },
        el('div', { class: 'hint-edit-modal-title' }, tSymptom('Headache')),
        el('div', { class: 'hint-edit-modal-prompt' }),
        el('div', { class: 'hint-edit-modal-options' },
          el('div', { class: 'hint-edit-modal-option' }),
          el('div', { class: 'hint-edit-modal-option was-selected' }),
          el('div', { class: 'hint-edit-modal-option becomes-selected' },
            el('div', { class: 'hint-target hint-edit-target-option' }),
          ),
          el('div', { class: 'hint-edit-modal-option' }),
        ),
        el('div', { class: 'hint-edit-modal-dots' },
          el('span', { class: 'hint-edit-pd active' }),
          el('span', { class: 'hint-edit-pd' }),
          el('span', { class: 'hint-edit-pd' }),
        ),
        el('div', { class: 'hint-edit-modal-actions' },
          el('div', { class: 'hint-edit-btn' }, 'Close'),
          el('div', { class: 'hint-edit-btn primary' }, 'Next'),
        ),
      ),
    ),
    el('div', { class: 'hint-cursor hint-edit-cursor', html: HINT_CURSOR_SVG }),
  );
}

// ---- Hint demo: Delete a problem ---------------------------------------
// The trash icon on each Problem Station row removes the symptom from the
// cart. Demo teaches that clicking the red trash glyph deletes the entry.
// Flow (10s loop):
//   0.00–0.05  cursor idle bottom-right; row visible
//   0.05–0.32  cursor glides to the trash icon on the Headache row
//   0.32–0.36  click pulse on the trash icon
//   0.36–0.55  Headache row fades / slides out (gets removed)
//   0.55–0.95  HOLD on empty Problem Station (only "no problems" state)
//   0.95–1.00  fade back to start

export function deleteProblemHintStage() {
  return el('div', { class: 'hint-stage hint-del-stage' },
    el('div', { class: 'hint-screen hint-del-screen' },
      hintMiniHeader(null),
      el('div', { class: 'hint-mini-body' },
        el('div', { class: 'hint-mini-row' },
          el('div', { class: 'hint-mini-left' },
            el('div', { class: 'hint-mini-card hint-mini-past' },
              el('div', { class: 'hint-mini-card-bar wide' }),
              el('div', { class: 'hint-mini-card-bar' }),
              el('div', { class: 'hint-mini-card-bar short' }),
            ),
            el('div', { class: 'hint-mini-card hint-mini-graph' },
              el('div', { class: 'hint-mini-card-bar wide' }),
              el('div', { class: 'hint-mini-graph-bars' },
                el('div', { class: 'hint-mini-graph-bar', style: { width: '70%', background: 'var(--spots-red)' } }),
                el('div', { class: 'hint-mini-graph-bar', style: { width: '52%', background: 'var(--spots-green)' } }),
                el('div', { class: 'hint-mini-graph-bar', style: { width: '38%', background: 'var(--spots-teal)' } }),
              ),
            ),
          ),
          el('div', { class: 'hint-mini-card hint-edit-station' },
            el('div', { class: 'hint-edit-station-title' }, t('Problem Station')),
            el('div', { class: 'hint-edit-station-rows' },
              // Wrap the concrete row in a collapse-only container. The
              // wrapper animates `max-height` + `margin-bottom` to nothing
              // (with `overflow: hidden`) so the row inside keeps its full
              // border/padding chassis stable — animating the row's own
              // border/padding produced visible jitter on the orange 2px
              // border as it shrank.
              el('div', { class: 'hint-del-row-wrap' },
                el('div', { class: 'hint-edit-ps-row concrete' },
                  el('span', { class: 'hint-edit-ps-name' }, tSymptom('Headache')),
                  el('span', { class: 'hint-del-ps-right' },
                    el('span', { class: 'hint-edit-ps-dots' },
                      el('span', { class: 'hint-edit-ps-dot is-on' }),
                      el('span', { class: 'hint-edit-ps-dot' }),
                      el('span', { class: 'hint-edit-ps-dot' }),
                    ),
                    el('span', { class: 'hint-del-ps-trash', html: TRASH_SVG }),
                  ),
                  el('div', { class: 'hint-target hint-del-target-trash' }),
                ),
              ),
              // Empty-state placeholder fades IN once the wrapper has
              // collapsed — gives the user a clear "deleted" confirmation.
              el('div', { class: 'hint-del-ps-empty' }, t('You have not reported any problems yet.')),
            ),
          ),
        ),
      ),
    ),
    el('div', { class: 'hint-cursor hint-del-cursor', html: HINT_CURSOR_SVG }),
  );
}

// ---- Hint demo: Completed a session (logout flow) ------------------------
// Logout is what closes/advances a session in this build. Demo teaches the
// user to open the avatar dropdown and click "Logout".
// Flow (10s loop):
//   0.00–0.05  cursor idle bottom-right
//   0.05–0.27  cursor glides up-right to avatar in mini header
//   0.27–0.32  click pulse on avatar; dropdown panel fades in
//   0.32–0.55  cursor glides down-left to the Logout button in the dropdown
//   0.55–0.60  click pulse on Logout; Logout button highlights
//   0.60–0.95  HOLD on highlighted Logout
//   0.95–1.00  fade back to start

export function completedHintStage() {
  // Concrete dropdown panel rendered as the avatar's open menu. Mirrors
  // `.user-menu-panel` visually (white card, arrow, "Logged in as: User",
  // divider, red Logout button) — but at mini-stage scale.
  const dropdown = el('div', { class: 'hint-comp-dropdown' },
    el('div', { class: 'hint-comp-arrow' }),
    el('div', { class: 'hint-comp-info' },
      el('div', { class: 'hint-comp-label' }, t('Logged in as:')),
      el('div', { class: 'hint-comp-value' }, t('User')),
    ),
    el('div', { class: 'hint-comp-divider' }),
    el('div', { class: 'hint-comp-logout' },
      t('Logout'),
      // Pulse target — animated via CSS so the demo lines up with the
      // cursor's click moment without any JS scheduling.
      el('div', { class: 'hint-target hint-comp-target-logout' }),
    ),
  );

  return el('div', { class: 'hint-stage hint-comp-stage' },
    // Single screen — the demo never navigates away. The avatar is the
    // only concrete header element (rest stays abstract dots); the body
    // beneath is the same mini-home layout as the other demos so the user
    // sees they're "on a page" when the dropdown opens.
    el('div', { class: 'hint-screen hint-comp-screen' },
      hintMiniHeader(null, el('div', { class: 'hint-target hint-comp-target-avatar' }), { concreteAvatar: true }),
      el('div', { class: 'hint-mini-body' },
        el('div', { class: 'hint-mini-row' },
          el('div', { class: 'hint-mini-left' },
            el('div', { class: 'hint-mini-card hint-mini-past' },
              el('div', { class: 'hint-mini-card-bar wide' }),
              el('div', { class: 'hint-mini-card-bar' }),
              el('div', { class: 'hint-mini-card-bar short' }),
            ),
            el('div', { class: 'hint-mini-card hint-mini-graph' },
              el('div', { class: 'hint-mini-card-bar wide' }),
              el('div', { class: 'hint-mini-graph-bars' },
                el('div', { class: 'hint-mini-graph-bar', style: { width: '70%', background: 'var(--spots-red)' } }),
                el('div', { class: 'hint-mini-graph-bar', style: { width: '52%', background: 'var(--spots-green)' } }),
                el('div', { class: 'hint-mini-graph-bar', style: { width: '38%', background: 'var(--spots-teal)' } }),
              ),
            ),
          ),
          el('div', { class: 'hint-mini-card hint-mini-station' },
            el('div', { class: 'hint-mini-card-bar wide' }),
            el('div', { class: 'hint-mini-card-bar' }),
            el('div', { class: 'hint-mini-card-bar short' }),
          ),
        ),
      ),
      dropdown,
    ),
    el('div', { class: 'hint-cursor hint-comp-cursor', html: HINT_CURSOR_SVG }),
  );
}

// First-load orientation popup. Shown ONCE on the home screen in session
// 1, right after the user clicks "Get Started" on the welcome screen.
// Calls out the floating Practice Guide Progress button (top-right) and
// the per-step `?` hint buttons inside it. Dismissed via the "Got it!"
// button, Escape, or backdrop click. State lives on `introDismissed`.

export function hintModal() {
  const key = state.activeHintKey;
  if (!key) return null;

  function close() {
    state.activeHintKey = null;
    render();
  }

  const cursorSvg = HINT_CURSOR_SVG;

  let body;
  let title = t('Walkthrough');
  if (key === 'search') {
    title = t('How to use Search');
    // Mini header — abstract by design. Only the icon we're navigating to
    // (Search) renders as the real nav SVG; the rest are plain colored
    // circles in the SPOTS palette so the user's eye lands on the live
    // target. Same approach for the body of each screen: abstract bars
    // for non-interacted areas, real elements for the things being clicked
    // or typed into.
    const navDot = (cls) => el('div', { class: 'hint-nav-dot ' + cls });
    const miniHeader = (extras) => el('div', { class: 'hint-mini-header' },
      el('img', { class: 'hint-mini-corner', src: '/assets/Spots-curve.svg', alt: '' }),
      el('div', { class: 'hint-mini-nav' },
        navDot('hnd-past'),
        navDot('hnd-body'),
        navDot('hnd-act'),
        navDot('hnd-feel'),
        el('img', { class: 'hint-mini-navicon hint-mini-navicon-search', src: NAV_ICONS['search'], alt: '' }),
        navDot('hnd-report'),
      ),
      el('div', { class: 'hint-mini-user' },
        el('div', { class: 'hint-mini-avatar' }),
      ),
      extras || null,
    );

    body = el('div', { class: 'hint-stage' },
      // Mini home screen — abstract layout that mirrors the real home page:
      // Past Problems callout next to the Problem Station sidebar on top,
      // summary chart card below. Nothing here is interacted with — the
      // only target is the Search nav icon up in the header.
      el('div', { class: 'hint-screen hint-screen-home' },
        miniHeader(el('div', { class: 'hint-target hint-target-search' })),
        el('div', { class: 'hint-mini-body' },
          el('div', { class: 'hint-mini-row' },
            el('div', { class: 'hint-mini-left' },
              el('div', { class: 'hint-mini-card hint-mini-past' },
                el('div', { class: 'hint-mini-card-bar wide' }),
                el('div', { class: 'hint-mini-card-bar' }),
                el('div', { class: 'hint-mini-card-bar short' }),
              ),
              el('div', { class: 'hint-mini-card hint-mini-graph' },
                el('div', { class: 'hint-mini-card-bar wide' }),
                el('div', { class: 'hint-mini-graph-bars' },
                  el('div', { class: 'hint-mini-graph-bar', style: { width: '70%', background: 'var(--spots-red)' } }),
                  el('div', { class: 'hint-mini-graph-bar', style: { width: '52%', background: 'var(--spots-green)' } }),
                  el('div', { class: 'hint-mini-graph-bar', style: { width: '38%', background: 'var(--spots-teal)' } }),
                ),
              ),
            ),
            el('div', { class: 'hint-mini-card hint-mini-station' },
              el('div', { class: 'hint-mini-card-bar wide' }),
              el('div', { class: 'hint-mini-card-bar' }),
              el('div', { class: 'hint-mini-card-bar short' }),
            ),
          ),
        ),
      ),
      // Mini search screen — only the input and the "Headache" row that
      // gets clicked are concrete. Title, subtitle, and other rows are
      // abstract bars.
      el('div', { class: 'hint-screen hint-screen-search' },
        miniHeader(),
        el('div', { class: 'hint-search-body' },
          el('div', { class: 'hint-blurb-line title' }),
          el('div', { class: 'hint-blurb-line short centered' }),
          el('div', { class: 'hint-search-input' },
            el('span', { class: 'hint-search-input-text' }),
            el('span', { class: 'hint-search-caret' }),
            el('span', { class: 'hint-search-input-icon' }),
            el('div', { class: 'hint-target hint-target-input' }),
          ),
          el('div', { class: 'hint-search-results' },
            el('div', { class: 'hint-search-row hint-search-row-1 hint-result-real' },
              el('span', { class: 'hint-result-name' }, tSymptom('Headache')),
              el('span', { class: 'hint-row-chev' }, '›'),
              el('div', { class: 'hint-target hint-target-row' }),
            ),
            el('div', { class: 'hint-search-row hint-result-abstract hint-result-2' },
              el('span', { class: 'hint-blurb-line abstract-row' }),
            ),
            el('div', { class: 'hint-search-row hint-result-abstract hint-result-3' },
              el('span', { class: 'hint-blurb-line abstract-row short' }),
            ),
          ),
        ),
      ),
      // The animated cursor sits above both screens
      el('div', { class: 'hint-cursor', html: cursorSvg }),
    );
  } else if (key === 'body-parts') {
    title = t('How to pick a Body Part');
    body = bodyPartsHintStage();
  } else if (key === 'activities') {
    title = t('How to pick an Activity');
    body = activitiesHintStage();
  } else if (key === 'feelings') {
    title = t('How to pick a Feeling');
    body = feelingsHintStage();
  } else if (key === 'past-problems') {
    title = t('How to use Past Problems');
    body = pastProblemsHintStage();
  } else if (key === 'reviewed') {
    title = t('How to edit a problem');
    body = editProblemsHintStage();
  } else if (key === 'delete') {
    title = t('How to delete a problem');
    body = deleteProblemHintStage();
  } else if (key === 'completed') {
    title = t('How to complete a session');
    body = completedHintStage();
  } else {
    // Defensive fallback — shouldn't be reachable since other rows can't open.
    body = el('div', { class: 'hint-stage hint-stage-empty' },
      el('div', { class: 'hint-empty' }, t('Walkthrough coming soon.')),
    );
  }

  return el('div', {
    class: 'modal-backdrop hint-backdrop',
    onclick: (e) => { if (e.target.classList.contains('modal-backdrop')) close(); },
  },
    el('div', {
      class: 'modal-card tutorial-popup hint-card',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'hint-modal-title',
      onclick: (e) => e.stopPropagation(),
    },
      el('button', {
        class: 'hint-close',
        'aria-label': t('Close walkthrough'),
        onclick: close,
      }, '×'),
      el('h2', { id: 'hint-modal-title' }, title),
      el('p', { class: 'tutorial-popup-sub' }, t('Watch the example below')),
      body,
      el('div', { class: 'tutorial-popup-actions' },
        el('button', { class: 'btn-pill primary', onclick: close }, t('Got it')),
      ),
    ),
  );
}

// Open the question modal in EDIT mode for an already-selected symptom.
// The modal pre-fills each rating with the user's previous choice and writes
// edits BACK TO THE ORIGINAL `state.selected` entry live (no Save button) —
// see the `setAnswer` path in `questionModal()`. We keep a `pendingSymptom`
// pointer here only so the modal can read the symptom's name/answers for
// rendering; we do NOT clone the answers (writes target the original).
//
// Clicking a Problem Station row to open the modal satisfies session 2's
// "Edit your problems" tutorial milestone. Session 1 no longer has an edit
// step — its tutorial step is "Delete a problem", set in the trash button
// handler in problemStation().
