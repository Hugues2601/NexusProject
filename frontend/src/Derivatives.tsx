import React, { useEffect, useState, useRef } from 'react';
import Plot from 'react-plotly.js';

interface OptionRow {
  strike: number;
  bid: number;
  ask: number;
  last: number;
  iv: number;
  oi: number;
  volume: number;
  itm: boolean;
  type: string;
}

interface OptionsChain {
  sym: string;
  spot: number;
  expiry: string;
  expiries: string[];
  calls: OptionRow[];
  puts: OptionRow[];
}

interface VolSurface {
  sym: string;
  spot: number;
  data: { expiry: string; days: number; strike: number; moneyness: number; iv: number }[];
}

interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  price_bs: number;
  price_put: number;
}

const VolSurfacePlot = ({ sp, sym }: { sp: any; sym: string }) => {
  const PlotComponent = Plot as any;
  return (
    <PlotComponent
      data={[{
        type: 'surface',
        x: sp.x,
        y: sp.y,
        z: sp.z,
        colorscale: [
          [0,   '#0a0a0f'],
          [0.2, '#1a3a5c'],
          [0.4, '#1e5a8c'],
          [0.6, '#f0c040'],
          [0.8, '#f97316'],
          [1.0, '#ef4444'],
        ],
        showscale: true,
        colorbar: {
          title: 'IV %',
          tickfont: { color: '#6b7280', size: 10 },
          bgcolor: '#0d0d14',
          bordercolor: '#1e2028',
        },
        contours: {
          z: { show: true, usecolormap: true, highlightcolor: '#f0c040', project: { z: true } }
        },
      }]}
      layout={{
        paper_bgcolor: '#0a0a0f',
        plot_bgcolor:  '#0a0a0f',
        scene: {
          xaxis: { title: 'Moneyness (K/S)', tickfont: { color: '#6b7280', size: 10 }, gridcolor: '#1e2028', backgroundcolor: '#0d0d14' },
          yaxis: { title: 'Days to Expiry',  tickfont: { color: '#6b7280', size: 10 }, gridcolor: '#1e2028', backgroundcolor: '#0d0d14' },
          zaxis: { title: 'Implied Vol %',   tickfont: { color: '#6b7280', size: 10 }, gridcolor: '#1e2028', backgroundcolor: '#0d0d14' },
          bgcolor: '#0a0a0f',
          camera: { eye: { x: 1.8, y: -1.8, z: 1.2 } },
        },
        margin: { l: 0, r: 0, t: 40, b: 0 },
        title: {
          text: `${sym} Implied Volatility Surface`,
          font: { color: '#f0c040', size: 14, family: 'JetBrains Mono' },
        },
      }}
      style={{ width: '100%', height: '100%' }}
      config={{ responsive: true, displayModeBar: true, displaylogo: false }}
      useResizeHandler
    />
  );
};

