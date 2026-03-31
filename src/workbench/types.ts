export type Interval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1w";

export interface CandleRow {
  open_time: number;
  close_time: number;
  open_time_utc: string;
  close_time_utc: string;
  symbol: string;
  interval: Interval;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trade_count: number;
}

export interface CoverageEntry {
  interval: Interval;
  rows: number;
  first_open_time_utc: string;
  last_close_time_utc: string;
}

export interface DatasetDefinition {
  id: string;
  label: string;
  description: string;
  source: string;
  market: string;
  intervals: Interval[];
  defaultInterval: Interval;
  notes: string[];
  metadataPath?: string;
  csvPath: (interval: Interval) => string;
}

export interface DatasetMetaSummary {
  sourceLabel: string;
  displayName: string;
  downloadedAtUtc?: string;
  pairId?: string;
  apiUrl?: string;
  note?: string;
}

export interface DatasetOverview {
  definition: DatasetDefinition;
  coverage: CoverageEntry[];
  meta: DatasetMetaSummary;
}

export interface LoadedDataset {
  definition: DatasetDefinition;
  interval: Interval;
  candles: CandleRow[];
  coverage: CoverageEntry;
}

export interface IndicatorPoint {
  time: number;
  value: number;
}

export interface IndicatorDefinition {
  id: string;
  label: string;
  color: string;
  lineWidth: 1 | 2 | 3 | 4;
  defaultEnabled: boolean;
  compute: (candles: CandleRow[]) => IndicatorPoint[];
}

export interface BacktestTrade {
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
}

export interface BacktestResult {
  strategyLabel: string;
  trades: BacktestTrade[];
  tradeCount: number;
  winRate: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
}

export interface StrategyDefinition {
  id: string;
  label: string;
  description: string;
  run: (candles: CandleRow[]) => BacktestResult | null;
}
