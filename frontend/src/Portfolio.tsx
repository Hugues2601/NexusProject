import React, { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Legend
} from 'recharts';

interface Position {
  sym: string;
  qty: number;
  buyPrice: number;
  buyDate: string;
  currentPrice: number;
}

interface SpyPoint {
  date: string;
  portfolio: number;
  spy: number;
}

interface RiskMetrics {
  sharpe: number;
  max_dd: number;
  vol: number;
  beta: number;
  var95: number;
  var99: number;
  correlations: Record<string, Record<string, number>>;
}

const COLORS = ['#f0c040', '#22c55e', '#3b82f6', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];

function Portfolio() {
  const [positions, setPositions]     = useState<Position[]>([]);
  const [search, setSearch]           = useState('');
  const [qty, setQty]                 = useState('');
  const [date, setDate]               = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [spyData, setSpyData]         = useState<SpyPoint[]>([]);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);

  const addPosition = async () => {
    const sym = search.toUpperCase().trim();
    if (!sym || !qty || !date) { setError('Remplis tous les champs'); return; }
    setLoading(true); setError('');
    try {
      const [histRes, currRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/price_at_date?sym=${sym}&date=${date}`),
        fetch(`http://127.0.0.1:8000/ticker?sym=${sym}`)
      ]);
      const histData = await histRes.json();
      const currData = await currRes.json();
      if (!histData || !currData) { setError('Ticker introuvable'); setLoading(false); return; }
      setPositions(prev => [...prev, {
        sym, qty: parseFloat(qty),
        buyPrice: histData.price, buyDate: histData.date,
        currentPrice: currData.price,
      }]);
      setSearch(''); setQty(''); setDate('');
    } catch { setError('Erreur de connexion'); }
    setLoading(false);
  };

  const removePosition = (sym: string) => setPositions(prev => prev.filter(p => p.sym !== sym));

  // Refresh prix
  useEffect(() => {
    if (positions.length === 0) return;
    const interval = setInterval(async () => {
      const updated = await Promise.all(positions.map(async p => {
        try {
          const res = await fetch(`http://127.0.0.1:8000/ticker?sym=${p.sym}`);
          const data = await res.json();
          return data ? { ...p, currentPrice: data.price } : p;
        } catch { return p; }
      }));
      setPositions(updated);
    }, 30000);
    return () => clearInterval(interval);
  }, [positions]);

  // Fetch SPY comparison
  useEffect(() => {
    if (positions.length === 0) { setSpyData([]); return; }
    const fetchComparison = async () => {
      try {
        const oldestDate = positions.reduce((min, p) => p.buyDate < min ? p.buyDate : min, positions[0].buyDate);
        const responses = await Promise.all([
          ...positions.map(p => fetch(`http://127.0.0.1:8000/history?sym=${p.sym}&tf=1D`).then(r => r.json())),
          fetch(`http://127.0.0.1:8000/history?sym=SPY&tf=1D`).then(r => r.json())
        ]);
        const spyHist  = responses[responses.length - 1];
        const posHists = responses.slice(0, positions.length);
        if (!Array.isArray(spyHist)) return;
        const spyFiltered = spyHist.filter((p: any) => {
          const d = new Date(p.time * 1000).toISOString().split('T')[0];
          return d >= oldestDate;
        });
        if (spyFiltered.length === 0) return;
        const spyBase = spyFiltered[0].close;
        const points: SpyPoint[] = spyFiltered.map((s: any) => {
          const d = new Date(s.time * 1000).toISOString().split('T')[0];
          const spyPct = +((s.close - spyBase) / spyBase * 100).toFixed(2);
          let totalValue = 0, totalCost = 0;
          positions.forEach((pos, i) => {
            const hist = posHists[i];
            if (!Array.isArray(hist)) return;
            const point = hist.find((h: any) => new Date(h.time * 1000).toISOString().split('T')[0] === d);
            if (d >= pos.buyDate) {
              totalValue += (point ? point.close : pos.currentPrice) * pos.qty;
              totalCost  += pos.buyPrice * pos.qty;
            }
          });
          return { date: d, portfolio: totalCost > 0 ? +((totalValue - totalCost) / totalCost * 100).toFixed(2) : 0, spy: spyPct };
        });
        setSpyData(points);
      } catch (e) { console.error(e); }
    };
    fetchComparison();
  }, [positions]);

  // Fetch Risk Metrics
  useEffect(() => {
    if (positions.length === 0) { setRiskMetrics(null); return; }
    const fetchRisk = async () => {
      try {
        const syms = positions.map(p => p.sym).join(',');
        const res = await fetch(`http://127.0.0.1:8000/risk?syms=${syms}`);
        const data = await res.json();
        setRiskMetrics(data);
      } catch (e) { console.error('Erreur risk:', e); }
    };
    fetchRisk();
  }, [positions]);

  const totalInvested = positions.reduce((s, p) => s + p.buyPrice * p.qty, 0);
  const totalCurrent  = positions.reduce((s, p) => s + p.currentPrice * p.qty, 0);
  const totalPnl      = totalCurrent - totalInvested;
  const totalPct      = totalInvested > 0 ? (totalPnl / totalInvested * 100) : 0;

  const pieData = positions.map(p => ({ name: p.sym, value: +(p.currentPrice * p.qty).toFixed(2) }));
  const barData = positions.map(p => ({
    name: p.sym,
    pct:  +((p.currentPrice - p.buyPrice) / p.buyPrice * 100).toFixed(2),
    pnl:  +((p.currentPrice - p.buyPrice) * p.qty).toFixed(2),
  })).sort((a, b) => b.pct - a.pct);

  const inputStyle: React.CSSProperties = {
    background: '#1a1a24', border: '1px solid #2a2a38', borderRadius: '4px',
    padding: '6px 8px', fontSize: '11px', color: '#c8d0db',
    fontFamily: 'JetBrains Mono, monospace', outline: 'none', width: '100%',
  };

  const panelTitle = (t: string) => (
    <div style={{ fontSize: '9px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', marginBottom: '8px' }}>{t}</div>
  );

  const CustomBarLabel = ({ x, y, width, value, index }: any) => {
    const pnl = barData[index]?.pnl;
    const color = value >= 0 ? '#22c55e' : '#ef4444';
    return (
      <text x={x + width + 6} y={y + 10} fill={color} fontSize={9} fontFamily="JetBrains Mono, monospace">
        {value >= 0 ? '+' : ''}{value}% ({pnl >= 0 ? '+' : ''}${Math.abs(pnl).toLocaleString()})
      </text>
    );
  };

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* Left panel */}
      <div style={{
        width: '220px', background: '#0d0d14', borderRight: '1px solid #1e2028',
        display: 'flex', flexDirection: 'column', flexShrink: 0, padding: '12px',
      }}>
        {panelTitle('ADD POSITION')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input value={search} onChange={e => { setSearch(e.target.value); setError(''); }} placeholder="Ticker (ex: AAPL)" style={inputStyle} />
          <input value={qty} onChange={e => setQty(e.target.value)} placeholder="Quantité" type="number" style={inputStyle} />
          <div style={{ fontSize: '9px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>Date d'achat</div>
          <input value={date} onChange={e => setDate(e.target.value)} type="date" style={{ ...inputStyle, colorScheme: 'dark' }} />
          {error && <div style={{ fontSize: '10px', color: '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>{error}</div>}
          <button onClick={addPosition} disabled={loading} style={{
            background: loading ? '#2a2a38' : '#f0c040', border: 'none', borderRadius: '4px',
            padding: '8px', fontSize: '11px', color: '#0a0a0f',
            cursor: loading ? 'wait' : 'pointer', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace',
          }}>{loading ? 'Chargement...' : '+ Ajouter'}</button>
        </div>

        {positions.length > 0 && (
          <div style={{ marginTop: '24px', borderTop: '1px solid #1e2028', paddingTop: '12px' }}>
            {panelTitle('SUMMARY')}
            {[
              { label: 'Investi', val: `$${totalInvested.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
              { label: 'Valeur',  val: `$${totalCurrent.toLocaleString('en',  { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
              { label: 'P&L',     val: `${totalPnl >= 0 ? '+' : ''}$${Math.abs(totalPnl).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: totalPnl >= 0 ? '#22c55e' : '#ef4444' },
              { label: 'Return',  val: `${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(2)}%`, color: totalPct >= 0 ? '#22c55e' : '#ef4444' },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>{f.label}</span>
                <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: (f as any).color ?? '#c8d0db' }}>{f.val}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right — main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Positions table */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2028', overflowY: 'auto', maxHeight: '200px' }}>
          {panelTitle('POSITIONS')}
          {positions.length === 0 ? (
            <div style={{ fontSize: '11px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>Aucune position. Ajoute un ticker à gauche.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e2028' }}>
                  {['Ticker','Qté','Date achat','Prix achat','Prix actuel','Valeur','P&L','%',''].map(h => (
                    <th key={h} style={{ padding: '4px 10px', textAlign: 'left', fontSize: '9px', color: '#4a5060', letterSpacing: '1px', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map((p, i) => {
                  const pnl   = (p.currentPrice - p.buyPrice) * p.qty;
                  const pct   = (p.currentPrice - p.buyPrice) / p.buyPrice * 100;
                  const val   = p.currentPrice * p.qty;
                  const color = pnl >= 0 ? '#22c55e' : '#ef4444';
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #13131a' }}>
                      <td style={{ padding: '6px 10px', color: '#f0c040', fontWeight: 600 }}>{p.sym}</td>
                      <td style={{ padding: '6px 10px', color: '#c8d0db' }}>{p.qty}</td>
                      <td style={{ padding: '6px 10px', color: '#6b7280' }}>{p.buyDate}</td>
                      <td style={{ padding: '6px 10px', color: '#c8d0db' }}>${p.buyPrice.toFixed(2)}</td>
                      <td style={{ padding: '6px 10px', color: '#c8d0db' }}>${p.currentPrice.toFixed(2)}</td>
                      <td style={{ padding: '6px 10px', color: '#c8d0db' }}>${val.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td style={{ padding: '6px 10px', color }}>{pnl >= 0 ? '+' : ''}${Math.abs(pnl).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td style={{ padding: '6px 10px', color }}>{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</td>
                      <td style={{ padding: '6px 10px' }}>
                        <span onClick={() => removePosition(p.sym)} style={{ color: '#3a3a50', cursor: 'pointer', fontSize: '10px' }}>✕</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Charts */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Pie + Bar */}
          <div style={{ display: 'flex', height: '200px', borderBottom: '1px solid #1e2028' }}>
            <div style={{ flex: 1, padding: '8px 12px', borderRight: '1px solid #1e2028' }}>
              {panelTitle('ALLOCATION')}
              {positions.length === 0 ? (
                <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>Aucune position</div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={60} dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false} fontSize={9}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0d0d14', border: '1px solid #1e2028', borderRadius: '4px', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace' }}
                      formatter={(val: any) => [`$${val.toLocaleString()}`, 'Valeur']} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div style={{ flex: 1, padding: '8px 12px' }}>
              {panelTitle('P&L PAR POSITION')}
              {positions.length === 0 ? (
                <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>Aucune position</div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 120 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2028" />
                    <XAxis type="number" tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }} tickFormatter={v => `${v}%`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#f0c040', fontFamily: 'JetBrains Mono, monospace' }} width={40} />
                    <Tooltip contentStyle={{ background: '#0d0d14', border: '1px solid #1e2028', borderRadius: '4px', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace' }}
                      formatter={(val: any, name: any, props: any) => [`${val >= 0 ? '+' : ''}${val}% (${props.payload.pnl >= 0 ? '+' : ''}$${Math.abs(props.payload.pnl).toLocaleString()})`, 'P&L']} />
                    <Bar dataKey="pct" label={<CustomBarLabel />} radius={[0, 3, 3, 0]}>
                      {barData.map((entry, i) => <Cell key={i} fill={entry.pct >= 0 ? '#22c55e' : '#ef4444'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Line chart vs SPY */}
          <div style={{ flex: 1, padding: '8px 12px', minHeight: 0, borderBottom: '1px solid #1e2028' }}>
            {panelTitle('PORTFOLIO VS S&P 500')}
            {spyData.length === 0 ? (
              <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>
                {positions.length === 0 ? 'Aucune position' : 'Chargement...'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={spyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2028" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}
                    tickFormatter={d => d.slice(5)} interval={Math.floor(spyData.length / 6)} />
                  <YAxis tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={{ background: '#0d0d14', border: '1px solid #1e2028', borderRadius: '4px', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace' }}
                    formatter={(val: any) => [`${val >= 0 ? '+' : ''}${val}%`]} />
                  <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace' }} />
                  <Line type="monotone" dataKey="portfolio" stroke="#f0c040" dot={false} strokeWidth={1.5} name="Portfolio" />
                  <Line type="monotone" dataKey="spy" stroke="#6b7280" dot={false} strokeWidth={1.5} name="S&P 500" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bottom — Risk + Correlation */}
          {positions.length > 0 && (
            <div style={{ display: 'flex', height: '150px', flexShrink: 0 }}>

              {/* Risk Metrics */}
              <div style={{ flex: 1, padding: '8px 12px', borderRight: '1px solid #1e2028', background: '#0d0d14' }}>
                {panelTitle('RISK METRICS')}
                {!riskMetrics ? (
                  <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>Chargement...</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                    {[
                      { label: 'Sharpe',     val: riskMetrics.sharpe.toFixed(2),      color: riskMetrics.sharpe >= 1 ? '#22c55e' : riskMetrics.sharpe >= 0 ? '#f0c040' : '#ef4444' },
                      { label: 'Max DD',     val: riskMetrics.max_dd.toFixed(2) + '%', color: '#ef4444' },
                      { label: 'Volatility', val: riskMetrics.vol.toFixed(2) + '%',    color: '#c8d0db' },
                      { label: 'Beta',       val: riskMetrics.beta.toFixed(2),         color: riskMetrics.beta > 1 ? '#f0c040' : '#22c55e' },
                      { label: 'VaR 95%',    val: riskMetrics.var95.toFixed(2) + '%',  color: '#ef4444' },
                      { label: 'VaR 99%',    val: riskMetrics.var99.toFixed(2) + '%',  color: '#ef4444' },
                    ].map(f => (
                      <div key={f.label} style={{ background: '#13131a', borderRadius: '4px', padding: '6px 8px' }}>
                        <div style={{ fontSize: '9px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace', marginBottom: '4px' }}>{f.label}</div>
                        <div style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: f.color, fontWeight: 600 }}>{f.val}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Correlation Matrix */}
              <div style={{ flex: 1, padding: '8px 12px', background: '#0d0d14', overflowX: 'auto' }}>
                {panelTitle('CORRELATION MATRIX')}
                {!riskMetrics?.correlations ? (
                  <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>Chargement...</div>
                ) : (
                  <table style={{ borderCollapse: 'collapse', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '3px 8px', color: '#4a5060', fontSize: '9px' }}></th>
                        {positions.map(p => (
                          <th key={p.sym} style={{ padding: '3px 8px', color: '#f0c040', fontSize: '9px', fontWeight: 600 }}>{p.sym}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map(row => (
                        <tr key={row.sym}>
                          <td style={{ padding: '3px 8px', color: '#f0c040', fontSize: '9px', fontWeight: 600 }}>{row.sym}</td>
                          {positions.map(col => {
                            const corr = riskMetrics.correlations[row.sym]?.[col.sym] ?? 0;
                            const abs  = Math.abs(corr);
                            const bg   = row.sym === col.sym ? '#1a1a24' :
                              corr > 0.7 ? `rgba(239,68,68,${abs * 0.6})` :
                              corr > 0   ? `rgba(240,192,64,${abs * 0.4})` :
                              `rgba(34,197,94,${abs * 0.4})`;
                            return (
                              <td key={col.sym} style={{
                                padding: '3px 8px', textAlign: 'center', background: bg,
                                borderRadius: '2px', color: row.sym === col.sym ? '#4a5060' : '#c8d0db',
                                fontSize: '10px'
                              }}>
                                {corr.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Portfolio;