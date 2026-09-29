/**
 * MEMORY — capa transversal. MUNAY no empieza de cero cada vez.
 * Recuerda en qué estabas (foco), lo que pediste y lo que hiciste.
 * Persistencia local hoy; migrable a CRM (notas/engagements) o a una base propia.
 */
import type { ID } from '../data/types';

export interface Focus {
  propertyId?: ID;
  clientId?: ID;
  operationId?: ID;
  listingId?: ID;
  at?: string;
}

export interface MemoryState {
  focus: Focus;
  prompts: { text: string; at: string }[];
  sessions: number;
}

const KEY = 'munay.memory.v1';
const empty: MemoryState = { focus: {}, prompts: [], sessions: 0 };

function read(): MemoryState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : { ...empty };
  } catch {
    return { ...empty };
  }
}

let state = read();
let started = false;

function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* sin persistencia disponible */
  }
}

export const memory = {
  get: () => state,
  /** Actualiza el foco: "esta propiedad", "esta venta", "este cliente" se resuelven con él. */
  focus(f: Focus) {
    state = { ...state, focus: { ...state.focus, ...f, at: new Date().toISOString() } };
    write();
  },
  prompt(text: string) {
    state = { ...state, prompts: [{ text, at: new Date().toISOString() }, ...state.prompts].slice(0, 20) };
    write();
  },
  startSession() {
    if (started) return;
    started = true;
    state = { ...state, sessions: state.sessions + 1 };
    write();
  },
  clear() {
    state = { ...empty };
    write();
  },
};
