/**
 * P1.1 — Blindaje de finance.ts.
 *
 * Registro de TODOS los parámetros jurídicos/tributarios/económicos que usan los cálculos de la app.
 * No cambia ningún valor: documenta su origen y consulta si existe conocimiento ACTIVO en el Core que lo respalde.
 * Un cálculo que depende de parámetros sin respaldo no puede presentarse como dato normativo confirmado.
 */
import { CORE_P1 } from '../core/index.ts';
import type { CoreStore } from '../core/types.ts';

export type CategoriaParametro = 'tributario' | 'economico' | 'supuesto';

export interface ParametroFinanciero {
  id: string;
  descripcion: string;
  /** Valor actual en la app (no se modifica aquí). Null si viene del Core. */
  valor: number | null;
  categoria: CategoriaParametro;
  origen: string;
  /** Qué conocimiento del Core lo respaldaría si estuviera ACTIVO. */
  respaldoEsperado: { tipo: 'unidad'; id: string; parametro: string } | { tipo: 'tabla'; tablaId: string; clave: string } | null;
  usadoEn: string[];
}

export const PARAMETROS_FINANZAS: ParametroFinanciero[] = [
  { id: 'tc.usd_pen', descripcion: 'Tipo de cambio S/ por US$', valor: 3.75, categoria: 'economico', origen: 'Valor fijo de demostración (registrado aquí; finance.ts lo lee de este registro)', respaldoEsperado: { tipo: 'tabla', tablaId: 'TAB-TC', clave: 'USD-PEN' }, usadoEn: ['commission', 'netCommissionPEN', 'mortgage', 'alcabala'] },
  { id: 'renta4ta.retencion', descripcion: 'Retención de renta de cuarta categoría sobre honorarios del agente', valor: 0.08, categoria: 'tributario', origen: 'Valor fijo registrado aquí (finance.ts lo lee de este registro)', respaldoEsperado: null, usadoEn: ['commission', 'netCommissionPEN'] },
  { id: 'igv.tasa', descripcion: 'Tasa de IGV (ya no se usa en ningún cálculo; la nota de comisión solo advierte que su tratamiento no está verificado)', valor: 0.18, categoria: 'tributario', origen: 'Valor fijo registrado solo para auditoría', respaldoEsperado: null, usadoEn: ['commission (nota)'] },
  { id: 'hipoteca.tea', descripcion: 'Tasa efectiva anual del crédito hipotecario', valor: 0.089, categoria: 'economico', origen: 'Valor fijo "referencial" registrado aquí', respaldoEsperado: { tipo: 'tabla', tablaId: 'TAB-TASAS-HIP', clave: 'promedio' }, usadoEn: ['mortgage'] },
  { id: 'hipoteca.inicial', descripcion: 'Cuota inicial supuesta', valor: 0.1, categoria: 'supuesto', origen: 'Supuesto de simulación registrado aquí', respaldoEsperado: null, usadoEn: ['mortgage'] },
  { id: 'hipoteca.plazo', descripcion: 'Plazo supuesto del crédito (años)', valor: 20, categoria: 'supuesto', origen: 'Supuesto de simulación registrado aquí', respaldoEsperado: null, usadoEn: ['mortgage'] },
  { id: 'alcabala.tasa', descripcion: 'Tasa de alcabala', valor: 0.03, categoria: 'tributario', origen: 'Valor fijo registrado solo para auditoría: nunca entra al cálculo (la alcabala usa únicamente U-ALCABALA ACTIVA)', respaldoEsperado: { tipo: 'unidad', id: 'U-ALCABALA', parametro: 'tasa' }, usadoEn: ['alcabala'] },
  { id: 'alcabala.uit_inafectas', descripcion: 'Número de UIT del tramo inafecto de alcabala', valor: 10, categoria: 'tributario', origen: 'Valor fijo registrado solo para auditoría: nunca entra al cálculo (la alcabala usa únicamente U-ALCABALA ACTIVA)', respaldoEsperado: { tipo: 'unidad', id: 'U-ALCABALA', parametro: 'uitInafectas' }, usadoEn: ['alcabala'] },
  { id: 'uit', descripcion: 'Valor de la UIT del año', valor: null, categoria: 'tributario', origen: 'TAB-UIT del Core (HP-001)', respaldoEsperado: { tipo: 'tabla', tablaId: 'TAB-UIT', clave: '<año>' }, usadoEn: ['alcabala'] },
  { id: 'supuesto.renta_bruta_a', descripcion: 'Renta bruta anual supuesta (Barranco, Miraflores) para la simulación de oportunidad', valor: 0.058, categoria: 'supuesto', origen: 'Supuesto de simulación (antes escrito en AnalysisSheet)', respaldoEsperado: null, usadoEn: ['AnalysisSheet.opportunityResult'] },
  { id: 'supuesto.renta_bruta_b', descripcion: 'Renta bruta anual supuesta (otros distritos) para la simulación de oportunidad', valor: 0.048, categoria: 'supuesto', origen: 'Supuesto de simulación (antes escrito en AnalysisSheet)', respaldoEsperado: null, usadoEn: ['AnalysisSheet.opportunityResult'] },
  { id: 'renta1ra.tasa', descripcion: 'Tasa de impuesto sobre la renta de alquiler citada en la nota de rentabilidad', valor: 0.05, categoria: 'tributario', origen: 'Texto fijo en la nota de rentalYield', respaldoEsperado: { tipo: 'unidad', id: 'U-RENTA-1RA', parametro: 'tasa' }, usadoEn: ['rentalYield (nota)'] },
];

