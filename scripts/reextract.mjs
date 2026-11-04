import fs from 'node:fs';

const raw = fs.readFileSync('app.js', 'utf8');
let lines = raw.split('\n');
const start = lines.findIndex((l) => l.trim() === '(function () {');
lines = lines.slice(start + 1, lines.length - 1).map((l) => (l.startsWith('  ') ? l.slice(2) : l));
const srcLines = lines;
const src = srcLines.join('\n');

/** Map function name -> { startLine (0-based), endLine exclusive } using next top-level function. */
function indexFunctions() {
  const starts = [];
  for (let i = 0; i < srcLines.length; i++) {
    const m = srcLines[i].match(/^function ([A-Za-z0-9_]+)\b/);
    if (m) starts.push({ name: m[1], line: i });
  }
  // also capture const ICON_VOLUME block start
  const map = new Map();
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1].line : srcLines.length;
    map.set(starts[i].name, { start: starts[i].line, end });
  }
  return map;
}

const fnIndex = indexFunctions();

function extractFunction(name) {
  const loc = fnIndex.get(name);
  if (!loc) throw new Error('missing ' + name);
  // trim trailing blank lines inside the slice
  let end = loc.end;
  // joinSpokenSentences is followed by ICON consts before the next function
  if (name === 'joinSpokenSentences') {
    for (let i = loc.start; i < end; i++) {
      if (srcLines[i].startsWith('const ICON_VOLUME')) {
        end = i;
        break;
      }
    }
  }
  while (end > loc.start && srcLines[end - 1].trim() === '') end--;
  const text = srcLines.slice(loc.start, end).join('\n');
  console.log('  ', name, text.length);
  return text;
}

function exportFns(names) {
  return names.map((n) => extractFunction(n).replace(/^function /, 'export function ')).join('\n\n') + '\n';
}

function fixAssets(s) {
  return s
    .replaceAll("'./assets/", "'/assets/")
    .replaceAll('"./assets/', '"/assets/')
    .replaceAll('`./assets/', '`/assets/')
    .replaceAll('./translations.csv', '/translations.csv');
}

function write(file, header, names, special) {
  console.log('writing', file);
  const body = special ? special() : exportFns(names);
  fs.writeFileSync(file, fixAssets(header + body));
}

const shellCommon = `import { state, isSelected, findSelected, questionIdsForSymptom } from '../state.js';
import { tutorialProgressItems, isCurrentSessionComplete } from '../progress.js';
import { D } from '../data.js';
import { el } from '../dom.js';
import { t, tLabel, tSymptom, tOption, fillTemplate, joinSpokenSentences, setLanguage } from '../i18n.js';
import { go, logout, skipToNextSession, toggleSymptom, openEditSymptom } from '../navigation.js';
import { render } from '../render-ref.js';
import { readAloudButton, speakOptionButton, tapSpeakerTip, stopSpeaking } from '../speech.js';
import { categoryLabelFor, formatDateMDY } from '../utils.js';
import { NAV_ICONS } from '../nav-icons.js';
`;

write('src/dom.js', '/** DOM element factory for the practice guide. */\n', ['el']);
write('src/utils.js', `import { t } from './i18n.js';\n\n`, ['categoryLabelFor', 'formatDateMDY']);

write(
  'src/speech.js',
  `/** Browser TTS Listen / speaker controls. */
import { state } from './state.js';
import { el } from './dom.js';
import { t, fillTemplate } from './i18n.js';
import { render } from './render-ref.js';

`,
  null,
  () => {
    // ICON consts sit just before isSpeechSupported
    const isSpeech = fnIndex.get('isSpeechSupported');
    const tip = fnIndex.get('tapSpeakerTip');
    // find ICON_VOLUME line
    let iconLine = isSpeech.start - 1;
    while (iconLine > 0 && !srcLines[iconLine].includes('const ICON_VOLUME')) iconLine--;
    // include from ICON_VOLUME through tapSpeakerTip
    const block = srcLines.slice(iconLine, tip.end).join('\n');
    return (
      block.replace(/^function /gm, 'export function ').replace(/^const ICON_/gm, 'const ICON_') +
      '\n'
    );
  },
);

