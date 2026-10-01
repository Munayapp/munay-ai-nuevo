/**
 * Mapeo HubSpot ⇄ MUNAY (puro, sin red). Lo usa el proxy `functions/api/hubspot.ts`.
 *
 * Lectura (HubSpot → MUNAY):
 *   Contacts → Client     · Deals → Operation     · Tasks → Task     · Notes → Activity (+ Client.memory)
 * Escritura (MUNAY → HubSpot), lista cerrada:
 *   task.create      → POST  /crm/v3/objects/tasks (+ asociación al contacto o negocio)
 *   task.complete    → PATCH /crm/v3/objects/tasks/{id}  hs_task_status=COMPLETED
 *   client.contacted → POST  /crm/v3/objects/notes (+ contacto)
 *   activity.log     → POST  /crm/v3/objects/notes (+ contacto o negocio)
 *   operation.update → PATCH /crm/v3/objects/deals/{id}  dealstage / amount / hs_next_step
 *   lead.create      → POST  /crm/v3/objects/contacts y nota asociada con el mensaje
 *
 * Propiedades personalizadas opcionales (créalas en HubSpot para un mapeo completo):
 *   Contacto: munay_rol (comprador|propietario|inversionista), munay_presupuesto ("150000-220000"),
 *             munay_distritos ("Miraflores; Barranco"), munay_busca (texto).
 *   Negocio:  munay_property_id (id de la propiedad en MUNAY), munay_comision (0.03 o 3),
 *             munay_riesgos / munay_faltantes / munay_historial (una línea por punto).
 *
 * Solo importa tipos: Node puede ejecutarlo en las pruebas sin compilar.
 */
import type { Activity, Client, ClientRole, District, Operation, OperationStage, Task } from '../../src/data/types';

export interface HsObject {
  id: string;
  properties: Record<string, string | null | undefined>;
  associations?: Record<string, { results: { id: string }[] } | undefined>;
}

export interface CrmSnapshot {
  clients: Client[];
  /** `commissionRate` puede faltar: el cliente usa la comisión habitual del agente. */
  operations: (Omit<Operation, 'commissionRate'> & { commissionRate?: number })[];
  tasks: Task[];
  activities: Activity[];
}

/** Prefijos de ID: nunca chocan con los IDs locales (p-, c-, o-, t-…). */
export const PREFIX = { contact: 'hs-c-', deal: 'hs-d-', task: 'hs-t-', note: 'hs-n-' } as const;
type Kind = keyof typeof PREFIX;

export const toRemote = (kind: Kind, id: string | undefined): string | null => {
  const p = PREFIX[kind];
  if (!id?.startsWith(p)) return null;
  const n = id.slice(p.length);
  return /^\d{1,20}$/.test(n) ? n : null;
};

export const PROPS = {
  contacts: ['firstname', 'lastname', 'phone', 'mobilephone', 'hs_lead_status', 'notes_last_contacted', 'createdate', 'munay_rol', 'munay_presupuesto', 'munay_distritos', 'munay_busca'],
  deals: ['dealname', 'amount', 'dealstage', 'pipeline', 'closedate', 'hs_next_step', 'munay_property_id', 'munay_comision', 'munay_riesgos', 'munay_faltantes', 'munay_historial'],
  tasks: ['hs_task_subject', 'hs_timestamp', 'hs_task_status', 'hs_task_type'],
  notes: ['hs_note_body', 'hs_timestamp'],
} as const;

/** IDs de asociación definidos por HubSpot (v4). */
export const ASSOC = { noteToContact: 202, noteToDeal: 214, taskToContact: 204, taskToDeal: 216 } as const;

/** Las notas que escribe MUNAY llevan esta marca: se muestran como actividad, no como memoria del cliente. */
export const NOTE_MARK = '[MUNAY] ';

// ── Etapas ────────────────────────────────────────────────────────────────────

export type StageMap = Record<OperationStage, string[]>;

