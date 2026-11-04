/** Symptom questionnaire modal. */
import { state, isSelected, findSelected, questionIdsForSymptom } from '../state.js';
import { tutorialProgressItems, isCurrentSessionComplete } from '../progress.js';
import { D } from '../data.js';
import { el } from '../dom.js';
import { t, tLabel, tSymptom, tOption, fillTemplate, joinSpokenSentences, setLanguage } from '../i18n.js';
import { go, logout, skipToNextSession, toggleSymptom, openEditSymptom } from '../navigation.js';
import { render } from '../render-ref.js';
import { readAloudButton, speakOptionButton, tapSpeakerTip, stopSpeaking } from '../speech.js';
import { categoryLabelFor, formatDateMDY } from '../utils.js';

export function questionModal() {
  const sym = state.pendingSymptom;
  if (!sym) return null;
  // Per-symptom required question ids — feelings get 2 steps, others 3.
  // The modal's step count, progress dots, and prompts are all driven from
  // this list (not `D.ratingQuestions.length`). Each id here is looked up
  // against D.ratingQuestions for its prompt + option set.
  const stepIds = questionIdsForSymptom(sym);
  const totalSteps = stepIds.length;
  // Clamp the step in case state was carried over from a different symptom
  // (e.g. switching from a 3-step body_parts symptom to a 2-step feelings
  // symptom while editing). Without this the modal could land out of bounds.
  if (state.questionStep >= totalSteps) state.questionStep = totalSteps - 1;
  const step = state.questionStep;
  const qid = stepIds[step];
  const q = D.ratingQuestions.find(rq => rq.id === qid);
  // Defensive: if a stepId is somehow not in `D.ratingQuestions` (could only
  // happen via a data mismatch), bail rather than crash on `q.id`.
  if (!q) {
    console.warn('questionModal: unknown question id', qid);
    return null;
  }
  const current = sym.answers[q.id];
  const isEditMode = !!state.editingSymptomId;
  const isLastStep = step + 1 === totalSteps;

  function close() {
    // Closing the modal — add or edit — never sets `completedSession`.
    // Session completion happens in `logout()`.
    stopSpeaking();
    state.pendingSymptom = null;
    state.editingSymptomId = null;
    state.questionStep = 0;
    render();
  }

  function next() {
    stopSpeaking();
    if (step + 1 < totalSteps) { state.questionStep = step + 1; render(); }
    else if (isEditMode) {
      // Edit-mode "Done": same as Close — dismiss the modal.
      close();
    } else {
      // Add-mode finalize (Save on last step). Push the new symptom into
      // the cart and bump the per-session counter. Session completion is
      // gated on logout (see `logout()`), not on adding a problem.
      state.selected.push(sym);
      // Sticky per-page tutorial flags. We attribute the milestone to the
      // SCREEN the user picked from (`originScreen`), not the underlying
      // category — a Search result for a body_parts symptom credits "Use
      // Search", not "Pick a Body Parts symptom".
      const origin = sym.originScreen;
      if (origin === 'search') state.tutorialFlags.usedSearch = true;
      else if (origin === 'body-parts' || origin === 'body-part-detail') state.tutorialFlags.pickedBodyParts = true;
      else if (origin === 'activities' || origin === 'activity-detail') state.tutorialFlags.pickedActivities = true;
      else if (origin === 'feelings') state.tutorialFlags.pickedFeelings = true;
      // Session-2 "Add a past problem" step credits a prior-problems pick.
      if (sym.category === 'prior_problems') state.tutorialFlags.session2AddedPastProblem = true;
      // Per-session report counter — powers the session-2 "Report a new
      // problem" step. Reset on logout, so a session-1 report does NOT
      // pre-credit the user in session 2.
      state.sessionProblemsLogged += 1;
      state.pendingSymptom = null;
      state.questionStep = 0;
      render();
    }
  }
  function back() {
    stopSpeaking();
    if (step > 0) { state.questionStep = step - 1; render(); }
    // Add-mode: Back on step 0 acts as Cancel (closes the modal — the user
    // hasn't committed the new symptom yet). Edit-mode: Back on step 0 is
    // routed to close() so it dismisses cleanly (edits already persisted
    // live; nothing to discard). Earlier this was disabled with no exit
    // beyond the bottom-right button, which felt cramped.
    else close();
  }

  // Write an answer to the live symptom. In add-mode `sym === pendingSymptom`
  // (not yet in `state.selected`); in edit-mode `sym` IS the entry in
  // `state.selected` (pendingSymptom points at it directly — see
  // `openEditSymptom`), so this mutation is what makes edits persist live.
  //
  // No auto-advance. Both add- and edit-mode require an explicit click on
  // Next / Done — picking a rating only writes the answer. This is more
  // predictable: tapping the wrong option doesn't shoot the user forward
  // a step, and the user can re-click the same option without consequence.
  function setAnswer(value) {
    sym.answers[q.id] = value;
    render();
  }

  // Edit-mode bottom row: Back + Next/Done.
  // Add-mode bottom row: Cancel/Back + Next/Save.
  let primaryLabel;
  const NEXT = t('Next');
  if (isEditMode) primaryLabel = isLastStep ? t('Done') : NEXT;
  else primaryLabel = isLastStep ? t('Save') : NEXT;
  // In edit-mode every step is always advanceable — the answer is already
  // populated (the user edited an EXISTING symptom; we pre-fill from
  // `sym.answers`). Even if `current === undefined` we still let them step
  // forward without changing anything; the existing answer is preserved.
  // In add-mode keep the original gating: must pick a rating to proceed.
  const primaryDisabled = isEditMode ? false : (current === undefined);

  // Prompt text per question id. Falls back to the q.prompt string if the
  // id isn't one of the three known ones — but in practice we only ever
  // see frequency/severity/interference here.
  let promptText;
  const symDisplay = tSymptom(sym.name);
  const symLower = symDisplay.toLowerCase();
  if (q.id === 'frequency') promptText = t(
    `In the past 7 days, how often did you have ${symLower}?`,
    `En los últimos 7 días, ¿con qué frecuencia tuviste ${symLower}?`
  );
  else if (q.id === 'severity') promptText = t(
    `In the past 7 days, how bad was ${symLower} at its worst?`,
    `En los últimos 7 días, ¿qué tan grave fue ${symLower} en su peor momento?`
  );
  else if (q.id === 'interference') promptText = t(
    `In the past 7 days, how much did ${symLower} get in the way of things you wanted to do?`,
    `En los últimos 7 días, ¿cuánto te impidió ${symLower} hacer las cosas que querías hacer?`
  );
  else promptText = q.prompt;

  const questionListenText = joinSpokenSentences([
    fillTemplate(
      t(
        'You clicked {symptomLower}. {question}',
        'Tocaste {symptomLower}. {question}',
      ),
      { symptom: symDisplay, symptomLower: symLower, question: promptText },
    ),
    tapSpeakerTip(),
  ]);

  return el('div', { class: 'modal-backdrop', onclick: (e) => { if (e.target.classList.contains('modal-backdrop')) close(); } },
    el('div', {
      class: 'modal-card',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'q-modal-title',
    },
      el('h2', { id: 'q-modal-title' }, symDisplay),
      el('div', { class: 'read-aloud-row' }, readAloudButton(questionListenText)),
      el('div', { class: 'q-prompt', id: 'q-modal-prompt' }, promptText),
      el('div', {
        class: 'rating-col',
        role: 'radiogroup',
        'aria-labelledby': 'q-modal-prompt',
      },
        q.options.map(opt => {
          const optLabel = tOption(opt.label);
          return el('div', { class: 'rating-option' },
            el('button', {
              type: 'button',
              class: 'rating-btn' + (current === opt.value ? ' is-selected' : ''),
              role: 'radio',
              'aria-checked': current === opt.value ? 'true' : 'false',
              'data-level': String(Math.min(opt.value, 3)),
              onclick: () => setAnswer(opt.value),
            }, optLabel),
            speakOptionButton(optLabel),
          );
        }),
      ),
      // Progress dots reflect the per-symptom step count — 2 for feelings,
      // 3 otherwise. Earlier versions hard-coded 3 dots regardless.
      el('div', { class: 'progress-dots' },
        ...Array.from({ length: totalSteps }, (_, i) =>
          el('span', { class: 'pd' + (i <= step ? ' is-active' : '') })),
      ),
      el('div', { class: 'modal-actions' },
        el('button', {
          class: 'btn-pill',
          onclick: back,
        }, step === 0 ? (isEditMode ? t('Close') : t('Cancel')) : t('Back')),
        el('button', {
          class: 'btn-pill primary',
          disabled: primaryDisabled ? '' : null,
          onclick: next,
        }, primaryLabel),
      ),
    ),
  );
}

// ----------------------------- login / session 2 -----------------------------
// Visually mirrors the production LoginForm (see spots-app-main
// `_components/auth/LoginPageLayout.tsx` + `LoginForm.tsx`): decorative
// bubbles top-left, "Welcome to" + SPOTS wordmark, white bordered card
// containing the Sign In form, then an info box below.
//
// In the tutorial this is purely visual — any submission bumps
// `state.session = 2` and routes to welcome-back. No validation.
