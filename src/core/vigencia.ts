/**
 * A2 — Dos conceptos independientes que nunca se contaminan:
 *   estadoJuridico()      → SOLO por fechas de versión y relaciones normativas reales.
 *   estadoVerificacion()  → SOLO cuándo MUNAY debe volver a comprobar la fuente.
 * Ninguna de las dos funciones lee los datos de la otra.
 */
import type { EstadoJuridico, Norma, Verificacion, VersionNorma } from './types.ts';

const enRango = (fecha: string, desde: string | null, hasta: string | null) =>
  (!desde || desde <= fecha) && (!hasta || fecha <= hasta);

export function estadoJuridico(norma: Pick<Norma, 'versiones' | 'relaciones'>, fecha: string): { estado: EstadoJuridico; version: VersionNorma | null } {
  const efectivas = norma.relaciones.filter((r) => r.desde !== null && r.desde <= fecha);
  if (efectivas.some((r) => r.tipo === 'DEROGA')) return { estado: 'DEROGADA', version: null };
  if (efectivas.some((r) => r.tipo === 'SUSTITUYE')) return { estado: 'SUSTITUIDA', version: null };

  const version = norma.versiones.find((v) => enRango(fecha, v.vigenteDesde, v.vigenteHasta)) ?? null;
  if (!version) return { estado: 'DESCONOCIDO', version: null };

  // Una relación sin fecha conocida hace desconocido qué texto aplica: no se supone.
  if (norma.relaciones.some((r) => r.desde === null)) return { estado: 'DESCONOCIDO', version: null };
  if (efectivas.some((r) => r.tipo === 'MODIFICA')) return { estado: 'MODIFICADA_PARCIALMENTE', version };
  return { estado: 'VIGENTE', version };
}

export type EstadoVerificacion = 'AL_DIA' | 'VENCIDA' | 'SIN_VERIFICAR';

const diasEntre = (a: string, b: string) => Math.floor((Date.parse(b) - Date.parse(a)) / 86400000);

export function estadoVerificacion(v: Verificacion, ventanaDias: number, fecha: string): EstadoVerificacion {
  if (!v.ultimaFecha) return 'SIN_VERIFICAR';
  return diasEntre(v.ultimaFecha, fecha) > ventanaDias ? 'VENCIDA' : 'AL_DIA';
}

/** Fecha en formato YYYY-MM-DD. */
export const hoyISO = (d: Date = new Date()) => d.toISOString().slice(0, 10);
