/**
 * RESOLVER — el agente expresa un objetivo; MUNAY infiere
 * INTENCIÓN + CONTEXTO + ESTADO + SIGUIENTE ACCIÓN, y entrega un resultado (no solo una respuesta).
 *
 * Motor local por reglas + entidades + memoria. Costo S/0.
 * Si las reglas no entienden el pedido, el modelo (llm.ts, vía proxy) solo lo clasifica y reescribe;
 * la resolución la sigue construyendo el motor local con el mismo contrato `Resolution`.
 */
import type { MunayAction, Piece } from '../app/nav';
import { uid } from '../data/changes';
import * as S from '../data/select';
import type { Client, Operation, Property, Workspace } from '../data/types';
import { CAPTURE_STEPS } from '../data/types';
import { dayLabel, normalize, pct, penK, time, usdK } from '../lib/format';
import { topSignals } from './pulse';
import { alcabala, commission, mortgage, netCommissionPEN, netCommissionStatus, type Breakdown } from './finance';
import { esDemo } from '../data/integrations';
import { METODOS } from '../core/metodos.ts';
import { evidenciaAgente } from './evidencia.ts';
import { MERCADO_ES_DEMO } from './procedencia.ts';
import { followUpMessage, visitConfirmation } from './drafts';
import { create, pieceText } from './creative';
import { readFile, type DocReading } from './docReader';
import { memory } from './memory';
import type { Intent } from './intents';
import { interpret } from './llm';

export type Block =
  | { type: 'text'; text: string }
  | { type: 'list'; title?: string; items: string[] }
  | { type: 'breakdown'; data: Breakdown }
  | { type: 'steps'; steps: string[]; current: number }
  | { type: 'draft'; label: string; text: string }
  | { type: 'entity'; kind: 'property' | 'client' | 'operation'; id: string }
  | { type: 'tasks'; ids: string[] }
  | { type: 'reading'; reading: DocReading };

export interface Resolution {
  intent: string;
  understood: string;
  stages: string[];
  headline: string;
  why?: string;
  blocks: Block[];
  actions: MunayAction[];
}

const RULES: [Intent, RegExp][] = [
  ['comision', /cuanto me queda|comision|cuanto (gano|voy a ganar)|me toca|honorario|mis ingresos|si cierro/],
  ['alcabala', /alcabala|impuesto/],
  ['hipoteca', /hipoteca|credito|cuota|prestamo|financ/],
  ['visita', /visita|voy a ver|vamos a ver|ensenar|mostrar la|mostrarle/],
  ['captar', /captar|captacion|exclusiva|autorizacion|firmar la autorizacion|propietario nuevo/],
  ['documento', /document|contrato|partida|arras|minuta|legal|revisa (este|el)|analiza este/],
  ['crear', /reel|post|publicacion|contenido|descripcion|guion|campana|historia|video|instagram|tiktok|redes/],
  ['seguimiento', /seguimiento|escribir|escribele|whatsapp|mensaje|contactar|llamar|reactivar/],
  ['mercado', /precio|mercado|comparable|cuanto vale|valor|tasa(r|cion)|zona|m2|metro/],
  ['agenda', /hoy|que tengo|agenda|pendiente|mi dia|que hago|que deberia|por donde empiezo|resumen/],
];

const STOP = new Set(['calle', 'piso', 'jose', 'real', 'rosa', 'monte', 'pedro', 'las', 'los', 'malecon', 'av', 'jr']);

function findProperty(t: string, ws: Workspace): Property | undefined {
  for (const p of ws.properties) {
    const words = normalize(p.address).split(' ').filter((w) => w.length >= 4 && !STOP.has(w) && !/\d/.test(w));
    if (words.some((w) => t.includes(w))) return p;
  }
  const d = ws.properties.filter((p) => t.includes(normalize(p.district)) || (p.district === 'Santiago de Surco' && t.includes('surco')));
  const order = ['activa', 'en negociación', 'documentación', 'tasación', 'captación', 'vendida'];
  return d.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status))[0];
}

