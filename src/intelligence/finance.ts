/**
 * MONEY. Regla: primero "te quedan aproximadamente…", después "así se calcula".
 *
 * P1.1 — Blindaje: cada parámetro está registrado en finanzasParametros.ts con su origen y su respaldo en el Core.
 * Ningún cálculo que dependa de parámetros sin respaldo ACTIVO se presenta como dato normativo confirmado:
 *   - alcabala: BLOQUEADA hasta que U-ALCABALA y TAB-TC estén ACTIVOS (se calcula solo con valores del Core);
 *   - comisión y cuota: se conservan, etiquetadas como estimado/simulación NO VERIFICADA;
 *   - rentabilidad: aritmética sobre el alquiler dado; sin tasa tributaria no verificada en la nota.
 * Los valores de FIN no se cambian aquí (en particular, 3.75 NO se reemplaza por el T.C. de TAB-TC).
 *
 * P1.2A — Fuente única: FIN no contiene cifras; las lee del registro PARAMETROS_FINANZAS.
 * Regla de cálculo: RESPALDADO solo si todos los parámetros requeridos están ACTIVOS (evaluarCalculo).
 */
import { uitDelAnio } from '../core/tablas.ts';
import type { Agent, Operation, Property } from '../data/types';
import { pct, pen, usd } from '../lib/format.ts';
import { estadoParametro, evaluarAlcabala, evaluarCalculo, valorParametro } from './finanzasParametros.ts';

// Valores leídos del registro (fuente única). Ninguno se escribe aquí.
export const FIN = {
  exchange: valorParametro('tc.usd_pen'), // sin respaldo ACTIVO (TAB-TC pendiente de aprobación y de decisión serie/fecha)
  retention4ta: valorParametro('renta4ta.retencion'), // sin respaldo en el Core
  mortgageTEA: valorParametro('hipoteca.tea'), // sin respaldo (tasas SBS no activas)
  mortgageYears: valorParametro('hipoteca.plazo'), // supuesto de simulación
  downPayment: valorParametro('hipoteca.inicial'), // supuesto de simulación
};

/** Parámetros requeridos por cada cálculo. */
export const REQUIERE = {
  comision: ['renta4ta.retencion', 'tc.usd_pen'],
  hipoteca: ['hipoteca.tea', 'tc.usd_pen'],
} as const;

export interface Breakdown {
  headline: string;
  value: string;
  lines: [string, string][];
  note: string;
  /** Estado epistemológico del cálculo (P1.1). */
  verificacion?: 'RESPALDADO' | 'NO_VERIFICADO' | 'BLOQUEADO';
}

const marca = (id: string) => (estadoParametro(id).respaldado ? '' : ' · sin respaldo');

export function commission(op: Operation, agent: Agent, prop?: Property): Breakdown {
  const gross = op.priceUSD * op.commissionRate;
  const agency = gross * agent.agencySplit;
  const share = gross - agency;
  const tax = share * FIN.retention4ta;
  const netUSD = share - tax;
  const netPEN = netUSD * FIN.exchange;
  const pendientes = evaluarCalculo([...REQUIERE.comision]).sinRespaldo;
  return {
    headline: `${pendientes.length ? 'Estimado no verificado: te quedarían' : 'Te quedan'} aproximadamente ${pen(netPEN)}${prop ? ` de ${prop.type.toLowerCase()} en ${prop.district}` : ''}.`,
    value: pen(netPEN),
    lines: [
      ['Precio de venta', usd(op.priceUSD)],
      [`Comisión ${pct(op.commissionRate)} (tu dato)`, usd(gross)],
      [`Agencia (${pct(agent.agencySplit)}, tu dato)`, `− ${usd(agency)}`],
      [`Retención 4ta categoría (${pct(FIN.retention4ta)}${marca('renta4ta.retencion')})`, `− ${usd(tax)}`],
      ['Neto para ti', usd(netUSD)],
      [`En soles (T.C. ${FIN.exchange}${marca('tc.usd_pen')})`, pen(netPEN)],
    ],
    note: pendientes.length
      ? 'Cálculo no verificado: la retención de cuarta categoría y el tipo de cambio usados no tienen respaldo activo en el Core. El tratamiento del IGV tampoco está verificado.'
      : 'Parámetros respaldados por el Core.',
    verificacion: pendientes.length ? 'NO_VERIFICADO' : 'RESPALDADO',
  };
}

/** Suma interna para vistas agregadas. Usa los mismos parámetros NO verificados que commission(). */
export function netCommissionPEN(op: Operation, agent: Agent) {
  return op.priceUSD * op.commissionRate * (1 - agent.agencySplit) * (1 - FIN.retention4ta) * FIN.exchange;
}

