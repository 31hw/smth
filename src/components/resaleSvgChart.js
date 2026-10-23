import React, { useMemo, useState } from 'react';

function fmtRobux(v) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return Math.round(v).toLocaleString();
}

export default function ResaleSvgChart({ pricePoints = [], volumePoints = [], compact = false }) {
  const [days, setDays] = useState(180);

  const { prices, volumes, minP, maxP, maxV, minT, maxT } = useMemo(() => {
    const cutoff = Date.now() - days * 86400000;
    const pRaw = (Array.isArray(pricePoints) ? pricePoints : [])
      .map((d) => ({ t: new Date(d.date).getTime(), v: Number(d.value) || 0 }))
      .filter((d) => Number.isFinite(d.t) && d.t >= cutoff)
      .sort((a, b) => a.t - b.t);
    const vRaw = (Array.isArray(volumePoints) ? volumePoints : [])
      .map((d) => ({ t: new Date(d.date).getTime(), v: Number(d.value) || 0 }))
      .filter((d) => Number.isFinite(d.t) && d.t >= cutoff)
      .sort((a, b) => a.t - b.t);

    const pVals = pRaw.map((d) => d.v);
    const vVals = vRaw.map((d) => d.v);
    const allT = [...pRaw.map((d) => d.t), ...vRaw.map((d) => d.t)];
    return {
      prices: pRaw,
      volumes: vRaw,
      minP: pVals.length ? Math.min(...pVals) * 0.92 : 0,
      maxP: pVals.length ? Math.max(...pVals) * 1.05 || 1 : 1,
      maxV: vVals.length ? Math.max(...vVals) || 1 : 1,
      minT: allT.length ? Math.min(...allT) : cutoff,
      maxT: allT.length ? Math.max(...allT) : Date.now(),
    };
  }, [pricePoints, volumePoints, days]);

  const W = compact ? 370 : 620;
  const H = compact ? 180 : 210;
  const VH = 46;
  const padL = 48;
  const padR = 12;
  const padT = 10;
  const padB = 18;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const spanT = Math.max(1, maxT - minT);
  const spanP = Math.max(1, maxP - minP);

  const polyline = prices
    .map((p) => {
      const x = padL + ((p.t - minT) / spanT) * plotW;
      const y = padT + (1 - (p.v - minP) / spanP) * plotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, fontSize: 12, marginBottom: 6 }}>
        {[30, 90, 180].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            style={{
              border: '1px solid var(--text-color-quinary, #c3c3c3)',
              background: days === d ? '#00a2ff' : 'transparent',
              color: days === d ? '#fff' : 'var(--text-color-primary, inherit)',
              borderRadius: 3,
              padding: '2px 8px',
              cursor: 'pointer',
              fontWeight: days === d ? 600 : 400,
            }}
          >
            {d} Days
          </button>
        ))}
      </div>
      {prices.length === 0 ? (
        <div style={{ padding: '18px 0', textAlign: 'center', color: 'var(--text-color-secondary)', fontSize: 13 }}>
          No recent resale history in this period.
        </div>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            {[0, 0.5, 1].map((frac) => {
              const y = padT + frac * plotH;
              const val = maxP - frac * spanP;
              return (
                <g key={frac}>
                  <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#888" strokeOpacity="0.25" strokeDasharray="3,3" />
                  <text x={padL - 5} y={y + 4} textAnchor="end" fontSize="10" fill="#888">
                    {fmtRobux(val)}
                  </text>
                </g>
              );
            })}
            <polyline fill="none" stroke="#02b757" strokeWidth="2" points={polyline} />
          </svg>
          {volumes.length > 0 && (
            <svg viewBox={`0 0 ${W} ${VH}`} style={{ width: '100%', height: 'auto', display: 'block', marginTop: 2 }}>
              {volumes.map((b, idx) => {
                const x = padL + ((b.t - minT) / spanT) * plotW;
                const bh = Math.max(1, (b.v / maxV) * (VH - 8));
                const bw = Math.max(1.5, plotW / Math.max(volumes.length, 30) - 1);
                return <rect key={idx} x={x - bw / 2} y={VH - bh - 2} width={bw} height={bh} fill="#00a2ff" opacity="0.65" />;
              })}
            </svg>
          )}
        </>
      )}
    </div>
  );
}