function findClient(t: string, ws: Workspace): Client | undefined {
  return ws.clients.find((c) => normalize(c.name).split(' ').some((w) => w.length > 3 && new RegExp(`\\b${w}\\b`).test(t)));
}

interface Ctx {
  t: string;
  raw: string;
  ws: Workspace;
  property?: Property;
  client?: Client;
  operation?: Operation;
  pronoun: boolean;
}

function context(raw: string, ws: Workspace): Ctx {
  const t = normalize(raw);
  const f = memory.get().focus;
  const pronoun = /\b(esta|este|esa|ese)\b (propiedad|venta|operacion|cliente|casa|depa|departamento|captacion)/.test(t);
  let property = findProperty(t, ws);
  let client = findClient(t, ws);
  if (!property && pronoun) property = S.prop(ws, f.propertyId) ?? S.prop(ws, S.operation(ws, f.operationId)?.propertyId);
  if (!client && pronoun && /cliente/.test(t)) client = S.client(ws, f.clientId);
  if (!property && client) property = S.prop(ws, client.propertyIds[0]);
  let operation = property ? S.operationFor(ws, property.id) : undefined;
  if (!operation && pronoun) operation = S.operation(ws, f.operationId);
  return { t, raw, ws, property, client, operation, pronoun };
}

const short = (p: Property) => p.address.split(',')[0];

// ───────────────────────── resoluciones ─────────────────────────

function agenda({ ws }: Ctx): Resolution {
  const today = ws.tasks.filter((x) => !x.done && dayLabel(x.when) === 'Hoy').sort((a, b) => a.when.localeCompare(b.when));
  const signal = topSignals(ws, 1)[0];
  const first = today[0];
  return {
    intent: 'agenda', understood: 'Quieres saber qué hacer hoy.',
    stages: ['Revisando tu agenda…', 'Cruzando con tus operaciones…', 'Encontré esto.'],
    headline: first
      ? `Hoy tienes ${today.length === 1 ? '1 cosa' : `${today.length} cosas`}. Empieza por ${first.title.charAt(0).toLowerCase()}${first.title.slice(1).split(':')[0]} a las ${time(first.when)}.`
      : 'Hoy tu agenda está libre. Buen día para captar.',
    why: signal ? `Además, ${signal.title.charAt(0).toLowerCase()}${signal.title.slice(1)}.` : undefined,
    blocks: [{ type: 'tasks', ids: today.map((x) => x.id) }],
    actions: [signal ? { ...signal.action, primary: true } : { label: 'Ver Negocio', go: { to: 'tab', tab: 'negocio' } }, { label: 'Todo lo que detecté', go: { to: 'sheet', sheet: { kind: 'pulse' } } }],
  };
}

