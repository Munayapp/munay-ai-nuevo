/**
 * Punto de extensión para un modelo de lenguaje.
 *
 * Hoy: `null` → MUNAY usa el motor local (resolver.ts, creative.ts, docReader.ts).
 * Mañana: un proveedor que implemente `LanguageModel` (a través de un proxy propio,
 * nunca con claves en el navegador) puede enriquecer interpretación, redacción y lectura
 * de PDF manteniendo los mismos contratos `Resolution`, `Creation` y `DocReading`.
 */
export interface LanguageModel {
  id: string;
  complete(input: { system: string; prompt: string; json?: boolean }): Promise<string>;
}

export const languageModel: LanguageModel | null = null;
