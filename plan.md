# Site Plan: Super Funds

## Overview
- **Name:** Super Funds
- **Repo name:** au-super
- **Tagline:** Compare every MySuper default super option — returns, fees, and how it fared in APRA's performance test.

### Naming Convention
Plain topic name "Super Funds"; country AU lives in the index entry's `country` field.

## Target Audience
Ordinary Australian workers who have a default (MySuper) super fund and want to know, in plain
English, whether theirs is any good — competitive long-run returns, reasonable fees, and whether
it passed the government's annual performance test. Also useful to finance journalists, advisers,
and anyone choosing where to consolidate.

## Value Proposition
Everyone with a job in Australia has super, but the official comparison data (APRA's Comprehensive
Product Performance Package) ships as a dense 40-column spreadsheet nobody reads. This turns it into
a fast, searchable comparison: rank funds by 10-year net return, see fees at your actual balance,
compare the fees-vs-returns trade-off on one chart, and drill into any product. All 52 MySuper
products in one place, updated when APRA publishes.

## Data Sources
| Source | URL | What it provides | Update frequency | Auth required? |
|--------|-----|-------------------|-----------------|----------------|
| APRA MySuper CPPP (Comprehensive Product Performance) | https://www.apra.gov.au/mysuper-product-performance | Every MySuper product: net investment returns (3/5/7/10yr), fees at $10k–$250k, performance-test result & margin, member assets & accounts, growth allocation, lifecycle stages | Annual (Jan) | No |
| APRA Annual superannuation performance test | https://www.apra.gov.au/2025-annual-superannuation-performance-test-mysuper-products | Pass/fail context for the CPPP test column | Annual (Aug) | No |

## Key Features
1. **Explorer** — searchable, sortable table of all 52 MySuper products with return, fee, assets, test result.
2. **Rankings** — horizontal-bar leaderboard, toggle metric (10yr return, 5yr return, fee at $50k, margin over benchmark).
3. **Fees vs Returns** — scatter plot (the flagship): does paying more get you more? Zoom/pan, hover for exact figures.
4. **Fee Heatmap** — matrix of products × balance tiers ($10k→$250k) showing how total fees scale.
5. **Trustees** — squarified treemap of member assets, grouped licensee → product.
6. **Distribution** — histogram of returns and fees across the sector with median markers.
7. **Insights** — auto-detected findings (best/worst returns, cheapest/priciest, biggest margin over benchmark, fee outliers).
8. **Per-product drill-down** — hash-linkable panel: all lookback returns, fee ladder, lifecycle glide-path stages, test detail, comparison to sector median.

## Target Audience (detailed)
Working-age Australians, mixed tech-literacy, often on mobile, mildly anxious about money and
bored by super jargon. They want a quick, trustworthy read on "is my fund ok?" without a login or a
sales pitch. Secondary: desktop users (journalists/advisers) doing side-by-side comparison.

## Style Direction
**Tone:** calm, trustworthy, civic-financial — like a good government money portal, not a broker ad.
**Colour palette:** deep navy header, professional trust-blue accent, emerald/red reserved strictly
for good/bad (pass margin, above/below-median). Light background, generous whitespace.
**UI density:** balanced — dense enough for a comparison table, airy enough for a nervous first-timer.
**Dark/light theme:** light (consumer/civic finance).
**Reference sites for tone:** ATO YourSuper comparison tool, moneysmart.gov.au.

## Technical Architecture
- **Stack:** Vanilla TypeScript + Vite.
- **Data strategy:** pipeline — annual cron (`'23 6 8 2 *'`, 8 Feb) because APRA publishes the CPPP
  once a year in January. Monthly would be pointless; annual matches the source cadence exactly.
- **Key libraries:** none beyond Vite/Vitest. All charts hand-rolled SVG; treemap/tooltip/zoom from `patterns/`.

## Layout
Fixed navy header (brand + search + About). Summary strip of sector KPIs. Sticky word-only tab bar.
Max-width 1600px content. Right-hand slide-in detail panel. Sticky footer with attribution.
Below 820px: panels stack, table scrolls horizontally, search collapses.

## Pages/Views
Single page, seven tab views (above) + slide-in product detail. Hash-linkable view + product.

## Visualization Strategy
- **Explorer table** — the finder; answers "where does my fund sit?" Sortable every column, filter by test result / lifecycle / category.
- **Rankings bars** — answers "who's best/worst on X?" Colour-coded vs median; metric toggle.
- **Fees vs Returns scatter** — answers "am I paying for performance?" Each dot a product, x=fee@$50k, y=10yr return, size=assets, colour=pass margin. Quadrant guides (cheap+high = ideal). The single most decision-useful view.
- **Fee heatmap** — answers "does my fund get cheaper as my balance grows?" Product × 5 balance tiers.
- **Trustees treemap** — answers "who runs the money?" Assets by licensee, nested products; click to drill.
- **Distribution histogram** — answers "is my fund normal or an outlier?" Return & fee spread with median line.
- **Insights** — surfaces the outliers automatically so users don't have to hunt.

Not geographic (super funds have no location) so no map — deliberately omitted.
