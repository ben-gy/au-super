// Position-asserting layout tests for the squarified treemap (Trustees view)
// plus the pure viewBox math behind SVG zoom/pan. Area-only tests pass on
// visually broken layouts — positions, bounds and pairwise overlap catch them.
import { describe, expect, it } from 'vitest';
import { squarify, type Rect } from '../src/utils/squarify';
import { clampViewBox, zoomViewBox, type ViewBox } from '../src/utils/svgZoom';

const EPS = 1e-6;

function overlapArea(a: Rect, b: Rect): number {
  const ox = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const oy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return ox * oy;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('squarify — positional correctness', () => {
  const boxes: Array<[number, number]> = [[1000, 620], [500, 500], [1200, 300]];
  const rand = mulberry32(11);
  const valueSets: number[][] = [
    [5, 3, 2, 1],
    [100],
    Array.from({ length: 12 }, () => 1),
    Array.from({ length: 52 }, () => 1 + Math.floor(rand() * 500)), // ~like the 52 products
  ];

  for (const [W, H] of boxes) {
    for (const values of valueSets) {
      it(`lays out ${values.length} values in ${W}×${H}`, () => {
        const rects = squarify(values, W, H);
        const total = values.reduce((a, b) => a + b, 0);
        expect(rects).toHaveLength(values.length);
        for (const r of rects) {
          expect(Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.w) && Number.isFinite(r.h)).toBe(true);
          expect(r.w).toBeGreaterThanOrEqual(0);
          expect(r.h).toBeGreaterThanOrEqual(0);
          expect(r.x).toBeGreaterThanOrEqual(-EPS);
          expect(r.y).toBeGreaterThanOrEqual(-EPS);
          expect(r.x + r.w).toBeLessThanOrEqual(W + EPS * W);
          expect(r.y + r.h).toBeLessThanOrEqual(H + EPS * H);
        }
        for (let i = 0; i < rects.length; i++) {
          for (let j = i + 1; j < rects.length; j++) {
            expect(overlapArea(rects[i], rects[j])).toBeLessThan(0.5);
          }
        }
        const sumArea = rects.reduce((s, r) => s + r.w * r.h, 0);
        expect(Math.abs(sumArea - W * H)).toBeLessThan(W * H * 1e-6);
        rects.forEach((r, i) => {
          const expected = (values[i] / total) * W * H;
          expect(Math.abs(r.w * r.h - expected)).toBeLessThan(Math.max(1e-6, expected * 1e-6));
        });
      });
    }
  }

  it('handles degenerates', () => {
    expect(squarify([], 100, 100)).toEqual([]);
    const [single] = squarify([42], 100, 80);
    expect(single.w * single.h).toBeCloseTo(8000, 6);
    for (const r of squarify([0, 0, 0], 100, 100)) {
      expect(r.w * r.h).toBe(0);
    }
  });
});

describe('zoomViewBox / clampViewBox', () => {
  const base: ViewBox = { x: 0, y: 0, w: 900, h: 560 };

  it('zooms in about a focus point and stays within bounds', () => {
    const zoomed = zoomViewBox(base, base, 2, 450, 280, 1, 8);
    expect(zoomed.w).toBeCloseTo(450, 6);
    expect(zoomed.h).toBeCloseTo(280, 6);
    expect(zoomed.x).toBeGreaterThanOrEqual(base.x - EPS);
    expect(zoomed.y).toBeGreaterThanOrEqual(base.y - EPS);
    expect(zoomed.x + zoomed.w).toBeLessThanOrEqual(base.x + base.w + EPS);
    expect(zoomed.y + zoomed.h).toBeLessThanOrEqual(base.y + base.h + EPS);
  });

  it('never zooms out past the base (minScale = 1)', () => {
    const out = zoomViewBox(base, base, 0.25, 450, 280, 1, 8);
    expect(out.w).toBeLessThanOrEqual(base.w + EPS);
    expect(out.h).toBeLessThanOrEqual(base.h + EPS);
  });

  it('respects maxScale', () => {
    let vb = base;
    for (let i = 0; i < 20; i++) vb = zoomViewBox(vb, base, 2, 450, 280, 1, 8);
    expect(base.w / vb.w).toBeLessThanOrEqual(8 + EPS);
  });

  it('clamps a panned viewBox back inside the base', () => {
    const panned = clampViewBox({ x: -500, y: -500, w: 300, h: 200 }, base);
    expect(panned.x).toBe(0);
    expect(panned.y).toBe(0);
    const panned2 = clampViewBox({ x: 5000, y: 5000, w: 300, h: 200 }, base);
    expect(panned2.x + panned2.w).toBeLessThanOrEqual(base.w + EPS);
    expect(panned2.y + panned2.h).toBeLessThanOrEqual(base.h + EPS);
  });
});
