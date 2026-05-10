import React, { useEffect, useState } from 'react';

interface EcoEvent {
  name: string;
  series_id: string;
  value: number | null;
  previous: number | null;
  change: number | null;
  last_date: string;
  next_date: string | null;
  importance: string;
}

function EconomicCalendar() {
  const [data, setData] = useState<EcoEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/economic_calendar')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const importanceColor = (imp: string) =>
    imp === 'High' ? '#ef4444' : '#f0c040';

  const changeColor = (change: number | null) => {
    if (change === null) return '#6b7280';
    return change > 0 ? '#22c55e' : '#ef4444';
  };

  const formatValue = (val: number | null, name: string) => {
    if (val === null) return 'N/A';
    if (name === 'NFP') return `${(val / 1000).toFixed(0)}K`;
    if (['GDP', 'Retail Sales', 'Industrial', 'Housing'].includes(name)) return val.toFixed(1);
    return `${val.toFixed(2)}%`;
  };

  const formatChange = (change: number | null, name: string) => {
    if (change === null) return '—';
    const prefix = change > 0 ? '+' : '';
    if (name === 'NFP') return `${prefix}${(change / 1000).toFixed(0)}K`;
    if (['GDP', 'Retail Sales', 'Industrial', 'Housing'].includes(name)) return `${prefix}${change.toFixed(1)}`;
    return `${prefix}${change.toFixed(3)}`;
  };

  const COLS = '1.6fr 0.8fr 0.8fr 0.8fr 0.9fr 0.9fr 0.4fr';

  return (
    <div style={{ background: '#0a0a0f', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #1e2028', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: '9px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', fontFamily: 'JetBrains Mono, monospace' }}>
          ECONOMIC CALENDAR — FRED DATA
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ fontSize: '8px', padding: '2px 6px', borderRadius: '2px', background: '#200505', color: '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>● HIGH</span>
          <span style={{ fontSize: '8px', padding: '2px 6px', borderRadius: '2px', background: '#1a1a10', color: '#f0c040', fontFamily: 'JetBrains Mono, monospace' }}>● MED</span>
        </div>
      </div>

      {/* Table header */}
      <div style={{ display: 'grid', gridTemplateColumns: COLS, padding: '6px 14px', borderBottom: '1px solid #1e2028', flexShrink: 0 }}>
        {['Indicator', 'Latest', 'Previous', 'Change', 'Last Release', 'Next Release', 'Freq'].map(h => (
          <div key={h} style={{ fontSize: '9px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{h}</div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '20px 14px', fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>
            Loading FRED data...
          </div>
        ) : (
          data.map((d, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: COLS,
                padding: '9px 14px',
                borderBottom: '1px solid #13131a',
                borderLeft: `2px solid ${importanceColor(d.importance)}`,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#0d0d14')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: importanceColor(d.importance), flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: '#e0e8f0', fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 }}>{d.name}</span>
              </div>

              {/* Latest */}
              <div style={{ fontSize: '11px', color: '#f0c040', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                {formatValue(d.value, d.name)}
              </div>

              {/* Previous */}
              <div style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>
                {formatValue(d.previous, d.name)}
              </div>

              {/* Change */}
              <div style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: changeColor(d.change), display: 'flex', alignItems: 'center', gap: '3px' }}>
                {formatChange(d.change, d.name)}
                {d.change !== null && (
                  <span style={{ fontSize: '9px' }}>{d.change > 0 ? '▲' : '▼'}</span>
                )}
              </div>

              {/* Last Release */}
              <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>
                {d.last_date ?? '—'}
              </div>

              {/* Next Release */}
              <div style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: d.next_date ? '#22c55e' : '#4a5060' }}>
                {d.next_date ?? '—'}
              </div>

              {/* Freq */}
              <div style={{ fontSize: '9px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>
                {(d as any).frequency ?? '—'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default EconomicCalendar;