import type { AppContext } from './context';
import type { Product } from './types';
import { byId, COLORS, passColor } from './data';
import { categoryLabel, feeDollars, formatMoney, formatNumber, formatPct, formatSignedPct } from './format';
import { glossaryLink } from './glossary';

const FEE_TIERS: { key: 'k10' | 'k25' | 'k50' | 'k100' | 'k250'; label: string; balance: number }[] = [
  { key: 'k10', label: '$10k', balance: 10000 },
  { key: 'k25', label: '$25k', balance: 25000 },
  { key: 'k50', label: '$50k', balance: 50000 },
  { key: 'k100', label: '$100k', balance: 100000 },
  { key: 'k250', label: '$250k', balance: 250000 },
];

const PERIODS: { key: 'y10' | 'y7' | 'y5' | 'y3'; label: string }[] = [
  { key: 'y10', label: '10 yr' },
  { key: 'y7', label: '7 yr' },
  { key: 'y5', label: '5 yr' },
  { key: 'y3', label: '3 yr' },
];

export function fillDetail(host: HTMLElement, ctx: AppContext, id: string): void {
  const p = byId(ctx.data.products, id);
  if (!p) {
    host.innerHTML = `<div class="empty">Product not found.</div>`;
    return;
  }
  const meta = ctx.data.meta;
  const medRet = meta.medians.nir10;
  const medFee = meta.medians.fee50k;

  const retDelta = p.nir.y10 != null && medRet != null ? p.nir.y10 - medRet : null;
  const feeDelta = p.totalFee50k != null && medFee != null ? p.totalFee50k - medFee : null;

  host.innerHTML = `
    <div class="detail-title-row">
      <h2 class="detail-name">${p.product}</h2>
      <span class="pill sm" style="background:${passColor(p.passFail)}">${p.passFail || '—'}</span>
      <div class="detail-statename">${p.fund} · ${p.licensee}</div>
      <div class="detail-tags">
        <span class="cat-tag">${categoryLabel(p.category)}</span>
        <span class="cat-tag">${p.isLifecycle ? glossaryLink('lifecycle', 'Lifecycle') : glossaryLink('single-strategy', 'Single strategy')}</span>
        <span class="cat-tag">${p.publicOffer ? glossaryLink('public-offer', 'Public offer') : 'Restricted'}</span>
      </div>
    </div>

    <div class="detail-hero">
      <div>
        <div class="hero-rate">${formatPct(p.nir.y10)}</div>
        <div class="hero-label">10-year ${glossaryLink('net-investment-return', 'net investment return')} p.a.</div>
        ${retDelta != null ? `<div class="hero-change ${retDelta >= 0 ? 'good' : 'bad'}">${formatSignedPct(retDelta)} vs sector median</div>` : ''}
      </div>
    </div>

    <div class="detail-cards">
      <div class="dcard"><div class="dcard-val mono">${formatPct(p.totalFee50k)}</div><div class="dcard-lab">${glossaryLink('total-fees', 'Fee')} on $50k<br>${feeDollars(p.totalFee50k, 50000)}/yr</div></div>
      <div class="dcard"><div class="dcard-val mono">${formatPct(p.nir.y5)}</div><div class="dcard-lab">5-year return p.a.</div></div>
      <div class="dcard"><div class="dcard-val mono">${p.growth == null ? '—' : Math.round(p.growth * 100) + '%'}</div><div class="dcard-lab">${glossaryLink('growth-allocation', 'Growth')} assets</div></div>
      <div class="dcard"><div class="dcard-val mono">${p.margin == null ? '—' : formatSignedPct(p.margin)}</div><div class="dcard-lab">${glossaryLink('margin', 'vs benchmark')} p.a.</div></div>
      <div class="dcard"><div class="dcard-val mono">${formatMoney(p.assets)}</div><div class="dcard-lab">Member assets</div></div>
      <div class="dcard"><div class="dcard-val mono">${formatNumber(p.accounts)}</div><div class="dcard-lab">Member accounts</div></div>
    </div>

    <div class="detail-section">
      <div class="detail-h3">Returns over time</div>
      ${returnBars(p)}
    </div>

    <div class="detail-section">
      <div class="detail-h3">${glossaryLink('total-fees', 'Fees')} by balance</div>
      ${feeBars(p)}
    </div>

    ${p.isLifecycle && p.stages && p.stages.length ? lifecycleSection(p) : ''}

    <div class="detail-section">
      <div class="detail-h3">${glossaryLink('performance-test', 'Performance test')} ${meta.testYear}</div>
      <div class="test-detail">
        <div class="test-row"><span>Result</span><strong style="color:${passColor(p.passFail)}">${p.passFail || '—'}</strong></div>
        <div class="test-row"><span>${glossaryLink('margin', 'Return above benchmark')}</span><strong class="${p.margin != null && p.margin >= 0 ? 'good' : 'bad'}">${p.margin == null ? '—' : formatSignedPct(p.margin)} p.a.</strong></div>
        <div class="test-row"><span>Lookback period</span><strong>${p.lookback ?? '—'} years</strong></div>
        <div class="test-row"><span>Admin fee vs benchmark</span><strong>${p.rafe == null ? '—' : formatPct(p.rafe)} vs ${p.brafe == null ? '—' : formatPct(p.brafe)}</strong></div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-h3">Versus the sector</div>
      ${cmpRow('10-year return', p.nir.y10, medRet, retDelta, true)}
      ${cmpRow('Fee on $50k', p.totalFee50k, medFee, feeDelta, false)}
    </div>

    <div class="detail-actions">
      <button class="btn sm" data-goto="explorer">Back to all products</button>
    </div>`;

  host.querySelector('[data-goto]')?.addEventListener('click', () => ctx.goToView('explorer'));
}

