/** Practice-guide checklist items (session 1 / 2). */
import { state } from './state.js';
import { t } from './i18n.js';

export function tutorialProgressItems() {
  if (state.session === 2) return session2ProgressItems();
  return session1ProgressItems();
}

export function session1ProgressItems() {
  const f = state.tutorialFlags;
  // Each per-page pick is a sticky tutorial flag — set when a symptom from
  // that screen is finalized through the question modal (see `next()` in
  // `questionModal()`), never cleared until logout. Deleting a symptom
  // from the Problem Station does NOT un-check the milestone.
  return [
    { key: 'welcome',      label: t('Welcome to SPOTS'),                          done: true },
    { key: 'body-parts',   label: t('Pick a Body Parts symptom'), done: f.pickedBodyParts },
    { key: 'activities',   label: t('Pick an Activities symptom'),    done: f.pickedActivities },
    { key: 'feelings',     label: t('Pick a Feelings symptom'),      done: f.pickedFeelings },
    { key: 'search',       label: t('Use Search'),                                         done: f.usedSearch },
    { key: 'past-problems',label: t('View Past Problems'),                   done: f.viewedPastProblems },
    { key: 'delete',       label: t('Delete a problem'),                         done: f.deletedProblem },
    { key: 'completed',    label: t('Logout'),                                          done: f.completedSession },
  ];
}

export function session2ProgressItems() {
  const f = state.tutorialFlags;
  return [
    { key: 'past-problems', label: t('Add a past problem'),    done: f.session2AddedPastProblem },
    { key: 'report',        label: t('Report a new problem'),    done: state.sessionProblemsLogged > 0 },
    { key: 'reviewed',      label: t('Edit your problems'),             done: f.session2VisitedReview },
    { key: 'completed',     label: t('Logout'),                               done: f.session2Completed },
  ];
}

// True when every step in the active session's checklist is `done`, EXCEPT
// the "Completed a session" / "Finish session 2" step itself. Logging out
// IS what finishes the session — so the gating predicate ignores that
// terminal step. Clicking Logout then flips `completedSession` (and upserts
// pastProblemsArchive) as part of the logout action, so by the time the
// user logs in for session 2 the session-1 checklist is fully done.

export function isCurrentSessionComplete() {
  const items = tutorialProgressItems().filter(i => i.key !== 'completed');
  return items.length > 0 && items.every(i => i.done);
}

// ----------------------------- helpers -----------------------------
