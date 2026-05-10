import React, { useEffect, useState } from 'react';

interface Index {
  name: string;
  sym: string;
  price: number;
  chg: number;
}

const FEATURES = [
  {
    icon: '◈',
    title: 'Real-Time Market Data',
    desc: 'Live prices across equities, forex, crypto, commodities and fixed income. Autocomplete search across 10,000+ assets.',
    color: '#f0c040',
  },
  {
    icon: '⬡',
    title: 'C++ Core Engine',
    desc: 'Black-Scholes pricing, Greeks computation, VaR, Sharpe, Max Drawdown — all calculated by a high-performance C++ engine.',
    color: '#22c55e',
  },
  {
    icon: '◉',
    title: 'AI Investment Advisor',
    desc: 'Random Forest ML + FinBERT NLP sentiment + Claude AI synthesis. Full quantitative scoring across 6 dimensions.',
    color: '#3b82f6',
  },
  {
    icon: '▣',
    title: 'Options & Derivatives',
    desc: 'Live options chain, 3D implied volatility surface, Greeks panel, Black-Scholes calculator powered by C++.',
    color: '#a855f7',
  },
  {
    icon: '◎',
    title: 'Portfolio Analytics',
    desc: 'Real P&L tracking, Markowitz correlation matrix, VaR computation, portfolio vs S&P 500 performance chart.',
    color: '#06b6d4',
  },
  {
    icon: '⬢',
    title: 'Macro Intelligence',
    desc: 'FRED data integration, Sahm Rule, yield curve, recession watch, economic calendar with next release dates.',
    color: '#f97316',
  },
  {
    icon: '◐',
    title: 'News & AI Digest',
    desc: 'Multi-source news feed with FinBERT sentiment scoring, AI weekly recap, daily digest and article summaries.',
    color: '#ec4899',
  },
  {
    icon: '◫',
    title: 'Floating Widgets',
    desc: 'FX Matrix, VIX chart, Fear & Greed index, World Markets, Sector Heatmap — all as draggable overlay windows.',
    color: '#84cc16',
  },
];

const TECH_STACK = [
  { label: 'Core Engine',  items: ['C++20', 'Black-Scholes', 'Greeks', 'VaR', 'Monte Carlo'] },
  { label: 'Backend',      items: ['Python', 'FastAPI', 'yfinance', 'FinBERT', 'scikit-learn'] },
  { label: 'Frontend',     items: ['React', 'TypeScript', 'TradingView Charts', 'Plotly 3D', 'Recharts'] },
  { label: 'Data Sources', items: ['Yahoo Finance', 'FRED API', 'Groq AI', 'Claude AI', 'newspaper3k'] },
];

const INDICES = [
  { name: 'S&P 500',    sym: '^GSPC' },
  { name: 'Nasdaq',     sym: '^IXIC' },
  { name: 'Dow Jones',  sym: '^DJI'  },
  { name: 'Russell 2000', sym: '^RUT' },
  { name: 'CAC 40',     sym: '^FCHI' },
  { name: 'DAX',        sym: '^GDAXI'},
  { name: 'Nikkei 225', sym: '^N225' },
  { name: 'VIX',        sym: '^VIX'  },
];

interface LandingProps {
  onEnter: () => void;
}

