/**
 * Todo cambio de datos es un evento explícito.
 * El store lo aplica al instante (optimista) y la fuente activa lo persiste
 * (localStorage hoy; HubSpot u otro CRM cuando exista el adapter real).
 */
import type { Activity, CaptureStep, ID, Lead, Operation, Task, Workspace } from './types';

export type Change =
  | { type: 'task.create'; task: Task }
  | { type: 'task.complete'; id: ID }
  | { type: 'client.contacted'; id: ID }
  | { type: 'activity.log'; activity: Activity }
  | { type: 'lead.create'; lead: Lead }
  | { type: 'lead.seen'; id: ID }
  | { type: 'listing.advance'; id: ID; step: CaptureStep }
  | { type: 'operation.update'; id: ID; patch: Partial<Operation> };

export function applyChange(ws: Workspace, c: Change): Workspace {
  switch (c.type) {
    case 'task.create':
      return { ...ws, tasks: [...ws.tasks, c.task] };
    case 'task.complete':
      return { ...ws, tasks: ws.tasks.map((t) => (t.id === c.id ? { ...t, done: true } : t)) };
    case 'client.contacted':
      return { ...ws, clients: ws.clients.map((x) => (x.id === c.id ? { ...x, lastContactDays: 0 } : x)) };
    case 'activity.log':
      return { ...ws, activities: [c.activity, ...ws.activities].slice(0, 60) };
    case 'lead.create':
      return { ...ws, leads: [c.lead, ...ws.leads] };
    case 'lead.seen':
      return { ...ws, leads: ws.leads.map((l) => (l.id === c.id ? { ...l, seen: true } : l)) };
    case 'listing.advance': {
      const listing = ws.listings.find((l) => l.id === c.id);
      return {
        ...ws,
        listings: ws.listings.map((l) => (l.id === c.id ? { ...l, step: c.step, daysInStep: 0 } : l)),
        properties:
          c.step === 'activa' && listing
            ? ws.properties.map((p) => (p.id === listing.propertyId ? { ...p, status: 'activa' } : p))
            : ws.properties,
      };
    }
    case 'operation.update':
      return { ...ws, operations: ws.operations.map((o) => (o.id === c.id ? { ...o, ...c.patch } : o)) };
  }
}

let n = 0;
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(n++).toString(36)}`;
