/**
 * MÉTODOS PROPIOS DE MUNAY — fuente única (P1.2A).
 *
 * No son conocimiento externo (ni norma, ni dato de mercado): son criterios de trabajo de MUNAY.
 * Todo el producto los consume desde aquí; ninguna otra parte debe redefinir estos parámetros.
 * Procedencia: MUNAY_METHOD. Nunca se presentan como hecho externo.
 */
export interface MetodoMunay {
  id: string;
  nombre: string;
  definicion: string;
  parametros: Record<string, number>;
}

const m = <P extends Record<string, number>>(id: string, nombre: string, definicion: string, parametros: P) => ({ id, nombre, definicion, parametros });

export const METODOS = {
  comparables: m('M-COMPARABLES', 'Selección de comparables', 'Comparables de la misma zona con área dentro de ±25% de la propiedad, ordenados por cercanía.', { toleranciaArea: 0.25 }),
  rangoValorizacion: m(
    'M-RANGO-VALORIZACION',
    'Rango de valorización MUNAY',
    'Promedio de US$/m² de los comparables × área de la propiedad, con banda −3% / +2%. La posición es "sobre" o "bajo" si el precio por m² se aparta más de ±2.5% del promedio.',
    { bandaInferior: 0.97, bandaSuperior: 1.02, umbralPosicion: 0.025 },
  ),
  antiguedadReporte: m('M-ANTIGUEDAD-REPORTE', 'Antigüedad de un reporte de mercado', 'MUNAY sugiere actualizar un reporte de comparables con más de 90 días.', { dias: 90 }),
  pulseSeguimiento: m('M-PULSE-SEGUIMIENTO', 'Cliente sin seguimiento', 'Señal si un comprador o inversionista con probabilidad ≥60% lleva ≥5 días sin contacto.', { diasSinContacto: 5, probabilidadMinima: 0.6 }),
  pulseBajaActividad: m('M-PULSE-BAJA-ACTIVIDAD', 'Propiedad con baja actividad', 'Señal si una propiedad activa lleva >40 días publicada y convierte <4% de sus vistas en consultas.', { diasPublicada: 40, conversionMinima: 0.04 }),
  pulsePropuesta: m('M-PULSE-PROPUESTA', 'Propuesta sin respuesta', 'Señal si una propuesta de captación lleva ≥3 días sin respuesta.', { diasSinRespuesta: 3 }),
  holguraPresupuesto: m('M-HOLGURA-PRESUPUESTO', 'Holgura de presupuesto', 'Una propiedad "encaja" si su precio no supera el presupuesto máximo del cliente en más de 5%.', { holgura: 0.05 }),
  riesgoOportunidad: m('M-RIESGO-OPORTUNIDAD', 'Puntaje de riesgo de oportunidad', 'Suma 1 punto por: precio sobre el rango MUNAY, demanda baja, más de 70 días de venta en la zona. 0 = bajo, 1 = medio, 2+ = alto.', { diasVentaLentos: 70 }),
  escenarioPuntoMedio: m('M-ESCENARIO-PUNTO-MEDIO', 'Escenario de punto medio', 'Escenario de negociación a 1.5% bajo el precio acordado.', { descuento: 0.015 }),
} satisfies Record<string, MetodoMunay>;
