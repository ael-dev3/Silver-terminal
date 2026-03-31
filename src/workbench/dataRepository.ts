import type {
  CandleRow,
  CoverageEntry,
  DatasetDefinition,
  DatasetMetaSummary,
  DatasetOverview,
  Interval,
  LoadedDataset,
} from "./types";

interface RawMetadataCoverage {
  interval: Interval;
  rows: number;
  first_open_time_utc: string;
  last_close_time_utc: string;
}

interface RawMetadata {
  source?: string;
  api_url?: string;
  downloaded_at_utc?: string;
  note?: string;
  pair?: {
    pair_id?: string;
    display_name?: string;
  };
  coverage?: RawMetadataCoverage[];
}

function parseCsv(text: string): CandleRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1) {
    return [];
  }

  const candles: CandleRow[] = [];
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index]?.trim();
    if (!line) {
      continue;
    }

    const parts = line.split(",");
    if (parts.length < 12) {
      throw new Error(`Malformed candle row at line ${index + 1}`);
    }

    candles.push({
      open_time: Number(parts[0]),
      close_time: Number(parts[1]),
      open_time_utc: parts[2],
      close_time_utc: parts[3],
      symbol: parts[4],
      interval: parts[5] as Interval,
      open: Number(parts[6]),
      high: Number(parts[7]),
      low: Number(parts[8]),
      close: Number(parts[9]),
      volume: Number(parts[10]),
      trade_count: Number(parts[11]),
    });
  }

  return candles.sort((left, right) => left.open_time - right.open_time);
}

function buildCoverage(interval: Interval, candles: CandleRow[]): CoverageEntry {
  const first = candles[0];
  const last = candles[candles.length - 1];

  if (!first || !last) {
    throw new Error(`No candles available for ${interval}`);
  }

  return {
    interval,
    rows: candles.length,
    first_open_time_utc: first.open_time_utc,
    last_close_time_utc: last.close_time_utc,
  };
}

function mapMetadata(definition: DatasetDefinition, metadata: RawMetadata): DatasetMetaSummary {
  return {
    sourceLabel: metadata.source ?? definition.source,
    displayName: metadata.pair?.display_name ?? definition.market,
    downloadedAtUtc: metadata.downloaded_at_utc,
    pairId: metadata.pair?.pair_id,
    apiUrl: metadata.api_url,
    note: metadata.note,
  };
}

async function fetchText(path: string): Promise<string> {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.text();
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json() as Promise<T>;
}

export class DataRepository {
  private readonly overviewCache = new Map<string, Promise<DatasetOverview>>();
  private readonly datasetCache = new Map<string, Promise<LoadedDataset>>();

  async loadOverview(definition: DatasetDefinition): Promise<DatasetOverview> {
    const cached = this.overviewCache.get(definition.id);
    if (cached) {
      return cached;
    }

    const promise = this.buildOverview(definition);
    this.overviewCache.set(definition.id, promise);
    return promise;
  }

  async loadDataset(definition: DatasetDefinition, interval: Interval): Promise<LoadedDataset> {
    if (!definition.intervals.includes(interval)) {
      throw new Error(`${definition.label} does not support ${interval}`);
    }

    const cacheKey = `${definition.id}:${interval}`;
    const cached = this.datasetCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const promise = this.buildDataset(definition, interval);
    this.datasetCache.set(cacheKey, promise);
    return promise;
  }

  private async buildOverview(definition: DatasetDefinition): Promise<DatasetOverview> {
    if (definition.metadataPath) {
      const metadata = await fetchJson<RawMetadata>(definition.metadataPath);
      const coverage = (metadata.coverage ?? []).map((entry) => ({
        interval: entry.interval,
        rows: entry.rows,
        first_open_time_utc: entry.first_open_time_utc,
        last_close_time_utc: entry.last_close_time_utc,
      }));

      return {
        definition,
        coverage,
        meta: mapMetadata(definition, metadata),
      };
    }

    const coverage = await Promise.all(
      definition.intervals.map(async (interval) => {
        const dataset = await this.loadDataset(definition, interval);
        return dataset.coverage;
      }),
    );

    return {
      definition,
      coverage,
      meta: {
        sourceLabel: definition.source,
        displayName: definition.market,
      },
    };
  }

  private async buildDataset(
    definition: DatasetDefinition,
    interval: Interval,
  ): Promise<LoadedDataset> {
    const csvText = await fetchText(definition.csvPath(interval));
    const candles = parseCsv(csvText);

    return {
      definition,
      interval,
      candles,
      coverage: buildCoverage(interval, candles),
    };
  }
}
