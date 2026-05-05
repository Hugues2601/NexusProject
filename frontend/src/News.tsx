import React, { useEffect, useState } from 'react';

interface NewsItem {
  title: string;
  source: string;
  url: string;
  time: string;
  sector: string;
  ticker: string;
  sentiment: string;
  sentiment_score: number;
}

const SECTORS = ['All', 'Tech', 'Finance', 'Macro', 'Crypto'];

function News() {
  const [news, setNews]           = useState<NewsItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<NewsItem | null>(null);
  const [filter, setFilter]       = useState('All');

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res  = await fetch('http://127.0.0.1:8000/news_feed');
      const data = await res.json();
      if (Array.isArray(data)) setNews(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchNews(); }, []);

  const filtered = filter === 'All' ? news : news.filter(n => n.sector === filter);

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' ' +
             d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch { return '' }
  };

  const sentimentColor = (s: string) =>
    s === 'bullish' ? '#22c55e' : s === 'bearish' ? '#ef4444' : '#f0c040';

  const sentimentBg = (s: string) =>
    s === 'bullish' ? '#052010' : s === 'bearish' ? '#200505' : '#1a1a10';

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>

      {/* Filter bar */}
      <div style={{
        height: '36px', background: '#0d0d14', borderBottom: '1px solid #1e2028',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: '8px', flexShrink: 0,
      }}>
        {SECTORS.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '4px 12px', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace',
            background: filter === s ? '#1a1a24' : 'transparent',
            border: `1px solid ${filter === s ? '#f0c040' : '#2a2a38'}`,
            color: filter === s ? '#f0c040' : '#6b7280',
            cursor: 'pointer', borderRadius: '3px',
          }}>{s}</button>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>
          {filtered.length} articles
        </div>
        <button onClick={fetchNews} style={{
          padding: '4px 12px', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace',
          background: 'transparent', border: '1px solid #2a2a38', color: '#6b7280',
          cursor: 'pointer', borderRadius: '3px',
        }}>↻ Refresh</button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* News feed */}
        <div style={{
          width: '420px', borderRight: '1px solid #1e2028',
          overflowY: 'auto', flexShrink: 0,
        }}>
          {loading ? (
            <div style={{ padding: '20px', fontSize: '11px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>
              Chargement des news + analyse sentiment...
            </div>
          ) : filtered.map((n, i) => (
            <div
              key={i}
              onClick={() => setSelected(n)}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #13131a',
                cursor: 'pointer',
                background: selected?.title === n.title ? '#14141f' : 'transparent',
                borderLeft: selected?.title === n.title ? '2px solid #f0c040' : '2px solid transparent',
              }}
            >
              {/* Sector + Ticker badges */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                <span style={{
                  fontSize: '8px', padding: '2px 6px', borderRadius: '2px', fontWeight: 600,
                  background: '#1a1a24', color: '#f0c040', fontFamily: 'JetBrains Mono, monospace',
                }}>{n.sector}</span>
                <span style={{
                  fontSize: '8px', padding: '2px 6px', borderRadius: '2px',
                  background: '#13131a', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace',
                }}>{n.ticker}</span>
                <span style={{
                  fontSize: '8px', padding: '2px 6px', borderRadius: '2px', fontWeight: 600,
                  background: sentimentBg(n.sentiment), color: sentimentColor(n.sentiment),
                  fontFamily: 'JetBrains Mono, monospace', marginLeft: 'auto',
                }}>{n.sentiment?.toUpperCase()}</span>
              </div>

              {/* Title */}
              <div
                style={{ fontSize: '11px', color: '#c8d0db', lineHeight: 1.4, marginBottom: '6px' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f0c040')}
                onMouseLeave={e => (e.currentTarget.style.color = '#c8d0db')}
              >
                {n.title}
              </div>

              {/* Meta */}
              <div style={{ fontSize: '9px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>
                {n.source} · {formatTime(n.time)}
              </div>
            </div>
          ))}
        </div>

        {/* Article detail */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {!selected ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '32px' }}>📰</div>
              <div style={{ fontSize: '12px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>
                Sélectionne un article
              </div>
            </div>
          ) : (
            <div>
              {/* Badges */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '9px', padding: '3px 8px', borderRadius: '3px', background: '#1a1a24', color: '#f0c040', fontFamily: 'JetBrains Mono, monospace' }}>
                  {selected.sector}
                </span>
                <span style={{ fontSize: '9px', padding: '3px 8px', borderRadius: '3px', background: '#13131a', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>
                  {selected.ticker}
                </span>
                <span style={{
                  fontSize: '9px', padding: '3px 8px', borderRadius: '3px', fontWeight: 600,
                  background: sentimentBg(selected.sentiment), color: sentimentColor(selected.sentiment),
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  {selected.sentiment?.toUpperCase()} ({selected.sentiment_score > 0 ? '+' : ''}{selected.sentiment_score})
                </span>
              </div>

              {/* Title */}
              <div style={{ fontSize: '18px', color: '#e0e8f0', lineHeight: 1.4, marginBottom: '12px', fontWeight: 500 }}>
                {selected.title}
              </div>

              {/* Meta */}
              <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace', marginBottom: '24px' }}>
                {selected.source} · {formatTime(selected.time)}
              </div>

              {/* Sentiment bar */}
              <div style={{ marginBottom: '24px', padding: '16px', background: '#0d0d14', borderRadius: '8px', border: '1px solid #1e2028' }}>
                <div style={{ fontSize: '9px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', marginBottom: '10px' }}>
                  SENTIMENT ANALYSIS (FinBERT)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1, height: '8px', background: '#1a1a24', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.abs(selected.sentiment_score) * 100}%`,
                      background: sentimentColor(selected.sentiment),
                      borderRadius: '4px',
                      marginLeft: selected.sentiment_score < 0 ? `${(1 - Math.abs(selected.sentiment_score)) * 100}%` : '0',
                    }} />
                  </div>
                  <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: sentimentColor(selected.sentiment), minWidth: '60px' }}>
                    {selected.sentiment_score > 0 ? '+' : ''}{selected.sentiment_score}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span style={{ fontSize: '9px', color: '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>BEARISH</span>
                  <span style={{ fontSize: '9px', color: '#f0c040', fontFamily: 'JetBrains Mono, monospace' }}>NEUTRAL</span>
                  <span style={{ fontSize: '9px', color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' }}>BULLISH</span>
                </div>
              </div>

              {/* Read full article */}
              {selected.url && (
                <button
                  onClick={() => window.open(selected.url, '_blank')}
                  style={{
                    background: '#f0c040', border: 'none', borderRadius: '4px',
                    padding: '10px 20px', fontSize: '11px', color: '#0a0a0f',
                    cursor: 'pointer', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  Lire l'article complet →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default News;