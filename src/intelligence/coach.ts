/**
 * COACH — aparece cuando es útil, nunca como botón obligatorio.
 * Un consejo por contexto, con una acción concreta.
 */
import type { MunayAction, Tab } from '../app/nav';
import * as S from '../data/select';
import type { Workspace } from '../data/types';
import { pct, penK, usdK } from '../lib/format';
import { netCommissionPEN } from './finance';

export interface Advice {
  text: string;
  action: MunayAction;
}

export function coach(tab: Tab, ws: Workspace): Advice | null {
  switch (tab) {
    case 'hoy': {
      const open = ws.listings.filter((l) => l.step !== 'activa');
      const ready = open.find((l) => l.step === 'autorización' || l.step === 'firma');
      if (!open.length) return null;
      const owner = ready && S.client(ws, ready.ownerId);
      return {
        text: `Tienes ${open.length} oportunidades de captación esta semana.${owner ? ` Empieza por ${owner.name.split(' ')[0]}: solo falta su firma.` : ''}`,
        action: { label: 'Ver el siguiente movimiento', go: { to: 'sheet', sheet: { kind: 'capture', id: (ready ?? open[0]).id } } },
      };
    }
    case 'analiza': {
      const op = ws.operations.find((o) => o.stage === 'negociación');
      if (!op) return null;
      const buyer = S.client(ws, op.buyerId);
      return {
        text: `La decisión más valiosa hoy: responder a ${buyer?.name.split(' ')[0]} antes de que se enfríe. ${op.risks[0] ?? ''}`,
        action: { label: 'Ver escenarios', go: { to: 'sheet', sheet: { kind: 'analysis', mode: 'decision', subjectId: op.id } } },
      };
    }
    case 'mercado': {
      const p = ws.properties.find((x) => x.status === 'activa' && S.position(ws, x).verdict === 'sobre');
      if (!p) return null;
      const pos = S.position(ws, p);
      return {
        text: `${p.address.split(',')[0]} está ${pct(pos.diff)} sobre sus comparables. En ${usdK(pos.fairHigh)} entraría al rango que más se vende.`,
        action: { label: 'Ver análisis', go: { to: 'sheet', sheet: { kind: 'analysis', mode: 'propiedad', subjectId: p.id } } },
      };
    }
    case 'crea': {
      const p = ws.properties.find((x) => x.status === 'activa' && x.inquiries7d <= 1);
      if (!p) return null;
      return {
        text: `${p.address.split(',')[0]} necesita otra mirada. Los reels que venden luz natural generan el doble de consultas en ${p.district}.`,
        action: { label: 'Crear ahora', go: { to: 'tab', tab: 'crea', params: { crea: { propertyId: p.id, objective: 'deseo', piece: 'reel', nonce: Date.now() } } } },
      };
    }
    case 'negocio': {
      const closed = ws.operations.filter((o) => o.stage === 'cerrada');
      const earned = closed.reduce((s, o) => s + netCommissionPEN(o, ws.agent), 0);
      const next = ws.operations.find((o) => o.stage === 'negociación');
      const add = next ? netCommissionPEN(next, ws.agent) : 0;
      return {
        text: `Ya cerraste ${penK(earned)} de tu meta de ${penK(ws.agent.goals.monthlyCommissionPEN)} este mes.${next ? ` Cerrar ${S.prop(ws, next.propertyId)?.address.split(' ').slice(0, 2).join(' ')} suma ${penK(add)}.` : ''}`,
        action: next
          ? { label: 'Ir a esa operación', go: { to: 'sheet', sheet: { kind: 'operation', id: next.id } } }
          : { label: 'Ver clientes', go: { to: 'tab', tab: 'negocio', params: { negocio: { seg: 'clientes' } } } },
      };
    }
  }
}
