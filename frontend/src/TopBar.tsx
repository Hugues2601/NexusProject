import React, { useState, useRef, useEffect } from 'react';

const tabs = ['TERMINAL', 'PORTFOLIO', 'DERIVATIVES', 'RISK', 'STRATEGIES', 'NEWS'];

const AVAILABLE_WIDGETS = [
  { id: 'yield_curve',     label: 'Yield Curve',       description: 'US Treasury yield curve' },
  { id: 'macro_dashboard', label: 'Macro Dashboard',   description: 'Taux, inflation, emploi' },
  { id: 'fear_greed',      label: 'Fear & Greed',      description: 'CNN Fear & Greed Index' },
  { id: 'vix',             label: 'VIX Chart',         description: 'Volatilité implicite S&P' },
  { id: 'sector_heatmap',  label: 'Sector Heatmap',    description: 'Performance sectorielle' },
  { id: 'economic_cal',    label: 'Economic Calendar', description: 'NFP, CPI, FOMC...' },
];

interface TopBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenWidget: (widgetId: string) => void;
}

function TopBar({ activeTab, onTabChange, onOpenWidget }: TopBarProps) {
  const [search, setSearch]   = useState('');
  const [showDrop, setShowDrop] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = AVAILABLE_WIDGETS.filter(w =>
    w.label.toLowerCase().includes(search.toLowerCase()) ||
    w.description.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.closest('.widget-search')) {
        setShowDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div style={{
      background: '#0d0d14', borderBottom: '1px solid #1e2028',
      height: '36px', display: 'flex', alignItems: 'center',
      padding: '0 12px', flexShrink: 0,
    }}>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: '13px',
        color: '#f0c040', letterSpacing: '2px', marginRight: '16px',
        paddingRight: '16px', borderRight: '1px solid #1e2028',
      }}>NEXUS</span>

      {tabs.map(tab => (
        <div key={tab} onClick={() => onTabChange(tab)} style={{
          padding: '0 14px', height: '100%', display: 'flex', alignItems: 'center',
          fontSize: '11px', fontWeight: 500, cursor: 'pointer',
          color: activeTab === tab ? '#f0c040' : '#6b7280',
          borderBottom: activeTab === tab ? '2px solid #f0c040' : '2px solid transparent',
          letterSpacing: '0.5px',
        }}>{tab}</div>
      ))}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>

        {/* Widget search */}
        <div className="widget-search" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#1a1a24', border: '1px solid #2a2a38', borderRadius: '4px', padding: '3px 8px', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#4a5060' }}>⊞</span>
            <input
              ref={inputRef}
              value={search}
              onChange={e => { setSearch(e.target.value); setShowDrop(true); }}
              onFocus={() => setShowDrop(true)}
              placeholder="Add widget..."
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                fontSize: '11px', color: '#c8d0db', fontFamily: 'JetBrains Mono, monospace',
                width: '140px',
              }}
            />
          </div>

          {showDrop && (
            <div style={{
              position: 'absolute', top: '32px', right: 0,
              background: '#0d0d14', border: '1px solid #2a2a38',
              borderRadius: '6px', width: '260px', zIndex: 9999,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '12px', fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>
                  Aucun widget trouvé
                </div>
              ) : filtered.map(w => (
                <div
                  key={w.id}
                  onClick={() => { onOpenWidget(w.id); setSearch(''); setShowDrop(false); }}
                  style={{
                    padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #13131a',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#13131a')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ fontSize: '11px', color: '#e0e8f0', fontFamily: 'JetBrains Mono, monospace', marginBottom: '2px' }}>{w.label}</div>
                  <div style={{ fontSize: '9px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>{w.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e' }} />
        <span style={{ fontSize: '10px', color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' }}>LIVE</span>
      </div>
    </div>
  );
}

export default TopBar;