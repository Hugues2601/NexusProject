import React from 'react';

const positions = [
  { sym: 'AAPL', qty: 50,  pnl: +842  },
  { sym: 'NVDA', qty: 20,  pnl: +1240 },
  { sym: 'TSLA', qty: 30,  pnl: -412  },
  { sym: 'SPY',  qty: 10,  pnl: +548  },
];

const allocation = [
  { label: 'Equities',   pct: 62, color: '#f0c040' },
  { label: 'Options',    pct: 18, color: '#22c55e'  },
  { label: 'Fixed Inc.', pct: 12, color: '#3b82f6'  },
  { label: 'Cash',       pct: 8,  color: '#6b7280'  },
];

function RightPanel() {
  return (
    <div style={{
      width: '260px',
      background: '#0d0d14',
      borderLeft: '1px solid #1e2028',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0
    }}>

      {/* P&L */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #1e2028' }}>
        <div style={{ fontSize: '9px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', marginBottom: '4px' }}>P&L TODAY</div>
        <div style={{ fontSize: '9px', color: '#4a5060', marginBottom: '2px' }}>Unrealized</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '20px', fontWeight: 600, color: '#22c55e' }}>+$4,218</div>
      </div>

      {/* Allocation */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #1e2028' }}>
        <div style={{ fontSize: '9px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', marginBottom: '8px' }}>ALLOCATION</div>
        {allocation.map(a => (
          <div key={a.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', color: '#6b7280' }}>{a.label}</span>
              <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: '#c8d0db' }}>{a.pct}%</span>
            </div>
            <div style={{ height: '4px', background: '#1a1a24', borderRadius: '2px', marginBottom: '8px' }}>
              <div style={{ width: `${a.pct}%`, height: '100%', background: a.color, borderRadius: '2px' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Positions */}
      <div style={{ padding: '8px 12px', flex: 1 }}>
        <div style={{ fontSize: '9px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', marginBottom: '8px' }}>POSITIONS</div>
        {positions.map(p => (
          <div key={p.sym} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: '#c8d0db' }}>{p.sym} x{p.qty}</span>
            <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: p.pnl >= 0 ? '#22c55e' : '#ef4444' }}>
              {p.pnl >= 0 ? '+' : ''}${Math.abs(p.pnl)}
            </span>
          </div>
        ))}
      </div>

    </div>
  );
}

export default RightPanel;