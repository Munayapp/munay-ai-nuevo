/**
 * P1.1 — Blindaje del Core y de finance.ts.
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analizar, CORE_P1 } from '../index.ts';
import { auditoriaFinanzas, evaluarAlcabala, estadoParametro } from '../../intelligence/finanzasParametros.ts';
import { AS_OF, casos, coreDePrueba } from './fixtures.ts';

const sinDocs = (q: string, contexto: Record<string, unknown> = {}) => ({ documentos: [], contexto: { operacion: 'venta' as const, ...contexto } });

describe('P1.1 — Interpretaciones y recomendaciones requieren aprobación de redacción', () => {
  it('el Core real no tiene ninguna redacción aprobada', () => {
    assert.deepEqual(CORE_P1.aprobacionesRedaccion, []);
  });

  it('interpretación sin aprobación: MEDIA, BORRADOR y nunca como requisito legal (aunque la norma esté ACTIVA)', () => {
    const r = analizar('Q01', casos.Q01, coreDePrueba({ sinAprobarRedaccion: true }), AS_OF);
    const interp = r.afirmaciones.find((a) => a.tipo === 'INTERPRETACION')!;
    assert.ok(interp);
    assert.equal(interp.redaccion, 'BORRADOR');
    assert.equal(interp.confianza, 'MEDIA');
    assert.equal(interp.grupo, 'informacion');
    assert.match(interp.nota ?? '', /pendiente de aprobación/);
    // El titular sale de la NORMA activa, no de la interpretación sin aprobar.
    const norma = r.afirmaciones.find((a) => a.tipo === 'NORMA')!;
    assert.equal(r.titular, norma.texto);
  });

  it('interpretación aprobada: conserva su confianza y su grupo', () => {
    const r = analizar('Q01', casos.Q01, coreDePrueba(), AS_OF);
    const interp = r.afirmaciones.find((a) => a.tipo === 'INTERPRETACION')!;
    assert.equal(interp.redaccion, 'APROBADA');
    assert.equal(interp.confianza, 'ALTA');
    assert.equal(interp.grupo, 'requisito_legal');
  });

  it('recomendación sin aprobación: no pasa de MEDIA aunque sus hechos sean de confianza ALTA', () => {
    const sin = analizar('Q02', casos.Q02, coreDePrueba({ sinAprobarRedaccion: true }), AS_OF);
    const rec = sin.afirmaciones.find((a) => a.tipo === 'RECOMENDACION' && /Pedro Torres/.test(a.texto))!;
    assert.equal(rec.redaccion, 'BORRADOR');
    assert.equal(rec.confianza, 'MEDIA');
    const con = analizar('Q02', casos.Q02, coreDePrueba(), AS_OF);
    assert.equal(con.afirmaciones.find((a) => a.tipo === 'RECOMENDACION' && /Pedro Torres/.test(a.texto))!.confianza, 'ALTA');
  });
});

describe('P1.1 — Documentos REQUIRED / OPTIONAL / NOT_RELEVANT', () => {
  it('REQUIRED ausente: se pide explícitamente y no se ofrece como opcional', () => {
    const r = analizar('Q09', sinDocs('Q09', { distrito: 'Santiago de Surco' }), CORE_P1, AS_OF);
    assert.ok(r.faltantes.some((f) => f.documentoTipo === 'certificado_parametros'));
    assert.ok(!r.paraProfundizar.some((p) => /parámetros/.test(p.documento)));
  });

  it('Q08: preguntar cómo estructurar un contrato NO exige un contrato existente', () => {
    const r = analizar('Q08', sinDocs('Q08', { distrito: 'Barranco', operacion: 'alquiler' }), CORE_P1, AS_OF);
    assert.deepEqual(r.faltantes, []);
    assert.ok(!/contrato de arrendamiento/i.test(r.titular));
    assert.ok(r.paraProfundizar.some((p) => p.documento === 'Contrato de arrendamiento / FUA'));
  });

  it('Q08 con conocimiento activo: responde la norma sin el contrato; el contrato solo profundiza', () => {
    const r = analizar('Q08', sinDocs('Q08', { distrito: 'Barranco', operacion: 'alquiler' }), coreDePrueba(), AS_OF);
    assert.ok(r.afirmaciones.some((a) => a.tipo === 'NORMA'));
    assert.deepEqual(r.faltantes, []);
    assert.ok(r.paraProfundizar.length > 0);
  });

  it('Q07: el poder es OPCIONAL; la norma se informa sin él', () => {
    const r = analizar('Q07', sinDocs('Q07', { senales: ['poder_otorgado_en_extranjero'] }), coreDePrueba(), AS_OF);
    assert.ok(r.afirmaciones.some((a) => a.tipo === 'NORMA'));
    assert.deepEqual(r.faltantes, []);
    assert.ok(r.paraProfundizar.some((p) => /Poder/.test(p.documento)));
  });

  it('NOT_RELEVANT: nunca se solicita un documento que la consulta no declara', () => {
    const q10 = analizar('Q10', sinDocs('Q10'), CORE_P1, AS_OF);
    assert.deepEqual([q10.faltantes, q10.paraProfundizar], [[], []]);
    const q03 = analizar('Q03', sinDocs('Q03', { distrito: 'Miraflores' }), CORE_P1, AS_OF);
    const pedidos = [...q03.faltantes.map((f) => f.que), ...q03.paraProfundizar.map((p) => p.documento)];
    assert.ok(!pedidos.some((p) => /Copia literal|Autorización de venta/.test(p)), pedidos.join(' | '));
  });
});

describe('P1.1 — Next action epistemológica cuando no hay respaldo', () => {
  it('Q05 sin respaldo: la siguiente acción es verificar la unidad, marcada como epistemológica', () => {
    const r = analizar('Q05', sinDocs('Q05', { distrito: 'San Isidro', financiamiento: 'credito' }), CORE_P1, AS_OF);
    assert.equal(r.siguienteAccion?.tipo, 'epistemica');
    assert.match(r.siguienteAccion!.texto, /^Verificar «Plazos de calificación registral» \(U-PLAZO-CALIFICACION\) en SUNARP.*antes de utilizar esta conclusión\.$/);
    assert.equal(r.siguienteAccion!.responsable, 'curación del Core (MUNAY)');
    // No se convierte en una afirmación ni en una recomendación jurídica.
    assert.ok(!r.afirmaciones.some((a) => /antes de utilizar esta conclusión/.test(a.texto)));
  });

  it('cada unidad sin respaldo tiene su acción epistemológica; los temas fuera de P1 no', () => {
    const r = analizar('Q10', sinDocs('Q10'), CORE_P1, AS_OF);
    assert.deepEqual(r.accionesEpistemicas.map((a) => a.referencia), ['U-SUJETO-OBLIGADO']);
  });

  it('si falta un documento requerido, la acción operativa va primero y la epistemológica queda listada', () => {
    const r = analizar('Q01', sinDocs('Q01'), CORE_P1, AS_OF);
    assert.equal(r.siguienteAccion?.tipo, 'operativa');
    assert.match(r.siguienteAccion!.texto, /Copia literal/);
    assert.ok(r.accionesEpistemicas.some((a) => a.referencia === 'U-HIP-PERSECUCION'));
  });

  it('con el documento pero sin respaldo, la acción es epistemológica', () => {
    const r = analizar('Q01', casos.Q01, CORE_P1, AS_OF);
    assert.equal(r.siguienteAccion?.tipo, 'epistemica');
  });
});

describe('P1.1 — finance.ts sin parámetro activo', () => {
  it('auditoría: de los parámetros tributarios/económicos, solo la UIT tiene respaldo ACTIVO', () => {
    const a = auditoriaFinanzas(2026);
    const respaldados = a.filter((e) => e.respaldado).map((e) => e.parametro.id);
    assert.deepEqual(respaldados, ['uit']);
    assert.equal(estadoParametro('tc.usd_pen', 2026).respaldado, false);
    assert.match(estadoParametro('hipoteca.plazo', 2026).motivo, /Supuesto/);
  });

  it('alcabala real: BLOQUEADA por tasa, tramo inafecto y tipo de cambio (no por la UIT)', () => {
    const ev = evaluarAlcabala(186000, new Date('2026-09-29T12:00:00'));
    assert.equal(ev.estado, 'BLOQUEADO');
    if (ev.estado === 'BLOQUEADO') assert.deepEqual(ev.sinRespaldo.map((e) => e.parametro.id), ['alcabala.tasa', 'alcabala.uit_inafectas', 'tc.usd_pen']);
  });

  it('alcabala con parámetros ACTIVOS (fixture): se calcula solo con valores del Core', () => {
    const ev = evaluarAlcabala(186000, new Date('2026-09-29T12:00:00'), coreDePrueba());
    assert.equal(ev.estado, 'RESPALDADO');
    if (ev.estado === 'RESPALDADO') assert.equal(Math.round(ev.alcabala), 7385); // 1% × (186000 × 4 − 1 × 5500): parámetros ficticios del fixture
  });

  it('finance.ts: no reemplaza 3.75, no usa 3% ni 10 UIT escritos, y etiqueta lo no verificado', () => {
    const src = readFileSync(new URL('../../intelligence/finance.ts', import.meta.url), 'utf8');
    // P1.2A: el valor 3.75 se conserva, pero vive solo en el registro; FIN lo lee de ahí.
    assert.match(src, /exchange: valorParametro\('tc\.usd_pen'\)/);
    assert.equal(estadoParametro('tc.usd_pen').parametro.valor, 3.75);
    assert.ok(!/3\.425|3\.416/.test(src));
    assert.ok(!/\*\s*0\.03|10 \* uit/.test(src));
    assert.match(src, /evaluarAlcabala\(priceUSD, fecha\)/);
    assert.match(src, /Estimado no verificado/);
    assert.match(src, /Simulación no verificada/);
    assert.ok(!/5% sobre la renta/.test(src));
  });
});
