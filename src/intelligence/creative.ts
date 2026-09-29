/**
 * STUDIO — una propiedad entra, sale un ecosistema de contenido.
 * Generación local por plantillas con variaciones (versión / enfoque).
 * Preparado para delegar en un LLM vía intelligence/llm.ts sin cambiar la UI.
 *
 * P1.2A — Truth Gate: todo lo que se genera aquí sale a terceros. Solo afirma:
 *   - datos del caso (la propiedad: m², precio, atributos);
 *   - datos del agente con registro real (cierres y compradores en su CRM), nunca de demostración.
 * Nunca afirma datos de mercado (demanda, precio por m² de la zona, "el mercado se movió") sin fuente.
 */
import type { Objective, Piece } from '../app/nav';
import type { Agent, Property } from '../data/types';
import { usdK } from '../lib/format.ts';
import { puedeAfirmarCierres, puedeAfirmarCompradores, type EvidenciaAgente } from './evidencia.ts';
import { procedencia, type Procedencia } from './procedencia.ts';

export const OBJECTIVES: { id: Objective; label: string; icon: string }[] = [
  { id: 'vender', label: 'Vender', icon: 'chart' },
  { id: 'deseo', label: 'Generar deseo', icon: 'heart' },
  { id: 'captar', label: 'Conseguir captación', icon: 'users' },
  { id: 'reactivar', label: 'Reactivar un cliente', icon: 'refresh' },
  { id: 'presentar', label: 'Presentar una propiedad', icon: 'house' },
  { id: 'historia', label: 'Contar una historia', icon: 'sparkle' },
];

export const PIECES: { id: Piece; label: string }[] = [
  { id: 'reel', label: 'Reel' },
  { id: 'descripcion', label: 'Descripción' },
  { id: 'post', label: 'Post' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'campana', label: 'Campaña' },
];

export interface Scene {
  t: string;
  shot: string;
  text: string;
}

export interface Creation {
  idea: string;
  why: string;
  hook: string;
  reel: { duration: number; scenes: Scene[]; audio: string };
  descripcion: string;
  post: string;
  whatsapp: string;
  campana: { title: string; body: string }[];
  /** Hechos afirmados en las piezas y su procedencia (solo CASE_DATA / AGENT_DATA). */
  procedencia: Procedencia[];
}

const pick = <T,>(arr: T[], v: number) => arr[v % arr.length];

const HOOKS: Record<Objective, string[]> = {
  vender: ['Lo que {price} compra hoy en {district}.', '{area} m² en {district}, en detalle.', 'Si buscas en {district}, mira esto primero.'],
  deseo: ['Vive la ciudad desde otra perspectiva.', 'Imagina despertar aquí.', 'Hay casas que se sienten antes de verlas.'],
  // Sin afirmaciones de resultados: el gancho de caso de éxito solo se usa con cierres reales del agente (HOOK_CASO_EXITO).
  captar: ['¿Cuánto vale hoy tu propiedad en {district}?', 'Tu casa merece una estrategia, no solo un aviso.', 'Vender bien empieza por un precio bien explicado.'],
  reactivar: ['Vi esto y pensé en ti.', 'Una opción en {district} que quiero mostrarte.', 'La que buscabas podría ser esta.'],
  presentar: ['{type} en {district}. {area} m² de buenas decisiones.', 'Bienvenido a {address}.', 'Conoce {type_l} en {district} en 20 segundos.'],
  historia: ['{story}', 'Cada casa tiene una historia. Esta empieza con la luz.', 'Lo que no sale en las fotos.'],
};

const HOOK_CASO_EXITO = 'Así vendimos en {district}.';

const WHY: Record<Objective, string> = {
  vender: 'Pone por delante lo que la propiedad ofrece: precio, metros y su mejor atributo.',
  deseo: 'Vende una forma de vivir antes que metros cuadrados.',
  captar: 'Muestra criterio: el propietario confía en quien le explica cómo se valora su propiedad.',
  reactivar: 'Personal y oportuno: vuelve a abrir una conversación sin presión.',
  presentar: 'Claro y rápido: todo lo esencial en un solo vistazo.',
  historia: 'La emoción se recuerda; los datos después la justifican.',
};

function fill(tpl: string, p: Property) {
  return tpl
    .replace('{price}', usdK(p.priceUSD))
    .replace('{district}', p.district)
    .replace('{area}', String(p.areaM2))
    .replace('{type}', p.type)
    .replace('{type_l}', `${p.type === 'Casa' ? 'esta' : 'este'} ${p.type.toLowerCase()}`)
    .replace('{address}', p.address.split(',')[0])
    .replace('{story}', p.story);
}

