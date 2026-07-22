// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { Meta, Product } from './types';
import { feeDollars, formatMoney, formatPct, formatSignedPct } from './format';

export type Severity = 'alert' | 'warning' | 'good' | 'info';

export interface InsightItem {
  id: string;
  name: string;
  sub?: string;
  value: string;
}

export interface Insight {
  id: string;
  severity: Severity;
  icon: string;
  title: string;
  detail: string;
  items: InsightItem[];
}

const name = (p: Product) => p.product;
const sub = (p: Product) => p.fund;

function topBy(
  products: Product[],
  pick: (p: Product) => number | null,
  dir: 'desc' | 'asc',
  n: number,
): Product[] {
  return products
    .filter((p) => pick(p) != null && Number.isFinite(pick(p) as number))
    .sort((a, b) => {
      const av = pick(a) as number;
      const bv = pick(b) as number;
      return dir === 'desc' ? bv - av : av - bv;
    })
    .slice(0, n);
}

export function buildInsights(products: Product[], meta: Meta): Insight[] {
  const insights: Insight[] = [];

  // 1. Best 10-year net investment returns.
  const bestReturns = topBy(products, (p) => p.nir.y10, 'desc', 6);
  if (bestReturns.length) {
    insights.push({
      id: 'best-returns',
      severity: 'good',
      icon: '▲',
      title: 'Best 10-year returns',
      detail: `Highest net investment return per year over the decade to ${meta.asAt}. The sector median is ${formatPct(meta.medians.nir10)}.`,
      items: bestReturns.map((p) => ({ id: p.id, name: name(p), sub: sub(p), value: formatPct(p.nir.y10) })),
    });
  }

  // 2. Weakest 10-year returns.
  const worstReturns = topBy(products, (p) => p.nir.y10, 'asc', 6);
  if (worstReturns.length) {
    insights.push({
      id: 'worst-returns',
      severity: 'warning',
      icon: '▼',
      title: 'Weakest 10-year returns',
      detail: 'Lowest net investment return per year over the decade. Still worth checking fees and risk before judging — a lower-growth mix earns less but falls less too.',
      items: worstReturns.map((p) => ({ id: p.id, name: name(p), sub: sub(p), value: formatPct(p.nir.y10) })),
    });
  }

  // 3. Cheapest total fees at $50k.
  const cheapest = topBy(products, (p) => p.totalFee50k, 'asc', 6);
  if (cheapest.length) {
    insights.push({
      id: 'cheapest',
      severity: 'good',
      icon: '$',
      title: 'Lowest fees on a $50k balance',
      detail: `Total annual fees and costs for a $50,000 account. The median product charges ${formatPct(meta.medians.fee50k)} (${feeDollars(meta.medians.fee50k, 50000)}).`,
      items: cheapest.map((p) => ({ id: p.id, name: name(p), sub: sub(p), value: `${formatPct(p.totalFee50k)} · ${feeDollars(p.totalFee50k, 50000)}` })),
    });
  }

  // 4. Priciest total fees at $50k.
  const priciest = topBy(products, (p) => p.totalFee50k, 'desc', 6);
  if (priciest.length) {
    insights.push({
      id: 'priciest',
      severity: 'alert',
      icon: '$',
      title: 'Highest fees on a $50k balance',
      detail: 'Total annual fees and costs for a $50,000 account. Over decades, an extra 0.5% a year in fees can cost tens of thousands in final balance.',
      items: priciest.map((p) => ({ id: p.id, name: name(p), sub: sub(p), value: `${formatPct(p.totalFee50k)} · ${feeDollars(p.totalFee50k, 50000)}` })),
    });
  }

  // 5. Biggest margin over the performance-test benchmark.
  const bestMargin = topBy(products, (p) => p.margin, 'desc', 6);
  if (bestMargin.length) {
    insights.push({
      id: 'best-margin',
      severity: 'good',
      icon: '★',
      title: 'Beat their benchmark by the most',
      detail: 'How far each product’s net return exceeded the tailored benchmark APRA built from its own investment mix — a measure of value added beyond the market.',
      items: bestMargin.map((p) => ({ id: p.id, name: name(p), sub: sub(p), value: formatSignedPct(p.margin) })),
    });
  }

  // 6. Thinnest margin — closest to trailing their benchmark.
  const thinMargin = topBy(products, (p) => p.margin, 'asc', 6);
  if (thinMargin.length) {
    insights.push({
      id: 'thin-margin',
      severity: 'warning',
      icon: '≈',
      title: 'Closest to their benchmark',
      detail: 'These products added the least value over their own benchmark. A product must beat the benchmark by a set margin to pass the performance test.',
      items: thinMargin.map((p) => ({ id: p.id, name: name(p), sub: sub(p), value: formatSignedPct(p.margin) })),
    });
  }

  // 7. Largest products by member assets.
  const biggest = topBy(products, (p) => p.assets, 'desc', 6);
  if (biggest.length) {
    insights.push({
      id: 'biggest',
      severity: 'info',
      icon: '◆',
      title: 'Largest products by member assets',
      detail: `Where Australians’ default super actually sits. These products hold the biggest pools of the sector’s ${formatMoney(meta.totalAssets)} in MySuper money.`,
      items: biggest.map((p) => ({ id: p.id, name: name(p), sub: sub(p), value: formatMoney(p.assets) })),
    });
  }

  // 8. Products not fully assessed (Pass*).
  const passStar = products.filter((p) => p.passFail === 'Pass*');
  if (passStar.length) {
    insights.push({
      id: 'pass-star',
      severity: 'info',
      icon: '*',
      title: 'Not yet fully assessable (Pass*)',
      detail: `${passStar.length} product${passStar.length === 1 ? '' : 's'} lacked the full history APRA needs to run the test, so ${passStar.length === 1 ? 'it is' : 'they are'} recorded as “Pass*” rather than a straight pass. Judge these on fees and shorter-term returns for now.`,
      items: passStar.map((p) => ({ id: p.id, name: name(p), sub: sub(p), value: p.isLifecycle ? 'Lifecycle' : 'Single strategy' })),
    });
  }

  // 9. Fee gap — cheapest vs priciest on $50k, in real dollars.
  if (cheapest.length && priciest.length) {
    const lo = cheapest[0];
    const hi = priciest[0];
    if (lo.totalFee50k != null && hi.totalFee50k != null) {
      const gap = Math.round((hi.totalFee50k - lo.totalFee50k) * 50000);
      insights.push({
        id: 'fee-gap',
        severity: 'warning',
        icon: '⇅',
        title: 'The fee gap is real money',
        detail: `On a $50,000 balance the priciest MySuper product charges about $${gap.toLocaleString('en-AU')} a year more than the cheapest — every year, compounding, for decades.`,
        items: [
          { id: lo.id, name: `Cheapest: ${name(lo)}`, sub: sub(lo), value: `${formatPct(lo.totalFee50k)} · ${feeDollars(lo.totalFee50k, 50000)}` },
          { id: hi.id, name: `Priciest: ${name(hi)}`, sub: sub(hi), value: `${formatPct(hi.totalFee50k)} · ${feeDollars(hi.totalFee50k, 50000)}` },
        ],
      });
    }
  }

  return insights;
}
