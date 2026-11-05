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
import { problemStation } from './problem-station.js';

const MENU_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16"/></svg>';
const CLOSE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>';

const REPORT_MESSAGE = 'Reports are part of the full SPOTS site. This tutorial build focuses on the symptom-reporting flow and does not include the reporting view.';
const SETTINGS_MESSAGE = 'Settings are part of the full SPOTS site. This tutorial build focuses on the symptom-reporting flow and does not include the settings view.';

function isNarrowHeader() {
  return window.matchMedia('(max-width: 1023px)').matches;
}

function activeNavKey() {
  return ({
    'home': null,
    'past-problems': 'past-problems',
    'body-parts': 'body-parts',
    'body-part-detail': 'body-parts',
    'activities': 'activities',
    'activity-detail': 'activities',
    'feelings': 'feelings',
    'search': 'search',
  })[state.screen];
}

// Shared logout / finish-tutorial gate used by the desktop avatar menu
// and the phone drawer so the two don't drift.
function accountAction() {
  const sessionComplete = isCurrentSessionComplete();
  const isTerminal = state.screen === 'tutorial-complete';
  const isFinishMode = state.session === 2 && sessionComplete;
  const actionDisabled = !sessionComplete;
  return {
    isTerminal,
    isFinishMode,
    actionDisabled,
    actionLabel: isFinishMode ? t('Finish Tutorial') : t('Logout'),
    actionTitle: sessionComplete
      ? (isFinishMode ? t('Finish the tutorial') : t('Log out'))
      : t('Complete all tutorial steps to log out'),
    remainingItems: actionDisabled
      ? tutorialProgressItems().filter(i => !i.done)
      : [],
  };
}

function runAccountAction(action) {
  if (action.actionDisabled || action.isTerminal) return;
  state.userMenuOpen = false;
  state.mobileMenuOpen = false;
  state.problemStationOpen = false;
  if (action.isFinishMode) {
    state.tutorialFlags.session2Completed = true;
    go('tutorial-complete');
  } else {
    logout();
  }
}

export function openUnavailableNotice(kind, returnFocusId) {
  state.unavailableNotice = kind;
  state.mobileMenuOpen = false;
  state.problemStationOpen = false;
  state.userMenuOpen = false;
  state.focusReturnId = returnFocusId || null;
  render();
}

export function unavailableNoticeModal() {
  const kind = state.unavailableNotice;
  if (kind !== 'report' && kind !== 'settings') return null;

  function dismiss() {
    state.unavailableNotice = null;
    render();
  }

  const title = kind === 'report' ? t('Reports') : t('Settings');
  const message = kind === 'report' ? t(REPORT_MESSAGE) : t(SETTINGS_MESSAGE);

  return el('div', {
    class: 'modal-backdrop intro-backdrop',
    onclick: (e) => { if (e.target.classList.contains('modal-backdrop')) dismiss(); },
  },
    el('div', {
      class: 'modal-card tutorial-popup notice-card',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'unavailable-notice-title',
      onclick: (e) => e.stopPropagation(),
    },
      el('button', {
        type: 'button',
        class: 'notice-close',
        'aria-label': t('Close'),
        onclick: dismiss,
        html: CLOSE_SVG,
      }),
      el('h2', { id: 'unavailable-notice-title' }, title),
      el('p', { class: 'notice-body' }, message),
      el('div', { class: 'tutorial-popup-actions' },
        el('button', { type: 'button', class: 'btn-pill primary', onclick: dismiss }, t('Got it!')),
      ),
    ),
  );
}

