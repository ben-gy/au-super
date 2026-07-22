// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { AppContext, View } from '../context';
import { filteredProducts } from '../context';
import type { Product } from '../types';
import { renderFilterBar } from '../filters';
import { COLORS } from '../data';
import { formatPct } from '../format';

const W = 900;
const H = 420;
const M = { top: 20, right: 20, bottom: 52, left: 48 };

interface Metric {
  key: string;
  label: string;
  get: (p: Product) => number | null;
  unit: string;
}
const METRICS: Metric[] = [
  { key: 'nir10', label: '10-year return', get: (p) => p.nir.y10, unit: 'return' },
  { key: 'nir5', label: '5-year return', get: (p) => p.nir.y5, unit: 'return' },
  { key: 'fee', label: 'Fee on $50k', get: (p) => p.totalFee50k, unit: 'fee' },
  { key: 'growth', label: 'Growth allocation', get: (p) => p.growth, unit: 'growth' },
];

export function createDistributionView(ctx: AppContext): View {
  const root = document.createElement('div');
  root.className = 'view';
  let metricKey = 'nir10';

  function render() {
    const metric = METRICS.find((m) => m.key === metricKey)!;
    const list = filteredProducts(ctx);
    const values = list.map((p) => metric.get(p)).filter((v): v is number => v != null && Number.isFinite(v));
    values.sort((a, b) => a - b);

    root.innerHTML = `
      <div class="panel-head">
        <h2>Distribution — is your fund normal or an outlier?</h2>
        <p class="panel-sub">How the ${list.length} filtered products spread out across the sector. The dashed line marks the median; anything far to the left or right of the pack is worth a closer look.</p>
      </div>`;

    const controls = document.createElement('div');
    controls.className = 'explorer-controls';
    const seg = document.createElement('div');
    seg.className = 'segmented';
    seg.innerHTML = METRICS.map((m) => `<button class="seg ${m.key === metricKey ? 'active' : ''}" data-metric="${m.key}">${m.label}</button>`).join('');
    seg.querySelectorAll<HTMLButtonElement>('.seg').forEach((b) =>
      b.addEventListener('click', () => { metricKey = b.dataset.metric!; render(); }),
    );
    controls.appendChild(renderFilterBar(ctx));
    controls.appendChild(seg);
    root.appendChild(controls);

    if (!values.length) {
      const empty = document.createElement('div');
      empty.className = 'panel empty';
      empty.textContent = 'No products match the current filters.';
      root.appendChild(empty);
      return;
    }

    const min = values[0];
    const max = values[values.length - 1];
    const median = values.length % 2 ? values[(values.length - 1) / 2] : (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;

    const binCount = Math.min(14, Math.max(6, Math.ceil(Math.sqrt(values.length)) + 3));
    const span = max - min || 1;
    const binW = span / binCount;
    const bins = Array.from({ length: binCount }, (_, i) => ({ lo: min + i * binW, hi: min + (i + 1) * binW, count: 0 }));
    for (const v of values) {
      let idx = Math.floor((v - min) / binW);
      if (idx >= binCount) idx = binCount - 1;
      if (idx < 0) idx = 0;
      bins[idx].count++;
    }
    const maxCount = Math.max(...bins.map((b) => b.count));

    const innerW = W - M.left - M.right;
    const innerH = H - M.top - M.bottom;
    const bx = (i: number) => M.left + (i / binCount) * innerW;
    const bw = innerW / binCount;
    const byH = (c: number) => (c / maxCount) * innerH;

    const yTicks = 4;
    const gridY = Array.from({ length: yTicks + 1 }, (_, i) => {
      const c = (maxCount / yTicks) * i;
      const y = M.top + innerH - byH(c);
      return `<line class="grid" x1="${M.left}" y1="${y}" x2="${W - M.right}" y2="${y}"/><text class="axis-label" x="${M.left - 6}" y="${y + 3}" text-anchor="end">${Math.round(c)}</text>`;
    }).join('');

    const barsSvg = bins
      .map((b) => {
        if (b.count === 0) return '';
        const x = bx(bins.indexOf(b));
        const h = byH(b.count);
        const y = M.top + innerH - h;
        const tip = `${fmt(b.lo, metric)} – ${fmt(b.hi, metric)}<br>${b.count} product${b.count === 1 ? '' : 's'}`;
        return `<rect class="hist-bar" x="${x + 2}" y="${y}" width="${bw - 4}" height="${h}" fill="${COLORS.accent}" data-tip="${tip}"/>`;
      })
      .join('');

    const xTickEvery = Math.ceil(binCount / 7);
    const xLabels = bins
      .map((b, i) => (i % xTickEvery === 0 ? `<text class="axis-label" x="${bx(i)}" y="${H - M.bottom + 18}" text-anchor="middle">${fmt(b.lo, metric)}</text>` : ''))
      .join('');

    const medX = M.left + ((median - min) / span) * innerW;
    const medLine = `<line class="hist-marker" x1="${medX}" y1="${M.top}" x2="${medX}" y2="${H - M.bottom}"/><text class="hist-marker-label" x="${medX}" y="${M.top - 4}" text-anchor="middle">median ${fmt(median, metric)}</text>`;

    const panel = document.createElement('div');
    panel.className = 'panel chart-panel';
    panel.innerHTML = `
      <div class="stat-row">
        <div class="stat-tile"><div class="stat-tile-val mono">${fmt(min, metric)}</div><div class="stat-tile-lab">Lowest</div></div>
        <div class="stat-tile"><div class="stat-tile-val mono">${fmt(median, metric)}</div><div class="stat-tile-lab">Median</div></div>
        <div class="stat-tile"><div class="stat-tile-val mono">${fmt(mean, metric)}</div><div class="stat-tile-lab">Average</div></div>
        <div class="stat-tile"><div class="stat-tile-val mono">${fmt(max, metric)}</div><div class="stat-tile-lab">Highest</div></div>
        <div class="stat-tile"><div class="stat-tile-val mono">${values.length}</div><div class="stat-tile-lab">Products</div></div>
      </div>
      <svg class="chart histogram" viewBox="0 0 ${W} ${H}" role="img" aria-label="Histogram of ${metric.label}">
        ${gridY}
        ${barsSvg}
        ${xLabels}
        ${medLine}
        <text class="axis-title" x="${M.left + innerW / 2}" y="${H - 6}" text-anchor="middle">${metric.label} →</text>
      </svg>`;
    root.appendChild(panel);
  }

  render();
  return { root, update: render };
}

function fmt(v: number, metric: Metric): string {
  if (metric.unit === 'growth') return `${Math.round(v * 100)}%`;
  return formatPct(v, metric.unit === 'fee' ? 2 : 1);
}
