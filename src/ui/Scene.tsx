/**
 * Fotografía arquitectónica generativa: luz cálida, sombras duras, piedra y vegetación.
 * Sustituye fotos reales en el prototipo (costo S/0, sin derechos de imagen).
 * Cuando existan fotos de las propiedades, <Media> recibirá `src` y esto queda como fallback.
 */
import { useId } from 'react';
import type { SceneVariant } from '../data/types';

const WARM = { deep: '#140e09', shadow: '#2b1d12', mid: '#6e4a2c', stone: '#b98556', lit: '#e3ac6c', glow: '#f6cf94', hot: '#ffe2b0' };

function rand(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function Palm({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  const d = flip ? -1 : 1;
  return (
    <g transform={`translate(${x} ${y}) scale(${s * d} ${s})`} fill={WARM.deep} stroke={WARM.deep} strokeLinecap="round">
      <path d="M0 0 C 4 -40 2 -80 10 -120" strokeWidth="5" fill="none" />
      {[-70, -40, -10, 20, 50, 80, 110].map((a, i) => (
        <path key={i} d={`M10 -120 q ${Math.cos((a * Math.PI) / 180) * 30} ${-Math.sin((a * Math.PI) / 180) * 18 - 8} ${Math.cos((a * Math.PI) / 180) * 58} ${Math.sin(((a + 180) * Math.PI) / 180) * -10 + 20}`} strokeWidth="3.2" fill="none" />
      ))}
    </g>
  );
}

function Plant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={WARM.deep}>
      {[-60, -35, -12, 10, 32, 58, -80, 80].map((a, i) => (
        <ellipse key={i} cx="0" cy="-38" rx="7" ry="36" transform={`rotate(${a} 0 0)`} opacity={0.92} />
      ))}
      <rect x="-14" y="-6" width="28" height="22" rx="3" fill="#1c140d" />
    </g>
  );
}

