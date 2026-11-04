/** Login, welcome-back, complete + intro/login prompt modals. */
import { state, isSelected, findSelected, questionIdsForSymptom } from '../state.js';
import { tutorialProgressItems, isCurrentSessionComplete } from '../progress.js';
import { D } from '../data.js';
import { el } from '../dom.js';
import { t, tLabel, tSymptom, tOption, fillTemplate, joinSpokenSentences, setLanguage } from '../i18n.js';
import { go, logout, skipToNextSession, toggleSymptom, openEditSymptom } from '../navigation.js';
import { render } from '../render-ref.js';
import { readAloudButton, speakOptionButton, tapSpeakerTip, stopSpeaking } from '../speech.js';
import { categoryLabelFor, formatDateMDY } from '../utils.js';

import { siteHeader } from '../shell/header.js';
import { siteFooter } from '../shell/footer.js';

export function introModal() {
  if (state.introDismissed) return null;
  if (state.session !== 1) return null;
  if (state.screen !== 'home') return null;

  function dismiss() {
    state.introDismissed = true;
    render();
  }

  // Mini-illustration of the tutorial dock — same chrome (ring + cap icon)
  // as the live dock so the user recognizes it.
  const dockMini = el('div', { class: 'intro-dock-mini', 'aria-hidden': 'true' },
    el('span', { class: 'intro-dock-ring', html:
      '<svg viewBox="0 0 60 60" aria-hidden="true">' +
        '<circle cx="30" cy="30" r="26" fill="none" stroke-width="4" />' +
        '<circle cx="30" cy="30" r="26" fill="none" stroke-width="4" ' +
        'stroke-linecap="round" stroke-dasharray="163.36" stroke-dashoffset="98" ' +
        'transform="rotate(-90 30 30)" />' +
      '</svg>'
    }),
    el('span', { class: 'intro-dock-cap', html:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path fill="currentColor" d="M12 3L1.5 8.5 12 14l8.5-4.46V15a.75.75 0 0 0 1.5 0V8.5L12 3z"/>' +
        '<path fill="currentColor" d="M5 12.18v3.05c0 .66.39 1.26 1 1.53 1.74.79 3.83 1.24 6 1.24s4.26-.45 6-1.24c.61-.27 1-.87 1-1.53v-3.05L12 15.5l-7-3.32z"/>' +
      '</svg>'
    }),
  );

  return el('div', {
    class: 'modal-backdrop intro-backdrop',
    onclick: (e) => { if (e.target.classList.contains('modal-backdrop')) dismiss(); },
  },
    el('div', {
      class: 'modal-card tutorial-popup intro-card',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'intro-modal-title',
      onclick: (e) => e.stopPropagation(),
    },
      el('h2', { id: 'intro-modal-title' }, t('Practice Guide Tips')),
      el('div', { class: 'intro-rows' },
        el('div', { class: 'intro-row' },
          dockMini,
          el('p', { html: t(
            'Your <strong>Practice Guide Progress</strong> is in the top-right corner. Click it anytime to view your steps.',
            'Tu <strong>Progreso de la guía de práctica</strong> está en la esquina superior derecha. Haz clic cuando quieras para ver tus pasos.',
          ) }),
        ),
        el('div', { class: 'intro-row' },
          el('span', { class: 'intro-hint-badge', 'aria-hidden': 'true' }, '?'),
          el('p', { html: t(
            'Need help with a step? Click the <strong>?</strong> next to it to watch a quick demo.',
            '¿Necesitas ayuda con un paso? Haz clic en el <strong>?</strong> junto a él para ver una demostración rápida.',
          ) }),
        ),
      ),
      el('div', { class: 'tutorial-popup-actions' },
        el('button', { class: 'btn-pill primary', onclick: dismiss }, t('Got it!')),
      ),
    ),
  );
}

// Session-2 login prompt. Shown when the user lands on the login screen
// (only reachable via logout() at the end of session 1). Tells the user
// they need to sign back in to begin session 2, so the screen change
// doesn't feel like an unexplained dead end. Uses the same chassis as
// the welcome intro popup for visual consistency.

export function loginPromptModal() {
  if (state.loginPromptDismissed) return null;
  if (state.screen !== 'login') return null;

  function dismiss() {
    state.loginPromptDismissed = true;
    render();
  }

  return el('div', {
    class: 'modal-backdrop intro-backdrop',
    onclick: (e) => { if (e.target.classList.contains('modal-backdrop')) dismiss(); },
  },
    el('div', {
      class: 'modal-card tutorial-popup login-prompt-card',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'login-prompt-title',
      onclick: (e) => e.stopPropagation(),
    },
      el('h2', { id: 'login-prompt-title' }, t('Session 1 complete!')),
      el('p', { class: 'tutorial-popup-sub' }, t('Please sign back in to start your second session.')),
      el('p', { class: 'login-prompt-body' },
        t("Great work — you finished session 1. Use the form below to log back in and pick up where you left off."),
      ),
      el('div', { class: 'tutorial-popup-actions' },
        el('button', { class: 'btn-pill primary', onclick: dismiss }, t('Got it!')),
      ),
    ),
  );
}

