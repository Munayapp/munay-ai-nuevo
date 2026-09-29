/**
 * MONEY. Regla: primero "te quedan aproximadamente…", después "así se calcula".
 * Parámetros referenciales y editables; no constituyen asesoría tributaria.
 */
import type { Agent, Operation, Property } from '../data/types';
import { pct, pen, usd } from '../lib/format';

export const FIN = {
  exchange: 3.75, // S/ por US$ — referencial de demostración
  uit: 5350, // UIT referencial; actualizar cada año
  retention4ta: 0.08, // retención renta de cuarta categoría
  igv: 0.18,
  mortgageTEA: 0.089,
  mortgageYears: 20,
  downPayment: 0.1,
};

export interface Breakdown {
  headline: string;
  value: string;
  lines: [string, string][];
  note: string;
}

export function commission(op: Operation, agent: Agent, prop?: Property): Breakdown {
  const gross = op.priceUSD * op.commissionRate;
  const agency = gross * agent.agencySplit;
  const share = gross - agency;
  const tax = share * FIN.retention4ta;
  const netUSD = share - tax;
  const netPEN = netUSD * FIN.exchange;
  return {
    headline: `Te quedan aproximadamente ${pen(netPEN)}${prop ? ` de ${prop.type.toLowerCase()} en ${prop.district}` : ''}.`,
    value: pen(netPEN),
    lines: [
      ['Precio de venta', usd(op.priceUSD)],
      [`Comisión ${pct(op.commissionRate)}`, usd(gross)],
      [`Agencia (${pct(agent.agencySplit)})`, `− ${usd(agency)}`],
      [`Retención 4ta categoría (${pct(FIN.retention4ta)})`, `− ${usd(tax)}`],
      ['Neto para ti', usd(netUSD)],
      [`En soles (T.C. ${FIN.exchange})`, pen(netPEN)],
    ],
    note: `El IGV (${pct(FIN.igv)}) se cobra aparte al cliente y no forma parte de tu ingreso. Tipo de cambio y tasas referenciales.`,
  };
}

export function netCommissionPEN(op: Operation, agent: Agent) {
  return op.priceUSD * op.commissionRate * (1 - agent.agencySplit) * (1 - FIN.retention4ta) * FIN.exchange;
}

export function mortgage(priceUSD: number): Breakdown {
  const down = priceUSD * FIN.downPayment;
  const principal = priceUSD - down;
  const i = Math.pow(1 + FIN.mortgageTEA, 1 / 12) - 1;
  const n = FIN.mortgageYears * 12;
  const fee = (principal * i) / (1 - Math.pow(1 + i, -n));
  return {
    headline: `La cuota sería de aproximadamente ${usd(fee)} al mes.`,
    value: usd(fee),
    lines: [
      ['Precio', usd(priceUSD)],
      [`Inicial (${pct(FIN.downPayment)})`, usd(down)],
      ['Monto financiado', usd(principal)],
      ['TEA referencial', pct(FIN.mortgageTEA, 1)],
      ['Plazo', `${FIN.mortgageYears} años`],
      ['Cuota mensual', `${usd(fee)} · ${pen(fee * FIN.exchange)}`],
      ['Intereses totales', usd(fee * n - principal)],
    ],
    note: 'Sin seguros de desgravamen ni del inmueble. Cada banco define su tasa final.',
  };
}

export function alcabala(priceUSD: number): Breakdown {
  const pricePEN = priceUSD * FIN.exchange;
  const base = Math.max(0, pricePEN - 10 * FIN.uit);
  const tax = base * 0.03;
  return {
    headline: `El comprador pagaría aproximadamente ${pen(tax)} de alcabala.`,
    value: pen(tax),
    lines: [
      ['Precio en soles', pen(pricePEN)],
      ['Tramo inafecto (10 UIT)', `− ${pen(10 * FIN.uit)}`],
      ['Base imponible', pen(base)],
      ['Tasa', '3%'],
      ['Alcabala', pen(tax)],
    ],
    note: `UIT referencial ${pen(FIN.uit)}. La primera venta de inmueble nuevo por la constructora está inafecta.`,
  };
}

/** Rentabilidad bruta de alquiler para inversionistas. */
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
    note: 'Antes de mantenimiento, arbitrios, vacancia e impuestos (5% sobre la renta).',
  };
}
