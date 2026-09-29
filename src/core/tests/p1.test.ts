/**
 * Batería P1 del MUNAY INTELLIGENCE CORE.
 * Ejecutar: npm test   (node --test, sin dependencias)
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analizar, CORE_P1, CONSULTAS_P1, estadoJuridico, reconstruir, uitDelAnio, violacionesDeLenguaje } from '../index.ts';
import type { Afirmacion, Respuesta } from '../types.ts';
import { AS_OF, casos, coreDePrueba } from './fixtures.ts';

const tipos = (r: Respuesta) => r.afirmaciones.map((a) => a.tipo);
const de = (r: Respuesta, tipo: Afirmacion['tipo']) => r.afirmaciones.filter((a) => a.tipo === tipo);

/** Invariantes que toda respuesta debe cumplir (criterios C3, C4, C5, C9). */
function invariantes(r: Respuesta, core = CORE_P1, caso = casos[r.consultaId]) {
  for (const a of r.afirmaciones) {
    if (a.tipo !== 'INCERTIDUMBRE') assert.ok(a.evidencias.length > 0, `sin evidencia: ${a.texto}`);
    if (a.tipo === 'NORMA') assert.ok(a.evidencias.every((e) => e.tipo === 'norma'), `NORMA sin cadena normativa: ${a.texto}`);
    if (a.tipo === 'HECHO') assert.ok(a.evidencias.every((e) => e.tipo === 'norma' || e.tipo === 'tabla'), `HECHO sin fuente: ${a.texto}`);
    if (a.tipo === 'DATO_DEL_CASO') assert.ok(a.evidencias.every((e) => e.tipo === 'documento_caso'));
  }
  assert.deepEqual(r.violacionesLenguaje, []);
  const rec = reconstruir(r, core, caso);
  assert.ok(rec.ok, rec.errores.join(' | '));
}

// ─────────────────────────────────────────────────────────────

describe('Compuerta A1 — conocimiento BORRADOR', () => {
  it('el Core real no tiene ninguna unidad ACTIVA ni afirmaciones sin verificar', () => {
    assert.equal(CORE_P1.unidades.filter((u) => u.estado === 'ACTIVO').length, 0);
    assert.ok(CORE_P1.unidades.every((u) => u.afirmacion === null));
    assert.ok(CORE_P1.normas.filter((n) => n.id !== 'N-DS-301-2025-EF').every((n) => n.estado === 'BORRADOR'));
    assert.deepEqual(CORE_P1.tablas.filter((t) => t.estado === 'ACTIVO').map((t) => t.id), ['TAB-UIT-2026'], 'solo la UIT 2026 está aprobada');
  });

  it('con el Core real, Q01 no afirma ninguna norma: responde sin respaldo y muestra solo los datos del caso', () => {
    const r = analizar('Q01', casos.Q01, CORE_P1, AS_OF);
    assert.ok(!tipos(r).some((t) => t === 'NORMA' || t === 'PRACTICA' || t === 'INTERPRETACION'));
    assert.ok(r.sinRespaldo.some((s) => s.referencias.includes('U-HIP-PERSECUCION') && s.motivo === 'unidad_no_activa'));
    assert.ok(de(r, 'DATO_DEL_CASO').length > 0);
    assert.equal(r.titular, 'No encuentro respaldo suficiente en el conocimiento disponible.');
    invariantes(r);
  });

  it('las 10 consultas corren contra el Core real sin afirmar conocimiento no activo', () => {
    for (const q of CONSULTAS_P1) {
      const r = analizar(q.id, casos[q.id], CORE_P1, AS_OF);
      assert.ok(!tipos(r).some((t) => t === 'NORMA' || t === 'HECHO' || t === 'PRACTICA'), `${q.id} afirmó conocimiento no activo`);
      invariantes(r);
    }
  });
});

