/** Activities grid + detail modal. */
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

export function activitiesScreen() {
  return el('div', {},
    siteHeader(),
    el('main', { class: 'site-main' },
      el('h1', { class: 'page-title' }, t('Activities')),
      el('p', { class: 'page-subtitle' }, t('Pick the activities where you are having problems')),
      el('div', { class: 'two-col' },
        el('div', { class: 'picker-grid picker-grid--activities' },
          D.activities.map(act => el('div', {
            class: 'picker-card',
            onclick: () => go('activity-detail', { currentActivity: act }),
          },
            el('div', { class: 'top-label' }, tLabel(act)),
            el('img', { src: D.assetPath('activities', act.image), alt: '' }),
          )),
        ),
        problemStation(),
      ),
    ),
    siteFooter(),
  );
}

// ---- Activity detail — overlays the activities grid as a centered modal

export function activityDetailScreen() {
  const act = state.currentActivity;
  const symptoms = D.activitySymptoms[act.key] || [];
  const actLabel = tLabel(act);
  const activityListenText = symptoms.length === 0
    ? fillTemplate(
        t(
          'You picked {activity}. There are no symptoms to choose from right now.',
          'Elegiste {activity}. Ahora mismo no hay síntomas para elegir.',
        ),
        { activity: actLabel },
      )
    : fillTemplate(
        t(
          'You picked {activity}. Which of these do you feel when {activityLower}? Tap the speaker next to each choice to hear it, then tap the choice you feel.',
          'Elegiste {activity}. ¿Cuál de estos sientes cuando {activityLower}? Toca el altavoz junto a cada opción para oírla y luego toca la opción que sientes.',
        ),
        {
          activity: actLabel,
          activityLower: actLabel.toLowerCase(),
        },
      );

  const detailCard = el('div', {
    class: 'modal-card activity-modal',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'activity-modal-title',
    onclick: (e) => e.stopPropagation(), // clicks inside the card don't dismiss
  },
    el('h2', { id: 'activity-modal-title' }, actLabel),
    readAloudButton(activityListenText),
    el('img', {
      class: 'activity-modal-image',
      src: D.assetPath('activities', act.image),
      alt: '',
    }),
    el('div', { class: 'symptom-list' },
      symptoms.map(name => {
        const selected = isSelected('activities', act.key, name);
        const displayName = tSymptom(name);
        return el('div', {
          class: 'symptom-row' + (selected ? ' is-selected' : ''),
          role: 'button',
          tabindex: '0',
          'aria-pressed': selected ? 'true' : 'false',
          onclick: () => toggleSymptom('activities', act.key, act.label, name),
          onkeydown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleSymptom('activities', act.key, act.label, name);
            }
          },
        },
          el('span', { class: 'symptom-row-label' }, displayName),
          speakOptionButton(displayName),
        );
      }),
    ),
    el('div', { class: 'activity-modal-actions' },
      el('button', { class: 'btn-secondary', onclick: () => go('activities') }, t('Done')),
    ),
  );

  const overlay = el('div', {
    class: 'modal-backdrop activity-backdrop',
    onclick: () => go('activities'), // click outside the card to dismiss
  }, detailCard);

  return el('div', {},
    siteHeader(),
    el('main', { class: 'site-main' },
      el('h1', { class: 'page-title' }, t('Activities')),
      el('p', { class: 'page-subtitle' }, t('Pick the activities where you are having problems')),
      el('div', { class: 'two-col' },
        el('div', { class: 'picker-grid picker-grid--activities' },
          D.activities.map(a => el('div', {
            class: 'picker-card' + (a.key === act.key ? ' is-selected' : ''),
          },
            el('div', { class: 'top-label' }, tLabel(a)),
            el('img', { src: D.assetPath('activities', a.image), alt: '' }),
          )),
        ),
        problemStation(),
      ),
    ),
    siteFooter(),
    overlay,
  );
}

// ---- Feelings (grid, click toggles directly)