/** Pipeline por defecto de HubSpot. `closedlost` no se muestra. Configurable con HUBSPOT_DEAL_STAGES. */
export const DEFAULT_STAGES: StageMap = {
  negociación: ['appointmentscheduled', 'qualifiedtobuy', 'presentationscheduled'],
  documentación: ['decisionmakerboughtin'],
  tasación: [],
  firma: ['contractsent'],
  cerrada: ['closedwon'],
};

/** HUBSPOT_DEAL_STAGES = JSON {"negociación": "id1,id2", "tasación": "id3", …}. Lo que falte, por defecto. */
export function parseStages(raw?: string): StageMap {
  if (!raw?.trim()) return DEFAULT_STAGES;
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const out = { ...DEFAULT_STAGES };
    for (const stage of Object.keys(DEFAULT_STAGES) as OperationStage[]) {
      const v = obj[stage];
      if (typeof v === 'string') out[stage] = v.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return out;
  } catch {
    return DEFAULT_STAGES;
  }
}

export function stageOf(dealstage: string | null | undefined, map: StageMap): OperationStage | null {
  if (!dealstage) return null;
  for (const stage of Object.keys(map) as OperationStage[]) if (map[stage].includes(dealstage)) return stage;
  return null;
}

// ── Utilidades ────────────────────────────────────────────────────────────────

const DISTRICTS: District[] = ['Miraflores', 'San Isidro', 'Barranco', 'Santiago de Surco', 'La Molina'];
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function districts(raw?: string | null): District[] {
  if (!raw) return [];
  const wanted = raw.split(/[;,]/).map(fold);
  return DISTRICTS.filter((d) => wanted.includes(fold(d)) || (d === 'Santiago de Surco' && wanted.includes('surco')));
}

