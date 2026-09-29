/**
 * DOCUMENTOS DEL CASO y CONTEXTO — separados del Core.
 * Un documento del caso aporta hechos con ubicación (página + extracto). Nunca modifica el Core.
 */

export type TipoDocumentoCaso =
  | 'copia_literal'
  | 'contrato_arras'
  | 'minuta'
  | 'autorizacion_venta'
  | 'certificado_parametros'
  | 'hr_pu'
  | 'no_adeudo_arbitrios'
  | 'poder'
  | 'contrato_arrendamiento'
  | 'reporte_valia';

export const NOMBRE_DOCUMENTO: Record<TipoDocumentoCaso, string> = {
  copia_literal: 'Copia literal / certificado de la partida',
  contrato_arras: 'Contrato de arras',
  minuta: 'Minuta o escritura',
  autorizacion_venta: 'Autorización de venta',
  certificado_parametros: 'Certificado de parámetros urbanísticos y edificatorios',
  hr_pu: 'Declaración jurada de autovalúo (HR/PU)',
  no_adeudo_arbitrios: 'Certificado de no adeudo de arbitrios',
  poder: 'Poder / vigencia de poder',
  contrato_arrendamiento: 'Contrato de arrendamiento / FUA',
  reporte_valia: 'Reporte Valia (ACM / AOM / AVM)',
};

export interface HechoCaso {
  campo: string;
  valor: string | number | boolean;
  pagina: number | null;
  extracto: string | null;
  confirmadoPorAgente: boolean;
}

export interface DocumentoCaso {
  id: string;
  tipo: TipoDocumentoCaso;
  nombre: string;
  subidoEl: string;
  fechaEmision: string | null;
  /** Solo para reportes Valia: tercero cuyo dato entra como DATO DEL CASO (decisión D1). */
  valia?: { producto: 'ACM' | 'AOM' | 'AVM'; generadoPor: 'agente' };
  hechos: HechoCaso[];
  /** Lo que MUNAY no pudo interpretar: se señala, nunca se inventa. */
  noEntendido: string[];
}

export interface DatoAgente {
  campo: string;
  valor: string | number | boolean;
  dichoEl: string;
}

/** Señales que activan REQUIERE PROFESIONAL (lista fija P1, sección J). */
export type Senal =
  | 'litigio_o_embargo'
  | 'sucesion_no_inscrita'
  | 'sucesion_intestada_o_masa_indivisa'
  | 'prescripcion_adquisitiva'
  | 'poder_otorgado_en_extranjero'
  | 'observacion_o_tacha_registral'
  | 'exoneracion_tributaria'
  | 'clausula_fuera_de_estandar'
  | 'posible_operacion_sospechosa';

export interface ContextoCaso {
  distrito?: string;
  operacion?: 'venta' | 'alquiler';
  financiamiento?: 'credito' | 'contado';
  senales?: Senal[];
  datosAgente?: DatoAgente[];
}

export interface Caso {
  documentos: DocumentoCaso[];
  contexto: ContextoCaso;
}

/** Campos que deben tener un único valor en todo el caso: si difieren entre documentos, hay contradicción (J5). */
export const CAMPOS_UNICOS = ['partida', 'area_m2', 'titulares', 'precio_usd'];

export interface Ocurrencia {
  doc: DocumentoCaso;
  hecho: HechoCaso;
}

export const ocurrencias = (caso: Caso, campo: string): Ocurrencia[] =>
  caso.documentos.flatMap((doc) => doc.hechos.filter((h) => h.campo === campo).map((hecho) => ({ doc, hecho })));

export function contradicciones(caso: Caso): { campo: string; ocurrencias: Ocurrencia[] }[] {
  return CAMPOS_UNICOS.flatMap((campo) => {
    const oc = ocurrencias(caso, campo);
    const distintos = new Set(oc.map((o) => String(o.hecho.valor)));
    return distintos.size > 1 ? [{ campo, ocurrencias: oc }] : [];
  });
}

/** Dato del agente que contradice un hecho del caso (J6): prevalece el documento y se pregunta al agente. */
export function conflictosConAgente(caso: Caso): { campo: string; agente: DatoAgente; documento: Ocurrencia }[] {
  const out: { campo: string; agente: DatoAgente; documento: Ocurrencia }[] = [];
  for (const d of caso.contexto.datosAgente ?? []) {
    const doc = ocurrencias(caso, d.campo)[0];
    if (doc && String(doc.hecho.valor) !== String(d.valor)) out.push({ campo: d.campo, agente: d, documento: doc });
  }
  return out;
}