function money(c: Ctx): Resolution {
  const { ws } = c;
  const total = /total|todas|mes|en curso|si cierro/.test(c.t);
  const actives = S.activeOperations(ws);
  const focused = S.operation(ws, memory.get().focus.operationId);
  if (total || (!c.operation && !c.property && !c.pronoun && !focused)) {
    const sum = actives.reduce((s, o) => s + netCommissionPEN(o, ws.agent), 0);
    const st = netCommissionStatus();
    return {
      intent: 'comision', understood: 'Quieres saber cuánto te queda de tus operaciones.',
      stages: ['Sumando tus operaciones…', 'Descontando agencia e impuestos…', 'Listo.'],
      headline: `${st.etiqueta ? 'Estimado no verificado: si' : 'Si'} cierras tus ${actives.length} operaciones, te quedarían aproximadamente ${penK(sum)}.`,
      why: `Neto para ti: después de la parte de la agencia y la retención de cuarta categoría.${st.etiqueta ? ' La retención y el tipo de cambio usados no tienen respaldo activo en el Core.' : ''}`,
      blocks: actives.map((o) => ({ type: 'entity' as const, kind: 'operation' as const, id: o.id })),
      actions: [{ label: 'Ver Negocio', primary: true, go: { to: 'tab', tab: 'negocio' } }],
    };
  }
  // "esta venta" sin foco previo: la operación más avanzada.
  const stageOrder = ['firma', 'tasación', 'documentación', 'negociación'];
  const op = c.operation ?? focused ?? [...actives].sort((a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage))[0];
  const p = S.prop(ws, op.propertyId)!;
  const b = commission(op, ws.agent, p);
  memory.focus({ operationId: op.id, propertyId: p.id });
  return {
    intent: 'comision', understood: `Quieres saber cuánto te queda de la venta en ${short(p)}.`,
    stages: ['Buscando la operación…', 'Calculando tu parte…', 'Listo.'],
    headline: b.headline, blocks: [{ type: 'breakdown', data: b }],
    actions: [{ label: 'Abrir operación', primary: true, go: { to: 'sheet', sheet: { kind: 'operation', id: op.id } } }, { label: '¿Y si cierro todas?', prompt: '¿Cuánto me queda de todas mis operaciones en curso?' }],
  };
}

function pickProperty(c: Ctx) {
  return c.property ?? S.prop(c.ws, memory.get().focus.propertyId) ?? c.ws.properties.find((p) => p.status === 'activa')!;
}

function financeCalc(c: Ctx, kind: 'alcabala' | 'hipoteca'): Resolution {
  const p = pickProperty(c);
  const b = kind === 'alcabala' ? alcabala(p.priceUSD) : mortgage(p.priceUSD);
  return {
    intent: kind, understood: `Calculo ${kind === 'alcabala' ? 'la alcabala' : 'la cuota hipotecaria'} para ${short(p)} (${usdK(p.priceUSD)}).`,
    stages: ['Tomando el precio…', 'Revisando el respaldo de cada parámetro…', 'Listo.'],
    headline: b.headline, blocks: [{ type: 'breakdown', data: b }],
    actions: [{ label: 'Ver propiedad', go: { to: 'sheet', sheet: { kind: 'property', id: p.id } } }, { label: kind === 'alcabala' ? '¿Y la cuota?' : '¿Y la alcabala?', prompt: `${kind === 'alcabala' ? 'Cuota hipotecaria' : 'Alcabala'} de ${short(p)}` }],
  };
}

