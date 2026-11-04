/** Past problems list. */
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

export function pastProblemsScreen() {
  const archive = state.pastProblemsArchive;

  // Map archive item `category` to the production-style context line shown
  // beneath the symptom name. Mirrors `formatSymptomReportContextLine` in
  // app/_lib/utils/symptom-report-context-line.ts: "Body Parts / Head",
  // "Activities / Drawing", "Feelings", "Search" — production renders the
  // subcategory after a slash for body_parts/activities, and just the
  // category name for feelings/search where the subcategory is implicit.
  function ppContextLine(item) {
    const cat = item.category;
    const BODY = t('Body Parts');
    const ACT = t('Activities');
    if (cat === 'body_parts')  return BODY + (item.contextLabel ? ' / ' + item.contextLabel : '');
    if (cat === 'activities')  return ACT  + (item.contextLabel ? ' / ' + item.contextLabel : '');
    if (cat === 'feelings')    return t('Feelings');
    if (cat === 'search')      return t('Search');
    return item.contextLabel || '';
  }

  const body = archive.length === 0
    ? el('div', { class: 'pp-empty' },
        el('p', { class: 'pp-empty-text' }, t('Past problems will show up here after you finish a session.')),
      )
    : el('div', { class: 'pp-list problem-list' },
        archive.map(item => {
          const selected = isSelected('prior_problems', item.subcategory, item.name);
          // Dot count mirrors production `slotCount` — one dot per
          // PRO-CTCAE question for this symptom (feelings=2, others=3).
          const slotCount = item.category === 'feelings' ? 2 : 3;
          const ctxLine = ppContextLine(item);
          return el('div', {
            class: 'pp-row' + (selected ? ' is-selected' : ''),
            role: 'button',
            tabindex: '0',
            'aria-pressed': selected ? 'true' : 'false',
            onclick: () => toggleSymptom('prior_problems', item.subcategory, item.contextLabel, item.name),
            onkeydown: (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSymptom('prior_problems', item.subcategory, item.contextLabel, item.name);
              }
            },
          },
            el('div', { class: 'pp-info' },
              el('span', { class: 'pp-name' }, tSymptom(item.name)),
              (ctxLine || item.dateLabel) ? el('div', { class: 'pp-subtext' },
                ctxLine ? el('span', { class: 'pp-context' }, ctxLine) : null,
                item.dateLabel ? el('span', { class: 'pp-date' }, t('Last reported ') + item.dateLabel) : null,
              ) : null,
            ),
            el('div', { class: 'pp-dots', title: t('Last reported: ') + (item.dateLabel || '') },
              Array.from({ length: slotCount }, () => el('span', { class: 'pp-dot' })),
            ),
          );
        }),
      );

  return el('div', {},
    siteHeader(),
    el('main', { class: 'site-main past-problems-page' },
      el('header', { class: 'page-header' },
        el('h1', { class: 'page-title' }, t('Past Problems')),
        el('p', { class: 'page-subtitle' }, t('These are problems your child has reported before. Tap any one to add it to today’s session.')),
      ),
      el('div', { class: 'two-col' },
        body,
        problemStation(),
      ),
    ),
    siteFooter(),
  );
}
