/** Problem Station cart. */
import { state, isSelected, findSelected, questionIdsForSymptom } from '../state.js';
import { tutorialProgressItems, isCurrentSessionComplete } from '../progress.js';
import { D } from '../data.js';
import { el } from '../dom.js';
import { t, tLabel, tSymptom, tOption, fillTemplate, joinSpokenSentences, setLanguage } from '../i18n.js';
import { go, logout, skipToNextSession, toggleSymptom, openEditSymptom } from '../navigation.js';
import { render } from '../render-ref.js';
import { readAloudButton, speakOptionButton, tapSpeakerTip, stopSpeaking } from '../speech.js';
import { categoryLabelFor, formatDateMDY } from '../utils.js';

export function problemStation() {
  const items = state.selected.length === 0
    ? el('div', { class: 'ps-empty' }, t('You have not reported any problems yet.'))
    : el('div', { class: 'ps-rows' },
        state.selected.map(s => {
          // Answer dot count is per-symptom — feelings have 2 questions,
          // body_parts/activities/search have 3 (see questionIdsForSymptom).
          const required = questionIdsForSymptom(s);
          const displayName = tSymptom(s.name);
          const subLabel = s.subcategory ? `${categoryLabelFor(s)} / ${s.subcategory}` : categoryLabelFor(s);
          const answeredCount = required.reduce(
            (n, qid) => n + ((s.answers && s.answers[qid] !== undefined) ? 1 : 0), 0);
          const dots = required.map((qid) => el('span', {
            class: 'ps-dot' + ((s.answers && s.answers[qid] !== undefined) ? ' is-on' : ''),
          }));
          return el('div', {
            class: 'ps-card',
            role: 'button',
            tabindex: '0',
            'aria-label': t(
              `Edit responses for ${displayName}. ${answeredCount} of ${required.length} questions answered.`,
              `Editar respuestas para ${displayName}. ${answeredCount} de ${required.length} preguntas respondidas.`
            ),
            title: t('Click to edit responses'),
            onclick: () => openEditSymptom(s),
            onkeydown: (e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEditSymptom(s); }
            },
          },
            el('div', { class: 'ps-card-top' },
              el('div', { class: 'ps-card-name' }, displayName),
              el('div', { class: 'ps-card-right' },
                el('div', { class: 'ps-dots' }, ...dots),
                el('button', {
                  class: 'ps-trash',
                  title: t('Remove'),
                  'aria-label': t(`Remove ${displayName}`, `Eliminar ${displayName}`),
                  onclick: (e) => {
                    e.stopPropagation();
                    state.selected = state.selected.filter(x => x !== s);
                    state.tutorialFlags.deletedProblem = true;
                    render();
                  },
                  onkeydown: (e) => {
                    // Don't let Enter/Space on the trash button bubble up to
                    // the row's keydown handler and re-open the edit modal.
                    if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
                  },
                  html: TRASH_SVG,
                }),
              ),
            ),
            el('div', { class: 'ps-card-sub' }, subLabel),
            el('div', { class: 'ps-card-date' }, formatDateMDY(s.dateAdded)),
          );
        }));

  return el('aside', { class: 'problem-station' },
    el('h3', {}, t('Problem Station')),
    el('p', { class: 'ps-sub' }, t('Tell us about the problems you are having right now.')),
    el('div', { class: 'ps-list' }, items),
    el('p', { class: 'ps-note' },
      t("Please remember, the problems reported in SPOTS are not automatically shared with your healthcare team. You must continue to report your/your child's problems to your healthcare team as you normally would.")),
  );
}

// Floating dock-style tutorial-progress button. Lives top-right under the
// avatar; magnifies on hover (Apple Dock style); click toggles a popup with
// the full checklist. Editing is done by clicking a Problem Station row
// directly — there's no longer a CTA in this panel.
