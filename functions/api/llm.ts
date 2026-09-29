/**
 * PROXY LLM — Cloudflare Pages Function en POST /api/llm.
 *
 * Único lugar que conoce OPENAI_API_KEY (secreto del entorno: `.dev.vars` en local,
 * `wrangler pages secret put` en producción). El navegador nunca ve la clave ni elige
 * modelo, instrucciones o límites: solo `{ task, input }` de una lista cerrada.
 */
import { TASKS, isTask } from '../_lib/prompts';

interface Env {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  /** Orígenes extra permitidos, separados por coma (p. ej. http://localhost:5173 en desarrollo). */
  ALLOWED_ORIGINS?: string;
}

interface Context {
  request: Request;
  env: Env;
}

const DEFAULT_MODEL = 'gpt-5.6-luna';
const MAX_BODY_BYTES = 8_192;
const UPSTREAM_TIMEOUT_MS = 15_000;
const RATE = { max: 20, windowMs: 60_000 };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

const fail = (status: number, error: string) => json(status, { error });

function originAllowed(request: Request, env: Env): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  if (origin === new URL(request.url).origin) return true;
  const extra = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return extra.includes(origin);
}

// Límite por instancia (best-effort). El límite real va como regla de Rate Limiting en Cloudflare.
const hits = new Map<string, { n: number; reset: number }>();
function limited(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.reset < now) {
    if (hits.size > 5_000) hits.clear();
    hits.set(ip, { n: 1, reset: now + RATE.windowMs });
    return false;
  }
  return ++h.n > RATE.max;
}

function outputText(data: unknown): string | undefined {
  const output = (data as { output?: { type: string; content?: { type: string; text?: string }[] }[] }).output;
  return output
    ?.filter((o) => o.type === 'message')
    .flatMap((o) => o.content ?? [])
    .find((c) => c.type === 'output_text')?.text;
}

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  if (!originAllowed(request, env)) return fail(403, 'Origen no permitido.');
  if (!env.OPENAI_API_KEY) return fail(503, 'Modelo no configurado.');
  if (limited(request.headers.get('CF-Connecting-IP') ?? 'local')) return fail(429, 'Demasiadas solicitudes.');
  if (Number(request.headers.get('Content-Length') ?? 0) > MAX_BODY_BYTES) return fail(413, 'Solicitud demasiado grande.');

  let body: { task?: unknown; input?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, 'JSON inválido.');
  }
  if (!isTask(body.task)) return fail(400, 'Tarea no permitida.');
  const task = TASKS[body.task];
  if (typeof body.input !== 'string' || !body.input.trim() || body.input.length > task.maxInputChars) {
    return fail(400, 'Entrada inválida.');
  }

  let res: Response;
  try {
    res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || DEFAULT_MODEL,
        instructions: task.instructions,
        input: body.input,
        max_output_tokens: task.maxOutputTokens,
        store: false,
        text: { format: { type: 'json_schema', name: body.task, schema: task.schema, strict: true } },
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return fail(504, 'El modelo no respondió a tiempo.');
  }
  if (!res.ok) {
    // Solo el estado: el cuerpo de error de OpenAI no se reenvía ni se registra.
    console.error(`openai ${res.status}`);
    return fail(502, 'El modelo no está disponible.');
  }

  const text = outputText(await res.json());
  if (!text) return fail(502, 'Respuesta vacía del modelo.');
  return json(200, { output: text });
};
