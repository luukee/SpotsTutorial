/** Browser TTS Listen / speaker controls. */
import { state } from './state.js';
import { el } from './dom.js';
import { t, fillTemplate } from './i18n.js';
import { render } from './render-ref.js';

const ICON_VOLUME =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>' +
  '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>' +
  '<path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>' +
  '</svg>';
const ICON_STOP =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">' +
  '<rect x="6" y="6" width="12" height="12" rx="1"/>' +
  '</svg>';

export function isSpeechSupported() {
  return typeof window !== 'undefined'
    && typeof window.speechSynthesis !== 'undefined'
    && typeof window.SpeechSynthesisUtterance !== 'undefined';
}

export function speechLang() {
  return state.language === 'es' ? 'es-US' : 'en-US';
}

export function stopSpeaking() {
  if (isSpeechSupported()) {
    try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  }
  if (state.isSpeaking) {
    state.isSpeaking = false;
  }
}

export function speak(text) {
  if (!isSpeechSupported()) return;
  const trimmed = String(text || '').trim();
  if (!trimmed) return;
  try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  const utterance = new SpeechSynthesisUtterance(trimmed);
  utterance.lang = speechLang();
  utterance.onend = () => {
    state.isSpeaking = false;
    render();
  };
  utterance.onerror = () => {
    state.isSpeaking = false;
    render();
  };
  state.isSpeaking = true;
  window.speechSynthesis.speak(utterance);
  render();
}

export function readAloudButton(text) {
  if (!isSpeechSupported()) return null;
  const listenLabel = t('Listen', 'Escuchar');
  const stopLabel = t('Stop', 'Detener');
  const label = state.isSpeaking ? stopLabel : listenLabel;
  return el('button', {
    type: 'button',
    class: 'read-aloud-btn',
    'aria-label': label,
    'aria-pressed': state.isSpeaking ? 'true' : 'false',
    onclick: (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (state.isSpeaking) {
        stopSpeaking();
        render();
        return;
      }
      speak(text);
    },
  },
    el('span', { class: 'read-aloud-icon', html: state.isSpeaking ? ICON_STOP : ICON_VOLUME }),
    el('span', {}, label),
  );
}

export function speakOptionButton(label) {
  if (!isSpeechSupported()) return null;
  const trimmed = String(label || '').trim();
  if (!trimmed) return null;
  const aria = fillTemplate(
    t('Listen to: {label}', 'Escuchar: {label}'),
    { label: trimmed },
  );
  return el('button', {
    type: 'button',
    class: 'speak-option-btn',
    'aria-label': aria,
    onclick: (e) => {
      e.preventDefault();
      e.stopPropagation();
      speak(trimmed);
    },
    onkeydown: (e) => {
      // Keep Space/Enter from bubbling to parent role=button rows/cards.
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        speak(trimmed);
      }
    },
  },
    el('span', { class: 'speak-option-icon', html: ICON_VOLUME }),
  );
}

export function tapSpeakerTip() {
  return t(
    'Tap the speaker next to each choice to hear it, then tap the choice you feel.',
    'Toca el altavoz junto a cada opción para oírla y luego toca la opción que sientes.',
  );
}

