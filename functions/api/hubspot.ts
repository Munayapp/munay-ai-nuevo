/**
 * PROXY HUBSPOT — Cloudflare Pages Function en /api/hubspot.
 *
 *   GET  → instantánea del CRM ya traducida al modelo de MUNAY (clientes, operaciones, tareas, actividad).
 *   POST → { change } de una lista cerrada (ver _lib/hubspot.ts) que se escribe en HubSpot.
 *
 * Único lugar que conoce HUBSPOT_TOKEN (token de una Private App). No es un proxy abierto:
 * el navegador nunca elige endpoint, método ni propiedades. Como devuelve datos de clientes,
 * exige además MUNAY_ACCESS_KEY en la cabecera `X-Munay-Key` (sin clave configurada, no responde).
 */
import { type BaseEnv, fail, json, keyMatches, originAllowed, rateLimiter } from '../_lib/http';
import { type HsObject, type HsRequest, PROPS, buildSnapshot, parseChange, parseStages, planWrite } from '../_lib/hubspot';

interface Env extends BaseEnv {
  HUBSPOT_TOKEN?: string;
  MUNAY_ACCESS_KEY?: string;
  /** JSON etapa MUNAY → IDs de etapa HubSpot. Ver DEFAULT_STAGES. */
  HUBSPOT_DEAL_STAGES?: string;
}

interface Context {
  request: Request;
  env: Env;
}

const API = 'https://api.hubapi.com';
const MAX_BODY_BYTES = 8_192;
const UPSTREAM_TIMEOUT_MS = 12_000;
const PAGE_SIZE = 100;
const MAX_PAGES = 5; // hasta 500 registros por objeto
const limited = rateLimiter(60, 60_000);

class Upstream extends Error {
  constructor(readonly status: number) {
    super(`hubspot ${status}`);
  }
}

async function hs(env: Env, path: string, init?: { method: string; body: unknown }): Promise<any> {
  let res: Response;
  try {
    res = await fetch(API + path, {
      method: init?.method ?? 'GET',
      headers: { Authorization: `Bearer ${env.HUBSPOT_TOKEN}`, 'Content-Type': 'application/json' },
      body: init ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    throw new Upstream(504);
  }
  // Solo el estado: el cuerpo de error de HubSpot no se reenvía ni se registra (puede traer datos).
  if (!res.ok) throw new Upstream(res.status);
  return res.json();
}

async function list(env: Env, object: keyof typeof PROPS, associations: string[]): Promise<HsObject[]> {
  const out: HsObject[] = [];
  let after: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const q = new URLSearchParams({ limit: String(PAGE_SIZE), archived: 'false', properties: PROPS[object].join(',') });
    if (associations.length) q.set('associations', associations.join(','));
    if (after) q.set('after', after);
    const data = await hs(env, `/crm/v3/objects/${object}?${q}`);
    out.push(...((data.results ?? []) as HsObject[]));
    after = data.paging?.next?.after;
    if (!after) break;
  }
  return out;
}

function upstreamError(e: unknown): Response {
  const status = e instanceof Upstream ? e.status : 500;
  console.error(`hubspot ${status}`);
  if (status === 401 || status === 403) return fail(502, 'HubSpot rechazó el token o le faltan permisos.');
  if (status === 429) return fail(503, 'HubSpot está limitando las solicitudes. Intenta en un minuto.');
  if (status === 504) return fail(504, 'HubSpot no respondió a tiempo.');
  return fail(502, 'HubSpot no está disponible.');
}

async function guard(request: Request, env: Env): Promise<Response | null> {
  if (!originAllowed(request, env)) return fail(403, 'Origen no permitido.');
  if (!env.HUBSPOT_TOKEN || !env.MUNAY_ACCESS_KEY) return fail(503, 'HubSpot no configurado.');
  if (limited(request)) return fail(429, 'Demasiadas solicitudes.');
  if (!(await keyMatches(request.headers.get('X-Munay-Key'), env.MUNAY_ACCESS_KEY))) return fail(401, 'Clave de acceso inválida.');
  return null;
}

export const onRequestGet = async ({ request, env }: Context): Promise<Response> => {
  const denied = await guard(request, env);
  if (denied) return denied;
  try {
    const [contacts, deals, tasks, notes] = await Promise.all([
      list(env, 'contacts', []),
      list(env, 'deals', ['contacts']),
      list(env, 'tasks', ['contacts', 'deals']),
      list(env, 'notes', ['contacts', 'deals']),
    ]);
    return json(200, buildSnapshot({ contacts, deals, tasks, notes }, parseStages(env.HUBSPOT_DEAL_STAGES)));
  } catch (e) {
    return upstreamError(e);
  }
};

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  const denied = await guard(request, env);
  if (denied) return denied;
  if (Number(request.headers.get('Content-Length') ?? 0) > MAX_BODY_BYTES) return fail(413, 'Solicitud demasiado grande.');

  let body: { change?: unknown; propertyLabel?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, 'JSON inválido.');
  }
  const change = parseChange(body.change && typeof body.change === 'object' ? { ...body.change, propertyLabel: body.propertyLabel } : null);
  if (!change) return fail(400, 'Cambio no permitido.');

  const plan = planWrite(change, parseStages(env.HUBSPOT_DEAL_STAGES));
  if (!plan) return json(200, { ok: true, skipped: true });

  const send = (r: HsRequest) => hs(env, r.path, { method: r.method, body: r.body });
  try {
    const created = await send(plan.first);
    if (plan.then && created?.id) await send(plan.then(String(created.id)));
    return json(200, { ok: true, remoteId: created?.id ? String(created.id) : undefined });
  } catch (e) {
    return upstreamError(e);
  }
};
