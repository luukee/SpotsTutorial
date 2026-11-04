/** Shared practice-guide session state. */
export const state = {
  // 'en' | 'es'. Wired to the footer language toggle. Production fetches
  // Spanish from REDCap; the tutorial loads Spanish from `translations.csv`
  // at init via `loadTranslations()` and reads it through `t(en)`.
  language: 'en',
  // Set true after the user dismisses the welcome intro popup. The popup
  // only shows on the first render of the welcome screen in session 1.
  // We don't persist this across page reloads — refresh = restart the
  // whole tutorial, including the intro.
  introDismissed: false,
  // Set true after the user dismisses the "log in again" popup on the
  // session-2 login screen. Same no-persistence rule.
  loginPromptDismissed: false,
  screen: 'welcome',
  selected: [],
  currentBodyPart: null,
  currentActivity: null,
  currentSearchQuery: '',
  pendingSymptom: null,
  questionStep: 0,
  // When editing an already-selected symptom (clicked from the Problem
  // Station), the question modal points `pendingSymptom` AT the live entry
  // in `state.selected` so every answer write persists immediately — no
  // "Save" step. This id flags edit mode for the modal and is cleared on
  // close. See `openEditSymptom()` / `questionModal().setAnswer()`.
  editingSymptomId: null,
  pastProblemsArchive: [],
  showBodyBack: false,
  tutorialDockOpen: false,
  activeHintKey: null,
  // Account dropdown (top-right header). Click avatar to toggle; click
  // outside or Esc to close. See userMenu() / logout().
  userMenuOpen: false,
  // Tracks which tutorial session we're in. 1 = first session,
  // 2 = after logout/login. Past-problems archive carries across sessions
  // but the in-progress `selected` list does not.
  session: 1,
  // Identity shown in the user dropdown. Pure in-memory, no auth.
  user: { name: 'User' },
  // Tracks symptoms finalized in the CURRENT session (resets on logout /
  // session start). Powers the session-2 "Reported a problem" step which
  // needs to detect a NEW report after returning, regardless of what carries
  // over in pastProblemsArchive.
  sessionProblemsLogged: 0,
  // Browser TTS (speechSynthesis) speaking state for Listen / Stop toggle.
  isSpeaking: false,
  tutorialFlags: {
    // Session 1 flags. Per-page "Pick a … symptom" milestones are sticky —
    // they flip true when a symptom from that screen is finalized through
    // the question modal and stay true even if the user later deletes the
    // symptom. Earlier the checks read directly from `state.selected`,
    // which meant deleting the only Body Parts symptom would un-check
    // that step.
    pickedBodyParts: false,
    pickedActivities: false,
    pickedFeelings: false,
    deletedProblem: false,
    completedSession: false,
    usedSearch: false,
    viewedPastProblems: false,
    // Session 2 flags — namespaced so we don't conflict with reset values
    // when the user logs back in. Reset on logout in `logout()`.
    session2VisitedReview: false,
    session2AddedPastProblem: false,
    session2Completed: false,
    // `completedSession` / `session2Completed` flip in `logout()` — the
    // logout action IS the session-finish gesture. They also trigger the
    // pastProblemsArchive upsert in the same step.
  },
};

export function uid() { return Math.random().toString(36).slice(2, 10); }

export function isSelected(category, subcategory, name) {
  return state.selected.some(s =>
    s.category === category && s.subcategory === subcategory && s.name === name);
}

export function findSelected(category, subcategory, name) {
  return state.selected.find(s =>
    s.category === category && s.subcategory === subcategory && s.name === name);
}

export function questionIdsForSymptom(sym) {
  if (sym && sym.category === 'feelings') return ['frequency', 'severity'];
  return ['frequency', 'severity', 'interference'];
}