write(
  'src/navigation.js',
  `/** Screen routing and symptom open/edit. */
import { state, uid, findSelected } from './state.js';
import { stopSpeaking } from './speech.js';
import { render } from './render-ref.js';

`,
  ['go', 'logout', 'skipToNextSession', 'toggleSymptom', 'openEditSymptom'],
);

write(
  'src/i18n.js',
  `/** EN/ES localization from /translations.csv. */
import { state } from './state.js';
import { render } from './render-ref.js';

const translations = new Map();
export let translationsLoaded = false;

`,
  [
    't',
    'tLabel',
    'tSymptom',
    'tOption',
    'fillTemplate',
    'joinSpokenSentences',
    'parseCsv',
    'loadTranslations',
    'setLanguage',
  ],
);

write('src/shell/header.js', `/** Top navigation and account menu. */\n${shellCommon}\n`, [
  'logoCorner',
  'navButton',
  'siteHeader',
  'userMenu',
]);
write('src/shell/footer.js', `/** Site footer. */\n${shellCommon}\n`, ['siteFooter']);
write('src/shell/problem-station.js', `/** Problem Station cart. */\n${shellCommon}\n`, [
  'problemStation',
]);
write('src/shell/dock.js', `/** Practice guide progress dock. */\n${shellCommon}\n`, [
  'tutorialDock',
]);

write(
  'src/screens/home.js',
  `/** Welcome + home summary screens. */\n${shellCommon}
import { siteHeader } from '../shell/header.js';
import { siteFooter } from '../shell/footer.js';
import { problemStation } from '../shell/problem-station.js';

`,
  ['welcomeScreen', 'summaryChartSvg', 'summaryChartLegend', 'homeScreen'],
);
write(
  'src/screens/body-parts.js',
  `/** Body parts map + detail list. */\n${shellCommon}
import { siteHeader } from '../shell/header.js';
import { siteFooter } from '../shell/footer.js';
import { problemStation } from '../shell/problem-station.js';

`,
  [
    'bodyPartsScreen',
    'bodyPartDetailScreen',
    'loadAndWireBodySvgs',
    'ensureHotspotZone',
    'wireBodyHotspots',
  ],
);
write(
  'src/screens/activities.js',
  `/** Activities grid + detail modal. */\n${shellCommon}
import { siteHeader } from '../shell/header.js';
import { siteFooter } from '../shell/footer.js';
import { problemStation } from '../shell/problem-station.js';

`,
  ['activitiesScreen', 'activityDetailScreen'],
);
write(
  'src/screens/feelings.js',
  `/** Feelings picker grid. */\n${shellCommon}
import { siteHeader } from '../shell/header.js';
import { siteFooter } from '../shell/footer.js';
import { problemStation } from '../shell/problem-station.js';

`,
  ['feelingsScreen'],
);
write(
  'src/screens/search.js',
  `/** Symptom search screen. */\n${shellCommon}
import { siteHeader } from '../shell/header.js';
import { siteFooter } from '../shell/footer.js';
import { problemStation } from '../shell/problem-station.js';

`,
  ['searchScreen'],
);
write(
  'src/screens/past-problems.js',
  `/** Past problems list. */\n${shellCommon}
import { siteHeader } from '../shell/header.js';
import { siteFooter } from '../shell/footer.js';
import { problemStation } from '../shell/problem-station.js';

`,
  ['pastProblemsScreen'],
);
write('src/screens/questions.js', `/** Symptom questionnaire modal. */\n${shellCommon}\n`, [
  'questionModal',
]);
write(
  'src/screens/auth-session.js',
  `/** Login, welcome-back, complete + intro/login prompt modals. */\n${shellCommon}
import { siteHeader } from '../shell/header.js';
import { siteFooter } from '../shell/footer.js';

`,
  [
    'introModal',
    'loginPromptModal',
    'loginScreen',
    'welcomeBackScreen',
    'tutorialCompleteScreen',
  ],
);
write(
  'src/hints.js',
  `/** Guided hint / walkthrough stages (kept together this phase). */
import { state, isSelected, findSelected, questionIdsForSymptom } from './state.js';
import { tutorialProgressItems, isCurrentSessionComplete } from './progress.js';
import { D } from './data.js';
import { el } from './dom.js';
import { t, tLabel, tSymptom, tOption, fillTemplate, joinSpokenSentences, setLanguage } from './i18n.js';
import { go, logout, skipToNextSession, toggleSymptom, openEditSymptom } from './navigation.js';
import { render } from './render-ref.js';
import { readAloudButton, speakOptionButton, tapSpeakerTip, stopSpeaking } from './speech.js';
import { categoryLabelFor, formatDateMDY } from './utils.js';
import { siteHeader, logoCorner, navButton } from './shell/header.js';
import { siteFooter } from './shell/footer.js';
import { problemStation } from './shell/problem-station.js';

`,
  [
    'hintMiniHeader',
    'hintMiniHome',
    'bodyPartsHintStage',
    'activitiesHintStage',
    'feelingsHintStage',
    'pastProblemsHintStage',
    'editProblemsHintStage',
    'deleteProblemHintStage',
    'completedHintStage',
    'hintModal',
  ],
);

