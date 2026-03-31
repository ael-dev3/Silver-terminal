# Silver Data Snapshot

This repository holds raw silver-market data exports for backtesting and market-structure analysis. The current contents are data files plus the scripts used to fetch them.

## What is in this repo

There are three separate data sources here:

- `XAGUSD` spot silver from Dukascopy
- `SI=F` silver futures from Yahoo Finance
- `SLV/USDC` spot candles from Hyperliquid

These are related silver markets, but they are not the same instrument. Session hours, liquidity, volume semantics, and price behavior can differ across sources.

## Current datasets

Coverage below reflects the files currently checked into the repository.

| File | Market | Source | Timeframe | Rows | Coverage |
| --- | --- | --- | --- | ---: | --- |
| `data/xagusd_spot_h1.csv` | `XAGUSD` spot | Dukascopy | 1h | 48,723 | 2018-01-01 23:00 UTC to 2026-03-30 23:00 UTC |
| `data/xagusd_spot_m1_2025.csv` | `XAGUSD` spot | Dukascopy | 1m | 352,386 | 2025-01-01 23:00 UTC to 2025-12-30 23:59 UTC |
| `data/xagusd_spot_m1_2026_ytd.csv` | `XAGUSD` spot | Dukascopy | 1m | 84,805 | 2026-01-01 23:06 UTC to 2026-03-30 23:59 UTC |
| `data/si_futures_1d.csv` | `SI=F` silver futures | Yahoo Finance | 1d | 6,421 | 2000-08-30 to 2026-03-31 |
| `data/si_futures_1h.csv` | `SI=F` silver futures | Yahoo Finance | 1h | 13,729 | 2023-11-07 05:00 UTC to 2026-03-31 15:00 UTC |
| `data/hyperliquid/slv_usdc_1m.csv` | `SLV/USDC` | Hyperliquid | 1m | 5,197 | 2026-03-27 23:52 UTC to 2026-03-31 14:28 UTC |
| `data/hyperliquid/slv_usdc_5m.csv` | `SLV/USDC` | Hyperliquid | 5m | 5,039 | 2026-03-14 02:35 UTC to 2026-03-31 14:25 UTC |
| `data/hyperliquid/slv_usdc_15m.csv` | `SLV/USDC` | Hyperliquid | 15m | 5,013 | 2026-02-07 09:15 UTC to 2026-03-31 14:15 UTC |
| `data/hyperliquid/slv_usdc_1h.csv` | `SLV/USDC` | Hyperliquid | 1h | 1,976 | 2026-01-08 07:00 UTC to 2026-03-31 14:00 UTC |
| `data/hyperliquid/slv_usdc_4h.csv` | `SLV/USDC` | Hyperliquid | 4h | 495 | 2026-01-08 04:00 UTC to 2026-03-31 12:00 UTC |
| `data/hyperliquid/slv_usdc_1d.csv` | `SLV/USDC` | Hyperliquid | 1d | 83 | 2026-01-08 to 2026-03-31 |

The Hyperliquid export also includes `data/hyperliquid/slv_usdc_metadata.json`, which records the API endpoint, download timestamp, pair metadata, and exact per-interval coverage.

## File formats

### Dukascopy spot (`XAGUSD`)

Files:

- `data/xagusd_spot_h1.csv`
- `data/xagusd_spot_m1_2025.csv`
- `data/xagusd_spot_m1_2026_ytd.csv`

Schema:

```text
timestamp,open,high,low,close,volume
```

Notes:

- `timestamp` is Unix epoch milliseconds.
- Price columns are raw OHLC values from the export.
- The minute data is split into separate yearly files for 2025 and 2026 YTD.

### Yahoo Finance futures (`SI=F`)

Files:

- `data/si_futures_1d.csv`
- `data/si_futures_1h.csv`

Schema:

```text
timestamp,Adj Close,Close,High,Low,Open,Volume
```

Notes:

- The daily file uses date-style timestamps.
- The hourly file uses UTC datetimes.
- `Adj Close` is included because it comes directly from the Yahoo Finance response.

### Hyperliquid spot (`SLV/USDC`)

Files:

- `data/hyperliquid/slv_usdc_1m.csv`
- `data/hyperliquid/slv_usdc_5m.csv`
- `data/hyperliquid/slv_usdc_15m.csv`
- `data/hyperliquid/slv_usdc_1h.csv`
- `data/hyperliquid/slv_usdc_4h.csv`
- `data/hyperliquid/slv_usdc_1d.csv`

Schema:

```text
open_time,close_time,open_time_utc,close_time_utc,symbol,interval,open,high,low,close,volume,trade_count
```

Notes:

- `open_time` and `close_time` are Unix epoch milliseconds.
- `open_time_utc` and `close_time_utc` are ISO 8601 UTC timestamps.
- `symbol` is the Hyperliquid pair id in the export. In the current metadata snapshot this pair is `@265`.
- `trade_count` is included for each candle.
- Hyperliquid `candleSnapshot` returns rolling recent history, not a full backfill from listing date to present for every interval.

## Download scripts

### `scripts/download_silver_data.py`

Downloads:

- Dukascopy `XAGUSD` spot:
  - 1h from 2018-01-01 to today
  - 1m for calendar year 2025
  - 1m for 2026 year-to-date
- Yahoo Finance `SI=F` futures:
  - 1d with `period=max`
  - 1h with `period=730d`

Notes:

- Spot downloads use `npx dukascopy-node`, so Node.js must be installed and `npx` must be available.
- The script reuses an existing spot file if it already exists instead of overwriting it.
- Futures files are rebuilt on each run.

### `scripts/download_hyperliquid_slv.py`

Downloads:

- Hyperliquid `SLV/USDC` spot candles at `1m`, `5m`, `15m`, `1h`, `4h`, and `1d`

Notes:

- Uses the official Hyperliquid API endpoint: `https://api.hyperliquid.xyz/info`
- Discovers the `SLV/USDC` pair dynamically from `spotMeta`
- Writes candle CSVs plus `data/hyperliquid/slv_usdc_metadata.json`

## Refreshing the data

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Refresh Dukascopy spot and Yahoo futures data:

```bash
python scripts/download_silver_data.py
```

Refresh Hyperliquid data:

```bash
python scripts/download_hyperliquid_slv.py
```

## Repo layout

```text
data/
  hyperliquid/
    slv_usdc_*.csv
    slv_usdc_metadata.json
  si_futures_1d.csv
  si_futures_1h.csv
  xagusd_spot_h1.csv
  xagusd_spot_m1_2025.csv
  xagusd_spot_m1_2026_ytd.csv
scripts/
  download_hyperliquid_slv.py
  download_silver_data.py
requirements.txt
```