export function Scene({ variant, seed = 1, className }: { variant: SceneVariant; seed?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  const r = rand(seed);
  const tilt = 10 + r() * 14;

  const defs = (
    <defs>
      <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1d1812" />
        <stop offset="0.55" stopColor="#7a5230" />
        <stop offset="1" stopColor="#e7a864" />
      </linearGradient>
      <linearGradient id={`lit${id}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={WARM.glow} />
        <stop offset="1" stopColor={WARM.stone} />
      </linearGradient>
      <linearGradient id={`beam${id}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={WARM.hot} stopOpacity="0.85" />
        <stop offset="1" stopColor={WARM.lit} stopOpacity="0.35" />
      </linearGradient>
      <radialGradient id={`vig${id}`} cx="0.5" cy="0.45" r="0.75">
        <stop offset="0.55" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.55" />
      </radialGradient>
      <filter id={`grain${id}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 0.09 0" />
      </filter>
    </defs>
  );

  let body: JSX.Element;
  switch (variant) {
    case 'facade': {
      const cols = 5, rows = 9;
      body = (
        <>
          <rect width="400" height="300" fill={`url(#sky${id})`} />
          <polygon points="130,30 300,50 300,300 130,300" fill={`url(#lit${id})`} />
          <polygon points="300,50 372,70 372,300 300,300" fill={WARM.mid} />
          <polygon points="300,50 372,70 372,300 300,300" fill="#000" opacity="0.35" />
          {Array.from({ length: rows }).map((_, ri) =>
            Array.from({ length: cols }).map((__, ci) => {
              const lit = r() > 0.72;
              const x = 142 + ci * 31;
              const y = 58 + ri * 27 + ci * 1.6;
              return <rect key={`${ri}-${ci}`} x={x} y={y} width="22" height="17" fill={lit ? WARM.hot : WARM.shadow} opacity={lit ? 0.95 : 0.85} />;
            }),
          )}
          {Array.from({ length: rows }).map((_, ri) => (
            <line key={ri} x1="130" x2="300" y1={78 + ri * 27} y2={80 + ri * 27 + 6} stroke={WARM.deep} strokeWidth="2.5" opacity="0.6" />
          ))}
          {Array.from({ length: rows }).map((_, ri) => (
            <rect key={`s${ri}`} x="308" y={78 + ri * 26} width="56" height="12" fill={WARM.shadow} opacity="0.7" />
          ))}
          <rect x="0" y="262" width="400" height="38" fill={WARM.deep} />
          <Palm x={70} y={290} s={1.05} />
          <Palm x={390} y={300} s={0.8} flip />
          <Plant x={40} y={286} s={0.8} />
        </>
      );
      break;
    }
    case 'interior': {
      body = (
        <>
          <rect width="400" height="300" fill="#1a130d" />
          <rect x="0" y="0" width="150" height="220" fill={`url(#sky${id})`} />
          <rect x="0" y="0" width="150" height="220" fill={WARM.glow} opacity="0.35" />
          {[0, 50, 100].map((x) => (
            <rect key={x} x={x + 46} y="0" width="5" height="220" fill={WARM.deep} />
          ))}
          <Palm x={60} y={240} s={0.9} />
          <polygon points={`150,40 150,220 ${400},${300} ${400},${120 + tilt}`} fill={`url(#beam${id})`} opacity="0.5" />
          <polygon points={`150,220 400,300 400,240 ${260},${198}`} fill={WARM.lit} opacity="0.35" />
          <rect x="0" y="220" width="400" height="80" fill="#241910" />
          <polygon points={`40,300 150,222 300,236 250,300`} fill={WARM.lit} opacity="0.55" />
          {[0, 1, 2].map((i) => (
            <polygon key={i} points={`${80 + i * 55},300 ${160 + i * 38},224 ${166 + i * 38},224 ${92 + i * 55},300`} fill={WARM.deep} opacity="0.55" />
          ))}
          <rect x="190" y="206" width="170" height="40" rx="6" fill="#3a2a1c" />
          <rect x="196" y="186" width="158" height="26" rx="8" fill="#4a3624" />
          <rect x="196" y="186" width="158" height="8" rx="4" fill={WARM.lit} opacity="0.35" />
          <Plant x={372} y={232} s={1.1} />
        </>
      );
      break;
    }
    case 'stairs': {
      const steps = 9;
      body = (
        <>
          <rect width="400" height="300" fill={WARM.stone} />
          <rect width="400" height="300" fill={WARM.shadow} opacity="0.3" />
          {Array.from({ length: steps }).map((_, i) => {
            const x = 20 + i * 42;
            const y = 280 - i * 28;
            return (
              <g key={i}>
                <rect x={x} y={y} width={400 - x} height="8" fill={WARM.glow} />
                <rect x={x} y={y + 8} width={400 - x} height="20" fill={WARM.mid} />
              </g>
            );
          })}
          <polygon points={`0,0 ${160 + tilt * 3},0 400,${150 + tilt} 400,300 0,300`} fill={WARM.deep} opacity="0.42" />
          <rect x="0" y="0" width="60" height="300" fill={WARM.shadow} opacity="0.7" />
          <Plant x={330} y={60} s={0.9} />
        </>
      );
      break;
    }
    case 'tower': {
      body = (
        <>
          <rect width="400" height="300" fill={`url(#sky${id})`} />
          <polygon points="150,10 250,24 250,300 150,300" fill={`url(#lit${id})`} />
          <polygon points="250,24 290,36 290,300 250,300" fill={WARM.shadow} />
          {Array.from({ length: 14 }).map((_, i) => (
            <line key={i} x1="150" x2="250" y1={30 + i * 19} y2={32 + i * 19 + 2} stroke={WARM.deep} strokeWidth="2" opacity="0.55" />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={`v${i}`} x1={166 + i * 15} x2={166 + i * 15} y1="16" y2="300" stroke={WARM.hot} strokeWidth="1" opacity={0.25 + r() * 0.35} />
          ))}
          <polygon points="0,170 110,150 110,300 0,300" fill="#2a1d13" />
          <polygon points="300,120 400,110 400,300 300,300" fill="#20160e" />
          {Array.from({ length: 6 }).map((_, i) => (
            <rect key={`w${i}`} x={318 + (i % 3) * 26} y={140 + Math.floor(i / 3) * 34} width="14" height="16" fill={r() > 0.5 ? WARM.hot : WARM.shadow} opacity="0.8" />
          ))}
          <rect x="0" y="272" width="400" height="28" fill={WARM.deep} />
          <Palm x={120} y={300} s={0.95} />
          <Palm x={330} y={300} s={0.75} flip />
        </>
      );
      break;
    }
    case 'terrace': {
      body = (
        <>
          <rect width="400" height="300" fill={WARM.stone} />
          <rect x="0" y="0" width="400" height="190" fill={WARM.lit} opacity="0.55" />
          {[0, 1, 2, 3].map((i) => (
            <polygon key={i} points={`${i * 110 - 40},0 ${i * 110 + 20},0 ${i * 110 + 140},190 ${i * 110 + 80},190`} fill={WARM.deep} opacity="0.32" />
          ))}
          <rect x="0" y="190" width="400" height="110" fill={WARM.mid} />
          <polygon points={`0,190 400,190 400,210 0,230`} fill={WARM.glow} opacity="0.35" />
          <rect x="60" y="168" width="200" height="30" fill="#8b6240" />
          <rect x="60" y="168" width="200" height="6" fill={WARM.glow} opacity="0.6" />
          <rect x="60" y="198" width="200" height="16" fill={WARM.deep} opacity="0.5" />
          <Plant x={330} y={190} s={1.2} />
          <Plant x={24} y={196} s={0.7} />
        </>
      );
      break;
    }
  }

  return (
    <svg className={className} viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Imagen arquitectónica">
      {defs}
      {body}
      <rect width="400" height="300" fill={`url(#vig${id})`} />
      <rect width="400" height="300" filter={`url(#grain${id})`} opacity="0.9" />
    </svg>
  );
}
