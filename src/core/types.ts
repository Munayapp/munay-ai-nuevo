/**
 * MUNAY INTELLIGENCE CORE — modelo P1.
 *
 * Tres planos que nunca se mezclan:
 *   CORE     → conocimiento general, versionado, con vigencia (este módulo).
 *   CASO     → documentos de una operación y los hechos extraídos de ellos (caso.ts).
 *   CONTEXTO → agente, personas, propiedad, operación (ContextoCaso).
 *
 * Regla absoluta (A1): solo lo que está en estado ACTIVO puede usarse como NORMA, HECHO o PRÁCTICA.
 * Módulo autocontenido: no importa nada del resto de la app.
 */

export type EstadoConocimiento = 'BORRADOR' | 'VERIFICADO' | 'ACTIVO' | 'RETIRADO';

export type TipoEpistemico =
  | 'NORMA'
  | 'HECHO'
  | 'DATO'
  | 'DATO_DEL_CASO'
  | 'DATO_DEL_AGENTE'
  | 'INTERPRETACION'
  | 'PRACTICA'
  | 'RECOMENDACION'
  | 'INCERTIDUMBRE';

export type Capa =
  | 'LEGAL'
  | 'GEOGRAPHY'
  | 'MARKET'
  | 'PROPERTY'
  | 'PEOPLE'
  | 'MONEY'
  | 'OPERATIONS'
  | 'PROFESSIONAL'
  | 'COMPLIANCE'
  | 'ECOSYSTEM';

export type Confianza = 'ALTA' | 'MEDIA' | 'BAJA' | 'SIN_RESPALDO';

// ───────────── Fuentes ─────────────

export interface Fuente {
  id: string;
  nombre: string;
  entidad: string;
  tipo: 'oficial' | 'institucional' | 'comercial' | 'agente';
  /** 1 publicación oficial primaria · 2 consolidación/orientación oficial · 3 institucional · 4 comercial · 5 agente o secundaria. */
  nivelAutoridad: 1 | 2 | 3 | 4 | 5;
  url?: string;
  acceso: 'libre' | 'cuenta' | 'pago_por_caso' | 'autorizacion' | 'documento_del_agente';
  restricciones: string[];
  /** Cada cuántos días MUNAY debe volver a comprobar la fuente. NO determina vigencia jurídica. */
  ventanaVerificacionDias: number;
}

/** Comprobación hecha contra la fuente oficial. Independiente de la vigencia jurídica (A2). */
export interface Verificacion {
  ultimaFecha: string | null; // YYYY-MM-DD
  verificadoPor: string | null;
  url?: string;
  extracto?: string | null;
}

// ───────────── Normas y vigencia jurídica ─────────────

/**
 * Vigencia jurídica: se determina SOLO por fechas y relaciones normativas reales
 * (modifica, deroga, sustituye, TUO, reglamenta). Nunca por la ventana de verificación.
 */
export type EstadoJuridico = 'VIGENTE' | 'MODIFICADA_PARCIALMENTE' | 'DEROGADA' | 'SUSTITUIDA' | 'DESCONOCIDO';
export type TipoRelacion = 'MODIFICA' | 'DEROGA' | 'SUSTITUYE' | 'ORDENA_TUO' | 'REGLAMENTA';

/** Relación que AFECTA a esta norma, causada por otro documento. */
export interface RelacionNormativa {
  tipo: TipoRelacion;
  porDocumento: string;
  desde: string | null;
}

export interface VersionNorma {
  id: string;
  vigenteDesde: string | null;
  vigenteHasta: string | null;
  origenCambio?: string;
}

export interface Norma {
  id: string;
  fuenteId: string;
  tipo: 'ley' | 'decreto_legislativo' | 'decreto_supremo' | 'resolucion' | 'reglamento' | 'codigo' | 'ordenanza' | 'precedente';
  numero: string;
  titulo: string;
  fechaPublicacion: string | null;
  /** Fecha de firma/expedición ("Dado en…"), distinta de la publicación. */
  fechaEmision?: string | null;
  urlOriginal?: string;
  estado: EstadoConocimiento;
  relaciones: RelacionNormativa[];
  versiones: VersionNorma[];
  verificacion: Verificacion;
}

/** Artículo o sección citable de una versión concreta. */
export interface Seccion {
  id: string;
  normaId: string;
  versionId: string;
  referencia: string;
  extracto: string;
}

// ───────────── Unidades de conocimiento ─────────────

