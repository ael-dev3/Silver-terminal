# Hyperliquid Silver Data

This repository now tracks only Hyperliquid silver data for the `SLV/USDC` spot market.

## Current datasets

All checked-in market data lives under `data/hyperliquid/`.

| File | Market | Source | Timeframe | Rows | Coverage |
| --- | --- | --- | --- | ---: | --- |
| `data/hyperliquid/slv_usdc_1m.csv` | `SLV/USDC` | Hyperliquid | 1m | 5,197 | 2026-03-27 23:52 UTC to 2026-03-31 14:28 UTC |
| `data/hyperliquid/slv_usdc_5m.csv` | `SLV/USDC` | Hyperliquid | 5m | 5,039 | 2026-03-14 02:35 UTC to 2026-03-31 14:25 UTC |
| `data/hyperliquid/slv_usdc_15m.csv` | `SLV/USDC` | Hyperliquid | 15m | 5,013 | 2026-02-07 09:15 UTC to 2026-03-31 14:15 UTC |
| `data/hyperliquid/slv_usdc_1h.csv` | `SLV/USDC` | Hyperliquid | 1h | 1,976 | 2026-01-08 07:00 UTC to 2026-03-31 14:00 UTC |
| `data/hyperliquid/slv_usdc_4h.csv` | `SLV/USDC` | Hyperliquid | 4h | 495 | 2026-01-08 04:00 UTC to 2026-03-31 12:00 UTC |
| `data/hyperliquid/slv_usdc_1d.csv` | `SLV/USDC` | Hyperliquid | 1d | 83 | 2026-01-08 to 2026-03-31 |

The repo also includes `data/hyperliquid/slv_usdc_metadata.json`, which records:

- the API endpoint
- the download timestamp
- the discovered pair metadata
- exact per-interval coverage

## Schema

Each candle CSV uses this schema:

```text
open_time,close_time,open_time_utc,close_time_utc,symbol,interval,open,high,low,close,volume,trade_count
```

Notes:

- `open_time` and `close_time` are Unix epoch milliseconds.
- `open_time_utc` and `close_time_utc` are ISO 8601 UTC timestamps.
- `symbol` is the Hyperliquid pair id in the export. In the current metadata snapshot this pair is `@265`.
- `trade_count` is included for every candle.

## Source and caveats

Source:

- Hyperliquid official API: `https://api.hyperliquid.xyz/info`

Caveats:

- The export is for Hyperliquid `SLV/USDC`, not OTC spot silver or CME futures.
- Hyperliquid `candleSnapshot` returns rolling recent history, not a guaranteed full backfill for every interval.
- The current repository includes `1m`, `5m`, `15m`, `1h`, `4h`, and `1d` files.
- Hyperliquid also accepts `1w` candles, but weekly data is not checked into the repo yet.

## Download script

`scripts/download_hyperliquid_slv.py`:

- discovers the `SLV/USDC` spot pair dynamically from `spotMeta`
- downloads candles from the official Hyperliquid API
- writes the interval CSVs plus `data/hyperliquid/slv_usdc_metadata.json`

The script currently exports these intervals:

- `1m`
- `5m`
- `15m`
- `1h`
- `4h`
- `1d`

## Refreshing the data

Install dependencies:

```bash
pip install -r requirements.txt
```

Refresh the Hyperliquid exports:

```bash
python scripts/download_hyperliquid_slv.py
```

## Repo layout

```text
data/
  hyperliquid/
    slv_usdc_1m.csv
    slv_usdc_5m.csv
    slv_usdc_15m.csv
    slv_usdc_1h.csv
    slv_usdc_4h.csv
    slv_usdc_1d.csv
    slv_usdc_metadata.json
scripts/
  download_hyperliquid_slv.py
requirements.txt
```
