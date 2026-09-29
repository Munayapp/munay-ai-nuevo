/**
 * Reglas y consultas P1 (las 10 preguntas aprobadas).
 *
 * Separación NORMA / PRÁCTICA (A4):
 *   - NORMATIVA: su afirmación sale SOLO de unidades NORMA/HECHO en estado ACTIVO. La regla solo redacta
 *     la aplicación al caso o una interpretación, nunca texto legal propio.
 *   - PRACTICA: solo puede producir "requisito habitual" o recomendación, con lenguaje de práctica.
 *   - RECOMENDACION: sugerencia de MUNAY basada en hechos del caso; nunca lenguaje de obligación.
 */
import type { Caso, Ocurrencia, Senal, TipoDocumentoCaso } from './caso.ts';
import { ocurrencias } from './caso.ts';
import { METODOS } from './metodos.ts';
import type { Capa, GrupoAfirmacion, UnidadConocimiento, ValorTabla } from './types.ts';

export interface Requisito {
  campo: string;
  documentoTipo?: TipoDocumentoCaso;
  que: string;
  porque: string;
  quien: string;
}

export interface EvalCtx {
  caso: Caso;
  asOf: string;
  hecho: (campo: string) => Ocurrencia | undefined;
  unidad: (id: string) => UnidadConocimiento;
  tabla: (tablaId: string, clave: string) => ValorTabla;
}

export interface Regla {
  id: string;
  naturaleza: 'NORMATIVA' | 'PRACTICA' | 'RECOMENDACION';
  grupo: GrupoAfirmacion;
  unidades: string[];
  tablas?: (ctx: Pick<EvalCtx, 'asOf'>) => { tablaId: string; clave: string; tema: string }[];
  requiere?: Requisito[];
  /** Documentos que el caso trae; si el documento existe pero falta el campo, se informa. */
  camposEsperados?: { documentoTipo: TipoDocumentoCaso; campos: { campo: string; que: string }[] };
  /** Filtro de contexto (distrito, financiamiento) que se evalúa ANTES de buscar respaldo: si no aplica, la regla no se considera. */
  filtro?: (caso: Caso) => boolean;
  aplica?: (ctx: EvalCtx) => boolean;
  aplicacion?: (ctx: EvalCtx) => string;
  texto?: (ctx: EvalCtx) => string | null;
  nota?: string;
  /** Faltantes que solo se informan cuando la regla aplica con respaldo activo. */
  faltantesAlAplicar?: { documentoTipo: TipoDocumentoCaso; que: string; porque: string; quien: string }[];
  accion?: { texto: string; responsable: string };
}

export type RelevanciaDocumento = 'REQUIRED' | 'OPTIONAL';

export interface Consulta {
  id: string;
  pregunta: string;
  capas: Capa[];
  /**
   * Relevancia de cada documento para ESTA consulta:
   *   REQUIRED → sin él no se puede dar la respuesta pedida (se pide explícitamente).
   *   OPTIONAL → permite profundizar o confirmar; no bloquea ni se exige.
   *   (ausente) → NOT_RELEVANT: nunca se solicita.
   */
  documentos: Partial<Record<TipoDocumentoCaso, RelevanciaDocumento>>;
  reglas: string[];
  temasSinCobertura?: string[];
  /** La consulta usa la capa municipal: solo se responde para los distritos P1 (decisión D3). */
  alcanceMunicipal?: boolean;
  derivacionFija?: { motivo: string; preguntas: string[] };
  senales?: (caso: Caso) => Senal[];
}

// ───────────── utilidades de caso ─────────────

const diasDesde = (fecha: string, asOf: string) => Math.floor((Date.parse(asOf) - Date.parse(fecha)) / 86400000);
const v = (ctx: EvalCtx, campo: string) => ctx.hecho(campo)?.hecho.valor;
const donde = (o?: Ocurrencia) => (o ? `${o.doc.nombre}${o.hecho.pagina ? `, p. ${o.hecho.pagina}` : ''}` : '');
const lista = (s: unknown) => String(s).split(';').map((x) => x.trim()).filter(Boolean);
const usd = (n: number) => `US$ ${Math.round(n).toLocaleString('en-US')}`;
const pen = (n: number) => `S/ ${Math.round(n).toLocaleString('en-US')}`;

