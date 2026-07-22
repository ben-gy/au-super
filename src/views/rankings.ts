// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { AppContext, View } from '../context';
import { filteredProducts } from '../context';
import type { Product } from '../types';
import { renderFilterBar } from '../filters';
import { COLORS } from '../data';
import { feeDollars, formatMoney, formatPct } from '../format';

interface Metric {
  key: string;
  label: string;
  get: (p: Product) => number | null;
  fmt: (v: number | null) => string;
  dir: 'desc' | 'asc'; // best-first direction
  goodHigh: boolean; // is a higher value good?
  median: (ctx: AppContext) => number | null;
}

const METRICS: Metric[] = [
  { key: 'nir10', label: '10-year return', get: (p) => p.nir.y10, fmt: (v) => formatPct(v), dir: 'desc', goodHigh: true, median: (c) => c.data.meta.medians.nir10 },
  { key: 'nir5', label: '5-year return', get: (p) => p.nir.y5, fmt: (v) => formatPct(v), dir: 'desc', goodHigh: true, median: (c) => c.data.meta.medians.nir5 },
  { key: 'fee', label: 'Fee on $50k', get: (p) => p.totalFee50k, fmt: (v) => (v == null ? '—' : `${formatPct(v)} · ${feeDollars(v, 50000)}`), dir: 'asc', goodHigh: false, median: (c) => c.data.meta.medians.fee50k },
  { key: 'margin', label: 'Margin over benchmark', get: (p) => p.margin, fmt: (v) => (v == null ? '—' : (v > 0 ? '+' : '') + formatPct(v)), dir: 'desc', goodHigh: true, median: (c) => c.data.meta.medians.margin },
  { key: 'assets', label: 'Member assets', get: (p) => p.assets, fmt: (v) => formatMoney(v), dir: 'desc', goodHigh: true, median: (c) => c.data.meta.medians.nir10 && null },
];

export function createRankingsView(ctx: AppContext): View {
  const root = document.createElement('div');
  root.className = 'view';
  let metricKey = 'nir10';

  function render() {
    const metric = METRICS.find((m) => m.key === metricKey)!;
    const median = metric.median(ctx);
    let list = filteredProducts(ctx).filter((p) => metric.get(p) != null);
    list.sort((a, b) => {
      const av = metric.get(a) as number;
      const bv = metric.get(b) as number;
      return metric.dir === 'desc' ? bv - av : av - bv;
    });

    const values = list.map((p) => Math.abs(metric.get(p) as number));
    const max = Math.max(...values, 0.0001);

    root.innerHTML = `
      <div class="panel-head">
        <h2>Rankings</h2>
        <p class="panel-sub">Every filtered MySuper product ranked by your chosen measure. Bars are coloured green when better than the sector median, red when worse. Click a bar for the full breakdown.</p>
      </div>`;

    const controls = document.createElement('div');
    controls.className = 'explorer-controls';
    const seg = document.createElement('div');
    seg.className = 'segmented';
    seg.setAttribute('role', 'tablist');
    seg.innerHTML = METRICS.map((m) => `<button class="seg ${m.key === metricKey ? 'active' : ''}" data-metric="${m.key}">${m.label}</button>`).join('');
    seg.querySelectorAll<HTMLButtonElement>('.seg').forEach((b) =>
      b.addEventListener('click', () => { metricKey = b.dataset.metric!; render(); }),
    );
    controls.appendChild(renderFilterBar(ctx));
    controls.appendChild(seg);
    root.appendChild(controls);

    const panel = document.createElement('div');
    panel.className = 'panel';
    if (median != null) {
      panel.innerHTML = `<div class="rank-legend">Sector median: <strong class="mono">${metric.fmt(median)}</strong></div>`;
    }
    const bars = document.createElement('div');
    bars.className = 'hbars';
    list.forEach((p, i) => {
      const v = metric.get(p) as number;
      const pct = (Math.abs(v) / max) * 100;
      let good = true;
      if (median != null) good = metric.goodHigh ? v >= median : v <= median;
      const color = median == null ? COLORS.accent : good ? COLORS.above : COLORS.below;
      const row = document.createElement('div');
      row.className = 'hbar-row clickable';
      row.dataset.id = p.id;
      row.setAttribute('data-tip', `${p.product}<br>${p.fund}<br>${metric.label}: ${metric.fmt(v)}`);
      row.innerHTML = `
        <div class="hbar-label"><span class="rank-num">${i + 1}</span>${p.product}<span class="hbar-sub">${p.fund}</span></div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="hbar-value">${metric.fmt(v)}</div>`;
      row.addEventListener('click', () => ctx.openDetail(p.id));
      bars.appendChild(row);
    });
    panel.appendChild(bars);
    root.appendChild(panel);
  }

  render();
  return { root, update: render };
}
