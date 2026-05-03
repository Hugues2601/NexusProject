import React, { useState, useEffect } from 'react';

interface Stock {
  sym: string;
  price: number;
  chg: number;
}

interface WatchlistProps {
  selectedTicker: string;
  onSelectTicker: (sym: string) => void;
}

function Watchlist({ selectedTicker, onSelectTicker }: WatchlistProps) {
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const addTicker = async () => {
    const sym = search.toUpperCase().trim();
    if (!sym) return;
    if (watchlist.find(t => t.sym === sym)) {
      setError('Déjà dans la watchlist');
      setSearch('');
      return;
    }
    try {
      const res = await fetch(`http://127.0.0.1:8000/ticker?sym=${sym}`);
      const data = await res.json();
      if (data && data.price) {
        setWatchlist(prev => [...prev, data]);
        onSelectTicker(sym);
        setError('');
      } else {
        setError('Ticker introuvable');
      }
    } catch {
      setError('Erreur de connexion');
    }
    setSearch('');
  };

  const removeTicker = (sym: string) => {
    setWatchlist(prev => prev.filter(s => s.sym !== sym));
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      const updated = await Promise.all(
        watchlist.map(async t => {
          try {
            const res = await fetch(`http://127.0.0.1:8000/ticker?sym=${t.sym}`);
            const data = await res.json();
            return data && data.price ? data : t;
          } catch {
            return t;
          }
        })
      );
      setWatchlist(updated);
    }, 30000);
    return () => clearInterval(interval);
  }, [watchlist]);

  return (
    <div style={{
      width: '240px',
      background: '#0d0d14',
      borderRight: '1px solid #1e2028',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0
    }}>
      <div style={{
        padding: '8px 12px',
        fontSize: '10px',
        fontWeight: 600,
        color: '#4a5060',
        letterSpacing: '1.5px',
        borderBottom: '1px solid #1e2028'
      }}>WATCHLIST</div>

      <div style={{ padding: '8px', borderBottom: '1px solid #1e2028', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && addTicker()}
            placeholder="Rechercher ticker..."
            style={{
              flex: 1,
              background: '#1a1a24',
              border: '1px solid #2a2a38',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              color: '#c8d0db',
              fontFamily: 'JetBrains Mono, monospace',
              outline: 'none'
            }}
          />
          <button
            onClick={addTicker}
            style={{
              background: '#f0c040',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '12px',
              color: '#0a0a0f',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >+</button>
        </div>
        {error && (
          <div style={{ fontSize: '10px', color: '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {watchlist.length === 0 ? (
          <div style={{ padding: '12px', fontSize: '11px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.6 }}>
            Tape un ticker<br />et appuie sur Entrée
          </div>
        ) : (
          watchlist.map(t => (
            <div
              key={t.sym}
              onClick={() => onSelectTicker(t.sym)}
              style={{
                padding: '6px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                borderBottom: '1px solid #13131a',
                borderLeft: selectedTicker === t.sym ? '2px solid #f0c040' : '2px solid transparent',
                background: selectedTicker === t.sym ? '#14141f' : 'transparent'
              }}
            >
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 600, color: '#e0e8f0' }}>
                {t.sym}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#e0e8f0' }}>
                    {t.price.toFixed(2)}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: t.chg >= 0 ? '#22c55e' : '#ef4444' }}>
                    {t.chg >= 0 ? '▲' : '▼'}{Math.abs(t.chg)}%
                  </div>
                </div>
                <span
                  onClick={e => { e.stopPropagation(); removeTicker(t.sym); }}
                  style={{ fontSize: '10px', color: '#3a3a50', cursor: 'pointer' }}
                >✕</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Watchlist;