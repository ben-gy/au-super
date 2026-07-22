// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { Dataset, Meta, Product } from './types';

export async function loadDataset(): Promise<Dataset> {
  const [pRes, mRes] = await Promise.all([
    fetch(`${import.meta.env.BASE_URL}data/products.json`),
    fetch(`${import.meta.env.BASE_URL}data/meta.json`),
  ]);
  if (!pRes.ok) throw new Error(`products.json → HTTP ${pRes.status}`);
  if (!mRes.ok) throw new Error(`meta.json → HTTP ${mRes.status}`);
  const products = (await pRes.json()) as Product[];
  const meta = (await mRes.json()) as Meta;
  if (!Array.isArray(products) || !products.length) throw new Error('No products in dataset.');
  return { products, meta };
}

// Consistent colour for a product's performance-test outcome & value vs median.
export const COLORS = {
  pass: '#157f4a',
  passStar: '#b45309',
  fail: '#c0392b',
  above: '#157f4a',
  below: '#c0392b',
  neutral: '#7c8aa0',
  accent: '#0f6fb2',
  growth: '#0f766e',
};

export function passColor(passFail: string): string {
  if (passFail === 'Pass') return COLORS.pass;
  if (passFail === 'Pass*') return COLORS.passStar;
  if (/^fail/i.test(passFail)) return COLORS.fail;
  return COLORS.neutral;
}

export function byId(products: Product[], id: string): Product | undefined {
  return products.find((p) => p.id === id);
}
