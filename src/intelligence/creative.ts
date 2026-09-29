/**
 * STUDIO — una propiedad entra, sale un ecosistema de contenido.
 * Generación local por plantillas con variaciones (versión / enfoque).
 * Preparado para delegar en un LLM vía intelligence/llm.ts sin cambiar la UI.
 */
import type { Objective, Piece } from '../app/nav';
import type { Agent, Property } from '../data/types';
import { usdK } from '../lib/format';

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
}

const pick = <T,>(arr: T[], v: number) => arr[v % arr.length];

const HOOKS: Record<Objective, string[]> = {
  vender: ['Lo que {price} compra hoy en {district}.', '{area} m² que no vas a encontrar dos veces.', 'Si buscas en {district}, mira esto primero.'],
  deseo: ['Vive la ciudad desde otra perspectiva.', 'Imagina despertar aquí.', 'Hay casas que se sienten antes de verlas.'],
  captar: ['Así vendimos en {district} en 38 días.', '¿Cuánto vale hoy tu propiedad en {district}?', 'Tu casa merece una estrategia, no solo un aviso.'],
  reactivar: ['Esto acaba de aparecer y pensé en ti.', 'Volvió a moverse el mercado en {district}.', 'La que buscabas existe.'],
  presentar: ['{type} en {district}. {area} m² de buenas decisiones.', 'Bienvenido a {address}.', 'Conoce {type_l} en {district} en 20 segundos.'],
  historia: ['{story}', 'Cada casa tiene una historia. Esta empieza con la luz.', 'Lo que no sale en las fotos.'],
};

const WHY: Record<Objective, string> = {
  vender: 'Conecta con el perfil de comprador que hoy más busca en la zona.',
  deseo: 'Vende una forma de vivir antes que metros cuadrados.',
  captar: 'Muestra resultados: el propietario confía en quien demuestra criterio.',
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

export function create(p: Property, objective: Objective, agent: Agent, version = 0): Creation {
  const hook = fill(pick(HOOKS[objective], version), p);
  const f = p.features;
  const rooms = p.bedrooms ? `${p.bedrooms} dormitorios` : 'planta libre';
  const idea =
    objective === 'captar'
      ? `Caso de éxito en ${p.district} para atraer propietarios.`
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
      ? `Hola, soy ${agent.firstName}. Esta semana cerramos una venta en ${p.district} y tengo compradores buscando algo similar. Si estás pensando en vender, te preparo un análisis de valor sin compromiso.`
      : `Hola, soy ${agent.firstName}. Te comparto ${p.type === 'Casa' ? 'esta casa' : 'este ' + p.type.toLowerCase()} en ${p.district}: ${p.areaM2} m², ${rooms}, ${f[0].toLowerCase()}. ${usdK(p.priceUSD)}. ¿Te gustaría verlo esta semana?`;

  const campana = [
    { title: 'Semana 1 · Descubrir', body: `Reel "${hook}" + 3 historias con detalles (${f.slice(0, 2).join(', ').toLowerCase()}).` },
    { title: 'Semana 2 · Convencer', body: `Carrusel de datos de ${p.district}: precio por m², demanda y por qué ahora.` },
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
export function proposal(p: Property): { objective: Objective; piece: Piece; text: string } {
  if (p.status === 'activa' && p.inquiries7d <= 1) return { objective: 'deseo', piece: 'reel', text: `Para ${p.address.split(',')[0]}, te propongo un reel de 22 segundos que venda la luz, no los metros.` };
  if (p.status === 'captación') return { objective: 'captar', piece: 'post', text: `Mientras se firma la captación, prepara un post de caso de éxito en ${p.district}.` };
  return { objective: 'presentar', piece: 'reel', text: `Para esta propiedad, te propongo un reel de 22 segundos.` };
}
