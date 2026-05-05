import React, { useEffect, useState } from 'react';

interface FearGreedData {
  value: number;
  label: string;
  scores: {
    momentum:   number;
    volatility: number;
    safe_haven: number;
    junk_bonds: number;
    put_call:   number;
    strength:   number;
    breadth:    number;
  };
}

function FearGreed() {
  const [data, setData] = useState<FearGreedData | null>(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/fear_greed')
      .then(r => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  const getColor = (val: number) => {
    if (val >= 75) return '#22c55e';
    if (val >= 55) return '#86efac';
    if (val >= 45) return '#f0c040';
    if (val >= 25) return '#f97316';
    return '#ef4444';
  };

  const indicators = data ? [
    { label: 'Market Momentum',  val: data.scores.momentum,   desc: 'SPY vs SMA 125j' },
    { label: 'Volatility (VIX)', val: data.scores.volatility,  desc: 'VIX vs moyenne 50j' },
    { label: 'Safe Haven',       val: data.scores.safe_haven,  desc: 'SPY vs TLT' },
    { label: 'Junk Bond Demand', val: data.scores.junk_bonds,  desc: 'JNK vs LQD' },
    { label: 'Put/Call Ratio',   val: data.scores.put_call,    desc: 'Options SPY' },
    { label: 'Stock Strength',   val: data.scores.strength,    desc: 'QQQ 52W position' },
    { label: 'Market Breadth',   val: data.scores.breadth,     desc: 'RSI SPY' },
  ] : [];

  return (
    <div style={{ padding: '16px', background: '#0a0a0f' }}>
      {!data ? (
        <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>Chargement...</div>
      ) : (
        <>
          {/* Score principal */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              border: `4px solid ${getColor(data.value)}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: '#0d0d14', flexShrink: 0,
            }}>
              <div style={{ fontSize: '26px', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: getColor(data.value) }}>{data.value}</div>
              <div style={{ fontSize: '8px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>/100</div>
            </div>

            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: getColor(data.value), marginBottom: '6px' }}>
                {data.label}
              </div>
              {/* Gauge bar */}
              <div style={{ width: '200px' }}>
                <div style={{ height: '8px', background: 'linear-gradient(to right, #ef4444, #f97316, #f0c040, #86efac, #22c55e)', borderRadius: '4px', position: 'relative', marginBottom: '4px' }}>
                  <div style={{
                    position: 'absolute', top: '-3px',
                    left: `${data.value}%`, transform: 'translateX(-50%)',
                    width: '14px', height: '14px', borderRadius: '50%',
                    background: getColor(data.value), border: '2px solid #0a0a0f'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '8px', color: '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>Extreme Fear</span>
                  <span style={{ fontSize: '8px', color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' }}>Extreme Greed</span>
                </div>
              </div>
            </div>
          </div>

          {/* 7 indicateurs */}
          <div style={{ fontSize: '9px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', marginBottom: '8px' }}>
            COMPOSANTS (7 INDICATEURS)
          </div>
          {indicators.map(ind => (
            <div key={ind.label} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: '#c8d0db', fontFamily: 'JetBrains Mono, monospace' }}>{ind.label}</span>
                  <span style={{ fontSize: '9px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace', marginLeft: '8px' }}>{ind.desc}</span>
                </div>
                <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: getColor(ind.val) }}>{ind.val}</span>
              </div>
              <div style={{ height: '4px', background: '#1a1a24', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${ind.val}%`, height: '100%', background: getColor(ind.val), borderRadius: '2px' }} />
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default FearGreed;