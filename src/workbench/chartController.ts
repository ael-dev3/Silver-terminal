import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  PriceScaleMode,
  createChart,
  createSeriesMarkers,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type MouseEventParams,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { BacktestResult, CandleRow, IndicatorDefinition } from "./types";

type CrosshairHandler = (row: CandleRow | null) => void;

function toTimestamp(value: number): UTCTimestamp {
  return Math.floor(value / 1000) as UTCTimestamp;
}

function buildVolumeColor(row: CandleRow): string {
  return row.close >= row.open ? "rgba(22, 163, 74, 0.55)" : "rgba(220, 38, 38, 0.55)";
}

export class ChartController {
  private readonly chart: IChartApi;
  private readonly candleSeries: ISeriesApi<"Candlestick", Time>;
  private readonly volumeSeries: ISeriesApi<"Histogram", Time>;
  private readonly markerApi;
  private readonly indicatorSeries = new Map<string, ISeriesApi<"Line", Time>>();
  private readonly crosshairHandlers = new Set<CrosshairHandler>();
  private candles: CandleRow[] = [];
  private candleByTime = new Map<number, CandleRow>();
  private volumeVisible = true;

  constructor(container: HTMLElement) {
    this.chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#0e1116" },
        textColor: "#d5dbe5",
        fontFamily:
          '"Segoe UI", "Helvetica Neue", Helvetica, Arial, "Noto Sans", sans-serif',
        fontSize: 12,
        attributionLogo: true,
        panes: {
          separatorColor: "rgba(255, 255, 255, 0.08)",
          separatorHoverColor: "rgba(255, 255, 255, 0.14)",
        },
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.05)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      crosshair: {
        mode: CrosshairMode.MagnetOHLC,
        vertLine: {
          color: "rgba(198, 206, 219, 0.32)",
          labelBackgroundColor: "#151a22",
          width: 1,
        },
        horzLine: {
          color: "rgba(198, 206, 219, 0.32)",
          labelBackgroundColor: "#151a22",
          width: 1,
        },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        rightOffset: 6,
        fixLeftEdge: true,
        lockVisibleTimeRangeOnResize: true,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
      localization: {
        priceFormatter: (value: number) => value.toFixed(3),
      },
    });

    this.candleSeries = this.chart.addSeries(
      CandlestickSeries,
      {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
        priceLineColor: "#9fb0c7",
        lastValueVisible: true,
      },
      0,
    );

    this.volumeSeries = this.chart.addSeries(
      HistogramSeries,
      {
        priceFormat: { type: "volume" },
        lastValueVisible: false,
        priceLineVisible: false,
      },
      1,
    );

    this.markerApi = createSeriesMarkers(this.candleSeries, []);

    const panes = this.chart.panes();
    panes[0]?.setStretchFactor(5);
    panes[1]?.setStretchFactor(1);

    this.chart.subscribeCrosshairMove((param) => {
      this.broadcastCrosshair(this.lookupRow(param));
    });
  }

  destroy(): void {
    this.chart.remove();
  }

  onCrosshair(handler: CrosshairHandler): () => void {
    this.crosshairHandlers.add(handler);
    return () => {
      this.crosshairHandlers.delete(handler);
    };
  }

  setCandles(candles: CandleRow[]): void {
    this.candles = candles;
    this.candleByTime = new Map(
      candles.map((row) => [Math.floor(row.open_time / 1000), row] as const),
    );

    const candleData: CandlestickData<Time>[] = candles.map((row) => ({
      time: toTimestamp(row.open_time),
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
    }));

    const volumeData: HistogramData<Time>[] = candles.map((row) => ({
      time: toTimestamp(row.open_time),
      value: row.volume,
      color: buildVolumeColor(row),
    }));

    this.candleSeries.setData(candleData);
    this.volumeSeries.setData(volumeData);
    this.volumeSeries.applyOptions({ visible: this.volumeVisible });

    this.broadcastCrosshair(candles[candles.length - 1] ?? null);
  }

  setIndicators(indicators: IndicatorDefinition[], candles: CandleRow[]): void {
    const activeIds = new Set(indicators.map((indicator) => indicator.id));

    for (const [indicatorId, series] of this.indicatorSeries.entries()) {
      if (!activeIds.has(indicatorId)) {
        this.chart.removeSeries(series);
        this.indicatorSeries.delete(indicatorId);
      }
    }

    for (const indicator of indicators) {
      let series = this.indicatorSeries.get(indicator.id);
      if (!series) {
        series = this.chart.addSeries(
          LineSeries,
          {
            color: indicator.color,
            lineWidth: indicator.lineWidth,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          0,
        );
        this.indicatorSeries.set(indicator.id, series);
      }

      const data: LineData<Time>[] = indicator.compute(candles).map((point) => ({
        time: point.time as UTCTimestamp,
        value: point.value,
      }));
      series.setData(data);
    }
  }

  setStrategy(result: BacktestResult | null): void {
    if (!result) {
      this.markerApi.setMarkers([]);
      return;
    }

    const markers: SeriesMarker<Time>[] = [];
    for (const trade of result.trades.slice(-200)) {
      const entryTime = Math.floor(new Date(trade.entryTime).getTime() / 1000);
      const exitTime = Math.floor(new Date(trade.exitTime).getTime() / 1000);

      markers.push({
        time: entryTime as UTCTimestamp,
        position: "belowBar",
        color: "#22c55e",
        shape: "arrowUp",
        text: "BUY",
      });
      markers.push({
        time: exitTime as UTCTimestamp,
        position: "aboveBar",
        color: trade.returnPct >= 0 ? "#93c5fd" : "#ef4444",
        shape: "arrowDown",
        text: trade.returnPct >= 0 ? "EXIT +" : "EXIT -",
      });
    }

    this.markerApi.setMarkers(markers);
  }

  setVolumeVisible(visible: boolean): void {
    this.volumeVisible = visible;
    this.volumeSeries.applyOptions({ visible });
  }

  setPriceScaleMode(mode: PriceScaleMode): void {
    this.chart.priceScale("right", 0).applyOptions({ mode });
  }

  fitContent(): void {
    this.chart.timeScale().fitContent();
  }

  showLastBars(barCount: number): void {
    if (!this.candles.length) {
      return;
    }

    const total = this.candles.length;
    const from = Math.max(-1, total - barCount - 1);
    const to = total + 1;
    this.chart.timeScale().setVisibleLogicalRange({ from, to });
  }

  private lookupRow(param: MouseEventParams<Time>): CandleRow | null {
    if (!param.time) {
      return this.candles[this.candles.length - 1] ?? null;
    }

    const timeValue =
      typeof param.time === "number"
        ? param.time
        : Math.floor(new Date(String(param.time)).getTime() / 1000);

    return this.candleByTime.get(timeValue) ?? this.candles[this.candles.length - 1] ?? null;
  }

  private broadcastCrosshair(row: CandleRow | null): void {
    for (const handler of this.crosshairHandlers) {
      handler(row);
    }
  }
}