function visit(c: Ctx): Resolution {
  const { ws } = c;
  const task = ws.tasks.find((x) => x.kind === 'visita' && !x.done && (!c.property || x.relatedId === c.property.id));
  const p = c.property ?? S.prop(ws, task?.relatedId) ?? pickProperty(c);
  const cl = c.client ?? ws.clients.find((x) => x.role !== 'propietario' && x.propertyIds.includes(p.id));
  const pos = S.position(ws, p);
  const docs = S.docsFor(ws, p.id);
  const whenLabel = task ? `${dayLabel(task.when).toLowerCase()} a las ${time(task.when)}` : 'mañana a las 10:30';
  memory.focus({ propertyId: p.id, clientId: cl?.id });
  const actions: MunayAction[] = [];
  if (cl) {
    const text = visitConfirmation(cl, p, whenLabel);
    actions.push({ label: 'Copiar confirmación', primary: true, effects: [{ do: 'copy', text, toast: 'Confirmación copiada' }] });
  }
  if (!task) {
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 30, 0, 0);
    actions.push({ label: 'Agendar visita', effects: [{ do: 'change', change: { type: 'task.create', task: { id: uid('t'), title: `Visita${cl ? ` con ${cl.name.split(' ')[0]}` : ''}: ${short(p)}`, when: d.toISOString(), kind: 'visita', relatedId: p.id, done: false } }, toast: 'Visita agendada mañana 10:30' }] });
  }
  actions.push({ label: 'Ver propiedad', go: { to: 'sheet', sheet: { kind: 'property', id: p.id } } });
  return {
    intent: 'visita', understood: `Vas a mostrar ${short(p)}${cl ? ` a ${cl.name.split(' ')[0]}` : ''}.`,
    stages: ['Identificando la propiedad…', cl ? `Recordando lo que busca ${cl.name.split(' ')[0]}…` : 'Revisando el cliente…', 'Preparé tu visita.'],
    headline: `Tu visita ${whenLabel} está lista para preparar.`,
    why: cl ? `${cl.name.split(' ')[0]} busca ${cl.wants.toLowerCase()}. ${cl.memory[0]}` : undefined,
    blocks: [
      { type: 'entity', kind: 'property', id: p.id },
      ...(cl ? [{ type: 'entity' as const, kind: 'client' as const, id: cl.id }] : []),
      {
        type: 'list', title: 'Llévate esto', items: [
          `Rango del método MUNAY: ${usdK(pos.fairLow)}–${usdK(pos.fairHigh)} (${pos.comps.length} comparables${MERCADO_ES_DEMO ? ' DEMO' : ''}).`,
          `Resalta: ${p.features.slice(0, 2).join(' y ').toLowerCase()}.`,
          docs.length ? `Documentos: ${docs.map((d) => d.kind.toLowerCase()).join(', ')}.` : 'Sugerencia MUNAY (práctica no verificada): pide al propietario la copia literal antes de negociar.',
          cl?.budgetUSD && p.priceUSD > cl.budgetUSD[1] ? `Ojo: está sobre su presupuesto (${usdK(cl.budgetUSD[1])}). Prepara el argumento de valor.` : 'Está dentro de su presupuesto.',
        ],
      },
    ],
    actions,
  };
}

function capture(c: Ctx): Resolution {
  const { ws } = c;
  const l = (c.property && S.listingFor(ws, c.property.id)) ?? ws.listings.find((x) => x.id === memory.get().focus.listingId);
  if (!l) {
    return {
      intent: 'captar', understood: 'Quieres avanzar una captación.',
      stages: ['Revisando tus captaciones…', 'Listo.'],
      headline: `Tienes ${ws.listings.length} captaciones abiertas. ¿Cuál avanzamos?`,
      blocks: [],
      actions: ws.listings.map((x, i) => ({ label: `${short(S.prop(ws, x.propertyId)!)} · ${x.step}`, primary: i === 0, go: { to: 'sheet' as const, sheet: { kind: 'capture' as const, id: x.id } } })),
    };
  }
  const p = S.prop(ws, l.propertyId)!;
  const owner = S.client(ws, l.ownerId)!;
  const idx = CAPTURE_STEPS.indexOf(l.step);
  const next = CAPTURE_STEPS[Math.min(idx + 1, CAPTURE_STEPS.length - 1)];
  memory.focus({ propertyId: p.id, listingId: l.id, clientId: owner.id });
  return {
    intent: 'captar', understood: `Quieres captar ${short(p)} de ${owner.name}.`,
    stages: ['Buscando la captación…', 'Revisando el estado…', 'Encontré esto.'],
    headline: `Está en ${l.step}. Siguiente paso: ${next}.`,
    why: l.note,
    blocks: [{ type: 'steps', steps: [...CAPTURE_STEPS], current: idx }, { type: 'entity', kind: 'property', id: p.id }],
    actions: [{ label: 'Continuar captación', primary: true, go: { to: 'sheet', sheet: { kind: 'capture', id: l.id } } }],
  };
}

