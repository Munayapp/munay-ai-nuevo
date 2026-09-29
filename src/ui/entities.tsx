import type { CSSProperties } from 'react';
import { useStore } from '../app/store';
import * as S from '../data/select';
import type { Client, Operation, OperationStage, Property, PropertyStatus } from '../data/types';
import { usdK } from '../lib/format';
import { Icon } from './Icon';
import { Initials, Media, mediaOf, Meter, Pill } from './kit';

/**
 * Estados oficiales — el color comunica el estado; el texto, la etapa:
 *   ATENCIÓN → rojo (exclusivo): requiere intervención o revisión.
 *   ACCIÓN   → contorno champagne: hay algo concreto que hacer hoy; no es alerta.
 *   EN CURSO → neutro: avanza normalmente.
 *   LOGRO    → oro (exclusivo): resultado conseguido.
 */
const PILL: Record<S.OpState, { tone: 'soft' | 'line' | 'neutral'; color?: string }> = {
  atencion: { tone: 'line', color: 'var(--red)' },
  accion: { tone: 'line', color: 'var(--cream)' },
  'en-curso': { tone: 'neutral' },
  logro: { tone: 'soft', color: 'var(--gold)' },
};

/** El agente reconoce una propiedad por su dirección, no por su tipo. */
const short = (p: Property) => p.address.split(',')[0];

export const StatusPill = ({ status, state }: { status: OperationStage | PropertyStatus; state: S.OpState }) => {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  const { tone, color } = PILL[state];
  return (
    <span title={S.STATE_LABEL[state]} aria-label={`${S.STATE_LABEL[state]}: ${label}`} style={{ display: 'inline-flex' }}>
      <Pill tone={tone} color={color}>
        {label}
      </Pill>
    </span>
  );
};

export function PropertyRow({ p, sub, style }: { p: Property; sub?: string; style?: CSSProperties }) {
  const { ws, open } = useStore();
  return (
    <button className="entity rise" style={style} onClick={() => open({ kind: 'property', id: p.id })}>
      <Media {...mediaOf(p)} />
      <span>
        <span className="entity-title" style={{ display: 'block' }}>{short(p)}</span>
        <span className="entity-sub" style={{ display: 'block' }}>{sub ?? `${p.district} · ${usdK(p.priceUSD)}`}</span>
        <StatusPill status={p.status} state={S.propertyState(ws, p)} />
      </span>
      <Icon name="chev" size={18} className="faint" />
    </button>
  );
}

export function OperationRow({ op, style }: { op: Operation; style?: CSSProperties }) {
  const { ws, open } = useStore();
  const p = S.prop(ws, op.propertyId)!;
  return (
    <button className="entity rise" style={style} onClick={() => open({ kind: 'operation', id: op.id })}>
      <Media {...mediaOf(p)} />
      <span>
        <span className="entity-title" style={{ display: 'block' }}>{short(p)}</span>
        <span className="entity-sub" style={{ display: 'block' }}>
          {p.district} · {usdK(op.priceUSD)}
        </span>
        <StatusPill status={op.stage} state={S.opState(op)} />
      </span>
      <Icon name="chev" size={18} className="faint" />
    </button>
  );
}

export function ClientRow({ c, note }: { c: Client; note?: string }) {
  const { open } = useStore();
  const roleLabel = { comprador: 'Comprador', propietario: 'Propietario', inversionista: 'Inversionista' }[c.role];
  return (
    <button className="person rise" onClick={() => open({ kind: 'client', id: c.id })}>
      <Initials name={c.name} />
      <span style={{ display: 'block', minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 600, fontSize: 15 }}>{c.name}</span>
        <span className="small muted" style={{ display: 'block', margin: '2px 0 8px' }}>
          {note ?? `${roleLabel} · ${c.lastContactDays === 0 ? 'contactado hoy' : `hace ${c.lastContactDays} d`}`}
        </span>
        <Meter value={c.probability} muted />
      </span>
      <span className="small" style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-2)' }}>
        {Math.round(c.probability * 100)}%
      </span>
    </button>
  );
}
