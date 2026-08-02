# Super Funds — Build Review

This file exists only to create a reviewable PR. All code is already deployed on `main`.

**Merge this PR to acknowledge the build.** Closing without merging is also fine.

## Links

- **GitHub Pages:** https://ben-gy.github.io/au-super/ *(redirects to custom domain once DNS is set)*
- **Custom domain:** https://au-super.benrichardson.dev

## What it is

Compares every Australian MySuper default super product (52 products, 37 trustees, $1.21tn of
member assets) from APRA's Comprehensive Product Performance Package: 10-year net returns, fees at
five balance sizes, the annual performance-test result and margin, growth allocation and member
numbers. Seven interactive views (Explorer, Rankings, Fees-vs-Returns scatter, Fee Heatmap,
Trustees treemap, Distribution, Insights) plus a hash-linkable per-product drill-down and a full
glossary.

## DNS setup (already applied)

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `au-super` | `ben-gy.github.io` | DNS only (grey cloud) |

If the TLS cert needs re-triggering:
```bash
gh api repos/ben-gy/au-super/pages -X PUT -f cname=""
sleep 3
gh api repos/ben-gy/au-super/pages -X PUT -f cname="au-super.benrichardson.dev"
```
