// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { Dataset, Product, ViewId } from './types';
import type { Store } from './store';

export interface AppContext {
  data: Dataset;
  store: Store;
  openDetail: (id: string) => void;
  goToView: (v: ViewId) => void;
}

export interface View {
  root: HTMLElement;
  update?: () => void; // filters changed while this view is active
  onShow?: () => void; // became the active view
}

// Products passing the current category/test/type filters (shared by all views).
export function filteredProducts(ctx: AppContext): Product[] {
  const { category, testFilter, typeFilter } = ctx.store.filters;
  return ctx.data.products.filter((p) => {
    if (category !== 'ALL' && p.category !== category) return false;
    if (testFilter !== 'ALL' && p.passFail !== testFilter) return false;
    if (typeFilter === 'lifecycle' && !p.isLifecycle) return false;
    if (typeFilter === 'single' && p.isLifecycle) return false;
    return true;
  });
}
