import React, { useEffect, useState } from 'react';

interface Sector {
  sector: string;
  sym: string;
  price: number;
  chg_1d: number;
  chg_5d: number;
}

function SectorHeatmap() {
  const [data, setData] = useState<Sector[]>([]);
  const [view, setView] = useState<'1d' | '5d'>('1d');

  useEffect(() => {
    fetch('http://127.0.0.1:8000/sector_heatmap')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setData(d); })
      .catch(console.error);
  }, []);

  const getColor = (chg: number) => {
    if (chg >  3)  return { bg: '#052010', border: '#22c55e', text: '#22c55e' };
    if (chg >  1)  return { bg: '#031a0a', border: '#16a34a', text: '#16a34a' };
    if (chg >  0)  return { bg: '#021205', border: '#15803d', text: '#86efac' };
    if (chg > -1)  return { bg: '#150505', border: '#b91c1c', text: '#f87171' };
    if (chg > -3)  return { bg: '#200505', border: '#dc2626', text: '#ef4444' };
    return             { bg: '#2a0505', border: '#ef4444',  text: '#ef4444' };
  };

  const sorted = [...data].sort((a, b) =>
    view === '1d' ? b.chg_1d - a.chg_1d : b.chg_5d - a.chg_5d
  );

  return (
    <div style={{ background: '#0a0a0f', height: '100%', padding: '12px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', fontFamily: 'JetBrains Mono, monospace' }}>
          SECTOR HEATMAP — S&P 500
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['1d', '5d'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '3px 10px', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace',
              background: view === v ? '#1a1a24' : 'transparent',
              border: `1px solid ${view === v ? '#f0c040' : '#2a2a38'}`,
              color: view === v ? '#f0c040' : '#6b7280',
              cursor: 'pointer', borderRadius: '3px',
            }}>{v.toUpperCase()}</button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: '9px', color: '#2a2a38', fontFamily: 'JetBrains Mono, monospace', marginBottom: '12px' }}>
        {view === '1d' ? 'Daily % change vs yesterday close' : '5-day % change vs 5 sessions ago'}
      </div>

      {data.length === 0 ? (
        <div style={{ fontSize: '11px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', flex: 1 }}>
          {sorted.map(s => {
            const chg   = view === '1d' ? s.chg_1d : s.chg_5d;
            const color = getColor(chg);
            return (
              <div key={s.sym} style={{
                background: color.bg, border: `1px solid ${color.border}`,
                borderRadius: '6px', padding: '10px',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <div style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace', marginBottom: '4px' }}>{s.sym}</div>
                <div style={{ fontSize: '11px', color: '#c8d0db', fontFamily: 'JetBrains Mono, monospace', marginBottom: '6px', lineHeight: 1.3 }}>{s.sector}</div>
                <div style={{ fontSize: '18px', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: color.text }}>
                  {chg >= 0 ? '+' : ''}{chg}%
                </div>
                <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace', marginTop: '2px' }}>${s.price}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SectorHeatmap;