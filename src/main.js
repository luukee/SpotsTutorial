/** Practice guide boot. */
import '../styles.css';
import { render, root } from './render.js';
import { state } from './state.js';
import { loadTranslations, translationsLoaded } from './i18n.js';
import { dismissQuestionnaireModal } from './navigation.js';

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const dialogs = root.querySelectorAll('[role="dialog"]');
  const dialog = dialogs[dialogs.length - 1];
  if (!dialog) return;
  const items = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR));
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (state.activeHintKey) {
    state.activeHintKey = null;
    render();
  } else if (state.pendingSymptom) {
    // Same dismiss path as Cancel / Saved Close (activity-detail → Activities).
    dismissQuestionnaireModal();
  } else if (!state.introDismissed && state.session === 1 && state.screen === 'home') {
    state.introDismissed = true;
    render();
  } else if (!state.loginPromptDismissed && state.screen === 'login') {
    state.loginPromptDismissed = true;
    render();
  } else if (state.unavailableNotice) {
    state.unavailableNotice = null;
    render();
  } else if (state.mobileMenuOpen) {
    state.mobileMenuOpen = false;
    render();
  } else if (state.problemStationOpen) {
    state.problemStationOpen = false;
    render();
  } else if (state.userMenuOpen) {
    state.userMenuOpen = false;
    render();
  }
});

// The phone bar only exists under 1024px. If the window grows past that
// while a panel is open, drop the panel so the wide header isn't a dialog.
window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => {
  if (!e.matches) return;
  if (!state.mobileMenuOpen && !state.problemStationOpen) return;
  state.mobileMenuOpen = false;
  state.problemStationOpen = false;
  render();
});

document.addEventListener('click', () => {
  if (state.userMenuOpen) {
    state.userMenuOpen = false;
    render();
  }
});

render();

loadTranslations().then(() => {
  if (translationsLoaded) render();
});
