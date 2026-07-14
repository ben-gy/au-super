import { describe, expect, it } from 'vitest';
import { buildInsights } from '../src/analysis';
import type { Meta, Product } from '../src/types';

function product(over: Partial<Product>): Product {
  return {
    id: over.id ?? 'p',
    licensee: 'Trustee',
    fund: 'Fund',
    product: over.product ?? 'Product',
    category: 'Generic',
    publicOffer: true,
    isLifecycle: false,
    assets: 1e9,
    accounts: 1000,
    proportion: 0.5,
    passFail: 'Pass',
    testMeasure: 0.005,
    margin: 0.005,
    lookback: 10,
    rafe: 0.002,
    brafe: 0.0025,
    growth: 0.7,
    nir: { y10: 0.07, y7: 0.07, y5: 0.08, y3: 0.09 },
    relSaa10: 0.005,
    relSrp10: 0.003,
    net: { y10: 0.067, y7: 0.067, y5: 0.077, y3: 0.087 },
    adminFee50k: 0.002,
    totalFee50k: 0.008,
    fees: {
      admin: { k10: 0.005, k25: 0.003, k50: 0.002, k100: 0.0015, k250: 0.001 },
      total: { k10: 0.011, k25: 0.009, k50: 0.008, k100: 0.007, k250: 0.006 },
    },
    stages: null,
    ...over,
  };
}

const meta: Meta = {
  generatedAt: '2026-07-14T00:00:00Z',
  asAt: '30 June 2025',
  testYear: 2025,
  source: { cppp: 'CPPP', cpppUrl: '#', testUrl: '#' },
  productCount: 3,
  trusteeCount: 1,
  totalAssets: 3e9,
  totalAccounts: 3000,
  passCount: 2,
  passStarCount: 1,
  failCount: 0,
  lifecycleCount: 0,
  medians: { nir10: 0.07, nir5: 0.08, fee50k: 0.008, growth: 0.7, margin: 0.005 },
};

const sample: Product[] = [
  product({ id: 'best', product: 'High Returns', nir: { y10: 0.095, y7: 0.09, y5: 0.1, y3: 0.11 }, totalFee50k: 0.006, margin: 0.012, assets: 5e10 }),
  product({ id: 'worst', product: 'Low Returns', nir: { y10: 0.05, y7: 0.05, y5: 0.06, y3: 0.07 }, totalFee50k: 0.014, margin: 0.001, assets: 1e9 }),
  product({ id: 'star', product: 'New Fund', passFail: 'Pass*', nir: { y10: null, y7: null, y5: 0.09, y3: 0.1 }, totalFee50k: 0.009, margin: 0.006, assets: 2e9 }),
];

describe('buildInsights', () => {
  const insights = buildInsights(sample, meta);

  it('produces the expected set of insight cards', () => {
    const ids = insights.map((i) => i.id);
    expect(ids).toContain('best-returns');
    expect(ids).toContain('worst-returns');
    expect(ids).toContain('cheapest');
    expect(ids).toContain('priciest');
    expect(ids).toContain('best-margin');
    expect(ids).toContain('biggest');
    expect(ids).toContain('pass-star');
    expect(ids).toContain('fee-gap');
  });

  it('ranks best returns highest first and excludes null returns', () => {
    const best = insights.find((i) => i.id === 'best-returns')!;
    expect(best.items[0].id).toBe('best');
    expect(best.items.map((it) => it.id)).not.toContain('star'); // null 10yr NIR excluded
  });

  it('ranks cheapest fee first for the cheapest card', () => {
    const cheap = insights.find((i) => i.id === 'cheapest')!;
    expect(cheap.items[0].id).toBe('best'); // 0.6% is cheapest
  });

  it('lists only Pass* products in the pass-star card', () => {
    const star = insights.find((i) => i.id === 'pass-star')!;
    expect(star.items).toHaveLength(1);
    expect(star.items[0].id).toBe('star');
  });

  it('computes a non-empty fee gap between cheapest and priciest', () => {
    const gap = insights.find((i) => i.id === 'fee-gap')!;
    expect(gap.items).toHaveLength(2);
    expect(gap.detail).toMatch(/\$\d/);
  });

  it('gives every insight a severity, icon and at least one item', () => {
    for (const ins of insights) {
      expect(['alert', 'warning', 'good', 'info']).toContain(ins.severity);
      expect(ins.icon.length).toBeGreaterThan(0);
      expect(ins.items.length).toBeGreaterThan(0);
    }
  });
});
