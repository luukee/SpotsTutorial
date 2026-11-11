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
import { isNarrowViewport } from '../viewport.js';

const MENU_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16"/></svg>';
const CLOSE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>';

const REPORT_MESSAGE = 'Reports are part of the full SPOTS site. This tutorial build focuses on the symptom-reporting flow and does not include the reporting view.';
const SETTINGS_MESSAGE = 'Settings are part of the full SPOTS site. This tutorial build focuses on the symptom-reporting flow and does not include the settings view.';

function isNarrowHeader() {
  return isNarrowViewport();
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
  if (!state.mobileMenuOpen) {
    state.mobileLogoutHint = false;
    return null;
  }
  const showLogoutHint = action.actionDisabled && state.mobileLogoutHint;
  const reason = showLogoutHint ? el('div', {
    id: 'mobile-logout-reason',
    class: 'mobile-logout-reason',
    role: 'status',
  },
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
        id: 'mobile-logout',
        class: 'mobile-account-btn' + (action.actionDisabled ? ' is-disabled' : ''),
        title: action.actionTitle,
        'aria-disabled': action.actionDisabled ? 'true' : 'false',
        'aria-describedby': showLogoutHint ? 'mobile-logout-reason' : null,
        onclick: () => {
          if (action.actionDisabled) {
            state.mobileLogoutHint = true;
            render();
            return;
          }
          runAccountAction(action);
        },
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
    type: 'button',
    id: 'header-account-menu',
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

  // Settings sits above Logout (same order as the real spots-app avatar
  // menu). It opens the tutorial "not included" notice. Logout / Finish
  // is gated on tutorial progress:
  // Session 1: "Logout" — disabled until all session-1 steps are done.
  // Session 2: "Logout" while incomplete; once all session-2 steps are done
  // it becomes "Finish Tutorial" and routes to the terminal tutorial-
  // complete screen (no further login).
  // tutorial-complete screen: Settings stays available; no Logout/Finish.
  const action = accountAction();

  const settingsButton = el('button', {
    type: 'button',
    class: 'um-settings',
    role: 'menuitem',
    title: t('Settings (not included in this tutorial build)'),
    'aria-haspopup': 'dialog',
    onclick: () => openUnavailableNotice('settings', 'header-account-menu'),
  }, t('Settings'));

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
    el('div', { class: 'um-divider' }),
    settingsButton,
    actionWrap,
  ) : null;

  return el('div', { class: 'user-menu' }, trigger, panel);
}

// ----------------------------- footer -----------------------------
