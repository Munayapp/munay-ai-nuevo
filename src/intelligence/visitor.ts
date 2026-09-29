/**
 * Respuestas de la propiedad al visitante (PublicProperty). Las lee un TERCERO.
 *
 * P1.2A — Truth Gate: solo datos del caso (la propiedad) y simulaciones etiquetadas como tales.
 * Nunca datos de mercado (precio por m² de la zona, lecturas de zona, demanda) ni impuestos.
 */
import type { Property, Workspace } from '../data/types';
import { normalize, pct, usd } from '../lib/format.ts';
import { FIN, mortgage } from './finance.ts';

export function visitorAnswer(p: Property, ws: Workspace, q: string): string {
  const t = normalize(q);
  const agent = ws.agent.firstName;
  if (/precio|cuesta|vale|cuanto/.test(t) && !/cuota|mensual/.test(t)) return `${usd(p.priceUSD)}, es decir ${usd(p.priceUSD / p.areaM2)} por m².`;
  if (/cuota|credito|hipoteca|mensual|financ/.test(t))
    return `${mortgage(p.priceUSD).headline} Es una simulación con supuestos (${pct(FIN.downPayment)} de inicial, ${FIN.mortgageYears} años, TEA ${pct(FIN.mortgageTEA, 1)} no verificada), no la oferta de ningún banco. ${agent} puede ayudarte con la precalificación.`;
  if (/alcabala|impuesto|tributo|notari/.test(t)) return `Los impuestos y gastos dependen de cada caso. ${agent} te lo explica con tu situación concreta.`;
  if (/estacion|cochera|auto/.test(t)) return p.parking ? `Sí, ${p.parking} estacionamiento${p.parking > 1 ? 's' : ''}.` : 'No incluye estacionamiento.';
  if (/dormitorio|cuarto|habitacion/.test(t)) return p.bedrooms ? `${p.bedrooms} dormitorios y ${p.bathrooms} baños.` : `Es planta libre, con ${p.bathrooms} baños.`;
  if (/metro|m2|area|tamano|grande/.test(t)) return `${p.areaM2} m²${p.floor ? `, en el piso ${p.floor}` : ''}.`;
  if (/zona|barrio|cerca|ubicacion|donde/.test(t)) return `${p.address}, ${p.district}. ${p.features.find((f) => /cuadra|zona|parque|malecon|centro|colegio/i.test(f)) ?? `${agent} te cuenta más de la zona en la visita.`}`;
  if (/luz|vista|ilumin/.test(t)) return p.features.find((f) => /luz|vista/i.test(f)) ?? `${agent} te lo muestra mejor en persona.`;
  if (/visita|ver|conocer/.test(t)) return 'Con gusto. Pide tu visita aquí abajo y te confirman el horario.';
  return `Buena pregunta. ${agent} te responderá personalmente; déjala junto con tu interés aquí abajo.`;
}
