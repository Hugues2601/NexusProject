import React from 'react';

const tabs = ['TERMINAL', 'PORTFOLIO', 'DERIVATIVES', 'RISK', 'NEWS'];

function TopBar() {
  const [active, setActive] = React.useState('TERMINAL');

  return (
    <div style={{
      background: '#0d0d14',
      borderBottom: '1px solid #1e2028',
      height: '36px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      flexShrink: 0
    }}>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: 600,
        fontSize: '13px',
        color: '#f0c040',
        letterSpacing: '2px',
        marginRight: '16px',
        paddingRight: '16px',
        borderRight: '1px solid #1e2028'
      }}>NEXUS</span>

      {tabs.map(tab => (
        <div
          key={tab}
          onClick={() => setActive(tab)}
          style={{
            padding: '0 14px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer',
            color: active === tab ? '#f0c040' : '#6b7280',
            borderBottom: active === tab ? '2px solid #f0c040' : '2px solid transparent',
            letterSpacing: '0.5px'
          }}
        >
          {tab}
        </div>
      ))}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          placeholder="AAPL US Equity GO..."
          style={{
            background: '#1a1a24',
            border: '1px solid #2a2a38',
            borderRadius: '4px',
            padding: '4px 10px',
            fontSize: '11px',
            color: '#c8d0db',
            fontFamily: 'JetBrains Mono, monospace',
            width: '180px',
            outline: 'none'
          }}
        />
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e' }} />
        <span style={{ fontSize: '10px', color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' }}>LIVE</span>
      </div>
    </div>
  );
}

export default TopBar;