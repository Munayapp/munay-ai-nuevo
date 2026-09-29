import type { ReactNode } from 'react';
import type { MunayAction } from '../app/nav';
import { useStore } from '../app/store';
import { uid } from '../data/changes';
import * as S from '../data/select';
import type { OperationStage } from '../data/types';
import { counterOfferMessage, referralRequest } from '../intelligence/drafts';
import { commission } from '../intelligence/finance';
import { dayLabel, time, usd } from '../lib/format';
import { StatusPill } from '../ui/entities';
import { Icon } from '../ui/Icon';
import { Bullets, Media, mediaOf, Row, Section } from '../ui/kit';
import { BreakdownView } from './Blocks';
import { Sheet } from './SheetHost';

const FLOW: OperationStage[] = ['negociación', 'documentación', 'tasación', 'firma', 'cerrada'];

function Stage({ n, label, children, tone }: { n: string; label: string; children: ReactNode; tone?: 'alert' | 'go' }) {
  return (
    <div className={`step${tone === 'go' ? ' now' : ''}`} style={{ paddingBottom: 22 }}>
      <span className="step-dot" style={tone === 'alert' ? { borderColor: 'var(--red)', boxShadow: '0 0 0 4px rgba(229,9,20,.15)' } : undefined}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)' }}>{n}</span>
      </span>
      <div>
        <p className="eyebrow" style={{ marginBottom: 8, color: tone === 'alert' ? 'var(--red)' : tone === 'go' ? 'var(--accent)' : undefined }}>{label}</p>
        {children}
      </div>
    </div>
  );
}

export function OperationSheet({ id, accent }: { id: string; accent: string }) {
  const { ws, open, run } = useStore();
  const op = S.operation(ws, id);
  if (!op) return null;
  const p = S.prop(ws, op.propertyId)!;
  const buyer = S.client(ws, op.buyerId)!;
  const docs = S.docsFor(ws, op.id);
  const money = commission(op, ws.agent, p);
  const idx = FLOW.indexOf(op.stage);
  const nextStage = FLOW[idx + 1];

  const primary: MunayAction =
    op.stage === 'negociación'
      ? { label: 'Copiar contraoferta para ' + buyer.name.split(' ')[0], primary: true, effects: [{ do: 'copy', text: counterOfferMessage(buyer, op, p), toast: 'Contraoferta copiada' }] }
      : op.stage === 'cerrada'
        ? { label: 'Pedir referidos', primary: true, effects: [{ do: 'copy', text: referralRequest(buyer), toast: 'Mensaje copiado' }] }
        : { label: 'Preparar lo que falta', primary: true, go: docs[0] ? { to: 'sheet', sheet: { kind: 'document', id: docs[0].id } } : undefined, prompt: docs[0] ? undefined : `Analiza documentos de ${p.address}` };

  const advance: MunayAction | null = nextStage
    ? {
        label: `Avanzar a ${nextStage}`,
        effects: [
          { do: 'change', change: { type: 'operation.update', id: op.id, patch: { stage: nextStage, happened: [...op.happened, `Pasó a ${nextStage}.`], ...(nextStage === 'cerrada' ? { closedAt: new Date().toISOString(), missing: [], risks: [] } : {}) } }, toast: `Operación en ${nextStage}` },
          { do: 'change', change: { type: 'activity.log', activity: { id: uid('ac'), at: new Date().toISOString(), text: `${p.address.split(',')[0]} avanzó a ${nextStage}.`, relatedId: op.id } }, toast: '' },
        ],
      }
    : null;

  return (
    <Sheet label="Operación" accent={accent}>
      <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr', gap: 14, alignItems: 'center', marginTop: 10 }}>
        <Media {...mediaOf(p)} height={72} radius={10} />
        <button style={{ textAlign: 'left' }} onClick={() => open({ kind: 'property', id: p.id })}>
          <span className="title" style={{ display: 'block', fontSize: 24 }}>{p.type} · {p.district}</span>
          <span className="small muted">{usd(op.priceUSD)} · {buyer.name}</span>
        </button>
      </div>

      <div className="steps inline" style={{ margin: '20px 0 26px' }}>
        {FLOW.map((s, i) => (
          <i key={s} className={i <= idx ? 'done' : ''} title={s} />
        ))}
      </div>

      <div className="steps">
        <Stage n="1" label="Estado">
          <StatusPill status={op.stage} state={S.opState(op)} />
        </Stage>
        <Stage n="2" label="Qué ocurrió">
          <Bullets items={op.happened} />
        </Stage>
        {op.missing.length > 0 && (
          <Stage n="3" label="Qué falta">
            <Bullets items={op.missing} />
          </Stage>
        )}
        {op.risks.length > 0 && (
          <Stage n="4" label="Qué podría retrasarla" tone="alert">
            <Bullets items={op.risks} />
          </Stage>
        )}
        <Stage n={String(op.missing.length && op.risks.length ? 5 : op.missing.length || op.risks.length ? 4 : 3)} label="Siguiente acción" tone="go">
          <p style={{ fontWeight: 600, lineHeight: 1.4 }}>{op.nextAction}</p>
          <p className="small muted" style={{ marginTop: 4 }}>
            <Icon name="calendar" size={13} /> {dayLabel(op.nextDue)} · {time(op.nextDue)}
          </p>
          <div className="actions" style={{ marginTop: 12 }}>
            <button className="btn small primary" onClick={() => run(primary)}>
              {primary.label}
            </button>
            {advance && (
              <button className="btn small" onClick={() => run(advance)}>
                {advance.label}
              </button>
            )}
          </div>
        </Stage>
      </div>

      <Section title="Tu comisión">
        <BreakdownView data={money} />
      </Section>

      {docs.length > 0 && (
        <Section title="Documentos">
          {docs.map((d) => (
            <Row key={d.id} flat icon="doc" title={d.kind} sub={d.status} onClick={() => open({ kind: 'document', id: d.id })} />
          ))}
        </Section>
      )}
    </Sheet>
  );
}
