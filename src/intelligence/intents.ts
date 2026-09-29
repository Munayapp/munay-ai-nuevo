/**
 * Intenciones que entiende el RESOLVER. Compartido con el proxy (functions/) para que el modelo
 * solo pueda devolver intenciones que el motor local sabe resolver.
 */
export const INTENTS = [
  'documento', 'comision', 'alcabala', 'hipoteca', 'visita', 'captar',
  'crear', 'seguimiento', 'mercado', 'agenda', 'entidad', 'desconocido',
] as const;

export type Intent = (typeof INTENTS)[number];

export const isIntent = (x: unknown): x is Intent => typeof x === 'string' && (INTENTS as readonly string[]).includes(x);
