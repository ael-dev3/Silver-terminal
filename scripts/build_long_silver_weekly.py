from __future__ import annotations

import csv
import shutil
import subprocess
import tempfile
from datetime import date, datetime, timedelta, timezone
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT_DIR / "data" / "reference"
OUTPUT_PATH = OUTPUT_DIR / "xagusd_dukascopy_1w.csv"
SOURCE_FROM_DATE = "1999-06-03"
SOURCE_TO_DATE = date.today().isoformat()
SYMBOL = "XAGUSD"
INTERVAL = "1w"


def iso_utc(timestamp_ms: int) -> str:
    return datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc).isoformat()


def day_end_timestamp(timestamp_ms: int) -> int:
    return timestamp_ms + 86_399_999


def week_bucket_start(timestamp_ms: int) -> date:
    current = datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc).date()
    return current - timedelta(days=current.weekday())


def download_dukascopy_daily_csv(target_path: Path) -> None:
    npx_executable = shutil.which("npx.cmd") or shutil.which("npx")
    if not npx_executable:
        raise RuntimeError("Could not find npx. Install Node.js or add it to PATH.")

    command = [
        npx_executable,
        "dukascopy-node",
        "-i",
        "xagusd",
        "-from",
        SOURCE_FROM_DATE,
        "-to",
        SOURCE_TO_DATE,
        "-t",
        "d1",
        "-f",
        "csv",
        "-dir",
        str(target_path.parent),
        "-fn",
        target_path.stem,
        "-v",
    ]
    subprocess.run(command, check=True)


def read_daily_rows(path: Path) -> list[dict]:
    with path.open("r", newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        rows = []
        for row in reader:
            rows.append(
                {
                    "timestamp": int(row["timestamp"]),
                    "open": float(row["open"]),
                    "high": float(row["high"]),
                    "low": float(row["low"]),
                    "close": float(row["close"]),
                    "volume": float(row["volume"]),
                }
            )
    if not rows:
        raise RuntimeError("No daily Dukascopy rows were downloaded.")
    return rows


def aggregate_weekly(rows: list[dict]) -> list[dict]:
    grouped: list[list[dict]] = []
    current_group: list[dict] = []
    current_bucket: date | None = None

    for row in rows:
        bucket = week_bucket_start(row["timestamp"])
        if current_bucket is None or bucket != current_bucket:
            if current_group:
                grouped.append(current_group)
            current_group = [row]
            current_bucket = bucket
        else:
            current_group.append(row)

    if current_group:
        grouped.append(current_group)

    weekly_rows = []
    for group in grouped:
        first = group[0]
        last = group[-1]
        weekly_rows.append(
            {
                "open_time": first["timestamp"],
                "close_time": day_end_timestamp(last["timestamp"]),
                "open_time_utc": iso_utc(first["timestamp"]),
                "close_time_utc": iso_utc(day_end_timestamp(last["timestamp"])),
                "symbol": SYMBOL,
                "interval": INTERVAL,
                "open": f"{first['open']:.6f}".rstrip("0").rstrip("."),
                "high": f"{max(row['high'] for row in group):.6f}".rstrip("0").rstrip("."),
                "low": f"{min(row['low'] for row in group):.6f}".rstrip("0").rstrip("."),
                "close": f"{last['close']:.6f}".rstrip("0").rstrip("."),
                "volume": f"{sum(row['volume'] for row in group):.6f}".rstrip("0").rstrip("."),
                # Dukascopy daily CSVs do not expose per-bar trade counts in this export.
                "trade_count": "0",
            }
        )

    return weekly_rows


def write_weekly_csv(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "open_time",
        "close_time",
        "open_time_utc",
        "close_time_utc",
        "symbol",
        "interval",
        "open",
        "high",
        "low",
        "close",
        "volume",
        "trade_count",
    ]
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="silver-dukascopy-") as temp_dir:
        temp_path = Path(temp_dir) / "xagusd_dukascopy_d1.csv"
        download_dukascopy_daily_csv(temp_path)
        daily_rows = read_daily_rows(temp_path)

    weekly_rows = aggregate_weekly(daily_rows)
    write_weekly_csv(OUTPUT_PATH, weekly_rows)

    print(f"Saved {len(weekly_rows):,} weekly rows to {OUTPUT_PATH}")
    print(f"Coverage: {weekly_rows[0]['open_time_utc']} -> {weekly_rows[-1]['close_time_utc']}")


if __name__ == "__main__":
    main()