function documents(c: Ctx): Resolution {
  const pend = c.ws.documents.filter((d) => d.status !== 'recibido');
  return {
    intent: 'documento', understood: 'Quieres que revise un documento.',
    stages: ['Preparando la revisión…', 'Listo.'],
    headline: 'Adjúntalo y lo reviso. Mientras tanto, estos necesitan tu atención:',
    blocks: [{ type: 'list', items: pend.map((d) => `${d.kind}: ${d.status}`) }],
    actions: [
      { label: 'Adjuntar documento', primary: true, go: { to: 'sheet', sheet: { kind: 'analysis', mode: 'documento' } } },
      ...pend.slice(0, 2).map((d) => ({ label: d.kind, go: { to: 'sheet' as const, sheet: { kind: 'document' as const, id: d.id } } })),
    ],
  };
}

function creative(c: Ctx): Resolution {
  const { ws, t } = c;
  const piece: Piece = /whatsapp|mensaje/.test(t) ? 'whatsapp' : /descripcion/.test(t) ? 'descripcion' : /campana/.test(t) ? 'campana' : /post|publicacion|instagram/.test(t) ? 'post' : 'reel';
  const p = c.property ?? S.prop(ws, memory.get().focus.propertyId) ?? ws.properties.find((x) => x.status === 'activa' && x.inquiries7d <= 1)!;
  const objective = /capta/.test(t) ? 'captar' : /historia/.test(t) ? 'historia' : 'deseo';
  const cr = create(p, objective, ws.agent, 0, evidenciaAgente(ws, p.district, esDemo()));
  memory.focus({ propertyId: p.id });
  const label = { reel: 'un reel de 22 segundos', descripcion: 'la descripción', post: 'el post', whatsapp: 'el mensaje de WhatsApp', campana: 'una campaña de 3 semanas' }[piece];
  return {
    intent: 'crear', understood: `Quieres contenido para ${short(p)}.`,
    stages: ['Entendiendo la propiedad…', 'Buscando el ángulo…', 'Creando…'],
    headline: `Listo: ${label} para ${short(p)}.`,
    why: `Idea: ${cr.idea} ${cr.why}`,
    blocks: [{ type: 'draft', label: piece === 'reel' ? `Gancho · ${cr.hook}` : 'Pieza', text: pieceText(cr, piece) }],
    actions: [
      { label: 'Abrir en Crea', primary: true, go: { to: 'tab', tab: 'crea', params: { crea: { propertyId: p.id, objective, piece, nonce: Date.now() } } } },
      { label: 'Copiar', effects: [{ do: 'copy', text: pieceText(cr, piece) }] },
    ],
  };
}

function followUp(c: Ctx): Resolution {
  const { ws } = c;
  const cl = c.client ?? S.client(ws, memory.get().focus.clientId) ?? ws.clients.filter((x) => x.role !== 'propietario').sort((a, b) => b.lastContactDays * b.probability - a.lastContactDays * a.probability)[0];
  const p = S.prop(ws, cl.propertyIds[0]);
  const text = followUpMessage(cl, ws.agent, p, p && S.listingFor(ws, p.id)?.step, p && evidenciaAgente(ws, p.district, esDemo()));
  memory.focus({ clientId: cl.id });
  const days = cl.lastContactDays;
  return {
    intent: 'seguimiento', understood: `Quieres retomar el contacto con ${cl.name}.`,
    stages: [`Recordando a ${cl.name.split(' ')[0]}…`, 'Redactando en tu tono…', 'Listo.'],
    headline: `Este mensaje a ${cl.name.split(' ')[0]} está listo.`,
    why: `${days >= 2 ? `${days} días sin contacto. ` : days === 1 ? 'Hablaron ayer. ' : ''}${cl.memory[cl.memory.length - 1]}`,
    blocks: [{ type: 'draft', label: 'WhatsApp', text }],
    actions: [
      {
        label: 'Copiar y registrar contacto', primary: true,
        effects: [
          { do: 'copy', text },
          { do: 'change', change: { type: 'client.contacted', id: cl.id }, toast: 'Mensaje copiado · contacto registrado' },
          { do: 'change', change: { type: 'activity.log', activity: { id: uid('ac'), at: new Date().toISOString(), text: `Seguimiento enviado a ${cl.name}.`, relatedId: cl.id } }, toast: '' },
        ],
      },
      { label: 'Ver cliente', go: { to: 'sheet', sheet: { kind: 'client', id: cl.id } } },
    ],
  };
}