function returnBars(p: Product): string {
  const vals = PERIODS.map((per) => ({ label: per.label, nir: p.nir[per.key], net: p.net[per.key] }));
  const all = vals.flatMap((v) => [v.nir, v.net]).filter((v): v is number => v != null);
  const max = Math.max(...all, 0.0001);
  return `<div class="mini-bars">${vals
    .map((v) => {
      if (v.nir == null) return '';
      return `<div class="mini-row" data-tip="${v.label}: ${formatPct(v.nir)} investment return, ${formatPct(v.net)} kept after all fees on $50k">
        <div class="mini-label">${v.label}</div>
        <div class="mini-track"><div class="mini-fill" style="width:${(v.nir / max) * 100}%;background:${COLORS.accent}"></div></div>
        <div class="mini-val mono">${formatPct(v.nir)}</div>
      </div>`;
    })
    .join('')}</div>
    <div class="mini-note">Bars show ${glossaryLink('net-investment-return', 'net investment return')}; the figure a $50k member keeps after admin fees (${glossaryLink('net-return', 'net return')}) is in the tooltip.</div>`;
}

function feeBars(p: Product): string {
  const vals = FEE_TIERS.map((t) => ({ label: t.label, balance: t.balance, v: p.fees.total[t.key] }));
  const max = Math.max(...vals.map((v) => v.v ?? 0), 0.0001);
  return `<div class="mini-bars">${vals
    .map((v) => {
      if (v.v == null) return '';
      return `<div class="mini-row" data-tip="${v.label} balance: ${formatPct(v.v)} = ${feeDollars(v.v, v.balance)} a year">
        <div class="mini-label">${v.label}</div>
        <div class="mini-track"><div class="mini-fill" style="width:${(v.v / max) * 100}%;background:${COLORS.growth}"></div></div>
        <div class="mini-val mono">${formatPct(v.v)}</div>
      </div>`;
    })
    .join('')}</div>`;
}

function lifecycleSection(p: Product): string {
  const stages = p.stages!;
  return `<div class="detail-section">
    <div class="detail-h3">${glossaryLink('lifecycle', 'Lifecycle')} glide path</div>
    <div class="mini-note">This product moves members from higher-growth to safer investments as they age. Headline figures above use the accumulation stage (highest growth).</div>
    <div class="table-scroll compact">
      <table class="data-table stage-table">
        <thead><tr><th>Stage</th><th class="ta-right">Growth</th><th class="ta-right">10yr</th><th class="ta-right">Fee $50k</th></tr></thead>
        <tbody>
          ${stages
            .map(
              (s) => `<tr>
                <td>${s.name || '—'}</td>
                <td class="ta-right mono">${s.growth == null ? '—' : Math.round(s.growth * 100) + '%'}</td>
                <td class="ta-right mono">${formatPct(s.nir10)}</td>
                <td class="ta-right mono">${formatPct(s.fee50k)}</td>
              </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

function cmpRow(label: string, val: number | null, med: number | null, delta: number | null, goodHigh: boolean): string {
  if (val == null || med == null) return '';
  const max = Math.max(val, med) * 1.15 || 1;
  const good = delta == null ? true : goodHigh ? delta >= 0 : delta <= 0;
  return `<div class="cmp-block">
    <div class="cmp-row"><span class="cmp-label">${label}</span>
      <div class="cmp-track"><div class="cmp-fill" style="width:${(val / max) * 100}%;background:${good ? COLORS.above : COLORS.below}"></div></div>
      <span class="cmp-val">${formatPct(val, 2)}</span></div>
    <div class="cmp-row"><span class="cmp-label dim">Sector median</span>
      <div class="cmp-track"><div class="cmp-fill" style="width:${(med / max) * 100}%;background:${COLORS.neutral}"></div></div>
      <span class="cmp-val">${formatPct(med, 2)}</span></div>
  </div>`;
}
