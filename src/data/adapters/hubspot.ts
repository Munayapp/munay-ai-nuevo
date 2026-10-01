/**
 * ADAPTER HUBSPOT (FREE) — modo híbrido.
 *
 * HubSpot es infraestructura de datos; MUNAY es la interfaz. El agente nunca ve HubSpot.
 * El navegador no tiene el token: habla con `functions/api/hubspot.ts`, que lo guarda y traduce
 * (mapeo completo en `functions/_lib/hubspot.ts`).
 *
 *   Desde HubSpot:          clientes (Contacts), operaciones (Deals), tareas (Tasks), actividad (Notes).
 *   En este dispositivo:    agente, propiedades y sus propietarios, captaciones, documentos, leads,
 *                           mercado. HubSpot Free no tiene un objeto "Propiedad"; el catálogo sigue
 *                           siendo el de demostración, por eso la fuente se declara `demo`.
 *
 * Un Deal aparece como operación si su `munay_property_id` existe en el catálogo y tiene un contacto
 * comprador asociado. Lo demás se cuenta en `skipped` para decirlo, no se inventa.
 *
 * Se activa con `VITE_CRM=hubspot` en el build y la clave de acceso (MUNAY_ACCESS_KEY) guardada
 * desde Perfil en este dispositivo.
 */
import type { Change } from '../changes';
import type { DataSource } from '../source';
import type { Activity, Client, Operation, Task, Workspace } from '../types';
import { createSeed } from '../mock/seed.ts';

const ENDPOINT = '/api/hubspot';
const TIMEOUT_MS = 15_000;
const KEY_STORAGE = 'munay.hubspot.key';
const LOCAL = 'munay.workspace.hubspot.v1';

/** true si este build incluye la integración (Perfil muestra cómo conectarla). */
export const hubspotEnabled = import.meta.env?.VITE_CRM === 'hubspot';

export const hubspotKey = {
  get(): string | null {
    try {
      return localStorage.getItem(KEY_STORAGE);
    } catch {
      return null;
    }
  },
  set(key: string | null) {
    try {
      if (key) localStorage.setItem(KEY_STORAGE, key);
      else localStorage.removeItem(KEY_STORAGE);
    } catch {
      /* sin almacenamiento: no se puede recordar la clave */
    }
  },
};

interface Snapshot {
  clients: Client[];
  operations: (Omit<Operation, 'commissionRate'> & { commissionRate?: number })[];
  tasks: Task[];
  activities: Activity[];
}

/** Lo que MUNAY no pudo mostrar de HubSpot en la última carga. */
export const hubspotStatus = { skippedDeals: 0, loadedAt: '' };

const isRemote = (id?: string) => !!id?.startsWith('hs-');

async function call(method: 'GET' | 'POST', body?: unknown): Promise<any> {
  const res = await fetch(ENDPOINT, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Munay-Key': hubspotKey.get() ?? '' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : `HubSpot: ${res.status}`);
  return data;
}

/** Catálogo local: la semilla sin los datos de CRM de demostración (esos vienen de HubSpot). */
function localBase(): Workspace {
  const seed = createSeed();
  const owners = new Set([...seed.listings.map((l) => l.ownerId), ...seed.properties.map((p) => p.ownerId)]);
  return {
    ...seed,
    clients: seed.clients.filter((c) => owners.has(c.id)),
    operations: [],
    tasks: [],
    activities: [],
    leads: [],
  };
}

function readLocal(): Workspace {
  try {
    const raw = localStorage.getItem(LOCAL);
    if (raw) return JSON.parse(raw) as Workspace;
  } catch {
    /* seguimos con la base */
  }
  return localBase();
}

function saveLocal(ws: Workspace) {
  try {
    localStorage.setItem(LOCAL, JSON.stringify(ws));
  } catch {
    /* sin persistencia local; HubSpot conserva lo suyo */
  }
}

/** Une el catálogo local con la instantánea del CRM. Exportado para las pruebas. */
export function merge(local: Workspace, snap: Snapshot): { ws: Workspace; skippedDeals: number } {
  const propertyIds = new Set(local.properties.map((p) => p.id));
  const owners = local.clients.filter((c) => !isRemote(c.id));
  const clients = [...snap.clients.map((c) => ({ ...c, propertyIds: c.propertyIds.filter((id) => propertyIds.has(id)) })), ...owners];
  const clientIds = new Set(clients.map((c) => c.id));
  const operations = snap.operations
    .filter((o) => propertyIds.has(o.propertyId) && clientIds.has(o.buyerId))
    .map((o) => ({ ...o, commissionRate: o.commissionRate ?? local.agent.commissionRate, sellerId: o.sellerId && clientIds.has(o.sellerId) ? o.sellerId : undefined }));
  // Actividad local que no está en HubSpot (contenido creado, captaciones) + notas del CRM.
  const activities = [...snap.activities, ...local.activities.filter((a) => !isRemote(a.id) && !isRemote(a.relatedId))]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 60);
  return {
    ws: { ...local, clients, operations, tasks: snap.tasks, activities },
    skippedDeals: snap.operations.length - operations.length,
  };
}

