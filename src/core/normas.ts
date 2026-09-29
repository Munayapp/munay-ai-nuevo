/**
 * Registro de normas P1.
 *
 * Todo lo identificado en la investigación entra como BORRADOR (regla A1): los números, fechas y
 * relaciones que aquí figuran provienen de fuentes secundarias y NO son conocimiento activo.
 * Una norma solo pasa a VERIFICADO cuando se comprueba contra El Peruano/SPIJ/la entidad, con extracto.
 */
import type { Norma, Seccion, Verificacion } from './types.ts';

const SIN_VERIFICAR: Verificacion = { ultimaFecha: null, verificadoPor: null };

const borrador = (n: Omit<Norma, 'estado' | 'verificacion' | 'relaciones' | 'versiones'> & Partial<Pick<Norma, 'relaciones' | 'versiones'>>): Norma => ({
  relaciones: [],
  versiones: [],
  ...n,
  estado: 'BORRADOR',
  verificacion: SIN_VERIFICAR,
});

export const NORMAS_P1: Norma[] = [
  // ── ACTIVA: verificada contra El Peruano y aprobada por el usuario (HP-001) ──
  {
    id: 'N-DS-301-2025-EF',
    fuenteId: 'SRC-MEF',
    tipo: 'decreto_supremo',
    numero: 'D.S. 301-2025-EF',
    titulo: 'Decreto Supremo que aprueba el valor de la Unidad Impositiva Tributaria durante el año 2026',
    // Resuelto contra El Peruano (29/09/2026): "Fecha de publicación: 17/12/2025".
    // El 16/12/2025 es la fecha de firma ("Dado en la Casa de Gobierno… a los dieciséis días…").
    fechaPublicacion: '2025-12-17',
    fechaEmision: '2025-12-16',
    urlOriginal: 'https://busquedas.elperuano.pe/dispositivo/NL/2469116-1',
    estado: 'ACTIVO',
    relaciones: [],
    // Periodo de aplicación del valor tomado del art. 1 verificado: "Durante el año 2026…".
    // El dispositivo no contiene un artículo propio de entrada en vigencia.
    versiones: [{ id: 'V-DS-301-2025-EF-1', vigenteDesde: '2026-01-01', vigenteHasta: '2026-12-31' }],
    verificacion: {
      ultimaFecha: '2026-09-29',
      verificadoPor: 'Claude (verificación asistida contra El Peruano, 29/09/2026) · aprobado por el usuario (29/09/2026)',
      url: 'https://busquedas.elperuano.pe/dispositivo/NL/2469116-1',
      extracto:
        'Durante el año 2026, el valor de la Unidad Impositiva Tributaria (UIT) como índice de referencia en normas tributarias será de S/ 5 500,00 (Cinco Mil Quinientos y 00/100 Soles).',
    },
  },

  // ── BORRADOR: identificadas en la investigación, pendientes de verificación ──
  borrador({ id: 'N-CC', fuenteId: 'SRC-SPIJ', tipo: 'codigo', numero: 'D. Leg. 295', titulo: 'Código Civil', fechaPublicacion: null }),
  borrador({
    id: 'N-RIRP', fuenteId: 'SRC-SUNARP', tipo: 'reglamento', numero: 'Res. 097-2013-SUNARP-SN',
    titulo: 'Reglamento de Inscripciones del Registro de Predios', fechaPublicacion: null,
    relaciones: [{ tipo: 'MODIFICA', porDocumento: 'Res. 00059-2026-SUNARP/SN', desde: '2026-05-08' }],
  }),
  borrador({
    id: 'N-TUO-RGRP', fuenteId: 'SRC-SUNARP', tipo: 'reglamento', numero: 'Res. 126-2012-SUNARP-SN',
    titulo: 'TUO del Reglamento General de los Registros Públicos', fechaPublicacion: null,
    relaciones: [{ tipo: 'MODIFICA', porDocumento: 'Res. 00090-2025-SUNARP/SN', desde: null }],
  }),
  borrador({ id: 'N-TUO-LTM', fuenteId: 'SRC-SPIJ', tipo: 'decreto_supremo', numero: 'TUO Ley de Tributación Municipal (número del D.S. por verificar)', titulo: 'TUO de la Ley de Tributación Municipal', fechaPublicacion: null }),
  borrador({ id: 'N-TUO-LIR', fuenteId: 'SRC-SPIJ', tipo: 'decreto_supremo', numero: 'TUO Ley del Impuesto a la Renta (número por verificar)', titulo: 'TUO de la Ley del Impuesto a la Renta', fechaPublicacion: null }),
  borrador({
    id: 'N-TUO-29090', fuenteId: 'SRC-MVCS', tipo: 'decreto_supremo', numero: 'D.S. 006-2017-VIVIENDA',
    titulo: 'TUO de la Ley 29090, de regulación de habilitaciones urbanas y de edificaciones', fechaPublicacion: null,
    relaciones: [{ tipo: 'MODIFICA', porDocumento: 'D. Leg. 1675', desde: null }],
  }),
  borrador({ id: 'N-LEY-27157', fuenteId: 'SRC-SPIJ', tipo: 'ley', numero: 'Ley 27157', titulo: 'Ley de regularización de edificaciones y régimen de unidades inmobiliarias de propiedad exclusiva y común', fechaPublicacion: null }),
  borrador({ id: 'N-LEY-30933', fuenteId: 'SRC-SPIJ', tipo: 'ley', numero: 'Ley 30933', titulo: 'Ley que regula el procedimiento especial de desalojo con intervención notarial', fechaPublicacion: null }),
  borrador({ id: 'N-DLEG-1177', fuenteId: 'SRC-SPIJ', tipo: 'decreto_legislativo', numero: 'D. Leg. 1177', titulo: 'Régimen de promoción del arrendamiento para vivienda', fechaPublicacion: null }),
  borrador({ id: 'N-LEY-29080', fuenteId: 'SRC-MVCS', tipo: 'ley', numero: 'Ley 29080', titulo: 'Ley de creación del Registro del Agente Inmobiliario', fechaPublicacion: null }),
  borrador({ id: 'N-LEY-29733', fuenteId: 'SRC-ANPD', tipo: 'ley', numero: 'Ley 29733', titulo: 'Ley de Protección de Datos Personales', fechaPublicacion: null }),
  borrador({ id: 'N-SBS-789-2018', fuenteId: 'SRC-SBS', tipo: 'resolucion', numero: 'Res. SBS 789-2018', titulo: 'Norma para la prevención del LA/FT aplicable a sujetos obligados supervisados por la UIF-Perú', fechaPublicacion: null }),
  borrador({ id: 'N-ZONIF-IMP', fuenteId: 'SRC-IMP', tipo: 'ordenanza', numero: 'Ordenanzas de zonificación (por identificar)', titulo: 'Zonificación de los usos del suelo de Lima Metropolitana', fechaPublicacion: null }),

  // ── Zonificación municipal P1 (BORRADOR). Datos localizados en El Peruano el 29/09/2026; falta
  //    completar la cadena de modificaciones y su vigencia antes de verificar. Relaciones sin fecha de
  //    efecto registrada → el estado jurídico queda DESCONOCIDO hasta confirmarla (no se supone). ──
  borrador({
    id: 'N-ORD-920-MML', fuenteId: 'SRC-IMP', tipo: 'ordenanza', numero: 'Ordenanza N° 920-MML',
    titulo: 'Reajuste integral de la zonificación de los usos del suelo — Miraflores',
    // "aprobado mediante Ordenanza Nº 920, publicada el 30 de marzo de 2006 en el diario oficial El Peruano"
    // (cita textual en la Ord. 2719, El Peruano, publicada 06/05/2025).
    fechaPublicacion: '2006-03-30',
    relaciones: [{ tipo: 'MODIFICA', porDocumento: 'Ordenanza N° 2719 (publicada 06/05/2025) y otras por inventariar', desde: null }],
  }),
  borrador({
    id: 'N-ORD-950-MML', fuenteId: 'SRC-IMP', tipo: 'ordenanza', numero: 'Ordenanza N° 950-MML',
    titulo: 'Reajuste integral de la zonificación de los usos del suelo — San Isidro (y un sector de Magdalena del Mar)',
    fechaPublicacion: null, // 17/06/2006 según fuente secundaria; confirmar en El Peruano
    relaciones: [{ tipo: 'MODIFICA', porDocumento: 'Ordenanza N° 2157 (publicada 14/04/2019), Ord. 1067-MML (secundaria) y otras por inventariar', desde: null }],
  }),
  borrador({
    id: 'N-ORD-1076-MML', fuenteId: 'SRC-IMP', tipo: 'ordenanza', numero: 'Ordenanza N° 1076',
    titulo: 'Aprueban reajuste integral de la zonificación de los usos del suelo de los distritos de Barranco y Surquillo y de sectores de los distritos de Chorrillos y Santiago de Surco que son parte de Áreas de Tratamiento Normativo I y II de Lima Metropolitana',
    fechaPublicacion: '2007-10-08', // "Fecha de publicación: 08/10/2007" (El Peruano)
    urlOriginal: 'https://busquedas.elperuano.pe/dispositivo/NL/117739-1',
    relaciones: [{ tipo: 'MODIFICA', porDocumento: 'Modificaciones posteriores por inventariar', desde: null }],
  }),
];

/** Secciones citables. Solo contienen extractos literales verificados. */
export const SECCIONES_P1: Seccion[] = [
  {
    id: 'S-DS-301-2025-EF-ART1',
    normaId: 'N-DS-301-2025-EF',
    versionId: 'V-DS-301-2025-EF-1',
    referencia: 'Artículo 1',
    extracto: 'Durante el año 2026, el valor de la Unidad Impositiva Tributaria (UIT) como índice de referencia en normas tributarias será de S/ 5 500,00 (Cinco Mil Quinientos y 00/100 Soles).',
  },
];
