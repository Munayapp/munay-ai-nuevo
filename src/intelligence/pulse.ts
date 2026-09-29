/**
 * PULSE — MUNAY observa y detecta lo que merece atención.
 * Selectivo por diseño: se calculan todas las señales y solo se muestran las 3 más relevantes.
 */
import type { MunayAction } from '../app/nav';
import * as S from '../data/select';
import type { Workspace } from '../data/types';
import { METODOS } from '../core/metodos.ts';
import { pct } from '../lib/format';

const { pulseSeguimiento: SEG, pulseBajaActividad: BAJA, pulsePropuesta: PROP } = METODOS;

export interface Signal {
  id: string;
  kind: 'cliente' | 'documento' | 'propiedad' | 'lead' | 'captación';
  title: string;
  detail: string;
  score: number;
  action: MunayAction;
}

export function signals(ws: Workspace): Signal[] {
  const out: Signal[] = [];

  for (const l of ws.leads.filter((x) => !x.seen)) {
    const p = S.prop(ws, l.propertyId);
    out.push({
      id: `lead-${l.id}`, kind: 'lead', score: 95,
      title: `${l.name} ${l.kind === 'visita' ? 'pidió una visita' : l.kind === 'interés' ? 'mostró interés' : 'hizo una pregunta'} vía QR`,
      detail: `${p?.type} en ${p?.district}. ${l.message}`,
      action: { label: 'Ver propiedad', go: { to: 'sheet', sheet: { kind: 'property', id: l.propertyId } }, effects: [{ do: 'change', change: { type: 'lead.seen', id: l.id }, toast: 'Marcado como visto' }] },
    });
  }

  for (const c of ws.clients) {
    if (c.role !== 'propietario' && c.lastContactDays >= SEG.parametros.diasSinContacto && c.probability >= SEG.parametros.probabilidadMinima) {
      out.push({
        id: `cli-${c.id}`, kind: 'cliente', score: 60 + c.probability * 30 + c.lastContactDays,
        title: `${c.name.split(' ')[0]} lleva ${c.lastContactDays} días sin seguimiento`,
        detail: `Probabilidad de compra ${pct(c.probability)}. ${c.wants}.`,
        action: { label: 'Preparar mensaje', go: { to: 'sheet', sheet: { kind: 'client', id: c.id } } },
      });
    }
  }

  for (const o of S.activeOperations(ws)) {
    if (o.risks.length && o.missing.length) {
      const p = S.prop(ws, o.propertyId);
      out.push({
        id: `op-${o.id}`, kind: 'documento', score: o.stage === 'documentación' ? 82 : 55,
        title: `Falta ${o.missing[0].replace(/\.$/, '').toLowerCase()}`,
        detail: `${p?.type} en ${p?.district}. ${o.risks[0]}`,
        action: { label: 'Abrir operación', go: { to: 'sheet', sheet: { kind: 'operation', id: o.id } } },
      });
    }
  }

  for (const p of ws.properties.filter((x) => x.status === 'activa')) {
    const rate = p.views7d ? p.inquiries7d / p.views7d : 0;
    if (p.daysOnMarket > BAJA.parametros.diasPublicada && rate < BAJA.parametros.conversionMinima) {
      out.push({
        id: `prop-${p.id}`, kind: 'propiedad', score: 70 + p.daysOnMarket / 10,
        title: `${p.type} en ${p.district} con baja actividad`,
        detail: `${p.views7d} vistas y ${p.inquiries7d} consulta en 7 días. ${p.daysOnMarket} días publicada.`,
        action: { label: 'Ver por qué', go: { to: 'sheet', sheet: { kind: 'analysis', mode: 'propiedad', subjectId: p.id } } },
      });
    }
  }

  for (const l of ws.listings) {
    if (l.step === 'propuesta' && l.daysInStep >= PROP.parametros.diasSinRespuesta) {
      const owner = S.client(ws, l.ownerId);
      out.push({
        id: `cap-${l.id}`, kind: 'captación', score: 62,
        title: `Propuesta a ${owner?.name.split(' ')[0]} sin respuesta`,
        detail: `${l.daysInStep} días en espera. ${l.note}`,
        action: { label: 'Abrir captación', go: { to: 'sheet', sheet: { kind: 'capture', id: l.id } } },
      });
    }
  }

  return out.sort((a, b) => b.score - a.score);
}

export const topSignals = (ws: Workspace, n = 3) => signals(ws).slice(0, n);