export function create(p: Property, objective: Objective, agent: Agent, version = 0, evidencia?: EvidenciaAgente): Creation {
  const cierres = objective === 'captar' && puedeAfirmarCierres(evidencia) && evidencia!.district === p.district;
  const compradores = objective === 'captar' && puedeAfirmarCompradores(evidencia) && evidencia!.district === p.district;
  const hook = fill(cierres && version % 2 === 0 ? HOOK_CASO_EXITO : pick(HOOKS[objective], version), p);
  const f = p.features;
  const rooms = p.bedrooms ? `${p.bedrooms} dormitorios` : 'planta libre';
  const idea =
    objective === 'captar'
      ? cierres
        ? `Caso de éxito en ${p.district} para atraer propietarios (${evidencia!.cierres.count} cierre(s) registrado(s) en tu CRM).`
        : `Propuesta de valor para propietarios de ${p.district}: un análisis de precio explicado, sin compromiso.`
      : objective === 'reactivar'
        ? 'Mensaje personal con una razón concreta para volver a hablar.'
        : `Estilo de vida en movimiento: ${f[0].toLowerCase()}.`;

  const scenes: Scene[] = [
    { t: '0–3 s', shot: pick(['Toma aérea lenta hacia el edificio', 'Plano detalle de la luz entrando', 'Puerta que se abre, cámara entra'], version), text: hook },
    { t: '3–8 s', shot: 'Recorrido fluido por la sala hacia la ventana', text: `${p.areaM2} m² · ${rooms}` },
    { t: '8–13 s', shot: `Detalle: ${f[0].toLowerCase()}`, text: f[0] },
    { t: '13–18 s', shot: `Contexto de barrio: ${p.district}`, text: f[1] ?? p.district },
    { t: '18–22 s', shot: 'Plano final estable, logo MUNAY discreto', text: objective === 'captar' ? '¿Hablamos de tu propiedad?' : 'Agenda tu visita' },
  ];

  const descripcion = [
    `${p.story}`,
    '',
    `${p.type} de ${p.areaM2} m² en ${p.address.split(',')[0]}, ${p.district}. ${p.bedrooms ? `${p.bedrooms} dormitorios, ` : ''}${p.bathrooms} baños y ${p.parking} estacionamiento${p.parking > 1 ? 's' : ''}.`,
    '',
    ...f.map((x) => `· ${x}`),
    '',
    `Precio: ${usdK(p.priceUSD)}. Visitas con cita previa.`,
  ].join('\n');

  const tags = ['#' + p.district.replace(/\s/g, ''), '#Lima', '#BienesRaices', p.type === 'Oficina' ? '#Oficinas' : '#Hogar'];
  const post = `${hook}\n\n${f.slice(0, 3).join(' · ')}\n${p.areaM2} m² · ${usdK(p.priceUSD)}\n\nEscríbeme y te cuento todo.\n\n${tags.join(' ')}`;

  const whatsapp =
    objective === 'captar'
      ? [
          `Hola, soy ${agent.firstName}.`,
          cierres ? `Hace poco cerré una venta en ${p.district}.` : '',
          compradores ? `Tengo clientes en mi cartera buscando en ${p.district}.` : '',
          'Si estás pensando en vender, te preparo un análisis de valor sin compromiso.',
        ].filter(Boolean).join(' ')
      : `Hola, soy ${agent.firstName}. Te comparto ${p.type === 'Casa' ? 'esta casa' : 'este ' + p.type.toLowerCase()} en ${p.district}: ${p.areaM2} m², ${rooms}, ${f[0].toLowerCase()}. ${usdK(p.priceUSD)}. ¿Te gustaría verlo esta semana?`;

  const campana = [
    { title: 'Semana 1 · Descubrir', body: `Reel "${hook}" + 3 historias con detalles (${f.slice(0, 2).join(', ').toLowerCase()}).` },
    { title: 'Semana 2 · Convencer', body: `Carrusel con los datos de la propiedad (${p.areaM2} m², ${usdK(p.priceUSD)}, ${f[0].toLowerCase()}) y respuestas a las preguntas frecuentes. Datos de mercado solo con fuente citada.` },
    { title: 'Semana 3 · Convertir', body: 'Open house con cupos limitados + mensaje directo a interesados del QR.' },
  ];

  return {
    idea,
    why: WHY[objective],
    hook,
    reel: { duration: 22, scenes, audio: pick(['Piano ambiental, 90 bpm', 'Lo-fi cálido', 'Cuerdas suaves, minimal'], version) },
    descripcion,
    post,
    whatsapp,
    campana,
    procedencia: [procedencia('CASE_DATA', `property:${p.id}`), ...(cierres || compradores ? [evidencia!.procedencia] : [])],
  };
}

export function pieceText(c: Creation, piece: Piece): string {
  switch (piece) {
    case 'reel':
      return c.reel.scenes.map((s) => `${s.t} — ${s.shot}\nTexto: ${s.text}`).join('\n\n') + `\n\nAudio: ${c.reel.audio}`;
    case 'descripcion':
      return c.descripcion;
    case 'post':
      return c.post;
    case 'whatsapp':
      return c.whatsapp;
    case 'campana':
      return c.campana.map((x) => `${x.title}\n${x.body}`).join('\n\n');
  }
}

/** Sugerencia proactiva de MUNAY para una propiedad. */
export function proposal(p: Property, evidencia?: EvidenciaAgente): { objective: Objective; piece: Piece; text: string } {
  if (p.status === 'activa' && p.inquiries7d <= 1) return { objective: 'deseo', piece: 'reel', text: `Para ${p.address.split(',')[0]}, te propongo un reel de 22 segundos que venda la luz, no los metros.` };
  if (p.status === 'captación') return { objective: 'captar', piece: 'post', text: puedeAfirmarCierres(evidencia) && evidencia!.district === p.district
          ? `Mientras se firma la captación, prepara un post de caso de éxito con tus cierres en ${p.district}.`
          : `Mientras se firma la captación, prepara un post que explique cómo valoras una propiedad en ${p.district}.` };
  return { objective: 'presentar', piece: 'reel', text: `Para esta propiedad, te propongo un reel de 22 segundos.` };
}