function TradingBackground() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let t = 0;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Generate multiple trading curves with different params
    const curves = [
      { amp: 80,  freq: 0.008, speed: 0.012, phase: 0,    y: 0.35, color: 'rgba(240,192,64,0.15)',  width: 1.5 },
      { amp: 50,  freq: 0.012, speed: 0.018, phase: 2,    y: 0.55, color: 'rgba(34,197,94,0.10)',   width: 1   },
      { amp: 100, freq: 0.006, speed: 0.008, phase: 4,    y: 0.45, color: 'rgba(240,192,64,0.06)',  width: 2   },
      { amp: 40,  freq: 0.018, speed: 0.025, phase: 1,    y: 0.65, color: 'rgba(59,130,246,0.08)',  width: 1   },
      { amp: 60,  freq: 0.010, speed: 0.015, phase: 3,    y: 0.30, color: 'rgba(239,68,68,0.07)',   width: 1   },
      { amp: 30,  freq: 0.020, speed: 0.030, phase: 5,    y: 0.70, color: 'rgba(240,192,64,0.05)',  width: 0.5 },
    ];

    // Candlestick data simulation
    const candles: { x: number; open: number; close: number; high: number; low: number; bull: boolean }[] = [];
    const CANDLE_W = 12;
    const CANDLE_GAP = 6;
    const CANDLE_COUNT = Math.ceil(window.innerWidth / (CANDLE_W + CANDLE_GAP)) + 2;
    let lastClose = 0.5;
    for (let i = 0; i < CANDLE_COUNT; i++) {
      const change = (Math.random() - 0.48) * 0.06;
      const open   = lastClose;
      const close  = Math.max(0.1, Math.min(0.9, open + change));
      const high   = Math.max(open, close) + Math.random() * 0.03;
      const low    = Math.min(open, close) - Math.random() * 0.03;
      candles.push({ x: i * (CANDLE_W + CANDLE_GAP), open, close, high, low, bull: close >= open });
      lastClose = close;
    }

    // Scrolling candle offset
    let candleOffset = 0;

    const draw = () => {
      if (!canvas || !ctx) return;
      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);

      // ── Draw sinusoidal trading curves ──
      curves.forEach(c => {
        ctx.beginPath();
        ctx.strokeStyle = c.color;
        ctx.lineWidth   = c.width;

        const baseY = H * c.y;
        for (let x = 0; x <= W; x += 2) {
          // Combine multiple sine waves for realistic market noise
          const y = baseY
            + Math.sin(x * c.freq + t * c.speed + c.phase) * c.amp
            + Math.sin(x * c.freq * 2.3 + t * c.speed * 1.7 + c.phase) * c.amp * 0.3
            + Math.sin(x * c.freq * 0.5 + t * c.speed * 0.6 + c.phase) * c.amp * 0.5;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Fill area under the main curve
        ctx.beginPath();
        const baseY2 = H * c.y;
        ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 2) {
          const y = baseY2
            + Math.sin(x * c.freq + t * c.speed + c.phase) * c.amp
            + Math.sin(x * c.freq * 2.3 + t * c.speed * 1.7 + c.phase) * c.amp * 0.3
            + Math.sin(x * c.freq * 0.5 + t * c.speed * 0.6 + c.phase) * c.amp * 0.5;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fillStyle = c.color.replace('0.', '0.0').replace('0.00', '0.0');
        ctx.fill();
      });

      // ── Draw scrolling candlesticks at the bottom ──
      const CANDLE_Y_BASE = H * 0.82;
      const CANDLE_H_SCALE = H * 0.12;
      candleOffset = (candleOffset + 0.3) % (CANDLE_W + CANDLE_GAP);

      candles.forEach((c, i) => {
        const x = c.x - candleOffset;
        if (x < -CANDLE_W || x > W + CANDLE_W) return;

        const openY  = CANDLE_Y_BASE - c.open  * CANDLE_H_SCALE;
        const closeY = CANDLE_Y_BASE - c.close * CANDLE_H_SCALE;
        const highY  = CANDLE_Y_BASE - c.high  * CANDLE_H_SCALE;
        const lowY   = CANDLE_Y_BASE - c.low   * CANDLE_H_SCALE;

        const color = c.bull ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.20)';

        // Wick
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth   = 0.5;
        ctx.moveTo(x + CANDLE_W / 2, highY);
        ctx.lineTo(x + CANDLE_W / 2, lowY);
        ctx.stroke();

        // Body
        ctx.fillStyle = color;
        const bodyTop = Math.min(openY, closeY);
        const bodyH   = Math.max(Math.abs(closeY - openY), 1);
        ctx.fillRect(x, bodyTop, CANDLE_W, bodyH);
      });

      // ── Draw floating price labels ──
      const labels = [
        { x: W * 0.15, y: H * 0.25, text: '+2.34%', color: 'rgba(34,197,94,0.3)'  },
        { x: W * 0.40, y: H * 0.18, text: 'SPY',    color: 'rgba(240,192,64,0.2)' },
        { x: W * 0.65, y: H * 0.30, text: '-0.87%', color: 'rgba(239,68,68,0.25)' },
        { x: W * 0.80, y: H * 0.22, text: 'NVDA',   color: 'rgba(240,192,64,0.2)' },
        { x: W * 0.25, y: H * 0.75, text: 'IV 24%', color: 'rgba(59,130,246,0.2)' },
        { x: W * 0.55, y: H * 0.80, text: 'VIX',    color: 'rgba(240,192,64,0.2)' },
      ];

      labels.forEach(l => {
        const float = Math.sin(t * 0.01 + l.x) * 6;
        ctx.font      = '11px JetBrains Mono, monospace';
        ctx.fillStyle = l.color;
        ctx.fillText(l.text, l.x, l.y + float);
      });

      // ── Draw grid lines ──
      ctx.strokeStyle = 'rgba(240,192,64,0.03)';
      ctx.lineWidth   = 0.5;
      for (let y = 0; y < H; y += 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      for (let x = 0; x < W; x += 80) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }

      t += 1;
      animFrame = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        zIndex: 0, pointerEvents: 'none',
      }}
    />
  );
}