function market(c: Ctx): Resolution {
  const { ws } = c;
  const p = c.property ?? S.prop(ws, memory.get().focus.propertyId);
  if (!p) {
    const z = S.zone(ws, ws.agent.preferences.focusDistricts[0]);
    return {
      intent: 'mercado', understood: `Quieres una lectura del mercado en ${z.district}.`,
      stages: ['Leyendo la zona…', 'Listo.'],
      headline: `${z.district}${MERCADO_ES_DEMO ? ' (DEMO)' : ''}: US$ ${z.medianUSDm2.toLocaleString('en-US')}/m², ${z.changeYoY >= 0 ? 'sube' : 'baja'} ${pct(Math.abs(z.changeYoY), 1)} en el año.`,
      why: MERCADO_ES_DEMO ? 'Datos de mercado de demostración: todavía no hay una fuente de mercado conectada. No los uses con clientes.' : undefined,
      blocks: [],
      actions: [{ label: 'Ver en Mercado', primary: true, go: { to: 'tab', tab: 'mercado', params: { mercado: { district: z.district } } } }],
    };
  }
  const pos = S.position(ws, p);
  memory.focus({ propertyId: p.id });
  const verdict = pos.verdict === 'sobre' ? `está ${pct(pos.diff)} sobre sus comparables` : pos.verdict === 'bajo' ? `está ${pct(-pos.diff)} bajo sus comparables` : 'está en línea con sus comparables';
  return {
    intent: 'mercado', understood: `Quieres saber si ${short(p)} está bien de precio.`,
    stages: ['Buscando comparables…', `Leyendo ${p.district}…`, 'Encontré esto.'],
    headline: `${short(p)} ${verdict}.`,
    why: `${METODOS.rangoValorizacion.nombre}: ${usdK(pos.fairLow)}–${usdK(pos.fairHigh)}, con ${pos.comps.length} comparables${MERCADO_ES_DEMO ? ' de demostración' : ''} (precios de oferta, no de cierre).`,
    blocks: [{ type: 'entity', kind: 'property', id: p.id }],
    actions: [
      { label: 'Ver comparables', primary: true, go: { to: 'tab', tab: 'mercado', params: { mercado: { district: p.district, propertyId: p.id, seg: 'comparables' } } } },
      { label: 'Análisis completo', go: { to: 'sheet', sheet: { kind: 'analysis', mode: 'propiedad', subjectId: p.id } } },
    ],
  };
}

function entity(c: Ctx): Resolution {
  if (c.client) {
    memory.focus({ clientId: c.client.id });
    return {
      intent: 'entidad', understood: `Hablas de ${c.client.name}.`,
      stages: ['Buscando en tu memoria…', 'Listo.'],
      headline: `Esto es lo que recuerdo de ${c.client.name.split(' ')[0]}.`,
      blocks: [{ type: 'list', items: c.client.memory }, { type: 'entity', kind: 'client', id: c.client.id }],
      actions: [{ label: 'Hacer seguimiento', primary: true, prompt: `Seguimiento a ${c.client.name}` }, { label: 'Ver cliente', go: { to: 'sheet', sheet: { kind: 'client', id: c.client.id } } }],
    };
  }
  const p = c.property!;
  memory.focus({ propertyId: p.id });
  return {
    intent: 'entidad', understood: `Hablas de ${short(p)}.`,
    stages: ['Buscando la propiedad…', 'Listo.'],
    headline: `${p.type} en ${p.district}, ${p.status}.`,
    blocks: [{ type: 'entity', kind: 'property', id: p.id }],
    actions: [
      { label: 'Ver propiedad', primary: true, go: { to: 'sheet', sheet: { kind: 'property', id: p.id } } },
      { label: '¿Está bien de precio?', prompt: `¿Está bien de precio ${short(p)}?` },
      { label: 'Crear contenido', prompt: `Créame un reel de ${short(p)}` },
    ],
  };
}