const RV = METODOS.rangoValorizacion.parametros;

const REQ_PARTIDA = (campo: string, porque: string): Requisito => ({ campo, documentoTipo: 'copia_literal', que: 'la copia literal de la partida', porque, quien: 'agente (SUNARP)' });

// ───────────── reglas ─────────────

export const REGLAS_P1: Record<string, Regla> = {
  // Q01 — hipoteca
  'R-HIP-PERSECUCION': {
    id: 'R-HIP-PERSECUCION', naturaleza: 'NORMATIVA', grupo: 'consecuencia_legal', unidades: ['U-HIP-PERSECUCION'],
    requiere: [REQ_PARTIDA('hipoteca_vigente', 'para saber si hay una hipoteca inscrita')],
    aplica: (c) => v(c, 'hipoteca_vigente') === true,
    aplicacion: (c) => `La partida registra una hipoteca vigente (${donde(c.hecho('hipoteca_vigente'))}).`,
  },
  'R-HIP-CANCELACION': {
    id: 'R-HIP-CANCELACION', naturaleza: 'NORMATIVA', grupo: 'requisito_legal', unidades: ['U-HIP-CANCELACION'],
    requiere: [REQ_PARTIDA('hipoteca_vigente', 'para saber si hay una hipoteca inscrita')],
    aplica: (c) => v(c, 'hipoteca_vigente') === true,
    texto: () => 'Para que el comprador reciba el inmueble libre de cargas, hay que cancelar la hipoteca e inscribir la cancelación.',
    aplicacion: (c) => `Hipoteca registrada en ${donde(c.hecho('hipoteca_vigente'))}.`,
    accion: { texto: 'Pedir al banco acreedor la carta de levantamiento de la hipoteca.', responsable: 'propietario' },
  },
  'R-HIP-BANCO': {
    id: 'R-HIP-BANCO', naturaleza: 'PRACTICA', grupo: 'requisito_habitual', unidades: ['P-BANCO-LEVANTAMIENTO'],
    filtro: (caso) => caso.contexto.financiamiento === 'credito',
    aplica: (c) => v(c, 'hipoteca_vigente') === true,
  },
  'R-COPIA-RECIENTE': {
    id: 'R-COPIA-RECIENTE', naturaleza: 'PRACTICA', grupo: 'recomendacion', unidades: ['P-COPIA-RECIENTE'],
    requiere: [REQ_PARTIDA('fecha_emision', 'para saber su antigüedad')],
    aplica: (c) => diasDesde(String(v(c, 'fecha_emision')), c.asOf) > (c.unidad('P-COPIA-RECIENTE').parametros?.dias ?? Infinity),
    texto: (c) => `Recomiendo pedir una copia literal actualizada: la del caso tiene ${diasDesde(String(v(c, 'fecha_emision')), c.asOf)} días.`,
  },

  // Q02 — copropiedad y sucesión
  'R-COPROP': {
    id: 'R-COPROP', naturaleza: 'NORMATIVA', grupo: 'requisito_legal', unidades: ['U-COPROP-DISPOSICION'],
    requiere: [REQ_PARTIDA('titulares', 'para saber quiénes son los propietarios')],
    aplica: (c) => lista(v(c, 'titulares')).length > 1,
    texto: (c) => `Deben intervenir todos los titulares registrados: ${lista(v(c, 'titulares')).join(', ')}.`,
    aplicacion: (c) => `Titulares según ${donde(c.hecho('titulares'))}.`,
    accion: { texto: 'Obtener la firma de todos los titulares en la autorización de venta.', responsable: 'agente' },
  },
  'R-SUCESION': {
    id: 'R-SUCESION', naturaleza: 'NORMATIVA', grupo: 'requisito_legal', unidades: ['U-SUCESION-INSCRIPCION'],
    requiere: [REQ_PARTIDA('sucesion_inscrita', 'para saber si la sucesión consta en la partida')],
  },
  'R-AUTORIZACION-FIRMAS': {
    id: 'R-AUTORIZACION-FIRMAS', naturaleza: 'RECOMENDACION', grupo: 'recomendacion', unidades: [],
    requiere: [
      REQ_PARTIDA('titulares', 'para saber quiénes son los propietarios'),
      { campo: 'firmantes', documentoTipo: 'autorizacion_venta', que: 'la autorización de venta', porque: 'para comprobar quiénes firmaron', quien: 'agente' },
    ],
    aplica: (c) => lista(v(c, 'titulares')).some((t) => !lista(v(c, 'firmantes')).includes(t)),
    texto: (c) => `Recomiendo completar la autorización: falta la firma de ${lista(v(c, 'titulares')).filter((t) => !lista(v(c, 'firmantes')).includes(t)).join(', ')}.`,
  },

  // Q03 — precio con reporte Valia (dato del caso, confianza media)
  'R-VALIA-POSICION': {
    id: 'R-VALIA-POSICION', naturaleza: 'RECOMENDACION', grupo: 'recomendacion', unidades: [],
    requiere: [
      { campo: 'precio_m2_promedio_usd', documentoTipo: 'reporte_valia', que: 'el reporte Valia (ACM) de la propiedad', porque: 'para comparar con el mercado', quien: 'agente' },
      { campo: 'precio_usd', documentoTipo: 'autorizacion_venta', que: 'el precio de salida', porque: 'para posicionarlo', quien: 'agente' },
      { campo: 'area_m2', documentoTipo: 'copia_literal', que: 'el área de la propiedad', porque: 'para calcular el precio por m²', quien: 'agente' },
    ],
    texto: (c) => {
      const prom = Number(v(c, 'precio_m2_promedio_usd'));
      const area = Number(v(c, 'area_m2'));
      const precio = Number(v(c, 'precio_usd'));
      const dif = precio / area / prom - 1;
      const pos = Math.abs(dif) <= RV.umbralPosicion ? 'en línea con' : dif > 0 ? `${Math.round(dif * 100)}% sobre` : `${Math.round(-dif * 100)}% bajo`;
      return `El precio está ${pos} el promedio por m² de los comparables del reporte. Rango del método MUNAY: ${usd(prom * area * RV.bandaInferior)}–${usd(prom * area * RV.bandaSuperior)}.`;
    },
    nota: `${METODOS.rangoValorizacion.nombre}: ${METODOS.rangoValorizacion.definicion} Los comparables del reporte son precios de oferta, no de cierre.`,
  },
  'R-VALIA-ANTIGUEDAD': {
    id: 'R-VALIA-ANTIGUEDAD', naturaleza: 'RECOMENDACION', grupo: 'recomendacion', unidades: [],
    requiere: [{ campo: 'fecha_reporte', documentoTipo: 'reporte_valia', que: 'la fecha del reporte Valia', porque: 'para saber su antigüedad', quien: 'agente' }],
    aplica: (c) => diasDesde(String(v(c, 'fecha_reporte')), c.asOf) > METODOS.antiguedadReporte.parametros.dias,
    texto: (c) => `Recomiendo actualizar el reporte Valia: tiene ${diasDesde(String(v(c, 'fecha_reporte')), c.asOf)} días.`,
  },

  // Q04 — impuestos de la venta
  'R-ALCABALA': {
    id: 'R-ALCABALA', naturaleza: 'NORMATIVA', grupo: 'consecuencia_legal', unidades: ['U-ALCABALA'],
    tablas: (c) => [
      { tablaId: 'TAB-UIT', clave: c.asOf.slice(0, 4), tema: `UIT ${c.asOf.slice(0, 4)}` },
      { tablaId: 'TAB-TC', clave: 'USD-PEN', tema: 'Tipo de cambio' },
    ],
    requiere: [{ campo: 'precio_usd', documentoTipo: 'contrato_arras', que: 'el precio pactado (arras o minuta)', porque: 'para calcular la base', quien: 'agente' }],
    texto: (c) => {
      const p = c.unidad('U-ALCABALA').parametros;
      if (!p?.tasa || p.uitInafectas === undefined) return null;
      const uit = c.tabla('TAB-UIT', c.asOf.slice(0, 4)).valor;
      const tc = c.tabla('TAB-TC', 'USD-PEN').valor;
      const base = Math.max(0, Number(v(c, 'precio_usd')) * tc - p.uitInafectas * uit);
      return `Alcabala estimada: ${pen(base * p.tasa)} (base ${pen(base)}).`;
    },
  },
  'R-RENTA-2DA': {
    id: 'R-RENTA-2DA', naturaleza: 'NORMATIVA', grupo: 'consecuencia_legal', unidades: ['U-RENTA-2DA'],
    requiere: [{ campo: 'costo_adquisicion_pen', documentoTipo: 'minuta', que: 'el costo de adquisición del vendedor', porque: 'la ganancia se calcula sobre la diferencia entre precio y costo', quien: 'vendedor' }],
  },

  // Q05 — compra con crédito
  'R-PLAZO-REGISTRAL': { id: 'R-PLAZO-REGISTRAL', naturaleza: 'NORMATIVA', grupo: 'informacion', unidades: ['U-PLAZO-CALIFICACION'] },
  'R-PASOS-CREDITO': {
    id: 'R-PASOS-CREDITO', naturaleza: 'PRACTICA', grupo: 'requisito_habitual', unidades: ['P-PASOS-CREDITO'],
    filtro: (caso) => caso.contexto.financiamiento === 'credito',
    faltantesAlAplicar: [
      { documentoTipo: 'hr_pu', que: 'la declaración de autovalúo (HR/PU)', porque: 'en la práctica el banco suele pedirla para la tasación', quien: 'propietario' },
    ],
  },

  // Q06 — contrato de arras
  'R-ARRAS-TIPO': {
    id: 'R-ARRAS-TIPO', naturaleza: 'NORMATIVA', grupo: 'informacion', unidades: ['U-ARRAS-TIPOS'],
    requiere: [{ campo: 'tipo_arras', documentoTipo: 'contrato_arras', que: 'el tipo de arras del contrato', porque: 'sus efectos dependen del tipo', quien: 'agente' }],
  },
  'R-ARRAS-DATOS': {
    id: 'R-ARRAS-DATOS', naturaleza: 'RECOMENDACION', grupo: 'informacion', unidades: [],
    camposEsperados: {
      documentoTipo: 'contrato_arras',
      campos: [
        { campo: 'partes_identificadas', que: 'la identificación completa de las partes' },
        { campo: 'partida', que: 'el número de partida' },
        { campo: 'plazo_dias', que: 'el plazo para firmar la minuta' },
        { campo: 'monto_arras_usd', que: 'el monto de las arras' },
      ],
    },
  },
  'R-ARRAS-PENALIDADES': {
    id: 'R-ARRAS-PENALIDADES', naturaleza: 'RECOMENDACION', grupo: 'recomendacion', unidades: [],
    requiere: [
      { campo: 'penalidad_comprador', documentoTipo: 'contrato_arras', que: 'la penalidad del comprador', porque: 'para revisar el equilibrio', quien: 'agente' },
      { campo: 'penalidad_vendedor', documentoTipo: 'contrato_arras', que: 'la penalidad del vendedor', porque: 'para revisar el equilibrio', quien: 'agente' },
    ],
    aplica: (c) => String(v(c, 'penalidad_comprador')) !== String(v(c, 'penalidad_vendedor')),
    texto: () => 'Las penalidades son distintas para cada parte. Recomiendo revisarlas con un abogado antes de firmar.',
  },

  // Q07 — poder desde el extranjero
  // La norma sobre el poder se informa sin necesidad del documento; el poder concreto solo permite profundizar.
  'R-PODER': { id: 'R-PODER', naturaleza: 'NORMATIVA', grupo: 'informacion', unidades: ['U-PODER-DISPOSICION'] },
  'R-PODER-DOC': {
    id: 'R-PODER-DOC', naturaleza: 'RECOMENDACION', grupo: 'informacion', unidades: [],
    requiere: [{ campo: 'texto_poder', documentoTipo: 'poder', que: 'el texto del poder', porque: 'para revisar qué facultades otorga', quien: 'propietario' }],
  },

  // Q08 — alquiler
  'R-DESALOJO': { id: 'R-DESALOJO', naturaleza: 'NORMATIVA', grupo: 'requisito_legal', unidades: ['U-DESALOJO-NOTARIAL', 'U-FUA'] },
  'R-DESALOJO-CONTRATO': {
    id: 'R-DESALOJO-CONTRATO', naturaleza: 'NORMATIVA', grupo: 'informacion', unidades: ['U-DESALOJO-NOTARIAL'],
    requiere: [
      { campo: 'forma_contrato', documentoTipo: 'contrato_arrendamiento', que: 'la forma del contrato (FUA o escritura)', porque: 'para compararla con el requisito citado', quien: 'agente' },
      { campo: 'clausula_allanamiento', documentoTipo: 'contrato_arrendamiento', que: 'si el contrato tiene cláusula de allanamiento', porque: 'para compararla con el requisito citado', quien: 'agente' },
    ],
    texto: (c) => `Tu contrato: forma ${v(c, 'forma_contrato')}; cláusula de allanamiento: ${v(c, 'clausula_allanamiento') === true ? 'sí' : 'no'}. Compáralo con el requisito citado.`,
  },
  'R-RENTA-1RA': { id: 'R-RENTA-1RA', naturaleza: 'NORMATIVA', grupo: 'consecuencia_legal', unidades: ['U-RENTA-1RA'] },

  // Q09 — qué se puede construir
  // Una regla por distrito P1: Q09 queda estructuralmente respaldada en los cuatro (decisión D3).
  'R-ZONIF-SURCO': { id: 'R-ZONIF-SURCO', naturaleza: 'NORMATIVA', grupo: 'informacion', unidades: ['U-ZONIF-SURCO'], filtro: (caso) => caso.contexto.distrito === 'Santiago de Surco' },
  'R-ZONIF-MIRAFLORES': { id: 'R-ZONIF-MIRAFLORES', naturaleza: 'NORMATIVA', grupo: 'informacion', unidades: ['U-ZONIF-MIRAFLORES'], filtro: (caso) => caso.contexto.distrito === 'Miraflores' },
  'R-ZONIF-SANISIDRO': { id: 'R-ZONIF-SANISIDRO', naturaleza: 'NORMATIVA', grupo: 'informacion', unidades: ['U-ZONIF-SANISIDRO'], filtro: (caso) => caso.contexto.distrito === 'San Isidro' },
  'R-ZONIF-BARRANCO': { id: 'R-ZONIF-BARRANCO', naturaleza: 'NORMATIVA', grupo: 'informacion', unidades: ['U-ZONIF-BARRANCO'], filtro: (caso) => caso.contexto.distrito === 'Barranco' },
  'R-PARAMETROS': {
    id: 'R-PARAMETROS', naturaleza: 'NORMATIVA', grupo: 'requisito_legal', unidades: ['U-LICENCIA-EDIFICACION'],
    requiere: [{ campo: 'zonificacion', documentoTipo: 'certificado_parametros', que: 'el certificado de parámetros urbanísticos y edificatorios', porque: 'para determinar qué se puede construir', quien: 'propietario (municipalidad)' }],
  },

  // Q10 — cumplimiento LA/FT
  'R-LAFT': { id: 'R-LAFT', naturaleza: 'NORMATIVA', grupo: 'informacion', unidades: ['U-SUJETO-OBLIGADO'] },
};

