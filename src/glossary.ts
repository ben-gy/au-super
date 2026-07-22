// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Domain glossary + click-to-reveal tooltip wiring.
// Any element with `data-term="..."` becomes a dotted, clickable glossary link.

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  mysuper: {
    term: 'MySuper',
    definition:
      'The simple, low-cost default super product that a fund must offer. If you have never chosen an investment option, your money sits in your employer\'s default MySuper product. Every MySuper product is what this site compares.',
  },
  'net-investment-return': {
    term: 'Net investment return (NIR)',
    definition:
      'The investment return earned after investment fees and taxes are taken out, but before administration fees. It is the cleanest way to compare how well a fund invests. Shown here as an average per year over the period.',
  },
  'net-return': {
    term: 'Net return to a $50k member',
    definition:
      'The return a representative member with a $50,000 balance would actually have kept each year, after both investment AND administration fees. Lower than the net investment return because it also subtracts the flat admin fee.',
  },
  'total-fees': {
    term: 'Total fees & costs',
    definition:
      'Everything the fund charges in a year — administration fees, investment fees and transaction costs combined — for a given account balance. APRA reports it at $10k, $25k, $50k, $100k and $250k because the percentage changes with balance.',
  },
  'admin-fees': {
    term: 'Administration fees',
    definition:
      'The fees charged just to run your account (record-keeping, member services), separate from the cost of investing. Often includes a flat dollar amount, so they bite hardest on small balances.',
  },
  'performance-test': {
    term: 'Annual performance test',
    definition:
      'A pass/fail test APRA runs each year. It compares a product\'s net returns against a tailored benchmark built from its own investment mix. Fail two years running and the fund must write to members and stop taking new ones. In 2025 every MySuper product passed.',
  },
  margin: {
    term: 'Margin over benchmark',
    definition:
      'How far a product\'s actual net return beat (or trailed) the benchmark APRA built for it, per year over the test period. A bigger positive margin means the fund added more value than its investment mix alone would predict.',
  },
  benchmark: {
    term: 'SAA benchmark',
    definition:
      'A "strategic asset allocation" benchmark: the return you would have got by passively investing in index markets using the fund\'s own target mix of shares, property, bonds and so on. Beating it shows genuine skill (or luck); trailing it flags a problem.',
  },
  lifecycle: {
    term: 'Lifecycle product',
    definition:
      'A MySuper product that automatically shifts you from higher-growth investments when you are young to safer ones as you near retirement. Because the mix changes with age, headline figures here use the accumulation (younger, higher-growth) stage — the one most working members are in.',
  },
  'single-strategy': {
    term: 'Single-strategy product',
    definition:
      'A MySuper product that uses the same investment mix for every member regardless of age (typically a balanced or growth option). The opposite of a lifecycle product.',
  },
  'growth-allocation': {
    term: 'Growth allocation',
    definition:
      'The share of the portfolio invested in growth assets — shares, property, infrastructure — rather than defensive assets like cash and bonds. Higher growth means higher expected returns but bigger ups and downs.',
  },
  trustee: {
    term: 'Trustee (RSE licensee)',
    definition:
      'The company legally responsible for running a super fund and acting in members\' interests. One trustee can operate several funds and MySuper products.',
  },
  'member-assets': {
    term: 'Member assets',
    definition:
      'The total pool of members\' money invested in a MySuper product, as at 30 June. A rough proxy for how large and popular the product is.',
  },
  'public-offer': {
    term: 'Public offer',
    definition:
      'A product anyone can join. Non-public-offer products are usually restricted to employees of a particular company or industry and cannot be chosen by the general public.',
  },
  median: {
    term: 'Median',
    definition:
      'The middle value when every product is ranked. Half of products sit above it and half below. Less distorted by extreme outliers than a simple average.',
  },
};

let tooltipEl: HTMLDivElement | null = null;

function ensureTooltip(): HTMLDivElement {
  if (tooltipEl) return tooltipEl;
  const el = document.createElement('div');
  el.className = 'glossary-tooltip';
  el.setAttribute('role', 'tooltip');
  el.hidden = true;
  document.body.appendChild(el);
  tooltipEl = el;
  return el;
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.hidden = true;
}

function showTooltip(target: HTMLElement, key: string) {
  const entry = GLOSSARY[key];
  if (!entry) return;
  const tip = ensureTooltip();
  tip.innerHTML = `<strong>${entry.term}</strong><span>${entry.definition}</span>`;
  tip.hidden = false;
  const rect = target.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();
  let left = rect.left + window.scrollX;
  const maxLeft = window.scrollX + document.documentElement.clientWidth - tipRect.width - 12;
  if (left > maxLeft) left = maxLeft;
  if (left < window.scrollX + 8) left = window.scrollX + 8;
  let top = rect.bottom + window.scrollY + 6;
  if (rect.bottom + tipRect.height + 12 > document.documentElement.clientHeight) {
    top = rect.top + window.scrollY - tipRect.height - 6;
  }
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

export function glossaryLink(key: string, label?: string): string {
  const entry = GLOSSARY[key];
  const text = label ?? entry?.term ?? key;
  return `<span class="glossary-link" data-term="${key}" tabindex="0" role="button" aria-label="Definition of ${entry?.term ?? key}">${text}<span class="gloss-icon" aria-hidden="true">ⓘ</span></span>`;
}

export function initGlossary(root: HTMLElement = document.body) {
  root.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('.glossary-link') as HTMLElement | null;
    if (target) {
      e.stopPropagation();
      const key = target.dataset.term!;
      if (!tooltipEl?.hidden && tooltipEl?.dataset.key === key) {
        hideTooltip();
      } else {
        showTooltip(target, key);
        if (tooltipEl) tooltipEl.dataset.key = key;
      }
      return;
    }
    if (tooltipEl && !tooltipEl.hidden && !(e.target as HTMLElement).closest('.glossary-tooltip')) {
      hideTooltip();
    }
  });
  root.addEventListener('keydown', (e) => {
    const ke = e as KeyboardEvent;
    if (ke.key === 'Escape') hideTooltip();
    if ((ke.key === 'Enter' || ke.key === ' ') && (ke.target as HTMLElement).classList?.contains('glossary-link')) {
      ke.preventDefault();
      showTooltip(ke.target as HTMLElement, (ke.target as HTMLElement).dataset.term!);
    }
  });
  window.addEventListener('scroll', hideTooltip, { passive: true });
  window.addEventListener('resize', hideTooltip);
}
