/**
 * Redacción de mensajes (ACTION). Plantillas locales; un LLM podrá reemplazarlas vía intelligence/llm.ts.
 *
 * P1.2A — Truth Gate: estos textos se envían a terceros. Solo afirman datos del caso (la propiedad),
 * datos del cliente registrados por el agente y evidencia real del agente (evidencia.ts).
 * Nunca: compradores inventados, trabajo no hecho, plazos de firma no respaldados, forma de pago
 * no registrada ni comparaciones con "lo que se pide en la zona".
 */
import type { Agent, CaptureStep, Client, Operation, Property } from '../data/types';
import { usdK } from '../lib/format.ts';
import { puedeAfirmarCompradores, type EvidenciaAgente } from './evidencia.ts';

const first = (name: string) => name.split(' ')[0];

export function followUpMessage(client: Client, agent: Agent, prop?: Property, step?: CaptureStep, evidencia?: EvidenciaAgente): string {
  if (client.role === 'propietario' && (step === 'autorización' || step === 'firma')) {
    return `Hola ${first(client.name)}, ¡gracias por la confianza! Ya tengo lista la autorización${prop ? ` para tu ${prop.type.toLowerCase()} en ${prop.district}` : ''}. Cuando te acomode la revisamos y la firmamos; si prefieres, paso por ti. — ${first(agent.name)}`;
  }
  if (client.role === 'propietario') {
    const compradores = !!prop && puedeAfirmarCompradores(evidencia) && evidencia!.district === prop.district;
    return `Hola ${first(client.name)}, ¿cómo estás? Te escribo para saber si pudiste revisar la propuesta${prop ? ` para tu ${prop.type.toLowerCase()} en ${prop.district}` : ''}.${compradores ? ` Tengo clientes en mi cartera buscando en ${prop!.district}.` : ''} Me gustaría arrancar esta semana. ¿Te llamo mañana 10 a.m. o prefieres por la tarde? — ${first(agent.name)}`;
  }
  if (client.role === 'inversionista') {
    return `Hola ${first(client.name)}, encontré algo que encaja con lo que buscas${prop ? `: ${prop.type.toLowerCase()} en ${prop.district}, ${prop.areaM2} m² por ${usdK(prop.priceUSD)}` : ''}. Si quieres, preparo una simulación de renta con los supuestos que me indiques. ¿Tienes 10 minutos esta semana? — ${first(agent.name)}`;
  }
  return `Hola ${first(client.name)}, ¿cómo estás? Me quedé pensando en lo que buscas (${client.wants.toLowerCase()}).${prop ? ` El ${prop.type.toLowerCase()} de ${prop.address.split(',')[0]} sigue disponible: ${prop.features[0]?.toLowerCase() ?? `${prop.areaM2} m²`}.` : ''} ¿Te parece si lo vemos esta semana? — ${first(agent.name)}`;
}

export function visitConfirmation(client: Client, prop: Property, whenLabel: string): string {
  return `Hola ${first(client.name)}, te confirmo la visita ${whenLabel} en ${prop.address}. Te espero en la puerta del edificio. Si necesitas cambiar la hora, avísame por aquí.`;
}

export function counterOfferMessage(client: Client, op: Operation, prop: Property): string {
  return `Hola ${first(client.name)}, conversé con el propietario de ${prop.address.split(',')[0]}. La cifra que tenemos sobre la mesa es ${usdK(op.priceUSD)}. ¿Te parece si lo conversamos y vemos si avanzamos con las arras?`;
}

export function referralRequest(client: Client): string {
  return `Hola ${first(client.name)}, fue un gusto acompañarte en la compra. Si conoces a alguien que esté pensando en vender o comprar, me encantaría ayudarle con el mismo cuidado. ¡Gracias por la confianza!`;
}
