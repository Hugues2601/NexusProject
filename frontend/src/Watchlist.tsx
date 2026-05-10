import React, { useEffect, useState, useRef } from 'react';

interface Stock {
  sym: string;
  price: number;
  chg: number;
  name?: string;
}

interface SearchResult {
  sym: string;
  name: string;
  type: string;
}

interface WatchlistProps {
  selectedTicker: string;
  onSelectTicker: (sym: string) => void;
}

function Watchlist({ selectedTicker, onSelectTicker }: WatchlistProps) {
  const [watchlist, setWatchlist]       = useState<Stock[]>([]);
  const [search, setSearch]             = useState('');
  const [suggestions, setSuggestions]   = useState<SearchResult[]>([]);
  const [showDrop, setShowDrop]         = useState(false);
  const [searching, setSearching]       = useState(false);
  const searchRef                       = useRef<HTMLDivElement>(null);
  const debounceRef                     = useRef<any>(null);

  // Ferme le dropdown si click dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounce search
  useEffect(() => {
    if (!search.trim()) { setSuggestions([]); setShowDrop(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res  = await fetch(`http://127.0.0.1:8000/search?q=${encodeURIComponent(search)}`);
        const data = await res.json();
        if (Array.isArray(data)) { setSuggestions(data); setShowDrop(true); }
      } catch {}
      setSearching(false);
    }, 300);
  }, [search]);

  // Refresh prix toutes les 30s
  useEffect(() => {
    if (watchlist.length === 0) return;
    const interval = setInterval(async () => {
      const updated = await Promise.all(watchlist.map(async p => {
        try {
          const res  = await fetch(`http://127.0.0.1:8000/ticker?sym=${p.sym}`);
          const data = await res.json();
          return data ? { ...p, price: data.price, chg: data.chg } : p;
        } catch { return p; }
      }));
      setWatchlist(updated);
    }, 30000);
    return () => clearInterval(interval);
  }, [watchlist]);

  const addTicker = async (sym: string, name?: string) => {
    if (watchlist.find(t => t.sym === sym)) {
      setSearch(''); setShowDrop(false); return;
    }
    try {
      const res  = await fetch(`http://127.0.0.1:8000/ticker?sym=${sym}`);
      const data = await res.json();
      if (data) {
        setWatchlist(prev => [...prev, { sym, price: data.price, chg: data.chg, name }]);
        onSelectTicker(sym);
      }
    } catch {}
    setSearch(''); setShowDrop(false); setSuggestions([]);
  };

  const removeTicker = (sym: string) => setWatchlist(prev => prev.filter(t => t.sym !== sym));

  const typeColor = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'EQUITY':      return '#3b82f6';
      case 'ETF':         return '#22c55e';
      case 'CRYPTOCURRENCY': return '#f97316';
      case 'FUTURE':      return '#a855f7';
      case 'CURRENCY':    return '#06b6d4';
      default:            return '#6b7280';
    }
  };

  const typeLabel = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'EQUITY':         return 'Stock';
      case 'ETF':            return 'ETF';
      case 'CRYPTOCURRENCY': return 'Crypto';
      case 'FUTURE':         return 'Future';
      case 'CURRENCY':       return 'Forex';
      default:               return type;
    }
  };

  return (
    <div style={{
      width: '240px', background: '#0d0d14', borderRight: '1px solid #1e2028',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{ padding: '8px 12px', fontSize: '10px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', borderBottom: '1px solid #1e2028' }}>
        WATCHLIST
      </div>

      {/* Search */}
      <div ref={searchRef} style={{ padding: '8px', borderBottom: '1px solid #1e2028', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1a1a24', border: '1px solid #2a2a38', borderRadius: '4px', padding: '4px 8px' }}>
          <span style={{ fontSize: '10px', color: '#4a5060' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && suggestions.length > 0) addTicker(suggestions[0].sym, suggestions[0].name);
              if (e.key === 'Escape') setShowDrop(false);
            }}
            placeholder="Ticker ou nom..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: '11px', color: '#c8d0db', fontFamily: 'JetBrains Mono, monospace',
            }}
          />
          {searching && <span style={{ fontSize: '9px', color: '#4a5060' }}>...</span>}
        </div>

        {/* Dropdown */}
        {showDrop && suggestions.length > 0 && (
          <div style={{
            position: 'absolute', top: '44px', left: '8px', right: '8px',
            background: '#0d0d14', border: '1px solid #2a2a38', borderRadius: '4px',
            zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.6)', overflow: 'hidden',
          }}>
            {suggestions.map((s, i) => (
              <div
                key={i}
                onClick={() => addTicker(s.sym, s.name)}
                style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #13131a' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#13131a')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: '#f0c040', fontWeight: 600 }}>{s.sym}</span>
                  <span style={{ fontSize: '8px', padding: '1px 5px', borderRadius: '2px', background: typeColor(s.type) + '22', color: typeColor(s.type), fontFamily: 'JetBrains Mono, monospace' }}>
                    {typeLabel(s.type)}
                  </span>
                </div>
                <div style={{ fontSize: '9px', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticker list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {watchlist.length === 0 ? (
          <div style={{ padding: '16px 12px', fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.8 }}>
            Tape un ticker<br />ou un nom<br />pour commencer
          </div>
        ) : (
          watchlist.map(t => (
            <div
              key={t.sym}
              onClick={() => onSelectTicker(t.sym)}
              style={{
                padding: '7px 12px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid #13131a',
                borderLeft: selectedTicker === t.sym ? '2px solid #f0c040' : '2px solid transparent',
                background: selectedTicker === t.sym ? '#14141f' : 'transparent',
              }}
            >
              <div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 600, color: '#e0e8f0' }}>{t.sym}</div>
                {t.name && (
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#4a5060', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.name}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#e0e8f0' }}>{t.price?.toFixed(2)}</div>
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