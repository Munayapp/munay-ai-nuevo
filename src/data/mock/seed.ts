/**
 * DATOS DE DEMOSTRACIÓN.
 * Personas, direcciones y cifras son ficticias pero verosímiles para Lima.
 * Las fechas se calculan relativas a "hoy" para que la demo siempre esté viva.
 */
import type { Agent, Client, Comparable, District, Doc, Lead, Listing, Operation, Property, Task, Workspace, Zone } from '../types';

function at(dayOffset: number, h: number, m = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

const agent: Agent = {
  id: 'a-carlos',
  name: 'Carlos Mendoza',
  firstName: 'Carlos',
  initials: 'CM',
  role: 'Agente inmobiliario',
  city: 'Lima',
  commissionRate: 0.03,
  agencySplit: 0.3,
  goals: { monthlyOps: 4, monthlyCommissionPEN: 60000 },
  metrics: { conversion: 0.68, avgDaysToClose: 47, visitsThisMonth: 18 },
  preferences: { tone: 'cercano', focusDistricts: ['Miraflores', 'San Isidro', 'Barranco'] },
};

const properties: Property[] = [
  {
    id: 'p-pardo', type: 'Departamento', district: 'Miraflores', address: 'Av. José Pardo 640, piso 9',
    areaM2: 104, bedrooms: 3, bathrooms: 2, parking: 1, floor: 9, priceUSD: 225000, status: 'activa',
    features: ['Vista a la avenida arbolada', 'Luz de mañana', 'Cocina abierta', 'A 4 cuadras del parque Kennedy'],
    story: 'Miraflores desde el piso nueve: árboles, luz de mañana y todo a pie.',
    scene: 'interior', seed: 3, views7d: 38, inquiries7d: 1, daysOnMarket: 52, ownerId: 'c-gutierrez', map: { x: 0.44, y: 0.46 },
  },
  {
    id: 'p-berlin', type: 'Departamento', district: 'Miraflores', address: 'Calle Berlín 312, piso 5',
    areaM2: 96, bedrooms: 2, bathrooms: 2, parking: 1, floor: 5, priceUSD: 189000, status: 'en negociación',
    features: ['Terraza de 12 m²', 'Edificio de 2019', 'Zona gastronómica'],
    story: 'Una terraza en el corazón de Miraflores, para vivir la ciudad sin salir de casa.',
    scene: 'facade', seed: 1, views7d: 61, inquiries7d: 4, daysOnMarket: 34, map: { x: 0.56, y: 0.58 },
  },
  {
    id: 'p-fresnos', type: 'Casa', district: 'La Molina', address: 'Calle Los Fresnos 188',
    areaM2: 240, bedrooms: 4, bathrooms: 4, parking: 2, priceUSD: 385000, status: 'documentación',
    features: ['Jardín de 90 m²', 'Estudio independiente', 'Calle cerrada'],
    story: 'Una casa para crecer: jardín, silencio y espacio para todos.',
    scene: 'terrace', seed: 5, views7d: 22, inquiries7d: 2, daysOnMarket: 71, ownerId: 'c-gutierrez', map: { x: 0.5, y: 0.5 },
  },
  {
    id: 'p-camino', type: 'Departamento', district: 'San Isidro', address: 'Av. Camino Real 1120, piso 12',
    areaM2: 128, bedrooms: 3, bathrooms: 3, parking: 2, floor: 12, priceUSD: 298000, status: 'tasación',
    features: ['Vista al Golf', 'Doble estacionamiento', 'Edificio con gimnasio'],
    story: 'Doce pisos sobre el verde del Golf. Calma en el centro financiero.',
    scene: 'tower', seed: 2, views7d: 44, inquiries7d: 3, daysOnMarket: 29, map: { x: 0.5, y: 0.5 },
  },
  {
    id: 'p-domeyer', type: 'Loft', district: 'Barranco', address: 'Jr. Domeyer 219',
    areaM2: 78, bedrooms: 1, bathrooms: 1, parking: 1, floor: 3, priceUSD: 165000, status: 'activa',
    features: ['Doble altura', 'A 3 cuadras del malecón', 'Ideal para renta'],
    story: 'Doble altura, ladrillo y mar a tres cuadras. Barranco en estado puro.',
    scene: 'stairs', seed: 4, views7d: 92, inquiries7d: 7, daysOnMarket: 12, map: { x: 0.5, y: 0.5 },
  },
  {
    id: 'p-chacarilla', type: 'Casa', district: 'Santiago de Surco', address: 'Calle Monte Rosa 245, Chacarilla',
    areaM2: 210, bedrooms: 4, bathrooms: 3, parking: 2, priceUSD: 330000, status: 'captación',
    features: ['Esquina', 'Terraza techada', 'Cerca a colegios'],
    story: 'Chacarilla, esquina y luz. Una casa que ya tiene su familia esperando.',
    scene: 'facade', seed: 7, views7d: 0, inquiries7d: 0, daysOnMarket: 0, ownerId: 'c-mariana', map: { x: 0.5, y: 0.5 },
  },
  {
    id: 'p-begonias', type: 'Oficina', district: 'San Isidro', address: 'Calle Las Begonias 441, piso 7',
    areaM2: 85, bedrooms: 0, bathrooms: 2, parking: 1, floor: 7, priceUSD: 240000, status: 'captación',
    features: ['Implementada', 'Frente al Centro Empresarial', 'Recepción 24 h'],
    story: 'Una dirección que abre reuniones. Lista para operar desde el primer día.',
    scene: 'tower', seed: 8, views7d: 0, inquiries7d: 0, daysOnMarket: 0, ownerId: 'c-rafael', map: { x: 0.62, y: 0.4 },
  },
  {
    id: 'p-osma', type: 'Dúplex', district: 'Barranco', address: 'Av. Pedro de Osma 330',
    areaM2: 180, bedrooms: 3, bathrooms: 3, parking: 2, priceUSD: 360000, status: 'captación',
    features: ['Casona remodelada', 'Patio interior', 'Techos de 4 m'],
    story: 'Una casona que guarda la historia de Barranco y la vuelve contemporánea.',
    scene: 'stairs', seed: 9, views7d: 0, inquiries7d: 0, daysOnMarket: 0, ownerId: 'c-hector', map: { x: 0.38, y: 0.62 },
  },
  {
    id: 'p-cisneros', type: 'Departamento', district: 'Miraflores', address: 'Malecón Cisneros 1250, piso 14',
    areaM2: 150, bedrooms: 3, bathrooms: 3, parking: 2, floor: 14, priceUSD: 420000, status: 'vendida',
    features: ['Vista al mar', 'Piso completo', 'Terraza'],
    story: 'El Pacífico desde el piso catorce.',
    scene: 'tower', seed: 6, views7d: 0, inquiries7d: 0, daysOnMarket: 0, map: { x: 0.2, y: 0.7 },
  },
];

const clients: Client[] = [
  {
    id: 'c-lucia', name: 'Lucía Ramírez', role: 'comprador', phone: '+51 9•• ••• 214',
    budgetUSD: [200000, 230000], districts: ['Miraflores', 'San Isidro'], wants: '3 dormitorios, luz natural, cerca de parques',
    probability: 0.78, lastContactDays: 6, propertyIds: ['p-pardo'],
    memory: ['Trabaja desde casa: prioriza luz y silencio.', 'Tiene preaprobación hipotecaria por US$ 170K.', 'Prefiere WhatsApp por la tarde.'],
  },
  {
    id: 'c-andres', name: 'Andrés Salazar', role: 'comprador', phone: '+51 9•• ••• 087',
    budgetUSD: [360000, 400000], districts: ['La Molina'], wants: 'Casa con jardín para familia con 2 hijos',
    probability: 0.92, lastContactDays: 1, propertyIds: ['p-fresnos'],
    memory: ['Compra con crédito y ahorro de CTS.', 'Quiere mudarse antes de marzo por el colegio.'],
  },
  {
    id: 'c-patricia', name: 'Patricia Núñez', role: 'comprador', phone: '+51 9•• ••• 530',
    budgetUSD: [280000, 310000], districts: ['San Isidro'], wants: 'Vista abierta, edificio con servicios',
    probability: 0.85, lastContactDays: 2, propertyIds: ['p-camino'],
    memory: ['Médica, horarios cambiantes: confirmar citas el día anterior.'],
  },
  {
    id: 'c-elena', name: 'Elena Paredes', role: 'comprador', phone: '+51 9•• ••• 772',
    budgetUSD: [175000, 190000], districts: ['Miraflores'], wants: 'Terraza, zona caminable',
    probability: 0.64, lastContactDays: 3, propertyIds: ['p-berlin'],
    memory: ['Ofreció US$ 181K. El propietario acepta desde US$ 186K.', 'Compra al contado.'],
  },
  {
    id: 'c-jorge', name: 'Jorge Villanueva', role: 'inversionista', phone: '+51 9•• ••• 649',
    budgetUSD: [150000, 200000], districts: ['Barranco', 'Miraflores'], wants: 'Renta corta, rentabilidad > 6%',
    probability: 0.55, lastContactDays: 12, propertyIds: ['p-domeyer'],
    memory: ['Ya compró con Carlos en 2024.', 'Refirió a Héctor Luna (dúplex Pedro de Osma).'],
  },
  {
    id: 'c-mariana', name: 'Mariana Torres', role: 'propietario', phone: '+51 9•• ••• 318',
    districts: ['Santiago de Surco'], wants: 'Vender su casa en Chacarilla en menos de 4 meses',
    probability: 0.7, lastContactDays: 4, propertyIds: ['p-chacarilla'],
    memory: ['Hereda con su hermano: confirmar en la partida quiénes deben firmar.', 'Espera US$ 345K.'],
  },
  {
    id: 'c-rafael', name: 'Rafael Cáceres', role: 'propietario', phone: '+51 9•• ••• 905',
    districts: ['San Isidro'], wants: 'Vender oficina, exclusiva por 90 días',
    probability: 0.88, lastContactDays: 1, propertyIds: ['p-begonias'],
    memory: ['Aprobó la propuesta. Solo falta firmar la autorización.'],
  },
  {
    id: 'c-hector', name: 'Héctor Luna', role: 'propietario', phone: '+51 9•• ••• 461',
    districts: ['Barranco'], wants: 'Explorar valor de su dúplex',
    probability: 0.4, lastContactDays: 9, propertyIds: ['p-osma'],
    memory: ['Referido por Jorge Villanueva.', 'Aún no decide si vender o alquilar.'],
  },
  {
    id: 'c-gutierrez', name: 'Familia Gutiérrez', role: 'propietario', phone: '+51 9•• ••• 120',
    districts: ['Miraflores', 'La Molina'], wants: 'Vender dos inmuebles este año',
    probability: 0.8, lastContactDays: 5, propertyIds: ['p-pardo', 'p-fresnos'],
    memory: ['Hipoteca vigente en La Molina: el banco emitirá carta de levantamiento.'],
  },
];

const operations: Operation[] = [
  {
    id: 'op-berlin', propertyId: 'p-berlin', buyerId: 'c-elena', stage: 'negociación', priceUSD: 186000,
    happened: ['Visita el martes con Elena.', 'Oferta de US$ 181K al contado.', 'El propietario contraoferta US$ 186K.'],
    missing: ['Respuesta de Elena a la contraoferta.', 'Borrador de arras.'],
    risks: ['Elena está viendo otra opción en Calle Alcanfores.'],
    nextAction: 'Enviar la contraoferta a Elena hoy con argumento de terraza y contado.', nextDue: at(0, 15, 30),
    commissionRate: 0.03,
  },
  {
    id: 'op-fresnos', propertyId: 'p-fresnos', buyerId: 'c-andres', sellerId: 'c-gutierrez', stage: 'documentación', priceUSD: 378000,
    happened: ['Arras firmadas por US$ 20K.', 'Crédito aprobado para Andrés.'],
    missing: ['Carta de levantamiento de hipoteca.', 'Declaración de no adeudo de arbitrios.'],
    risks: ['La hipoteca vigente retrasa la minuta hasta tener la carta del banco.'],
    nextAction: 'Pedir a la Familia Gutiérrez la carta de levantamiento.', nextDue: at(1, 10, 0),
    commissionRate: 0.03,
  },
  {
    id: 'op-camino', propertyId: 'p-camino', buyerId: 'c-patricia', stage: 'tasación', priceUSD: 295000,
    happened: ['Precio acordado en US$ 295K.', 'Banco solicitó tasación.'],
    missing: ['Informe de tasación.', 'Autovalúo 2026 (HR/PU).'],
    risks: ['Si la tasación sale bajo US$ 285K, cambia la cuota inicial de Patricia.'],
    nextAction: 'Acompañar la tasación del jueves con comparables impresos.', nextDue: at(3, 11, 0),
    commissionRate: 0.03,
  },
  {
    id: 'op-cisneros', propertyId: 'p-cisneros', buyerId: 'c-jorge', stage: 'cerrada', priceUSD: 412000,
    happened: ['Firma de escritura.', 'Entrega de llaves.'],
    missing: [], risks: [],
    nextAction: 'Pedir testimonio y referidos.', nextDue: at(2, 12, 0),
    commissionRate: 0.03, closedAt: at(-9, 12, 0),
  },
];

const listings: Listing[] = [
  { id: 'l-begonias', propertyId: 'p-begonias', ownerId: 'c-rafael', step: 'autorización', exclusive: true, daysInStep: 1, note: 'Rafael aprobó la propuesta. Falta firmar la autorización de venta.' },
  { id: 'l-chacarilla', propertyId: 'p-chacarilla', ownerId: 'c-mariana', step: 'propuesta', exclusive: true, daysInStep: 4, note: 'Propuesta enviada. Sin respuesta en 4 días.' },
  { id: 'l-osma', propertyId: 'p-osma', ownerId: 'c-hector', step: 'prospecto', exclusive: false, daysInStep: 9, note: 'Referido de Jorge. Duda entre vender o alquilar.' },
];

const DISTRICT_BASE: Record<District, { m2: number; yoy: number; dom: number; demand: Zone['demand']; inv: number }> = {
  Miraflores: { m2: 2060, yoy: 0.046, dom: 58, demand: 'alta', inv: 412 },
  'San Isidro': { m2: 2310, yoy: 0.032, dom: 64, demand: 'media', inv: 288 },
  Barranco: { m2: 2140, yoy: 0.061, dom: 41, demand: 'alta', inv: 164 },
  'Santiago de Surco': { m2: 1560, yoy: 0.028, dom: 72, demand: 'media', inv: 520 },
  'La Molina': { m2: 1420, yoy: 0.019, dom: 86, demand: 'baja', inv: 346 },
};

const MONTHS = ['Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep'];

const zones: Zone[] = (Object.keys(DISTRICT_BASE) as District[]).map((district, zi) => {
  const b = DISTRICT_BASE[district];
  const start = b.m2 / (1 + b.yoy);
  const series = MONTHS.map((month, i) => {
    const t = i / (MONTHS.length - 1);
    const wobble = Math.sin(i * 1.7 + zi) * 0.006;
    return { month, usdM2: Math.round(start * (1 + b.yoy * t + wobble)) };
  });
  series[series.length - 1].usdM2 = b.m2;
  return { district, medianUSDm2: b.m2, changeYoY: b.yoy, daysOnMarket: b.dom, demand: b.demand, inventory: b.inv, series };
});

const STREETS: Record<District, string[]> = {
  Miraflores: ['Calle Schell', 'Av. Benavides', 'Calle Alcanfores', 'Av. Larco', 'Calle Bolognesi', 'Av. Arequipa'],
  'San Isidro': ['Av. Pezet', 'Calle Los Laureles', 'Av. Salaverry', 'Calle Choquehuanca', 'Av. Dos de Mayo', 'Calle Las Flores'],
  Barranco: ['Av. Grau', 'Jr. Batallón Ayacucho', 'Calle Colón', 'Av. San Martín', 'Jr. Centenario', 'Calle Tacna'],
  'Santiago de Surco': ['Av. Primavera', 'Calle Monte Bello', 'Av. El Polo', 'Calle Morro Solar', 'Av. Caminos del Inca', 'Calle Los Cedros'],
  'La Molina': ['Av. La Fontana', 'Calle Los Pinos', 'Av. Raúl Ferrero', 'Calle Las Palmeras', 'Av. Melgarejo', 'Calle Los Robles'],
};

const comparables: Comparable[] = [
  { id: 'cmp-1', district: 'Miraflores', type: 'Departamento', address: 'Calle Schell 520', areaM2: 95, bedrooms: 3, priceUSD: 198000, distanceBlocks: 3, status: 'vendido', daysListed: 38, seed: 11 },
  { id: 'cmp-2', district: 'Miraflores', type: 'Departamento', address: 'Av. Benavides 380', areaM2: 102, bedrooms: 3, priceUSD: 205000, distanceBlocks: 5, status: 'publicado', daysListed: 21, seed: 12 },
  { id: 'cmp-3', district: 'Miraflores', type: 'Departamento', address: 'Calle Alcanfores 745', areaM2: 100, bedrooms: 3, priceUSD: 212000, distanceBlocks: 6, status: 'publicado', daysListed: 44, seed: 13 },
  { id: 'cmp-4', district: 'Miraflores', type: 'Departamento', address: 'Av. Larco 1090', areaM2: 116, bedrooms: 3, priceUSD: 236000, distanceBlocks: 8, status: 'vendido', daysListed: 52, seed: 14 },
  { id: 'cmp-5', district: 'Miraflores', type: 'Departamento', address: 'Calle Bolognesi 215', areaM2: 92, bedrooms: 2, priceUSD: 184000, distanceBlocks: 4, status: 'vendido', daysListed: 29, seed: 15 },
];

// Comparables generados (deterministas) para el resto de zonas.
(Object.keys(DISTRICT_BASE) as District[]).filter((d) => d !== 'Miraflores').forEach((district, di) => {
  const b = DISTRICT_BASE[district];
  STREETS[district].slice(0, 4).forEach((street, i) => {
    const area = 90 + ((i * 13 + di * 7) % 40) + (district === 'La Molina' || district === 'Santiago de Surco' ? 100 : 0);
    const factor = 0.93 + ((i * 17 + di * 5) % 14) / 100;
    comparables.push({
      id: `cmp-${district}-${i}`, district, type: area > 170 ? 'Casa' : 'Departamento', address: `${street} ${200 + i * 137}`,
      areaM2: area, bedrooms: area > 170 ? 4 : 3, priceUSD: Math.round((area * b.m2 * factor) / 1000) * 1000,
      distanceBlocks: 2 + i * 2, status: i % 2 ? 'vendido' : 'publicado', daysListed: 20 + i * 11, seed: 20 + di * 4 + i,
    });
  });
});

const documents: Doc[] = [
  {
    id: 'd-partida-fresnos', name: 'Copia literal — Partida 4912••••', kind: 'Partida registral', propertyId: 'p-fresnos', operationId: 'op-fresnos',
    status: 'observado', pages: 6,
    summary: 'El inmueble está inscrito a nombre de la Familia Gutiérrez. Figura una hipoteca vigente a favor de un banco (asiento D00002).',
    extracted: [['Titulares', 'Luis y Carmen Gutiérrez'], ['Área inscrita', '240 m²'], ['Cargas', 'Hipoteca vigente (asiento D00002)'], ['Emitida', 'hace 42 días']],
    flags: ['Hipoteca vigente: coordinar con el banco y la notaría cómo se levanta.', 'Copia literal emitida hace 42 días: confirmar si la notaría la acepta.'],
    missing: ['Carta de levantamiento de hipoteca.', 'Copia literal actualizada.'],
    questions: ['¿El banco emitirá la carta antes de la firma o se cancelará con el pago del comprador?', '¿La notaría acepta el levantamiento simultáneo a la compraventa?'],
  },
  {
    id: 'd-arras-berlin', name: 'Borrador — Contrato de arras', kind: 'Contrato de arras', propertyId: 'p-berlin', operationId: 'op-berlin',
    status: 'pendiente', pages: 4,
    summary: 'Arras confirmatorias de US$ 10K. Plazo de 45 días para firmar la minuta. La penalidad por incumplimiento es distinta para cada parte.',
    extracted: [['Arras', 'US$ 10,000'], ['Plazo', '45 días'], ['Precio', 'US$ 186,000'], ['Forma de pago', 'Contado']],
    flags: ['La penalidad del vendedor es menor que la del comprador.', 'No define quién paga los gastos notariales.'],
    missing: ['Datos completos del comprador.', 'Número de partida.'],
    questions: ['¿Conviene igualar la penalidad para ambas partes?', '¿Se incluye cláusula de saneamiento por evicción?'],
  },
  {
    id: 'd-hrpu-camino', name: 'Autovalúo 2026 (HR/PU)', kind: 'Declaración jurada de autovalúo', propertyId: 'p-camino', operationId: 'op-camino',
    status: 'pendiente', pages: 0, summary: 'Aún no recibido. Pendiente para la tasación.',
    extracted: [], flags: [], missing: ['HR/PU 2026 del propietario.'], questions: [],
  },
  {
    id: 'd-auth-begonias', name: 'Autorización de venta exclusiva', kind: 'Autorización de venta', propertyId: 'p-begonias',
    status: 'pendiente', pages: 3,
    summary: 'Exclusiva por 90 días, comisión 3% + IGV, precio de salida US$ 240K. Pendiente de firma.',
    extracted: [['Plazo', '90 días'], ['Comisión', '3% + IGV'], ['Precio', 'US$ 240,000']],
    flags: [], missing: ['Firma de Rafael Cáceres.'], questions: [],
  },
];

const tasks: Task[] = [
  { id: 't-1', title: 'Llamar a Mariana: propuesta de Chacarilla', when: at(0, 11, 0), kind: 'llamada', relatedId: 'l-chacarilla', done: false },
  { id: 't-2', title: 'Enviar contraoferta a Elena', when: at(0, 15, 30), kind: 'llamada', relatedId: 'op-berlin', done: false },
  { id: 't-3', title: 'Firma: autorización de Rafael', when: at(0, 18, 0), kind: 'firma', relatedId: 'l-begonias', done: false },
  { id: 't-4', title: 'Visita con Lucía: Av. José Pardo', when: at(1, 10, 30), kind: 'visita', relatedId: 'p-pardo', done: false },
  { id: 't-5', title: 'Tasación del banco en Camino Real', when: at(3, 11, 0), kind: 'visita', relatedId: 'op-camino', done: false },
];

const leads: Lead[] = [
  { id: 'ld-1', propertyId: 'p-domeyer', name: 'Un visitante', kind: 'visita', message: 'Quiere visitar el loft el sábado por la mañana.', at: at(0, 8, 12), seen: false },
];

export function createSeed(): Workspace {
  return structuredClone({
    agent, properties, clients, operations, listings, comparables, zones, documents, tasks, leads,
    activities: [
      { id: 'ac-1', at: at(-1, 19, 5), text: 'Enviaste la propuesta de captación a Mariana.', relatedId: 'c-mariana' },
      { id: 'ac-2', at: at(-2, 12, 40), text: 'Elena ofreció US$ 181K por Berlín.', relatedId: 'op-berlin' },
    ],
  });
}
