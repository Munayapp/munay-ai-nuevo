import type { Change } from './changes';
import type { Workspace } from './types';

/**
 * Contrato único entre MUNAY y cualquier infraestructura de datos.
 * La interfaz nunca sabe si detrás hay mocks, HubSpot u otro CRM.
 */
export interface DataSource {
  readonly id: string;
  readonly label: string;
  /**
   * true si algo de lo visible viene del conjunto de demostración (P1.2A: todo lo demo lleva DEMO).
   * Con HubSpot conectado sigue en true mientras el catálogo de propiedades sea el de demostración.
   */
  readonly demo: boolean;
  /** true si la fuente está conectada y lista para usarse. */
  isReady(): boolean;
  load(): Promise<Workspace>;
  commit(change: Change, next: Workspace): Promise<void>;
  reset?(): Promise<Workspace>;
}