export function createHubSpotSource(): DataSource {
  /** IDs locales de tareas creadas en esta sesión → ID en HubSpot. */
  const ids = new Map<string, string>();
  /** client.contacted espera un instante: si le sigue un activity.log del mismo cliente, basta una nota. */
  const pendingContact = new Map<string, Promise<void>>();
  const cancelContact = new Set<string>();

  const send = (change: unknown, extra?: Record<string, unknown>) => call('POST', { change, ...extra });

  async function push(c: Change, next: Workspace): Promise<void> {
    switch (c.type) {
      case 'task.create': {
        const { remoteId } = await send({ ...c, task: { ...c.task, relatedId: isRemote(c.task.relatedId) ? c.task.relatedId : undefined } });
        if (remoteId) ids.set(c.task.id, `hs-t-${remoteId}`);
        return;
      }
      case 'task.complete': {
        const id = ids.get(c.id) ?? c.id;
        if (isRemote(id)) await send({ ...c, id });
        return;
      }
      case 'client.contacted': {
        if (!isRemote(c.id)) return;
        cancelContact.delete(c.id);
        const p = new Promise<void>((r) => setTimeout(r, 0)).then(async () => {
          if (!cancelContact.delete(c.id)) await send(c);
        });
        pendingContact.set(c.id, p);
        return p.finally(() => pendingContact.delete(c.id));
      }
      case 'activity.log': {
        const rel = c.activity.relatedId;
        if (!isRemote(rel)) return;
        if (rel && pendingContact.has(rel)) cancelContact.add(rel);
        await send(c);
        return;
      }
      case 'operation.update':
        if (isRemote(c.id)) await send(c);
        return;
      case 'lead.create': {
        const p = next.properties.find((x) => x.id === c.lead.propertyId);
        await send(c, p ? { propertyLabel: `${p.type} · ${p.address}` } : undefined);
        return;
      }
      default:
        return; // captaciones y leads vistos viven en este dispositivo
    }
  }

  async function load(local: Workspace): Promise<Workspace> {
    const snap = (await call('GET')) as Snapshot;
    const { ws, skippedDeals } = merge(local, snap);
    hubspotStatus.skippedDeals = skippedDeals;
    hubspotStatus.loadedAt = new Date().toISOString();
    saveLocal(ws);
    return ws;
  }

  return {
    id: 'hubspot',
    label: 'HubSpot + catálogo de este dispositivo',
    demo: true,
    isReady: () => hubspotEnabled && Boolean(hubspotKey.get()),
    load: () => load(readLocal()),
    async commit(change, next) {
      saveLocal(next);
      await push(change, next);
    },
    async reset() {
      try {
        localStorage.removeItem(LOCAL);
      } catch {
        /* noop */
      }
      return load(localBase());
    },
  };
}