function unknown(): Resolution {
  return {
    intent: 'desconocido', understood: 'No estoy seguro de qué necesitas.',
    stages: ['Intentando entender…'],
    headline: 'Cuéntame un poco más. Por ejemplo:',
    blocks: [],
    actions: [
      { label: '¿Qué tengo que hacer hoy?', prompt: '¿Qué tengo que hacer hoy?' },
      { label: '¿Cuánto me queda de esta venta?', prompt: '¿Cuánto me queda de esta venta?' },
      { label: 'Voy a ver una propiedad mañana', prompt: 'Voy a ver una propiedad mañana' },
      { label: 'Créame un Reel', prompt: 'Créame un Reel' },
    ],
  };
}

async function readDocs(files: File[], ws: Workspace): Promise<Resolution> {
  const docs = files.filter((f) => !f.type.startsWith('image/'));
  const images = files.filter((f) => f.type.startsWith('image/'));
  if (!docs.length && images.length) {
    const p = S.prop(ws, memory.get().focus.propertyId) ?? ws.properties.find((x) => x.status === 'activa')!;
    return {
      intent: 'crear', understood: `Recibí ${images.length} imagen${images.length > 1 ? 'es' : ''}.`,
      stages: ['Mirando las imágenes…', 'Listo.'],
      headline: `¿Son de ${short(p)}? Puedo convertirlas en contenido.`,
      blocks: [],
      actions: [
        { label: 'Crear un reel', primary: true, go: { to: 'tab', tab: 'crea', params: { crea: { propertyId: p.id, objective: 'deseo', piece: 'reel', nonce: Date.now() } } } },
        { label: 'Es otra propiedad', go: { to: 'tab', tab: 'negocio', params: { negocio: { seg: 'captaciones' } } } },
      ],
    };
  }
  const reading = await readFile(docs[0]);
  return {
    intent: 'documento', understood: `Recibí "${docs[0].name}".`,
    stages: ['Leyendo el documento…', 'Buscando datos clave…', 'Encontré esto.'],
    headline: reading.doc.summary,
    blocks: [{ type: 'reading', reading }],
    actions: [{ label: 'Revisión completa', primary: true, go: { to: 'sheet', sheet: { kind: 'analysis', mode: 'documento', files: docs } } }],
  };
}

export async function resolve(raw: string, ws: Workspace, files: File[] = []): Promise<Resolution> {
  if (raw.trim()) memory.prompt(raw.trim());
  if (files.length) return readDocs(files, ws);
  const c = context(raw, ws);
  const intent = RULES.find(([, re]) => re.test(c.t))?.[0] ?? (c.client || c.property ? 'entidad' : 'desconocido');
  if (intent === 'desconocido' && raw.trim()) {
    const hint = await interpret(raw);
    if (hint && hint.intent !== 'desconocido') {
      const c2 = context(`${raw} ${hint.rewritten}`, ws);
      if (hint.intent !== 'entidad' || c2.client || c2.property) return dispatch(hint.intent, c2);
    }
  }
  return dispatch(intent, c);
}

function dispatch(intent: Intent, c: Ctx): Resolution {
  switch (intent) {
    case 'agenda': return agenda(c);
    case 'comision': return money(c);
    case 'alcabala': return financeCalc(c, 'alcabala');
    case 'hipoteca': return financeCalc(c, 'hipoteca');
    case 'visita': return visit(c);
    case 'captar': return capture(c);
    case 'documento': return documents(c);
    case 'crear': return creative(c);
    case 'seguimiento': return followUp(c);
    case 'mercado': return market(c);
    case 'entidad': return entity(c);
    default: return unknown();
  }
}
