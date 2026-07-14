import type { AppContext, View } from '../context';
import { buildInsights } from '../analysis';

export function createInsightsView(ctx: AppContext): View {
  const root = document.createElement('div');
  root.className = 'view';

  function render() {
    const insights = buildInsights(ctx.data.products, ctx.data.meta);
    root.innerHTML = `
      <div class="panel-head">
        <h2>Insights</h2>
        <p class="panel-sub">The standout findings, computed automatically from APRA's ${ctx.data.meta.testYear} data. Click any product to open its full breakdown.</p>
      </div>
      <div class="insight-grid">
        ${insights
          .map(
            (ins) => `
          <div class="insight-card sev-${ins.severity}">
            <div class="insight-head"><span class="insight-icon">${ins.icon}</span><h3>${ins.title}</h3></div>
            <div class="insight-detail">${ins.detail}</div>
            <ol class="insight-list">
              ${ins.items
                .map(
                  (it) => `<li data-id="${it.id}">
                    <span class="ins-rank"></span>
                    <span class="ins-name">${it.name}${it.sub ? `<span class="ins-sub">${it.sub}</span>` : ''}</span>
                    <span class="ins-val">${it.value}</span>
                  </li>`,
                )
                .join('')}
            </ol>
          </div>`,
          )
          .join('')}
      </div>`;

    root.querySelectorAll<HTMLElement>('.insight-list li').forEach((li) =>
      li.addEventListener('click', () => ctx.openDetail(li.dataset.id!)),
    );
  }

  render();
  return { root, update: render };
}
