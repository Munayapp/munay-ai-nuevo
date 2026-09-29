import type { Change } from './changes';
import type { Workspace } from './types';

/**
 * Contrato único entre MUNAY y cualquier infraestructura de datos.
 * La interfaz nunca sabe si detrás hay mocks, HubSpot u otro CRM.
 */
export interface DataSource {
  readonly id: string;
  readonly label: string;
  /** true si la fuente está conectada y lista para usarse. */
  isReady(): boolean;
  load(): Promise<Workspace>;
  commit(change: Change, next: Workspace): Promise<void>;
  reset?(): Promise<Workspace>;
}
