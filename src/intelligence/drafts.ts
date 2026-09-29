/** Redacción de mensajes (ACTION). Plantillas locales; un LLM podrá reemplazarlas vía intelligence/llm.ts. */
import type { Agent, CaptureStep, Client, Operation, Property } from '../data/types';
import { usdK } from '../lib/format';

const first = (name: string) => name.split(' ')[0];

export function followUpMessage(client: Client, agent: Agent, prop?: Property, step?: CaptureStep): string {
  if (client.role === 'propietario' && (step === 'autorización' || step === 'firma')) {
    return `Hola ${first(client.name)}, ¡gracias por la confianza! Ya tengo lista la autorización${prop ? ` para tu ${prop.type.toLowerCase()} en ${prop.district}` : ''}. Puedes firmarla hoy en 2 minutos; si prefieres, paso por ti y la firmamos juntos. — ${first(agent.name)}`;
  }
  if (client.role === 'propietario') {
    return `Hola ${first(client.name)}, ¿cómo estás? Te escribo para saber si pudiste revisar la propuesta${prop ? ` para tu ${prop.type.toLowerCase()} en ${prop.district}` : ''}. Tengo compradores activos en la zona y me gustaría arrancar esta semana. ¿Te llamo mañana 10 a.m. o prefieres por la tarde? — ${first(agent.name)}`;
  }
  if (client.role === 'inversionista') {
    return `Hola ${first(client.name)}, encontré algo que encaja con lo que buscas${prop ? `: ${prop.type.toLowerCase()} en ${prop.district}, ${prop.areaM2} m² por ${usdK(prop.priceUSD)}` : ''}. Hice los números de renta y te los comparto. ¿Tienes 10 minutos esta semana? — ${first(agent.name)}`;
  }
  return `Hola ${first(client.name)}, ¿cómo estás? Me quedé pensando en lo que buscas (${client.wants.toLowerCase()}).${prop ? ` El ${prop.type.toLowerCase()} de ${prop.address.split(',')[0]} sigue disponible y tiene justo esa luz de mañana que te gusta.` : ''} ¿Te parece si lo vemos esta semana? — ${first(agent.name)}`;
}

export function visitConfirmation(client: Client, prop: Property, whenLabel: string): string {
  return `Hola ${first(client.name)}, te confirmo la visita ${whenLabel} en ${prop.address}. Te espero en la puerta del edificio. Si necesitas cambiar la hora, avísame por aquí.`;
}

export function counterOfferMessage(client: Client, op: Operation, prop: Property): string {
  return `Hola ${first(client.name)}, conversé con el propietario de ${prop.address.split(',')[0]}. Acepta ${usdK(op.priceUSD)} considerando que es una compra al contado. La terraza y el edificio de 2019 hacen que esté por debajo de lo que se pide en la zona. ¿Avanzamos con las arras esta semana?`;
}

export function referralRequest(client: Client): string {
  return `Hola ${first(client.name)}, fue un gusto acompañarte en la compra. Si conoces a alguien que esté pensando en vender o comprar, me encantaría ayudarle con el mismo cuidado. ¡Gracias por la confianza!`;
}