/**
 * Estado de cualquier cifra agregada de comisión neta (Negocio, Perfil, Coach, Resolver, escenarios).
 * Toda vista que muestre netCommissionPEN debe mostrar también esta etiqueta si no está RESPALDADO.
 */
export function netCommissionStatus() {
  const ev = evaluarCalculo([...REQUIERE.comision]);
  return { estado: ev.estado, etiqueta: ev.estado === 'RESPALDADO' ? '' : 'estimado no verificado' };
}

export function mortgage(priceUSD: number): Breakdown {
  const down = priceUSD * FIN.downPayment;
  const principal = priceUSD - down;
  const i = Math.pow(1 + FIN.mortgageTEA, 1 / 12) - 1;
  const n = FIN.mortgageYears * 12;
  const fee = (principal * i) / (1 - Math.pow(1 + i, -n));
  const pendientes = evaluarCalculo([...REQUIERE.hipoteca]).sinRespaldo;
  return {
    headline: `${pendientes.length ? 'Simulación no verificada: la cuota sería' : 'La cuota sería'} de aproximadamente ${usd(fee)} al mes.`,
    value: usd(fee),
    lines: [
      ['Precio', usd(priceUSD)],
      [`Inicial (${pct(FIN.downPayment)}, supuesto)`, usd(down)],
      ['Monto financiado', usd(principal)],
      [`TEA (${pct(FIN.mortgageTEA, 1)}${marca('hipoteca.tea')})`, pct(FIN.mortgageTEA, 1)],
      ['Plazo (supuesto)', `${FIN.mortgageYears} años`],
      ['Cuota mensual', `${usd(fee)} · ${pen(fee * FIN.exchange)} (T.C.${marca('tc.usd_pen')})`],
      ['Intereses totales', usd(fee * n - principal)],
    ],
    note: pendientes.length
      ? 'Simulación no verificada: la TEA y el tipo de cambio no tienen respaldo activo en el Core; inicial y plazo son supuestos. No es la tasa de ningún banco. Sin seguros.'
      : 'Simulación con parámetros respaldados; inicial y plazo son supuestos. Sin seguros.',
    verificacion: pendientes.length ? 'NO_VERIFICADO' : 'RESPALDADO',
  };
}

export function alcabala(priceUSD: number, fecha: Date = new Date()): Breakdown {
  const anio = fecha.getFullYear();
  const ev = evaluarAlcabala(priceUSD, fecha);
  if (ev.estado === 'BLOQUEADO') {
    const uit = uitDelAnio(anio);
    return {
      headline: 'No calculo la alcabala todavía: sus parámetros no están verificados en el Core.',
      value: '—',
      lines: [
        ...ev.sinRespaldo.map((e) => [e.parametro.descripcion, `sin respaldo · ${e.motivo}`] as [string, string]),
        ...(uit && uit.estado === 'ACTIVO' ? [[`UIT ${anio}`, `${pen(uit.valor)} · ${uit.norma}, ${uit.referencia} (ACTIVO)`] as [string, string]] : []),
      ],
      note: 'Se habilita cuando U-ALCABALA (tasa y tramo inafecto) y el tipo de cambio de TAB-TC estén ACTIVOS. No se usa ningún valor escrito en el código.',
      verificacion: 'BLOQUEADO',
    };
  }
  return {
    headline: `La alcabala sería aproximadamente ${pen(ev.alcabala)}.`,
    value: pen(ev.alcabala),
    lines: [
      ['Precio en soles', pen(priceUSD * ev.tc)],
      [`Tramo inafecto (${ev.uitInafectas} UIT de ${anio})`, `− ${pen(ev.uitInafectas * ev.uit)}`],
      ['Base imponible', pen(ev.base)],
      ['Tasa', pct(ev.tasa)],
      ['Alcabala', pen(ev.alcabala)],
    ],
    note: 'Calculado con parámetros ACTIVOS del Core (U-ALCABALA, TAB-UIT, TAB-TC).',
    verificacion: 'RESPALDADO',
  };
}

/** Rentabilidad bruta de alquiler para inversionistas (aritmética sobre el alquiler indicado). */
export function rentalYield(priceUSD: number, monthlyRentUSD: number): Breakdown {
  const gross = (monthlyRentUSD * 12) / priceUSD;
  return {
    headline: `Rentabilidad bruta aproximada de ${pct(gross, 1)} al año.`,
    value: pct(gross, 1),
    lines: [
      ['Precio', usd(priceUSD)],
      ['Alquiler estimado', `${usd(monthlyRentUSD)} / mes`],
      ['Ingreso anual', usd(monthlyRentUSD * 12)],
      ['Rentabilidad bruta', pct(gross, 1)],
    ],
    note: 'Antes de mantenimiento, arbitrios, vacancia e impuestos. El impuesto sobre la renta de alquiler no está verificado en el Core y no se incluye.',
    verificacion: 'NO_VERIFICADO',
  };
}
