import type { DataSource } from '../source';
import type { Workspace } from '../types';
import { createSeed } from '../mock/seed';

const KEY = 'munay.workspace.v1';

/** Fuente de demostración: datos semilla + persistencia en el navegador. Costo S/0. */
export const localMockSource: DataSource = {
  id: 'local-mock',
  label: 'Datos de demostración (este dispositivo)',
  demo: true,
  isReady: () => true,

  async load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw) as Workspace;
    } catch {
      /* almacenamiento no disponible: seguimos con la semilla */
    }
    return createSeed();
  },

  async commit(_change, next) {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* sin persistencia en modo privado; la sesión sigue funcionando */
    }
  },

  async reset() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* noop */
    }
    return createSeed();
  },
};
