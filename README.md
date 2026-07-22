# Super Funds

**Compare every Australian MySuper default super option — 10-year net returns, fees at your balance, and the APRA performance test.**

🔗 **Live:** [https://au-super.benrichardson.dev](https://au-super.benrichardson.dev)

## What is this?

Almost every working Australian has superannuation, and if you never chose an investment option
your money sits in your employer's default **MySuper** product. Which one you're in — and how good
it is — matters enormously: a difference of half a percent a year in fees or returns compounds into
tens of thousands of dollars over a working life.

The regulator (APRA) publishes all the numbers you'd need to compare these products, but as a dense
40-column spreadsheet almost nobody reads. This site turns the official APRA Comprehensive Product
Performance Package into a fast, plain-English comparison of all 52 MySuper products: net investment
returns over 3, 5, 7 and 10 years; total fees at five balance sizes; the annual performance-test
result and the margin by which each product beat its benchmark; growth allocation; and member
assets and accounts.

It's general information, not financial advice — but it lets anyone answer "is my default super
fund any good?" in a couple of minutes.

## Who is this for?

Working-age Australians checking whether their default super fund is competitive, people choosing
where to consolidate, and finance journalists or advisers wanting a quick side-by-side. No login,
no sales pitch.

## Data Sources

| Source | What it provides | Update frequency |
|--------|-------------------|-----------------|
| [APRA MySuper CPPP](https://www.apra.gov.au/mysuper-product-performance) | Returns, fees, performance-test result & margin, assets, accounts, growth allocation, lifecycle stages for every MySuper product | Annual (January) |
| [APRA annual superannuation performance test](https://www.apra.gov.au/2025-annual-superannuation-performance-test-mysuper-products) | Pass/fail context for the CPPP test column | Annual (August) |

## Features

- **Explorer** — sortable, searchable table of all 52 MySuper products, coloured against the sector median.
- **Rankings** — league table by 10yr return, 5yr return, fee at $50k, margin over benchmark or assets.
- **Fees vs Returns** — the flagship scatter: each product plotted by fee and return, sized by assets, with the low-fee/high-return sweet spot shaded. Zoom, pan, hover for exact figures.
- **Fee Heatmap** — how each product's fees scale across $10k → $250k balances.
- **Trustees** — squarified treemap of member assets, grouped by trustee.
- **Distribution** — histogram of returns, fees or growth allocation with a median marker.
- **Insights** — automatically surfaced standouts: best/worst returns, cheapest/priciest, biggest benchmark margins, the fee gap in real dollars.
- **Per-product drill-down** — hash-linkable panel with every lookback return, the full fee ladder, lifecycle glide-path stages, performance-test detail and a comparison to the sector median.
- **Glossary** — click-to-explain tooltips for every piece of super jargon, plus an About panel.

## Tech Stack

- **Runtime:** Vanilla TypeScript
- **Build:** Vite 6
- **Testing:** Vitest (40 tests — formatting, insight generation, treemap + zoom layout math)
- **Hosting:** GitHub Pages (static, no backend)
- **Data:** GitHub Actions pipeline — fetches and parses the APRA CPPP CSV into `public/data/`, on an annual cron matching APRA's publication cadence

All charts are hand-rolled SVG (scatter, histogram, bars, treemap) using the factory's shared
`patterns/` building blocks — no charting library.

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Production build
npm run build

# Preview production build
npm run preview

# Refresh the data from APRA
node pipeline/collect.mjs && node pipeline/aggregate.mjs
```

## How it works

`pipeline/collect.mjs` scrapes the APRA MySuper product-performance page for the current CSV (with a
hard-coded fallback), downloads it, and `pipeline/aggregate.mjs` parses it — grouping the raw rows
into 52 products, resolving lifecycle products to their accumulation stage for headline figures
while keeping every age stage for the drill-down, and computing sector medians. The result is
written as static JSON to `public/data/`, which the front-end fetches at load. A yearly GitHub
Actions workflow re-runs the pipeline after APRA's January release.

## license

[GNU Affero General Public License v3.0 or later](./LICENSE), with an attribution
requirement added under section 7(b) — see
[ADDITIONAL-TERMS.md](./ADDITIONAL-TERMS.md).

In short: you may run, modify, redistribute and even sell this, but if you
distribute it — or run a modified version where other people can reach it — you
have to publish your source under the same licence and keep the attribution. A
separate commercial licence without those obligations is available on request:
<hi@ben.gy>.

Third-party components keep their own licences — see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
