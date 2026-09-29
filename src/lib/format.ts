const nf = new Intl.NumberFormat('en-US');

// Espacio no separable: el símbolo nunca queda en una línea y la cifra en otra.
const NB = ' ';
export const usd = (n: number) => `US$${NB}${nf.format(Math.round(n))}`;
export const usdK = (n: number) => `US$${NB}${Math.round(n / 1000)}K`;
export const pen = (n: number) => `S/${NB}${nf.format(Math.round(n))}`;
export const penK = (n: number) => (n >= 1000 ? `S/${NB}${(n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, '')}K` : pen(n));
export const pct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`;
export const signedPct = (n: number, digits = 1) => `${n >= 0 ? '+' : '−'}${Math.abs(n * 100).toFixed(digits)}%`;

export function time(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function dayDiff(iso: string) {
  const d = new Date(iso);
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(d); b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function dayLabel(iso: string) {
  const diff = dayDiff(iso);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  const s = new Date(iso).toLocaleDateString('es-PE', { weekday: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function relative(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿?¡!.,;:]/g, ' ').replace(/\s+/g, ' ').trim();
