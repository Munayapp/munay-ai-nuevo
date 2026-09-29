/** Alcance geográfico municipal P1 (decisión D3). No se amplía a otros distritos en esta fase. */
export const DISTRITOS_P1 = ['Miraflores', 'San Isidro', 'Barranco', 'Santiago de Surco'] as const;

export const enAlcanceP1 = (distrito?: string) => !distrito || (DISTRITOS_P1 as readonly string[]).includes(distrito);
