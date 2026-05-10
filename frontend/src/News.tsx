import React, { useEffect, useState } from 'react';
import EconomicCalendar from './widgets/EconomicCalendar';

interface NewsItem {
  title: string;
  source: string;
  url: string;
  time: string;
  sector: string;
  ticker: string;
  sentiment: string;
  sentiment_score: number;
  has_content?: boolean;
}

interface WeeklyRecap {
  recap: string;
  performance: { sym: string; chg: number }[];
}

const SECTORS = ['All', 'Tech', 'Finance', 'Macro', 'Crypto'];

// Highlights key financial terms and numbers
function HighlightedText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div>
      {lines.map((line, i) => {
        // Highlight numbers with % or $
        const parts = line.split(/(\+\d+\.?\d*%|-\d+\.?\d*%|\$[\d,]+\.?\d*|\d+\.?\d*%|\*\*[^*]+\*\*|##[^\n]+)/g);
        return (
          <span key={i}>
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j} style={{ color: '#f0c040', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
              }
              if (part.startsWith('##')) {
                return <strong key={j} style={{ color: '#f0c040', fontWeight: 600, display: 'block', marginTop: '8px' }}>{part.replace('##', '').trim()}</strong>;
              }
              if (part.startsWith('+') && part.includes('%')) {
                return <span key={j} style={{ color: '#22c55e', fontWeight: 600 }}>{part}</span>;
              }
              if (part.startsWith('-') && part.includes('%')) {
                return <span key={j} style={{ color: '#ef4444', fontWeight: 600 }}>{part}</span>;
              }
              if (part.includes('%') || part.includes('$')) {
                return <span key={j} style={{ color: '#e0e8f0', fontWeight: 600 }}>{part}</span>;
              }
              return <span key={j}>{part}</span>;
            })}
            {i < lines.length - 1 && <br />}
          </span>
        );
      })}
    </div>
  );
}

