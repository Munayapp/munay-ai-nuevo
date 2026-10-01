/**
 * PROXY LLM — Cloudflare Pages Function en POST /api/llm.
 *
 * Único lugar que conoce OPENAI_API_KEY (secreto del entorno: `.dev.vars` en local,
 * `wrangler pages secret put` en producción). El navegador nunca ve la clave ni elige
 * modelo, instrucciones o límites: solo `{ task, input }` de una lista cerrada.
 */
import { TASKS, isTask } from '../_lib/prompts';
import { type BaseEnv, fail, json, originAllowed, rateLimiter } from '../_lib/http';

interface Env extends BaseEnv {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
}

interface Context {
  request: Request;
  env: Env;
}

const DEFAULT_MODEL = 'gpt-5.6-luna';
const MAX_BODY_BYTES = 8_192;
const UPSTREAM_TIMEOUT_MS = 15_000;
const limited = rateLimiter(20, 60_000);

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
  if (limited(request)) return fail(429, 'Demasiadas solicitudes.');
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
