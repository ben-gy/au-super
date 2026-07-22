// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Fetch the APRA MySuper Comprehensive Product Performance Package (CPPP) CSV.
//
// Source cadence: ANNUAL (published each January). We first scrape the landing
// page for the current CSV link so the pipeline survives the yearly URL change
// (APRA embeds the publication month in the path). If that fails we fall back to
// the last-known direct URL. Either way the raw CSV lands in pipeline/raw/.

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(__dirname, 'raw');

const LANDING = 'https://www.apra.gov.au/mysuper-product-performance';
const FALLBACK_CSV =
  'https://www.apra.gov.au/system/files/2026-01/2025%20CPPP%20publication%20-%20MySuper_CPPP.csv';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,text/csv,*/*' } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

async function discoverCsvUrl() {
  try {
    const html = await fetchText(LANDING);
    // Find hrefs to a MySuper_CPPP CSV in /system/files/...
    const re = /href="([^"]*MySuper_CPPP[^"]*\.csv)"/gi;
    const hits = [];
    let m;
    while ((m = re.exec(html)) !== null) hits.push(m[1]);
    if (hits.length) {
      // Prefer the newest by the YYYY-MM segment in the path.
      hits.sort();
      const best = hits[hits.length - 1];
      const abs = best.startsWith('http') ? best : `https://www.apra.gov.au${best}`;
      console.log(`Discovered CSV: ${abs}`);
      return abs;
    }
    console.warn('No CSV link found on landing page; using fallback.');
  } catch (err) {
    console.warn(`Landing-page scrape failed (${err.message}); using fallback.`);
  }
  return FALLBACK_CSV;
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true });
  const url = await discoverCsvUrl();
  const csv = await fetchText(url);
  if (!csv.includes('mysuper_product_name')) {
    throw new Error('Downloaded file does not look like the MySuper CPPP CSV.');
  }
  await writeFile(join(RAW_DIR, 'mysuper.csv'), csv, 'utf8');
  await writeFile(join(RAW_DIR, 'source.json'), JSON.stringify({ url, fetchedAt: new Date().toISOString() }, null, 2));
  const rows = csv.trim().split('\n').length - 1;
  console.log(`Saved mysuper.csv (${rows} data rows) from ${url}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
