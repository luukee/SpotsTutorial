/** Top-level render + modal scroll lock. */
import { state } from './state.js';
import { setRender } from './render-ref.js';
import { tutorialDock } from './shell/dock.js';
import {
  welcomeScreen,
  homeScreen,
  bodyPartsScreen,
  bodyPartDetailScreen,
  activitiesScreen,
  activityDetailScreen,
  feelingsScreen,
  searchScreen,
  pastProblemsScreen,
  questionModal,
  introModal,
  loginPromptModal,
  loginScreen,
  welcomeBackScreen,
  tutorialCompleteScreen,
  loadAndWireBodySvgs,
} from './screens/index.js';
import { hintModal } from './hints.js';

const root = document.getElementById('app');

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let lastModalOpen = false;

export function isEmbeddedFrame() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

export function applyModalScrollLock(isOpen) {
  // Inside the spots-app TutorialModal iframe, locking html/body hides
  // the only usable scrollbar (the iframe). Overlay cards scroll themselves.
  if (isEmbeddedFrame()) {
    lastModalOpen = isOpen;
    return;
  }
  if (isOpen && !lastModalOpen) {
    // Modal just opened — capture current scroll so we can restore it.
    const y = window.scrollY || window.pageYOffset || 0;
    document.body.style.setProperty('--scroll-y', `-${y}px`);
    document.body.dataset.scrollY = String(y);
    document.body.classList.add('modal-open');
  } else if (!isOpen && lastModalOpen) {
    // Modal closed — restore scroll. Read y BEFORE removing the class,
    // since clearing `position: fixed` snaps the page to top on iOS.
    const y = parseInt(document.body.dataset.scrollY || '0', 10);
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('--scroll-y');
    delete document.body.dataset.scrollY;
    window.scrollTo(0, y);
  }
  lastModalOpen = isOpen;
}

export function render() {
  root.innerHTML = '';
  let view;
  switch (state.screen) {
    case 'welcome':            view = welcomeScreen(); break;
    case 'home':               view = homeScreen(); break;
    case 'past-problems':      view = pastProblemsScreen(); break;
    case 'body-parts':         view = bodyPartsScreen(); break;
    case 'body-part-detail':   view = bodyPartDetailScreen(); break;
    case 'activities':         view = activitiesScreen(); break;
    case 'activity-detail':    view = activityDetailScreen(); break;
    case 'feelings':           view = feelingsScreen(); break;
    case 'search':             view = searchScreen(); break;
    case 'login':              view = loginScreen(); break;
    case 'welcome-back':       view = welcomeBackScreen(); break;
    case 'tutorial-complete':  view = tutorialCompleteScreen(); break;
    default:
      console.warn('Unknown screen:', state.screen, '— falling back to welcome');
      view = welcomeScreen();
  }
  root.appendChild(view);
  const modal = questionModal();
  if (modal) root.appendChild(modal);
  // Floating tutorial-progress dock — present on every interactive screen.
  // Hidden on welcome (pre-session), login (logged out), welcome-back
  // (session 2 intro), and tutorial-complete (post-session) where progress
  // tracking isn't meaningful.
  const hideDockOn = new Set(['welcome', 'welcome-back', 'login', 'tutorial-complete']);
  if (!hideDockOn.has(state.screen)) {
    root.appendChild(tutorialDock());
  }
  const hint = hintModal();
  if (hint) root.appendChild(hint);
  const intro = introModal();
  if (intro) root.appendChild(intro);
  const loginPrompt = loginPromptModal();
  if (loginPrompt) root.appendChild(loginPrompt);

  // Lock body scroll while a modal is open so the page-behind doesn't
  // scroll on iOS / Android. `activity-detail` renders its own overlay
  // inside the screen (not via state flag) so we treat that screen as
  // a modal-open state too.
  const introOpen = !state.introDismissed && state.session === 1 && state.screen === 'home';
  const loginPromptOpen = !state.loginPromptDismissed && state.screen === 'login';
  const isModalOpen = !!(
    state.activeHintKey
    || state.pendingSymptom
    || state.screen === 'activity-detail'
    || introOpen
    || loginPromptOpen
  );
  applyModalScrollLock(isModalOpen);

  loadAndWireBodySvgs();
  // Search input loses focus across re-renders (every keystroke triggers
  // render → DOM rebuild → input recreated). Restore focus + put the caret
  // back at the end so typing continues uninterrupted.
  if (state.screen === 'search') {
    const input = root.querySelector('.search-box input');
    if (input && document.activeElement !== input) {
      input.focus();
      const len = input.value.length;
      try { input.setSelectionRange(len, len); } catch (e) { /* some input types don't support */ }
    }
  }
  // Modal focus: when a dialog is open, pull focus into it on first paint
  // and keep Tab cycling inside it.
  const dialogs = root.querySelectorAll('[role="dialog"]');
  const topDialog = dialogs[dialogs.length - 1];
  if (topDialog && !topDialog.contains(document.activeElement)) {
    const firstFocusable = topDialog.querySelector(FOCUSABLE_SELECTOR);
    if (firstFocusable) firstFocusable.focus();
  }
}

setRender(render);

export { root };