describe('Conocimiento ACTIVO (fixture)', () => {
  it('Q01: norma trazable, requisito legal separado del habitual y de la recomendación', () => {
    const core = coreDePrueba();
    const r = analizar('Q01', casos.Q01, core, AS_OF);
    const norma = de(r, 'NORMA')[0];
    assert.ok(norma);
    assert.equal(norma.confianza, 'ALTA');
    const ev = norma.evidencias[0];
    assert.equal(ev.tipo, 'norma');
    if (ev.tipo === 'norma') {
      assert.equal(ev.versionId, 'TEST-V1');
      assert.ok(ev.extracto.startsWith('[PRUEBA]'));
    }
    assert.ok(r.afirmaciones.some((a) => a.tipo === 'INTERPRETACION' && a.grupo === 'requisito_legal'));
    assert.ok(r.afirmaciones.some((a) => a.tipo === 'PRACTICA' && a.grupo === 'requisito_habitual'));
    assert.ok(r.afirmaciones.some((a) => a.tipo === 'RECOMENDACION' && /copia literal actualizada/.test(a.texto)));
    assert.deepEqual(r.siguienteAccion, { texto: 'Pedir al banco acreedor la carta de levantamiento de la hipoteca.', responsable: 'propietario', tipo: 'operativa' });
    invariantes(r, core);
  });

  it('las 10 consultas cumplen las invariantes con conocimiento activo', () => {
    const core = coreDePrueba();
    for (const q of CONSULTAS_P1) invariantes(analizar(q.id, casos[q.id], core, AS_OF), core);
  });
});

describe('A2 — vigencia jurídica separada de la ventana de verificación', () => {
  it('ventana vencida: baja la confianza y crea tarea, pero no cambia el estado jurídico', () => {
    const alDia = coreDePrueba();
    const vencida = coreDePrueba({ verificadaEl: '2025-01-01' });
    const norma = (c: typeof alDia) => c.normas.find((n) => n.id === 'TEST-N')!;
    assert.deepEqual(estadoJuridico(norma(alDia), AS_OF), estadoJuridico(norma(vencida), AS_OF));
    assert.equal(estadoJuridico(norma(vencida), AS_OF).estado, 'VIGENTE');

    const r = analizar('Q01', casos.Q01, vencida, AS_OF);
    const n = de(r, 'NORMA')[0];
    assert.equal(n.confianza, 'MEDIA');
    assert.match(n.nota ?? '', /verificación del 2025-01-01/);
    assert.ok(r.tareasReverificacion.includes('U-HIP-PERSECUCION'));
    assert.ok(!r.sinRespaldo.some((s) => s.motivo === 'norma_no_vigente'));
  });

  it('el estado jurídico sale solo de versiones y relaciones', () => {
    const base = { versiones: [{ id: 'v1', vigenteDesde: '2020-01-01', vigenteHasta: null }] };
    assert.equal(estadoJuridico({ ...base, relaciones: [] }, AS_OF).estado, 'VIGENTE');
    assert.equal(estadoJuridico({ ...base, relaciones: [{ tipo: 'MODIFICA', porDocumento: 'x', desde: '2026-05-08' }] }, AS_OF).estado, 'MODIFICADA_PARCIALMENTE');
    assert.equal(estadoJuridico({ ...base, relaciones: [{ tipo: 'DEROGA', porDocumento: 'x', desde: '2026-01-01' }] }, AS_OF).estado, 'DEROGADA');
    assert.equal(estadoJuridico({ ...base, relaciones: [{ tipo: 'MODIFICA', porDocumento: 'x', desde: null }] }, AS_OF).estado, 'DESCONOCIDO');
    assert.equal(estadoJuridico({ versiones: [{ id: 'v1', vigenteDesde: '2027-01-01', vigenteHasta: null }], relaciones: [] }, AS_OF).estado, 'DESCONOCIDO');
  });

  it('norma derogada o sección de otra versión: no se afirma', () => {
    const derogada = coreDePrueba();
    derogada.normas.find((n) => n.id === 'TEST-N')!.relaciones.push({ tipo: 'DEROGA', porDocumento: 'Norma de prueba 2', desde: '2026-01-01' });
    const r1 = analizar('Q01', casos.Q01, derogada, AS_OF);
    assert.equal(de(r1, 'NORMA').length, 0);
    assert.ok(r1.sinRespaldo.some((s) => s.motivo === 'norma_no_vigente'));

    const otraVersion = coreDePrueba();
    const n = otraVersion.normas.find((x) => x.id === 'TEST-N')!;
    n.versiones = [
      { id: 'TEST-V1', vigenteDesde: '2020-01-01', vigenteHasta: '2025-12-31' },
      { id: 'TEST-V2', vigenteDesde: '2026-01-01', vigenteHasta: null },
    ];
    const r2 = analizar('Q01', casos.Q01, otraVersion, AS_OF);
    assert.equal(de(r2, 'NORMA').length, 0);
    assert.ok(r2.sinRespaldo.some((s) => /no corresponde a la versión aplicable/.test(s.tema)));
  });
});

