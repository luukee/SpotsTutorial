/** Site footer. */
import { state, isSelected, findSelected, questionIdsForSymptom } from '../state.js';
import { tutorialProgressItems, isCurrentSessionComplete } from '../progress.js';
import { D } from '../data.js';
import { el } from '../dom.js';
import { t, tLabel, tSymptom, tOption, fillTemplate, joinSpokenSentences, setLanguage } from '../i18n.js';
import { go, logout, skipToNextSession, toggleSymptom, openEditSymptom } from '../navigation.js';
import { render } from '../render-ref.js';
import { readAloudButton, speakOptionButton, tapSpeakerTip, stopSpeaking } from '../speech.js';
import { categoryLabelFor, formatDateMDY } from '../utils.js';

export function siteFooter() {
  return el('footer', { class: 'site-footer' },
    el('div', { class: 'footer-grid' },
      el('div', {},
        el('h4', {}, t('Project Contact')),
        el('p', {}, 'Dr. Stacey Crane, PhD, RN, CPON'),
        el('p', {}, t('Department of Research')),
        el('p', {}, t('Cizik School of Nursing at UTHealth Houston')),
        el('p', { style: { marginTop: '8px' } }, t('Phone: 713-500-2233')),
        el('p', {}, t('Email: SPOTS@uth.tmc.edu')),
      ),
      el('div', {},
        el('h4', {}, t('Quick Links')),
        el('a', {}, t('Privacy Policy')),
        el('a', {}, t('Site Policies & Required Links')),
        el('a', {
          href: '#',
          title: state.session === 2
            ? t('Skip to the end of the tutorial')
            : t('Skip to the next tutorial session'),
          onclick: (e) => { e.preventDefault(); skipToNextSession(); },
        }, t('Emergency Information')),
        el('a', {}, t('Campus Carry')),
      ),
      el('div', { class: 'uth-logo' },
        el('img', { src: '/assets/UTHH-CSON-Logo.webp', alt: t('UTHealth Houston Cizik School of Nursing') }),
      ),
    ),
    el('div', { class: 'lang-row' },
      el('button', { class: 'theme-toggle', title: t('Toggle theme'),
        html: '<svg viewBox="0 0 512 512" aria-hidden="true"><path d="M361.5 1.2c5 2.1 8.6 6.6 9.6 11.9L391 121l107.9 19.8c5.3 1 9.8 4.6 11.9 9.6s1.5 10.7-1.6 15.2L446.9 256l62.3 90.3c3.1 4.5 3.7 10.2 1.6 15.2s-6.6 8.6-11.9 9.6L391 391 371.1 498.9c-1 5.3-4.6 9.8-9.6 11.9s-10.7 1.5-15.2-1.6L256 446.9l-90.3 62.3c-4.5 3.1-10.2 3.7-15.2 1.6s-8.6-6.6-9.6-11.9L121 391 13.1 371.1c-5.3-1-9.8-4.6-11.9-9.6s-1.5-10.7 1.6-15.2L65.1 256 2.8 165.7c-3.1-4.5-3.7-10.2-1.6-15.2s6.6-8.6 11.9-9.6L121 121 140.9 13.1c1-5.3 4.6-9.8 9.6-11.9s10.7-1.5 15.2 1.6L256 65.1 346.3 2.8c4.5-3.1 10.2-3.7 15.2-1.6zM160 256a96 96 0 1 1 192 0 96 96 0 1 1 -192 0zm224 0a128 128 0 1 0 -256 0 128 128 0 1 0 256 0z"/></svg>',
      }),
      el('div', {
        class: 'lang-toggle',
        role: 'group',
        'aria-label': t('Language'),
      },
        el('button', {
          class: state.language === 'en' ? 'is-active' : '',
          'aria-pressed': state.language === 'en' ? 'true' : 'false',
          onclick: () => setLanguage('en'),
        }, 'English'),
        el('button', {
          class: state.language === 'es' ? 'is-active' : '',
          'aria-pressed': state.language === 'es' ? 'true' : 'false',
          onclick: () => setLanguage('es'),
        }, 'Español'),
      ),
    ),
    el('p', { class: 'copyright' },
      t('Copyright 2019-2025 - The University of Texas Health Science Center at Houston (UTHealth Houston) Powered by Center for Digital Health and Analytics at McWilliams School of Biomedical Informatics at UTHealth Houston')),
    el('div', { class: 'footer-confetti' },
      el('img', { src: '/assets/Spot_Assets-02.svg', alt: '' }),
    ),
  );
}

// ----------------------------- Problem Station sidebar -----------------------------
// Map a symptom's origin/category to a human-readable category label for the
// sub-line under the symptom name. Prefer origin (matches the screen the user
// picked it from — e.g. a Search-picked symptom reads "Search" even though
// its underlying `category` is body_parts/activities/feelings).