function Derivatives() {
  const [ticker, setTicker]           = useState('AAPL');
  const [input, setInput]             = useState('AAPL');
  const [expiry, setExpiry]           = useState('');
  const [chain, setChain]             = useState<OptionsChain | null>(null);
  const [surface, setSurface]         = useState<VolSurface | null>(null);
  const [selectedRow, setSelectedRow] = useState<OptionRow | null>(null);
  const [greeks, setGreeks]           = useState<Greeks | null>(null);
  const [loadingChain, setLoadingChain]     = useState(false);
  const [loadingSurface, setLoadingSurface] = useState(false);
  const [activeTab, setActiveTab]     = useState<'chain' | 'surface' | 'calculator'>('chain');
  const [calcInputs, setCalcInputs]   = useState({ S: 189.42, K: 190, T: 45, r: 5.25, sigma: 24 });
  const [calcResult, setCalcResult]   = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDrop, setShowDrop]       = useState(false);
  const [searching, setSearching]     = useState(false);
  const debounceRef                   = useRef<any>(null);
  const searchRef                     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!input.trim()) { setSuggestions([]); setShowDrop(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res  = await fetch(`http://127.0.0.1:8000/search?q=${encodeURIComponent(input)}`);
        const data = await res.json();
        if (Array.isArray(data)) { setSuggestions(data); setShowDrop(true); }
      } catch {}
      setSearching(false);
    }, 300);
  }, [input]);

  const selectTicker = (sym: string) => {
    setInput(sym);
    setTicker(sym);
    setShowDrop(false);
    setSuggestions([]);
  };

  const typeColor = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'EQUITY':         return '#3b82f6';
      case 'ETF':            return '#22c55e';
      case 'CRYPTOCURRENCY': return '#f97316';
      case 'FUTURE':         return '#a855f7';
      case 'CURRENCY':       return '#06b6d4';
      default:               return '#6b7280';
    }
  };

  const fetchChain = async (sym: string, exp: string) => {
    setLoadingChain(true);
    try {
      const url  = `http://127.0.0.1:8000/options_chain?sym=${sym}${exp ? `&expiry=${exp}` : ''}`;
      const res  = await fetch(url);
      const data = await res.json();
      setChain(data);
      if (data.expiry) setExpiry(data.expiry);
    } catch (e) { console.error(e); }
    setLoadingChain(false);
  };

  const fetchSurface = async (sym: string) => {
    setLoadingSurface(true);
    try {
      const res  = await fetch(`http://127.0.0.1:8000/vol_surface?sym=${sym}`);
      const data = await res.json();
      setSurface(data);
    } catch (e) { console.error(e); }
    setLoadingSurface(false);
  };

  const fetchGreeks = async (row: OptionRow) => {
    if (!chain) return;
    try {
      const expDate = new Date(chain.expiry);
      const T = Math.max((expDate.getTime() - Date.now()) / (365 * 24 * 3600 * 1000), 0.001);
      const res  = await fetch(`http://127.0.0.1:8000/greeks?S=${chain.spot}&K=${row.strike}&T=${T}&r=0.0525&sigma=${row.iv / 100}`);
      const data = await res.json();
      setGreeks(data);
    } catch (e) { console.error(e); }
  };

  const calcGreeks = async () => {
    try {
      const T     = calcInputs.T / 365;
      const r     = calcInputs.r / 100;
      const sigma = calcInputs.sigma / 100;
      const res   = await fetch(`http://127.0.0.1:8000/greeks?S=${calcInputs.S}&K=${calcInputs.K}&T=${T}&r=${r}&sigma=${sigma}`);
      const data  = await res.json();
      setCalcResult(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchChain(ticker, '');
    fetchSurface(ticker);
  }, [ticker]);

  const handleSelectRow = (row: OptionRow) => {
    setSelectedRow(row);
    fetchGreeks(row);
  };

  const surfacePlotData = () => {
    if (!surface?.data.length) return null;
    const days      = Array.from(new Set(surface.data.map(d => d.days))).sort((a, b) => a - b);
    const moneyness = Array.from(new Set(surface.data.map(d => Math.round(d.moneyness * 20) / 20))).sort((a, b) => a - b);
    const z = days.map(d =>
      moneyness.map(m => {
        const pts = surface.data.filter(p => p.days === d && Math.abs(p.moneyness - m) < 0.03);
        return pts.length ? pts.reduce((s, p) => s + p.iv, 0) / pts.length : null;
      })
    );
    return { x: moneyness, y: days, z };
  };

  const sp = surfacePlotData();

  const panelTitle = (t: string) => (
    <div style={{ fontSize: '9px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', marginBottom: '10px', fontFamily: 'JetBrains Mono, monospace' }}>{t}</div>
  );

  const inputStyle: React.CSSProperties = {
    background: '#1a1a24', border: '1px solid #2a2a38', borderRadius: '4px',
    padding: '6px 10px', fontSize: '12px', color: '#c8d0db',
    fontFamily: 'JetBrains Mono, monospace', outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: '#0a0a0f' }}>

      {/* Left Panel */}
      <div style={{ width: '240px', background: '#0d0d14', borderRight: '1px solid #1e2028', padding: '14px', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>

        {panelTitle('DERIVATIVES')}

        {/* Search with autocomplete */}
        <div ref={searchRef} style={{ marginBottom: '16px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1a1a24', border: '1px solid #2a2a38', borderRadius: '4px', padding: '4px 8px' }}>
            <span style={{ fontSize: '10px', color: '#4a5060' }}>🔍</span>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && suggestions.length > 0) selectTicker(suggestions[0].sym);
                if (e.key === 'Escape') setShowDrop(false);
              }}
              placeholder="Ticker or company..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: '12px', color: '#c8d0db', fontFamily: 'JetBrains Mono, monospace',
              }}
            />
            {searching && <span style={{ fontSize: '9px', color: '#4a5060' }}>...</span>}
          </div>

          {showDrop && suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '36px', left: 0, right: 0,
              background: '#0d0d14', border: '1px solid #2a2a38', borderRadius: '4px',
              zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.6)', overflow: 'hidden',
            }}>
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  onClick={() => selectTicker(s.sym)}
                  style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #13131a' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#13131a')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: '#f0c040', fontWeight: 600 }}>{s.sym}</span>
                    <span style={{ fontSize: '8px', padding: '1px 5px', borderRadius: '2px', background: typeColor(s.type) + '22', color: typeColor(s.type), fontFamily: 'JetBrains Mono, monospace' }}>
                      {s.type}
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

        {/* Spot price */}
        {chain && (
          <div style={{ marginBottom: '16px', padding: '10px', background: '#13131a', borderRadius: '6px', border: '1px solid #1e2028' }}>
            <div style={{ fontSize: '11px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace', marginBottom: '4px' }}>SPOT PRICE</div>
            <div style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: '#f0c040' }}>${chain.spot}</div>
            <div style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace', marginTop: '4px' }}>{chain.sym}</div>
          </div>
        )}

        {/* Greeks */}
        {panelTitle('GREEKS — SELECTED STRIKE')}
        {!selectedRow ? (
          <div style={{ fontSize: '11px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.8 }}>
            Click a strike in the chain to compute Greeks
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace', marginBottom: '10px' }}>
              {selectedRow.type.toUpperCase()} K={selectedRow.strike} IV={selectedRow.iv}%
            </div>
            {greeks && [
              { name: 'Δ Delta', val: greeks.delta.toFixed(4),  color: greeks.delta > 0 ? '#22c55e' : '#ef4444' },
              { name: 'Γ Gamma', val: greeks.gamma.toFixed(6),  color: '#c8d0db' },
              { name: 'Θ Theta', val: greeks.theta.toFixed(4),  color: '#ef4444' },
              { name: 'ν Vega',  val: greeks.vega.toFixed(4),   color: '#c8d0db' },
              { name: 'ρ Rho',   val: greeks.rho.toFixed(4),    color: '#c8d0db' },
            ].map(g => (
              <div key={g.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '6px 8px', background: '#13131a', borderRadius: '4px' }}>
                <span style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>{g.name}</span>
                <span style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: g.color, fontWeight: 600 }}>{g.val}</span>
              </div>
            ))}
            {greeks && (
              <div style={{ marginTop: '10px', padding: '8px', background: '#1a1a24', borderRadius: '4px', border: '1px solid #2a2a38' }}>
                <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace', marginBottom: '4px' }}>BS PRICE</div>
                <div style={{ fontSize: '16px', color: '#f0c040', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                  ${selectedRow.type === 'call' ? greeks.price_bs.toFixed(2) : greeks.price_put.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Sub-tabs + expiry selector */}
        <div style={{ height: '40px', background: '#0d0d14', borderBottom: '1px solid #1e2028', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '8px', flexShrink: 0 }}>
          {(['chain', 'surface', 'calculator'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding: '4px 14px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace',
              background: activeTab === t ? '#1a1a24' : 'transparent',
              border: `1px solid ${activeTab === t ? '#f0c040' : '#2a2a38'}`,
              color: activeTab === t ? '#f0c040' : '#6b7280',
              cursor: 'pointer', borderRadius: '3px', textTransform: 'uppercase',
            }}>{t}</button>
          ))}

          {activeTab === 'chain' && chain && (
            <select
              value={expiry}
              onChange={e => { setExpiry(e.target.value); fetchChain(ticker, e.target.value); }}
              style={{ ...inputStyle, marginLeft: 'auto', fontSize: '11px' }}
            >
            {(chain.expiries ?? []).map(e => (
            <option key={e} value={e}>{e}</option>
            ))}
            </select>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* OPTIONS CHAIN */}
          {activeTab === 'chain' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loadingChain ? (
                <div style={{ padding: '20px', fontSize: '12px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>Loading options chain...</div>
              ) : chain && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#0d0d14', zIndex: 10 }}>
                    <tr style={{ borderBottom: '1px solid #1e2028' }}>
                      <th style={{ padding: '8px 10px', color: '#22c55e', textAlign: 'right', fontSize: '10px' }}>OI</th>
                      <th style={{ padding: '8px 10px', color: '#22c55e', textAlign: 'right', fontSize: '10px' }}>Vol</th>
                      <th style={{ padding: '8px 10px', color: '#22c55e', textAlign: 'right', fontSize: '10px' }}>IV%</th>
                      <th style={{ padding: '8px 10px', color: '#22c55e', textAlign: 'right', fontSize: '10px' }}>Bid</th>
                      <th style={{ padding: '8px 10px', color: '#22c55e', textAlign: 'right', fontSize: '10px' }}>Ask</th>
                      <th style={{ padding: '8px 14px', color: '#f0c040', textAlign: 'center', fontSize: '11px', background: '#13131a' }}>STRIKE</th>
                      <th style={{ padding: '8px 10px', color: '#ef4444', textAlign: 'left', fontSize: '10px' }}>Bid</th>
                      <th style={{ padding: '8px 10px', color: '#ef4444', textAlign: 'left', fontSize: '10px' }}>Ask</th>
                      <th style={{ padding: '8px 10px', color: '#ef4444', textAlign: 'left', fontSize: '10px' }}>IV%</th>
                      <th style={{ padding: '8px 10px', color: '#ef4444', textAlign: 'left', fontSize: '10px' }}>Vol</th>
                      <th style={{ padding: '8px 10px', color: '#ef4444', textAlign: 'left', fontSize: '10px' }}>OI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(chain.calls ?? []).map((call, i) => {
                      const put     = chain.puts.find(p => p.strike === call.strike);
                      const isAtm   = Math.abs(call.strike - chain.spot) < chain.spot * 0.01;
                      const callItm = call.strike < chain.spot;
                      const putItm  = call.strike > chain.spot;
                      return (
                        <tr key={i} style={{
                          borderBottom: '1px solid #13131a',
                          background: isAtm ? '#1a1a10' : 'transparent',
                          borderLeft: isAtm ? '2px solid #f0c040' : '2px solid transparent',
                        }}>
                          <td onClick={() => handleSelectRow(call)} style={{ padding: '6px 10px', textAlign: 'right', color: '#6b7280', cursor: 'pointer', background: callItm ? '#051505' : 'transparent' }}>{call.oi.toLocaleString()}</td>
                          <td onClick={() => handleSelectRow(call)} style={{ padding: '6px 10px', textAlign: 'right', color: '#6b7280', cursor: 'pointer', background: callItm ? '#051505' : 'transparent' }}>{call.volume.toLocaleString()}</td>
                          <td onClick={() => handleSelectRow(call)} style={{ padding: '6px 10px', textAlign: 'right', color: '#86efac', cursor: 'pointer', background: callItm ? '#051505' : 'transparent' }}>{call.iv}%</td>
                          <td onClick={() => handleSelectRow(call)} style={{ padding: '6px 10px', textAlign: 'right', color: '#22c55e', fontWeight: 600, cursor: 'pointer', background: callItm ? '#051505' : 'transparent' }}>{call.bid}</td>
                          <td onClick={() => handleSelectRow(call)} style={{ padding: '6px 10px', textAlign: 'right', color: '#22c55e', fontWeight: 600, cursor: 'pointer', background: callItm ? '#051505' : 'transparent' }}>{call.ask}</td>
                          <td style={{ padding: '6px 14px', textAlign: 'center', background: '#13131a', fontWeight: 600, color: isAtm ? '#f0c040' : '#c8d0db', fontSize: '12px' }}>
                            {call.strike}
                            {isAtm && <span style={{ fontSize: '8px', color: '#f0c040', marginLeft: '4px' }}>ATM</span>}
                          </td>
                          {put ? (
                            <>
                              <td onClick={() => handleSelectRow(put)} style={{ padding: '6px 10px', textAlign: 'left', color: '#ef4444', fontWeight: 600, cursor: 'pointer', background: putItm ? '#150505' : 'transparent' }}>{put.bid}</td>
                              <td onClick={() => handleSelectRow(put)} style={{ padding: '6px 10px', textAlign: 'left', color: '#ef4444', fontWeight: 600, cursor: 'pointer', background: putItm ? '#150505' : 'transparent' }}>{put.ask}</td>
                              <td onClick={() => handleSelectRow(put)} style={{ padding: '6px 10px', textAlign: 'left', color: '#f87171', cursor: 'pointer', background: putItm ? '#150505' : 'transparent' }}>{put.iv}%</td>
                              <td onClick={() => handleSelectRow(put)} style={{ padding: '6px 10px', textAlign: 'left', color: '#6b7280', cursor: 'pointer', background: putItm ? '#150505' : 'transparent' }}>{put.volume.toLocaleString()}</td>
                              <td onClick={() => handleSelectRow(put)} style={{ padding: '6px 10px', textAlign: 'left', color: '#6b7280', cursor: 'pointer', background: putItm ? '#150505' : 'transparent' }}>{put.oi.toLocaleString()}</td>
                            </>
                          ) : <td colSpan={5} />}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* VOL SURFACE 3D */}
          {activeTab === 'surface' && (
            <div style={{ flex: 1, background: '#0a0a0f' }}>
              {loadingSurface ? (
                <div style={{ padding: '20px', fontSize: '12px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>Loading volatility surface...</div>
              ) : sp ? (
                <VolSurfacePlot sp={sp} sym={surface?.sym ?? ''} />
              ) : (
                <div style={{ padding: '20px', fontSize: '12px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>No surface data available</div>
              )}
            </div>
          )}

          {/* CALCULATOR */}
          {activeTab === 'calculator' && (
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
              <div style={{ maxWidth: '600px' }}>
                {panelTitle('BLACK-SCHOLES PRICING CALCULATOR — C++ ENGINE')}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  {[
                    { key: 'S',     label: 'Spot Price (S)',     unit: '$'    },
                    { key: 'K',     label: 'Strike Price (K)',   unit: '$'    },
                    { key: 'T',     label: 'Days to Expiry (T)', unit: 'days' },
                    { key: 'r',     label: 'Risk-Free Rate (r)', unit: '%'    },
                    { key: 'sigma', label: 'Volatility (σ)',     unit: '%'    },
                  ].map(f => (
                    <div key={f.key}>
                      <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace', marginBottom: '6px' }}>
                        {f.label}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="number"
                          value={(calcInputs as any)[f.key]}
                          onChange={e => setCalcInputs(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) }))}
                          style={{ ...inputStyle, width: '100%' }}
                        />
                        <span style={{ fontSize: '11px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>{f.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={calcGreeks} style={{
                  background: '#f0c040', border: 'none', borderRadius: '4px',
                  padding: '10px 24px', fontSize: '12px', color: '#0a0a0f',
                  cursor: 'pointer', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace',
                  marginBottom: '24px',
                }}>
                  COMPUTE — C++ ENGINE
                </button>

                {calcResult && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                      <div style={{ padding: '16px', background: '#052010', borderRadius: '8px', border: '1px solid #22c55e' }}>
                        <div style={{ fontSize: '10px', color: '#22c55e', fontFamily: 'JetBrains Mono, monospace', marginBottom: '6px' }}>CALL PRICE</div>
                        <div style={{ fontSize: '28px', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: '#22c55e' }}>${calcResult.price_bs?.toFixed(2)}</div>
                      </div>
                      <div style={{ padding: '16px', background: '#200505', borderRadius: '8px', border: '1px solid #ef4444' }}>
                        <div style={{ fontSize: '10px', color: '#ef4444', fontFamily: 'JetBrains Mono, monospace', marginBottom: '6px' }}>PUT PRICE</div>
                        <div style={{ fontSize: '28px', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: '#ef4444' }}>${calcResult.price_put?.toFixed(2)}</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                      {[
                        { name: 'Δ Delta', val: calcResult.delta?.toFixed(4), color: '#22c55e' },
                        { name: 'Γ Gamma', val: calcResult.gamma?.toFixed(6), color: '#c8d0db' },
                        { name: 'Θ Theta', val: calcResult.theta?.toFixed(4), color: '#ef4444' },
                        { name: 'ν Vega',  val: calcResult.vega?.toFixed(4),  color: '#c8d0db' },
                        { name: 'ρ Rho',   val: calcResult.rho?.toFixed(4),   color: '#c8d0db' },
                      ].map(g => (
                        <div key={g.name} style={{ padding: '12px', background: '#0d0d14', borderRadius: '6px', border: '1px solid #1e2028' }}>
                          <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace', marginBottom: '4px' }}>{g.name}</div>
                          <div style={{ fontSize: '16px', fontFamily: 'JetBrains Mono, monospace', color: g.color, fontWeight: 600 }}>{g.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Derivatives;