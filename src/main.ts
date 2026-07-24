// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.

import './styles.css';
import type { AppContext, View } from './context';
import type { Dataset, ViewId } from './types';
import { loadDataset } from './data';
import { Store } from './store';
import { initGlossary } from './glossary';
import { initTooltip } from './tooltip';
import { openAbout } from './about';
import { fillDetail } from './detail';
import { formatMoney, formatNumber, formatPct, relativeTime, debounce } from './format';
import { createExplorerView } from './views/explorer';
import { createRankingsView } from './views/rankings';
import { createScatterView } from './views/scatter';
import { createFeesView } from './views/fees';
import { createTrusteesView } from './views/trustees';
import { createDistributionView } from './views/distribution';
import { createInsightsView } from './views/insights';

const TABS: { id: ViewId; label: string; icon: string }[] = [
  { id: 'explorer', label: 'Explorer', icon: '▤' },
  { id: 'rankings', label: 'Rankings', icon: '🏆' },
  { id: 'scatter', label: 'Fees vs Returns', icon: '✦' },
  { id: 'fees', label: 'Fee Heatmap', icon: '▦' },
  { id: 'trustees', label: 'Trustees', icon: '◧' },
  { id: 'distribution', label: 'Distribution', icon: '📊' },
  { id: 'insights', label: 'Insights', icon: '💡' },
];

const app = document.getElementById('app')!;

async function boot() {
  renderLoading();
  let data: Dataset;
  try {
    data = await loadDataset();
  } catch (err) {
    renderError(err instanceof Error ? err.message : String(err));
    return;
  }
  renderApp(data);
}

function renderLoading() {
  app.innerHTML = `<div class="boot"><div class="boot-spinner"></div><p>Loading super fund data…</p></div>`;
}

function renderError(msg: string) {
  app.innerHTML = `<div class="boot"><p class="boot-error">Couldn't load the data.</p><p class="dim">${msg}</p><button class="btn" onclick="location.reload()">Retry</button></div>`;
}

