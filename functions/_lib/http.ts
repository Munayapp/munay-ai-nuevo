/**
 * Utilidades compartidas por los proxies de servidor (LLM, HubSpot):
 * respuestas JSON, verificación de origen, rate limit best-effort y clave de acceso.
 */

export interface BaseEnv {
  /** Orígenes extra permitidos, separados por coma (p. ej. http://localhost:5173 en desarrollo). */
  ALLOWED_ORIGINS?: string;
}

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

export const fail = (status: number, error: string) => json(status, { error });

export function originAllowed(request: Request, env: BaseEnv): boolean {
  const origin = request.headers.get('Origin');
  // Los navegadores no envían Origin en un GET del mismo origen; sí envían Sec-Fetch-Site.
  if (!origin) return request.method === 'GET' && request.headers.get('Sec-Fetch-Site') === 'same-origin';
  if (origin === new URL(request.url).origin) return true;
  const extra = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return extra.includes(origin);
}

/** Límite por instancia (best-effort). El límite real va como regla de Rate Limiting en Cloudflare. */
export function rateLimiter(max: number, windowMs: number) {
  const hits = new Map<string, { n: number; reset: number }>();
  return (request: Request): boolean => {
    const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
    const now = Date.now();
    const h = hits.get(ip);
    if (!h || h.reset < now) {
      if (hits.size > 5_000) hits.clear();
      hits.set(ip, { n: 1, reset: now + windowMs });
      return false;
    }
    return ++h.n > max;
  };
}

/** Comparación en tiempo constante (sobre el hash) de la clave enviada con la esperada. */
export async function keyMatches(given: string | null, expected: string): Promise<boolean> {
  if (!given) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(given)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
