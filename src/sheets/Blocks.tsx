import { useStore } from '../app/store';
import * as S from '../data/select';
import type { MunayAction } from '../app/nav';
import type { Breakdown } from '../intelligence/finance';
import type { DocReading } from '../intelligence/docReader';
import type { Block } from '../intelligence/resolver';
import { dayLabel, time } from '../lib/format';
import { ClientRow, OperationRow, PropertyRow } from '../ui/entities';
import { Bullets, Kv, Reveal, Steps } from '../ui/kit';

/** Primero "te quedan aproximadamente…". Después "así se calcula". */
export function BreakdownView({ data }: { data: Breakdown }) {
  return (
    <div>
      <p className="eyebrow" style={{ marginBottom: 6 }}>Aproximadamente</p>
      <p className="display" style={{ fontSize: 44 }}>{data.value}</p>
      <div style={{ marginTop: 12 }}>
        <Reveal label="Así se calcula">
          <Kv rows={data.lines} strongLast />
          <p className="note" style={{ marginTop: 10 }}>{data.note}</p>
        </Reveal>
      </div>
    </div>
  );
}

export function ReadingView({ reading }: { reading: DocReading }) {
  const d = reading.doc;
  return (
    <div>
      {d.extracted.length > 0 && (
        <Reveal label="Datos extraídos" open>
          <Kv rows={d.extracted} />
        </Reveal>
      )}
      {d.flags.length > 0 && (
        <Reveal label="Puntos para revisar" open>
          <Bullets items={d.flags} />
        </Reveal>
      )}
      <Reveal label="Requisitos respaldados por el Core">
        {d.backed?.length ? <Bullets items={d.backed} /> : <p className="small muted">Ninguno todavía: el Core no tiene conocimiento activo para este documento.</p>}
      </Reveal>
      {d.missing.length > 0 && (
        <Reveal label="Revisión sugerida · práctica MUNAY, no verificada">
          <Bullets items={d.missing} />
        </Reveal>
      )}
      {d.pending && d.pending.length > 0 && (
        <Reveal label="Datos pendientes">
          <Bullets items={d.pending} />
        </Reveal>
      )}
      <Reveal label="Preguntas para abogado o notaría">
        <Bullets items={d.questions} />
      </Reveal>
      <p className="note" style={{ marginTop: 8 }}>{reading.note}</p>
    </div>
  );
}

export function BlockView({ b }: { b: Block }) {
  const { ws, open } = useStore();
  switch (b.type) {
    case 'text':
      return <p className="muted">{b.text}</p>;
    case 'list':
      return (
        <div>
          {b.title && <p className="eyebrow" style={{ marginBottom: 10 }}>{b.title}</p>}
          <Bullets items={b.items} />
        </div>
      );
    case 'breakdown':
      return <BreakdownView data={b.data} />;
    case 'steps':
      return <Steps steps={b.steps} current={b.current} />;
    case 'draft':
      return (
        <div>
          <p className="eyebrow" style={{ marginBottom: 8 }}>{b.label}</p>
          <div className="draft">{b.text}</div>
        </div>
      );
    case 'entity': {
      if (b.kind === 'property') {
        const p = S.prop(ws, b.id);
        return p ? <PropertyRow p={p} /> : null;
      }
      if (b.kind === 'client') {
        const c = S.client(ws, b.id);
        return c ? <ClientRow c={c} /> : null;
      }
      const o = S.operation(ws, b.id);
      return o ? <OperationRow op={o} /> : null;
    }
    case 'tasks':
      return (
        <div>
          {b.ids.map((id) => {
            const t = ws.tasks.find((x) => x.id === id);
            if (!t) return null;
            return (
              <div key={id} className={`agenda-item${t.done ? ' done' : ''}`} style={{ gridTemplateColumns: '54px 1fr' }}>
                <span className="agenda-time">{dayLabel(t.when) === 'Hoy' ? time(t.when) : dayLabel(t.when)}</span>
                <button
                  className="agenda-title"
                  style={{ textAlign: 'left' }}
                  onClick={() => {
                    const r = t.relatedId ?? '';
                    if (r.startsWith('op-')) open({ kind: 'operation', id: r });
                    else if (r.startsWith('l-')) open({ kind: 'capture', id: r });
                    else if (r.startsWith('p-')) open({ kind: 'property', id: r });
                  }}
                >
                  {t.title}
                </button>
              </div>
            );
          })}
        </div>
      );
    case 'reading':
      return <ReadingView reading={b.reading} />;
  }
}

export function ActionBar({ actions }: { actions: MunayAction[] }) {
  const { run } = useStore();
  if (!actions.length) return null;
  return (
    <div className="actions">
      {actions.map((a) => (
        <button key={a.label} className={`btn small${a.primary ? ' primary' : ''}`} onClick={() => run(a)}>
          {a.label}
        </button>
      ))}
    </div>
  );
}
