/**
 * FIXTURES DE PRUEBA — no son conocimiento.
 * Activan las unidades con textos "[PRUEBA]" y parámetros deliberadamente ficticios
 * (tasa 1%, 1 UIT, 10 días, T.C. 4) para ejercitar el camino ACTIVO del motor.
 * Nada de este archivo se importa desde la app.
 */
import { CORE_P1 } from '../index.ts';
import type { Caso, DocumentoCaso } from '../caso.ts';
import { REGLAS_P1 } from '../consultas.ts';
import type { CoreStore } from '../types.ts';

export const AS_OF = '2026-09-29';

export function coreDePrueba(opts: { verificadaEl?: string; sinAprobarRedaccion?: boolean } = {}): CoreStore {
  const core = structuredClone(CORE_P1);
  // Aprobación simulada de todas las redacciones interpretativas (salvo que el test pida lo contrario).
  if (!opts.sinAprobarRedaccion) core.aprobacionesRedaccion = Object.values(REGLAS_P1).filter((r) => r.texto).map((r) => ({ reglaId: r.id, aprobadaPor: 'test', fecha: AS_OF }));
  const verificacion = { ultimaFecha: opts.verificadaEl ?? '2026-09-01', verificadoPor: 'test', extracto: '[PRUEBA]' };
  core.normas.push({
    id: 'TEST-N', fuenteId: 'SRC-SPIJ', tipo: 'ley', numero: 'Norma de prueba', titulo: '[PRUEBA]', fechaPublicacion: '2020-01-01',
    estado: 'ACTIVO', relaciones: [], versiones: [{ id: 'TEST-V1', vigenteDesde: '2020-01-01', vigenteHasta: null }], verificacion,
  });
  for (const u of core.unidades) {
    u.estado = 'ACTIVO';
    u.afirmacion = `[PRUEBA] ${u.tema}.`;
    u.verificacion = verificacion;
    if (u.tipo !== 'PRACTICA') {
      u.normaId = 'TEST-N';
      u.seccionId = `TEST-S-${u.id}`;
      core.secciones.push({ id: u.seccionId, normaId: 'TEST-N', versionId: 'TEST-V1', referencia: `Art. prueba ${u.id}`, extracto: `[PRUEBA] extracto de ${u.id}` });
    }
  }
  core.unidades.find((u) => u.id === 'U-ALCABALA')!.parametros = { tasa: 0.01, uitInafectas: 1 };
  core.unidades.find((u) => u.id === 'P-COPIA-RECIENTE')!.parametros = { dias: 10 };
  // Aprobación simulada de TAB-UIT (en el Core real sigue VERIFICADO) + un T.C. ficticio.
  core.tablas.find((t) => t.id === 'TAB-UIT-2026')!.estado = 'ACTIVO';
  core.tablas.push({ id: 'TEST-TC', tablaId: 'TAB-TC', clave: 'USD-PEN', valor: 4, unidad: 'PEN/USD', periodo: '2026-09', fuenteId: 'SRC-SBS', estado: 'ACTIVO', verificacion: { ultimaFecha: '2026-09-28', verificadoPor: 'test' } });
  return core;
}

const doc = (d: Partial<DocumentoCaso> & Pick<DocumentoCaso, 'id' | 'tipo' | 'nombre'>): DocumentoCaso => ({
  subidoEl: AS_OF, fechaEmision: null, hechos: [], noEntendido: [], ...d,
});

export const PARTIDA_FRESNOS = doc({
  id: 'DOC-PARTIDA', tipo: 'copia_literal', nombre: 'Copia literal — Los Fresnos', fechaEmision: '2026-08-18',
  hechos: [
    { campo: 'hipoteca_vigente', valor: true, pagina: 4, extracto: 'Asiento D00002: hipoteca a favor de Banco Demo', confirmadoPorAgente: true },
    { campo: 'fecha_emision', valor: '2026-08-18', pagina: 1, extracto: 'Emitido el 18/08/2026', confirmadoPorAgente: true },
    { campo: 'titulares', valor: 'Luis Gutiérrez; Carmen Gutiérrez', pagina: 2, extracto: 'Titulares: Luis y Carmen Gutiérrez', confirmadoPorAgente: true },
    { campo: 'area_m2', valor: 240, pagina: 2, extracto: 'Área: 240 m2', confirmadoPorAgente: true },
  ],
});