// ───────────── las 10 consultas P1 ─────────────

export const CONSULTAS_P1: Consulta[] = [
  { id: 'Q01', pregunta: '¿Podemos vender la casa de Los Fresnos si todavía tiene hipoteca?', capas: ['LEGAL', 'PROPERTY', 'OPERATIONS', 'PEOPLE', 'MONEY'], documentos: { copia_literal: 'REQUIRED' }, reglas: ['R-HIP-PERSECUCION', 'R-HIP-CANCELACION', 'R-HIP-BANCO', 'R-COPIA-RECIENTE'] },
  { id: 'Q02', pregunta: 'La casa de Chacarilla es de Mariana y su hermano por herencia. ¿Qué necesito para captarla y venderla?', capas: ['LEGAL', 'PEOPLE', 'PROPERTY', 'OPERATIONS', 'COMPLIANCE'], documentos: { copia_literal: 'REQUIRED', autorizacion_venta: 'OPTIONAL' }, reglas: ['R-COPROP', 'R-SUCESION', 'R-AUTORIZACION-FIRMAS'] },
  { id: 'Q03', pregunta: '¿A cuánto debería salir el depa de Av. Pardo?', capas: ['MARKET', 'GEOGRAPHY', 'PROPERTY', 'PROFESSIONAL'], documentos: { reporte_valia: 'REQUIRED' }, reglas: ['R-VALIA-POSICION', 'R-VALIA-ANTIGUEDAD'] },
  { id: 'Q04', pregunta: 'Si vendemos Berlín en US$ 186K, ¿cuánto paga cada uno en impuestos y cuánto me queda a mí?', capas: ['MONEY', 'LEGAL', 'PEOPLE', 'OPERATIONS'], documentos: { contrato_arras: 'REQUIRED', minuta: 'REQUIRED' }, reglas: ['R-ALCABALA', 'R-RENTA-2DA'],
    temasSinCobertura: ['Comisión neta del agente (se calcula con los datos del agente; no es conocimiento del Core P1)'] },
  { id: 'Q05', pregunta: 'El comprador de Camino Real va con crédito. ¿Qué pasos siguen y cuánto puede demorar?', capas: ['OPERATIONS', 'MONEY', 'LEGAL', 'ECOSYSTEM'], documentos: { hr_pu: 'OPTIONAL' }, reglas: ['R-PLAZO-REGISTRAL', 'R-PASOS-CREDITO'] },
  { id: 'Q06', pregunta: 'Revisa este contrato de arras y dime qué riesgos ves.', capas: ['LEGAL', 'PEOPLE', 'OPERATIONS'], documentos: { contrato_arras: 'REQUIRED' }, reglas: ['R-ARRAS-TIPO', 'R-ARRAS-DATOS', 'R-ARRAS-PENALIDADES'],
    senales: (caso) => {
      const pc = ocurrencias(caso, 'penalidad_comprador')[0]?.hecho.valor;
      const pv = ocurrencias(caso, 'penalidad_vendedor')[0]?.hecho.valor;
      return pc !== undefined && pv !== undefined && String(pc) !== String(pv) ? ['clausula_fuera_de_estandar'] : [];
    } },
  { id: 'Q07', pregunta: 'El dueño de la oficina de Las Begonias vive en España y quiere darle poder a su hermano para firmar. ¿Sirve?', capas: ['LEGAL', 'PEOPLE', 'OPERATIONS'], documentos: { poder: 'OPTIONAL' }, reglas: ['R-PODER', 'R-PODER-DOC'] },
  { id: 'Q08', pregunta: 'Quiero alquilar el loft de Barranco. ¿Cómo hago el contrato para poder recuperar el inmueble rápido si no paga, y qué impuesto paga el dueño?', capas: ['LEGAL', 'MONEY', 'PROPERTY'], documentos: { contrato_arrendamiento: 'OPTIONAL' }, reglas: ['R-DESALOJO', 'R-DESALOJO-CONTRATO', 'R-RENTA-1RA'] },
  { id: 'Q09', pregunta: 'Un inversionista quiere comprar la casa de Chacarilla para tumbarla y hacer departamentos. ¿Qué se puede construir?', capas: ['GEOGRAPHY', 'LEGAL', 'PROPERTY', 'MARKET'], documentos: { certificado_parametros: 'REQUIRED', copia_literal: 'OPTIONAL' }, reglas: ['R-ZONIF-SURCO', 'R-ZONIF-MIRAFLORES', 'R-ZONIF-SANISIDRO', 'R-ZONIF-BARRANCO', 'R-PARAMETROS'], alcanceMunicipal: true,
    derivacionFija: { motivo: 'Proyecto de edificación: requiere un especialista (arquitecto o ingeniero).', preguntas: ['¿Qué edificación permite el lote según los parámetros vigentes y qué licencia corresponde?'] } },
  { id: 'Q10', pregunta: 'Un cliente quiere pagar US$ 300K en efectivo por la casa. ¿Hay algo que deba hacer yo?', capas: ['COMPLIANCE', 'PEOPLE', 'OPERATIONS'], documentos: {}, reglas: ['R-LAFT'],
    temasSinCobertura: ['Medios de pago permitidos en la compraventa (no incluido en P1)'],
    senales: () => ['posible_operacion_sospechosa'] },
];