describe('Documento del caso', () => {
  it('Q03: el reporte Valia entra como DATO DEL CASO de confianza media, citado y con su limitación', () => {
    const r = analizar('Q03', casos.Q03, CORE_P1, AS_OF);
    const valia = r.afirmaciones.find((a) => a.tipo === 'DATO_DEL_CASO' && a.nota?.includes('Valia'));
    assert.ok(valia);
    assert.equal(valia!.confianza, 'MEDIA');
    assert.match(valia!.nota!, /Valia ACM, 2026-05-01, generado por el agente\. Precios de oferta/);
    const pos = r.afirmaciones.find((a) => a.tipo === 'RECOMENDACION' && /Rango del método MUNAY/.test(a.texto));
    assert.ok(pos);
    assert.equal(pos!.confianza, 'MEDIA');
    assert.ok(r.afirmaciones.some((a) => /actualizar el reporte Valia/.test(a.texto)));
    invariantes(r);
  });

  it('Q06: lo que el documento no trae o MUNAY no pudo leer se informa, no se inventa', () => {
    const r = analizar('Q06', casos.Q06, CORE_P1, AS_OF);
    assert.ok(r.faltantes.some((f) => /no pude leerlo/.test(f.que)));
    assert.ok(r.faltantes.some((f) => /identificación completa de las partes: el contrato no lo indica/.test(f.que)));
    invariantes(r);
  });
});

describe('Información contradictoria (J5) y del agente (J6)', () => {
  it('dos documentos con distinta área: INCERTIDUMBRE y la regla que la necesita no se evalúa', () => {
    const caso = structuredClone(casos.Q03);
    caso.documentos.push({ ...structuredClone(casos.Q01.documentos[0]), id: 'DOC-OTRA', hechos: [{ campo: 'area_m2', valor: 110, pagina: 2, extracto: 'Área: 110 m2', confirmadoPorAgente: true }] });
    const r = analizar('Q03', caso, CORE_P1, AS_OF);
    assert.ok(r.afirmaciones.some((a) => a.tipo === 'INCERTIDUMBRE' && /no coinciden/.test(a.texto)));
    assert.ok(!r.afirmaciones.some((a) => /Rango del método MUNAY/.test(a.texto)));
    invariantes(r, CORE_P1, caso);
  });

  it('el dato del agente que contradice el documento: prevalece el documento y se pregunta', () => {
    const caso = structuredClone(casos.Q04);
    caso.contexto.datosAgente = [{ campo: 'precio_usd', valor: 189000, dichoEl: AS_OF }];
    const r = analizar('Q04', caso, CORE_P1, AS_OF);
    assert.ok(r.preguntasAlAgente.some((p) => /189000/.test(p) && /186000/.test(p)));
  });
});

describe('Información faltante (J2)', () => {
  it('Q04 sin documento de compra: pide el costo de adquisición', () => {
    const r = analizar('Q04', casos.Q04, coreDePrueba(), AS_OF);
    assert.ok(r.faltantes.some((f) => f.que === 'Minuta o escritura' && /costo de adquisición/.test(f.porque) && f.quien === 'vendedor'));
  });
  it('Q09 sin certificado de parámetros: el titular dice qué necesita', () => {
    const r = analizar('Q09', casos.Q09, coreDePrueba(), AS_OF);
    assert.ok(r.faltantes.some((f) => f.documentoTipo === 'certificado_parametros'));
    assert.ok(r.titular.startsWith('Para determinarlo necesito: certificado de parámetros'));
  });
});

