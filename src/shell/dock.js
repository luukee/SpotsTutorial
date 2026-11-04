/** Practice guide progress dock. */
import { state, isSelected, findSelected, questionIdsForSymptom } from '../state.js';
import { tutorialProgressItems, isCurrentSessionComplete } from '../progress.js';
import { D } from '../data.js';
import { el } from '../dom.js';
import { t, tLabel, tSymptom, tOption, fillTemplate, joinSpokenSentences, setLanguage } from '../i18n.js';
import { go, logout, skipToNextSession, toggleSymptom, openEditSymptom } from '../navigation.js';
import { render } from '../render-ref.js';
import { readAloudButton, speakOptionButton, tapSpeakerTip, stopSpeaking } from '../speech.js';
import { categoryLabelFor, formatDateMDY } from '../utils.js';

export function tutorialDock() {
  const items = tutorialProgressItems();
  const total = items.length;
  const completed = items.filter(i => i.done).length;
  const pct = Math.round((completed / total) * 100);
  const open = !!state.tutorialDockOpen;

  // SVG circular progress ring around the button — circumference 2πr where
  // r=26, so ~163.4. The progress arc reveals from the top, clockwise.
  const ringCircumference = 163.36;
  const ringOffset = ringCircumference * (1 - completed / total);
  const button = el('button', {
    class: 'tutorial-dock-btn' + (open ? ' is-open' : ''),
    'aria-label': t(
      `Practice Guide Progress: ${completed} of ${total} complete`,
      `Progreso de la guía de práctica: ${completed} de ${total} completados`
    ),
    'aria-expanded': open ? 'true' : 'false',
    onclick: (e) => {
      e.stopPropagation();
      state.tutorialDockOpen = !state.tutorialDockOpen;
      render();
    },
  },
    el('span', { class: 'dock-ring-wrap', html:
      '<svg viewBox="0 0 60 60" aria-hidden="true" focusable="false">' +
        '<circle class="ring-track" cx="30" cy="30" r="26" fill="none" stroke-width="4" />' +
        '<circle class="ring-progress" cx="30" cy="30" r="26" fill="none" stroke-width="4" ' +
        'stroke-linecap="round" ' +
        'stroke-dasharray="' + ringCircumference.toFixed(2) + '" ' +
        'stroke-dashoffset="' + ringOffset.toFixed(2) + '" ' +
        'transform="rotate(-90 30 30)" />' +
      '</svg>'
    }),
    el('span', { class: 'dock-core' },
      el('span', { class: 'dock-icon', html:
        // Graduation-cap glyph — signals "tutorial / learn" more strongly
        // than a checklist while reading clean at this size.
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
          '<path fill="currentColor" d="M12 3L1.5 8.5 12 14l8.5-4.46V15a.75.75 0 0 0 1.5 0V8.5L12 3z"/>' +
          '<path fill="currentColor" d="M5 12.18v3.05c0 .66.39 1.26 1 1.53 1.74.79 3.83 1.24 6 1.24s4.26-.45 6-1.24c.61-.27 1-.87 1-1.53v-3.05L12 15.5l-7-3.32z"/>' +
        '</svg>'
      }),
      el('span', { class: 'dock-count' }, `${completed}/${total}`),
    ),
  );

  const panel = open ? el('div', {
    class: 'tutorial-dock-panel',
    onclick: (e) => e.stopPropagation(),
  },
    el('div', { class: 'tdp-header' },
      el('span', { class: 'tdp-title' }, t('Practice Guide Progress')),
      el('span', { class: 'tdp-count' }, `${completed}/${total}`),
    ),
    el('div', { class: 'progress-bar' },
      el('div', { class: 'progress-fill', style: { width: pct + '%' } }),
    ),
    el('ul', { class: 'tdp-list' }, items.map(it => {
      // Six demos are wired: search, body-parts, activities, feelings,
      // past-problems, completed (logout flow). Welcome is intentionally
      // skipped — the user has, by definition, already done it. `reviewed`
      // is still a tutorial-flag milestone with no walkthrough — keep its
      // `?` disabled.
      const HINT_KEYS = new Set(['search', 'body-parts', 'activities', 'feelings', 'past-problems', 'reviewed', 'delete', 'completed']);
      const NO_HINT_KEYS = new Set(['welcome']);
      const hasHint = HINT_KEYS.has(it.key);
      const showHintBtn = !NO_HINT_KEYS.has(it.key);
      return el('li', { class: 'tdp-item' + (it.done ? ' is-done' : '') },
        el('span', { class: 'progress-check' }, it.done ? '✓' : ''),
        el('span', { class: 'tdp-label' }, it.label),
        showHintBtn ? el('button', {
          class: 'tdp-hint-btn' + (hasHint ? '' : ' is-disabled'),
          'aria-label': hasHint
            ? t(`Show hint for ${it.label}`, `Mostrar pista para ${it.label}`)
            : t(`Hint for ${it.label} coming soon`, `Pista para ${it.label} próximamente`),
          title: hasHint ? t('Show me how') : t('Coming soon'),
          onclick: (e) => {
            e.stopPropagation();
            if (!hasHint) return;
            state.activeHintKey = it.key;
            render();
          },
        }, '?') : null,
      );
    })),
  ) : null;

  const backdrop = open ? el('div', {
    class: 'tutorial-dock-backdrop',
    onclick: () => { state.tutorialDockOpen = false; render(); },
  }) : null;

  return el('div', { class: 'tutorial-dock' }, backdrop, button, panel);
}

// ----------------------------- screens -----------------------------
