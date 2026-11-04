/** Feelings picker grid. */
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

export function feelingsScreen() {
  const feelingsSubtitle = t('Pick the feelings where you are having problems');
  const feelingsListenText = joinSpokenSentences([feelingsSubtitle, tapSpeakerTip()]);
  return el('div', {},
    siteHeader(),
    el('main', { class: 'site-main' },
      el('h1', { class: 'page-title' }, t('Feelings')),
      el('p', { class: 'page-subtitle' }, feelingsSubtitle),
      el('div', { class: 'read-aloud-row' }, readAloudButton(feelingsListenText)),
      el('div', { class: 'two-col' },
        el('div', { class: 'picker-grid picker-grid--feelings' },
          D.feelings.map(f => {
            const selected = isSelected('feelings', f.key, f.label);
            const feelingLabel = tLabel(f);
            return el('div', {
              class: 'picker-card feelings' + (selected ? ' is-selected' : ''),
              onclick: () => toggleSymptom('feelings', f.key, 'Feelings', f.label),
            },
              el('div', { class: 'top-label feelings-label' }, feelingLabel),
              speakOptionButton(feelingLabel),
              el('img', { src: D.assetPath('Feelings-Final', f.image), alt: '' }),
              el('div', { class: 'feelings-dots' },
                el('span', {}), el('span', {}), el('span', {}),
              ),
            );
          }),
        ),
        problemStation(),
      ),
    ),
    siteFooter(),
  );
}

// ---- Search
