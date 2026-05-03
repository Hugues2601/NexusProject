import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries } from 'lightweight-charts';

interface ChartProps {
  ticker: string;
}

const timeframes = ['1m', '5m', '1h', '1D', '1W', '1M', '3M', '6M', '1Y', '5Y', 'MAX'];

function Chart({ ticker }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const [activeTf, setActiveTf] = useState('1D');
  const [currentPrice, setCurrentPrice] = useState(0);
  const [chg, setChg] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    chartRef.current = createChart(containerRef.current, {
      layout: {
        background: { color: '#0a0a0f' },
        textColor: '#6b7280',
      },
      grid: {
        vertLines: { color: '#1e2028' },
        horzLines: { color: '#1e2028' },
      },
      crosshair: {
        vertLine: { color: '#f0c040', width: 1, style: 1 },
        horzLine: { color: '#f0c040', width: 1, style: 1 },
      },
      rightPriceScale: {
        borderColor: '#1e2028',
      },
      timeScale: {
        borderColor: '#1e2028',
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    seriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chartRef.current?.remove();
    };
  }, []);

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 60000);
    return () => clearInterval(interval);
  }, [ticker, activeTf]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/history?sym=${ticker}&tf=${activeTf}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        seriesRef.current?.setData(data);
        chartRef.current?.timeScale().fitContent();
        const last = data[data.length - 1];
        const first = data[0];
        setCurrentPrice(last.close);
        setChg(+((last.close - first.close) / first.close * 100).toFixed(2));
      }
    } catch (e) {
      console.error('Erreur history:', e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{
        padding: '8px 14px',
        background: '#0d0d14',
        borderBottom: '1px solid #1e2028',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexShrink: 0
      }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '16px', fontWeight: 600, color: '#f0c040' }}>{ticker}</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '16px', color: '#e0e8f0' }}>{currentPrice.toFixed(2)}</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: chg >= 0 ? '#22c55e' : '#ef4444' }}>
          {chg >= 0 ? '+' : ''}{chg}%
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          {timeframes.map(tf => (
            <button key={tf} onClick={() => setActiveTf(tf)} style={{
              padding: '3px 8px',
              fontSize: '10px',
              fontFamily: 'JetBrains Mono, monospace',
              background: activeTf === tf ? '#1a1a24' : 'transparent',
              border: `1px solid ${activeTf === tf ? '#f0c040' : '#2a2a38'}`,
              color: activeTf === tf ? '#f0c040' : '#6b7280',
              cursor: 'pointer',
              borderRadius: '3px'
            }}>{tf}</button>
          ))}
        </div>
      </div>
      <div ref={containerRef} style={{ flex: 1, position: 'relative', background: '#0a0a0f' }} />
    </div>
  );
}

export default Chart;