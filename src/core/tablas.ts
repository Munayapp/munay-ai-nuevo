/**
 * Tablas oficiales P1. Cada valor lleva periodo, fuente y verificación.
 * HP-001: la UIT ya no es un número fijo en el código; se obtiene de TAB-UIT.
 */
import type { EstadoConocimiento, ValorTabla } from './types.ts';

export const TABLAS_P1: ValorTabla[] = [
  {
    id: 'TAB-UIT-2026',
    tablaId: 'TAB-UIT',
    clave: '2026',
    valor: 5500,
    unidad: 'PEN',
    periodo: '2026',
    fuenteId: 'SRC-MEF',
    normaId: 'N-DS-301-2025-EF',
    versionId: 'V-DS-301-2025-EF-1',
    referencia: 'Artículo 1',
    // ACTIVO: verificado contra El Peruano y aprobado por el usuario el 29/09/2026 (regla A1).
    estado: 'ACTIVO',
    verificacion: {
      ultimaFecha: '2026-09-29',
      verificadoPor: 'Claude (verificación asistida contra El Peruano, 29/09/2026) · aprobado por el usuario (29/09/2026)',
      url: 'https://busquedas.elperuano.pe/dispositivo/NL/2469116-1',
      extracto:
        'Durante el año 2026, el valor de la Unidad Impositiva Tributaria (UIT) como índice de referencia en normas tributarias será de S/ 5 500,00 (Cinco Mil Quinientos y 00/100 Soles).',
    },
  },

  // TAB-TC — tipo de cambio de la SBS, por fecha. VERIFICADO: pendiente de aprobación humana.
  // Las páginas de la SBS no son legibles automáticamente; la misma serie oficial "TC Sistema bancario SBS"
  // se obtuvo de BCRPData. Último día publicado al verificar: 25/09/2026 (26–29/09 figuran "n.d.").
  // Pendiente de decisión (contador): qué serie (compra/venta) y de qué fecha aplica a cada cálculo tributario.
  {
    id: 'TAB-TC-VENTA-2026-09-25',
    tablaId: 'TAB-TC',
    clave: 'USD-PEN-VENTA',
    valor: 3.425,
    unidad: 'PEN por USD',
    periodo: '2026-09-25',
    fuenteId: 'SRC-SBS',
    publicadoEn: 'BCRPData, serie PD04640PD',
    estado: 'VERIFICADO',
    verificacion: {
      ultimaFecha: '2026-09-29',
      verificadoPor: 'Claude (verificación asistida) — pendiente de aprobación humana para ACTIVO',
      url: 'https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PD04639PD-PD04640PD/json/2026-09-15/2026-09-29',
      extracto: 'Tipo de cambio - TC Sistema bancario SBS (S/ por US$) - Venta · 25.Set.26: 3.425',
    },
  },
  {
    id: 'TAB-TC-COMPRA-2026-09-25',
    tablaId: 'TAB-TC',
    clave: 'USD-PEN-COMPRA',
    valor: 3.416,
    unidad: 'PEN por USD',
    periodo: '2026-09-25',
    fuenteId: 'SRC-SBS',
    publicadoEn: 'BCRPData, serie PD04639PD',
    estado: 'VERIFICADO',
    verificacion: {
      ultimaFecha: '2026-09-29',
      verificadoPor: 'Claude (verificación asistida) — pendiente de aprobación humana para ACTIVO',
      url: 'https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PD04639PD-PD04640PD/json/2026-09-15/2026-09-29',
      extracto: 'Tipo de cambio - TC Sistema bancario SBS (S/ por US$) - Compra · 25.Set.26: 3.416',
    },
  },
];

export interface UIT {
  valor: number;
  anio: number;
  fuente: string;
  norma: string;
  referencia: string;
  verificadaEl: string | null;
  estado: EstadoConocimiento;
  url?: string;
}

const NORMA_UIT: Record<string, string> = { 'N-DS-301-2025-EF': 'D.S. 301-2025-EF' };

/**
 * UIT de un año desde TAB-UIT. Devuelve el registro con su estado para que quien lo use decida:
 * solo un valor ACTIVO puede presentarse como HECHO.
 */
export function uitDelAnio(anio: number, tablas: ValorTabla[] = TABLAS_P1): UIT | null {
  const v = tablas.find((t) => t.tablaId === 'TAB-UIT' && t.clave === String(anio) && t.estado !== 'RETIRADO');
  if (!v) return null;
  return {
    valor: v.valor,
    anio,
    fuente: 'MEF',
    norma: (v.normaId && NORMA_UIT[v.normaId]) ?? v.normaId ?? '—',
    referencia: v.referencia ?? '—',
    verificadaEl: v.verificacion.ultimaFecha,
    estado: v.estado,
    url: v.verificacion.url,
  };
}