function renderApp(data: Dataset) {
  const store = new Store();
  const { meta } = data;

  app.innerHTML = `
    <header class="site-header">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true"></span>
        <div>
          <div class="brand-title">Super Funds <span class="cc">(AU)</span></div>
          <div class="brand-sub">Compare every MySuper default option</div>
        </div>
      </div>
      <div class="header-search">
        <input type="search" id="global-search" placeholder="Search a fund or product…" autocomplete="off" aria-label="Search super products" />
        <div id="search-results" class="search-results" hidden></div>
      </div>
      <button class="btn ghost" id="about-btn" aria-label="About this site">? About</button>
    </header>

    <div class="summary-strip">
      <div class="sum-item primary"><div class="sum-val" style="color:var(--accent-primary)">${meta.productCount}</div><div class="sum-lab">MySuper products</div></div>
      <div class="sum-item"><div class="sum-val">${formatMoney(meta.totalAssets)}</div><div class="sum-lab">Member assets</div></div>
      <div class="sum-item"><div class="sum-val">${formatNumber(meta.totalAccounts)}</div><div class="sum-lab">Member accounts</div></div>
      <div class="sum-item"><div class="sum-val">${formatPct(meta.medians.nir10)}</div><div class="sum-lab">Median 10yr return</div></div>
      <div class="sum-item"><div class="sum-val">${formatPct(meta.medians.fee50k)}</div><div class="sum-lab">Median fee ($50k)</div></div>
      <div class="sum-item"><div class="sum-val" style="color:var(--status-good)">${meta.passCount + meta.passStarCount}/${meta.productCount}</div><div class="sum-lab">Passed ${meta.testYear} test</div></div>
    </div>

    <nav class="tabs" role="tablist">
      ${TABS.map((t) => `<button class="tab" role="tab" data-view="${t.id}"><span class="tab-icon" aria-hidden="true">${t.icon}</span>${t.label}</button>`).join('')}
    </nav>

    <main class="main-content"><div id="view-host"></div></main>

    <footer class="site-footer">
      <div class="foot-inner">
        <div>Data: <a href="${meta.source.cpppUrl}" target="_blank" rel="noopener">APRA MySuper product performance</a>, as at ${meta.asAt}. General information only — not financial advice. Updated ${relativeTime(meta.generatedAt)}.</div>
        <div>Built by <a href="https://benrichardson.dev/" target="_blank" rel="noopener">benrichardson.dev</a> · <a href="https://hub.benrichardson.dev" target="_blank" rel="noopener">more tools &amp; sites</a></div>
      </div>
    </footer>

    <div class="detail-backdrop" hidden></div>
    <aside class="detail-panel" hidden aria-label="Product detail">
      <button class="detail-close" aria-label="Close detail">×</button>
      <div class="detail-body"></div>
    </aside>`;

  const viewHost = app.querySelector<HTMLDivElement>('#view-host')!;
  const detailPanel = app.querySelector<HTMLElement>('.detail-panel')!;
  const detailBackdrop = app.querySelector<HTMLElement>('.detail-backdrop')!;
  const detailBody = app.querySelector<HTMLElement>('.detail-body')!;

  const ctx: AppContext = {
    data,
    store,
    openDetail: (id) => {
      store.set({ selectedId: id }, { silent: true });
      store.writeHash();
      fillDetail(detailBody, ctx, id);
      detailPanel.hidden = false;
      detailBackdrop.hidden = false;
      detailBody.scrollTop = 0;
      requestAnimationFrame(() => {
        detailPanel.classList.add('open');
        detailBackdrop.classList.add('open');
      });
    },
    goToView: (v) => store.set({ view: v }),
  };

  function closeDetail() {
    detailPanel.classList.remove('open');
    detailBackdrop.classList.remove('open');
    store.set({ selectedId: null }, { silent: true });
    store.writeHash();
    setTimeout(() => {
      detailPanel.hidden = true;
      detailBackdrop.hidden = true;
    }, 250);
  }
  app.querySelector('.detail-close')!.addEventListener('click', closeDetail);
  detailBackdrop.addEventListener('click', closeDetail);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !detailPanel.hidden) closeDetail();
  });

  const views: Partial<Record<ViewId, View>> = {};
  const factories: Record<ViewId, () => View> = {
    explorer: () => createExplorerView(ctx),
    rankings: () => createRankingsView(ctx),
    scatter: () => createScatterView(ctx),
    fees: () => createFeesView(ctx),
    trustees: () => createTrusteesView(ctx),
    distribution: () => createDistributionView(ctx),
    insights: () => createInsightsView(ctx),
  };

  let currentId: ViewId | null = null;
  function showView(id: ViewId) {
    if (!views[id]) views[id] = factories[id]();
    const view = views[id]!;
    if (currentId !== id) {
      viewHost.innerHTML = '';
      viewHost.appendChild(view.root);
      currentId = id;
      view.onShow?.();
    } else {
      view.update?.();
    }
    app.querySelectorAll<HTMLButtonElement>('.tab').forEach((t) =>
      t.classList.toggle('active', t.dataset.view === id),
    );
  }

  app.querySelectorAll<HTMLButtonElement>('.tab').forEach((t) =>
    t.addEventListener('click', () => store.set({ view: t.dataset.view as ViewId })),
  );
  app.querySelector('#about-btn')!.addEventListener('click', () => openAbout(data));

  // Global search → autocomplete
  const searchInput = app.querySelector<HTMLInputElement>('#global-search')!;
  const searchResults = app.querySelector<HTMLDivElement>('#search-results')!;
  function renderSearch(q: string) {
    const term = q.trim().toLowerCase();
    if (!term) {
      searchResults.hidden = true;
      return;
    }
    const matches = data.products
      .filter((p) => `${p.product} ${p.fund} ${p.licensee}`.toLowerCase().includes(term))
      .slice(0, 8);
    if (!matches.length) {
      searchResults.innerHTML = `<div class="sr-empty">No matching products</div>`;
      searchResults.hidden = false;
      return;
    }
    searchResults.innerHTML = matches
      .map(
        (p) =>
          `<button class="sr-item" data-id="${p.id}"><span>${p.product}<span class="sr-fund">${p.fund}</span></span><span class="sr-meta">${formatPct(p.nir.y10)}</span></button>`,
      )
      .join('');
    searchResults.hidden = false;
    searchResults.querySelectorAll<HTMLButtonElement>('.sr-item').forEach((b) =>
      b.addEventListener('click', () => {
        ctx.openDetail(b.dataset.id!);
        searchInput.value = '';
        searchResults.hidden = true;
      }),
    );
  }
  searchInput.addEventListener('input', debounce((e: Event) => renderSearch((e.target as HTMLInputElement).value), 200));
  searchInput.addEventListener('focus', () => renderSearch(searchInput.value));
  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.header-search')) searchResults.hidden = true;
  });

  store.subscribe((f) => showView(f.view));
  window.addEventListener('hashchange', () => {
    store.readHash();
    showView(store.filters.view);
    if (store.filters.selectedId && detailPanel.hidden) ctx.openDetail(store.filters.selectedId);
  });

  initGlossary(document.body);
  initTooltip();
  showView(store.filters.view);
  if (store.filters.selectedId) ctx.openDetail(store.filters.selectedId);
}

boot();
