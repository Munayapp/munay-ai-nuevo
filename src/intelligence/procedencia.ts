/**
 * PROCEDENCIA (P1.2A — Truth Gate).
 *
 * Toda cifra, afirmación o parámetro que MUNAY muestra o envía a un tercero declara de dónde viene.
 * Regla para contenido que sale a terceros (CREA, WhatsApp, captación, contraofertas, PublicProperty):
 * solo puede afirmar hechos con procedencia CORE_ACTIVE, AGENT_DATA o CASE_DATA — y nunca si son de demostración.
 */
export type SourceType =
  | 'CORE_ACTIVE' // conocimiento ACTIVO del Intelligence Core
  | 'AGENT_DATA' // dato registrado por el agente (CRM: operaciones, clientes, comisión pactada)
  | 'CASE_DATA' // dato de la propiedad / documento del caso
  | 'MUNAY_METHOD' // criterio de trabajo propio de MUNAY (core/metodos.ts)
  | 'SIMULATION_ASSUMPTION' // supuesto declarado de una simulación
  | 'UNVERIFIED' // valor sin respaldo (p. ej. parámetro tributario sin unidad ACTIVA)
  | 'UI_COPY'; // texto de interfaz, sin contenido fáctico

export type VerificationState = 'ACTIVO' | 'VERIFICADO' | 'BORRADOR' | 'NO_VERIFICADO' | 'NO_APLICA';

export interface Procedencia {
  sourceType: SourceType;
  /** Id de la unidad/tabla del Core, del método, del registro del CRM o del parámetro. */
  sourceId: string;
  verificationState: VerificationState;
  /** Etiqueta visible para el agente. */
  label: string;
  /** true si el dato proviene del conjunto de demostración. */
  demo: boolean;
}

export const ETIQUETAS: Record<SourceType, string> = {
  CORE_ACTIVE: 'Respaldado por el Core',
  AGENT_DATA: 'Dato del agente',
  CASE_DATA: 'Dato del caso',
  MUNAY_METHOD: 'Método MUNAY',
  SIMULATION_ASSUMPTION: 'Supuesto de simulación',
  UNVERIFIED: 'No verificado',
  UI_COPY: 'Texto de interfaz',
};

const ESTADO_POR_DEFECTO: Record<SourceType, VerificationState> = {
  CORE_ACTIVE: 'ACTIVO',
  AGENT_DATA: 'NO_APLICA',
  CASE_DATA: 'NO_APLICA',
  MUNAY_METHOD: 'NO_APLICA',
  SIMULATION_ASSUMPTION: 'NO_VERIFICADO',
  UNVERIFIED: 'NO_VERIFICADO',
  UI_COPY: 'NO_APLICA',
};

export function procedencia(sourceType: SourceType, sourceId: string, opts: { demo?: boolean; verificationState?: VerificationState; label?: string } = {}): Procedencia {
  const demo = opts.demo ?? false;
  return {
    sourceType,
    sourceId,
    verificationState: opts.verificationState ?? ESTADO_POR_DEFECTO[sourceType],
    label: `${opts.label ?? ETIQUETAS[sourceType]}${demo ? ' · DEMO' : ''}`,
    demo,
  };
}

/** Un hecho solo puede afirmarse ante un tercero si procede del Core activo, del agente o del caso, y no es demo. */
export const afirmableATerceros = (p: Procedencia) =>
  !p.demo && (p.sourceType === 'AGENT_DATA' || p.sourceType === 'CASE_DATA' || (p.sourceType === 'CORE_ACTIVE' && p.verificationState === 'ACTIVO'));

/**
 * Los datos de mercado (zonas, comparables, lecturas) no tienen fuente conectada: siempre son de demostración.
 * Cambia a false solo cuando exista una fuente de mercado real y trazable.
 */
export const MERCADO_ES_DEMO = true;

export const ETIQUETA_DEMO = 'DEMO';
