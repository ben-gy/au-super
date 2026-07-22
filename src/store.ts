// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { ViewId } from './types';

export interface Filters {
  view: ViewId;
  category: string; // 'ALL' | category
  testFilter: string; // 'ALL' | 'Pass' | 'Pass*'
  typeFilter: string; // 'ALL' | 'lifecycle' | 'single'
  selectedId: string | null;
}

const LS_KEY = 'au-super:prefs:v1';
const PERSIST_KEYS: (keyof Filters)[] = ['view', 'category', 'testFilter', 'typeFilter'];
const VIEWS: ViewId[] = ['explorer', 'rankings', 'scatter', 'fees', 'trustees', 'distribution', 'insights'];

type Listener = (f: Filters) => void;

export class Store {
  filters: Filters;
  private listeners = new Set<Listener>();

  constructor() {
    this.filters = {
      view: 'explorer',
      category: 'ALL',
      testFilter: 'ALL',
      typeFilter: 'ALL',
      selectedId: null,
    };
    this.loadPrefs();
    this.readHash();
  }

  private loadPrefs() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Filters>;
        for (const k of PERSIST_KEYS) {
          if (saved[k] != null) (this.filters as unknown as Record<string, unknown>)[k] = saved[k];
        }
      }
    } catch {
      /* ignore corrupt prefs */
    }
  }

  private savePrefs() {
    try {
      const out: Partial<Filters> = {};
      for (const k of PERSIST_KEYS) (out as unknown as Record<string, unknown>)[k] = this.filters[k];
      localStorage.setItem(LS_KEY, JSON.stringify(out));
    } catch {
      /* storage may be unavailable */
    }
  }

  readHash() {
    const hash = location.hash.replace(/^#/, '');
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const v = params.get('view');
    if (v && (VIEWS as string[]).includes(v)) this.filters.view = v as ViewId;
    this.filters.selectedId = params.get('fund') || null;
    const cat = params.get('cat');
    if (cat) this.filters.category = cat;
  }

  writeHash() {
    const params = new URLSearchParams();
    params.set('view', this.filters.view);
    if (this.filters.selectedId) params.set('fund', this.filters.selectedId);
    if (this.filters.category !== 'ALL') params.set('cat', this.filters.category);
    const next = `#${params.toString()}`;
    if (location.hash !== next) history.replaceState(null, '', next);
  }

  set(patch: Partial<Filters>, opts: { silent?: boolean } = {}) {
    Object.assign(this.filters, patch);
    this.savePrefs();
    this.writeHash();
    if (!opts.silent) this.emit();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    for (const fn of this.listeners) fn(this.filters);
  }
}