export const casos: Record<string, Caso> = {
  Q01: { documentos: [PARTIDA_FRESNOS], contexto: { distrito: 'La Molina', operacion: 'venta', financiamiento: 'credito' } },
  Q02: {
    documentos: [
      doc({ id: 'DOC-PARTIDA-CH', tipo: 'copia_literal', nombre: 'Copia literal — Chacarilla', fechaEmision: '2026-09-20', hechos: [
        { campo: 'titulares', valor: 'Mariana Torres; Pedro Torres', pagina: 2, extracto: 'Titulares: Mariana y Pedro Torres', confirmadoPorAgente: true },
        { campo: 'sucesion_inscrita', valor: false, pagina: 3, extracto: 'No consta sucesión inscrita', confirmadoPorAgente: true },
      ] }),
      doc({ id: 'DOC-AUT', tipo: 'autorizacion_venta', nombre: 'Autorización de venta — Chacarilla', hechos: [
        { campo: 'firmantes', valor: 'Mariana Torres', pagina: 1, extracto: 'Firma: Mariana Torres', confirmadoPorAgente: true },
      ] }),
    ],
    contexto: { distrito: 'Santiago de Surco', operacion: 'venta' },
  },
  Q03: {
    documentos: [
      doc({ id: 'DOC-VALIA', tipo: 'reporte_valia', nombre: 'Valia ACM — Av. Pardo', fechaEmision: '2026-05-01', valia: { producto: 'ACM', generadoPor: 'agente' }, hechos: [
        { campo: 'precio_m2_promedio_usd', valor: 2050, pagina: 3, extracto: 'Promedio: US$ 2,050/m2', confirmadoPorAgente: false },
        { campo: 'fecha_reporte', valor: '2026-05-01', pagina: 1, extracto: 'Fecha: 01/05/2026', confirmadoPorAgente: false },
      ] }),
      doc({ id: 'DOC-AUT-PARDO', tipo: 'autorizacion_venta', nombre: 'Autorización — Av. Pardo', hechos: [
        { campo: 'precio_usd', valor: 225000, pagina: 1, extracto: 'Precio: US$ 225,000', confirmadoPorAgente: true },
        { campo: 'area_m2', valor: 104, pagina: 1, extracto: 'Área: 104 m2', confirmadoPorAgente: true },
      ] }),
    ],
    contexto: { distrito: 'Miraflores', operacion: 'venta' },
  },
  Q04: {
    documentos: [doc({ id: 'DOC-ARRAS-B', tipo: 'contrato_arras', nombre: 'Arras — Berlín', hechos: [
      { campo: 'precio_usd', valor: 186000, pagina: 1, extracto: 'Precio: US$ 186,000', confirmadoPorAgente: true },
    ] })],
    contexto: { distrito: 'Miraflores', operacion: 'venta' },
  },
  Q05: { documentos: [], contexto: { distrito: 'San Isidro', operacion: 'venta', financiamiento: 'credito' } },
  Q06: {
    documentos: [doc({ id: 'DOC-ARRAS', tipo: 'contrato_arras', nombre: 'Arras — Berlín', noEntendido: ['partida'], hechos: [
      { campo: 'tipo_arras', valor: 'confirmatorias', pagina: 1, extracto: 'arras confirmatorias', confirmadoPorAgente: true },
      { campo: 'monto_arras_usd', valor: 10000, pagina: 1, extracto: 'US$ 10,000', confirmadoPorAgente: true },
      { campo: 'plazo_dias', valor: 45, pagina: 2, extracto: '45 días', confirmadoPorAgente: true },
      { campo: 'penalidad_comprador', valor: 'pierde arras', pagina: 3, extracto: 'el comprador pierde las arras', confirmadoPorAgente: true },
      { campo: 'penalidad_vendedor', valor: 'devuelve arras', pagina: 3, extracto: 'el vendedor devuelve las arras', confirmadoPorAgente: true },
    ] })],
    contexto: { distrito: 'Miraflores', operacion: 'venta' },
  },
  Q07: { documentos: [], contexto: { distrito: 'San Isidro', operacion: 'venta', senales: ['poder_otorgado_en_extranjero'] } },
  Q08: {
    documentos: [doc({ id: 'DOC-ALQ', tipo: 'contrato_arrendamiento', nombre: 'Contrato — Loft Barranco', hechos: [
      { campo: 'forma_contrato', valor: 'documento privado', pagina: 1, extracto: 'contrato privado', confirmadoPorAgente: true },
      { campo: 'clausula_allanamiento', valor: false, pagina: null, extracto: null, confirmadoPorAgente: true },
    ] })],
    contexto: { distrito: 'Barranco', operacion: 'alquiler' },
  },
  Q09: { documentos: [PARTIDA_FRESNOS], contexto: { distrito: 'Santiago de Surco', operacion: 'venta' } },
  Q10: { documentos: [], contexto: { distrito: 'San Isidro', operacion: 'venta' } },
};
