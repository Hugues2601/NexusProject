import React, { useEffect, useState } from 'react';

interface Index {
  name: string;
  sym: string;
  price: number;
  chg: number;
  region: string;
}

const REGIONS = ['All', 'Americas', 'Europe', 'Asia-Pacific'];

function WorldMarkets() {
  const [data, setData]     = useState<Index[]>([]);
  const [region, setRegion] = useState('All');

  useEffect(() => {
    fetch('http://127.0.0.1:8000/world_markets')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setData(d); })
      .catch(console.error);
  }, []);

  const filtered  = region === 'All' ? data : data.filter(d => d.region === region);
  const chgColor  = (chg: number) => chg >= 0 ? '#22c55e' : '#ef4444';

  return (
    <div style={{ background: '#0a0a0f', height: '100%', display: 'flex', flexDirection: 'column', padding: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', fontFamily: 'JetBrains Mono, monospace' }}>
          WORLD MARKETS
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {REGIONS.map(r => (
            <button key={r} onClick={() => setRegion(r)} style={{
              padding: '3px 8px', fontSize: '9px', fontFamily: 'JetBrains Mono, monospace',
              background: region === r ? '#1a1a24' : 'transparent',
              border: `1px solid ${region === r ? '#f0c040' : '#2a2a38'}`,
              color: region === r ? '#f0c040' : '#6b7280',
              cursor: 'pointer', borderRadius: '3px',
            }}>{r}</button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: '9px', color: '#2a2a38', fontFamily: 'JetBrains Mono, monospace', marginBottom: '12px' }}>
        % change = daily vs yesterday close — live data
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {data.length === 0 ? (
          <div style={{ fontSize: '11px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>Loading...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'JetBrains Mono, monospace' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e2028' }}>
                <th style={{ padding: '6px 10px', fontSize: '9px', color: '#4a5060', textAlign: 'left',  fontWeight: 600 }}>Index</th>
                <th style={{ padding: '6px 10px', fontSize: '9px', color: '#4a5060', textAlign: 'left',  fontWeight: 600 }}>Region</th>
                <th style={{ padding: '6px 10px', fontSize: '9px', color: '#4a5060', textAlign: 'right', fontWeight: 600 }}>Price</th>
                <th style={{ padding: '6px 10px', fontSize: '9px', color: '#4a5060', textAlign: 'right', fontWeight: 600 }}>Change (1D)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => (
                <tr key={i}
                  style={{ borderBottom: '1px solid #13131a' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#0d0d14')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '8px 10px', fontSize: '12px', color: '#e0e8f0', fontWeight: 500 }}>{d.name}</td>
                  <td style={{ padding: '8px 10px', fontSize: '10px', color: '#4a5060' }}>{d.region}</td>
                  <td style={{ padding: '8px 10px', fontSize: '12px', color: '#c8d0db', textAlign: 'right' }}>
                    {d.price.toLocaleString()}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                    <span style={{
                      fontSize: '12px', fontWeight: 600, color: chgColor(d.chg),
                      padding: '2px 8px', borderRadius: '3px',
                      background: d.chg >= 0 ? '#052010' : '#200505',
                    }}>
                      {d.chg >= 0 ? '+' : ''}{d.chg}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default WorldMarkets;