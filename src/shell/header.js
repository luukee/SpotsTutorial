/** Top navigation and account menu. */
import { state, isSelected, findSelected, questionIdsForSymptom } from '../state.js';
import { tutorialProgressItems, isCurrentSessionComplete } from '../progress.js';
import { D } from '../data.js';
import { el } from '../dom.js';
import { t, tLabel, tSymptom, tOption, fillTemplate, joinSpokenSentences, setLanguage } from '../i18n.js';
import { go, logout, skipToNextSession, toggleSymptom, openEditSymptom } from '../navigation.js';
import { render } from '../render-ref.js';
import { readAloudButton, speakOptionButton, tapSpeakerTip, stopSpeaking } from '../speech.js';
import { categoryLabelFor, formatDateMDY } from '../utils.js';
import { NAV_ICONS } from '../nav-icons.js';

export function logoCorner() {
  return el('div', {
    class: 'logo-corner',
    role: 'link',
    tabindex: '0',
    'aria-label': 'SPOTS — go to home',
    onclick: () => go('home'),
    onkeydown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go('home'); }
    },
  },
    el('img', { class: 'curve',     src: '/assets/Spots-curve.svg',                 alt: '' }),
    el('img', { class: 'confetti',  src: '/assets/Spot_Assets-01.svg',              alt: '' }),
    el('img', { class: 'word-logo', src: '/assets/Spots-Logo-UpdatedBG-white.svg',  alt: 'SPOTS' }),
  );
}

export function navButton(key, label, screen, isActive) {
  return el('button', {
    class: 'nav-item' + (isActive ? ' is-active' : ''),
    'aria-current': isActive ? 'page' : null,
    onclick: () => go(screen),
  },
    el('img', { class: 'nav-icon', src: NAV_ICONS[key], alt: '' }),
    el('span', { class: 'label' }, label),
  );
}

export function siteHeader() {
  const activeKey = ({
    'home': null,
    'past-problems': 'past-problems',
    'body-parts': 'body-parts',
    'body-part-detail': 'body-parts',
    'activities': 'activities',
    'activity-detail': 'activities',
    'feelings': 'feelings',
    'search': 'search',
  })[state.screen];

  return el('header', { class: 'site-header' },
    logoCorner(),
    el('nav', { class: 'top-nav' },
      navButton('past-problems', t('Past Problems'), 'past-problems', activeKey === 'past-problems'),
      navButton('body-parts',    t('Body Parts'),       'body-parts',    activeKey === 'body-parts'),
      navButton('activities',    t('Activities'),             'activities',    activeKey === 'activities'),
      navButton('feelings',      t('Feelings'),              'feelings',      activeKey === 'feelings'),
      navButton('search',        t('Search'),                      'search',        activeKey === 'search'),
      el('button', {
        class: 'nav-item',
        title: t('Report (not included in this tutorial build)'),
        onclick: () => alert(t('Reports are part of the full SPOTS site. This tutorial build focuses on the symptom-reporting flow and does not include the reporting view.')),
      },
        el('img', { class: 'nav-icon', src: NAV_ICONS['report'], alt: '' }),
        el('span', { class: 'label' }, t('Report')),
      ),
    ),
    el('div', { class: 'user-area' },
      el('button', {
        class: 'icon-btn settings-btn',
        title: t('Settings (not included in this tutorial build)'),
        'aria-label': t('Settings'),
        onclick: () => alert(t('Settings are part of the full SPOTS site. This tutorial build focuses on the symptom-reporting flow and does not include the settings view.')),
        // Inline FontAwesome-style gear so it renders cleanly across systems
        // (the unicode ⚙ glyph rendered flat on most platforms).
        html: '<svg viewBox="0 0 512 512" aria-hidden="true" focusable="false"><path fill="currentColor" d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"/></svg>',
      }),
      userMenu(),
    ),
  );
}

// ----------------------------- Account dropdown -----------------------------
// Avatar in the header is the trigger. Click toggles the panel below it
// (right-aligned to the avatar, drops DOWN under the header). Clicking
// outside or pressing Escape closes it (see global handler at bottom of
// file). Logout clears in-progress session state and routes to the login
// screen; pastProblemsArchive + tutorialFlags are preserved across logout.

export function userMenu() {
  const open = !!state.userMenuOpen;
  const trigger = el('button', {
    class: 'avatar' + (open ? ' is-open' : ''),
    title: t('Account'),
    'aria-label': t('Account menu'),
    'aria-haspopup': 'true',
    'aria-expanded': open ? 'true' : 'false',
    onclick: (e) => {
      e.stopPropagation();
      state.userMenuOpen = !state.userMenuOpen;
      render();
    },
  },
    el('img', { src: '/assets/avatarAsset.svg', alt: '' }),
  );

  // The bottom button of the dropdown is gated on tutorial progress.
  // Session 1: "Logout" — disabled until all session-1 steps are done.
  // Session 2: "Logout" while incomplete; once all session-2 steps are done
  // it becomes "Finish Tutorial" and routes to the terminal tutorial-
  // complete screen (no further login).
  // tutorial-complete screen: dropdown shows account info only — no action
  // button (the tutorial is over).
  const sessionComplete = isCurrentSessionComplete();
  const isTerminal = state.screen === 'tutorial-complete';
  const isFinishMode = state.session === 2 && sessionComplete;
  const actionLabel = isFinishMode ? t('Finish Tutorial') : t('Logout');
  const actionTitle = sessionComplete
    ? (isFinishMode ? t('Finish the tutorial') : t('Log out'))
    : t('Complete all tutorial steps to log out');
  const actionDisabled = !sessionComplete;

  const actionButton = isTerminal ? null : el('button', {
    class: 'um-logout' + (actionDisabled ? ' is-disabled' : '') + (isFinishMode ? ' is-finish' : ''),
    role: 'menuitem',
    title: actionTitle,
    'aria-disabled': actionDisabled ? 'true' : 'false',
    onclick: () => {
      if (actionDisabled) return;
      state.userMenuOpen = false;
      if (isFinishMode) {
        state.tutorialFlags.session2Completed = true;
        go('tutorial-complete');
      } else {
        logout();
      }
    },
  }, actionLabel);

  const remainingItems = actionDisabled
    ? tutorialProgressItems().filter(i => !i.done)
    : [];

  const reasonBlock = actionDisabled ? el('div', { class: 'um-reason', role: 'tooltip' },
    el('div', { class: 'um-reason-title' }, t('Finish these steps to log out:')),
    el('ul', { class: 'um-reason-list' },
      ...remainingItems.map(i => el('li', { class: 'um-reason-item' }, i.label)),
    ),
  ) : null;

  const actionWrap = actionButton ? el('div', { class: 'um-logout-wrap' },
    actionButton,
    reasonBlock,
  ) : null;

  const panel = open ? el('div', {
    class: 'user-menu-panel',
    role: 'menu',
    onclick: (e) => e.stopPropagation(),
  },
    el('div', { class: 'um-arrow' }),
    el('div', { class: 'um-info' },
      el('div', { class: 'um-row' },
        el('span', { class: 'um-label' }, t('Logged in as:')),
        el('span', { class: 'um-value' }, state.user.name),
      ),
      isTerminal ? el('div', { class: 'um-row' },
        el('span', { class: 'um-label' }, t('Status:')),
        el('span', { class: 'um-value' }, t('Tutorial complete')),
      ) : null,
    ),
    actionWrap ? el('div', { class: 'um-divider' }) : null,
    actionWrap,
  ) : null;

  return el('div', { class: 'user-menu' }, trigger, panel);
}

// ----------------------------- footer -----------------------------
