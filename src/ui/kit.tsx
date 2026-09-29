import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { SceneVariant } from '../data/types';
import { Icon } from './Icon';
import { Scene } from './Scene';

export function Wordmark() {
  return (
    <span className="wordmark" aria-label="MUNAY">
      MUN
      <svg viewBox="0 0 20 22" aria-hidden="true">
        <path d="M1.6 21.5 10 1.5l8.4 20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="miter" />
      </svg>
      Y
    </span>
  );
}

export function Display({ title, sub, hero }: { title: string; sub?: ReactNode; hero?: boolean }) {
  return (
    <header className="page-head rise">
      <h1 className={`display${hero ? ' hero' : ''}`}>
        {title}
        <span className="dot" />
      </h1>
      {sub && <p className="display-sub">{sub}</p>}
    </header>
  );
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={o.id} role="tab" aria-selected={value === o.id} className={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Row({ icon, title, sub, onClick, flat, trailing, style }: { icon?: string; title: ReactNode; sub?: ReactNode; onClick?: () => void; flat?: boolean; trailing?: ReactNode; style?: CSSProperties }) {
  return (
    <button className={`row${flat ? ' flat' : ''} rise`} onClick={onClick} style={style}>
      {icon && (
        <span className="row-icon">
          <Icon name={icon} size={26} stroke={1.4} />
        </span>
      )}
      <span className="row-body">
        <span className="row-title" style={{ display: 'block' }}>{title}</span>
        {sub && <span className="row-sub" style={{ display: 'block' }}>{sub}</span>}
      </span>
      {trailing}
      <span className="row-chev">
        <Icon name="chev" size={18} />
      </span>
    </button>
  );
}

/**
 * Imagen de una propiedad o comparable.
 * Con `photo` muestra la fotografía real (recortada al mismo marco, sin cambiar proporciones);
 * sin ella, o si la foto no carga, usa la imagen conceptual generativa (`scene`).
 */
export function Media({ scene, seed, photo, alt, height, radius, children, style }: { scene: SceneVariant; seed?: number; photo?: string; alt?: string; height?: number | string; radius?: number; children?: ReactNode; style?: CSSProperties }) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(photo) && !failed;
  return (
    <div className="media" style={{ height, borderRadius: radius, ...style }}>
      {showPhoto ? <img className="media-photo" src={photo} alt={alt ?? ''} loading="lazy" decoding="async" onError={() => setFailed(true)} /> : <Scene variant={scene} seed={seed} />}
      {children}
    </div>
  );
}

/** Props de imagen de una propiedad: conceptual hoy, fotografía cuando exista `photo`. */
export const mediaOf = (p: { scene: SceneVariant; seed: number; photo?: string; type: string; address: string }) => ({
  scene: p.scene,
  seed: p.seed,
  photo: p.photo,
  alt: `${p.type} en ${p.address.split(',')[0]}`,
});

export function Pill({ children, tone = 'soft', color }: { children: ReactNode; tone?: 'soft' | 'solid' | 'line' | 'neutral'; color?: string }) {
  return (
    <span className={`pill ${tone}`} style={color ? ({ '--accent': color } as CSSProperties) : undefined}>
      {children}
    </span>
  );
}

/** "Analizando…" → "Encontré esto." El usuario siempre entiende qué está pasando. */
export function Thinking({ stages, onDone, step = 520 }: { stages: string[]; onDone?: () => void; step?: number }) {
  const [i, setI] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (i >= stages.length - 1) {
      const t = setTimeout(() => done.current?.(), step * 0.8);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setI(i + 1), step);
    return () => clearTimeout(t);
  }, [i, stages.length, step]);
  return (
    <div className="thinking" aria-live="polite">
      <span className="thinking-orb">
        <i />
      </span>
      <span className="thinking-text" key={i}>
        {stages[i]}
      </span>
    </div>
  );
}

/** Revelado progresivo: lo importante → por qué → detalles. */
export function Reveal({ label, children, open }: { label: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="reveal" open={open}>
      <summary>
        {label}
        <Icon name="down" size={18} />
      </summary>
      <div className="reveal-body">{children}</div>
    </details>
  );
}

