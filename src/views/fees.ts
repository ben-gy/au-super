// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { AppContext, View } from '../context';
import { filteredProducts } from '../context';
import type { FeeLadder, Product } from '../types';
import { renderFilterBar } from '../filters';
import { feeDollars, formatPct } from '../format';
import { glossaryLink } from '../glossary';

const TIERS: { key: keyof FeeLadder; label: string; balance: number }[] = [
  { key: 'k10', label: '$10k', balance: 10000 },
  { key: 'k25', label: '$25k', balance: 25000 },
  { key: 'k50', label: '$50k', balance: 50000 },
  { key: 'k100', label: '$100k', balance: 100000 },
  { key: 'k250', label: '$250k', balance: 250000 },
];

// Green (cheap) → amber → red (expensive).
function feeColor(frac: number, min: number, max: number): string {
  const t = max > min ? (frac - min) / (max - min) : 0;
  const stops = [
    [21, 128, 61], // green
    [180, 83, 9], // amber
    [192, 57, 43], // red
  ];
  const seg = t < 0.5 ? 0 : 1;
  const local = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
  const a = stops[seg];
  const b = stops[seg + 1];
  const mix = (i: number) => Math.round(a[i] + (b[i] - a[i]) * local);
  return `rgb(${mix(0)},${mix(1)},${mix(2)})`;
}

export function createFeesView(ctx: AppContext): View {
  const root = document.createElement('div');
  root.className = 'view';
  let feeType: 'total' | 'admin' = 'total';

  function render() {
    const list = filteredProducts(ctx)
      .filter((p) => p.fees[feeType].k50 != null)
      .sort((a, b) => (a.fees[feeType].k50 as number) - (b.fees[feeType].k50 as number));

    const all: number[] = [];
    for (const p of list) for (const t of TIERS) { const v = p.fees[feeType][t.key]; if (v != null) all.push(v); }
    const min = Math.min(...all, 0);
    const max = Math.max(...all, 0.0001);

    root.innerHTML = `
      <div class="panel-head">
        <h2>Fee heatmap — how fees scale with your balance</h2>
        <p class="panel-sub">Every product's ${glossaryLink('total-fees', 'fees')} at five balance sizes. Because ${glossaryLink('admin-fees', 'administration fees')} often include a flat dollar amount, the percentage usually falls as your balance grows. Greener is cheaper; redder is dearer. Click a cell for the full product.</p>
      </div>`;

    const controls = document.createElement('div');
    controls.className = 'explorer-controls';
    const seg = document.createElement('div');
    seg.className = 'segmented';
    seg.innerHTML = `
      <button class="seg ${feeType === 'total' ? 'active' : ''}" data-fee="total">Total fees &amp; costs</button>
      <button class="seg ${feeType === 'admin' ? 'active' : ''}" data-fee="admin">Admin fees only</button>`;
    seg.querySelectorAll<HTMLButtonElement>('.seg').forEach((b) =>
      b.addEventListener('click', () => { feeType = b.dataset.fee as 'total' | 'admin'; render(); }),
    );
    controls.appendChild(renderFilterBar(ctx));
    controls.appendChild(seg);
    root.appendChild(controls);

    const panel = document.createElement('div');
    panel.className = 'panel';
    const cell = (p: Product, tier: typeof TIERS[number]) => {
      const v = p.fees[feeType][tier.key];
      if (v == null) return `<td class="hm-fee empty">—</td>`;
      return `<td class="hm-fee" data-id="${p.id}" style="background:${feeColor(v, min, max)}" data-tip="${p.product}<br>${tier.label} balance · ${formatPct(v)} (${feeDollars(v, tier.balance)}/yr)">${formatPct(v, 2)}</td>`;
    };
    panel.innerHTML = `
      <div class="heatmap-scroll">
        <table class="heatmap fee-heatmap">
          <thead><tr><th class="hm-corner">Product</th>${TIERS.map((t) => `<th class="hm-fee-col" data-tip="Fees on a ${t.label} balance">${t.label}</th>`).join('')}</tr></thead>
          <tbody>
            ${list
              .map(
                (p) => `<tr>
                  <td class="hm-rowlabel" data-id="${p.id}"><span class="hm-name">${p.product}</span><span class="hm-fund">${p.fund}</span></td>
                  ${TIERS.map((t) => cell(p, t)).join('')}
                </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </div>`;
    root.appendChild(panel);

    panel.querySelectorAll<HTMLElement>('[data-id]').forEach((el) =>
      el.addEventListener('click', () => ctx.openDetail(el.dataset.id!)),
    );
  }

  render();
  return { root, update: render };
}
