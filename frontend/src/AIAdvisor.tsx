import React, { useState } from 'react';

interface AnalysisData {
  sym: string;
  name: string;
  price: number;
  score: {
    final: number;
    signal: string;
    color: string;
    breakdown: Record<string, number>;
  };
  technical:   { score: number; details: any };
  fundamental: { score: number; details: any };
  risk:        { score: number; details: any };
  momentum:    { score: number; details: any };
  ml:          { prob_up: number; prob_down: number; accuracy: number; signal: string; importance: Record<string, number> };
  sentiment:   { score: number; label: string; raw: number };
  raw_data:    any;
  claude: {
    thesis: string;
    bull_case: string[];
    bear_case: string[];
    catalysts: string[];
    price_target: number | null;
    stop_loss: number | null;
    time_horizon: string;
    conviction: string;
  };
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
        <span style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>{label}</span>
        <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color }}>{score}/100</span>
      </div>
      <div style={{ height: '4px', background: '#1a1a24', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}

function AIAdvisor() {
  const [ticker, setTicker]   = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState<AnalysisData | null>(null);
  const [error, setError]     = useState('');
  const [stage, setStage]     = useState('');

  const analyze = async () => {
    const sym = ticker.toUpperCase().trim();
    if (!sym) return;
    setLoading(true); setError(''); setData(null);

    const stages = [
      'Fetching market data...',
      'Training Random Forest model...',
      'Running FinBERT sentiment analysis...',
      'Computing sub-scores...',
      'Generating AI synthesis...',
    ];

    let i = 0;
    setStage(stages[0]);
    const stageInterval = setInterval(() => {
      i = Math.min(i + 1, stages.length - 1);
      setStage(stages[i]);
    }, 15000);

    try {
      const res  = await fetch(`http://127.0.0.1:8000/claude_analysis?sym=${sym}`);
      const json = await res.json();
      clearInterval(stageInterval);
      if (json.error) { setError(json.error); setLoading(false); return; }
      setData(json);
    } catch (e) {
      clearInterval(stageInterval);
      setError('Erreur de connexion');
    }
    setLoading(false); setStage('');
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return '#22c55e';
    if (score >= 60) return '#86efac';
    if (score >= 45) return '#f0c040';
    if (score >= 30) return '#f87171';
    return '#ef4444';
  };

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: '#0a0a0f' }}>

      {/* Left — Search */}
      <div style={{
        width: '260px', background: '#0d0d14', borderRight: '1px solid #1e2028',
        padding: '16px', display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{ fontSize: '9px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', marginBottom: '12px' }}>
          AI INVESTMENT ADVISOR
        </div>
        <div style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace', marginBottom: '12px', lineHeight: 1.6 }}>
          Analyse complète basée sur :<br/>
          • Random Forest (ML)<br/>
          • FinBERT (NLP sentiment)<br/>
          • Indicateurs C++ (RSI, MACD...)<br/>
          • Fundamentals (P/E, ROE...)<br/>
          • Risk metrics (VaR, Sharpe...)<br/>
          • Momentum multi-timeframe<br/>
          • Synthèse Claude AI
        </div>

        <input
          value={ticker}
          onChange={e => setTicker(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && analyze()}
          placeholder="Ticker (ex: AAPL)"
          style={{
            background: '#1a1a24', border: '1px solid #2a2a38', borderRadius: '4px',
            padding: '8px', fontSize: '12px', color: '#c8d0db',
            fontFamily: 'JetBrains Mono, monospace', outline: 'none', marginBottom: '8px',
          }}
        />
        <button
          onClick={analyze}
          disabled={loading}
          style={{
            background: loading ? '#2a2a38' : '#f0c040', border: 'none', borderRadius: '4px',
            padding: '10px', fontSize: '12px', color: '#0a0a0f',
            cursor: loading ? 'wait' : 'pointer', fontWeight: 600,
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          {loading ? 'Analyzing...' : 'ANALYZE'}
        </button>

        {loading && stage && (
          <div style={{ marginTop: '16px', fontSize: '10px', color: '#f0c040', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.8 }}>
            <div style={{ marginBottom: '8px', color: '#4a5060' }}>Progress:</div>
            {stage}
            <div style={{ marginTop: '8px', height: '2px', background: '#1a1a24', borderRadius: '1px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#f0c040', borderRadius: '1px', animation: 'progress 2s ease infinite' }} />
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: '12px', fontSize: '10px', color: '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>
            {error}
          </div>
        )}

        {data && (
          <div style={{ marginTop: '24px', borderTop: '1px solid #1e2028', paddingTop: '16px' }}>
            <div style={{ fontSize: '9px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', marginBottom: '12px' }}>ML MODEL</div>
            <div style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace', marginBottom: '6px' }}>
              RF Accuracy: <span style={{ color: '#c8d0db' }}>{(data.ml.accuracy * 100).toFixed(1)}%</span>
            </div>
            <div style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace', marginBottom: '6px' }}>
              P(↑ 10d): <span style={{ color: data.ml.prob_up > 0.55 ? '#22c55e' : '#ef4444' }}>{(data.ml.prob_up * 100).toFixed(1)}%</span>
            </div>
            <div style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace', marginBottom: '12px' }}>
              Sentiment: <span style={{ color: data.sentiment.raw > 0 ? '#22c55e' : '#ef4444' }}>{data.sentiment.label}</span>
            </div>

            <div style={{ fontSize: '9px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', marginBottom: '8px' }}>TOP FEATURES</div>
            {Object.entries(data.ml.importance)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([k, v]) => (
                <div key={k} style={{ marginBottom: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontSize: '9px', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>{k}</span>
                    <span style={{ fontSize: '9px', color: '#c8d0db', fontFamily: 'JetBrains Mono, monospace' }}>{(v * 100).toFixed(1)}%</span>
                  </div>
                  <div style={{ height: '2px', background: '#1a1a24', borderRadius: '1px' }}>
                    <div style={{ width: `${v * 100}%`, height: '100%', background: '#3b82f6', borderRadius: '1px' }} />
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Right — Results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {!data && !loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '48px' }}>🤖</div>
            <div style={{ fontSize: '14px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>
              Enter a ticker and press ANALYZE
            </div>
          </div>
        )}

        {data && (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px', padding: '16px', background: '#0d0d14', borderRadius: '8px', border: '1px solid #1e2028' }}>
              <div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '24px', fontWeight: 600, color: '#f0c040' }}>{data.sym}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>{data.name}</div>
                <div style={{ fontSize: '18px', color: '#e0e8f0', fontFamily: 'JetBrains Mono, monospace', marginTop: '4px' }}>${data.price?.toFixed(2)}</div>
              </div>

              {/* Score circle */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '90px', height: '90px', borderRadius: '50%',
                  border: `4px solid ${data.score.color}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: '#0a0a0f',
                }}>
                  <div style={{ fontSize: '28px', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: data.score.color }}>{data.score.final}</div>
                  <div style={{ fontSize: '9px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>/100</div>
                </div>
                <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: data.score.color }}>
                  {data.score.signal}
                </div>
              </div>

              {/* Sub-scores */}
              <div style={{ flex: 1 }}>
                <ScoreBar label="Technical"   score={data.score.breakdown.technical}   color="#3b82f6" />
                <ScoreBar label="Fundamental" score={data.score.breakdown.fundamental} color="#f0c040" />
                <ScoreBar label="ML Model"    score={data.score.breakdown.ml}          color="#a855f7" />
                <ScoreBar label="Sentiment"   score={data.score.breakdown.sentiment}   color="#06b6d4" />
                <ScoreBar label="Risk"        score={data.score.breakdown.risk}        color="#22c55e" />
                <ScoreBar label="Momentum"    score={data.score.breakdown.momentum}    color="#ec4899" />
              </div>

              {/* Target & Stop */}
              {(data.claude.price_target || data.claude.stop_loss) && (
                <div style={{ textAlign: 'right' }}>
                  {data.claude.price_target && (
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '9px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>TARGET</div>
                      <div style={{ fontSize: '18px', fontFamily: 'JetBrains Mono, monospace', color: '#22c55e', fontWeight: 600 }}>
                        ${data.claude.price_target}
                      </div>
                      <div style={{ fontSize: '10px', color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' }}>
                        +{(((data.claude.price_target - data.price) / data.price) * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}
                  {data.claude.stop_loss && (
                    <div>
                      <div style={{ fontSize: '9px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>STOP</div>
                      <div style={{ fontSize: '18px', fontFamily: 'JetBrains Mono, monospace', color: '#ef4444', fontWeight: 600 }}>
                        ${data.claude.stop_loss}
                      </div>
                      <div style={{ fontSize: '10px', color: '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>
                        {(((data.claude.stop_loss - data.price) / data.price) * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Thesis */}
            <div style={{ padding: '16px', background: '#0d0d14', borderRadius: '8px', border: '1px solid #1e2028', marginBottom: '16px' }}>
              <div style={{ fontSize: '9px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', marginBottom: '8px' }}>INVESTMENT THESIS</div>
              <div style={{ fontSize: '12px', color: '#c8d0db', lineHeight: 1.7 }}>{data.claude.thesis}</div>
              <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                <span style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>
                  Horizon: <span style={{ color: '#f0c040' }}>{data.claude.time_horizon}</span>
                </span>
                <span style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>
                  Conviction: <span style={{ color: data.claude.conviction === 'high' ? '#22c55e' : data.claude.conviction === 'medium' ? '#f0c040' : '#ef4444' }}>{data.claude.conviction}</span>
                </span>
              </div>
            </div>

            {/* Bull / Bear / Catalysts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ padding: '16px', background: '#0d0d14', borderRadius: '8px', border: '1px solid #052010' }}>
                <div style={{ fontSize: '9px', fontWeight: 600, color: '#22c55e', letterSpacing: '1.5px', marginBottom: '10px' }}>BULL CASE</div>
                {data.claude.bull_case.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ color: '#22c55e', fontSize: '10px', flexShrink: 0 }}>▲</span>
                    <span style={{ fontSize: '11px', color: '#c8d0db', lineHeight: 1.5 }}>{p}</span>
                  </div>
                ))}
              </div>

              <div style={{ padding: '16px', background: '#0d0d14', borderRadius: '8px', border: '1px solid #200505' }}>
                <div style={{ fontSize: '9px', fontWeight: 600, color: '#ef4444', letterSpacing: '1.5px', marginBottom: '10px' }}>BEAR CASE</div>
                {data.claude.bear_case.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ color: '#ef4444', fontSize: '10px', flexShrink: 0 }}>▼</span>
                    <span style={{ fontSize: '11px', color: '#c8d0db', lineHeight: 1.5 }}>{p}</span>
                  </div>
                ))}
              </div>

              <div style={{ padding: '16px', background: '#0d0d14', borderRadius: '8px', border: '1px solid #1a1a10' }}>
                <div style={{ fontSize: '9px', fontWeight: 600, color: '#f0c040', letterSpacing: '1.5px', marginBottom: '10px' }}>CATALYSTS</div>
                {data.claude.catalysts.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ color: '#f0c040', fontSize: '10px', flexShrink: 0 }}>◆</span>
                    <span style={{ fontSize: '11px', color: '#c8d0db', lineHeight: 1.5 }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Raw data */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#0d0d14', borderRadius: '8px', border: '1px solid #1e2028' }}>
                <div style={{ fontSize: '9px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', marginBottom: '10px' }}>TECHNICAL SIGNALS</div>
                {[
                  { label: 'RSI',        val: data.raw_data.technical?.rsi?.toFixed(2) },
                  { label: 'MACD Hist',  val: data.raw_data.technical?.macd_hist?.toFixed(4) },
                  { label: 'Z-Score',    val: data.raw_data.zscore?.toFixed(2) },
                  { label: 'Mom 1M',     val: data.raw_data.momentum?.['1m'] ? `${data.raw_data.momentum['1m']}%` : 'N/A' },
                  { label: 'Mom 3M',     val: data.raw_data.momentum?.['3m'] ? `${data.raw_data.momentum['3m']}%` : 'N/A' },
                  { label: 'Vol Ratio',  val: data.raw_data.volume_ratio },
                ].map(f => (
                  <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>{f.label}</span>
                    <span style={{ fontSize: '10px', color: '#c8d0db', fontFamily: 'JetBrains Mono, monospace' }}>{f.val ?? 'N/A'}</span>
                  </div>
                ))}
              </div>

              <div style={{ padding: '16px', background: '#0d0d14', borderRadius: '8px', border: '1px solid #1e2028' }}>
                <div style={{ fontSize: '9px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', marginBottom: '10px' }}>FUNDAMENTALS</div>
                {[
                  { label: 'P/E',           val: data.raw_data.fundamentals?.pe_ratio?.toFixed(2) },
                  { label: 'EPS',           val: data.raw_data.fundamentals?.eps?.toFixed(2) },
                  { label: 'Rev Growth',    val: data.raw_data.fundamentals?.revenue_growth ? `${(data.raw_data.fundamentals.revenue_growth * 100).toFixed(1)}%` : 'N/A' },
                  { label: 'ROE',           val: data.raw_data.fundamentals?.roe ? `${(data.raw_data.fundamentals.roe * 100).toFixed(1)}%` : 'N/A' },
                  { label: 'Profit Margin', val: data.raw_data.fundamentals?.profit_margin ? `${(data.raw_data.fundamentals.profit_margin * 100).toFixed(1)}%` : 'N/A' },
                  { label: 'Debt/Equity',   val: data.raw_data.fundamentals?.debt_to_equity?.toFixed(2) },
                ].map(f => (
                  <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>{f.label}</span>
                    <span style={{ fontSize: '10px', color: '#c8d0db', fontFamily: 'JetBrains Mono, monospace' }}>{f.val ?? 'N/A'}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

      <style>{`
        @keyframes progress {
          0%   { width: 0%;   margin-left: 0%; }
          50%  { width: 60%;  margin-left: 20%; }
          100% { width: 0%;   margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}

export default AIAdvisor;