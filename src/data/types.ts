/**
 * Modelo de dominio de MUNAY.
 * Independiente de la fuente: mocks hoy, HubSpot / otros CRM mañana (ver data/adapters).
 */

export type ID = string;

export type District = 'Miraflores' | 'San Isidro' | 'Barranco' | 'Santiago de Surco' | 'La Molina';

export type SceneVariant = 'facade' | 'interior' | 'stairs' | 'tower' | 'terrace';

export interface Agent {
  id: ID;
  name: string;
  firstName: string;
  initials: string;
  role: string;
  city: string;
  /** Comisión estándar sobre precio de venta (0.03 = 3%). */
  commissionRate: number;
  /** Parte que retiene la agencia/broker (0.3 = 30%). */
  agencySplit: number;
  goals: { monthlyOps: number; monthlyCommissionPEN: number };
  metrics: { conversion: number; avgDaysToClose: number; visitsThisMonth: number };
  preferences: { tone: 'cercano' | 'formal' | 'editorial'; focusDistricts: District[] };
}

export type PropertyStatus = 'captación' | 'activa' | 'en negociación' | 'documentación' | 'tasación' | 'vendida';

export interface Property {
  id: ID;
  type: 'Departamento' | 'Casa' | 'Oficina' | 'Dúplex' | 'Loft';
  district: District;
  address: string;
  areaM2: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  floor?: number;
  priceUSD: number;
  status: PropertyStatus;
  features: string[];
  /** Frase editorial de la propiedad; alimenta CREA. */
  story: string;
  /** Imagen conceptual generativa (fallback siempre disponible). */
  scene: SceneVariant;
  seed: number;
  /**
   * Fotografía real opcional: ruta local (p. ej. '/photos/p-pardo.jpg' dentro de public/)
   * o URL que entregue el CRM. Si existe, reemplaza a `scene` sin cambiar ningún layout.
   */
  photo?: string;
  views7d: number;
  inquiries7d: number;
  daysOnMarket: number;
  ownerId?: ID;
  /** Posición normalizada 0..1 en el mapa de zona. */
  map: { x: number; y: number };
}

export type ClientRole = 'comprador' | 'propietario' | 'inversionista';

export interface Client {
  id: ID;
  name: string;
  role: ClientRole;
  phone: string;
  budgetUSD?: [number, number];
  districts: District[];
  wants: string;
  probability: number;
  lastContactDays: number;
  propertyIds: ID[];
  /** Hechos que MUNAY recuerda del cliente (MEMORY). */
  memory: string[];
}

export type OperationStage = 'negociación' | 'documentación' | 'tasación' | 'firma' | 'cerrada';

export interface Operation {
  id: ID;
  propertyId: ID;
  buyerId: ID;
  sellerId?: ID;
  stage: OperationStage;
  priceUSD: number;
  happened: string[];
  missing: string[];
  risks: string[];
  nextAction: string;
  nextDue: string;
  commissionRate: number;
  closedAt?: string;
}

export const CAPTURE_STEPS = ['prospecto', 'preparación', 'análisis', 'propuesta', 'autorización', 'firma', 'activa'] as const;
export type CaptureStep = (typeof CAPTURE_STEPS)[number];

export interface Listing {
  id: ID;
  propertyId: ID;
  ownerId: ID;
  step: CaptureStep;
  exclusive: boolean;
  daysInStep: number;
  note: string;
}

export interface Comparable {
  id: ID;
  district: District;
  type: Property['type'];
  address: string;
  areaM2: number;
  bedrooms: number;
  priceUSD: number;
  distanceBlocks: number;
  status: 'publicado' | 'vendido';
  daysListed: number;
  seed: number;
  /** Fotografía real opcional (misma regla que Property.photo). */
  photo?: string;
}

export interface PricePoint {
  month: string;
  usdM2: number;
}

export interface Zone {
  district: District;
  medianUSDm2: number;
  changeYoY: number;
  daysOnMarket: number;
  demand: 'alta' | 'media' | 'baja';
  inventory: number;
  series: PricePoint[];
  reading: string;
}

export type DocStatus = 'recibido' | 'pendiente' | 'observado';

export interface Doc {
  id: ID;
  name: string;
  kind: string;
  propertyId?: ID;
  operationId?: ID;
  status: DocStatus;
  pages: number;
  summary: string;
  extracted: [string, string][];
  flags: string[];
  missing: string[];
  questions: string[];
}

export interface Task {
  id: ID;
  title: string;
  when: string; // ISO
  kind: 'visita' | 'llamada' | 'documento' | 'contenido' | 'firma';
  relatedId?: ID;
  done: boolean;
}

export interface Activity {
  id: ID;
  at: string; // ISO
  text: string;
  relatedId?: ID;
}

export interface Lead {
  id: ID;
  propertyId: ID;
  name: string;
  kind: 'visita' | 'interés' | 'pregunta';
  message: string;
  at: string;
  seen: boolean;
}

export interface Workspace {
  agent: Agent;
  properties: Property[];
  clients: Client[];
  operations: Operation[];
  listings: Listing[];
  comparables: Comparable[];
  zones: Zone[];
  documents: Doc[];
  tasks: Task[];
  activities: Activity[];
  leads: Lead[];
}
