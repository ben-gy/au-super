// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { AppContext, View } from '../context';
import { filteredProducts } from '../context';
import type { Product } from '../types';
import { renderFilterBar } from '../filters';
import { squarify } from '../utils/squarify';
import { attachSvgZoom, type SvgZoomHandle } from '../utils/svgZoom';
import { formatMoney, formatNumber, formatPct } from '../format';
import { glossaryLink } from '../glossary';

const W = 1000;
const H = 620;
const PAD = 3;

const PALETTE = [
  '#0f6fb2', '#0f766e', '#7c3aed', '#b45309', '#be123c', '#0369a1',
  '#4d7c0f', '#9333ea', '#c2410c', '#0891b2', '#a16207', '#15803d',
];

export function createTrusteesView(ctx: AppContext): View {
  const root = document.createElement('div');
  root.className = 'view';
  let handle: SvgZoomHandle | null = null;

  function render() {
    handle?.destroy();
    const list = filteredProducts(ctx).filter((p) => (p.assets ?? 0) > 0);

    // Group by trustee (licensee), sorted by total assets desc.
    const byTrustee = new Map<string, Product[]>();
    for (const p of list) {
      if (!byTrustee.has(p.licensee)) byTrustee.set(p.licensee, []);
      byTrustee.get(p.licensee)!.push(p);
    }
    const groups = Array.from(byTrustee.entries())
      .map(([licensee, prods]) => ({
        licensee,
        prods: [...prods].sort((a, b) => (b.assets ?? 0) - (a.assets ?? 0)),
        total: prods.reduce((s, p) => s + (p.assets ?? 0), 0),
      }))
      .sort((a, b) => b.total - a.total);

    const colorFor = new Map<string, string>();
    groups.forEach((g, i) => colorFor.set(g.licensee, PALETTE[i % PALETTE.length]));

    const outer = squarify(groups.map((g) => g.total), W, H);

    root.innerHTML = `
      <div class="panel-head">
        <h2>Who runs the money — trustees &amp; their products</h2>
        <p class="panel-sub">Every rectangle is a MySuper product, sized by ${glossaryLink('member-assets', 'member assets')} and grouped by ${glossaryLink('trustee')}. A handful of large trustees hold most of the sector's ${formatMoney(ctx.data.meta.totalAssets)}. Scroll to zoom, drag to pan; click any tile for the product.</p>
      </div>`;

    const controls = document.createElement('div');
    controls.className = 'explorer-controls';
    controls.appendChild(renderFilterBar(ctx));
    root.appendChild(controls);

    const panel = document.createElement('div');
    panel.className = 'panel chart-panel';

    const parts: string[] = [];
    groups.forEach((g, gi) => {
      const o = outer[gi];
      if (o.w < 1 || o.h < 1) return;
      const ix = o.x + PAD;
      const iy = o.y + PAD;
      const iw = Math.max(0, o.w - PAD * 2);
      const ih = Math.max(0, o.h - PAD * 2);
      const inner = squarify(g.prods.map((p) => p.assets ?? 0), iw, ih);
      const color = colorFor.get(g.licensee)!;
      g.prods.forEach((p, pi) => {
        const r = inner[pi];
        if (r.w < 0.5 || r.h < 0.5) return;
        const x = ix + r.x;
        const y = iy + r.y;
        const showLabel = r.w > 74 && r.h > 30;
        const tip = `${p.product}<br>${p.fund}<br>Assets: ${formatMoney(p.assets)} · ${formatNumber(p.accounts)} members<br>10yr return: ${formatPct(p.nir.y10)} · Fee: ${formatPct(p.totalFee50k)}`;
        parts.push(
          `<g class="tm-cell" data-id="${p.id}" tabindex="0" role="button" aria-label="${p.product}, ${formatMoney(p.assets)}">
            <rect x="${x}" y="${y}" width="${r.w}" height="${r.h}" fill="${color}" fill-opacity="0.82" stroke="#fff" stroke-width="1" data-tip="${tip}"/>
            ${showLabel ? `<text class="tm-label" x="${x + 6}" y="${y + 16}" data-tip="${tip}">${clip(p.product, r.w)}</text>
              <text class="tm-sub" x="${x + 6}" y="${y + 30}" data-tip="${tip}">${formatMoney(p.assets)}</text>` : ''}
          </g>`,
        );
      });
      // Trustee outline + label.
      parts.push(`<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="none" stroke="${color}" stroke-width="2" pointer-events="none"/>`);
      if (o.w > 100 && o.h > 46) {
        parts.push(`<text class="tm-group" x="${o.x + 6}" y="${o.y + o.h - 8}" pointer-events="none">${clip(g.licensee, o.w)}</text>`);
      }
    });

    panel.innerHTML = `<svg class="chart treemap" viewBox="0 0 ${W} ${H}" role="img" aria-label="Treemap of MySuper products by trustee and assets">${parts.join('')}</svg>`;
    root.appendChild(panel);

    const svg = panel.querySelector('svg') as SVGSVGElement;
    svg.querySelectorAll<SVGGElement>('.tm-cell').forEach((c) =>
      c.addEventListener('click', () => ctx.openDetail(c.dataset.id!)),
    );
    handle = attachSvgZoom(svg, { maxScale: 12 });
  }

  render();
  return { root, update: render, onShow: render };
}

function clip(s: string, w: number): string {
  const max = Math.floor(w / 7);
  return s.length > max ? s.slice(0, Math.max(1, max - 1)) + '…' : s;
}
