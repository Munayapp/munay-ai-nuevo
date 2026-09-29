import type { CSSProperties } from 'react';
import { useStore } from '../app/store';
import type { Task } from '../data/types';
import { coach } from '../intelligence/coach';
import { memory } from '../intelligence/memory';
import { topSignals } from '../intelligence/pulse';
import { dayLabel, time } from '../lib/format';
import { Composer } from '../ui/Composer';
import { Icon } from '../ui/Icon';
import { Section } from '../ui/kit';
import { Scene } from '../ui/Scene';

/**
 * HOY — MUNAY organiza el día; no es un dashboard.
 *   AHORA          → una sola acción (la próxima del día).
 *   DESPUÉS        → 2–3 señales de PULSE, sin repetir lo de AHORA.
 *   MUNAY VIO ESTO → la lectura de COACH.
 *   AGENDA         → solo orientación horaria; no repite AHORA.
 */
export function Hoy() {
  const { ws, askMunay, run, commit, go, open } = useStore();
  const advice = coach('hoy', ws);
  const upcoming = ws.tasks
    .filter((t) => dayLabel(t.when) === 'Hoy' || dayLabel(t.when) === 'Mañana')
    .sort((a, b) => a.when.localeCompare(b.when));
  const now = upcoming.find((t) => !t.done);
  // Ninguna señal repite lo que ya está en AHORA (los ids de señal terminan en el id relacionado).
  const after = topSignals(ws, 4)
    .filter((s) => !(now?.relatedId && s.id.endsWith(now.relatedId)))
    .slice(0, 3);
  const agenda = upcoming.filter((t) => t.id !== now?.id);
  const returning = memory.get().sessions > 1;

  const toggle = (t: Task) => {
    if (t.done) return;
    run({ label: '', effects: [{ do: 'change', change: { type: 'task.complete', id: t.id }, toast: 'Hecho. Uno menos.' }] });
    commit({ type: 'activity.log', activity: { id: `ac-${t.id}`, at: new Date().toISOString(), text: `Completaste: ${t.title}.`, relatedId: t.relatedId } });
  };

  const openRelated = (t: Task) => {
    const id = t.relatedId;
    if (!id) return;
    if (id.startsWith('p-')) open({ kind: 'property', id });
    else if (id.startsWith('op-')) open({ kind: 'operation', id });
    else if (id.startsWith('l-')) open({ kind: 'capture', id });
    else if (id.startsWith('c-')) open({ kind: 'client', id });
  };

  return (
    <div className="page">
      <section className="hoy-hero">
        <Scene variant="interior" seed={3} className="hero-scene" />
        <div className="hero-shade" />
        <div className="hero-copy rise">
          <h1 className="display hero">
            Hola,
            <br />
            {ws.agent.firstName}
            <span className="dot" />
          </h1>
          <p className="display-sub">
            Tu día,
            <br />
            con claridad.
          </p>
        </div>
        <div className="hero-bottom rise" style={{ '--i': 3 } as CSSProperties}>
          <Composer onSubmit={(t, f) => askMunay(t, f)} />
        </div>
      </section>

      {now && (
        <Section title={returning ? 'Ahora · retomemos' : 'Ahora'}>
          <button style={{ textAlign: 'left', width: '100%' }} className="rise" onClick={() => openRelated(now)}>
            <p className="faint small" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {dayLabel(now.when)} · {time(now.when)}
            </p>
            <p className="lead" style={{ marginTop: 6, fontSize: 28 }}>{now.title}</p>
            <span className="signal-cta">
              Preparar <Icon name="arrow" size={14} stroke={2} />
            </span>
          </button>
        </Section>
      )}

      {after.length > 0 && (
        <Section title="Después" link="Ver todo" onLink={() => open({ kind: 'pulse' })}>
          <p className="muted rise" style={{ marginBottom: 2 }}>
            {after.length === 1 ? '1 cosa merece tu atención.' : `${after.length} cosas merecen tu atención.`}
          </p>
          <div>
            {after.map((s, i) => (
              <button key={s.id} className="signal quiet rise" style={{ '--i': i } as CSSProperties} onClick={() => run(s.action)}>
                <span className={`signal-mark${s.kind === 'lead' ? ' calm' : ''}`} />
                <span style={{ display: 'block', minWidth: 0 }}>
                  <span className="signal-title" style={{ display: 'block' }}>{s.title}</span>
                  <span className="signal-detail" style={{ display: 'block' }}>{s.detail}</span>
                </span>
                <Icon name="chev" size={16} className="faint" />
              </button>
            ))}
          </div>
        </Section>
      )}

      {advice && (
        <Section title="MUNAY vio esto">
          <button className="insight rise" onClick={() => advice.action.go && go(advice.action.go)}>
            <span className="insight-text">{advice.text}</span>
            <span className="signal-cta">
              {advice.action.label} <Icon name="arrow" size={14} stroke={2} />
            </span>
          </button>
        </Section>
      )}

      {agenda.length > 0 && (
        <Section title="Agenda">
          {agenda.map((t) => (
            <div key={t.id} className={`agenda-item${t.done ? ' done' : ''}`}>
              <span className="agenda-time">
                {dayLabel(t.when) === 'Mañana' ? <span className="faint" style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Mañ.</span> : null}
                {time(t.when)}
              </span>
              <button className="agenda-title" style={{ textAlign: 'left' }} onClick={() => openRelated(t)}>
                {t.title}
              </button>
              <button className={`check${t.done ? ' on' : ''}`} aria-label={t.done ? 'Hecho' : 'Marcar como hecho'} onClick={() => toggle(t)}>
                <Icon name="check" size={14} stroke={2.4} />
              </button>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
