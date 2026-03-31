from datetime import date
from pathlib import Path
import shutil
import subprocess

import pandas as pd
import yfinance as yf


OUTPUT_DIR = Path(__file__).resolve().parents[1] / "data"
SPOT_TO_DATE = date.today().isoformat()
SPOT_DOWNLOADS = [
    {
        "label": "xagusd_spot_h1",
        "timeframe": "h1",
        "from_date": "2018-01-01",
        "to_date": SPOT_TO_DATE,
    },
    {
        "label": "xagusd_spot_m1_2025",
        "timeframe": "m1",
        "from_date": "2025-01-01",
        "to_date": "2025-12-31",
    },
    {
        "label": "xagusd_spot_m1_2026_ytd",
        "timeframe": "m1",
        "from_date": "2026-01-01",
        "to_date": SPOT_TO_DATE,
    },
]

FUTURES_DOWNLOADS = [
    {
        "symbol": "SI=F",
        "label": "si_futures",
        "interval": "1d",
        "period": "max",
    },
    {
        "symbol": "SI=F",
        "label": "si_futures",
        "interval": "1h",
        "period": "730d",
    },
]


def normalize_columns(frame: pd.DataFrame, symbol: str) -> pd.DataFrame:
    if isinstance(frame.columns, pd.MultiIndex):
        frame.columns = [
            level_0 if level_1 == symbol else f"{level_0}_{level_1}"
            for level_0, level_1 in frame.columns
        ]
    return frame


def fetch_yahoo_frame(symbol: str, interval: str, period: str) -> pd.DataFrame:
    frame = yf.download(
        tickers=symbol,
        interval=interval,
        period=period,
        auto_adjust=False,
        progress=False,
        threads=False,
    )
    if frame.empty:
        raise RuntimeError(f"No data returned for {symbol} ({interval}, {period})")

    frame = normalize_columns(frame, symbol).reset_index()
    first_col = frame.columns[0]
    frame = frame.rename(columns={first_col: "timestamp"})
    frame["timestamp"] = pd.to_datetime(frame["timestamp"], utc=False)
    return frame


def download_spot_silver(label: str, timeframe: str, from_date: str, to_date: str) -> Path:
    output_path = OUTPUT_DIR / f"{label}.csv"
    if output_path.exists() and output_path.stat().st_size > 0:
        print(f"Using existing spot Silver data at {output_path}")
        return output_path

    npx_executable = shutil.which("npx.cmd") or shutil.which("npx")
    if not npx_executable:
        raise RuntimeError("Could not find npx. Install Node.js or add it to PATH.")

    command = [
        npx_executable,
        "dukascopy-node",
        "-i",
        "xagusd",
        "-from",
        from_date,
        "-to",
        to_date,
        "-t",
        timeframe,
        "-f",
        "csv",
        "-dir",
        str(OUTPUT_DIR),
        "-fn",
        output_path.stem,
        "-v",
    ]
    subprocess.run(command, check=True)
    return output_path


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for item in SPOT_DOWNLOADS:
        spot_path = download_spot_silver(
            label=item["label"],
            timeframe=item["timeframe"],
            from_date=item["from_date"],
            to_date=item["to_date"],
        )
        print(f"Saved spot Silver data to {spot_path}")

    for item in FUTURES_DOWNLOADS:
        frame = fetch_yahoo_frame(item["symbol"], item["interval"], item["period"])
        output_path = OUTPUT_DIR / f"{item['label']}_{item['interval']}.csv"
        frame.to_csv(output_path, index=False)
        print(f"Saved {len(frame):,} rows to {output_path}")


if __name__ == "__main__":
    main()
