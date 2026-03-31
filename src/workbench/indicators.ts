import type { CandleRow, IndicatorDefinition, IndicatorPoint } from "./types";

function buildMovingAverage(
  candles: CandleRow[],
  period: number,
  mode: "ema" | "sma",
): IndicatorPoint[] {
  if (candles.length < period) {
    return [];
  }

  const result: IndicatorPoint[] = [];
  let emaValue = 0;
  let rollingSum = 0;
  const multiplier = 2 / (period + 1);

  for (let index = 0; index < candles.length; index += 1) {
    const close = candles[index].close;
    rollingSum += close;

    if (mode === "sma") {
      if (index >= period) {
        rollingSum -= candles[index - period].close;
      }
      if (index >= period - 1) {
        result.push({
          time: candles[index].open_time / 1000,
          value: rollingSum / period,
        });
      }
      continue;
    }

    if (index === period - 1) {
      emaValue = rollingSum / period;
      result.push({
        time: candles[index].open_time / 1000,
        value: emaValue,
      });
      continue;
    }

    if (index >= period) {
      emaValue = close * multiplier + emaValue * (1 - multiplier);
      result.push({
        time: candles[index].open_time / 1000,
        value: emaValue,
      });
    }
  }

  return result;
}

export const INDICATORS: IndicatorDefinition[] = [
  {
    id: "ema20",
    label: "EMA 20",
    color: "#f5a524",
    lineWidth: 2,
    defaultEnabled: true,
    compute: (candles) => buildMovingAverage(candles, 20, "ema"),
  },
  {
    id: "ema50",
    label: "EMA 50",
    color: "#5e7cff",
    lineWidth: 2,
    defaultEnabled: true,
    compute: (candles) => buildMovingAverage(candles, 50, "ema"),
  },
  {
    id: "sma20",
    label: "SMA 20",
    color: "#a4abb6",
    lineWidth: 1,
    defaultEnabled: false,
    compute: (candles) => buildMovingAverage(candles, 20, "sma"),
  },
];
