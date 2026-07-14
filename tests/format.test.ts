import { describe, expect, it } from 'vitest';
import {
  categoryLabel,
  feeDollars,
  formatMoney,
  formatNumber,
  formatPct,
  formatSignedPct,
  relativeTime,
} from '../src/format';

describe('formatNumber', () => {
  it('adds thousands separators', () => {
    expect(formatNumber(3126300)).toBe('3,126,300');
  });
  it('handles zero and null', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(undefined)).toBe('—');
    expect(formatNumber(NaN)).toBe('—');
  });
  it('respects decimals', () => {
    expect(formatNumber(1234.5, 1)).toBe('1,234.5');
  });
});

describe('formatPct', () => {
  it('renders a fraction as a percentage', () => {
    expect(formatPct(0.0795)).toBe('7.95%');
    expect(formatPct(0.0071, 2)).toBe('0.71%');
  });
  it('handles null / non-finite', () => {
    expect(formatPct(null)).toBe('—');
    expect(formatPct(Infinity)).toBe('—');
  });
  it('honours decimal places', () => {
    expect(formatPct(0.076, 1)).toBe('7.6%');
  });
});

describe('formatSignedPct', () => {
  it('prefixes a plus for positive values', () => {
    expect(formatSignedPct(0.00857)).toBe('+0.86%');
  });
  it('keeps the minus for negatives', () => {
    expect(formatSignedPct(-0.0032)).toBe('-0.32%');
  });
  it('handles null', () => {
    expect(formatSignedPct(null)).toBe('—');
  });
});

describe('formatMoney', () => {
  it('scales into tn / bn / m / k', () => {
    expect(formatMoney(1_206_928_909_000)).toBe('$1.21tn');
    expect(formatMoney(239_034_124_000)).toBe('$239.0bn');
    expect(formatMoney(5_400_000)).toBe('$5.4m');
    expect(formatMoney(12_500)).toBe('$12.5k');
    expect(formatMoney(420)).toBe('$420');
  });
  it('handles null', () => {
    expect(formatMoney(null)).toBe('—');
  });
});

describe('feeDollars', () => {
  it('converts a fee fraction into annual dollars', () => {
    expect(feeDollars(0.0071, 50000)).toBe('$355');
    expect(feeDollars(0.01, 10000)).toBe('$100');
  });
  it('handles null', () => {
    expect(feeDollars(null, 50000)).toBe('—');
  });
});

describe('categoryLabel', () => {
  it('maps known categories', () => {
    expect(categoryLabel('MySuper Large Employer')).toBe('Large employer');
    expect(categoryLabel('MySuper Material Goodwill')).toBe('Material goodwill');
    expect(categoryLabel('Generic')).toBe('Generic');
  });
  it('passes unknown values through', () => {
    expect(categoryLabel('Something Else')).toBe('Something Else');
  });
});

describe('relativeTime', () => {
  it('reports minutes and hours ago', () => {
    const now = Date.parse('2026-07-14T12:00:00Z');
    expect(relativeTime('2026-07-14T11:30:00Z', now)).toBe('30m ago');
    expect(relativeTime('2026-07-14T09:00:00Z', now)).toBe('3h ago');
  });
  it('handles invalid input', () => {
    expect(relativeTime('not-a-date')).toBe('unknown');
  });
});
