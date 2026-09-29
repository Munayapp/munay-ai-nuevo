/**
 * LEGAL — primera capa de inteligencia documental. No sustituye asesoría legal.
 *
 * Qué es real hoy (S/0): lectura de archivos de texto (.txt, .md, .csv) en el navegador
 * y extracción de datos por patrones (montos, áreas, partidas, plazos, fechas).
 * Qué está preparado: PDF/imagen requieren OCR o un modelo; se reconoce el tipo por nombre
 * y se marca claramente como lectura preliminar.
 *
 * P1.2A — Truth Gate: separa tres cosas que antes se mezclaban en "Qué falta":
 *   - backed:  requisito respaldado por una unidad ACTIVA del Core (hoy ninguna: la lista queda vacía);
 *   - missing: revisión sugerida — práctica MUNAY, NO verificada, nunca presentada como requisito legal;
 *   - pending: datos que no se pudieron leer o encontrar en el documento.
 * Plazos de vigencia (p. ej. antigüedad de la copia literal) solo pueden venir del Core, no de aquí.
 */
import type { Doc } from '../data/types';

export interface DocReading {
  doc: Doc;
  real: boolean;
  note: string;
}

const KINDS: [RegExp, string][] = [
  [/arras/i, 'Contrato de arras'],
  [/minuta|compraventa/i, 'Minuta de compraventa'],
  [/partida|literal|registral|sunarp/i, 'Partida registral'],
  [/\b(hr|pu)\b|autoval/i,'Declaración jurada de autovalúo'],
  [/tasaci/i, 'Informe de tasación'],
  [/autoriz|exclusiv/i, 'Autorización de venta'],
  [/alquiler|arrend/i, 'Contrato de arrendamiento'],
];

function guessKind(name: string, text = '') {
  const hay = `${name} ${text.slice(0, 400)}`;
  return KINDS.find(([re]) => re.test(hay))?.[1] ?? 'Documento';
}

const CHECKLIST: Record<string, { missing: string[]; questions: string[] }> = {
  'Contrato de arras': {
    missing: ['Identificación completa de ambas partes.', 'Número de partida registral.', 'Fecha límite para la minuta.'],
    questions: ['¿La penalidad es equivalente para comprador y vendedor?', '¿Quién asume los gastos notariales y registrales?'],
  },
  'Minuta de compraventa': {
    missing: ['Copia literal actualizada (la vigencia exigible está pendiente de verificación en el Core).', 'Constancia de no adeudo de arbitrios.', 'Autovalúo del año.'],
    questions: ['¿Existen cargas o gravámenes por levantar?', '¿El medio de pago queda bancarizado?'],
  },
  'Partida registral': {
    missing: ['Copia literal reciente (la vigencia exigible está pendiente de verificación en el Core).'],
    questions: ['¿Los titulares coinciden con quienes firmarán?', '¿Hay hipotecas, embargos o medidas cautelares vigentes?'],
  },
  'Autorización de venta': {
    missing: ['Confirmar que firman todos los titulares registrales.'],
    questions: ['¿El plazo de exclusividad y la comisión están claros para el propietario?'],
  },
};

function extract(text: string): [string, string][] {
  const out: [string, string][] = [];
  const money = text.match(/(US\$|S\/)\s?[\d.,]+/g);
  if (money) out.push(['Montos', [...new Set(money)].slice(0, 3).join(' · ')]);
  const area = text.match(/[\d.,]+\s?m(2|²)/i);
  if (area) out.push(['Área', area[0]]);
  const partida = text.match(/partida\s*(n[°º.]?\s*)?(\d{6,})/i);
  if (partida) out.push(['Partida', partida[2]]);
  const plazo = text.match(/(\d{1,3})\s*d[ií]as/i);
  if (plazo) out.push(['Plazo', `${plazo[1]} días`]);
  const date = text.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/);
  if (date) out.push(['Fecha', date[0]]);
  return out;
}

function pending(extracted: [string, string][]): string[] {
  const has = (k: string) => extracted.some(([x]) => x === k);
  return [
    ...(has('Montos') ? [] : ['No encontré montos en el texto.']),
    ...(has('Partida') ? [] : ['No encontré un número de partida en el texto.']),
    ...(has('Fecha') ? [] : ['No encontré fechas en el texto.']),
  ];
}

function flags(text: string): string[] {
  const f: string[] = [];
  // Detecciones por palabra clave: señalan qué mirar, no concluyen nada.
  if (/hipoteca|gravamen|embargo/i.test(text)) f.push('Detecté la palabra hipoteca, gravamen o embargo: revisar la partida.');
  if (/penalidad/i.test(text)) f.push('Detecté la palabra penalidad: revisar su redacción.');
  if (!/firma/i.test(text)) f.push('No encontré la palabra firma en el texto.');
  return f;
}

export async function readFile(file: File): Promise<DocReading> {
  const isText = /\.(txt|md|csv)$/i.test(file.name) || file.type.startsWith('text/');
  const text = isText ? await file.text() : '';
  const kind = guessKind(file.name, text);
  const list = CHECKLIST[kind] ?? { missing: ['Identificar partes, inmueble y montos.'], questions: ['¿Qué decisión depende de este documento?'] };
  const extracted = isText ? extract(text) : [];
  const words = text.split(/\s+/).filter(Boolean).length;

  const doc: Doc = {
    id: `upload-${file.name}`,
    name: file.name,
    kind,
    status: 'recibido',
    pages: isText ? Math.max(1, Math.round(words / 450)) : 0,
    summary: isText
      ? `${kind} de ${words} palabras. ${extracted.length ? `Encontré ${extracted.length} datos clave.` : 'No encontré montos ni áreas explícitas.'}`
      : `Parece un ${kind.toLowerCase()}. Preparé la lista de revisión estándar para este tipo de documento.`,
    extracted,
    flags: isText ? flags(text) : [],
    missing: list.missing,
    questions: list.questions,
    // Sin unidades ACTIVAS en el Core para requisitos documentales: nada se presenta como requisito respaldado.
    backed: [],
    pending: isText ? pending(extracted) : ['No leí el contenido (PDF o imagen): ningún dato de este documento está verificado.'],
  };

  return {
    doc,
    real: isText,
    note: isText
      ? 'Lectura local del texto. Primera capa: valida siempre con abogado o notaría.'
      : 'Lectura preliminar: PDF e imágenes necesitan un modelo conectado para leer el contenido. Por ahora reviso por tipo de documento.',
  };
}
