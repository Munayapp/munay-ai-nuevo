import type { Change } from '../data/changes';
import type { District, ID } from '../data/types';

export type Tab = 'hoy' | 'analiza' | 'mercado' | 'crea' | 'negocio';

export const TABS: { id: Tab; label: string; accent: string }[] = [
  { id: 'hoy', label: 'Hoy', accent: 'var(--cream)' },
  { id: 'analiza', label: 'Analiza', accent: 'var(--red)' },
  { id: 'mercado', label: 'Mercado', accent: 'var(--teal)' },
  { id: 'crea', label: 'Crea', accent: 'var(--violet)' },
  { id: 'negocio', label: 'Negocio', accent: 'var(--gold)' },
];

export const accentOf = (tab: Tab) => TABS.find((t) => t.id === tab)!.accent;

export type AnalysisMode = 'propiedad' | 'cliente' | 'documento' | 'oportunidad' | 'decision';
export type Objective = 'vender' | 'deseo' | 'captar' | 'reactivar' | 'presentar' | 'historia';
export type Piece = 'reel' | 'descripcion' | 'post' | 'whatsapp' | 'campana';

export interface TabParams {
  mercado?: { district?: District; propertyId?: ID; seg?: 'zonas' | 'comparables' | 'tendencias' };
  crea?: { propertyId?: ID; objective?: Objective; piece?: Piece; nonce?: number };
  negocio?: { seg?: 'operaciones' | 'clientes' | 'captaciones' };
}

export type SheetSpec =
  | { kind: 'resolver'; prompt?: string; files?: File[] }
  | { kind: 'property'; id: ID }
  | { kind: 'client'; id: ID }
  | { kind: 'operation'; id: ID }
  | { kind: 'document'; id: ID }
  | { kind: 'capture'; id: ID }
  | { kind: 'analysis'; mode: AnalysisMode; subjectId?: ID; files?: File[] }
  | { kind: 'pulse' }
  | { kind: 'profile' }
  | { kind: 'qr'; id: ID };

export type Go = { to: 'tab'; tab: Tab; params?: TabParams } | { to: 'sheet'; sheet: SheetSpec };

/** ACTION: efectos que MUNAY ejecuta (no solo responde). */
export type Effect = { do: 'change'; change: Change; toast: string } | { do: 'copy'; text: string; toast?: string };

export interface MunayAction {
  label: string;
  primary?: boolean;
  go?: Go;
  effects?: Effect[];
  /** Vuelve a preguntarle a MUNAY (sugerencias). */
  prompt?: string;
}
