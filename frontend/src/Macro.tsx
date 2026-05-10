import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell
} from 'recharts';

interface Bank {
  name: string; short: string; rate: number | null; prev: number | null;
  currency: string; next_meeting: string; bias: string;
  history: { date: string; rate: number }[];
}
interface LabourData {
  nfp: { value: number | null; change: number | null; history: { date: string; value: number }[] };
  unemployment: { value: number | null; prev: number | null; change: number | null; history: { date: string; value: number }[] };
  jolts: { value: number | null; prev: number | null; change: number | null };
  participation: { value: number | null; prev: number | null; change: number | null };
  ahe: { value: number | null; prev: number | null; change: number | null };
  sahm: { value: number | null; triggered: boolean };
}
interface GDPCountry { name: string; code: string; value: number | null; prev: number | null; unit: string; history: { date: string; value: number }[] }
interface FinCond {
  vix: number | null; dxy: number | null; tnx: number | null;
  hy_spread: { value: number | null; prev: number | null };
  ig_spread: { value: number | null; prev: number | null };
  ted_spread: { value: number | null; prev: number | null };
}
interface YieldCurve {
  maturities: Record<string, { current: number | null; prev_month: number | null }>;
  spread_2s10s: number | null; spread_3m10y: number | null; inverted: boolean | null;
}

const mono  = 'JetBrains Mono, monospace';
const green = '#22c55e';
const red   = '#ef4444';
const gold  = '#f0c040';

const chgColor  = (v: number | null, invert = false) => !v ? '#6b7280' : invert ? (v < 0 ? green : red) : (v > 0 ? green : red);
const biasColor = (b: string) => b === 'Hawkish' ? red : b === 'Dovish' ? green : gold;
const round     = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

const PanelTitle = ({ t }: { t: string }) => (
  <div style={{ fontSize: '9px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', marginBottom: '12px', fontFamily: mono }}>{t}</div>
);

const SectionTitle = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div style={{ marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid #1e2028' }}>
    <div style={{ fontSize: '11px', fontWeight: 600, color: gold, letterSpacing: '2px', fontFamily: mono, marginBottom: '4px' }}>{title}</div>
    <div style={{ fontSize: '10px', color: '#2a2a38', fontFamily: mono }}>{subtitle}</div>
  </div>
);

const Metric = ({ label, value, change, unit = '', period = '', invert = false }: {
  label: string; value: number | null; change?: number | null; unit?: string; period?: string; invert?: boolean;
}) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #13131a' }}>
    <div>
      <div style={{ fontSize: '11px', color: '#6b7280', fontFamily: mono }}>{label}</div>
      {period && <div style={{ fontSize: '9px', color: '#2a2a38', fontFamily: mono }}>{period}</div>}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {change !== undefined && change !== null && (
        <span style={{ fontSize: '10px', color: chgColor(change, invert), fontFamily: mono }}>
          {change > 0 ? '+' : ''}{change.toFixed(2)}{unit}
        </span>
      )}
      <span style={{ fontSize: '13px', fontWeight: 600, color: '#e0e8f0', fontFamily: mono }}>
        {value !== null && value !== undefined ? `${value}${unit}` : 'N/A'}
      </span>
    </div>
  </div>
);

const MiniChart = ({ data, color, dataKey = 'value', height = 80 }: { data: any[]; color: string; dataKey?: string; height?: number }) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data}>
      <Line type="monotone" dataKey={dataKey} stroke={color} dot={false} strokeWidth={1.5} />
      <Tooltip contentStyle={{ background: '#0d0d14', border: '1px solid #1e2028', fontSize: '10px', fontFamily: mono }}
        formatter={(v: any) => [v, '']} />
    </LineChart>
  </ResponsiveContainer>
);

