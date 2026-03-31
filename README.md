# Hyperliquid Silver Terminal

Live terminal: https://ael-dev3.github.io/Silver-terminal/

Public Pages repo: https://github.com/ael-dev3/Silver-terminal

This project tracks only Hyperliquid `SLV/USDC` spot data and ships a TradingView-style static chart interface built entirely with open-source materials.

## What is included

- raw Hyperliquid candle exports under `data/hyperliquid/`
- a static terminal UI in `index.html`, `app.css`, and `app.js`
- a reproducible download script in `scripts/download_hyperliquid_slv.py`
- a vendored copy of TradingView Lightweight Charts 5.1.0 under `vendor/lightweight-charts/`

## Live interface

The hosted UI provides:

- candlestick charting for every checked-in timeframe
- volume overlay
- EMA overlays
- TradingView-style dark terminal layout
- keyboard timeframe shortcuts
- direct links to the current CSV and metadata file

Available timeframes in the UI:

- `1m`
- `5m`
- `15m`
- `1h`
- `4h`
- `1d`
- `1w`

## Current datasets

All market data lives under `data/hyperliquid/`.

| File | Timeframe | Rows | Coverage |
| --- | --- | ---: | --- |
| `data/hyperliquid/slv_usdc_1m.csv` | `1m` | 5,259 | 2026-03-27 23:52 UTC to 2026-03-31 15:30 UTC |
| `data/hyperliquid/slv_usdc_5m.csv` | `5m` | 5,052 | 2026-03-14 02:35 UTC to 2026-03-31 15:34 UTC |
| `data/hyperliquid/slv_usdc_15m.csv` | `15m` | 5,018 | 2026-02-07 09:15 UTC to 2026-03-31 15:44 UTC |
| `data/hyperliquid/slv_usdc_1h.csv` | `1h` | 1,977 | 2026-01-08 07:00 UTC to 2026-03-31 15:59 UTC |
| `data/hyperliquid/slv_usdc_4h.csv` | `4h` | 495 | 2026-01-08 04:00 UTC to 2026-03-31 15:59 UTC |
| `data/hyperliquid/slv_usdc_1d.csv` | `1d` | 83 | 2026-01-08 00:00 UTC to 2026-03-31 23:59 UTC |
| `data/hyperliquid/slv_usdc_1w.csv` | `1w` | 12 | 2026-01-08 00:00 UTC to 2026-04-01 23:59 UTC |

The repo also includes `data/hyperliquid/slv_usdc_metadata.json`, which records:

- the Hyperliquid API endpoint
- the download timestamp
- the discovered pair metadata
- exact per-interval coverage

## Candle schema

Each candle CSV uses:

```text
open_time,close_time,open_time_utc,close_time_utc,symbol,interval,open,high,low,close,volume,trade_count
```

Notes:

- `open_time` and `close_time` are Unix epoch milliseconds.
- `open_time_utc` and `close_time_utc` are ISO 8601 UTC timestamps.
- `symbol` is the Hyperliquid pair id in the export. In the current snapshot it is `@265`.
- `trade_count` is included for every candle.

## Source and caveats

Source:

- Hyperliquid official API: `https://api.hyperliquid.xyz/info`

Caveats:

- This is Hyperliquid `SLV/USDC`, not OTC silver spot or CME silver futures.
- Hyperliquid `candleSnapshot` returns rolling recent history, not a guaranteed full historical backfill for each interval.
- The current weekly candle can still be in progress when you refresh the export.

## Open-source stack

- TradingView Lightweight Charts 5.1.0
- Apache License 2.0 for the vendored chart library
- custom HTML, CSS, and JavaScript app shell
- static GitHub Pages deployment

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
    slv_usdc_1w.csv
    slv_usdc_metadata.json
scripts/
  download_hyperliquid_slv.py
vendor/
  lightweight-charts/
    LICENSE
    lightweight-charts.standalone.production.js
index.html
app.css
app.js
favicon.svg
requirements.txt
```
