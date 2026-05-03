import React, { useEffect, useState } from 'react';

interface Stock {
  sym: string;
  price: number;
  chg: number;
}

function TickerBand() {
  const [prices, setPrices] = useState<Stock[]>([]);

  const fetchPrices = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/prices');
      const data = await res.json();
      setPrices(data);
    } catch (e) {
      console.error('Erreur fetch prices:', e);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  if (prices.length === 0) return (
    <div style={{ height: '28px', background: '#080810', borderBottom: '1px solid #1e2028', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#4a5060' }}>Chargement des prix...</span>
    </div>
  );

  const items = [...prices, ...prices];

  return (
    <div style={{
      height: '28px',
      background: '#080810',
      borderBottom: '1px solid #1e2028',
      overflow: 'hidden',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
    }}>
      <div style={{
        display: 'flex',
        animation: 'ticker 100s linear infinite',
        whiteSpace: 'nowrap',
      }}>
        {items.map((t, i) => (
          <div key={i} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 20px',
            borderRight: '1px solid #1e2028',
          }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px',
              fontWeight: 600,
              color: '#f0c040',
            }}>{t.sym}</span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px',
              color: '#e0e8f0',
            }}>{t.price.toFixed(2)}</span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '10px',
              color: t.chg >= 0 ? '#22c55e' : '#ef4444',
            }}>{t.chg >= 0 ? '▲' : '▼'}{Math.abs(t.chg)}%</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

export default TickerBand;