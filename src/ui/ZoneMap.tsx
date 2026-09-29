import type { Comparable, Property } from '../data/types';

/** Mapa abstracto de zona: trama urbana + comparables + tu propiedad. Sin proveedores de mapas pagos. */
export function ZoneMap({ comps, focus, height = 170 }: { comps: Comparable[]; focus?: Property; height?: number }) {
  const W = 340, H = height;
  const fx = focus ? 90 + focus.map.x * 160 : W / 2;
  const fy = focus ? 30 + focus.map.y * (H - 60) : H / 2;
  const pts = comps.map((c, i) => {
    const a = (c.seed * 2.39996 + i) % (Math.PI * 2);
    const d = 26 + c.distanceBlocks * 11;
    return { id: c.id, x: Math.max(12, Math.min(W - 12, fx + Math.cos(a) * d)), y: Math.max(12, Math.min(H - 12, fy + Math.sin(a) * d * 0.7)), sold: c.status === 'vendido' };
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', borderRadius: 14, background: '#0b1416' }} role="img" aria-label="Mapa de comparables en la zona">
      <defs>
        <radialGradient id="zm-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--teal)" stopOpacity="0.22" />
          <stop offset="1" stopColor="var(--teal)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {Array.from({ length: 12 }).map((_, i) => (
        <line key={`v${i}`} x1={i * 32 - 20} y1="0" x2={i * 32 + 30} y2={H} stroke="rgba(25,199,200,.12)" strokeWidth="1" />
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={`h${i}`} x1="0" y1={i * 28 + 6} x2={W} y2={i * 28 - 10} stroke="rgba(25,199,200,.12)" strokeWidth="1" />
      ))}
      <path d={`M-10 ${H * 0.9} L ${W * 0.55} -10`} stroke="rgba(245,243,239,.22)" strokeWidth="6" />
      <path d={`M-10 ${H * 0.9} L ${W * 0.55} -10`} stroke="#0b1416" strokeWidth="3" />
      <path d={`M${W * 0.3} ${H + 10} Q ${W * 0.7} ${H * 0.5} ${W + 10} ${H * 0.35}`} stroke="rgba(245,243,239,.1)" strokeWidth="3" fill="none" />
      <circle cx={fx} cy={fy} r="70" fill="url(#zm-glow)" />
      <circle cx={fx} cy={fy} r="44" fill="none" stroke="rgba(25,199,200,.25)" strokeDasharray="2 4" />
      {pts.map((p) => (
        <circle key={p.id} cx={p.x} cy={p.y} r="5" fill={p.sold ? 'var(--paper)' : 'var(--teal)'} opacity={p.sold ? 0.85 : 1} />
      ))}
      {focus && (
        <g>
          <circle className="map-pulse" cx={fx} cy={fy} r="10" fill="none" stroke="var(--teal)" strokeWidth="1.5" />
          <circle cx={fx} cy={fy} r="15" fill="rgba(25,199,200,.18)" stroke="var(--teal)" strokeWidth="1.5" />
          <circle cx={fx} cy={fy} r="6" fill="var(--teal)" />
        </g>
      )}
    </svg>
  );
}
