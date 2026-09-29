import { METODOS } from '../core/metodos.ts';
import { dayLabel } from '../lib/format.ts';
import type { Comparable, District, ID, Operation, Property, Workspace } from './types';

/** Parámetros del método canónico (core/metodos.ts). No se redefinen aquí. */
const RV = METODOS.rangoValorizacion.parametros;

export const prop = (ws: Workspace, id?: ID) => ws.properties.find((p) => p.id === id);
export const client = (ws: Workspace, id?: ID) => ws.clients.find((c) => c.id === id);
export const operation = (ws: Workspace, id?: ID) => ws.operations.find((o) => o.id === id);
export const listing = (ws: Workspace, id?: ID) => ws.listings.find((l) => l.id === id);
export const doc = (ws: Workspace, id?: ID) => ws.documents.find((d) => d.id === id);
export const zone = (ws: Workspace, d: District) => ws.zones.find((z) => z.district === d)!;

export const operationFor = (ws: Workspace, propertyId: ID) => ws.operations.find((o) => o.propertyId === propertyId);
export const listingFor = (ws: Workspace, propertyId: ID) => ws.listings.find((l) => l.propertyId === propertyId);
export const docsFor = (ws: Workspace, id: ID) => ws.documents.filter((d) => d.propertyId === id || d.operationId === id);
export const activeOperations = (ws: Workspace) => ws.operations.filter((o) => o.stage !== 'cerrada');
/**
 * Estados oficiales de MUNAY (secuencia: ATENCIÓN · ACCIÓN · EN CURSO · LOGRO).
 *   atencion → algo requiere intervención o revisión del agente (no significa perdida).
 *   accion   → hay una acción concreta del agente para hoy.
 *   en-curso → avanza normalmente.
 *   logro    → resultado conseguido.
 */
export type OpState = 'atencion' | 'accion' | 'en-curso' | 'logro';

export const STATE_LABEL: Record<OpState, string> = { atencion: 'Atención', accion: 'Acción', 'en-curso': 'En curso', logro: 'Logro' };

/** Requiere intervención: un riesgo que frena el avance (mismo criterio que antes). */
export const needsAttention = (o?: Operation) => Boolean(o && o.stage !== 'cerrada' && o.risks.some((r) => /bloquea|retrasa/i.test(r)));

export function opState(o?: Operation): OpState {
  if (!o) return 'en-curso';
  if (o.stage === 'cerrada') return 'logro';
  if (needsAttention(o)) return 'atencion';
  if (dayLabel(o.nextDue) === 'Hoy') return 'accion';
  return 'en-curso';
}

export function propertyState(ws: Workspace, p: Property): OpState {
  if (p.status === 'vendida') return 'logro';
  return opState(operationFor(ws, p.id));
}

/** Comparables relevantes: misma zona, área ±25%. */
export function compsFor(ws: Workspace, p: Pick<Property, 'district' | 'areaM2'>): Comparable[] {
  return ws.comparables
    .filter((c) => c.district === p.district && Math.abs(c.areaM2 - p.areaM2) / p.areaM2 <= METODOS.comparables.parametros.toleranciaArea)
    .sort((a, b) => a.distanceBlocks - b.distanceBlocks);
}

export interface Position {
  comps: Comparable[];
  compM2: number;
  ownM2: number;
  diff: number; // + = sobre los comparables
  fairLow: number;
  fairHigh: number;
  verdict: 'sobre' | 'en' | 'bajo';
}

/** Posicionamiento de precio frente a comparables (MUNAY traduce datos en criterio). */
export function position(ws: Workspace, p: Property): Position {
  const comps = compsFor(ws, p);
  const pool = comps.length ? comps : ws.comparables.filter((c) => c.district === p.district);
  const compM2 = pool.reduce((s, c) => s + c.priceUSD / c.areaM2, 0) / Math.max(pool.length, 1);
  const ownM2 = p.priceUSD / p.areaM2;
  const diff = ownM2 / compM2 - 1;
  const fair = compM2 * p.areaM2;
  return {
    comps: pool,
    compM2,
    ownM2,
    diff,
    fairLow: Math.round((fair * RV.bandaInferior) / 1000) * 1000,
    fairHigh: Math.round((fair * RV.bandaSuperior) / 1000) * 1000,
    verdict: diff > RV.umbralPosicion ? 'sobre' : diff < -RV.umbralPosicion ? 'bajo' : 'en',
  };
}