export function loginScreen() {
  const submit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    state.session = 2;
    go('welcome-back');
  };
  const toggleShowPassword = (e) => {
    e.preventDefault();
    const wrap = e.currentTarget.closest('.login-pw-wrap');
    if (!wrap) return;
    const input = wrap.querySelector('input');
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    e.currentTarget.setAttribute('aria-label', showing ? t('Show password') : t('Hide password'));
    e.currentTarget.querySelector('.eye-open').style.display = showing ? 'inline' : 'none';
    e.currentTarget.querySelector('.eye-closed').style.display = showing ? 'none' : 'inline';
  };

  const googleSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden="true">' +
    '<path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 31.7 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 5.1 29.6 3 24 3 12.3 3 3 12.3 3 24s9.3 21 21 21 21-9.3 21-21c0-1.4-.1-2.7-.4-4z"/>' +
    '<path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16.2 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 5.1 29.6 3 24 3 16.1 3 9.2 7.1 6.3 14.7z"/>' +
    '<path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.1C29.1 36.5 26.7 37 24 37c-5.2 0-9.6-3.3-11.3-7.9l-6.6 5.1C9.1 40.9 16 45 24 45z"/>' +
    '<path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3-3.5 5.4-6.3 6.7l6.2 5.1C37.3 41.6 42 37 42 29c0-1.4-.1-2.7-.4-4.5z"/>' +
    '</svg>';

  const eyeOpenSvg =
    '<svg class="eye-open" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path fill="currentColor" d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 12c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5zm0-8c-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3z"/>' +
    '</svg>';
  const eyeClosedSvg =
    '<svg class="eye-closed" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" style="display:none">' +
    '<path fill="currentColor" d="M2 4.27l1.41-1.41L20.73 20.18l-1.41 1.41-2.65-2.65A11.3 11.3 0 0 1 12 19c-7 0-11-7-11-7a18.4 18.4 0 0 1 4.66-5.4L2 4.27zM12 9a3 3 0 0 1 3 3c0 .35-.06.68-.18.99l-3.81-3.81c.31-.12.64-.18.99-.18zm0-4c7 0 11 7 11 7a18.5 18.5 0 0 1-3.04 4.04l-2.06-2.06A6 6 0 0 0 12 7c-.34 0-.67.04-.99.1L9.45 5.55C10.27 5.2 11.12 5 12 5z"/>' +
    '</svg>';

  return el('div', { class: 'login-page-layout' },
    // Decorative bubbles in the top-left, mirroring production
    el('div', { class: 'deco-bubbles' },
      el('img', {
        src: '/assets/Spot_Assets-01.svg',
        alt: '',
        'aria-hidden': 'true',
      }),
    ),
    el('main', { class: 'login-main' },
    el('section', { class: 'login-section' },
      // Welcome logo block: "Welcome to" + SPOTS wordmark
      el('div', { class: 'welcome-logo' },
        el('p', { class: 'welcome-greet' }, t('Welcome to')),
        el('div', { class: 'welcome-logo-img' },
          el('img', {
            src: '/assets/Spots-Logo-UpdatedBG.svg',
            alt: 'SPOTS',
            width: '240',
            height: '112',
          }),
        ),
      ),
      // Main login card
      el('div', { class: 'login-card' },
        el('h1', { class: 'login-title', id: 'login-title' }, t('Sign In')),
        el('form', {
          class: 'login-form',
          'aria-labelledby': 'login-title',
          onsubmit: submit,
        },
          el('input', {
            class: 'login-input',
            type: 'text',
            name: 'username',
            placeholder: t('Username or Email'),
            'aria-label': t('Username or email'),
            autocomplete: 'username',
            value: state.user.name,
          }),
          el('div', { class: 'login-pw-wrap' },
            el('input', {
              class: 'login-input',
              type: 'password',
              name: 'password',
              placeholder: t('Password'),
              'aria-label': t('Password'),
              autocomplete: 'current-password',
              // Tutorial: pre-fill a placeholder so the form looks ready
              // to submit. The browser renders this as dots regardless of
              // the string contents.
              value: 'tutorial-demo-pwd',
            }),
            el('button', {
              class: 'login-pw-toggle',
              type: 'button',
              'aria-label': t('Show password'),
              onclick: toggleShowPassword,
              html: eyeOpenSvg + eyeClosedSvg,
            }),
          ),
          el('button', {
            class: 'login-btn login-btn-primary',
            type: 'submit',
          }, t('Sign in')),
        ),
        el('div', { class: 'login-divider', role: 'separator', 'aria-label': t('or') },
          el('span', { class: 'login-divider-rule' }),
          el('span', { class: 'login-divider-text' }, t('OR')),
          el('span', { class: 'login-divider-rule' }),
        ),
        el('button', {
          class: 'login-btn login-btn-outline',
          type: 'button',
          onclick: submit, // tutorial: Google button just advances
        },
          el('span', { class: 'login-google-icon', html: googleSvg }),
          el('span', {}, t('Sign in with Google')),
        ),
        el('div', { class: 'login-links' },
          el('button', { class: 'login-link', type: 'button', onclick: submit }, t('Forgot password?')),
          el('button', { class: 'login-link', type: 'button', onclick: submit }, t('Sign up')),
        ),
      ),
      // Info box: matches the production layout (border, padded card with
      // an intro blurb). Copy mirrors the live site's SpotsIntro string.
      el('div', { class: 'login-info-box' },
        el('p', {},
          el('strong', {}, t("SPOTS (Smart Pediatric Oncology Tracker of Symptoms) helps children and teens with cancer track how they're feeling throughout treatment — and share that information with their care team. This is a guided tutorial; no account is required."))),
      ),
    ),
    ),
    siteFooter(),
  );
}

