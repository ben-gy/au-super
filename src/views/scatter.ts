import type { AppContext, View } from '../context';
import { filteredProducts } from '../context';
import { renderFilterBar } from '../filters';
import { COLORS, passColor } from '../data';
import { feeDollars, formatMoney, formatPct } from '../format';
import { attachSvgZoom, type SvgZoomHandle } from '../utils/svgZoom';
import { glossaryLink } from '../glossary';

const W = 900;
const H = 560;
const M = { top: 24, right: 24, bottom: 56, left: 64 };

export function createScatterView(ctx: AppContext): View {
  const root = document.createElement('div');
  root.className = 'view';
  let handle: SvgZoomHandle | null = null;

  function render() {
    handle?.destroy();
    const meta = ctx.data.meta;
    const list = filteredProducts(ctx).filter((p) => p.totalFee50k != null && p.nir.y10 != null);

    const fees = list.map((p) => p.totalFee50k as number);
    const rets = list.map((p) => p.nir.y10 as number);
    const feeMin = Math.min(...fees, 0);
    const feeMax = Math.max(...fees) * 1.05;
    const retMin = Math.min(...rets) * 0.97;
    const retMax = Math.max(...rets) * 1.03;
    const maxAssets = Math.max(...list.map((p) => p.assets ?? 0), 1);

    const innerW = W - M.left - M.right;
    const innerH = H - M.top - M.bottom;
    const sx = (fee: number) => M.left + ((fee - feeMin) / (feeMax - feeMin || 1)) * innerW;
    const sy = (ret: number) => M.top + innerH - ((ret - retMin) / (retMax - retMin || 1)) * innerH;
    const rSize = (a: number | null) => 5 + Math.sqrt((a ?? 0) / maxAssets) * 20;

    const medFee = meta.medians.fee50k;
    const medRet = meta.medians.nir10;

    root.innerHTML = `
      <div class="panel-head">
        <h2>Fees vs returns — are you paying for performance?</h2>
        <p class="panel-sub">Each bubble is a MySuper product: horizontal position is its ${glossaryLink('total-fees', 'total fee')} on a $50k balance, vertical position is its 10-year ${glossaryLink('net-investment-return', 'net investment return')}, and bubble size is member assets. The sweet spot is <strong>top-left</strong>: low fees, high returns. Scroll to zoom, drag to pan, double-click to reset.</p>
      </div>`;

    const controls = document.createElement('div');
    controls.className = 'explorer-controls';
    controls.appendChild(renderFilterBar(ctx));
    root.appendChild(controls);

    const legend = document.createElement('div');
    legend.className = 'legend';
    legend.innerHTML = `
      <span class="legend-item static"><span class="legend-swatch" style="background:${COLORS.pass}"></span>Passed test</span>
      <span class="legend-item static"><span class="legend-swatch" style="background:${COLORS.passStar}"></span>Pass* (not fully assessed)</span>
      <span class="legend-item static"><span class="legend-swatch legend-ring"></span>Bubble size = member assets</span>`;
    root.appendChild(legend);

    const panel = document.createElement('div');
    panel.className = 'panel chart-panel';

    // Y grid/axis (returns)
    const yTicks = niceTicks(retMin, retMax, 6);
    const xTicks = niceTicks(feeMin, feeMax, 6);

    const quadrant =
      medFee != null && medRet != null
        ? `<rect x="${M.left}" y="${M.top}" width="${sx(medFee) - M.left}" height="${sy(medRet) - M.top}" fill="${COLORS.pass}" opacity="0.06"/>
           <text x="${M.left + 8}" y="${M.top + 16}" class="quad-label">Lower fees · higher returns</text>`
        : '';

    const gridY = yTicks
      .map((t) => `<line class="grid" x1="${M.left}" y1="${sy(t)}" x2="${W - M.right}" y2="${sy(t)}"/><text class="axis-label" x="${M.left - 8}" y="${sy(t) + 3}" text-anchor="end">${formatPct(t, 1)}</text>`)
      .join('');
    const gridX = xTicks
      .map((t) => `<line class="grid" x1="${sx(t)}" y1="${M.top}" x2="${sx(t)}" y2="${H - M.bottom}"/><text class="axis-label" x="${sx(t)}" y="${H - M.bottom + 18}" text-anchor="middle">${formatPct(t, 1)}</text>`)
      .join('');

    const medLines =
      medFee != null && medRet != null
        ? `<line class="crosshair" x1="${sx(medFee)}" y1="${M.top}" x2="${sx(medFee)}" y2="${H - M.bottom}"/>
           <line class="crosshair" x1="${M.left}" y1="${sy(medRet)}" x2="${W - M.right}" y2="${sy(medRet)}"/>`
        : '';

    // Draw larger bubbles first so small ones stay clickable on top.
    const drawList = [...list].sort((a, b) => (b.assets ?? 0) - (a.assets ?? 0));
    const dots = drawList
      .map((p) => {
        const cx = sx(p.totalFee50k as number);
        const cy = sy(p.nir.y10 as number);
        const r = rSize(p.assets);
        const tip = `${p.product}<br>${p.fund}<br>10yr return: ${formatPct(p.nir.y10)} · Fee: ${formatPct(p.totalFee50k)} (${feeDollars(p.totalFee50k, 50000)})<br>Assets: ${formatMoney(p.assets)}`;
        return `<circle class="dot" data-id="${p.id}" cx="${cx}" cy="${cy}" r="${r}" fill="${passColor(p.passFail)}" fill-opacity="0.55" stroke="${passColor(p.passFail)}" stroke-width="1.5" data-tip="${tip}" aria-label="${p.product}: ${formatPct(p.nir.y10)} return, ${formatPct(p.totalFee50k)} fee" tabindex="0" role="button"/>`;
      })
      .join('');

    panel.innerHTML = `
      <svg class="chart scatter" viewBox="0 0 ${W} ${H}" role="img" aria-label="Scatter plot of fees against returns">
        ${quadrant}
        ${gridY}${gridX}
        ${medLines}
        <text class="axis-title" x="${M.left + innerW / 2}" y="${H - 8}" text-anchor="middle">Total fees &amp; costs on a $50,000 balance →</text>
        <text class="axis-title" transform="translate(16 ${M.top + innerH / 2}) rotate(-90)" text-anchor="middle">10-year net investment return →</text>
        ${dots}
      </svg>`;
    root.appendChild(panel);

    const svg = panel.querySelector('svg') as SVGSVGElement;
    svg.querySelectorAll<SVGCircleElement>('.dot').forEach((c) =>
      c.addEventListener('click', () => ctx.openDetail(c.dataset.id!)),
    );
    handle = attachSvgZoom(svg, { maxScale: 10 });
  }

  render();
  return { root, update: render, onShow: render };
}

function niceTicks(min: number, max: number, count: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return [min];
  const span = max - min;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let t = start; t <= max + 1e-9; t += step) ticks.push(Math.round(t * 1e6) / 1e6);
  return ticks;
}
