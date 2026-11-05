/** Welcome + home summary screens. */
import { state, isSelected, findSelected, questionIdsForSymptom } from '../state.js';
import { tutorialProgressItems, isCurrentSessionComplete } from '../progress.js';
import { D } from '../data.js';
import { el } from '../dom.js';
import { t, tLabel, tSymptom, tOption, fillTemplate, joinSpokenSentences, setLanguage } from '../i18n.js';
import { go, logout, skipToNextSession, toggleSymptom, openEditSymptom } from '../navigation.js';
import { render } from '../render-ref.js';
import { readAloudButton, speakOptionButton, tapSpeakerTip, stopSpeaking } from '../speech.js';
import { categoryLabelFor, formatDateMDY } from '../utils.js';

import { siteHeader, openUnavailableNotice } from '../shell/header.js';
import { siteFooter } from '../shell/footer.js';
import { problemStation } from '../shell/problem-station.js';

export function welcomeScreen() {
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
        el('div', { class: 'welcome-greet' }, t('Welcome to')),
        el('div', { class: 'welcome-logo' },
          el('img', { src: '/assets/Spots-Logo-UpdatedBG.svg', alt: 'SPOTS' }),
        ),
        el('div', { class: 'tagline' }, t('Smart Pediatric Oncology Tracker of Symptoms')),
        el('p', { class: 'blurb' }, t('Tell us how you have been feeling. Tap things on your body, activities, or feelings that have been bothering you. There are no right or wrong answers.')),
        el('button', { class: 'btn-primary', onclick: () => go('home') }, t('Get Started →')),
      ),
    ),
    siteFooter(),
  );
}

// Horizontal bar chart matching the production "summary chart": one bar per
// unique reported symptom, length = report count. When the archive is empty
// we render just the axis skeleton (matches the production empty state).