describe('REQUIERE PROFESIONAL (J8)', () => {
  it('Q07 poder otorgado en el extranjero', () => {
    const r = analizar('Q07', casos.Q07, CORE_P1, AS_OF);
    assert.ok(r.requiereProfesional?.preguntas.some((p) => /extranjero/.test(p)));
    assert.match(r.titular, /requiere revisión profesional/);
  });
  it('Q02 sucesión no inscrita y firma faltante en la autorización', () => {
    const r = analizar('Q02', casos.Q02, CORE_P1, AS_OF);
    assert.ok(r.requiereProfesional?.motivos.some((m) => /sucesión/.test(m)));
    assert.ok(r.afirmaciones.some((a) => a.tipo === 'RECOMENDACION' && /Pedro Torres/.test(a.texto)));
  });
  it('Q06 penalidades asimétricas: recomendación + derivación, sin opinión legal', () => {
    const r = analizar('Q06', casos.Q06, CORE_P1, AS_OF);
    assert.ok(r.requiereProfesional?.motivos.some((m) => /cláusulas/.test(m)));
    assert.ok(r.afirmaciones.some((a) => a.tipo === 'RECOMENDACION' && /abogado/.test(a.texto)));
  });
  it('Q10 efectivo: oficial de cumplimiento', () => {
    const r = analizar('Q10', casos.Q10, CORE_P1, AS_OF);
    assert.ok(r.requiereProfesional?.motivos.some((m) => /LA\/FT/.test(m)));
  });
});

describe('Fuera del alcance P1 (J1)', () => {
  it('Q09 en La Molina: fuera del alcance municipal, sin afirmaciones', () => {
    const caso = { ...casos.Q09, contexto: { ...casos.Q09.contexto, distrito: 'La Molina' } };
    const r = analizar('Q09', caso, coreDePrueba(), AS_OF);
    assert.equal(r.fueraDeAlcance, true);
    assert.equal(r.afirmaciones.length, 0);
    assert.ok(r.sinRespaldo.some((s) => s.motivo === 'zona_fuera_de_P1'));
  });
  it('Q01 en La Molina sí responde: la norma civil y registral es nacional', () => {
    const r = analizar('Q01', casos.Q01, coreDePrueba(), AS_OF);
    assert.equal(r.fueraDeAlcance, false);
    assert.ok(de(r, 'NORMA').length > 0);
  });
  it('Q10: medios de pago no están en P1 y se dice explícitamente', () => {
    const r = analizar('Q10', casos.Q10, coreDePrueba(), AS_OF);
    assert.ok(r.sinRespaldo.some((s) => s.motivo === 'tema_fuera_de_P1' && /Medios de pago/.test(s.tema)));
  });
  it('consulta inexistente: error, no respuesta inventada', () => {
    assert.throws(() => analizar('Q99', casos.Q01, CORE_P1, AS_OF));
  });
});

describe('Trazabilidad (C9)', () => {
  it('la respuesta se reconstruye desde sus IDs y detecta manipulación', () => {
    const core = coreDePrueba();
    const r = analizar('Q01', casos.Q01, core, AS_OF);
    assert.ok(reconstruir(r, core, casos.Q01).ok);
    assert.ok(r.auditoria.unidades.includes('U-HIP-PERSECUCION'));
    assert.ok(r.auditoria.versiones.includes('TEST-V1'));
    assert.ok(r.auditoria.documentos.includes('DOC-PARTIDA'));

    const alterada = structuredClone(r);
    const ev = alterada.afirmaciones.find((a) => a.tipo === 'NORMA')!.evidencias[0];
    if (ev.tipo === 'norma') ev.extracto = 'texto cambiado';
    assert.equal(reconstruir(alterada, core, casos.Q01).ok, false);
  });
});

describe('A4 — separación norma / práctica', () => {
  it('detecta lenguaje de obligación en una práctica', () => {
    const v = violacionesDeLenguaje([{ texto: 'La notaría exige una copia reciente.', tipo: 'PRACTICA', confianza: 'MEDIA', grupo: 'requisito_habitual', evidencias: [] }]);
    assert.equal(v.length, 1);
  });
  it('ninguna práctica ni recomendación de las 10 consultas usa lenguaje de obligación', () => {
    const core = coreDePrueba();
    for (const q of CONSULTAS_P1) assert.deepEqual(analizar(q.id, casos[q.id], core, AS_OF).violacionesLenguaje, [], q.id);
  });
});