{
  console.log('writing src/render.js');
  // openEditSymptom is before questionModal; render is near end — stop before FOCUSABLE const if it's between functions
  // After unindent, applyModalScrollLock then render then const FOCUSABLE — FOCUSABLE is not a function so render's end = next function or EOF.
  // There's no function after render — so render would include event listeners! 
  // Check index:
  for (const [name, loc] of fnIndex) {
    if (['render', 'applyModalScrollLock', 'isEmbeddedFrame', 'questionModal', 'openEditSymptom'].includes(name)) {
      console.log(name, loc.start, loc.end, srcLines[loc.start]);
    }
  }
  const lock = exportFns(['isEmbeddedFrame', 'applyModalScrollLock']);
  // Manually trim render to only the function: find line of "function render" through closing before "const FOCUSABLE"
  const renderLoc = fnIndex.get('render');
  let renderEnd = renderLoc.end;
  for (let i = renderLoc.start; i < srcLines.length; i++) {
    if (srcLines[i].startsWith('const FOCUSABLE_SELECTOR')) {
      renderEnd = i;
      break;
    }
  }
  while (renderEnd > renderLoc.start && srcLines[renderEnd - 1].trim() === '') renderEnd--;
  const renderFn =
    srcLines.slice(renderLoc.start, renderEnd).join('\n').replace(/^function render/, 'export function render') +
    '\n';
  console.log('  render', renderFn.length);

  const content = fixAssets(`/** Top-level render + modal scroll lock. */
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

${lock}
${renderFn}
setRender(render);

export { root };
`);
  fs.writeFileSync('src/render.js', content);
}

// progress.js — extract from original state helpers that use t()
{
  const progress = exportFns([
    'tutorialProgressItems',
    'session1ProgressItems',
    'session2ProgressItems',
    'isCurrentSessionComplete',
  ]);
  fs.writeFileSync(
    'src/progress.js',
    fixAssets(`/** Practice-guide checklist items (session 1 / 2). */
import { state } from './state.js';
import { t } from './i18n.js';

${progress}`),
  );
}

// state.js — state object + non-t helpers
{
  const stateMatch = src.match(/const state = \{[\s\S]*?\n\};\n/);
  if (!stateMatch) throw new Error('no state');
  const rest = exportFns(['uid', 'isSelected', 'findSelected', 'questionIdsForSymptom']);
  fs.writeFileSync(
    'src/state.js',
    `/** Shared practice-guide session state. */\n${stateMatch[0].replace(/^const state/, 'export const state')}\n${rest}`,
  );
}

console.log('done');
