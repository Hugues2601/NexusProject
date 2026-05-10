import React, { useEffect, useState } from 'react';

interface FXData {
  currencies: string[];
  rates: Record<string, number>;
  changes: Record<string, number>;
}

function FXMatrix() {
  const [data, setData] = useState<FXData | null>(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/fx_matrix')
      .then(r => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  const round = (n: number, decimals: number) => Math.round(n * 10 ** decimals) / 10 ** decimals;

  const getRate = (base: string, quote: string): { rate: number | null; chg: number | null } => {
    if (base === quote) return { rate: 1, chg: 0 };
    if (!data) return { rate: null, chg: null };

    const direct  = `${base}${quote}`;
    const inverse = `${quote}${base}`;

    if (data.rates[direct])  return { rate: data.rates[direct], chg: data.changes[direct] ?? null };
    if (data.rates[inverse]) return { rate: round(1 / data.rates[inverse], 4), chg: data.changes[inverse] ? -data.changes[inverse] : null };

    const baseUSD  = data.rates[`${base}USD`]  ?? (data.rates[`USD${base}`]  ? 1 / data.rates[`USD${base}`]  : null);
    const quoteUSD = data.rates[`${quote}USD`] ?? (data.rates[`USD${quote}`] ? 1 / data.rates[`USD${quote}`] : null);
    if (baseUSD && quoteUSD) return { rate: round(baseUSD / quoteUSD, 4), chg: null };

    return { rate: null, chg: null };
  };

  const chgColor = (chg: number | null) => {
    if (chg === null) return '#4a5060';
    if (chg > 0.1)   return '#22c55e';
    if (chg < -0.1)  return '#ef4444';
    return '#6b7280';
  };

  const currencies = data?.currencies ?? [];

  return (
    <div style={{ background: '#0a0a0f', height: '100%', overflowY: 'auto', padding: '16px' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#4a5060', letterSpacing: '1.5px', marginBottom: '16px', fontFamily: 'JetBrains Mono, monospace' }}>
        FX MATRIX — LIVE CROSS RATES
      </div>

      {!data ? (
        <div style={{ fontSize: '13px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>Loading...</div>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: 'JetBrains Mono, monospace' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 12px', fontSize: '12px', color: '#4a5060', textAlign: 'left', borderBottom: '1px solid #1e2028', whiteSpace: 'nowrap' }}>
                Base ↓ / Quote →
              </th>
              {currencies.map(c => (
                <th key={c} style={{ padding: '8px 12px', fontSize: '13px', color: '#f0c040', fontWeight: 600, textAlign: 'center', borderBottom: '1px solid #1e2028' }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currencies.map(base => (
              <tr
                key={base}
                onMouseEnter={e => (e.currentTarget.style.background = '#0d0d14')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '8px 12px', fontSize: '13px', color: '#f0c040', fontWeight: 600, borderBottom: '1px solid #13131a', whiteSpace: 'nowrap' }}>
                  {base}
                </td>
                {currencies.map(quote => {
                  const { rate, chg } = getRate(base, quote);
                  const isDiag = base === quote;
                  return (
                    <td key={quote} style={{
                      padding: '8px 12px', textAlign: 'center',
                      borderBottom: '1px solid #13131a',
                      background: isDiag ? '#1a1a24' : 'transparent',
                    }}>
                      {isDiag ? (
                        <span style={{ fontSize: '13px', color: '#2a2a38' }}>—</span>
                      ) : rate === null ? (
                        <span style={{ fontSize: '11px', color: '#2a2a38' }}>N/A</span>
                      ) : (
                        <div>
                          <div style={{ fontSize: '12px', color: '#e0e8f0', fontWeight: 500 }}>
                            {rate}
                          </div>
                          {chg !== null && (
                            <div style={{ fontSize: '10px', color: chgColor(chg), marginTop: '2px' }}>
                              {chg > 0 ? '+' : ''}{chg}%
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default FXMatrix;