describe('HP-001 — UIT desde TAB-UIT', () => {
  it('uitDelAnio(2026): S/ 5,500, D.S. 301-2025-EF art. 1, ACTIVA', () => {
    const uit = uitDelAnio(2026)!;
    assert.equal(uit.valor, 5500);
    assert.equal(uit.norma, 'D.S. 301-2025-EF');
    assert.equal(uit.referencia, 'Artículo 1');
    assert.equal(uit.verificadaEl, '2026-09-29');
    assert.equal(uit.estado, 'ACTIVO');
    assert.equal(CORE_P1.normas.find((n) => n.id === 'N-DS-301-2025-EF')!.fechaPublicacion, '2025-12-17');
    assert.equal(CORE_P1.normas.find((n) => n.id === 'N-DS-301-2025-EF')!.fechaEmision, '2025-12-16');
    assert.equal(uitDelAnio(2027), null);
  });
  it('finance.ts ya no tiene la UIT fija y la toma de TAB-UIT', () => {
    const src = readFileSync(new URL('../../intelligence/finance.ts', import.meta.url), 'utf8');
    assert.ok(!/5350/.test(src));
    assert.ok(!/uit:\s*\d/.test(src));
    assert.match(src, /import \{ uitDelAnio \} from '\.\.\/core\/tablas(\.ts)?'/);
  });
  it('Core real: Q04 no afirma hechos mientras U-ALCABALA siga en BORRADOR', () => {
    const r = analizar('Q04', casos.Q04, CORE_P1, AS_OF);
    assert.ok(!de(r, 'HECHO').length);
  });
  it('fixture con UIT aprobada: HECHO trazable al artículo 1 y cálculo con parámetros de la unidad', () => {
    const core = coreDePrueba();
    const r = analizar('Q04', casos.Q04, core, AS_OF);
    const uit = de(r, 'HECHO').find((a) => /UIT 2026/.test(a.texto))!;
    assert.ok(uit);
    const ev = uit.evidencias[0];
    assert.equal(ev.tipo, 'tabla');
    if (ev.tipo === 'tabla') {
      assert.equal(ev.normaId, 'N-DS-301-2025-EF');
      assert.equal(ev.referencia, 'Artículo 1');
      assert.match(ev.extracto ?? '', /S\/ 5 500,00/);
    }
    // Parámetros ficticios del fixture: 1% sobre (186000 × 4 − 1 UIT)
    assert.ok(r.afirmaciones.some((a) => a.tipo === 'INTERPRETACION' && a.texto.includes('S/ 7,385')));
    invariantes(r, core);
  });
  it('fixture en 2027: la UIT 2026 no es vigente y no se usa', () => {
    const r = analizar('Q04', casos.Q04, coreDePrueba(), '2027-02-01');
    assert.ok(!de(r, 'HECHO').length);
    assert.ok(r.sinRespaldo.some((s) => s.motivo === 'tabla_no_activa' || s.motivo === 'norma_no_vigente'));
  });
});

describe('TAB-TC — tipo de cambio SBS verificado, pendiente de aprobación', () => {
  it('compra y venta del 25/09/2026 con fuente, canal, URL, extracto y verificación; ninguna ACTIVA', () => {
    const tc = CORE_P1.tablas.filter((t) => t.tablaId === 'TAB-TC');
    assert.deepEqual(tc.map((t) => [t.clave, t.valor, t.periodo]).sort(), [['USD-PEN-COMPRA', 3.416, '2026-09-25'], ['USD-PEN-VENTA', 3.425, '2026-09-25']]);
    for (const t of tc) {
      assert.equal(t.estado, 'VERIFICADO');
      assert.equal(t.fuenteId, 'SRC-SBS');
      assert.match(t.publicadoEn ?? '', /BCRPData/);
      assert.match(t.verificacion.url ?? '', /estadisticas\.bcrp\.gob\.pe/);
      assert.match(t.verificacion.extracto ?? '', /TC Sistema bancario SBS/);
      assert.equal(t.verificacion.ultimaFecha, '2026-09-29');
    }
  });
  it('sin un tipo de cambio aprobado, la alcabala no se calcula aunque la norma y la UIT estén activas', () => {
    const core = coreDePrueba();
    core.tablas = core.tablas.filter((t) => t.id !== 'TEST-TC');
    const r = analizar('Q04', casos.Q04, core, AS_OF);
    assert.ok(!r.afirmaciones.some((a) => a.tipo === 'INTERPRETACION' && /Alcabala estimada/.test(a.texto)));
    assert.ok(r.sinRespaldo.some((s) => s.motivo === 'tabla_no_activa' && /Tipo de cambio/.test(s.tema)));
  });
});

