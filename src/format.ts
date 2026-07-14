// Pure formatting helpers. Fully unit-tested.

export function formatNumber(n: number | null | undefined, decimals = 0): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('en-AU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// A fraction (0.0795) rendered as a percentage ("7.95%").
export function formatPct(frac: number | null | undefined, decimals = 2): string {
  if (frac == null || !Number.isFinite(frac)) return '—';
  return `${(frac * 100).toFixed(decimals)}%`;
}

export function formatSignedPct(frac: number | null | undefined, decimals = 2): string {
  if (frac == null || !Number.isFinite(frac)) return '—';
  const sign = frac > 0 ? '+' : '';
  return `${sign}${(frac * 100).toFixed(decimals)}%`;
}

// Compact dollars: 1_206_928_909_000 -> "$1.21tn", 239_034_124_000 -> "$239.0bn".
export function formatMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}tn`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}bn`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}m`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

// Fee fraction applied to a balance, as annual dollars: 0.0071 @ $50k -> "$355".
export function feeDollars(frac: number | null | undefined, balance: number): string {
  if (frac == null || !Number.isFinite(frac)) return '—';
  return `$${Math.round(frac * balance).toLocaleString('en-AU')}`;
}

export function relativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return 'unknown';
  const diff = now - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mon = Math.round(day / 30);
  if (mon < 12) return `${mon}mo ago`;
  return `${Math.round(mon / 12)}y ago`;
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// Short label for a product category code.
export function categoryLabel(cat: string): string {
  switch (cat) {
    case 'Generic': return 'Generic';
    case 'MySuper Large Employer': return 'Large employer';
    case 'MySuper Material Goodwill': return 'Material goodwill';
    default: return cat;
  }
}
