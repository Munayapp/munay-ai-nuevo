/**
 * EVIDENCIA DEL AGENTE (P1.2A).
 * Lo único que autoriza a un texto para terceros a decir "vendimos", "cerramos" o "tengo compradores":
 * registros reales del agente en su CRM. Sin registro, el texto no afirma nada de eso.
 */
import type { District, Workspace } from '../data/types';
import { procedencia, type Procedencia } from './procedencia.ts';

export interface EvidenciaAgente {
  district: District;
  /** Operaciones cerradas por el agente en el distrito (registro del CRM). */
  cierres: { count: number; ultimaFecha?: string; ids: string[] };
  /** Compradores e inversionistas de la cartera del agente que buscan en el distrito. */
  compradores: { count: number; ids: string[] };
  procedencia: Procedencia;
}

export function evidenciaAgente(ws: Workspace, district: District, demo: boolean): EvidenciaAgente {
  const cerradas = ws.operations.filter((o) => o.stage === 'cerrada' && ws.properties.find((p) => p.id === o.propertyId)?.district === district);
  const compradores = ws.clients.filter((c) => (c.role === 'comprador' || c.role === 'inversionista') && c.districts.includes(district));
  const ultima = cerradas.map((o) => o.closedAt).filter((x): x is string => !!x).sort().pop();
  return {
    district,
    cierres: { count: cerradas.length, ultimaFecha: ultima, ids: cerradas.map((o) => o.id) },
    compradores: { count: compradores.length, ids: compradores.map((c) => c.id) },
    procedencia: procedencia('AGENT_DATA', `crm:${district}`, { demo }),
  };
}

/** Solo se puede afirmar ante terceros si hay registro y no es de demostración. */
export const puedeAfirmarCierres = (e?: EvidenciaAgente) => !!e && !e.procedencia.demo && e.cierres.count > 0;
export const puedeAfirmarCompradores = (e?: EvidenciaAgente) => !!e && !e.procedencia.demo && e.compradores.count > 0;
