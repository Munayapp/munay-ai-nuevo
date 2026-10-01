/**
 * Registro de integraciones. Muestra con honestidad qué está activo y qué está preparado.
 * Nada aquí finge una conexión que no existe.
 */
import { localMockSource } from './adapters/localMock';
import { createHubSpotSource } from './adapters/hubspot';
import type { DataSource } from './source';

export interface Integration {
  id: string;
  name: string;
  purpose: string;
  status: 'activa' | 'preparada' | 'futura';
}

export const integrations: Integration[] = [
  { id: 'local-mock', name: 'Datos de demostración', purpose: 'Agente, clientes, propiedades y operaciones de ejemplo.', status: 'activa' },
  { id: 'speech', name: 'Dictado por voz', purpose: 'Reconocimiento de voz del navegador, sin costo.', status: 'activa' },
  { id: 'local-rules', name: 'Motor de intención local', purpose: 'Interpreta lo que pides y te lleva al lugar correcto.', status: 'activa' },
  { id: 'hubspot', name: 'HubSpot Free', purpose: 'Clientes, negocios, tareas y notas desde tu CRM, vía el proxy del servidor.', status: 'preparada' },
  { id: 'llm', name: 'Modelo de lenguaje', purpose: 'Lectura real de documentos y redacción abierta.', status: 'preparada' },
  { id: 'esign', name: 'Firma digital', purpose: 'Autorizaciones de venta firmadas dentro del flujo.', status: 'preparada' },
  { id: 'mls', name: 'Fuentes MLS / portales', purpose: 'Inventario y comparables reales.', status: 'futura' },
];

export const hubspotSource = createHubSpotSource();

/** Si HubSpot falla al cargar, el store vuelve a la demo y lo registra aquí. */
let fallback = false;
export const fallBackToLocal = () => {
  fallback = true;
};

/** Fuente activa: la primera lista para usarse. */
export function activeSource(): DataSource {
  return hubspotSource.isReady() && !fallback ? hubspotSource : localMockSource;
}

/** Estado real de cada integración (HubSpot pasa a activa solo si es la fuente en uso). */
export const integrationStatus = (i: Integration): Integration['status'] =>
  i.id === 'hubspot' && activeSource().id === 'hubspot' ? 'activa' : i.status;

/** true mientras algo visible viene del conjunto de demostración (P1.2A: todo lo visible lleva DEMO). */
export const esDemo = () => activeSource().demo;
