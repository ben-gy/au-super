import type { AppContext, View } from '../context';
import { filteredProducts } from '../context';
import type { Product } from '../types';
import { renderFilterBar } from '../filters';
import { passColor } from '../data';
import { categoryLabel, feeDollars, formatMoney, formatNumber, formatPct } from '../format';
import { glossaryLink } from '../glossary';

type SortKey = 'product' | 'nir10' | 'nir5' | 'fee' | 'growth' | 'assets' | 'accounts' | 'margin';

interface Column {
  key: SortKey;
  label: string;
  tip?: string;
  align: 'left' | 'right';
  get: (p: Product) => number | string | null;
}

const COLUMNS: Column[] = [
  { key: 'product', label: 'Product', align: 'left', get: (p) => p.product },
  { key: 'nir10', label: '10yr return', tip: 'Net investment return per year over 10 years', align: 'right', get: (p) => p.nir.y10 },
  { key: 'nir5', label: '5yr return', tip: 'Net investment return per year over 5 years', align: 'right', get: (p) => p.nir.y5 },
  { key: 'fee', label: 'Fee ($50k)', tip: 'Total annual fees & costs on a $50,000 balance', align: 'right', get: (p) => p.totalFee50k },
  { key: 'margin', label: 'vs benchmark', tip: 'Net return above the performance-test benchmark, per year', align: 'right', get: (p) => p.margin },
  { key: 'growth', label: 'Growth', tip: 'Share invested in growth assets (shares, property)', align: 'right', get: (p) => p.growth },
  { key: 'assets', label: 'Assets', tip: 'Total member money in the product', align: 'right', get: (p) => p.assets },
  { key: 'accounts', label: 'Members', tip: 'Number of member accounts', align: 'right', get: (p) => p.accounts },
];

export function createExplorerView(ctx: AppContext): View {
  const root = document.createElement('div');
  root.className = 'view';
  let sortKey: SortKey = 'assets';
  let sortDir: 'asc' | 'desc' = 'desc';
  let query = '';

  function sorted(list: Product[]): Product[] {
    const col = COLUMNS.find((c) => c.key === sortKey)!;
    return [...list].sort((a, b) => {
      const av = col.get(a);
      const bv = col.get(b);
      if (typeof av === 'string' || typeof bv === 'string') {
        const cmp = String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? cmp : -cmp;
      }
      const an = av == null ? -Infinity : av;
      const bn = bv == null ? -Infinity : bv;
      return sortDir === 'asc' ? an - bn : bn - an;
    });
  }

  function render() {
    const medians = ctx.data.meta.medians;

    root.innerHTML = '';
    const panelHead = document.createElement('div');
    panelHead.className = 'panel-head';
    panelHead.innerHTML = `
      <h2>Compare every MySuper product</h2>
      <p class="panel-sub">All ${ctx.data.meta.productCount} default super options assessed by APRA, as at ${ctx.data.meta.asAt}. Click any column to sort, or a row for the full breakdown. Returns and fees coloured against the sector ${glossaryLink('median')}.</p>`;
    root.appendChild(panelHead);

    const controls = document.createElement('div');
    controls.className = 'explorer-controls';
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'inp';
    search.placeholder = 'Filter by fund name…';
    search.value = query;
    search.setAttribute('aria-label', 'Filter products by name');
    search.addEventListener('input', () => { query = search.value; renderTable(); });
    controls.appendChild(renderFilterBar(ctx));
    controls.appendChild(search);
    root.appendChild(controls);

    const tableWrap = document.createElement('div');
    root.appendChild(tableWrap);

    function renderTable() {
      let l = filteredProducts(ctx);
      const qq = query.trim().toLowerCase();
      if (qq) l = l.filter((p) => `${p.product} ${p.fund} ${p.licensee}`.toLowerCase().includes(qq));
      const r = sorted(l);
      tableWrap.innerHTML = `
        <div class="table-meta">${r.length} product${r.length === 1 ? '' : 's'}</div>
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr>
              ${COLUMNS.map((c) => `
                <th class="${c.align === 'right' ? 'ta-right' : ''} ${sortKey === c.key ? 'sorted' : ''}" data-key="${c.key}" ${c.tip ? `data-tip="${c.tip}"` : ''}>
                  ${c.label}${sortKey === c.key ? `<span class="sort-caret">${sortDir === 'asc' ? '▲' : '▼'}</span>` : ''}
                </th>`).join('')}
            </tr></thead>
            <tbody>
              ${r.map((p) => rowHtml(p, medians)).join('')}
            </tbody>
          </table>
        </div>`;
      tableWrap.querySelectorAll<HTMLElement>('th[data-key]').forEach((th) =>
        th.addEventListener('click', () => {
          const k = th.dataset.key as SortKey;
          if (sortKey === k) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
          else { sortKey = k; sortDir = k === 'product' ? 'asc' : 'desc'; }
          renderTable();
        }),
      );
      tableWrap.querySelectorAll<HTMLElement>('tbody tr').forEach((tr) =>
        tr.addEventListener('click', () => ctx.openDetail(tr.dataset.id!)),
      );
    }
    renderTable();
  }

  function rowHtml(p: Product, medians: AppContext['data']['meta']['medians']): string {
    const retCls = p.nir.y10 != null && medians.nir10 != null ? (p.nir.y10 >= medians.nir10 ? 'pos' : 'neg') : '';
    const ret5Cls = p.nir.y5 != null && medians.nir5 != null ? (p.nir.y5 >= medians.nir5 ? 'pos' : 'neg') : '';
    const feeCls = p.totalFee50k != null && medians.fee50k != null ? (p.totalFee50k <= medians.fee50k ? 'pos' : 'neg') : '';
    const marginCls = p.margin != null ? (p.margin >= 0 ? 'pos' : 'neg') : '';
    return `
      <tr data-id="${p.id}">
        <td>
          <div class="cell-name">${p.product}</div>
          <div class="cell-sub">${p.fund} · <span class="cat-tag">${categoryLabel(p.category)}</span>${p.isLifecycle ? ' · <span class="cat-tag">Lifecycle</span>' : ''}
            <span class="pill xs" style="background:${passColor(p.passFail)}">${p.passFail || '—'}</span>
          </div>
        </td>
        <td class="ta-right mono ${retCls}">${formatPct(p.nir.y10)}</td>
        <td class="ta-right mono ${ret5Cls}">${formatPct(p.nir.y5)}</td>
        <td class="ta-right mono ${feeCls}" data-tip="${feeDollars(p.totalFee50k, 50000)} a year on $50k">${formatPct(p.totalFee50k)}</td>
        <td class="ta-right mono ${marginCls}">${p.margin == null ? '—' : (p.margin > 0 ? '+' : '') + formatPct(p.margin)}</td>
        <td class="ta-right mono">${p.growth == null ? '—' : Math.round(p.growth * 100) + '%'}</td>
        <td class="ta-right mono" data-tip="${formatNumber(p.assets)}">${formatMoney(p.assets)}</td>
        <td class="ta-right mono">${formatNumber(p.accounts)}</td>
      </tr>`;
  }

  render();
  return { root, update: render };
}
