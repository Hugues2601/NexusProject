import React, { useEffect, useState } from 'react';

interface NewsItem {
  title: string;
  source: string;
  url: string;
  time: string;
}

interface Fundamentals {
  market_cap: number;
  pe_ratio: number;
  eps: number;
  div_yield: number;
  week52_high: number;
  week52_low: number;
  volume: number;
  avg_volume: number;
  beta: number;
  sector: string;
}

interface Statistics {
  open: number;
  high: number;
  low: number;
  prev_close: number;
  avg_50: number;
  avg_200: number;
}

interface BottomPanelsProps {
  ticker: string;
}

function formatNumber(n: number): string {
  if (!n) return 'N/A';
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(2) + 'M';
  return n.toLocaleString();
}

function BottomPanels({ ticker }: BottomPanelsProps) {
  const [news, setNews]               = useState<NewsItem[]>([]);
  const [fundamentals, setFundamentals] = useState<Fundamentals | null>(null);
  const [stats, setStats]             = useState<Statistics | null>(null);

  const fetchAll = async () => {
    try {
      const [newsRes, fundRes, statsRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/news?sym=${ticker}`),
        fetch(`http://127.0.0.1:8000/fundamentals?sym=${ticker}`),
        fetch(`http://127.0.0.1:8000/statistics?sym=${ticker}`),
      ]);
      const newsData  = await newsRes.json();
      const fundData  = await fundRes.json();
      const statsData = await statsRes.json();
      if (Array.isArray(newsData)) setNews(newsData);
      setFundamentals(fundData);
      setStats(statsData);
    } catch (e) {
      console.error('Erreur fetch:', e);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [ticker]);

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' ' +
             d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch { return '' }
  };

  const fundFields = fundamentals ? [
    { label: 'Market Cap', val: formatNumber(fundamentals.market_cap) },
    { label: 'P/E Ratio',  val: fundamentals.pe_ratio?.toFixed(2)  ?? 'N/A' },
    { label: 'EPS',        val: fundamentals.eps?.toFixed(2)        ?? 'N/A' },
    { label: 'Div Yield',  val: fundamentals.div_yield ? (fundamentals.div_yield * 100).toFixed(2) + '%' : 'N/A' },
    { label: '52W High',   val: fundamentals.week52_high?.toFixed(2) ?? 'N/A' },
    { label: '52W Low',    val: fundamentals.week52_low?.toFixed(2)  ?? 'N/A' },
    { label: 'Volume',     val: formatNumber(fundamentals.volume) },
    { label: 'Avg Volume', val: formatNumber(fundamentals.avg_volume) },
    { label: 'Beta',       val: fundamentals.beta?.toFixed(2) ?? 'N/A' },
    { label: 'Sector',     val: fundamentals.sector ?? 'N/A' },
  ] : [];

  return (
    <div style={{ height: '200px', display: 'flex', borderTop: '1px solid #1e2028', flexShrink: 0 }}>

      {/* Price Statistics */}
      <div style={{ flex: 1, background: '#0d0d14', borderRight: '1px solid #1e2028', padding: '8px 12px' }}>
        <div style={{ fontSize: '9px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', marginBottom: '8px' }}>
          PRICE STATS — {ticker}
        </div>
        {stats ? [
          { label: 'Open',       val: stats.open?.toFixed(2)       ?? 'N/A' },
          { label: 'High',       val: stats.high?.toFixed(2)       ?? 'N/A' },
          { label: 'Low',        val: stats.low?.toFixed(2)        ?? 'N/A' },
          { label: 'Prev Close', val: stats.prev_close?.toFixed(2) ?? 'N/A' },
          { label: 'Avg 50D',    val: stats.avg_50?.toFixed(2)     ?? 'N/A' },
          { label: 'Avg 200D',   val: stats.avg_200?.toFixed(2)    ?? 'N/A' },
        ].map(f => (
          <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>{f.label}</span>
            <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: '#c8d0db' }}>{f.val}</span>
          </div>
        )) : (
          <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>Chargement...</div>
        )}
      </div>

      {/* Fundamentals */}
      <div style={{ flex: 1, background: '#0d0d14', borderRight: '1px solid #1e2028', padding: '8px 12px', overflowY: 'auto' }}>
        <div style={{ fontSize: '9px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', marginBottom: '8px' }}>
          FUNDAMENTALS — {ticker}
        </div>
        {fundFields.length === 0 ? (
          <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>Chargement...</div>
        ) : (
          fundFields.map(f => (
            <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>{f.label}</span>
              <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: '#c8d0db' }}>{f.val}</span>
            </div>
          ))
        )}
      </div>

      {/* News */}
      <div style={{ flex: 2, background: '#0d0d14', padding: '8px 12px', overflowY: 'auto' }}>
        <div style={{ fontSize: '9px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', marginBottom: '8px' }}>
          NEWS — {ticker}
        </div>
        {news.length === 0 ? (
          <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>Chargement...</div>
        ) : (
          news.map((n, i) => (
            <div
              key={i}
              onClick={() => n.url && window.open(n.url, '_blank')}
              style={{ paddingBottom: '8px', marginBottom: '8px', borderBottom: '1px solid #13131a', cursor: n.url ? 'pointer' : 'default' }}
            >
              <div
                style={{ fontSize: '11px', color: '#c8d0db', lineHeight: 1.4, marginBottom: '3px' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f0c040')}
                onMouseLeave={e => (e.currentTarget.style.color = '#c8d0db')}
              >
                {n.title}
              </div>
              <div style={{ fontSize: '9px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>
                {n.source} · {formatTime(n.time)}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}

export default BottomPanels;