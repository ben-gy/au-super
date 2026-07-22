// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { Dataset } from './types';
import { formatMoney, relativeTime } from './format';
import { glossaryLink } from './glossary';

export function openAbout(data: Dataset) {
  const existing = document.querySelector('.modal-backdrop');
  if (existing) existing.remove();

  const { meta } = data;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="About this site">
      <button class="modal-close" aria-label="Close">×</button>
      <h2>About Super Funds</h2>
      <p>This site compares every Australian <strong>${glossaryLink('mysuper', 'MySuper')}</strong> product — the simple, low-cost default option your super sits in if you never chose one yourself. It turns APRA's dense annual spreadsheet into a fast, plain-English comparison of returns, fees and the government's performance test.</p>

      <h3>What the data shows</h3>
      <p>For each of the ${meta.productCount} MySuper products (run by ${meta.trusteeCount} trustees, holding ${formatMoney(meta.totalAssets)} of members' money as at ${meta.asAt}) you get: ${glossaryLink('net-investment-return', 'net investment returns')} over 3, 5, 7 and 10 years; ${glossaryLink('total-fees', 'total fees')} at five balance sizes; the ${glossaryLink('performance-test', 'performance-test')} result and margin; ${glossaryLink('growth-allocation', 'growth allocation')}; and member assets and accounts.</p>

      <h3>How to read it</h3>
      <ul>
        <li><strong>Explorer</strong> — sort and search every product.</li>
        <li><strong>Rankings</strong> — league table by return, fee or benchmark margin.</li>
        <li><strong>Fees vs returns</strong> — the key trade-off on one chart; the top-left is the sweet spot.</li>
        <li><strong>Fee heatmap</strong> — how each product's fees change with your balance.</li>
        <li><strong>Trustees</strong> — where the money actually sits.</li>
        <li><strong>Distribution</strong> — whether a fund is normal or an outlier.</li>
        <li><strong>Insights</strong> — the standouts, computed automatically.</li>
      </ul>

      <h3>A note on lifecycle products</h3>
      <p>${glossaryLink('lifecycle', 'Lifecycle')} products change your investment mix as you age, so a single headline number can't describe them fully. Here, headline returns and fees use the <strong>accumulation stage</strong> (the higher-growth mix most working-age members are in); every age stage is listed in the product's detail panel.</p>

      <h3>Caveats</h3>
      <ul>
        <li>Past returns are no guarantee of future returns. A high 10-year figure reflects the last decade, not the next.</li>
        <li>Higher returns usually come with higher ${glossaryLink('growth-allocation', 'growth')} and bigger short-term swings — compare like with like.</li>
        <li>This is general information, not financial advice. It doesn't consider your circumstances, insurance inside super, or tax.</li>
        <li>In ${meta.testYear} every MySuper product passed the performance test; "Pass*" means a product lacked the full history to be assessed.</li>
      </ul>

      <h3>Source</h3>
      <ul>
        <li><a href="${meta.source.cpppUrl}" target="_blank" rel="noopener">${meta.source.cppp}</a></li>
        <li><a href="${meta.source.testUrl}" target="_blank" rel="noopener">APRA annual superannuation performance test ${meta.testYear}</a></li>
      </ul>
      <p class="modal-foot">Data as at ${meta.asAt}, generated ${relativeTime(meta.generatedAt)}. Refreshed automatically after APRA's annual January release.</p>
    </div>`;

  const close = () => backdrop.remove();
  backdrop.querySelector('.modal-close')!.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', esc);
    }
  });
  document.body.appendChild(backdrop);
}
