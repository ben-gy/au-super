// Parse the APRA MySuper CPPP CSV into a clean product-level dataset.
//
// Shape of the source: one MySuper *product* per group of rows.
//  - Single-strategy products: a single row carrying everything.
//  - Lifecycle products: a header row (member assets/accounts, pass/fail, test
//    margin — but blank returns/fees) followed by one row per age stage (blank
//    assets, but real returns/fees for that stage).
// For a lifecycle product's headline figures we use the ACCUMULATION stage (the
// highest growth-asset allocation) — what a typical working-age member actually
// experiences for most of their life — and expose every stage in the drill-down.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW = join(__dirname, 'raw', 'mysuper.csv');
const OUT_DIR = join(__dirname, '..', 'public', 'data');

// ── CSV parsing (RFC-4180-ish: handles quoted fields with embedded commas) ──
function parseCsv(text) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

const num = (v) => {
  if (v == null) return null;
  const t = String(v).trim();
  if (t === '' || t === '-' || t === 'n/a' || t.toLowerCase() === 'na') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function main() {
  return readFile(RAW, 'utf8').then((text) => {
    const rows = parseCsv(text);
    const header = rows[0].map((h) => h.trim());
    const idx = Object.fromEntries(header.map((h, i) => [h, i]));
    const col = (r, name) => r[idx[name]];

    const records = rows.slice(1).map((r) => ({
      licensee: (col(r, 'rse_licensee') || '').trim(),
      fund: (col(r, 'rse_name') || '').trim(),
      publicOffer: (col(r, 'public_offer_status') || '').trim(),
      product: (col(r, 'mysuper_product_name') || '').trim(),
      category: (col(r, 'product_category') || '').trim(),
      strategy: (col(r, 'single_strategy_lifecycle_indicator') || '').trim(),
      stageName: (col(r, 'lifecycle_stage_name') || '').trim(),
      assets000: num(col(r, 'member_assets_000')),
      proportion: num(col(r, 'proportion_of_total_assets_in_mysuper')),
      accounts: num(col(r, 'member_accounts')),
      growth: num(col(r, 'strategic_growth_asset_allocation')),
      testMeasure: num(col(r, 'performance_test_measure')),
      passFail: (col(r, 'pass_fail_indicator') || '').trim(),
      lookback: num(col(r, 'lookback_period_years')),
      margin: num(col(r, 'actual_return_minus_benchmark_return')),
      rafe: num(col(r, 'representative_administration_fees_and_expenses_rafe')),
      brafe: num(col(r, 'relevant_benchmark_representative_administration_fees_and_expenses_brafe')),
      nir10: num(col(r, '10_year_net_investment_return_nir_p_a')),
      nir7: num(col(r, '7_year_net_investment_return_nir_p_a')),
      nir5: num(col(r, '5_year_net_investment_return_nir_p_a')),
      nir3: num(col(r, '3_year_net_investment_return_nir_p_a')),
      relSaa10: num(col(r, '10_year_nir_relative_to_saa_benchmark_portfolio_p_a')),
      relSrp10: num(col(r, '10_year_nir_relative_to_simple_reference_portfolio_p_a')),
      net10: num(col(r, '10_year_net_return_50_000_rep_member_p_a')),
      net7: num(col(r, '7_year_net_return_50_000_rep_member_p_a')),
      net5: num(col(r, '5_year_net_return_50_000_rep_member_p_a')),
      net3: num(col(r, '3_year_net_return_50_000_rep_member_p_a')),
      admin: {
        k10: num(col(r, 'administration_fees_and_costs_charged_10_000_account_balance')),
        k25: num(col(r, 'administration_fees_and_costs_charged_25_000_account_balance')),
        k50: num(col(r, 'administration_fees_and_costs_charged_50_000_account_balance')),
        k100: num(col(r, 'administration_fees_and_costs_charged_100_000_account_balance')),
        k250: num(col(r, 'administration_fees_and_costs_charged_250_000_account_balance')),
      },
      total: {
        k10: num(col(r, 'total_fees_and_costs_charged_10_000_account_balance')),
        k25: num(col(r, 'total_fees_and_costs_charged_25_000_account_balance')),
        k50: num(col(r, 'total_fees_and_costs_charged_50_000_account_balance')),
        k100: num(col(r, 'total_fees_and_costs_charged_100_000_account_balance')),
        k250: num(col(r, 'total_fees_and_costs_charged_250_000_account_balance')),
      },
    }));

    // Group into products by licensee + product + category.
    const groups = new Map();
    for (const rec of records) {
      const key = `${rec.licensee}||${rec.fund}||${rec.product}||${rec.category}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(rec);
    }

    const products = [];
    for (const [, recs] of groups) {
      const isLifecycle = recs.some((r) => r.strategy === 'Lifecycle');
      // Header row: the one carrying member assets (product-level totals).
      const head = recs.find((r) => r.assets000 != null) || recs[0];
      // Stage rows: those with a stage name (lifecycle) or the single row.
      const stageRows = isLifecycle
        ? recs.filter((r) => r.stageName !== '')
        : [head];
      // Representative = accumulation stage (highest growth allocation).
      let rep = stageRows[0];
      for (const s of stageRows) {
        if ((s.growth ?? -1) > (rep.growth ?? -1)) rep = s;
      }
      const first = recs[0];
      const stages = isLifecycle
        ? stageRows
            .map((s) => ({
              name: s.stageName,
              growth: s.growth,
              nir10: s.nir10,
              nir5: s.nir5,
              fee50k: s.total.k50,
              net10: s.net10,
            }))
            .sort((a, b) => (b.growth ?? 0) - (a.growth ?? 0))
        : null;

      products.push({
        id: slugify(`${first.licensee}-${first.product}-${first.category}`),
        licensee: first.licensee,
        fund: first.fund,
        product: first.product,
        category: first.category,
        publicOffer: /public offer/i.test(first.publicOffer) && !/non/i.test(first.publicOffer),
        isLifecycle,
        assets: head.assets000 != null ? Math.round(head.assets000 * 1000) : null,
        accounts: head.accounts,
        proportion: head.proportion,
        passFail: head.passFail || rep.passFail || '',
        testMeasure: head.testMeasure ?? rep.testMeasure,
        margin: head.margin ?? rep.margin,
        lookback: head.lookback ?? rep.lookback,
        rafe: head.rafe ?? rep.rafe,
        brafe: head.brafe ?? rep.brafe,
        growth: rep.growth ?? head.growth,
        nir: { y10: rep.nir10, y7: rep.nir7, y5: rep.nir5, y3: rep.nir3 },
        relSaa10: rep.relSaa10,
        relSrp10: rep.relSrp10,
        net: { y10: rep.net10, y7: rep.net7, y5: rep.net5, y3: rep.net3 },
        adminFee50k: rep.admin.k50,
        totalFee50k: rep.total.k50,
        fees: { admin: rep.admin, total: rep.total },
        stages,
      });
    }

    products.sort((a, b) => (b.assets ?? 0) - (a.assets ?? 0));

    const median = (vals) => {
      const s = vals.filter((v) => v != null && Number.isFinite(v)).sort((a, b) => a - b);
      if (!s.length) return null;
      const m = Math.floor(s.length / 2);
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    };

    const meta = {
      generatedAt: new Date().toISOString(),
      asAt: '30 June 2025',
      testYear: 2025,
      source: {
        cppp: 'APRA MySuper Comprehensive Product Performance Package',
        cpppUrl: 'https://www.apra.gov.au/mysuper-product-performance',
        testUrl: 'https://www.apra.gov.au/2025-annual-superannuation-performance-test-mysuper-products',
      },
      productCount: products.length,
      trusteeCount: new Set(products.map((p) => p.licensee)).size,
      totalAssets: products.reduce((s, p) => s + (p.assets ?? 0), 0),
      totalAccounts: products.reduce((s, p) => s + (p.accounts ?? 0), 0),
      passCount: products.filter((p) => p.passFail === 'Pass').length,
      passStarCount: products.filter((p) => p.passFail === 'Pass*').length,
      failCount: products.filter((p) => /^fail/i.test(p.passFail)).length,
      lifecycleCount: products.filter((p) => p.isLifecycle).length,
      medians: {
        nir10: median(products.map((p) => p.nir.y10)),
        nir5: median(products.map((p) => p.nir.y5)),
        fee50k: median(products.map((p) => p.totalFee50k)),
        growth: median(products.map((p) => p.growth)),
        margin: median(products.map((p) => p.margin)),
      },
    };

    return mkdir(OUT_DIR, { recursive: true })
      .then(() => writeFile(join(OUT_DIR, 'products.json'), JSON.stringify(products)))
      .then(() => writeFile(join(OUT_DIR, 'meta.json'), JSON.stringify(meta, null, 2)))
      .then(() => {
        console.log(
          `Wrote ${products.length} products (${meta.trusteeCount} trustees, ` +
            `$${(meta.totalAssets / 1e9).toFixed(0)}bn, ${meta.passCount} Pass / ` +
            `${meta.passStarCount} Pass* / ${meta.failCount} Fail).`,
        );
      });
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