export interface EstadoParametro {
  parametro: ParametroFinanciero;
  respaldado: boolean;
  motivo: string;
}

export function estadoParametro(id: string, anio: number = new Date().getFullYear(), core: CoreStore = CORE_P1): EstadoParametro {
  const p = PARAMETROS_FINANZAS.find((x) => x.id === id);
  if (!p) throw new Error(`Parámetro desconocido: ${id}`);
  if (p.categoria === 'supuesto') return { parametro: p, respaldado: false, motivo: 'Supuesto de simulación: no es un dato normativo ni de mercado.' };
  const e = p.respaldoEsperado;
  if (!e) return { parametro: p, respaldado: false, motivo: 'No existe una unidad del Core que lo respalde.' };
  if (e.tipo === 'unidad') {
    const u = core.unidades.find((x) => x.id === e.id);
    const ok = u?.estado === 'ACTIVO' && u.parametros?.[e.parametro] !== undefined;
    return { parametro: p, respaldado: ok, motivo: ok ? `Respaldado por ${e.id} (ACTIVO).` : `${e.id} está en ${u?.estado ?? 'inexistente'}.` };
  }
  const clave = e.clave === '<año>' ? String(anio) : e.clave;
  const t = core.tablas.find((x) => x.tablaId === e.tablaId && x.clave === clave);
  const ok = t?.estado === 'ACTIVO';
  return { parametro: p, respaldado: ok, motivo: ok ? `Respaldado por ${t!.id} (ACTIVO).` : t ? `${t.id} está en ${t.estado}.` : `No hay valor en ${e.tablaId} para «${clave}».` };
}

export const auditoriaFinanzas = (anio?: number, core?: CoreStore) => PARAMETROS_FINANZAS.map((p) => estadoParametro(p.id, anio, core));

export type EvaluacionAlcabala =
  | { estado: 'BLOQUEADO'; sinRespaldo: EstadoParametro[] }
  | { estado: 'RESPALDADO'; tasa: number; uitInafectas: number; uit: number; tc: number; base: number; alcabala: number };

/**
 * La alcabala solo se calcula con parámetros ACTIVOS del Core (tasa, tramo inafecto, UIT y tipo de cambio).
 * Nunca con los valores escritos en finance.ts.
 */
export function evaluarAlcabala(priceUSD: number, fecha: Date = new Date(), core: CoreStore = CORE_P1): EvaluacionAlcabala {
  const anio = fecha.getFullYear();
  const estados = ['alcabala.tasa', 'alcabala.uit_inafectas', 'uit', 'tc.usd_pen'].map((id) => estadoParametro(id, anio, core));
  const sinRespaldo = estados.filter((e) => !e.respaldado);
  if (sinRespaldo.length) return { estado: 'BLOQUEADO', sinRespaldo };
  const u = core.unidades.find((x) => x.id === 'U-ALCABALA')!;
  const tasa = u.parametros!.tasa;
  const uitInafectas = u.parametros!.uitInafectas;
  const uit = core.tablas.find((t) => t.tablaId === 'TAB-UIT' && t.clave === String(anio))!.valor;
  const tc = core.tablas.find((t) => t.tablaId === 'TAB-TC' && t.clave === 'USD-PEN')!.valor;
  const base = Math.max(0, priceUSD * tc - uitInafectas * uit);
  return { estado: 'RESPALDADO', tasa, uitInafectas, uit, tc, base, alcabala: base * tasa };
}

/** Valor registrado de un parámetro (fuente única de los valores que usa finance.ts). */
export function valorParametro(id: string): number {
  const p = PARAMETROS_FINANZAS.find((x) => x.id === id);
  if (!p || p.valor === null) throw new Error(`Parámetro sin valor registrado: ${id}`);
  return p.valor;
}

export interface EvaluacionCalculo {
  /** RESPALDADO solo si TODOS los parámetros requeridos tienen respaldo ACTIVO en el Core. */
  estado: 'RESPALDADO' | 'NO_VERIFICADO';
  sinRespaldo: EstadoParametro[];
  etiqueta: string;
}

/** Regla de cálculo (P1.2A): un resultado es RESPALDADO únicamente si todos sus parámetros requeridos están ACTIVOS. */
export function evaluarCalculo(ids: string[], anio?: number, core?: CoreStore): EvaluacionCalculo {
  const sinRespaldo = ids.map((id) => estadoParametro(id, anio, core)).filter((e) => !e.respaldado);
  return sinRespaldo.length
    ? { estado: 'NO_VERIFICADO', sinRespaldo, etiqueta: 'Estimado no verificado' }
    : { estado: 'RESPALDADO', sinRespaldo, etiqueta: 'Respaldado por el Core' };
}
