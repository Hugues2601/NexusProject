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
  const [news, setNews] = useState<NewsItem[]>([]);
  const [fundamentals, setFundamentals] = useState<Fundamentals | null>(null);

  const fetchNews = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/news?sym=${ticker}`);
      const data = await res.json();
      if (Array.isArray(data)) setNews(data);
    } catch (e) {
      console.error('Erreur news:', e);
    }
  };

  const fetchFundamentals = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/fundamentals?sym=${ticker}`);
      const data = await res.json();
      setFundamentals(data);
    } catch (e) {
      console.error('Erreur fundamentals:', e);
    }
  };

  useEffect(() => {
    fetchNews();
    fetchFundamentals();
  }, [ticker]);

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' ' +
             d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch { return '' }
  };

  const fields = fundamentals ? [
    { label: 'Market Cap',  val: formatNumber(fundamentals.market_cap) },
    { label: 'P/E Ratio',   val: fundamentals.pe_ratio?.toFixed(2) ?? 'N/A' },
    { label: 'EPS',         val: fundamentals.eps?.toFixed(2) ?? 'N/A' },
    { label: 'Div Yield',   val: fundamentals.div_yield ? (fundamentals.div_yield * 100).toFixed(2) + '%' : 'N/A' },
    { label: '52W High',    val: fundamentals.week52_high?.toFixed(2) ?? 'N/A' },
    { label: '52W Low',     val: fundamentals.week52_low?.toFixed(2) ?? 'N/A' },
    { label: 'Volume',      val: formatNumber(fundamentals.volume) },
    { label: 'Avg Volume',  val: formatNumber(fundamentals.avg_volume) },
    { label: 'Beta',        val: fundamentals.beta?.toFixed(2) ?? 'N/A' },
    { label: 'Sector',      val: fundamentals.sector ?? 'N/A' },
  ] : [];

  return (
    <div style={{
      height: '200px',
      display: 'flex',
      borderTop: '1px solid #1e2028',
      flexShrink: 0
    }}>

      {/* Greeks */}
      <div style={{ flex: 1, background: '#0d0d14', borderRight: '1px solid #1e2028', padding: '8px 12px' }}>
        <div style={{ fontSize: '9px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', marginBottom: '8px' }}>GREEKS (ATM)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          {[
            { name: 'Δ Delta', val: '0.5312', up: true  },
            { name: 'Γ Gamma', val: '0.0241', up: false },
            { name: 'Θ Theta', val: '-0.0821',up: false },
            { name: 'ν Vega',  val: '0.1432', up: false },
            { name: 'ρ Rho',   val: '0.0621', up: false },
            { name: 'IV',      val: '24.3%',  up: false },
          ].map(g => (
            <div key={g.name} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>{g.name}</span>
              <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: g.up ? '#22c55e' : '#c8d0db' }}>{g.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fundamentals */}
      <div style={{ flex: 1, background: '#0d0d14', borderRight: '1px solid #1e2028', padding: '8px 12px', overflowY: 'auto' }}>
        <div style={{ fontSize: '9px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', marginBottom: '8px' }}>
          FUNDAMENTALS — {ticker}
        </div>
        {fields.length === 0 ? (
          <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>Chargement...</div>
        ) : (
          fields.map(f => (
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
              style={{
                paddingBottom: '8px',
                marginBottom: '8px',
                borderBottom: '1px solid #13131a',
                cursor: n.url ? 'pointer' : 'default',
              }}
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