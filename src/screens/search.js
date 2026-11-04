/** Symptom search screen. */
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

export function searchScreen() {
  const rawQuery = state.currentSearchQuery;
  const q = rawQuery.trim().toLowerCase();
  const results = q.length === 0 ? [] :
    D.searchCorpus.filter(it => it.name.toLowerCase().includes(q)).slice(0, 24);
  const hasQuery = rawQuery.length > 0;
  const hasResults = results.length > 0;

  // Magnifying glass — subtle gray when there's a query (sits next to the
  // X clear button), more prominent when the input is empty.
  const MAG_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
    'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>';

  const resultsList = hasResults
    ? el('div', { class: 'search-results-pills' },
        results.map(it => {
          const selected = isSelected(it.category, it.subcategory, it.name);
          const displayName = tSymptom(it.name);
          return el('div', {
            class: 'search-pill-row' + (selected ? ' is-selected' : ''),
            onclick: () => toggleSymptom(it.category, it.subcategory, it.contextLabel, it.name),
            role: 'button',
            tabindex: '0',
            onkeydown: (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSymptom(it.category, it.subcategory, it.contextLabel, it.name);
              }
            },
          },
            el('span', { class: 'search-pill-name' }, displayName),
            speakOptionButton(displayName),
          );
        }),
      )
    : null;

  // Empty-results state (query entered but no matches) reuses the same
  // add-custom card the user can always reach from the bottom of the page.
  const noMatchesNote = hasQuery && !hasResults
    ? el('p', { class: 'search-no-matches' }, t(
        `No matches for "${rawQuery.trim()}".`,
        `Sin resultados para «${rawQuery.trim()}».`
      ))
    : null;

  // Add-as-new-symptom card: dashed border, query echoed in orange.
  // Only renders once the user has typed something.
  const customQuery = rawQuery.trim();
  const addCustomCard = hasQuery ? el('div', { class: 'search-add-block' },
    el('p', { class: 'search-add-caption' }, t("Can't find what you are looking for? Click the add button:")),
    el('div', { class: 'search-add-card-wrap' },
      el('button', {
        class: 'search-add-card',
        onclick: () => toggleSymptom('search', 'custom', 'Search', customQuery),
      },
        el('div', { class: 'search-add-title' }, t('Add as a new symptom:')),
        el('div', { class: 'search-add-query' }, `"${customQuery}"`),
      ),
      speakOptionButton(customQuery),
    ),
  ) : null;

  const searchResultsLabel = t('Please select from the list of symptoms :');
  const searchListenText = hasResults
    ? joinSpokenSentences([searchResultsLabel, tapSpeakerTip()])
    : '';

  return el('div', {},
    siteHeader(),
    el('main', { class: 'site-main search-page' },
      el('h1', { class: 'page-title' }, t('Search')),
      el('p', { class: 'page-subtitle' }, t('Tell us the problems your child is still having:')),
      el('div', { class: 'two-col' },
        el('div', { class: 'search-column' },
          el('label', { class: 'search-label', for: 'search-input' }, t('My child is having:')),
          el('div', { class: 'search-box' + (hasQuery ? ' has-query' : '') },
            el('input', {
              id: 'search-input',
              type: 'text',
              placeholder: t('Problem'),
              value: rawQuery,
              autofocus: 'true',
              'aria-label': t('Search symptoms'),
              oninput: (e) => { state.currentSearchQuery = e.target.value; render(); },
            }),
            hasQuery ? el('button', {
              class: 'search-clear',
              'aria-label': t('Clear search'),
              title: t('Clear'),
              onclick: () => { state.currentSearchQuery = ''; render(); },
            }, '×') : null,
            el('span', { class: 'search-icon-svg' + (hasQuery ? ' is-subtle' : ''), html: MAG_SVG }),
          ),
          hasResults ? el('p', { class: 'search-results-label' }, searchResultsLabel) : null,
          hasResults ? el('div', { class: 'read-aloud-row' }, readAloudButton(searchListenText)) : null,
          resultsList,
          noMatchesNote,
          addCustomCard,
        ),
        problemStation(),
      ),
    ),
    siteFooter(),
  );
}

// ---- Past Problems
