/**
 * Registro de fuentes P1 (especificación aprobada, sección A).
 * Solo metadatos de acceso: aquí no hay conocimiento. Las URLs son las identificadas en la investigación;
 * donde no se identificó una URL oficial, se deja vacía en lugar de suponerla.
 */
import type { Fuente } from './types.ts';

const SEMANA = 7;
const TRIMESTRE_REVISION = 90;
const ANUAL = 365;

export const FUENTES_P1: Fuente[] = [
  { id: 'SRC-PERUANO', nombre: 'Diario Oficial El Peruano — Normas Legales', entidad: 'Editora Perú', tipo: 'oficial', nivelAutoridad: 1, url: 'https://busquedas.elperuano.pe', acceso: 'libre', restricciones: ['Sin API pública conocida'], ventanaVerificacionDias: SEMANA },
  { id: 'SRC-SPIJ', nombre: 'Sistema Peruano de Información Jurídica', entidad: 'MINJUS', tipo: 'oficial', nivelAutoridad: 2, url: 'https://spij.minjus.gob.pe', acceso: 'libre', restricciones: ['Texto consolidado: confirmar vigencia contra El Peruano'], ventanaVerificacionDias: TRIMESTRE_REVISION },
  { id: 'SRC-SUNARP', nombre: 'SUNARP — reglamentos, directivas y servicios', entidad: 'SUNARP', tipo: 'oficial', nivelAutoridad: 1, url: 'https://www.sunarp.gob.pe', acceso: 'pago_por_caso', restricciones: ['Sin acceso directo para MUNAY: el agente consulta o sube el documento', 'Interoperabilidad solo para entidades públicas por convenio'], ventanaVerificacionDias: TRIMESTRE_REVISION },
  { id: 'SRC-TR', nombre: 'Tribunal Registral — precedentes de observancia obligatoria', entidad: 'SUNARP', tipo: 'oficial', nivelAutoridad: 1, url: 'https://www.sunarp.gob.pe/busqueda_prec/index.asp', acceso: 'libre', restricciones: [], ventanaVerificacionDias: TRIMESTRE_REVISION },
  { id: 'SRC-SUNAT', nombre: 'SUNAT — normas y orientación', entidad: 'SUNAT', tipo: 'oficial', nivelAutoridad: 1, url: 'https://www.sunat.gob.pe', acceso: 'libre', restricciones: ['Las guías orientan; la norma manda'], ventanaVerificacionDias: TRIMESTRE_REVISION },
  { id: 'SRC-MEF', nombre: 'Ministerio de Economía y Finanzas', entidad: 'MEF', tipo: 'oficial', nivelAutoridad: 1, url: 'https://www.gob.pe/mef', acceso: 'libre', restricciones: [], ventanaVerificacionDias: ANUAL },
  { id: 'SRC-MVCS', nombre: 'Ministerio de Vivienda, Construcción y Saneamiento', entidad: 'MVCS', tipo: 'oficial', nivelAutoridad: 1, url: 'https://www.gob.pe/vivienda', acceso: 'libre', restricciones: [], ventanaVerificacionDias: TRIMESTRE_REVISION },
  { id: 'SRC-SBS', nombre: 'SBS / UIF-Perú', entidad: 'SBS', tipo: 'oficial', nivelAutoridad: 1, url: 'https://www.sbs.gob.pe', acceso: 'libre', restricciones: ['Tasas publicadas en tablas web; sin API documentada'], ventanaVerificacionDias: SEMANA },
  { id: 'SRC-BCRP', nombre: 'BCRP — BCRPData', entidad: 'BCRP', tipo: 'oficial', nivelAutoridad: 1, url: 'https://estadisticas.bcrp.gob.pe', acceso: 'libre', restricciones: ['Índice basado en precios de oferta (Urbania), no de cierre'], ventanaVerificacionDias: 92 },
  { id: 'SRC-MIVIV', nombre: 'Fondo MIVIVIENDA', entidad: 'Fondo MIVIVIENDA S.A.', tipo: 'oficial', nivelAutoridad: 1, url: 'https://www.mivivienda.com.pe', acceso: 'libre', restricciones: ['Rangos y bonos cambian varias veces al año'], ventanaVerificacionDias: 30 },
  { id: 'SRC-INEI', nombre: 'INEI — UBIGEO (Datos Abiertos)', entidad: 'INEI', tipo: 'oficial', nivelAutoridad: 1, url: 'https://www.datosabiertos.gob.pe', acceso: 'libre', restricciones: ['Códigos INEI y RENIEC no son totalmente equivalentes'], ventanaVerificacionDias: ANUAL },
  { id: 'SRC-RENIEC', nombre: 'Equivalencias UBIGEO INEI–RENIEC', entidad: 'Plataforma Nacional de Datos Abiertos', tipo: 'oficial', nivelAutoridad: 1, url: 'https://datosabiertos.gob.pe/dataset/codigos-equivalentes-de-ubigeo-del-peru', acceso: 'libre', restricciones: [], ventanaVerificacionDias: ANUAL },
  { id: 'SRC-IMP', nombre: 'Instituto Metropolitano de Planificación — zonificación', entidad: 'Municipalidad Metropolitana de Lima', tipo: 'oficial', nivelAutoridad: 1, url: 'https://portal.imp.gob.pe/planos-de-zonificacion/', acceso: 'libre', restricciones: ['Solo Lima Metropolitana'], ventanaVerificacionDias: 180 },
  { id: 'SRC-MUNI-MIR', nombre: 'Municipalidad de Miraflores', entidad: 'Municipalidad Distrital de Miraflores', tipo: 'oficial', nivelAutoridad: 1, url: 'https://www.miraflores.gob.pe', acceso: 'libre', restricciones: [], ventanaVerificacionDias: ANUAL },
  { id: 'SRC-MUNI-SI', nombre: 'Municipalidad de San Isidro', entidad: 'Municipalidad Distrital de San Isidro', tipo: 'oficial', nivelAutoridad: 1, acceso: 'libre', restricciones: ['URL oficial por confirmar'], ventanaVerificacionDias: ANUAL },
  { id: 'SRC-MUNI-BAR', nombre: 'Municipalidad de Barranco', entidad: 'Municipalidad Distrital de Barranco', tipo: 'oficial', nivelAutoridad: 1, acceso: 'libre', restricciones: ['URL oficial por confirmar'], ventanaVerificacionDias: ANUAL },
  { id: 'SRC-MUNI-SUR', nombre: 'Municipalidad de Santiago de Surco', entidad: 'Municipalidad Distrital de Santiago de Surco', tipo: 'oficial', nivelAutoridad: 1, acceso: 'libre', restricciones: ['URL oficial por confirmar'], ventanaVerificacionDias: ANUAL },
  { id: 'SRC-CAPECO', nombre: 'CAPECO — resúmenes públicos', entidad: 'Cámara Peruana de la Construcción', tipo: 'institucional', nivelAutoridad: 3, acceso: 'libre', restricciones: ['Estudio completo posiblemente de pago'], ventanaVerificacionDias: ANUAL },
  { id: 'SRC-ANPD', nombre: 'Autoridad Nacional de Protección de Datos Personales', entidad: 'MINJUS', tipo: 'oficial', nivelAutoridad: 1, acceso: 'libre', restricciones: [], ventanaVerificacionDias: TRIMESTRE_REVISION },
  { id: 'SRC-VALIA-CASO', nombre: 'Reporte Valia generado por el agente', entidad: 'Valia (vía el agente)', tipo: 'comercial', nivelAutoridad: 4, acceso: 'documento_del_agente', restricciones: ['Solo como documento del caso', 'Sin API ni contacto (decisión D1)', 'No reutilizar fuera del caso ni para otro agente'], ventanaVerificacionDias: 90 },
  { id: 'SRC-AGENTE', nombre: 'El agente', entidad: 'Agente', tipo: 'agente', nivelAutoridad: 5, acceso: 'documento_del_agente', restricciones: [], ventanaVerificacionDias: 0 },
];