export interface UnidadConocimiento {
  id: string;
  tema: string;
  tipo: 'NORMA' | 'HECHO' | 'PRACTICA';
  capa: Capa;
  estado: EstadoConocimiento;
  fuenteId: string;
  normaId?: string;
  seccionId?: string;
  /** Solo existe cuando la unidad está ACTIVA. En BORRADOR es null: MUNAY no puede afirmar nada. */
  afirmacion: string | null;
  /** Parámetros numéricos verificados (p. ej. tasa). Solo se usan si la unidad está ACTIVA. */
  parametros?: Record<string, number>;
  /** Qué debe comprobar una persona contra la fuente oficial para activarla. */
  pendiente: string;
  verificacion: Verificacion;
}

// ───────────── Tablas oficiales ─────────────

export interface ValorTabla {
  id: string;
  tablaId: 'TAB-UIT' | 'TAB-TC' | 'TAB-TASAS-HIP' | 'TAB-MIVIV' | 'TAB-BCRP-IDX' | 'TAB-UBIGEO' | 'TAB-ZONIF' | 'TAB-PLAZOS' | 'TAB-MUNI';
  clave: string;
  valor: number;
  unidad: string;
  periodo: string;
  fuenteId: string;
  /** Canal oficial por el que se obtuvo el dato cuando difiere del origen (p. ej. serie SBS publicada en BCRPData). */
  publicadoEn?: string;
  normaId?: string;
  versionId?: string;
  referencia?: string;
  estado: EstadoConocimiento;
  verificacion: Verificacion;
}

// ───────────── Almacén del Core ─────────────

/**
 * Aprobación explícita de la REDACCIÓN de una interpretación o recomendación escrita en una regla.
 * Que la unidad normativa esté ACTIVA no aprueba el texto interpretativo (P1.1).
 */
export interface AprobacionRedaccion {
  reglaId: string;
  aprobadaPor: string;
  fecha: string;
}

export interface CoreStore {
  fuentes: Fuente[];
  normas: Norma[];
  secciones: Seccion[];
  unidades: UnidadConocimiento[];
  tablas: ValorTabla[];
  aprobacionesRedaccion: AprobacionRedaccion[];
}

// ───────────── Respuesta trazable ─────────────

export type Evidencia =
  | {
      tipo: 'norma';
      unidadId: string;
      fuenteId: string;
      normaId: string;
      versionId: string;
      referencia: string;
      extracto: string;
    }
  | { tipo: 'unidad'; unidadId: string; fuenteId: string }
  | {
      tipo: 'tabla';
      valorId: string;
      tablaId: string;
      clave: string;
      periodo: string;
      fuenteId: string;
      normaId?: string;
      versionId?: string;
      referencia?: string;
      extracto?: string | null;
    }
  | { tipo: 'documento_caso'; documentoId: string; campo: string; pagina: number | null; extracto: string | null }
  | { tipo: 'dato_agente'; campo: string; dichoEl: string };

export type GrupoAfirmacion = 'requisito_legal' | 'consecuencia_legal' | 'requisito_habitual' | 'recomendacion' | 'informacion';

export interface Afirmacion {
  texto: string;
  tipo: TipoEpistemico;
  confianza: Confianza;
  grupo: GrupoAfirmacion;
  evidencias: Evidencia[];
  /** Qué hecho del caso activó la regla (aplicación al caso). */
  aplicacion?: string;
  nota?: string;
  /** Solo para textos redactados en reglas (interpretación/recomendación): ¿su redacción está aprobada? */
  redaccion?: 'APROBADA' | 'BORRADOR';
}

export interface Faltante {
  que: string;
  porque: string;
  quien: string;
  documentoTipo?: string;
}

export interface SinRespaldo {
  tema: string;
  motivo: 'unidad_no_activa' | 'norma_no_vigente' | 'vigencia_desconocida' | 'tema_fuera_de_P1' | 'zona_fuera_de_P1' | 'tabla_no_activa';
  referencias: string[];
}

export interface Respuesta {
  consultaId: string;
  asOf: string;
  titular: string;
  afirmaciones: Afirmacion[];
  faltantes: Faltante[];
  sinRespaldo: SinRespaldo[];
  preguntasAlAgente: string[];
  requiereProfesional: { motivos: string[]; preguntas: string[] } | null;
  siguienteAccion: { texto: string; responsable: string; tipo: 'operativa' | 'epistemica' } | null;
  /** Acciones del sistema de conocimiento (no son recomendaciones jurídicas): verificar antes de usar. */
  accionesEpistemicas: { texto: string; referencia: string }[];
  /** Documentos OPCIONALES ausentes: permitirían profundizar, pero no bloquean la respuesta. */
  paraProfundizar: { documento: string; para: string }[];
  tareasReverificacion: string[];
  fueraDeAlcance: boolean;
  violacionesLenguaje: string[];
  auditoria: { unidades: string[]; versiones: string[]; tablas: string[]; documentos: string[] };
}