const lines = (raw?: string | null) => (raw ?? '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, 12);

/** hs_timestamp llega como ISO o como milisegundos. */
export function toIso(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const ms = /^\d+$/.test(raw) ? Number(raw) : Date.parse(raw);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
}

export function stripHtml(html?: string | null): string {
  return (html ?? '')
    .replace(/<br\s*\/?>|<\/p>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

const firstId = (o: HsObject, kind: string) => o.associations?.[kind]?.results?.[0]?.id;
const ids = (o: HsObject, kind: string) => (o.associations?.[kind]?.results ?? []).map((r) => r.id);
const daysSince = (iso: string | undefined, now: number) => (iso ? Math.max(0, Math.floor((now - Date.parse(iso)) / 86_400_000)) : 30);

const PROBABILITY: Record<string, number> = {
  NEW: 0.3, OPEN: 0.4, IN_PROGRESS: 0.6, OPEN_DEAL: 0.75, CONNECTED: 0.5, ATTEMPTED_TO_CONTACT: 0.3, BAD_TIMING: 0.2, UNQUALIFIED: 0.1,
};

const ROLES: ClientRole[] = ['comprador', 'propietario', 'inversionista'];
const roleOf = (raw?: string | null): ClientRole => (ROLES.find((r) => r === fold(raw ?? '')) ?? 'comprador');

function budget(raw?: string | null): [number, number] | undefined {
  const nums = (raw ?? '').match(/\d[\d.,]*/g)?.map((n) => Number(n.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.')));
  if (!nums?.length || nums.some((n) => !Number.isFinite(n))) return undefined;
  return [Math.min(...nums), Math.max(...nums)];
}

function commission(raw?: string | null): number | undefined {
  const n = Number((raw ?? '').replace(',', '.'));
  if (!raw || !Number.isFinite(n) || n <= 0) return undefined;
  return n >= 1 ? n / 100 : n;
}

function taskKind(subject: string, type?: string | null): Task['kind'] {
  if (/visita/i.test(subject)) return 'visita';
  if (/firma/i.test(subject)) return 'firma';
  if (/reel|post|contenido|publica/i.test(subject)) return 'contenido';
  if (/document|partida|contrato|tasaci/i.test(subject)) return 'documento';
  if (type === 'CALL') return 'llamada';
  return 'visita';
}

// ── Lectura ───────────────────────────────────────────────────────────────────

export function buildSnapshot(
  raw: { contacts: HsObject[]; deals: HsObject[]; tasks: HsObject[]; notes: HsObject[] },
  stages: StageMap,
  now = Date.now(),
): CrmSnapshot {
  const contactsById = new Map(raw.contacts.map((c) => [c.id, c]));

  const notes = raw.notes
    .map((n) => ({ n, at: toIso(n.properties.hs_timestamp) ?? new Date(now).toISOString(), body: stripHtml(n.properties.hs_note_body) }))
    .filter((x) => x.body)
    .sort((a, b) => b.at.localeCompare(a.at));

  const notesByContact = new Map<string, typeof notes>();
  for (const x of notes) for (const cid of ids(x.n, 'contacts')) notesByContact.set(cid, [...(notesByContact.get(cid) ?? []), x]);

  const operations: CrmSnapshot['operations'] = [];
  const propertyIdsByContact = new Map<string, string[]>();
  for (const d of raw.deals) {
    const stage = stageOf(d.properties.dealstage, stages);
    if (!stage) continue; // perdido o de otro pipeline
    const contactIds = ids(d, 'contacts');
    const propertyId = d.properties.munay_property_id?.trim() ?? '';
    if (propertyId) for (const cid of contactIds) propertyIdsByContact.set(cid, [...(propertyIdsByContact.get(cid) ?? []), propertyId]);
    const seller = contactIds.find((cid) => roleOf(contactsById.get(cid)?.properties.munay_rol) === 'propietario');
    const buyer = contactIds.find((cid) => cid !== seller);
    const due = toIso(d.properties.closedate);
    operations.push({
      id: PREFIX.deal + d.id,
      propertyId,
      buyerId: buyer ? PREFIX.contact + buyer : '',
      sellerId: seller ? PREFIX.contact + seller : undefined,
      stage,
      priceUSD: Number(d.properties.amount) || 0,
      happened: lines(d.properties.munay_historial),
      missing: lines(d.properties.munay_faltantes),
      risks: lines(d.properties.munay_riesgos),
      nextAction: d.properties.hs_next_step?.trim() || 'Definir el siguiente paso',
      nextDue: due ?? new Date(now).toISOString(),
      commissionRate: commission(d.properties.munay_comision),
      closedAt: stage === 'cerrada' ? due : undefined,
    });
  }

  const clients: Client[] = raw.contacts.map((c) => {
    const p = c.properties;
    const own = notesByContact.get(c.id) ?? [];
    const lastNote = own[0]?.at;
    const lastContact = [toIso(p.notes_last_contacted), lastNote].filter((x): x is string => !!x).sort().pop();
    return {
      id: PREFIX.contact + c.id,
      name: [p.firstname, p.lastname].filter(Boolean).join(' ').trim() || 'Contacto sin nombre',
      role: roleOf(p.munay_rol),
      phone: p.phone || p.mobilephone || '',
      budgetUSD: budget(p.munay_presupuesto),
      districts: districts(p.munay_distritos),
      wants: p.munay_busca?.trim() || '',
      probability: PROBABILITY[p.hs_lead_status ?? ''] ?? 0.4,
      lastContactDays: daysSince(lastContact ?? toIso(p.createdate), now),
      propertyIds: [...new Set(propertyIdsByContact.get(c.id) ?? [])],
      memory: own.filter((x) => !x.body.startsWith(NOTE_MARK.trim())).slice(0, 3).map((x) => x.body.slice(0, 160)),
    };
  });

  const tasks: Task[] = raw.tasks.map((t) => {
    const p = t.properties;
    const subject = p.hs_task_subject?.trim() || 'Tarea';
    const contact = firstId(t, 'contacts');
    const deal = firstId(t, 'deals');
    return {
      id: PREFIX.task + t.id,
      title: subject,
      when: toIso(p.hs_timestamp) ?? new Date(now).toISOString(),
      kind: taskKind(subject, p.hs_task_type),
      relatedId: contact ? PREFIX.contact + contact : deal ? PREFIX.deal + deal : undefined,
      done: p.hs_task_status === 'COMPLETED',
    };
  });

  const activities: Activity[] = notes.slice(0, 60).map(({ n, at, body }) => {
    const deal = firstId(n, 'deals');
    const contact = firstId(n, 'contacts');
    return {
      id: PREFIX.note + n.id,
      at,
      text: body.replace(NOTE_MARK.trim(), '').trim().slice(0, 240),
      relatedId: deal ? PREFIX.deal + deal : contact ? PREFIX.contact + contact : undefined,
    };
  });

  return { clients, operations, tasks, activities };
}

// ── Escritura ─────────────────────────────────────────────────────────────────

/** Cambios que el navegador puede pedir escribir en HubSpot (validados aquí, nunca reenviados tal cual). */
export type RemoteChange =
  | { type: 'task.create'; task: { title: string; when: string; kind: Task['kind']; relatedId?: string } }
  | { type: 'task.complete'; id: string }
  | { type: 'client.contacted'; id: string }
  | { type: 'activity.log'; activity: { text: string; at: string; relatedId: string } }
  | { type: 'operation.update'; id: string; patch: { stage?: OperationStage; priceUSD?: number; nextAction?: string } }
  | { type: 'lead.create'; lead: { name: string; kind: string; message: string; at: string }; propertyLabel?: string };

const str = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const iso = (v: unknown): v is string => typeof v === 'string' && v.length <= 40 && Number.isFinite(Date.parse(v));
const KINDS: Task['kind'][] = ['visita', 'llamada', 'documento', 'contenido', 'firma'];
const STAGES = Object.keys(DEFAULT_STAGES) as OperationStage[];

export function parseChange(x: unknown): RemoteChange | null {
  if (!x || typeof x !== 'object') return null;
  const c = x as Record<string, any>;
  switch (c.type) {
    case 'task.create': {
      const t = c.task ?? {};
      if (!str(t.title, 200) || !iso(t.when) || !KINDS.includes(t.kind)) return null;
      const relatedId = toRemote('contact', t.relatedId) || toRemote('deal', t.relatedId) ? (t.relatedId as string) : undefined;
      return { type: 'task.create', task: { title: t.title, when: t.when, kind: t.kind, relatedId } };
    }
    case 'task.complete':
      return toRemote('task', c.id) ? { type: 'task.complete', id: c.id } : null;
    case 'client.contacted':
      return toRemote('contact', c.id) ? { type: 'client.contacted', id: c.id } : null;
    case 'activity.log': {
      const a = c.activity ?? {};
      if (!str(a.text, 500) || !iso(a.at) || !(toRemote('contact', a.relatedId) || toRemote('deal', a.relatedId))) return null;
      return { type: 'activity.log', activity: { text: a.text, at: a.at, relatedId: a.relatedId } };
    }
    case 'operation.update': {
      if (!toRemote('deal', c.id) || !c.patch || typeof c.patch !== 'object') return null;
      const patch: { stage?: OperationStage; priceUSD?: number; nextAction?: string } = {};
      if (STAGES.includes(c.patch.stage)) patch.stage = c.patch.stage;
      if (typeof c.patch.priceUSD === 'number' && c.patch.priceUSD > 0 && c.patch.priceUSD < 1e10) patch.priceUSD = c.patch.priceUSD;
      if (str(c.patch.nextAction, 300)) patch.nextAction = c.patch.nextAction;
      return Object.keys(patch).length ? { type: 'operation.update', id: c.id, patch } : null;
    }
    case 'lead.create': {
      const l = c.lead ?? {};
      if (!str(l.name, 120) || !str(l.kind, 20) || !str(l.message, 600) || !iso(l.at)) return null;
      return { type: 'lead.create', lead: { name: l.name, kind: l.kind, message: l.message, at: l.at }, propertyLabel: str(c.propertyLabel, 160) ? c.propertyLabel : undefined };
    }
    default:
      return null;
  }
}

export interface HsRequest {
  method: 'POST' | 'PATCH';
  path: string;
  body: Record<string, unknown>;
}

/**
 * Plan de escritura: una o dos peticiones. Si la segunda necesita el ID creado por la primera
 * (lead.create: contacto → nota), `then` lo recibe.
 */
export interface WritePlan {
  first: HsRequest;
  then?: (createdId: string) => HsRequest;
}

const assoc = (toId: string, typeId: number) => ({ to: { id: toId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: typeId }] });

function noteFor(text: string, at: string, relatedId: string): HsRequest {
  const contact = toRemote('contact', relatedId);
  const deal = toRemote('deal', relatedId);
  return {
    method: 'POST',
    path: '/crm/v3/objects/notes',
    body: {
      properties: { hs_note_body: NOTE_MARK + text, hs_timestamp: at },
      associations: [contact ? assoc(contact, ASSOC.noteToContact) : assoc(deal!, ASSOC.noteToDeal)],
    },
  };
}

/** `null` = nada que escribir (p. ej. la etapa no tiene equivalente en el pipeline configurado). */
export function planWrite(c: RemoteChange, stages: StageMap, now = new Date().toISOString()): WritePlan | null {
  switch (c.type) {
    case 'task.create': {
      const contact = toRemote('contact', c.task.relatedId);
      const deal = toRemote('deal', c.task.relatedId);
      return {
        first: {
          method: 'POST',
          path: '/crm/v3/objects/tasks',
          body: {
            properties: {
              hs_task_subject: c.task.title,
              hs_timestamp: c.task.when,
              hs_task_status: 'NOT_STARTED',
              hs_task_type: c.task.kind === 'llamada' ? 'CALL' : 'TODO',
            },
            associations: contact ? [assoc(contact, ASSOC.taskToContact)] : deal ? [assoc(deal, ASSOC.taskToDeal)] : [],
          },
        },
      };
    }
    case 'task.complete':
      return { first: { method: 'PATCH', path: `/crm/v3/objects/tasks/${toRemote('task', c.id)}`, body: { properties: { hs_task_status: 'COMPLETED' } } } };
    case 'client.contacted':
      return { first: noteFor('Contacto registrado desde MUNAY.', now, c.id) };
    case 'activity.log':
      return { first: noteFor(c.activity.text, c.activity.at, c.activity.relatedId) };
    case 'operation.update': {
      const props: Record<string, string> = {};
      const stageId = c.patch.stage ? stages[c.patch.stage][0] : undefined;
      if (stageId) props.dealstage = stageId;
      if (c.patch.stage === 'cerrada') props.closedate = now;
      if (c.patch.priceUSD) props.amount = String(c.patch.priceUSD);
      if (c.patch.nextAction) props.hs_next_step = c.patch.nextAction;
      if (!stageId) delete props.closedate;
      if (!Object.keys(props).length) return null;
      return { first: { method: 'PATCH', path: `/crm/v3/objects/deals/${toRemote('deal', c.id)}`, body: { properties: props } } };
    }
    case 'lead.create': {
      const [firstname, ...rest] = c.lead.name.trim().split(/\s+/);
      const where = c.propertyLabel ? ` · ${c.propertyLabel}` : '';
      return {
        first: {
          method: 'POST',
          path: '/crm/v3/objects/contacts',
          body: { properties: { firstname, lastname: rest.join(' '), hs_lead_status: 'NEW', lifecyclestage: 'lead' } },
        },
        then: (contactId) => noteFor(`Lead desde QR (${c.lead.kind})${where}: ${c.lead.message}`, c.lead.at, PREFIX.contact + contactId),
      };
    }
  }
}