function Macro() {
  const [banks, setBanks]         = useState<Bank[]>([]);
  const [inflation, setInflation] = useState<any>(null);
  const [labour, setLabour]       = useState<LabourData | null>(null);
  const [gdp, setGdp]             = useState<{ countries: GDPCountry[] } | null>(null);
  const [finCond, setFinCond]     = useState<FinCond | null>(null);
  const [yieldCurve, setYieldCurve] = useState<YieldCurve | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [b, inf, lab, g, fc, yc] = await Promise.all([
          fetch('http://127.0.0.1:8000/macro/central_banks').then(r => r.json()),
          fetch('http://127.0.0.1:8000/macro/inflation').then(r => r.json()),
          fetch('http://127.0.0.1:8000/macro/labour').then(r => r.json()),
          fetch('http://127.0.0.1:8000/macro/gdp').then(r => r.json()),
          fetch('http://127.0.0.1:8000/macro/financial_conditions').then(r => r.json()),
          fetch('http://127.0.0.1:8000/macro/yield_curve_history').then(r => r.json()),
        ]);
        if (b.banks) setBanks(b.banks);
        setInflation(inf);
        setLabour(lab);
        setGdp(g);
        setFinCond(fc);
        setYieldCurve(yc);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchAll();
  }, []);

  const card = (children: React.ReactNode, style: React.CSSProperties = {}) => (
    <div style={{ background: '#0d0d14', borderRadius: '8px', border: '1px solid #1e2028', padding: '16px', ...style }}>
      {children}
    </div>
  );

  const Overview = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
      {card(<>
        <PanelTitle t="CENTRAL BANKS — POLICY RATES" />
        {banks.map(b => (
          <div key={b.short} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #13131a' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#e0e8f0', fontFamily: mono }}>{b.short}</span>
              <span style={{ fontSize: '9px', color: biasColor(b.bias), fontFamily: mono, marginLeft: '8px', padding: '1px 6px', borderRadius: '2px', background: biasColor(b.bias) + '22' }}>{b.bias}</span>
            </div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: gold, fontFamily: mono }}>{b.rate?.toFixed(2)}%</span>
          </div>
        ))}
      </>)}

      {card(<>
        <PanelTitle t="INFLATION — KEY METRICS" />
        {inflation?.usa && <>
          <Metric label="CPI YoY (USA)"    value={inflation.usa.cpi?.value}       unit="%" period="Monthly — BLS" />
          <Metric label="Core CPI (USA)"   value={inflation.usa.core_cpi?.value}  unit="%" period="ex Food & Energy" />
          <Metric label="PCE (USA)"        value={inflation.usa.pce?.value}       unit="%" period="Monthly — BEA" />
          <Metric label="Core PCE (USA)"   value={inflation.usa.core_pce?.value}  unit="%" period="Fed preferred" />
          <Metric label="HICP (Eurozone)"  value={inflation.europe?.hicp?.value}  unit="%" period="Monthly — Eurostat" />
          <div style={{ marginTop: '10px', padding: '6px 10px', background: '#13131a', borderRadius: '4px' }}>
            <span style={{ fontSize: '10px', color: '#4a5060', fontFamily: mono }}>Fed Target: </span>
            <span style={{ fontSize: '10px', color: gold, fontFamily: mono, fontWeight: 600 }}>2.00%</span>
          </div>
        </>}
      </>)}

      {card(<>
        <PanelTitle t="LABOUR MARKET" />
        {labour && <>
          <Metric label="NFP (Monthly)"    value={labour.nfp?.change}          unit="K"  period="Monthly — BLS" />
          <Metric label="Unemployment"     value={labour.unemployment?.value}   unit="%"  period="Monthly — BLS" change={labour.unemployment?.change} invert />
          <Metric label="JOLTS Openings"   value={labour.jolts?.value ? labour.jolts.value / 1000 : null} unit="M" period="Monthly — BLS" />
          <Metric label="Participation"    value={labour.participation?.value}  unit="%"  period="Monthly — BLS" />
          <Metric label="Avg Hourly Earn"  value={labour.ahe?.value}            unit="$"  period="Monthly — BLS" />
          <div style={{ marginTop: '10px', padding: '8px 10px', background: labour.sahm?.triggered ? '#200505' : '#052010', borderRadius: '4px', border: `1px solid ${labour.sahm?.triggered ? red : green}` }}>
            <span style={{ fontSize: '10px', fontFamily: mono, color: labour.sahm?.triggered ? red : green }}>
              Sahm Rule: {labour.sahm?.value?.toFixed(2)}% {labour.sahm?.triggered ? '⚠ TRIGGERED' : '✓ Not triggered'}
            </span>
          </div>
        </>}
      </>)}

      {card(<>
        <PanelTitle t="FINANCIAL CONDITIONS" />
        {finCond && <>
          <Metric label="VIX"          value={finCond.vix}  period="Daily — CBOE" />
          <Metric label="DXY (Dollar)" value={finCond.dxy}  period="Daily — ICE" />
          <Metric label="10Y Treasury" value={finCond.tnx}  unit="%" period="Daily — live" />
          <Metric label="HY Spread"    value={finCond.hy_spread?.value}  unit=" bp" period="ICE BofA — FRED" change={finCond.hy_spread?.value && finCond.hy_spread?.prev ? finCond.hy_spread.value - finCond.hy_spread.prev : null} invert />
          <Metric label="IG Spread"    value={finCond.ig_spread?.value}  unit=" bp" period="ICE BofA — FRED" change={finCond.ig_spread?.value && finCond.ig_spread?.prev ? finCond.ig_spread.value - finCond.ig_spread.prev : null} invert />
          <Metric label="TED Spread"   value={finCond.ted_spread?.value} unit=" bp" period="Monthly — FRED" />
        </>}
      </>)}

      {card(<>
        <PanelTitle t="YIELD CURVE" />
        {yieldCurve && <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '12px' }}>
            {Object.entries(yieldCurve.maturities).map(([mat, data]) => (
              <div key={mat} style={{ background: '#13131a', borderRadius: '4px', padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: '#4a5060', fontFamily: mono, marginBottom: '4px' }}>{mat}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: gold, fontFamily: mono }}>{data.current?.toFixed(2)}%</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1, padding: '8px', background: (yieldCurve.spread_2s10s ?? 0) < 0 ? '#200505' : '#052010', borderRadius: '4px', border: `1px solid ${(yieldCurve.spread_2s10s ?? 0) < 0 ? red : green}` }}>
              <div style={{ fontSize: '9px', color: '#4a5060', fontFamily: mono }}>2s10s Spread</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: (yieldCurve.spread_2s10s ?? 0) < 0 ? red : green, fontFamily: mono }}>{yieldCurve.spread_2s10s?.toFixed(2)}%</div>
            </div>
            <div style={{ flex: 1, padding: '8px', background: (yieldCurve.spread_3m10y ?? 0) < 0 ? '#200505' : '#052010', borderRadius: '4px', border: `1px solid ${(yieldCurve.spread_3m10y ?? 0) < 0 ? red : green}` }}>
              <div style={{ fontSize: '9px', color: '#4a5060', fontFamily: mono }}>3m10y Spread</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: (yieldCurve.spread_3m10y ?? 0) < 0 ? red : green, fontFamily: mono }}>{yieldCurve.spread_3m10y?.toFixed(2)}%</div>
            </div>
          </div>
          {yieldCurve.inverted && (
            <div style={{ marginTop: '8px', padding: '8px', background: '#200505', borderRadius: '4px', border: `1px solid ${red}` }}>
              <span style={{ fontSize: '10px', color: red, fontFamily: mono }}>⚠ INVERTED — Historical recession indicator</span>
            </div>
          )}
        </>}
      </>)}

      {card(<>
        <PanelTitle t="GDP GROWTH" />
        {gdp?.countries.map(c => (
          <div key={c.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #13131a' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#e0e8f0', fontFamily: mono }}>{c.name}</div>
              <div style={{ fontSize: '9px', color: '#2a2a38', fontFamily: mono }}>{c.unit} — Quarterly FRED</div>
            </div>
            <span style={{ fontSize: '14px', fontWeight: 600, fontFamily: mono, color: (c.value ?? 0) >= 0 ? green : red }}>
              {c.value !== null ? `${c.value > 0 ? '+' : ''}${c.value}` : 'N/A'}
            </span>
          </div>
        ))}
      </>)}
    </div>
  );

  const CentralBanks = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      {banks.map(b => (
        <div key={b.short} style={{ background: '#0d0d14', borderRadius: '8px', border: '1px solid #1e2028', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#e0e8f0', fontFamily: mono, marginBottom: '4px' }}>{b.name}</div>
              <div style={{ fontSize: '9px', color: '#4a5060', fontFamily: mono }}>Next meeting: {b.next_meeting}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: gold, fontFamily: mono }}>{b.rate?.toFixed(2)}%</div>
              <span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '3px', fontFamily: mono, fontWeight: 600, background: biasColor(b.bias) + '22', color: biasColor(b.bias) }}>{b.bias}</span>
            </div>
          </div>
          {b.prev !== null && (
            <div style={{ fontSize: '10px', color: '#6b7280', fontFamily: mono, marginBottom: '10px' }}>
              Previous: {b.prev?.toFixed(2)}% · Change: <span style={{ color: (b.rate ?? 0) > (b.prev ?? 0) ? red : green }}>{((b.rate ?? 0) - (b.prev ?? 0)).toFixed(2)}pp</span>
            </div>
          )}
          {b.history.length > 0 && <MiniChart data={b.history} color={gold} dataKey="rate" height={100} />}
        </div>
      ))}
    </div>
  );

  const Inflation = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      {card(<>
        <PanelTitle t="USA — CPI COMPONENTS" />
        {inflation?.usa && <>
          <Metric label="CPI YoY"      value={inflation.usa.cpi?.value}       unit="%" period="Monthly — BLS"     change={inflation.usa.cpi?.change}       invert />
          <Metric label="Core CPI"     value={inflation.usa.core_cpi?.value}  unit="%" period="ex Food & Energy"  change={inflation.usa.core_cpi?.change}  invert />
          <Metric label="PCE"          value={inflation.usa.pce?.value}       unit="%" period="Monthly — BEA"     change={inflation.usa.pce?.change}       invert />
          <Metric label="Core PCE"     value={inflation.usa.core_pce?.value}  unit="%" period="Fed preferred"     change={inflation.usa.core_pce?.change}  invert />
          <Metric label="Food CPI"     value={inflation.usa.food?.value}      unit="%" period="Monthly"           change={inflation.usa.food?.change}      invert />
          <Metric label="Energy CPI"   value={inflation.usa.energy?.value}    unit="%" period="Monthly"           change={inflation.usa.energy?.change}    invert />
          <Metric label="Shelter CPI"  value={inflation.usa.shelter?.value}   unit="%" period="Monthly"           change={inflation.usa.shelter?.change}   invert />
          <Metric label="Services CPI" value={inflation.usa.services?.value}  unit="%" period="Monthly"           change={inflation.usa.services?.change}  invert />
          <div style={{ marginTop: '10px', padding: '6px 10px', background: '#13131a', borderRadius: '4px' }}>
            <span style={{ fontSize: '10px', color: '#4a5060', fontFamily: mono }}>Fed Target: </span>
            <span style={{ fontSize: '10px', color: gold, fontFamily: mono, fontWeight: 600 }}>2.00%</span>
          </div>
        </>}
      </>)}

      {card(<>
        <PanelTitle t="CPI YoY — HISTORICAL (USA)" />
        {inflation?.usa?.cpi?.history && (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={inflation.usa.cpi.history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2028" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6b7280', fontFamily: mono }} tickFormatter={d => d.slice(0, 7)} interval={5} />
              <YAxis tick={{ fontSize: 9, fill: '#6b7280', fontFamily: mono }} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ background: '#0d0d14', border: '1px solid #1e2028', fontSize: '10px', fontFamily: mono }} formatter={(v: any) => [`${v}%`, 'CPI']} />
              <ReferenceLine y={2} stroke={gold} strokeDasharray="4 4" label={{ value: 'Fed Target 2%', fill: gold, fontSize: 9 }} />
              <Line type="monotone" dataKey="value" stroke={red} dot={false} strokeWidth={2} name="CPI YoY" />
            </LineChart>
          </ResponsiveContainer>
        )}
        <PanelTitle t="EUROZONE — HICP" />
        <Metric label="HICP YoY" value={inflation?.europe?.hicp?.value} unit="%" period="Monthly — Eurostat" change={inflation?.europe?.hicp?.change} invert />
        {inflation?.europe?.hicp?.history && (
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={inflation.europe.hicp.history}>
              <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={false} strokeWidth={1.5} />
              <Tooltip contentStyle={{ background: '#0d0d14', border: '1px solid #1e2028', fontSize: '10px', fontFamily: mono }} formatter={(v: any) => [`${v}%`, 'HICP']} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </>)}
    </div>
  );

  const Labour = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      {card(<>
        <PanelTitle t="LABOUR MARKET — KEY METRICS" />
        {labour && <>
          <Metric label="NFP (Monthly Change)"  value={labour.nfp?.change}          unit="K"  period="Monthly — BLS" />
          <Metric label="Unemployment Rate"     value={labour.unemployment?.value}   unit="%"  period="Monthly — BLS" change={labour.unemployment?.change} invert />
          <Metric label="JOLTS Job Openings"    value={labour.jolts?.value ? labour.jolts.value / 1000 : null} unit="M" period="Monthly — BLS" change={labour.jolts?.change ? labour.jolts.change / 1000 : null} />
          <Metric label="Participation Rate"    value={labour.participation?.value}  unit="%"  period="Monthly — BLS" change={labour.participation?.change} />
          <Metric label="Avg Hourly Earnings"   value={labour.ahe?.value}            unit="$"  period="Monthly — BLS" change={labour.ahe?.change} />
          <div style={{ marginTop: '12px', padding: '10px', background: labour.sahm?.triggered ? '#200505' : '#052010', borderRadius: '6px', border: `1px solid ${labour.sahm?.triggered ? red : green}` }}>
            <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: mono, marginBottom: '4px' }}>SAHM RULE INDICATOR</div>
            <div style={{ fontSize: '18px', fontWeight: 600, fontFamily: mono, color: labour.sahm?.triggered ? red : green }}>{labour.sahm?.value?.toFixed(2)}%</div>
            <div style={{ fontSize: '10px', fontFamily: mono, color: labour.sahm?.triggered ? red : green }}>
              {labour.sahm?.triggered ? '⚠ TRIGGERED — Recession signal' : '✓ Not triggered (threshold: 0.50%)'}
            </div>
            <div style={{ marginTop: '6px', height: '4px', background: '#1a1a24', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((labour.sahm?.value ?? 0) / 1.0 * 100, 100)}%`, height: '100%', background: labour.sahm?.triggered ? red : green, borderRadius: '2px' }} />
            </div>
          </div>
        </>}
      </>)}

      {card(<>
        <PanelTitle t="UNEMPLOYMENT RATE — HISTORICAL" />
        {labour?.unemployment?.history && (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={labour.unemployment.history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2028" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6b7280', fontFamily: mono }} tickFormatter={d => d.slice(0, 7)} interval={5} />
              <YAxis tick={{ fontSize: 9, fill: '#6b7280', fontFamily: mono }} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ background: '#0d0d14', border: '1px solid #1e2028', fontSize: '10px', fontFamily: mono }} formatter={(v: any) => [`${v}%`, 'Unemployment']} />
              <Line type="monotone" dataKey="value" stroke={green} dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
        <PanelTitle t="NFP — MONTHLY CHANGE" />
        {labour?.nfp?.history && (() => {
          const nfpChanges = labour.nfp.history.slice(-24).map((d, i, arr) => ({
            date: d.date,
            change: i > 0 ? Math.round(d.value - arr[i-1].value) : 0,
          })).filter((_, i) => i > 0);
          return (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={nfpChanges}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2028" />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#6b7280', fontFamily: mono }} tickFormatter={d => d.slice(2, 7)} interval={3} />
                <YAxis tick={{ fontSize: 8, fill: '#6b7280', fontFamily: mono }} />
                <Tooltip contentStyle={{ background: '#0d0d14', border: '1px solid #1e2028', fontSize: '10px', fontFamily: mono }} formatter={(v: any) => [`${v}K`, 'NFP']} />
                <Bar dataKey="change" radius={[2, 2, 0, 0]}>
                  {nfpChanges.map((entry, i) => (
                    <Cell key={i} fill={entry.change >= 0 ? green : red} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          );
        })()}
      </>)}
    </div>
  );

  const GDP = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      {card(<>
        <PanelTitle t="GDP GROWTH BY COUNTRY — FRED DATA" />
        {gdp?.countries.map(c => (
          <div key={c.code} style={{ marginBottom: '16px', padding: '12px', background: '#13131a', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#e0e8f0', fontFamily: mono }}>{c.name}</div>
                <div style={{ fontSize: '9px', color: '#2a2a38', fontFamily: mono }}>{c.unit} — Quarterly FRED</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '22px', fontWeight: 700, color: (c.value ?? 0) >= 0 ? green : red, fontFamily: mono }}>
                  {c.value !== null ? `${c.value > 0 ? '+' : ''}${c.value}` : 'N/A'}
                </div>
                {c.prev !== null && <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: mono }}>Prev: {c.prev}</div>}
              </div>
            </div>
            {c.history?.length > 0 && <MiniChart data={c.history} color={(c.value ?? 0) >= 0 ? green : red} height={60} />}
          </div>
        ))}
      </>)}

      {card(<>
        <PanelTitle t="US GDP — HISTORICAL (QoQ Annualized)" />
        {gdp?.countries[0]?.history && (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={gdp.countries[0].history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2028" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6b7280', fontFamily: mono }} tickFormatter={d => d.slice(0, 7)} interval={1} />
              <YAxis tick={{ fontSize: 9, fill: '#6b7280', fontFamily: mono }} tickFormatter={v => `${v}%`} />
              <ReferenceLine y={0} stroke="#2a2a38" />
              <Tooltip contentStyle={{ background: '#0d0d14', border: '1px solid #1e2028', fontSize: '10px', fontFamily: mono }} formatter={(v: any) => [`${v}%`, 'GDP Growth']} />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {gdp.countries[0].history.map((entry, i) => (
                  <Cell key={i} fill={(entry.value ?? 0) >= 0 ? green : red} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </>)}
    </div>
  );

  const YieldCurveTab = () => {
    const mats    = ['1M', '3M', '6M', '1Y', '2Y', '5Y', '10Y', '30Y'];
    const current = mats.map(m => ({
      maturity: m,
      current:  yieldCurve?.maturities[m]?.current    ?? null,
      prev:     yieldCurve?.maturities[m]?.prev_month ?? null,
    }));
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {card(<>
          <PanelTitle t="US TREASURY YIELD CURVE — CURRENT vs PREV MONTH" />
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={current}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2028" />
              <XAxis dataKey="maturity" tick={{ fontSize: 10, fill: '#6b7280', fontFamily: mono }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280', fontFamily: mono }} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ background: '#0d0d14', border: '1px solid #1e2028', fontSize: '10px', fontFamily: mono }} formatter={(v: any) => [`${v}%`]} />
              <Line type="monotone" dataKey="current" stroke={gold}    dot={{ fill: gold, r: 4 }}    strokeWidth={2}   name="Current" />
              <Line type="monotone" dataKey="prev"    stroke="#3b82f6" dot={{ fill: '#3b82f6', r: 3 }} strokeWidth={1.5} strokeDasharray="4 4" name="1 Month Ago" />
            </LineChart>
          </ResponsiveContainer>
        </>)}

        {card(<>
          <PanelTitle t="KEY SPREADS & MATURITY TABLE" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            {[
              { label: '2s10s Spread', val: yieldCurve?.spread_2s10s, desc: 'Classic recession indicator' },
              { label: '3m10y Spread', val: yieldCurve?.spread_3m10y, desc: 'NY Fed preferred metric'    },
            ].map(s => (
              <div key={s.label} style={{ padding: '12px', background: (s.val ?? 0) < 0 ? '#200505' : '#052010', borderRadius: '6px', border: `1px solid ${(s.val ?? 0) < 0 ? red : green}` }}>
                <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: mono, marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: (s.val ?? 0) < 0 ? red : green, fontFamily: mono }}>{s.val?.toFixed(2)}%</div>
                <div style={{ fontSize: '9px', color: '#4a5060', fontFamily: mono, marginTop: '4px' }}>{s.desc}</div>
              </div>
            ))}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: mono }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e2028' }}>
                {['Maturity', 'Current', '1M Ago', 'Change'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', fontSize: '9px', color: '#4a5060', textAlign: h === 'Maturity' ? 'left' : 'right', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {current.map(row => {
                const chg = row.current !== null && row.prev !== null ? round(row.current - row.prev, 2) : null;
                return (
                  <tr key={row.maturity} style={{ borderBottom: '1px solid #13131a' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#0d0d14')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '7px 8px', fontSize: '11px', color: gold, fontWeight: 600 }}>{row.maturity}</td>
                    <td style={{ padding: '7px 8px', fontSize: '11px', color: '#e0e8f0', textAlign: 'right' }}>{row.current?.toFixed(2)}%</td>
                    <td style={{ padding: '7px 8px', fontSize: '11px', color: '#6b7280', textAlign: 'right' }}>{row.prev?.toFixed(2)}%</td>
                    <td style={{ padding: '7px 8px', fontSize: '11px', textAlign: 'right', color: chg ? (chg > 0 ? red : green) : '#6b7280' }}>
                      {chg !== null ? `${chg > 0 ? '+' : ''}${chg}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>)}
      </div>
    );
  };

  const FinancialConditions = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
      {[
        { label: 'VIX',          value: finCond?.vix,                 unit: '',    desc: 'Volatility Index — CBOE daily',     color: finCond?.vix && finCond.vix > 25 ? red : green },
        { label: 'DXY',          value: finCond?.dxy,                 unit: '',    desc: 'US Dollar Index — ICE daily',        color: gold },
        { label: '10Y Treasury', value: finCond?.tnx,                 unit: '%',   desc: 'US 10Y Yield — daily',              color: gold },
        { label: 'HY Spread',    value: finCond?.hy_spread?.value,    unit: ' bp', desc: 'ICE BofA HY — monthly FRED',        color: finCond?.hy_spread?.value && finCond.hy_spread.value > 400 ? red : green },
        { label: 'IG Spread',    value: finCond?.ig_spread?.value,    unit: ' bp', desc: 'ICE BofA IG — monthly FRED',        color: finCond?.ig_spread?.value && finCond.ig_spread.value > 150 ? red : green },
        { label: 'TED Spread',   value: finCond?.ted_spread?.value,   unit: ' bp', desc: 'LIBOR-TBill — monthly FRED',        color: finCond?.ted_spread?.value && finCond.ted_spread.value > 50 ? red : green },
      ].map(m => (
        <div key={m.label} style={{ background: '#0d0d14', borderRadius: '8px', border: '1px solid #1e2028', padding: '16px' }}>
          <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: mono, marginBottom: '4px' }}>{m.label}</div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: m.color, fontFamily: mono, marginBottom: '6px' }}>
            {m.value !== null && m.value !== undefined ? `${m.value}${m.unit}` : 'N/A'}
          </div>
          <div style={{ fontSize: '9px', color: '#2a2a38', fontFamily: mono }}>{m.desc}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden', background: '#0a0a0f' }}>

      {/* Header */}
      <div style={{ height: '40px', background: '#0d0d14', borderBottom: '1px solid #1e2028', display: 'flex', alignItems: 'center', padding: '0 16px', flexShrink: 0 }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: gold, letterSpacing: '2px', fontFamily: mono }}>MACRO INTELLIGENCE</div>
        <div style={{ marginLeft: 'auto', fontSize: '9px', color: '#2a2a38', fontFamily: mono }}>
          Source: Federal Reserve FRED · yfinance · Live data
        </div>
      </div>

      {/* All content scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {loading ? (
          <div style={{ padding: '40px', fontSize: '12px', color: '#4a5060', fontFamily: mono }}>Loading FRED data...</div>
        ) : (
          <>
            <section>
              <SectionTitle title="OVERVIEW" subtitle="Key macro indicators at a glance" />
              <Overview />
            </section>

            <section>
              <SectionTitle title="CENTRAL BANKS" subtitle="Policy rates & monetary policy — FRED official data" />
              <CentralBanks />
            </section>

            <section>
              <SectionTitle title="INFLATION TRACKER" subtitle="CPI, PCE, HICP decomposition — BLS & BEA via FRED" />
              <Inflation />
            </section>

            <section>
              <SectionTitle title="LABOUR MARKET" subtitle="NFP, unemployment, JOLTS, Sahm Rule — BLS via FRED" />
              <Labour />
            </section>

            <section>
              <SectionTitle title="GDP TRACKER" subtitle="Economic growth by country — FRED quarterly data" />
              <GDP />
            </section>

            <section>
              <SectionTitle title="YIELD CURVE" subtitle="US Treasury yields & spreads — FRED daily data" />
              <YieldCurveTab />
            </section>

            <section>
              <SectionTitle title="FINANCIAL CONDITIONS" subtitle="Credit spreads, VIX, DXY — FRED & yfinance" />
              <FinancialConditions />
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default Macro;