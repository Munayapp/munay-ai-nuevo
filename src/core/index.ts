/** MUNAY INTELLIGENCE CORE — P1. Punto de entrada. */
import { FUENTES_P1 } from './fuentes.ts';
import { NORMAS_P1, SECCIONES_P1 } from './normas.ts';
import { TABLAS_P1 } from './tablas.ts';
import type { CoreStore } from './types.ts';
import { UNIDADES_P1 } from './unidades.ts';

export const CORE_P1: CoreStore = {
  fuentes: FUENTES_P1,
  normas: NORMAS_P1,
  secciones: SECCIONES_P1,
  unidades: UNIDADES_P1,
  tablas: TABLAS_P1,
  // Ninguna redacción interpretativa aprobada todavía.
  aprobacionesRedaccion: [],
};

export { analizar, reconstruir, violacionesDeLenguaje } from './motor.ts';
export { uitDelAnio } from './tablas.ts';
export { estadoJuridico, estadoVerificacion } from './vigencia.ts';
export { CONSULTAS_P1 } from './consultas.ts';
export { DISTRITOS_P1 } from './alcance.ts';
export { METODOS } from './metodos.ts';
