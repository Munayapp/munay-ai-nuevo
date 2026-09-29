/**
 * Unidades de conocimiento P1 — las que necesitan las 10 preguntas de prueba.
 *
 * TODAS están en BORRADOR: `afirmacion` es null y `pendiente` describe qué debe comprobar una persona
 * contra la fuente oficial. Mientras no estén ACTIVAS, MUNAY responde "sin respaldo verificado" (J1).
 * Las PRÁCTICAS también esperan aprobación: una práctica nunca se redacta como obligación legal.
 */
import type { Capa, UnidadConocimiento } from './types.ts';

const u = (id: string, tema: string, tipo: UnidadConocimiento['tipo'], capa: Capa, fuenteId: string, normaId: string | undefined, pendiente: string): UnidadConocimiento => ({
  id, tema, tipo, capa, fuenteId, normaId, pendiente,
  estado: 'BORRADOR',
  afirmacion: null,
  verificacion: { ultimaFecha: null, verificadoPor: null },
});

export const UNIDADES_P1: UnidadConocimiento[] = [
  // LEGAL · propiedad y registro
  u('U-HIP-PERSECUCION', 'Efecto de la hipoteca frente a la venta del inmueble', 'NORMA', 'LEGAL', 'SRC-SPIJ', 'N-CC', 'Ubicar en el Código Civil el artículo sobre el derecho de persecución de la hipoteca y registrar su texto literal.'),
  u('U-HIP-CANCELACION', 'Inscripción de la cancelación de hipoteca', 'NORMA', 'LEGAL', 'SRC-SUNARP', 'N-RIRP', 'Confirmar en el RIRP vigente (con Res. 00059-2026-SUNARP/SN) los requisitos para inscribir la cancelación.'),
  u('U-COPROP-DISPOSICION', 'Disposición del bien en copropiedad', 'NORMA', 'LEGAL', 'SRC-SPIJ', 'N-CC', 'Ubicar en el Código Civil el artículo sobre el acuerdo de copropietarios para disponer del bien.'),
  u('U-SUCESION-INSCRIPCION', 'Sucesión y disposición por herederos', 'NORMA', 'LEGAL', 'SRC-SUNARP', 'N-RIRP', 'Confirmar cómo debe constar la sucesión en la partida para que los herederos dispongan del inmueble.'),
  u('U-ARRAS-TIPOS', 'Tipos de arras y sus efectos', 'NORMA', 'LEGAL', 'SRC-SPIJ', 'N-CC', 'Ubicar en el Código Civil los artículos sobre arras confirmatorias y de retractación.'),
  u('U-PODER-DISPOSICION', 'Representación para disponer de un inmueble', 'NORMA', 'LEGAL', 'SRC-SPIJ', 'N-CC', 'Ubicar en el Código Civil la formalidad del poder para disponer de bienes.'),
  u('U-PLAZO-CALIFICACION', 'Plazos de calificación registral', 'NORMA', 'OPERATIONS', 'SRC-SUNARP', 'N-TUO-RGRP', 'Confirmar en el TUO del RGRP vigente los plazos de calificación, reingreso y vigencia del asiento de presentación.'),
  // LEGAL · arrendamiento
  u('U-DESALOJO-NOTARIAL', 'Requisitos del contrato para el desalojo notarial', 'NORMA', 'LEGAL', 'SRC-SPIJ', 'N-LEY-30933', 'Confirmar en la Ley 30933 la forma del contrato (FUA o escritura) y la cláusula exigida.'),
  u('U-FUA', 'Formulario Único de Arrendamiento', 'NORMA', 'LEGAL', 'SRC-SPIJ', 'N-DLEG-1177', 'Confirmar en el D. Leg. 1177 el régimen del FUA.'),
  // MONEY · tributación
  u('U-ALCABALA', 'Alcabala en la compraventa', 'NORMA', 'MONEY', 'SRC-SPIJ', 'N-TUO-LTM',
    'Verificar a mano los arts. 21 (hecho imponible), 23 (sujeto pasivo), 24 (base) y 25 (tasa y tramo inafecto) del TUO aprobado por D.S. 156-2004-EF en la versión actualizada de El Peruano (https://diariooficial.elperuano.pe/Normas/obtenerDocumento?idNorma=29; PDF no legible automáticamente) y las modificaciones posteriores (art. 25: Ley 27963 y siguientes). Registrar tasa y número de UIT como parámetros solo si constan literalmente.'),
  u('U-RENTA-2DA', 'Impuesto a la renta por venta de inmueble de persona natural', 'NORMA', 'MONEY', 'SRC-SUNAT', 'N-TUO-LIR', 'Confirmar tasa, base (ganancia), carácter del pago y excepciones.'),
  u('U-RENTA-1RA', 'Impuesto a la renta por arrendamiento', 'NORMA', 'MONEY', 'SRC-SUNAT', 'N-TUO-LIR', 'Confirmar tasa y criterio de imputación vigente desde 2026.'),
  // GEOGRAPHY / construcción
  u('U-ZONIF-SURCO', 'Ordenanza de zonificación vigente en Santiago de Surco', 'HECHO', 'GEOGRAPHY', 'SRC-IMP', 'N-ZONIF-IMP', 'Confirmar en el IMP las ordenanzas vigentes. Ojo: Surco tiene más de una por sector (la Ord. 1076-MML cubre "un sector del Distrito de Santiago de Surco"); identificar la del resto del distrito.'),
  u('U-ZONIF-MIRAFLORES', 'Ordenanza de zonificación vigente en Miraflores', 'HECHO', 'GEOGRAPHY', 'SRC-IMP', 'N-ORD-920-MML', 'Base: Ord. 920-MML (publicada 30/03/2006, según cita textual de la Ord. 2719 en El Peruano). Inventariar todas las ordenanzas que modifican el plano (al menos Ord. 2719, publicada 06/05/2025) con su fecha de efecto y confirmar el plano vigente en el IMP.'),
  u('U-ZONIF-SANISIDRO', 'Ordenanza de zonificación vigente en San Isidro', 'HECHO', 'GEOGRAPHY', 'SRC-IMP', 'N-ORD-950-MML', 'Base: Ord. 950-MML (fecha de publicación por confirmar en El Peruano). Inventariar modificaciones (al menos Ord. 2157, publicada 14/04/2019; Ord. 1067-MML por confirmar) con su fecha de efecto y confirmar el plano vigente en el IMP.'),
  u('U-ZONIF-BARRANCO', 'Ordenanza de zonificación vigente en Barranco', 'HECHO', 'GEOGRAPHY', 'SRC-IMP', 'N-ORD-1076-MML', 'Base: Ord. 1076 (El Peruano, publicada 08/10/2007; art. 1 aprueba el Plano N° 01 – Anexo N° 01 de Barranco, Surquillo y un sector de Surco). Inventariar modificaciones posteriores y el régimen de la Zona Monumental (parámetros del ex INC ratificados por Ord. 343-MML, por confirmar).'),
  u('U-LICENCIA-EDIFICACION', 'Licencia de edificación y certificado de parámetros', 'NORMA', 'LEGAL', 'SRC-MVCS', 'N-TUO-29090', 'Confirmar en el TUO de la Ley 29090 el rol del certificado de parámetros en la licencia.'),
  // COMPLIANCE
  u('U-SUJETO-OBLIGADO', 'El agente inmobiliario como sujeto obligado ante la UIF', 'NORMA', 'COMPLIANCE', 'SRC-SBS', 'N-SBS-789-2018', 'Confirmar la versión vigente de la Res. SBS 789-2018 y las obligaciones del agente.'),
  // PRÁCTICAS (aprobación del agente/usuario pendiente; nunca obligación legal)
  u('P-COPIA-RECIENTE', 'Antigüedad habitual de la copia literal en notaría', 'PRACTICA', 'PROFESSIONAL', 'SRC-AGENTE', undefined, 'Confirmar con las notarías de trabajo habitual qué antigüedad suelen aceptar (registrar días como parámetro).'),
  u('P-BANCO-LEVANTAMIENTO', 'Levantamiento de hipoteca antes del desembolso', 'PRACTICA', 'PROFESSIONAL', 'SRC-AGENTE', undefined, 'Confirmar con la experiencia del agente la práctica habitual de los bancos del comprador.'),
  u('P-PASOS-CREDITO', 'Pasos habituales de una compra con crédito hipotecario', 'PRACTICA', 'PROFESSIONAL', 'SRC-AGENTE', undefined, 'Redactar y aprobar la secuencia habitual (tasación, aprobación, desembolso) sin plazos legales.'),
];