function Landing({ onEnter }: LandingProps) {
  const [indices, setIndices] = useState<Index[]>([]);
  const [visible, setVisible] = useState(false);
  const [time, setTime]       = useState(new Date());

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);

    // Fetch indices
    fetch('http://127.0.0.1:8000/world_markets')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const filtered = INDICES.map(idx => {
            const found = data.find((d: any) => d.sym === idx.sym);
            return found ? { name: idx.name, sym: idx.sym, price: found.price, chg: found.chg } : null;
          }).filter(Boolean) as Index[];
          setIndices(filtered);
        }
      })
      .catch(() => {});

    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#06060c',
      overflowY: 'auto', overflowX: 'hidden',
      fontFamily: "'JetBrains Mono', monospace",
      color: '#c8d0db',
    }}>

      {/* Top bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(6,6,12,0.95)', borderBottom: '1px solid #1e2028',
        backdropFilter: 'blur(10px)',
        padding: '0 40px', height: '48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#f0c040', letterSpacing: '3px' }}>MERIDIAN</span>
          <span style={{ fontSize: '10px', color: '#2a2a38', letterSpacing: '1px' }}>TERMINAL v1.0</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', color: '#e0e8f0', letterSpacing: '1px' }}>{formatTime(time)}</div>
            <div style={{ fontSize: '9px', color: '#4a5060' }}>{formatDate(time)}</div>
          </div>
          <button
            onClick={onEnter}
            style={{
              background: '#f0c040', border: 'none', borderRadius: '4px',
              padding: '8px 20px', fontSize: '11px', color: '#06060c',
              cursor: 'pointer', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '1px', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fcd34d'; e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f0c040'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            LAUNCH TERMINAL →
          </button>
        </div>
      </div>

      {/* Live indices ticker */}
      <div style={{
        position: 'fixed', top: '48px', left: 0, right: 0, zIndex: 99,
        background: '#080810', borderBottom: '1px solid #1e2028',
        height: '32px', display: 'flex', alignItems: 'center', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', animation: 'ticker 40s linear infinite', whiteSpace: 'nowrap' }}>
          {[...indices, ...indices].map((idx, i) => (
            <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0 24px', borderRight: '1px solid #1e2028' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#f0c040' }}>{idx.name}</span>
              <span style={{ fontSize: '11px', color: '#e0e8f0' }}>{idx.price?.toLocaleString()}</span>
              <span style={{ fontSize: '10px', color: idx.chg >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                {idx.chg >= 0 ? '▲' : '▼'}{Math.abs(idx.chg)}%
              </span>
            </div>
          ))}
        </div>
        <style>{`@keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
      </div>

      {/* Hero */}
      <div style={{
        paddingTop: '160px', paddingBottom: '80px', paddingLeft: '80px', paddingRight: '80px',
        minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        position: 'relative',
        opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.8s ease',
      }}>
        {/* Background grid */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: 'linear-gradient(rgba(240,192,64,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(240,192,64,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '11px', color: '#4a5060', letterSpacing: '4px', marginBottom: '20px' }}>
            PROFESSIONAL TRADING TERMINAL
          </div>

          <h1 style={{ fontSize: '72px', fontWeight: 700, lineHeight: 1.05, marginBottom: '24px', color: '#f0f4f8' }}>
            MERIDIAN<br />
            <span style={{ color: '#f0c040' }}>TERMINAL</span>
          </h1>

          <p style={{ fontSize: '16px', color: '#6b7280', lineHeight: 1.8, maxWidth: '560px', marginBottom: '40px', fontFamily: 'IBM Plex Sans, sans-serif' }}>
            A Bloomberg-grade financial terminal built from scratch.<br />
            C++ core engine, ML-powered AI advisor, real-time options chain,<br />
            3D volatility surface, macro intelligence — all in one platform.
          </p>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button
              onClick={onEnter}
              style={{
                background: '#f0c040', border: 'none', borderRadius: '4px',
                padding: '14px 32px', fontSize: '13px', color: '#06060c',
                cursor: 'pointer', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '1px',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fcd34d'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f0c040'; }}
            >
              LAUNCH TERMINAL →
            </button>
            <div style={{ fontSize: '11px', color: '#2a2a38', letterSpacing: '1px' }}>
              No login required · Local deployment
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '48px', marginTop: '60px', paddingTop: '40px', borderTop: '1px solid #1e2028' }}>
            {[
              { val: '6',    label: 'Trading Tabs'      },
              { val: '9+',   label: 'Live Widgets'      },
              { val: 'C++',  label: 'Core Engine'       },
              { val: 'ML',   label: 'AI-Powered'        },
              { val: 'FRED', label: 'Macro Data Source' },
              { val: '3D',   label: 'Vol Surface'       },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#f0c040', marginBottom: '4px' }}>{s.val}</div>
                <div style={{ fontSize: '10px', color: '#4a5060', letterSpacing: '1px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live indices grid */}
      <div style={{ padding: '0 80px 80px' }}>
        <div style={{ fontSize: '9px', color: '#4a5060', letterSpacing: '3px', marginBottom: '20px' }}>LIVE MARKET INDICES</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {indices.length === 0 ? (
            Array(8).fill(0).map((_, i) => (
              <div key={i} style={{ padding: '16px', background: '#0d0d14', borderRadius: '6px', border: '1px solid #1e2028', height: '80px' }} />
            ))
          ) : indices.map(idx => (
            <div key={idx.sym} style={{
              padding: '16px 20px', background: '#0d0d14',
              borderRadius: '6px', border: `1px solid ${idx.chg >= 0 ? '#052010' : '#200505'}`,
              borderLeft: `3px solid ${idx.chg >= 0 ? '#22c55e' : '#ef4444'}`,
            }}>
              <div style={{ fontSize: '10px', color: '#4a5060', marginBottom: '6px' }}>{idx.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#e0e8f0' }}>{idx.price?.toLocaleString()}</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: idx.chg >= 0 ? '#22c55e' : '#ef4444' }}>
                  {idx.chg >= 0 ? '+' : ''}{idx.chg}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ padding: '0 80px 80px' }}>
        <div style={{ fontSize: '9px', color: '#4a5060', letterSpacing: '3px', marginBottom: '20px' }}>PLATFORM FEATURES</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              style={{
                padding: '20px', background: '#0d0d14', borderRadius: '8px',
                border: '1px solid #1e2028', cursor: 'default',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = f.color;
                e.currentTarget.style.background  = '#111118';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#1e2028';
                e.currentTarget.style.background  = '#0d0d14';
              }}
            >
              <div style={{ fontSize: '20px', color: f.color, marginBottom: '10px' }}>{f.icon}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#e0e8f0', marginBottom: '8px', letterSpacing: '0.5px' }}>{f.title}</div>
              <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: 1.7, fontFamily: 'IBM Plex Sans, sans-serif' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div style={{ padding: '0 80px 80px' }}>
        <div style={{ fontSize: '9px', color: '#4a5060', letterSpacing: '3px', marginBottom: '20px' }}>TECHNOLOGY STACK</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {TECH_STACK.map((t, i) => (
            <div key={i} style={{ padding: '20px', background: '#0d0d14', borderRadius: '8px', border: '1px solid #1e2028' }}>
              <div style={{ fontSize: '10px', color: '#f0c040', letterSpacing: '2px', marginBottom: '14px', fontWeight: 600 }}>{t.label}</div>
              {t.items.map((item, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#f0c040', flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', color: '#c8d0db' }}>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Architecture */}
      <div style={{ padding: '0 80px 80px' }}>
        <div style={{ fontSize: '9px', color: '#4a5060', letterSpacing: '3px', marginBottom: '20px' }}>ARCHITECTURE</div>
        <div style={{ padding: '32px', background: '#0d0d14', borderRadius: '8px', border: '1px solid #1e2028' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', flexWrap: 'wrap' }}>
            {[
              { label: 'React + TypeScript', sub: 'Frontend', color: '#3b82f6' },
              { arrow: true },
              { label: 'FastAPI + Python', sub: 'API Gateway', color: '#22c55e' },
              { arrow: true },
              { label: 'C++ Engine', sub: 'Core Compute', color: '#f0c040' },
              { arrow: true },
              { label: 'FRED + yfinance', sub: 'Data Sources', color: '#a855f7' },
            ].map((item, i) => (
              'arrow' in item ? (
                <div key={i} style={{ fontSize: '20px', color: '#2a2a38', margin: '0 16px' }}>→</div>
              ) : (
                <div key={i} style={{
                  padding: '16px 24px', background: '#13131a',
                  borderRadius: '6px', border: `1px solid ${'color' in item ? item.color : '#1e2028'}22`,
                  textAlign: 'center', minWidth: '140px',
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'color' in item ? item.color : '#c8d0db', marginBottom: '4px' }}>
                    {'label' in item ? item.label : ''}
                  </div>
                  <div style={{ fontSize: '9px', color: '#4a5060', letterSpacing: '1px' }}>
                    {'sub' in item ? item.sub : ''}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{ padding: '60px 80px', borderTop: '1px solid #1e2028', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#f0c040', marginBottom: '8px' }}>Ready to trade smarter?</div>
          <div style={{ fontSize: '12px', color: '#4a5060' }}>Built with C++, Python, React — professional-grade financial terminal</div>
        </div>
        <button
          onClick={onEnter}
          style={{
            background: '#f0c040', border: 'none', borderRadius: '4px',
            padding: '16px 40px', fontSize: '13px', color: '#06060c',
            cursor: 'pointer', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: '1px',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fcd34d'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f0c040'; }}
        >
          LAUNCH TERMINAL →
        </button>
      </div>

      {/* Bottom bar */}
      <div style={{ padding: '20px 80px', borderTop: '1px solid #1e2028', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '10px', color: '#2a2a38' }}>MERIDIAN TERMINAL v1.0 — Built with C++, Python & React</span>
        <span style={{ fontSize: '10px', color: '#2a2a38' }}>Market data via Yahoo Finance · Macro data via FRED</span>
      </div>

    </div>
  );
}

export default Landing;