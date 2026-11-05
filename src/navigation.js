/** Screen routing and symptom open/edit. */
import { state, uid, findSelected } from './state.js';
import { stopSpeaking } from './speech.js';
import { render } from './render-ref.js';

export function go(screen, opts = {}) {
  stopSpeaking();
  state.screen = screen;
  Object.assign(state, opts);
  // Tutorial milestone flags. Session 1 has a "View Past Problems" step that
  // counts as soon as the user lands on the screen. Session 2's equivalent
  // step is "Add a past problem" — that's checked off in the items list by
  // looking at `state.selected`, so no flag write is needed here. The
  // Session 2's "Edit your problems" milestone (`session2VisitedReview`)
  // is set in `openEditSymptom()`. Session 1 has no edit step.
  if (screen === 'past-problems' && state.session !== 2) {
    state.tutorialFlags.viewedPastProblems = true;
  }
  // Any route change closes the account dropdown and the small-screen
  // overlays so they don't persist onto a new screen.
  state.userMenuOpen = false;
  state.mobileMenuOpen = false;
  state.problemStationOpen = false;
  state.unavailableNotice = null;
  state.focusReturnId = null;
  // `usedSearch` is intentionally NOT set on entering the search screen;
  // it flips to true only after a search-originated symptom is finalized
  // (see the question-modal `next()` finalize path).
  render();
}

// Ends the current session ("logout"). Clears in-progress symptom-picking
// state and the per-session report counter, but PRESERVES pastProblemsArchive
// (carries into Session 2) and the session-1 tutorialFlags (the dock keeps
// its session-1 context). Also resets session-2 flags so they start fresh
// when the user logs back in. Routes to the login screen.

export function logout() {
  // Logout IS the "finish session" gesture: flip the completion flag for
  // the active session and flush whatever's in the cart to
  // pastProblemsArchive so session 2 sees session 1's work. Done before
  // we clear state.selected.
  const isS2 = state.session === 2;
  if (isS2) state.tutorialFlags.session2Completed = true;
  else state.tutorialFlags.completedSession = true;
  if (state.selected.length > 0) {
    const today = new Date();
    const dateLabel = today.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    state.selected.forEach(s => {
      const existing = state.pastProblemsArchive.find(p =>
        p.name === s.name && p.subcategory === s.subcategory);
      if (existing) {
        existing.count = (existing.count || 1) + 1;
        existing.dateLabel = dateLabel;
      } else {
        state.pastProblemsArchive.push({
          name: s.name,
          category: s.category,
          subcategory: s.subcategory,
          count: 1,
          dateLabel,
        });
      }
    });
  }
  state.selected = [];
  state.pendingSymptom = null;
  state.questionStep = 0;
  state.editingSymptomId = null;
  state.showSavedSuccess = false;
  state.currentBodyPart = null;
  state.currentActivity = null;
  state.currentSearchQuery = '';
  state.showBodyBack = false;
  state.tutorialDockOpen = false;
  state.activeHintKey = null;
  state.userMenuOpen = false;
  state.sessionProblemsLogged = 0;
  // Reset session-2 flags only when logging out from session 1, so the
  // session-2 checklist starts fresh. Logging out from session 2 (rare —
  // the normal session-2 terminus is "Finish Tutorial") leaves the flag
  // we just set above intact.
  if (!isS2) {
    state.tutorialFlags.session2VisitedReview = false;
    state.tutorialFlags.session2AddedPastProblem = false;
    state.tutorialFlags.session2Completed = false;
  }
  go('login');
}

// Tutorial fast-forward: jump from session 1 → session 2 (welcome-back), or
// session 2 → tutorial-complete. Wired to the "Emergency Information" Quick
// Link in the footer as a demo shortcut. Flushes the in-progress cart into
// pastProblemsArchive (so session 2 sees any work the demoer did) and
// clears in-progress state — same lifecycle as logout() except: skips the
// login screen, and does NOT set the current session's `completedSession`
// flag (the user skipped, they didn't actually log out).

export function skipToNextSession() {
  const isS2 = state.session === 2;
  if (state.selected.length > 0) {
    const today = new Date();
    const dateLabel = today.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    state.selected.forEach(s => {
      const existing = state.pastProblemsArchive.find(p =>
        p.name === s.name && p.subcategory === s.subcategory);
      if (existing) {
        existing.count = (existing.count || 1) + 1;
        existing.dateLabel = dateLabel;
      } else {
        state.pastProblemsArchive.push({
          name: s.name,
          category: s.category,
          subcategory: s.subcategory,
          count: 1,
          dateLabel,
        });
      }
    });
  }
  state.selected = [];
  state.pendingSymptom = null;
  state.questionStep = 0;
  state.editingSymptomId = null;
  state.showSavedSuccess = false;
  state.currentBodyPart = null;
  state.currentActivity = null;
  state.currentSearchQuery = '';
  state.showBodyBack = false;
  state.tutorialDockOpen = false;
  state.activeHintKey = null;
  state.userMenuOpen = false;
  state.sessionProblemsLogged = 0;
  if (isS2) {
    state.tutorialFlags.session2Completed = true;
    go('tutorial-complete');
  } else {
    state.session = 2;
    state.tutorialFlags.session2VisitedReview = false;
    state.tutorialFlags.session2AddedPastProblem = false;
    state.tutorialFlags.session2Completed = false;
    go('welcome-back');
  }
}

export function toggleSymptom(category, subcategory, contextLabel, name) {
  stopSpeaking();
  const existing = findSelected(category, subcategory, name);
  if (existing) {
    state.selected = state.selected.filter(s => s !== existing);
    render();
    return;
  }
  state.pendingSymptom = {
    id: uid(), name, category, subcategory, contextLabel,
    answers: {}, originScreen: state.screen,
    originCtx: { bodyPart: state.currentBodyPart, activity: state.currentActivity, query: state.currentSearchQuery },
    // Date the symptom was first reported. Displayed in the Problem Station
    // row as MM/DD/YYYY. Stored as a plain Date so we can re-format if needed.
    dateAdded: new Date(),
  };
  state.questionStep = 0;
  state.showSavedSuccess = false;
  render();
}

// Dismiss the questionnaire (Cancel / Saved Close / Escape). Activity-detail
// origins return to the Activities grid so the nested pick overlay does not
// linger after the question card goes away.
export function dismissQuestionnaireModal() {
  stopSpeaking();
  const origin = state.pendingSymptom && state.pendingSymptom.originScreen;
  const fromActivity = origin === 'activity-detail' || origin === 'activities';
  state.pendingSymptom = null;
  state.editingSymptomId = null;
  state.questionStep = 0;
  state.showSavedSuccess = false;
  if (fromActivity) go('activities');
  else render();
}

// Per-symptom required question ids. Mirrors the production app's
// QUESTION_PROGRESSION_RULES in app/_lib/services/pro-ctcae/question-service.ts:
//   body_parts / activities / search → frequency, severity, interference
//   feelings                          → frequency, severity (no interference)
// The desktop build doesn't have a `prior_problems` category at runtime
// (past problems are reported into one of the above categories via search /
// direct picks), so we don't need that branch here.
//
// Single source of truth — used by questionModal() (which questions to ask
// and how many dots) and problemStation() (answer dots per row).

export function openEditSymptom(sym) {
  state.editingSymptomId = sym.id;
  state.pendingSymptom = sym;
  state.questionStep = 0;
  state.showSavedSuccess = false;
  if (state.session === 2) state.tutorialFlags.session2VisitedReview = true;
  render();
}
