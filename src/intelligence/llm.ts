/**
 * Punto de extensión para un modelo de lenguaje.
 *
 * El navegador nunca tiene claves: habla con nuestro proxy (`functions/api/llm.ts`), que guarda
 * OPENAI_API_KEY y solo acepta tareas de una lista cerrada. Si el proxy no está (dev sin
 * `npm run dev:api`, hosting estático) o falla, MUNAY sigue con el motor local (resolver.ts,
 * creative.ts, docReader.ts) manteniendo los mismos contratos `Resolution`, `Creation` y `DocReading`.
 */
import { isIntent, type Intent } from './intents';

export type LlmTask = 'interpret';

export interface LanguageModel {
  id: string;
  complete(input: { task: LlmTask; input: string }): Promise<string>;
}

const ENDPOINT = '/api/llm';
const TIMEOUT_MS = 8_000;

function proxyModel(): LanguageModel {
  // Si el proxy no existe o no tiene clave, deja de intentarlo en esta sesión.
  let unavailable = false;
  return {
    id: 'proxy',
    async complete({ task, input }) {
      if (unavailable) throw new Error('Modelo no disponible.');
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, input }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status === 404 || res.status === 405 || res.status === 503) unavailable = true;
      if (!res.ok) throw new Error(`Modelo: ${res.status}`);
      const { output } = (await res.json()) as { output?: unknown };
      if (typeof output !== 'string') throw new Error('Modelo: respuesta inválida.');
      return output;
    },
  };
}

export const languageModel: LanguageModel | null = import.meta.env.VITE_LLM === 'off' ? null : proxyModel();

/** Interpreta un pedido que el motor local no entendió. `null` = seguir con el motor local. */
export async function interpret(text: string): Promise<{ intent: Intent; rewritten: string } | null> {
  if (!languageModel) return null;
  try {
    const out = JSON.parse(await languageModel.complete({ task: 'interpret', input: text.slice(0, 1000) }));
    if (!isIntent(out?.intent) || typeof out.rewritten !== 'string') return null;
    return { intent: out.intent, rewritten: out.rewritten.slice(0, 300) };
  } catch {
    return null;
  }
}
