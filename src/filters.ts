import type { AppContext } from './context';
import { categoryLabel } from './format';

// A shared filter bar (category / test result / product type) wired to the store.
// Views call renderFilterBar(ctx) and append the returned element; changing a
// control updates the store, which re-renders the active view.
export function renderFilterBar(ctx: AppContext, opts: { showType?: boolean } = {}): HTMLElement {
  const showType = opts.showType ?? true;
  const cats = Array.from(new Set(ctx.data.products.map((p) => p.category))).sort();
  const f = ctx.store.filters;

  const bar = document.createElement('div');
  bar.className = 'filter-bar';
  bar.innerHTML = `
    <div class="control-group">
      <label for="f-cat">Category</label>
      <select class="select" id="f-cat" aria-label="Filter by product category">
        <option value="ALL">All categories</option>
        ${cats.map((c) => `<option value="${c}" ${f.category === c ? 'selected' : ''}>${categoryLabel(c)}</option>`).join('')}
      </select>
    </div>
    <div class="control-group">
      <label for="f-test">Test result</label>
      <select class="select" id="f-test" aria-label="Filter by performance test result">
        <option value="ALL" ${f.testFilter === 'ALL' ? 'selected' : ''}>All results</option>
        <option value="Pass" ${f.testFilter === 'Pass' ? 'selected' : ''}>Pass</option>
        <option value="Pass*" ${f.testFilter === 'Pass*' ? 'selected' : ''}>Pass* (not fully assessed)</option>
      </select>
    </div>
    ${
      showType
        ? `<div class="control-group">
      <label for="f-type">Type</label>
      <select class="select" id="f-type" aria-label="Filter by product type">
        <option value="ALL" ${f.typeFilter === 'ALL' ? 'selected' : ''}>All types</option>
        <option value="single" ${f.typeFilter === 'single' ? 'selected' : ''}>Single strategy</option>
        <option value="lifecycle" ${f.typeFilter === 'lifecycle' ? 'selected' : ''}>Lifecycle</option>
      </select>
    </div>`
        : ''
    }`;

  bar.querySelector<HTMLSelectElement>('#f-cat')!.addEventListener('change', (e) =>
    ctx.store.set({ category: (e.target as HTMLSelectElement).value }),
  );
  bar.querySelector<HTMLSelectElement>('#f-test')!.addEventListener('change', (e) =>
    ctx.store.set({ testFilter: (e.target as HTMLSelectElement).value }),
  );
  const typeSel = bar.querySelector<HTMLSelectElement>('#f-type');
  if (typeSel) typeSel.addEventListener('change', (e) => ctx.store.set({ typeFilter: (e.target as HTMLSelectElement).value }));

  return bar;
}
