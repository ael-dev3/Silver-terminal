import type { DatasetDefinition } from "./types";

export const DATASETS: DatasetDefinition[] = [
  {
    id: "hyperliquid-slv",
    label: "Hyperliquid SLV/USDC",
    description: "Current onchain spot dataset used by the live terminal.",
    source: "Hyperliquid",
    market: "SLV/USDC",
    intervals: ["1m", "5m", "15m", "1h", "4h", "1d", "1w"],
    defaultInterval: "1h",
    notes: [
      "Rolling history only.",
      "Best for current market structure review and forward monitoring.",
    ],
    metadataPath: "../data/hyperliquid/slv_usdc_metadata.json",
    csvPath: (interval) => `../data/hyperliquid/slv_usdc_${interval}.csv`,
  },
  {
    id: "dukascopy-xagusd",
    label: "Dukascopy XAGUSD Weekly",
    description: "Long-history weekly reference file normalized into the same schema.",
    source: "Dukascopy",
    market: "XAGUSD",
    intervals: ["1w"],
    defaultInterval: "1w",
    notes: [
      "Single-source weekly reference series for long-range research.",
      "Schema matches Hyperliquid layout, but market and volume construction differ.",
    ],
    csvPath: () => "../data/reference/xagusd_dukascopy_1w.csv",
  },
];

export function getDatasetById(datasetId: string): DatasetDefinition {
  const dataset = DATASETS.find((entry) => entry.id === datasetId);
  if (!dataset) {
    throw new Error(`Unknown dataset: ${datasetId}`);
  }
  return dataset;
}