// Session 2 entry screen — visually mirrors welcomeScreen() but with
// returning-user copy. Dismiss → home (which now shows past-problems data
// carried over from session 1).

export function welcomeBackScreen() {
  const dots = [
    { c: 'var(--spots-orange)',  s: 18, t: '12%', l: '8%' },
    { c: 'var(--spots-green)',   s: 12, t: '20%', l: '24%' },
    { c: 'var(--spots-yellow)',  s: 22, t: '78%', l: '12%', border: true },
    { c: 'var(--spots-feelings)',s: 14, t: '70%', l: '88%' },
    { c: 'var(--spots-red)',     s: 12, t: '14%', l: '86%' },
    { c: 'var(--spots-green)',   s: 16, t: '85%', l: '70%' },
  ];
  return el('div', {},
    siteHeader(),
    el('div', { class: 'welcome-wrap' },
      ...dots.map(d => el('span', {
        class: 'deco-dot',
        style: {
          top: d.t, left: d.l,
          width: d.s + 'px', height: d.s + 'px',
          background: d.border ? 'transparent' : d.c,
          border: d.border ? `2px solid ${d.c}` : 'none',
        },
      })),
      el('div', { class: 'welcome-card' },
        el('div', { class: 'welcome-greet' }, t('Welcome back to')),
        el('div', { class: 'welcome-logo' },
          el('img', { src: '/assets/Spots-Logo-UpdatedBG.svg', alt: 'SPOTS' }),
        ),
        el('div', { class: 'tagline' }, t("Let's check in on how you've been.")),
        el('p', { class: 'blurb' }, t("We've kept the problems you reported last time. Take a look at your Past Problems, add anything new that's bothering you, and review when you're ready.")),
        el('button', { class: 'btn-primary', onclick: () => go('home') }, t('Continue →')),
      ),
    ),
    siteFooter(),
  );
}

// Terminal "Tutorial Complete" screen — reached at the end of Session 2.
// No nav forward, no logout. Mirrors the welcome-screen chassis (deco dots
// + centered card) for visual consistency. The header still renders so the
// user can see their avatar; the account dropdown panel hides the logout/
// finish button on this screen (see userMenu()).

export function tutorialCompleteScreen() {
  const dots = [
    { c: 'var(--spots-orange)',  s: 18, t: '12%', l: '8%' },
    { c: 'var(--spots-green)',   s: 12, t: '20%', l: '24%' },
    { c: 'var(--spots-yellow)',  s: 22, t: '78%', l: '12%', border: true },
    { c: 'var(--spots-feelings)',s: 14, t: '70%', l: '88%' },
    { c: 'var(--spots-red)',     s: 12, t: '14%', l: '86%' },
    { c: 'var(--spots-green)',   s: 16, t: '85%', l: '70%' },
  ];
  return el('div', {},
    siteHeader(),
    el('div', { class: 'welcome-wrap' },
      ...dots.map(d => el('span', {
        class: 'deco-dot',
        style: {
          top: d.t, left: d.l,
          width: d.s + 'px', height: d.s + 'px',
          background: d.border ? 'transparent' : d.c,
          border: d.border ? `2px solid ${d.c}` : 'none',
        },
      })),
      el('div', { class: 'welcome-card' },
        el('div', { class: 'check-circle tutorial-complete-check' }, '✓'),
        el('div', { class: 'welcome-greet' }, t("You've completed")),
        el('div', { class: 'welcome-logo' },
          el('img', { src: '/assets/Spots-Logo-UpdatedBG.svg', alt: 'SPOTS' }),
        ),
        el('div', { class: 'tagline' }, t('the SPOTS tutorial.')),
        el('p', { class: 'blurb' }, t('Thanks for trying it out! You now know how to report body-part problems, activities, feelings, and how to revisit past problems on a return visit.')),
      ),
    ),
    siteFooter(),
  );
}
