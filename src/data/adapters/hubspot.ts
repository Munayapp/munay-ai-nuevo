/**
 * ADAPTER HUBSPOT (FREE) — PREPARADO, NO CONECTADO.
 *
 * HubSpot es infraestructura de datos; MUNAY es la interfaz. El agente nunca ve HubSpot.
 *
 * Por qué no está activo:
 *   - La API de HubSpot no permite llamadas directas desde el navegador (CORS) y
 *     el token de una Private App no debe vivir en el cliente.
 *   - Requiere un proxy mínimo (p. ej. una función serverless en un plan gratuito)
 *     que guarde el token. Eso se decide en la Fase 8.
 *
 * Mapeo previsto (HubSpot → MUNAY):
 *   Contacts  → Client      (lifecyclestage, hs_lead_status → role / probability)
 *   Deals     → Operation   (dealstage → stage, amount → priceUSD)
 *   Deals (pipeline "Captaciones") → Listing (dealstage → CaptureStep)
 *   Tasks     → Task        (hs_task_subject, hs_timestamp)
 *   Notes / Engagements → Activity + Client.memory
 *   Custom object "Property" (o Deal properties) → Property
 *
 * Mapeo de cambios (MUNAY → HubSpot):
 *   task.create       → POST /crm/v3/objects/tasks
 *   task.complete     → PATCH /crm/v3/objects/tasks/{id} (hs_task_status=COMPLETED)
 *   client.contacted  → POST /crm/v3/objects/notes (+ asociación al contacto)
 *   listing.advance   → PATCH /crm/v3/objects/deals/{id} (dealstage)
 *   operation.update  → PATCH /crm/v3/objects/deals/{id}
 *   lead.create       → POST /crm/v3/objects/contacts (+ deal asociado a la propiedad)
 */
import type { DataSource } from '../source';

export interface HubSpotConfig {
  /** URL del proxy que guarda el token y reenvía a api.hubapi.com. */
  proxyUrl: string;
}

export function createHubSpotSource(config?: HubSpotConfig): DataSource {
  const notReady = () =>
    Promise.reject(new Error('HubSpot aún no está conectado. MUNAY usa los datos de demostración.'));
  return {
    id: 'hubspot',
    label: 'HubSpot (preparado)',
    isReady: () => Boolean(config?.proxyUrl) && false, // se habilita al implementar el proxy
    load: notReady,
    commit: notReady,
  };
}
