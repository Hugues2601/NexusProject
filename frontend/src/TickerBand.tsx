import React, { useEffect, useState } from 'react';

interface Stock {
  sym: string;
  price: number;
  chg: number;
}

// Données initiales instantanées — remplacées dès que l'API répond
const INITIAL_DATA: Stock[] = [
  { sym: 'AAPL',    price: 189.42, chg: 1.24  },
  { sym: 'MSFT',    price: 412.18, chg: 0.83  },
  { sym: 'NVDA',    price: 892.34, chg: 3.21  },
  { sym: 'TSLA',    price: 178.92, chg: -2.14 },
  { sym: 'AMZN',    price: 184.21, chg: 0.54  },
  { sym: 'GOOGL',   price: 172.84, chg: -0.32 },
  { sym: 'META',    price: 491.23, chg: 1.87  },
  { sym: 'JPM',     price: 198.41, chg: 0.21  },
  { sym: 'SPY',     price: 524.31, chg: 0.44  },
  { sym: 'QQQ',     price: 441.82, chg: 0.88  },
  { sym: 'BTC',     price: 62841,  chg: 2.31  },
  { sym: 'ETH',     price: 3241,   chg: 1.54  },
  { sym: 'GLD',     price: 185.32, chg: 0.12  },
  { sym: 'GC',      price: 2341.5, chg: -0.12 },
  { sym: 'CL',      price: 78.42,  chg: -1.04 },
  { sym: 'EURUSD',  price: 1.0821, chg: 0.08  },
];

function TickerBand() {
  const [prices, setPrices] = useState<Stock[]>(INITIAL_DATA);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Fetch en arrière-plan sans bloquer l'affichage
    const fetchPrices = async () => {
      try {
        const res  = await fetch('http://127.0.0.1:8000/prices');
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setPrices(data);
          setLoaded(true);
        }
      } catch (e) {
        console.error('Erreur fetch prices:', e);
      }
    };

    // Premier fetch après 1 seconde pour laisser l'UI s'initialiser
    const timeout = setTimeout(fetchPrices, 1000);

    // Refresh toutes les 60 secondes
    const interval = setInterval(fetchPrices, 60000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

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
      position: 'relative',
    }}>
      {/* Indicateur de chargement discret */}
      {!loaded && (
        <div style={{
          position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
          fontSize: '8px', color: '#2a2a38', fontFamily: 'JetBrains Mono, monospace',
          zIndex: 1,
        }}>live...</div>
      )}

      <div style={{
        display: 'flex',
        animation: 'ticker 60s linear infinite',
        whiteSpace: 'nowrap',
      }}>
        {items.map((t, i) => (
          <div key={i} style={{
            display: 'inline-flex', flexDirection: 'column', justifyContent: 'center',
            padding: '0 20px', borderRight: '1px solid #1e2028', height: '28px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 600, color: '#f0c040' }}>
                {t.sym}
              </span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#e0e8f0' }}>
                {t.price.toFixed(2)}
              </span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: t.chg >= 0 ? '#22c55e' : '#ef4444' }}>
                {t.chg >= 0 ? '▲' : '▼'}{Math.abs(t.chg)}%
              </span>
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: '#4a5060' }}>
              {(t as any).label ?? ''}
            </div>
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