// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
export type ViewId =
  | 'explorer'
  | 'rankings'
  | 'scatter'
  | 'fees'
  | 'trustees'
  | 'distribution'
  | 'insights';

export interface FeeLadder {
  k10: number | null;
  k25: number | null;
  k50: number | null;
  k100: number | null;
  k250: number | null;
}

export interface LifecycleStage {
  name: string;
  growth: number | null;
  nir10: number | null;
  nir5: number | null;
  fee50k: number | null;
  net10: number | null;
}

export interface Product {
  id: string;
  licensee: string;
  fund: string;
  product: string;
  category: string;
  publicOffer: boolean;
  isLifecycle: boolean;
  assets: number | null; // dollars
  accounts: number | null;
  proportion: number | null;
  passFail: string; // 'Pass' | 'Pass*' | 'Fail'
  testMeasure: number | null;
  margin: number | null; // actual minus benchmark over the lookback (fraction p.a.)
  lookback: number | null;
  rafe: number | null;
  brafe: number | null;
  growth: number | null; // 0..1
  nir: { y10: number | null; y7: number | null; y5: number | null; y3: number | null };
  relSaa10: number | null;
  relSrp10: number | null;
  net: { y10: number | null; y7: number | null; y5: number | null; y3: number | null };
  adminFee50k: number | null;
  totalFee50k: number | null;
  fees: { admin: FeeLadder; total: FeeLadder };
  stages: LifecycleStage[] | null;
}

export interface Meta {
  generatedAt: string;
  asAt: string;
  testYear: number;
  source: { cppp: string; cpppUrl: string; testUrl: string };
  productCount: number;
  trusteeCount: number;
  totalAssets: number;
  totalAccounts: number;
  passCount: number;
  passStarCount: number;
  failCount: number;
  lifecycleCount: number;
  medians: {
    nir10: number | null;
    nir5: number | null;
    fee50k: number | null;
    growth: number | null;
    margin: number | null;
  };
}

export interface Dataset {
  products: Product[];
  meta: Meta;
}
