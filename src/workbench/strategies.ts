import type { BacktestResult, BacktestTrade, CandleRow, StrategyDefinition } from "./types";

function computeEma(candles: CandleRow[], period: number): number[] {
  const values = Array<number>(candles.length).fill(Number.NaN);
  if (candles.length < period) {
    return values;
  }

  const multiplier = 2 / (period + 1);
  let rollingSum = 0;
  let emaValue = 0;

  for (let index = 0; index < candles.length; index += 1) {
    const close = candles[index].close;
    rollingSum += close;

    if (index === period - 1) {
      emaValue = rollingSum / period;
      values[index] = emaValue;
      continue;
    }

    if (index >= period) {
      emaValue = close * multiplier + emaValue * (1 - multiplier);
      values[index] = emaValue;
    }
  }

  return values;
}

function calculateMaxDrawdown(equityCurve: number[]): number {
  let peak = equityCurve[0] ?? 1;
  let maxDrawdown = 0;
  for (const value of equityCurve) {
    peak = Math.max(peak, value);
    maxDrawdown = Math.min(maxDrawdown, (value - peak) / peak);
  }
  return maxDrawdown * 100;
}

function runEmaCross(candles: CandleRow[]): BacktestResult | null {
  const fast = computeEma(candles, 20);
  const slow = computeEma(candles, 50);
  const trades: BacktestTrade[] = [];
  const equityCurve: number[] = [1];

  let inPosition = false;
  let entryPrice = 0;
  let entryTime = "";
  let equity = 1;

  for (let index = 1; index < candles.length; index += 1) {
    if (
      Number.isNaN(fast[index - 1]) ||
      Number.isNaN(slow[index - 1]) ||
      Number.isNaN(fast[index]) ||
      Number.isNaN(slow[index])
    ) {
      continue;
    }

    const crossedUp = fast[index - 1] <= slow[index - 1] && fast[index] > slow[index];
    const crossedDown = fast[index - 1] >= slow[index - 1] && fast[index] < slow[index];

    if (!inPosition && crossedUp) {
      inPosition = true;
      entryPrice = candles[index].close;
      entryTime = candles[index].close_time_utc;
      continue;
    }

    if (inPosition && crossedDown) {
      const exitPrice = candles[index].close;
      const tradeReturn = (exitPrice - entryPrice) / entryPrice;
      equity *= 1 + tradeReturn;
      equityCurve.push(equity);
      trades.push({
        entryTime,
        exitTime: candles[index].close_time_utc,
        entryPrice,
        exitPrice,
        returnPct: tradeReturn * 100,
      });
      inPosition = false;
    }
  }

  if (inPosition) {
    const last = candles[candles.length - 1];
    const tradeReturn = (last.close - entryPrice) / entryPrice;
    equity *= 1 + tradeReturn;
    equityCurve.push(equity);
    trades.push({
      entryTime,
      exitTime: last.close_time_utc,
      entryPrice,
      exitPrice: last.close,
      returnPct: tradeReturn * 100,
    });
  }

  if (!trades.length) {
    return null;
  }

  const winners = trades.filter((trade) => trade.returnPct > 0).length;
  return {
    strategyLabel: "EMA 20/50 Cross",
    trades,
    tradeCount: trades.length,
    winRate: (winners / trades.length) * 100,
    totalReturnPct: (equity - 1) * 100,
    maxDrawdownPct: calculateMaxDrawdown(equityCurve),
  };
}

export const STRATEGIES: StrategyDefinition[] = [
  {
    id: "none",
    label: "No strategy",
    description: "Chart-only mode.",
    run: () => null,
  },
  {
    id: "ema-cross",
    label: "EMA 20/50 Cross",
    description: "Simple long-only crossover scaffold for future strategy work.",
    run: runEmaCross,
  },
];