export function Kv({ rows, strongLast }: { rows: [string, ReactNode][]; strongLast?: boolean }) {
  return (
    <div>
      {rows.map(([k, v], i) => (
        <div key={k + i} className={`kv${strongLast && i === rows.length - 1 ? ' strong' : ''}`}>
          <span>{k}</span>
          <span>{v}</span>
        </div>
      ))}
    </div>
  );
}

export function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="bullets">
      {items.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ul>
  );
}

export function Steps({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <div className="steps">
      {steps.map((s, i) => (
        <div key={s} className={`step${i < current ? ' done' : ''}${i === current ? ' now' : ''}`}>
          <span className="step-dot">{i < current && <Icon name="check" size={13} stroke={2.4} />}</span>
          <span className="step-label">{s}</span>
        </div>
      ))}
    </div>
  );
}

export function InlineSteps({ total, current }: { total: number; current: number }) {
  return (
    <div className="steps inline">
      {Array.from({ length: total }).map((_, i) => (
        <i key={i} className={i <= current ? 'done' : ''} />
      ))}
    </div>
  );
}

/** `muted`: en listas, la barra es dato y no resultado → neutra (el color queda para lo que importa). */
export function Meter({ value, muted }: { value: number; muted?: boolean }) {
  return (
    <div className="meter">
      <i style={{ width: `${Math.round(value * 100)}%`, ...(muted ? { background: 'var(--text-2)' } : null) }} />
    </div>
  );
}

export function Coach({ label = 'MUNAY te propone', text, cta, onClick, icon = 'bulb' }: { label?: string; text: ReactNode; cta?: string; onClick?: () => void; icon?: string }) {
  return (
    <button className="coach rise" onClick={onClick}>
      <span className="coach-icon">
        <Icon name={icon} size={26} stroke={1.4} />
      </span>
      <span style={{ display: 'block' }}>
        <span className="eyebrow" style={{ display: 'block', color: 'var(--accent)', marginBottom: 6 }}>{label}</span>
        <span className="coach-text" style={{ display: 'block' }}>{text}</span>
        {cta && (
          <span className="coach-cta">
            {cta} <Icon name="arrow" size={14} stroke={2} />
          </span>
        )}
      </span>
    </button>
  );
}

export function Section({ title, link, onLink, children, style }: { title: ReactNode; link?: string; onLink?: () => void; children: ReactNode; style?: CSSProperties }) {
  return (
    <section className="section" style={style}>
      <div className="section-head">
        <h2 className="eyebrow">{title}</h2>
        {link && (
          <button className="link" onClick={onLink}>
            {link}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

export function LineChart({ data, height = 150, format }: { data: { label: string; value: number }[]; height?: number; format: (v: number) => string }) {
  const W = 340, H = height, pl = 40, pr = 8, pt = 10, pb = 22;
  const min = Math.min(...data.map((d) => d.value));
  const max = Math.max(...data.map((d) => d.value));
  const pad = (max - min) * 0.2 || 1;
  const lo = min - pad, hi = max + pad;
  const x = (i: number) => pl + (i * (W - pl - pr)) / (data.length - 1);
  const y = (v: number) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
  const ticks = [lo + (hi - lo) * 0.15, (lo + hi) / 2, hi - (hi - lo) * 0.15];
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`).join(' ');
  const every = Math.ceil(data.length / 6);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Evolución de precios">
      {ticks.map((t) => (
        <g key={t}>
          <line className="grid" x1={pl} x2={W - pr} y1={y(t)} y2={y(t)} />
          <text x={pl - 6} y={y(t) + 3} textAnchor="end">
            {format(t)}
          </text>
        </g>
      ))}
      <path className="line" d={path} key={path} />
      {data.map((d, i) => (
        <g key={d.label + i}>
          <circle className="pt" cx={x(i)} cy={y(d.value)} r={i === data.length - 1 ? 4 : 2.2} />
          {(i % every === 0 || i === data.length - 1) && (
            <text x={x(i)} y={H - 6} textAnchor="middle">
              {d.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function Initials({ name }: { name: string }) {
  const parts = name.replace('Familia ', '').split(' ');
  return <span className="initials">{(parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()}</span>;
}