describe('Q09 — respaldo estructural en los cuatro distritos P1', () => {
  const zonas = { Miraflores: 'U-ZONIF-MIRAFLORES', 'San Isidro': 'U-ZONIF-SANISIDRO', Barranco: 'U-ZONIF-BARRANCO', 'Santiago de Surco': 'U-ZONIF-SURCO' } as const;
  it('las cuatro unidades de zonificación existen y siguen en BORRADOR', () => {
    for (const id of Object.values(zonas)) assert.equal(CORE_P1.unidades.find((u) => u.id === id)?.estado, 'BORRADOR', id);
    assert.equal(CORE_P1.unidades.length, 21);
  });
  it('cada distrito usa solo su propia unidad (fixture) y no reporta las de otros distritos (Core real)', () => {
    const core = coreDePrueba();
    for (const [distrito, id] of Object.entries(zonas)) {
      const caso = { ...casos.Q09, contexto: { ...casos.Q09.contexto, distrito } };
      const activa = analizar('Q09', caso, core, AS_OF);
      assert.deepEqual(activa.auditoria.unidades.filter((u) => u.startsWith('U-ZONIF')), [id], distrito);
      const real = analizar('Q09', caso, CORE_P1, AS_OF);
      const zon = real.sinRespaldo.flatMap((s) => s.referencias).filter((r) => r.startsWith('U-ZONIF'));
      assert.deepEqual(zon, [id], distrito);
      invariantes(activa, core, caso);
    }
  });
});

describe('Prueba de fuego — correcciones del motor', () => {
  const sinDocs = (q: string, contexto: Record<string, unknown> = {}) => analizar(q, { documentos: [], contexto: { operacion: 'venta', ...contexto } }, CORE_P1, AS_OF);

  it('J1 no queda oculto detrás de J2: sin documento y sin respaldo, se dicen ambas cosas y primero el respaldo', () => {
    const r = sinDocs('Q01');
    assert.ok(r.sinRespaldo.some((s) => s.referencias.includes('U-HIP-PERSECUCION')));
    assert.ok(r.faltantes.some((f) => f.documentoTipo === 'copia_literal'));
    assert.match(r.titular, /^No encuentro respaldo suficiente en el conocimiento disponible\. Además, para determinarlo necesito: copia literal/);
  });

  it('documento necesario inexistente: se pide el documento completo y no se inventa su análisis', () => {
    const r = sinDocs('Q06');
    assert.deepEqual(r.faltantes.map((f) => f.que), ['Contrato de arras']);
    assert.match(r.faltantes[0].porque, /No tengo este documento/);
    assert.ok(!r.afirmaciones.some((a) => a.tipo === 'RECOMENDACION' || a.tipo === 'INTERPRETACION'));
  });

  it('herencia indivisa deriva a un profesional (lista J aprobada)', () => {
    const r = sinDocs('Q02', { senales: ['sucesion_intestada_o_masa_indivisa'] });
    assert.ok(r.requiereProfesional?.motivos.some((m) => /masa hereditaria indivisa/.test(m)));
  });

  it('la comisión del agente no se omite en silencio: se declara fuera del Core P1', () => {
    const r = sinDocs('Q04', { distrito: 'Miraflores' });
    assert.ok(r.sinRespaldo.some((s) => s.motivo === 'tema_fuera_de_P1' && /Comisión neta del agente/.test(s.tema)));
  });

  it('en las 10 consultas sin documentos: ninguna afirmación con respaldo, lenguaje limpio y trazabilidad', () => {
    for (const q of CONSULTAS_P1) {
      const caso = { documentos: [], contexto: { operacion: 'venta' as const, distrito: q.id === 'Q09' ? 'Santiago de Surco' : undefined } };
      const r = analizar(q.id, caso, CORE_P1, AS_OF);
      assert.ok(!r.afirmaciones.some((a) => ['NORMA', 'HECHO', 'PRACTICA', 'INTERPRETACION', 'RECOMENDACION'].includes(a.tipo)), q.id);
      assert.ok(r.sinRespaldo.length > 0 || r.faltantes.length > 0, q.id);
      invariantes(r, CORE_P1, caso);
    }
  });
});