export function summaryChartSvg() {
  // Aggregate report counts across the archive.
  const counts = new Map();
  state.pastProblemsArchive.forEach(p => {
    const k = p.name;
    const prev = counts.get(k) || { name: p.name, count: 0, category: p.category };
    prev.count += (p.count || 1);
    counts.set(k, prev);
  });
  const items = Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Axis max: at least 2 (matches production empty-state ticks of 0..2).
  const dataMax = items.length ? Math.max(...items.map(i => i.count)) : 0;
  const axisMax = Math.max(2, Math.ceil(dataMax));
  const tickStep = axisMax <= 2 ? 0.5 : 1;
  const ticks = [];
  for (let v = 0; v <= axisMax + 1e-6; v += tickStep) ticks.push(Number(v.toFixed(1)));

  // Layout: row height grows with item count so bars don't overflow.
  const W = 720;
  const padL = 140; // room for symptom name labels on Y axis
  const padR = 28;
  const padT = 32;
  // Keep the X-axis tick numbers and the "Number of times..." title from
  // crowding each other — tick numbers sit at plotB+24, title at H-12.
  const padB = 78;
  const rowH = 38;
  const rows = Math.max(items.length, 4); // empty state still gets ~4 rows of vertical room
  const plotH = rows * rowH;
  const H = padT + plotH + padB;
  const plotL = padL, plotR = W - padR;
  const plotT = padT, plotB = padT + plotH;
  const tickX = (v) => plotL + (v / axisMax) * (plotR - plotL);

  const muted = '#6B7280';
  const grid = '#D1D5DB';
  const baseline = '#9CA3AF';

  // Production-style palette — distinct hues per bar.
  const palette = ['#E14A4A', '#84BD3A', '#3FC1C0', '#7B2CBF', '#F08D40', '#4A90E2'];

  const gridlines = ticks.map(t => {
    const x = tickX(t);
    return `<line x1="${x}" y1="${plotT}" x2="${x}" y2="${plotB}" stroke="${grid}" stroke-width="1" stroke-dasharray="4 4" />`;
  }).join('');

  const tickMarksAndLabels = ticks.map(t => {
    const x = tickX(t);
    return `<line x1="${x}" y1="${plotB}" x2="${x}" y2="${plotB + 6}" stroke="${baseline}" stroke-width="1" />` +
           `<text x="${x}" y="${plotB + 24}" text-anchor="middle" font-size="13" fill="${muted}" font-family="inherit">${t}</text>`;
  }).join('');

  const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const bars = items.map((it, i) => {
    const cy = plotT + (i + 0.5) * rowH;
    const barH = 26;
    const x = plotL + 1; // sit just inside Y-axis line
    const w = Math.max(2, tickX(it.count) - plotL - 1);
    const color = palette[i % palette.length];
    const truncated = it.name.length > 20 ? it.name.slice(0, 19) + '…' : it.name;
    return `<rect x="${x}" y="${cy - barH / 2}" width="${w}" height="${barH}" fill="${color}" rx="3" />` +
           `<text x="${plotL - 12}" y="${cy + 4}" text-anchor="end" font-size="13" fill="${muted}" font-family="inherit"><title>${escape(it.name)}</title>${escape(truncated)}</text>`;
  }).join('');

  const yLabel = `<text x="${plotL}" y="${plotT - 12}" font-size="13" font-weight="700" fill="${muted}" font-family="inherit">Symptoms</text>`;
  // Title sits ~24px below tick numbers (plotB + 24 + ~14 for line-height + breathing room).
  const xLabel = `<text x="${(plotL + plotR) / 2}" y="${plotB + 60}" text-anchor="middle" font-size="13" font-weight="700" fill="${muted}" font-family="inherit">Number of times the symptoms were reported</text>`;
  const yAxis = `<line x1="${plotL}" y1="${plotT}" x2="${plotL}" y2="${plotB}" stroke="${baseline}" stroke-width="1.25" />`;
  const xAxis = `<line x1="${plotL}" y1="${plotB}" x2="${plotR}" y2="${plotB}" stroke="${baseline}" stroke-width="1.25" />`;

  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Symptom report summary chart">
    ${gridlines}
    ${yAxis}${xAxis}
    ${tickMarksAndLabels}
    ${bars}
    ${yLabel}
    ${xLabel}
  </svg>`;
}

// Legend rendered as HTML below the SVG so it inherits page font + wraps
// gracefully without SVG text overflow.

export function summaryChartLegend() {
  const counts = new Map();
  state.pastProblemsArchive.forEach(p => {
    const prev = counts.get(p.name) || { name: p.name, count: 0 };
    prev.count += (p.count || 1);
    counts.set(p.name, prev);
  });
  const items = Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  if (items.length === 0) return null;
  const palette = ['#E14A4A', '#84BD3A', '#3FC1C0', '#7B2CBF', '#F08D40', '#4A90E2'];
  return el('div', { class: 'chart-legend' },
    items.map((it, i) => el('div', { class: 'legend-item' },
      el('span', { class: 'legend-swatch', style: { background: palette[i % palette.length] } }),
      el('span', { class: 'legend-label' }, tSymptom(it.name)),
    )),
  );
}

export function homeScreen() {
  // "What's New" = most recently reported (last in the archive, latest first).
  // "Happens a Lot" = symptoms with count >= 2, sorted by count desc.
  const archive = state.pastProblemsArchive;
  const whatsNew = archive.slice().reverse().slice(0, 3);
  const happensALot = archive
    .filter(p => (p.count || 1) >= 2)
    .slice()
    .sort((a, b) => (b.count || 1) - (a.count || 1))
    .slice(0, 3);
  const hasData = archive.length > 0;

  // Production renders each problem as a rounded gray "pill" row with the
  // symptom name on the left and a row of grey indicator dots on the right
  // (always grey on the home preview — no per-question completion signal).
  function pastList(items, emptyText) {
    if (items.length === 0) {
      return el('div', { class: 'dp-empty' }, emptyText);
    }
    return el('div', { class: 'dp-pills' },
      items.map(p => el('div', { class: 'dp-pill' },
        el('span', { class: 'dp-pill-name' }, tSymptom(p.name)),
        el('span', { class: 'dp-pill-dots' },
          el('span', { class: 'dp-pill-dot' }),
          el('span', { class: 'dp-pill-dot' }),
          el('span', { class: 'dp-pill-dot' }),
        ),
      )),
    );
  }

  return el('div', {},
    siteHeader(),
    el('main', { class: 'site-main' },
      el('div', { class: 'home-banner' },
        el('div', { class: 'greet' }, t('Welcome to')),
        el('div', { class: 'home-logo' },
          el('img', { src: '/assets/Spots-Logo-UpdatedBG.svg', alt: 'SPOTS' }),
        ),
      ),
      el('div', { class: 'two-col' },
        el('div', { class: 'dash-left' },
          el('div', { class: 'dash-past' },
            el('div', { class: 'dp-header' },
              el('span', { class: 'dp-header-title' },
                el('span', { class: 'dp-header-icon', 'aria-hidden': 'true' }, '⚠'),
                el('span', {}, t('Past Problems')),
              ),
              el('span', { class: 'view-all', onclick: () => go('past-problems') }, t('View All')),
            ),
            el('div', { class: 'dp-body' },
              el('div', { class: 'dp-section' },
                el('div', { class: 'dp-section-label' },
                  el('span', { class: 'dp-section-icon', 'aria-hidden': 'true',
                    html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>',
                  }),
                  el('span', {}, t("What's New")),
                ),
                pastList(whatsNew, t('No new problems in the last 30 days.')),
              ),
              el('div', { class: 'dp-divider' }),
              el('div', { class: 'dp-section' },
                el('div', { class: 'dp-section-label' },
                  el('span', { class: 'dp-section-icon', 'aria-hidden': 'true',
                    html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
                  }),
                  el('span', {}, t('Happens a Lot')),
                ),
                pastList(happensALot, t('No frequent problems yet.')),
              ),
            ),
          ),
          el('div', { class: 'dash-summary' },
            el('h3', {}, t('Here is a summary of number of times you reported the following symptoms in the last 30 days:')),
            hasData ? el('div', { class: 'chart-frame', html: summaryChartSvg() }) : null,
            hasData ? summaryChartLegend() : null,
            !hasData ? el('p', { class: 'dash-summary-empty' }, t('There are no symptoms reported. Use the other tools to tell us about your problems, then come back here next time.')) : null,
            el('a', {
              id: 'view-full-report',
              class: 'view-full',
              href: '#report',
              onclick: (e) => {
                e.preventDefault();
                openUnavailableNotice('report', 'view-full-report');
              },
            }, t('View Full Report →')),
          ),
        ),
        problemStation(),
      ),
    ),
    siteFooter(),
  );
}

// ---- Body Parts (list)
