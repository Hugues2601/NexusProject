import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';

interface ChartProps {
  ticker: string;
  activeIndicators: string[];
}

const timeframes = ['1m', '5m', '1h', '1D', '1W', '1M', '3M', '6M', '1Y', '5Y', 'MAX'];

const INDICATOR_COLORS: Record<string, string> = {
  sma20:  '#3b82f6',
  sma50:  '#f0c040',
  sma200: '#ef4444',
  ema20:  '#22c55e',
  ema50:  '#a855f7',
  bb:     '#06b6d4',
};

function createChartInstance(container: HTMLDivElement, height: number) {
  return createChart(container, {
    layout: { background: { color: '#0a0a0f' }, textColor: '#6b7280' },
    grid: { vertLines: { color: '#1e2028' }, horzLines: { color: '#1e2028' } },
    crosshair: {
      vertLine: { color: '#f0c040', width: 1, style: 1 },
      horzLine: { color: '#f0c040', width: 1, style: 1 },
    },
    rightPriceScale: { borderColor: '#1e2028' },
    timeScale: { borderColor: '#1e2028', timeVisible: true, secondsVisible: false },
    width: container.clientWidth,
    height,
  });
}

function Chart({ ticker, activeIndicators }: ChartProps) {
  const mainRef      = useRef<HTMLDivElement>(null);
  const rsiRef       = useRef<HTMLDivElement>(null);
  const macdRef      = useRef<HTMLDivElement>(null);
  const mainChart    = useRef<any>(null);
  const rsiChart     = useRef<any>(null);
  const macdChart    = useRef<any>(null);
  const candleSeries = useRef<any>(null);
  const indicatorSeries = useRef<Record<string, any>>({});
  const rsiSeries    = useRef<any>(null);
  const macdLineSeries   = useRef<any>(null);
  const macdSignalSeries = useRef<any>(null);
  const macdHistSeries   = useRef<any>(null);

  const [activeTf, setActiveTf] = useState('1D');
  const [currentPrice, setCurrentPrice] = useState(0);
  const [chg, setChg] = useState(0);

  const showRsi  = activeIndicators.includes('rsi');
  const showMacd = activeIndicators.includes('macd');

  // Init main chart
  useEffect(() => {
    if (!mainRef.current) return;
    mainChart.current = createChartInstance(mainRef.current, mainRef.current.clientHeight);
    candleSeries.current = mainChart.current.addSeries(CandlestickSeries, {
      upColor: '#22c55e', downColor: '#ef4444',
      borderUpColor: '#22c55e', borderDownColor: '#ef4444',
      wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    });
    const ro = new ResizeObserver(() => {
      if (mainRef.current && mainChart.current)
        mainChart.current.applyOptions({ width: mainRef.current.clientWidth, height: mainRef.current.clientHeight });
    });
    ro.observe(mainRef.current);
    return () => { ro.disconnect(); mainChart.current?.remove(); };
  }, []);

  // Init RSI chart
  useEffect(() => {
    if (!showRsi || !rsiRef.current) return;
    rsiChart.current = createChartInstance(rsiRef.current, 120);
    rsiSeries.current = rsiChart.current.addSeries(LineSeries, {
      color: '#f97316', lineWidth: 1, priceLineVisible: false, lastValueVisible: true,
    });
    return () => { rsiChart.current?.remove(); rsiChart.current = null; };
  }, [showRsi]);

  // Init MACD chart
  useEffect(() => {
    if (!showMacd || !macdRef.current) return;
    macdChart.current = createChartInstance(macdRef.current, 120);
    macdLineSeries.current = macdChart.current.addSeries(LineSeries, {
      color: '#ec4899', lineWidth: 1, priceLineVisible: false, lastValueVisible: false,
    });
    macdSignalSeries.current = macdChart.current.addSeries(LineSeries, {
      color: '#f0c040', lineWidth: 1, priceLineVisible: false, lastValueVisible: false,
    });
    macdHistSeries.current = macdChart.current.addSeries(HistogramSeries, {
      priceLineVisible: false, lastValueVisible: false,
    });
    return () => { macdChart.current?.remove(); macdChart.current = null; };
  }, [showMacd]);

  // Fetch history
  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 60000);
    return () => clearInterval(interval);
  }, [ticker, activeTf]);

  // Fetch indicators
  useEffect(() => {
    fetchIndicators();
  }, [ticker, activeTf, activeIndicators]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/history?sym=${ticker}&tf=${activeTf}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        candleSeries.current?.setData(data);
        mainChart.current?.timeScale().fitContent();
        const last = data[data.length - 1];
        setCurrentPrice(last.close);
        setChg(+((last.close - data[0].close) / data[0].close * 100).toFixed(2));
      }
    } catch (e) { console.error('Erreur history:', e); }
  };

  const fetchIndicators = async () => {
    if (!mainChart.current) return;

    Object.values(indicatorSeries.current).forEach(s => {
      try { mainChart.current.removeSeries(s); } catch {}
    });
    indicatorSeries.current = {};

    try {
      const res = await fetch(`http://127.0.0.1:8000/indicators?sym=${ticker}&tf=${activeTf}`);
      const data = await res.json();
      if (!data.times) return;

      const toPoints = (arr: (number|null)[]) =>
        arr.map((v, i) => v !== null && v !== -1 ? { time: data.times[i], value: v } : null).filter(Boolean);

      // Overlay indicators
      ['sma20','sma50','sma200','ema20','ema50'].forEach(key => {
        if (!activeIndicators.includes(key) || !data[key]) return;
        const s = mainChart.current.addSeries(LineSeries, {
          color: INDICATOR_COLORS[key], lineWidth: 1,
          priceLineVisible: false, lastValueVisible: false,
        });
        s.setData(toPoints(data[key]));
        indicatorSeries.current[key] = s;
      });

      // Bollinger
      if (activeIndicators.includes('bb') && data.bb_upper) {
        ['bb_upper','bb_middle','bb_lower'].forEach((key, idx) => {
          const s = mainChart.current.addSeries(LineSeries, {
            color: '#06b6d4', lineWidth: 1, lineStyle: idx === 1 ? 0 : 2,
            priceLineVisible: false, lastValueVisible: false,
          });
          s.setData(toPoints(data[key]));
          indicatorSeries.current[key] = s;
        });
      }

      // RSI
      if (showRsi && rsiSeries.current && data.rsi) {
        rsiSeries.current.setData(toPoints(data.rsi));
        rsiChart.current?.timeScale().fitContent();
      }

      // MACD
      if (showMacd && macdLineSeries.current && data.macd_line) {
        macdLineSeries.current.setData(toPoints(data.macd_line));
        macdSignalSeries.current?.setData(toPoints(data.macd_signal));
        const histPoints = data.macd_hist
          .map((v: number|null, i: number) => v !== null && v !== -1 ? {
            time: data.times[i],
            value: v,
            color: v >= 0 ? '#22c55e' : '#ef4444'
          } : null).filter(Boolean);
        macdHistSeries.current?.setData(histPoints);
        macdChart.current?.timeScale().fitContent();
      }

    } catch (e) { console.error('Erreur indicators:', e); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        padding: '8px 14px', background: '#0d0d14',
        borderBottom: '1px solid #1e2028',
        display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0
      }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '16px', fontWeight: 600, color: '#f0c040' }}>{ticker}</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '16px', color: '#e0e8f0' }}>{currentPrice.toFixed(2)}</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: chg >= 0 ? '#22c55e' : '#ef4444' }}>
          {chg >= 0 ? '+' : ''}{chg}%
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          {timeframes.map(tf => (
            <button key={tf} onClick={() => setActiveTf(tf)} style={{
              padding: '3px 8px', fontSize: '10px',
              fontFamily: 'JetBrains Mono, monospace',
              background: activeTf === tf ? '#1a1a24' : 'transparent',
              border: `1px solid ${activeTf === tf ? '#f0c040' : '#2a2a38'}`,
              color: activeTf === tf ? '#f0c040' : '#6b7280',
              cursor: 'pointer', borderRadius: '3px'
            }}>{tf}</button>
          ))}
        </div>
      </div>

      {/* Main chart */}
      <div ref={mainRef} style={{ flex: 1, background: '#0a0a0f', minHeight: 0 }} />

      {/* RSI panel */}
      {showRsi && (
        <div style={{ flexShrink: 0, borderTop: '1px solid #1e2028' }}>
          <div style={{ padding: '2px 8px', fontSize: '9px', color: '#f97316', fontFamily: 'JetBrains Mono, monospace', background: '#0d0d14' }}>
            RSI 14
          </div>
          <div ref={rsiRef} style={{ height: '120px', background: '#0a0a0f' }} />
        </div>
      )}

      {/* MACD panel */}
      {showMacd && (
        <div style={{ flexShrink: 0, borderTop: '1px solid #1e2028' }}>
          <div style={{ padding: '2px 8px', fontSize: '9px', color: '#ec4899', fontFamily: 'JetBrains Mono, monospace', background: '#0d0d14' }}>
            MACD (12, 26, 9)
          </div>
          <div ref={macdRef} style={{ height: '120px', background: '#0a0a0f' }} />
        </div>
      )}

    </div>
  );
}

export default Chart;