import { useState, type CSSProperties } from 'react';
import { useStore } from '../app/store';
import * as S from '../data/select';
import { CAPTURE_STEPS } from '../data/types';
import { coach } from '../intelligence/coach';
import { netCommissionPEN, netCommissionStatus } from '../intelligence/finance';
import { dayLabel, pct, penK, time } from '../lib/format';
import { ClientRow, OperationRow } from '../ui/entities';
import { Icon } from '../ui/Icon';
import { Coach, Display, InlineSteps, Media, mediaOf, Section, Seg } from '../ui/kit';

type SegId = 'operaciones' | 'clientes' | 'captaciones';

export function Negocio() {
  const { ws, params, open, go } = useStore();
  const [seg, setSeg] = useState<SegId>(params.negocio?.seg ?? 'operaciones');
  const actives = S.activeOperations(ws);
  const closed = ws.operations.filter((o) => o.stage === 'cerrada');
  const pipeline = ws.operations.reduce((s, o) => s + netCommissionPEN(o, ws.agent), 0);
  const attention = actives.filter((o) => S.opState(o) === 'atencion').length;
  const action = actives.filter((o) => S.opState(o) === 'accion').length;
  const status = [attention && `${attention === 1 ? 'Una requiere' : `${attention} requieren`} atención`, action && `${action === 1 ? 'una tiene' : `${action} tienen`} una acción hoy`].filter(Boolean).join(' y ');
  const next = [...actives].sort((a, b) => a.nextDue.localeCompare(b.nextDue))[0];
  const nextProp = next && S.prop(ws, next.propertyId);
  const advice = coach('negocio', ws);

  return (
    <div className="page">
      <Display
        title="Negocio"
        sub={
          <>
            Tu gestión,
            <br />
            en movimiento.
          </>
        }
      />

      <p className="lead rise" style={{ marginBottom: 22 }}>
        {actives.length} operaciones avanzan{closed.length ? ` y ${closed.length} cerró este mes` : ''}.{' '}
        <span className="muted">{status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}.` : 'Todo en curso.'}</span>
      </p>

      <Seg<SegId>
        value={seg}
        onChange={setSeg}
        options={[
          { id: 'operaciones', label: 'Transacciones' },
          { id: 'clientes', label: 'Clientes' },
          { id: 'captaciones', label: 'Captaciones' },
        ]}
      />

      {seg === 'operaciones' && (
        <>
          <div className="stack">
            {ws.operations.map((o, i) => (
              <OperationRow key={o.id} op={o} style={{ '--i': i } as CSSProperties} />
            ))}
          </div>

          <Section title="Tu desempeño · este mes">
            <div className="stats" style={{ gridTemplateColumns: '1fr 1.35fr 1fr' }}>
              <div className="stat">
                <div className="stat-value">{ws.operations.length}</div>
                <div className="stat-label">Operaciones</div>
              </div>
              <div className="stat">
                <div className="stat-value">{penK(pipeline)}</div>
                <div className="stat-label">Comisión proyectada{netCommissionStatus().etiqueta ? ' · estimado no verificado' : ''}</div>
              </div>
              <div className="stat">
                <div className="stat-value">{pct(ws.agent.metrics.conversion)}</div>
                <div className="stat-label">Conversión</div>
              </div>
            </div>
            <p className="note" style={{ marginTop: 10 }}>Proyectada: tu neto estimado de lo ya cerrado más lo que está en curso.</p>
          </Section>

          {next && nextProp && (
            <Section title="Siguiente paso">
              <button className="entity" style={{ gridTemplateColumns: '28px 1fr auto', padding: 16 }} onClick={() => open({ kind: 'operation', id: next.id })}>
                <Icon name="check" size={24} className="muted" />
                <span>
                  <span style={{ display: 'block', fontWeight: 600 }}>{next.nextAction}</span>
                  <span className="small muted" style={{ display: 'block', marginTop: 4 }}>
                    {dayLabel(next.nextDue)} · {time(next.nextDue)} · {nextProp.address.split(',')[0]}
                  </span>
                </span>
                <Icon name="chev" size={18} className="faint" />
              </button>
            </Section>
          )}

          {advice && (
            <div className="section">
              <Coach label="Hacia tu meta" icon="trend" text={advice.text} cta={advice.action.label} onClick={() => advice.action.go && go(advice.action.go)} />
            </div>
          )}
        </>
      )}

      {seg === 'clientes' && (
        <div>
          {[...ws.clients]
            .sort((a, b) => b.probability - a.probability)
            .map((c) => (
              <ClientRow key={c.id} c={c} />
            ))}
          <p className="note" style={{ marginTop: 16 }}>Ordenados por la probabilidad que registraste.</p>
        </div>
      )}

      {seg === 'captaciones' && (
        <div className="stack">
          {ws.listings.map((l, i) => {
            const p = S.prop(ws, l.propertyId)!;
            const owner = S.client(ws, l.ownerId)!;
            const idx = CAPTURE_STEPS.indexOf(l.step);
            return (
              <button key={l.id} className="entity rise" style={{ '--i': i, gridTemplateColumns: '84px 1fr auto' } as CSSProperties} onClick={() => open({ kind: 'capture', id: l.id })}>
                <Media {...mediaOf(p)} />
                <span>
                  <span className="entity-title" style={{ display: 'block' }}>{p.type} · {p.district}</span>
                  <span className="entity-sub" style={{ display: 'block' }}>
                    {owner.name} · <span style={{ color: 'var(--text)', textTransform: 'capitalize' }}>{l.step}</span>
                  </span>
                  <InlineSteps total={CAPTURE_STEPS.length} current={idx} />
                </span>
                <Icon name="chev" size={18} className="faint" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