export function logoCorner() {
  return el('div', {
    class: 'logo-corner',
    role: 'link',
    tabindex: '0',
    'aria-label': t('SPOTS — go to home'),
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

function reportButton(className, returnFocusId) {
  return el('button', {
    type: 'button',
    id: returnFocusId,
    class: className,
    title: t('Report (not included in this tutorial build)'),
    'aria-haspopup': 'dialog',
    onclick: () => openUnavailableNotice('report', returnFocusId),
  },
    el('img', { class: 'nav-icon', src: NAV_ICONS['report'], alt: '' }),
    el('span', { class: 'label' }, t('Report')),
  );
}

function mobileNavButton(key, label, screen, isActive) {
  return el('button', {
    type: 'button',
    class: 'mobile-nav-item' + (isActive ? ' is-active' : ''),
    'aria-current': isActive ? 'page' : null,
    onclick: () => go(screen),
  },
    el('img', { src: NAV_ICONS[key], alt: '' }),
    el('span', {}, label),
  );
}

function closeMobileOverlays() {
  state.mobileMenuOpen = false;
  state.problemStationOpen = false;
  render();
}

function toggleMobileMenu() {
  const next = !state.mobileMenuOpen;
  state.mobileMenuOpen = next;
  if (next) {
    state.problemStationOpen = false;
    state.userMenuOpen = false;
    state.focusReturnId = 'mobile-menu-trigger';
  }
  render();
}

function toggleProblemStation() {
  const next = !state.problemStationOpen;
  state.problemStationOpen = next;
  if (next) {
    state.mobileMenuOpen = false;
    state.userMenuOpen = false;
    state.focusReturnId = 'problem-station-trigger';
  }
  render();
}

function problemStationButton(open) {
  const count = state.selected.length;
  const label = open
    ? t('Close Problem Station')
    : (count > 0
      ? fillTemplate(t('Problem Station, {count}'), { count })
      : t('Problem Station'));
  return el('button', {
    type: 'button',
    id: 'problem-station-trigger',
    class: 'mobile-icon-btn',
    'aria-label': label,
    'aria-expanded': open ? 'true' : 'false',
    'aria-controls': 'problem-station-panel',
    inert: state.mobileMenuOpen ? '' : null,
    onclick: (e) => {
      e.stopPropagation();
      toggleProblemStation();
    },
  },
    open
      ? el('span', { class: 'mobile-icon-svg', html: CLOSE_SVG })
      : el('img', { src: '/assets/SPOTSNavBarIcons/SPOTS-Current-Problem-Icon_02.svg', alt: '' }),
    !open && count > 0
      ? el('span', { class: 'ps-count-badge', 'aria-hidden': 'true' }, count > 99 ? '99+' : String(count))
      : null,
  );
}

function mobileDrawer(activeKey, action) {
  if (!state.mobileMenuOpen) return null;
  const reason = action.actionDisabled ? el('div', { class: 'mobile-logout-reason' },
    el('div', { class: 'mobile-logout-reason-title' }, t('Finish these steps to log out:')),
    el('ul', {},
      ...action.remainingItems.map(i => el('li', {}, i.label)),
    ),
  ) : null;

  return el('div', {
    id: 'mobile-menu',
    class: 'mobile-drawer',
    onclick: (e) => e.stopPropagation(),
  },
    el('nav', { 'aria-label': t('Main menu') },
      mobileNavButton('past-problems', t('Past Problems'), 'past-problems', activeKey === 'past-problems'),
      mobileNavButton('body-parts', t('Body Parts'), 'body-parts', activeKey === 'body-parts'),
      mobileNavButton('activities', t('Activities'), 'activities', activeKey === 'activities'),
      mobileNavButton('feelings', t('Feelings'), 'feelings', activeKey === 'feelings'),
      mobileNavButton('search', t('Search'), 'search', activeKey === 'search'),
      el('button', {
        type: 'button',
        class: 'mobile-nav-item',
        title: t('Report (not included in this tutorial build)'),
        'aria-haspopup': 'dialog',
        onclick: () => openUnavailableNotice('report', 'mobile-menu-trigger'),
      },
        el('img', { src: NAV_ICONS['report'], alt: '' }),
        el('span', {}, t('Report')),
      ),
    ),
    el('div', { class: 'mobile-account' },
      el('div', { class: 'mobile-avatar', 'aria-hidden': 'true' },
        el('img', { src: '/assets/avatarAsset.svg', alt: '' }),
      ),
      el('button', {
        type: 'button',
        class: 'mobile-account-btn',
        'aria-haspopup': 'dialog',
        onclick: () => openUnavailableNotice('settings', 'mobile-menu-trigger'),
      }, t('Settings')),
      action.isTerminal ? null : el('button', {
        type: 'button',
        class: 'mobile-account-btn' + (action.actionDisabled ? ' is-disabled' : ''),
        title: action.actionTitle,
        'aria-disabled': action.actionDisabled ? 'true' : 'false',
        onclick: () => runAccountAction(action),
      }, action.actionLabel),
      reason,
    ),
    el('p', { class: 'mobile-reporting-status' },
      t('Logged in as:'),
      ' ',
      el('strong', {}, state.user.name),
      ', ',
      t('Reporting for:'),
      ' ',
      el('strong', {}, state.user.name),
    ),
  );
}

function mobileProblemStationPanel() {
  if (!state.problemStationOpen) return null;
  return el('div', {
    id: 'problem-station-panel',
    class: 'mobile-ps-panel',
    onclick: (e) => e.stopPropagation(),
  },
    problemStation(),
  );
}

function mobileHeaderBar(menuOpen, psOpen) {
  return el('div', { class: 'mobile-header-bar' },
    el('div', { class: 'mobile-header-actions' },
      problemStationButton(psOpen),
      el('button', {
        type: 'button',
        id: 'mobile-menu-trigger',
        class: 'mobile-icon-btn',
        'aria-expanded': menuOpen ? 'true' : 'false',
        'aria-controls': 'mobile-menu',
        'aria-label': menuOpen ? t('Close menu') : t('Open menu'),
        onclick: (e) => {
          e.stopPropagation();
          toggleMobileMenu();
        },
      },
        el('span', { class: 'mobile-icon-svg', html: menuOpen ? CLOSE_SVG : MENU_SVG }),
      ),
    ),
    el('button', {
      type: 'button',
      class: 'mobile-logo',
      'aria-label': t('SPOTS — go to home'),
      onclick: () => {
        state.mobileMenuOpen = false;
        state.problemStationOpen = false;
        go('home');
      },
    },
      el('img', { src: '/assets/spots-logo-white.webp', alt: '' }),
    ),
  );
}

export function siteHeader() {
  const activeKey = activeNavKey();
  const narrow = isNarrowHeader();
  const menuOpen = narrow && state.mobileMenuOpen;
  const psOpen = narrow && state.problemStationOpen;
  const overlayOpen = menuOpen || psOpen;
  const action = accountAction();
  const overlayLabel = menuOpen ? t('Main menu') : t('Problem Station');

  return el('header', {
    class: 'site-header',
    role: overlayOpen ? 'dialog' : null,
    'aria-modal': overlayOpen ? 'true' : null,
    'aria-label': overlayOpen ? overlayLabel : null,
  },
    overlayOpen ? el('div', {
      class: 'mobile-backdrop',
      onclick: closeMobileOverlays,
    }) : null,
    mobileDrawer(activeKey, action),
    mobileProblemStationPanel(),
    mobileHeaderBar(menuOpen, psOpen),
    logoCorner(),
    el('nav', { class: 'top-nav', 'aria-label': t('Main menu') },
      navButton('past-problems', t('Past Problems'), 'past-problems', activeKey === 'past-problems'),
      navButton('body-parts',    t('Body Parts'),       'body-parts',    activeKey === 'body-parts'),
      navButton('activities',    t('Activities'),             'activities',    activeKey === 'activities'),
      navButton('feelings',      t('Feelings'),              'feelings',      activeKey === 'feelings'),
      navButton('search',        t('Search'),                      'search',        activeKey === 'search'),
      reportButton('nav-item', 'header-report'),
    ),
    el('div', { class: 'user-area' },
      el('button', {
        type: 'button',
        id: 'header-settings',
        class: 'icon-btn settings-btn',
        title: t('Settings (not included in this tutorial build)'),
        'aria-label': t('Settings'),
        'aria-haspopup': 'dialog',
        onclick: () => openUnavailableNotice('settings', 'header-settings'),
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
  const action = accountAction();

  const actionButton = action.isTerminal ? null : el('button', {
    type: 'button',
    class: 'um-logout' + (action.actionDisabled ? ' is-disabled' : '') + (action.isFinishMode ? ' is-finish' : ''),
    role: 'menuitem',
    title: action.actionTitle,
    'aria-disabled': action.actionDisabled ? 'true' : 'false',
    onclick: () => runAccountAction(action),
  }, action.actionLabel);

  const reasonBlock = action.actionDisabled ? el('div', { class: 'um-reason', role: 'tooltip' },
    el('div', { class: 'um-reason-title' }, t('Finish these steps to log out:')),
    el('ul', { class: 'um-reason-list' },
      ...action.remainingItems.map(i => el('li', { class: 'um-reason-item' }, i.label)),
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
      action.isTerminal ? el('div', { class: 'um-row' },
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
