import React from 'react';

const INDICATORS = [
  { key: 'sma20',  label: 'SMA 20',    color: '#3b82f6' },
  { key: 'sma50',  label: 'SMA 50',    color: '#f0c040' },
  { key: 'sma200', label: 'SMA 200',   color: '#ef4444' },
  { key: 'ema20',  label: 'EMA 20',    color: '#22c55e' },
  { key: 'ema50',  label: 'EMA 50',    color: '#a855f7' },
  { key: 'bb',     label: 'Bollinger', color: '#06b6d4' },
  { key: 'rsi',    label: 'RSI 14',    color: '#f97316' },
  { key: 'macd',   label: 'MACD',      color: '#ec4899' },
  { key: 'atr',    label: 'ATR 14',    color: '#84cc16' },
];

interface RightPanelProps {
  activeIndicators: string[];
  onToggle: (key: string) => void;
}

function RightPanel({ activeIndicators, onToggle }: RightPanelProps) {
  return (
    <div style={{
      width: '180px',
      background: '#0d0d14',
      borderLeft: '1px solid #1e2028',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0
    }}>
      <div style={{
        padding: '8px 12px',
        fontSize: '9px',
        fontWeight: 600,
        color: '#4a5060',
        letterSpacing: '1.5px',
        borderBottom: '1px solid #1e2028'
      }}>INDICATORS</div>

      <div style={{ padding: '8px 12px' }}>
        {INDICATORS.map(ind => {
          const active = activeIndicators.includes(ind.key);
          return (
            <div
              key={ind.key}
              onClick={() => onToggle(ind.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 8px',
                marginBottom: '4px',
                borderRadius: '4px',
                cursor: 'pointer',
                background: active ? '#1a1a24' : 'transparent',
                border: `1px solid ${active ? ind.color : '#1e2028'}`,
                transition: 'all 0.15s'
              }}
            >
              <div style={{
                width: '10px',
                height: '3px',
                borderRadius: '2px',
                background: active ? ind.color : '#3a3a50',
                flexShrink: 0
              }} />
              <span style={{
                fontSize: '11px',
                fontFamily: 'JetBrains Mono, monospace',
                color: active ? ind.color : '#6b7280'
              }}>{ind.label}</span>
            </div>
          );
        })}
      </div>

      <div style={{ borderTop: '1px solid #1e2028', padding: '8px 12px', marginTop: 'auto' }}>
        <div style={{ fontSize: '9px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', marginBottom: '8px' }}>POSITIONS</div>
        {[
          { sym: 'AAPL', qty: 50,  pnl: +842  },
          { sym: 'NVDA', qty: 20,  pnl: +1240 },
          { sym: 'TSLA', qty: 30,  pnl: -412  },
          { sym: 'SPY',  qty: 10,  pnl: +548  },
        ].map(p => (
          <div key={p.sym} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
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