function News() {
  const [news, setNews]                     = useState<NewsItem[]>([]);
  const [loading, setLoading]               = useState(true);
  const [selected, setSelected]             = useState<NewsItem | null>(null);
  const [filter, setFilter]                 = useState('All');
  const [weeklyRecap, setWeeklyRecap]       = useState<WeeklyRecap | null>(null);
  const [digest, setDigest]                 = useState<string>('');
  const [articleSummary, setArticleSummary] = useState<string>('');
  const [summarizing, setSummarizing]       = useState(false);
  const [loadingRecap, setLoadingRecap]     = useState(true);
  const [loadingDigest, setLoadingDigest]   = useState(true);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/news_feed')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setNews(d); setLoading(false); })
      .catch(() => setLoading(false));

    fetch('http://127.0.0.1:8000/weekly_recap')
      .then(r => r.json())
      .then(d => { setWeeklyRecap(d); setLoadingRecap(false); })
      .catch(() => setLoadingRecap(false));

    fetch('http://127.0.0.1:8000/yesterday_digest')
      .then(r => r.json())
      .then(d => { setDigest(d.digest); setLoadingDigest(false); })
      .catch(() => setLoadingDigest(false));
  }, []);

  const handleSelectArticle = async (n: NewsItem) => {
    setSelected(n);
    setArticleSummary('');
    setSummarizing(true);
    try {
      const res  = await fetch(`http://127.0.0.1:8000/summarize_article?title=${encodeURIComponent(n.title)}&url=${encodeURIComponent(n.url)}`);
      const data = await res.json();
      setArticleSummary(data.summary);
      setSelected(prev => prev ? { ...prev, has_content: data.has_content } : prev);
    } catch {}
    setSummarizing(false);
  };

  const filtered = filter === 'All' ? news : news.filter(n => n.sector === filter);

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' +
             d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch { return '' }
  };

  const sentimentColor = (s: string) =>
    s === 'bullish' ? '#22c55e' : s === 'bearish' ? '#ef4444' : '#f0c040';

  const sentimentBg = (s: string) =>
    s === 'bullish' ? '#052010' : s === 'bearish' ? '#200505' : '#1a1a10';

  const panelTitle = (t: string) => (
    <div style={{ fontSize: '9px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', marginBottom: '10px', fontFamily: 'JetBrains Mono, monospace' }}>{t}</div>
  );

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
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left — News feed */}
        <div style={{ width: '280px', borderRight: '1px solid #1e2028', overflowY: 'auto', flexShrink: 0 }}>
          {loading ? (
            <div style={{ padding: '20px', fontSize: '11px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>
              Loading news + sentiment...
            </div>
          ) : filtered.map((n, i) => (
            <div
              key={i}
              onClick={() => handleSelectArticle(n)}
              style={{
                padding: '10px 12px', borderBottom: '1px solid #13131a', cursor: 'pointer',
                background: selected?.title === n.title ? '#14141f' : 'transparent',
                borderLeft: selected?.title === n.title ? '2px solid #f0c040' : '2px solid transparent',
              }}
            >
              <div style={{ display: 'flex', gap: '4px', marginBottom: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '8px', padding: '2px 4px', borderRadius: '2px', fontWeight: 600, background: '#1a1a24', color: '#f0c040', fontFamily: 'JetBrains Mono, monospace' }}>{n.sector}</span>
                <span style={{ fontSize: '8px', padding: '2px 4px', borderRadius: '2px', background: '#13131a', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>{n.ticker}</span>
                <span style={{ fontSize: '8px', padding: '2px 4px', borderRadius: '2px', fontWeight: 600, background: sentimentBg(n.sentiment), color: sentimentColor(n.sentiment), fontFamily: 'JetBrains Mono, monospace', marginLeft: 'auto' }}>
                  {n.sentiment?.toUpperCase()}
                </span>
              </div>
              <div
                style={{ fontSize: '11px', color: '#c8d0db', lineHeight: 1.4, marginBottom: '4px' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f0c040')}
                onMouseLeave={e => (e.currentTarget.style.color = '#c8d0db')}
              >{n.title}</div>
              <div style={{ fontSize: '9px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>
                {n.source} · {formatTime(n.time)}
              </div>
            </div>
          ))}
        </div>

        {/* Right */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Weekly + Digest — bigger panels */}
          <div style={{ display: 'flex', flex: 1, borderBottom: '1px solid #1e2028', minHeight: 0 }}>

            {/* Weekly Recap */}
            <div style={{ flex: 1, padding: '14px 18px', borderRight: '1px solid #1e2028', overflowY: 'auto', background: '#0d0d14' }}>
              {panelTitle('WEEKLY MARKET RECAP — AI ANALYSIS')}
              {weeklyRecap && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                  {weeklyRecap.performance.map(p => (
                    <span key={p.sym} style={{
                      fontSize: '10px', padding: '3px 8px', borderRadius: '3px',
                      fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
                      background: p.chg >= 0 ? '#052010' : '#200505',
                      color: p.chg >= 0 ? '#22c55e' : '#ef4444',
                    }}>
                      {p.sym} {p.chg >= 0 ? '+' : ''}{p.chg}%
                    </span>
                  ))}
                </div>
              )}
              {loadingRecap ? (
                <div style={{ fontSize: '11px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>Generating weekly recap...</div>
              ) : (
                <div style={{ fontSize: '12px', color: '#c8d0db', lineHeight: 1.8 }}>
                  <HighlightedText text={weeklyRecap?.recap ?? ''} />
                </div>
              )}
            </div>

            {/* Yesterday Digest */}
            <div style={{ flex: 1, padding: '14px 18px', overflowY: 'auto', background: '#0d0d14' }}>
              {panelTitle("YESTERDAY'S DIGEST — AI ANALYSIS")}
              {loadingDigest ? (
                <div style={{ fontSize: '11px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>Generating digest...</div>
              ) : (
                <div style={{ fontSize: '12px', color: '#c8d0db', lineHeight: 1.8 }}>
                  <HighlightedText text={digest} />
                </div>
              )}
            </div>
          </div>

          {/* Economic Calendar — compact */}
          <div style={{ height: '160px', borderBottom: '1px solid #1e2028', flexShrink: 0, overflow: 'hidden' }}>
            <EconomicCalendar />
          </div>

          {/* Article AI Summary — compact */}
          <div style={{ height: '180px', padding: '10px 16px', overflowY: 'auto', background: '#0a0a0f', flexShrink: 0 }}>
            {!selected ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>📰</span>
                <span style={{ fontSize: '11px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>
                  Click an article for AI summary
                </span>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: '#f0c040', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                    {selected.title}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '9px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>
                    {selected.source} · {formatTime(selected.time)}
                  </span>
                  <span style={{ fontSize: '8px', padding: '1px 5px', borderRadius: '2px', fontWeight: 600, background: sentimentBg(selected.sentiment), color: sentimentColor(selected.sentiment), fontFamily: 'JetBrains Mono, monospace' }}>
                    {selected.sentiment?.toUpperCase()}
                  </span>
                  {selected.has_content !== undefined && (
                    <span style={{
                      fontSize: '8px', padding: '1px 6px', borderRadius: '2px',
                      fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
                      background: selected.has_content ? '#052010' : '#1a1a10',
                      color: selected.has_content ? '#22c55e' : '#f0c040',
                    }}>
                      {selected.has_content ? '✓ FULL CONTENT' : '⚠ HEADLINE ONLY'}
                    </span>
                  )}
                </div>
                {summarizing ? (
                  <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>
                    Fetching article + generating AI summary...
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: '#c8d0db', lineHeight: 1.7 }}>
                    <HighlightedText text={articleSummary} />
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default News;