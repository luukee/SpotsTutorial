# SPOTS Tutorial (Practice Guide)

Interactive practice walkthrough for [SPOTS](https://github.austin.utexas.edu/caet-saga/spots-app) — a pediatric symptom-reporting tool from UTHealth Houston Cizik School of Nursing. Kids and caregivers can try the flow without signing in or talking to REDCap.

Vanilla HTML/CSS/JS, organized as **ES modules** and built with [Vite](https://vitejs.dev/).

## Local development

Requires [Node.js](https://nodejs.org/) (recent LTS).

```bash
npm install
npm run dev
```

Opens **http://localhost:5500** with live reload. Port `5500` avoids clashing with spots-app (`3000`).

```bash
npm run build    # production bundle → dist/
npm run preview  # serve dist/ locally
```

## Project layout

| Path | Role |
| --- | --- |
| `index.html` | Shell page + CSP; loads `/src/main.js` |
| `src/main.js` | Boot, global keyboard handlers |
| `src/render.js` | Top-level `render()` + modal scroll lock |
| `src/state.js` / `progress.js` / `navigation.js` | Session state, checklist, routing |
| `src/dom.js` / `i18n.js` / `speech.js` / `data.js` | DOM helper, EN/ES CSV, TTS, symptom tables |
| `src/shell/` | Header, footer, Problem Station, progress dock |
| `src/screens/` | Page screens + question modal (grouped) |
| `src/hints.js` | Guided walkthrough stages (single module this phase) |
| `styles.css` | Layout and visuals (imported from `main.js`) |
| `public/` | Static files copied to `dist/` (`assets/`, `translations.csv`, favicon) |
| `amplify.yml` | Amplify Hosting: `npm ci` → `npm run build` → publish `dist/` |
| `scripts/reextract.mjs` | Optional helper to re-split functions from a classic `app.js` snapshot |

## Making changes

1. Branch from `main`.
2. Edit the module that matches the change (flow → `src/screens/` or `src/shell/`, copy → `i18n` + `public/translations.csv`, data → `src/data.js`, look → `styles.css`).
3. Preview with `npm run dev`.
4. Confirm `npm run build` succeeds before opening a PR.

**Spanish:** add a row to `public/translations.csv` whose English column exactly matches the string passed to `t('…')`.

## Amplify deploy

Hosting app **`spots-tutorial`** should build from this repo using `amplify.yml` (artifact directory **`dist`**).

If the console still deploys the repo root with no build step, update the app’s build settings to match `amplify.yml` (or enable “build spec from amplify.yml”). After the first modular deploy, confirm `https://main.dci1qtzdmfsva.amplifyapp.com/` loads the practice guide (not a blank page).
