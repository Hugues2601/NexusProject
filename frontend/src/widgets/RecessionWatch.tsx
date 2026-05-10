import React, { useEffect, useState } from 'react';

interface RecessionData {
  sahm_rule: number;
  sahm_threshold: number;
  unemployment: number;
  unemployment_prev: number;
  gdp_growth: number;
  gdp_prev: number;
  lei: number;
  lei_prev: number;
  yield_spread: number;
  tnx: number;
  irx: number;
  recession_prob: number;
}

function RecessionWatch() {
  const [data, setData] = useState<RecessionData | null>(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/recession_watch')
      .then(r => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  const probColor = (prob: number) => {
    if (prob >= 60) return '#ef4444';
    if (prob >= 40) return '#f97316';
    if (prob >= 20) return '#f0c040';
    return '#22c55e';
  };

  const Row = ({
    label, val, prev, unit = '', invert = false, period = ''
  }: {
    label: string; val: number | null; prev?: number | null;
    unit?: string; invert?: boolean; period?: string;
  }) => {
    const chg    = val !== null && prev !== null && prev !== undefined ? val - prev : null;
    const isGood = chg !== null ? (invert ? chg < 0 : chg > 0) : null;
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #13131a' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>{label}</div>
          {period && <div style={{ fontSize: '9px', color: '#2a2a38', fontFamily: 'JetBrains Mono, monospace' }}>{period}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {chg !== null && (
            <span style={{ fontSize: '10px', color: isGood ? '#22c55e' : '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>
              {chg > 0 ? '+' : ''}{chg.toFixed(2)}{unit}
            </span>
          )}
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#e0e8f0', fontFamily: 'JetBrains Mono, monospace' }}>
            {val !== null ? `${val}${unit}` : 'N/A'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: '#0a0a0f', height: '100%', padding: '14px', overflowY: 'auto' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', marginBottom: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
        RECESSION WATCH — FRED DATA
      </div>
      <div style={{ fontSize: '9px', color: '#2a2a38', fontFamily: 'JetBrains Mono, monospace', marginBottom: '14px' }}>
        Sources: Federal Reserve FRED — official releases
      </div>

      {!data ? (
        <div style={{ fontSize: '11px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>Loading FRED data...</div>
      ) : (
        <>
          {/* Recession Probability */}
          <div style={{ marginBottom: '16px', padding: '14px', background: '#0d0d14', borderRadius: '8px', border: `1px solid ${probColor(data.recession_prob)}` }}>
            <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace', marginBottom: '2px' }}>RECESSION PROBABILITY</div>
            <div style={{ fontSize: '9px', color: '#2a2a38', fontFamily: 'JetBrains Mono, monospace', marginBottom: '8px' }}>
              Composite model: Sahm + Yield Curve + GDP + LEI
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '36px', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: probColor(data.recession_prob) }}>
                {data.recession_prob}%
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ height: '8px', background: '#1a1a24', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
                  <div style={{ width: `${data.recession_prob}%`, height: '100%', background: probColor(data.recession_prob), borderRadius: '4px', transition: 'width 1s ease' }} />
                </div>
                <div style={{ fontSize: '10px', color: probColor(data.recession_prob), fontFamily: 'JetBrains Mono, monospace' }}>
                  {data.recession_prob >= 60 ? '🔴 HIGH RISK' : data.recession_prob >= 40 ? '🟠 ELEVATED' : data.recession_prob >= 20 ? '🟡 MODERATE' : '🟢 LOW RISK'}
                </div>
              </div>
            </div>
          </div>

          {/* Sahm Rule */}
          <div style={{ marginBottom: '14px', padding: '12px', background: '#0d0d14', borderRadius: '6px', border: `1px solid ${data.sahm_rule >= 0.5 ? '#ef4444' : '#1e2028'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace', marginBottom: '2px' }}>SAHM RULE</div>
                <div style={{ fontSize: '9px', color: '#2a2a38', fontFamily: 'JetBrains Mono, monospace' }}>Monthly — triggered if ≥ 0.50%</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '24px', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: data.sahm_rule >= 0.5 ? '#ef4444' : '#22c55e' }}>
                  {data.sahm_rule}%
                </div>
                <div style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: data.sahm_rule >= 0.5 ? '#ef4444' : '#22c55e' }}>
                  {data.sahm_rule >= 0.5 ? '⚠ TRIGGERED' : '✓ NOT TRIGGERED'}
                </div>
              </div>
            </div>
            <div style={{ marginTop: '8px', height: '4px', background: '#1a1a24', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(data.sahm_rule / 1.0 * 100, 100)}%`, height: '100%', background: data.sahm_rule >= 0.5 ? '#ef4444' : '#22c55e', borderRadius: '2px' }} />
            </div>
          </div>

          {/* Key Indicators */}
          <div style={{ fontSize: '9px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', marginBottom: '8px', fontFamily: 'JetBrains Mono, monospace' }}>
            KEY INDICATORS
          </div>
          <Row label="GDP Growth"          val={data.gdp_growth}    prev={data.gdp_prev}           unit="%" period="Quarterly (QoQ annualized) — BEA"   invert={false} />
          <Row label="Unemployment"        val={data.unemployment}  prev={data.unemployment_prev}  unit="%" period="Monthly — BLS"                       invert={true}  />
          <Row label="Leading Eco Index"   val={data.lei}           prev={data.lei_prev}           unit=""  period="Monthly — Conference Board"           invert={false} />
          <Row label="Yield Spread 10Y-3M" val={data.yield_spread}  unit="%"                               period="Daily — live market data"              />
          <Row label="10Y Treasury"        val={data.tnx}           unit="%"                               period="Daily — live"                          />
          <Row label="3M Treasury"         val={data.irx}           unit="%"                               period="Daily — live"                          />

          {/* Yield Curve Signal */}
          <div style={{ marginTop: '14px', padding: '10px', background: '#0d0d14', borderRadius: '6px', border: `1px solid ${(data.yield_spread ?? 0) < 0 ? '#ef4444' : '#22c55e'}` }}>
            <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace', marginBottom: '4px' }}>YIELD CURVE SIGNAL</div>
            <div style={{ fontSize: '9px', color: '#2a2a38', fontFamily: 'JetBrains Mono, monospace', marginBottom: '6px' }}>
              Historically, inversions precede recessions by 12-18 months
            </div>
            <div style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: (data.yield_spread ?? 0) < 0 ? '#ef4444' : '#22c55e' }}>
              {(data.yield_spread ?? 0) < 0 ? '⚠ INVERTED — Historical recession signal' : '✓ NORMAL — Curve not inverted'}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default RecessionWatch;