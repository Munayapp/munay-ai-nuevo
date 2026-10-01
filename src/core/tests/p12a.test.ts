/**
 * P1.2A — Truth Gate.
 * Ningún contenido presenta como hecho algo sin procedencia válida.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { METODOS } from '../metodos.ts';
import { analizar, CORE_P1 } from '../index.ts';
import { AS_OF } from './fixtures.ts';
import { createSeed } from '../../data/mock/seed.ts';
import { position } from '../../data/select.ts';
import type { Workspace } from '../../data/types.ts';
import { create, pieceText, proposal } from '../../intelligence/creative.ts';
import { counterOfferMessage, followUpMessage } from '../../intelligence/drafts.ts';
import { evidenciaAgente } from '../../intelligence/evidencia.ts';
import { commission, FIN, mortgage, netCommissionStatus, REQUIERE } from '../../intelligence/finance.ts';
import { evaluarCalculo, PARAMETROS_FINANZAS } from '../../intelligence/finanzasParametros.ts';
import { afirmableATerceros, MERCADO_ES_DEMO, procedencia } from '../../intelligence/procedencia.ts';
import { visitorAnswer } from '../../intelligence/visitor.ts';
import { coreDePrueba } from './fixtures.ts';

const SRC = new URL('../../', import.meta.url);
const rel = (u: URL) => decodeURIComponent(u.pathname).replace(/^\/([A-Za-z]:)/, '$1');
const ROOT = rel(SRC);

function files(dir = ROOT): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = `${dir}${dir.endsWith('/') ? '' : '/'}${f}`;
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}
const short = (p: string) => p.slice(ROOT.length).replace(/^\//, '');
/** Código sin comentarios (los comentarios pueden citar valores para documentar). */
const code = (p: string) => readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const APP = files().filter((p) => !short(p).startsWith('core/'));

const ws = (): Workspace => createSeed();
const COMERCIAL = /vendimos|cerramos|cerré|compradores (activos|buscando)|clientes en mi cartera|por debajo de lo que se pide|lo que se pide en la zona|la zona promedia|los compradores de esta zona|el mercado (sugiere|se movió)|volvió a moverse el mercado/i;

describe('P1.2A · 1 — Truth test global: sin parámetros legales/tributarios/económicos fuera del Core o del registro', () => {
  // Fuentes canónicas: src/core/** (Core + métodos) e intelligence/finanzasParametros.ts (registro).
  // Whitelist explícita: seed.ts contiene DATOS DEL CASO/AGENTE de demostración (p. ej. texto de una autorización).
  const WHITELIST = ['intelligence/finanzasParametros.ts', 'data/mock/seed.ts'];
  const PATRONES: [string, RegExp][] = [
    ['tipo de cambio', /\b3\.75\b|\b3\.4(25|16)\b/],
    ['TEA hipotecaria', /\b0\.089\b/],
    ['retención 4ta', /\b0\.08\b/],
    ['IGV', /\b0\.18\b/],
    ['UIT', /\b5,?500\b/],
    ['banda de valorización', /\*\s*0\.97\b|\*\s*1\.02\b/],
    ['umbral de posición', /\b0\.025\b/],
    ['"30 días"', /30 d[ií]as/],
    ['rentas supuestas', /\b0\.058\b|\b0\.048\b/],
    ['tolerancia de comparables', /<=\s*0\.25\b/],
    ['alcabala', /10\s*\*\s*uit|\*\s*0\.03\b/i],
  ];
  it('ningún archivo de la app redefine esos valores', () => {
    const hallazgos = APP.filter((p) => !WHITELIST.includes(short(p))).flatMap((p) => {
      const c = code(p);
      return PATRONES.filter(([, re]) => re.test(c)).map(([n]) => `${short(p)}: ${n}`);
    });
    assert.deepEqual(hallazgos, []);
  });
});

describe('P1.2A · 2 — Financial backing: RESPALDADO solo si TODOS los parámetros están ACTIVOS', () => {
  it('con cualquier parámetro sin respaldo, el resultado es NO_VERIFICADO (sin sustituciones)', () => {
    assert.equal(evaluarCalculo(['uit']).estado, 'RESPALDADO');
    assert.equal(evaluarCalculo(['uit', 'tc.usd_pen']).estado, 'NO_VERIFICADO');
    assert.deepEqual(evaluarCalculo(['uit', 'tc.usd_pen']).sinRespaldo.map((e) => e.parametro.id), ['tc.usd_pen']);
    assert.equal(evaluarCalculo(['hipoteca.plazo']).estado, 'NO_VERIFICADO'); // un supuesto nunca respalda
  });
  it('comisión e hipoteca heredan el estado; FIN lee el registro y conserva 3.75', () => {
    const w = ws();
    assert.equal(commission(w.operations[0], w.agent).verificacion, 'NO_VERIFICADO');
    assert.equal(mortgage(200000).verificacion, 'NO_VERIFICADO');
    assert.equal(FIN.exchange, 3.75);
    assert.equal(PARAMETROS_FINANZAS.find((p) => p.id === 'tc.usd_pen')!.valor, FIN.exchange);
    assert.ok(!('igv' in FIN));
  });
  it('con el Core de prueba (todo ACTIVO) la regla sí respalda', () => {
    assert.equal(evaluarCalculo(['uit'], 2026, coreDePrueba()).estado, 'RESPALDADO');
  });
});

describe('P1.2A · 3 — Visitor: sin datos de mercado ni impuestos sin procedencia', () => {
  const w = ws();
  const preguntas = ['¿Cuánto cuesta?', '¿Cómo es la zona?', '¿Cuánto sería la cuota?', '¿Cuánto es la alcabala?', '¿Tiene luz?', '¿Qué impuestos pago?'];
  it('ninguna respuesta cita la mediana, la lectura ni la demanda de la zona', () => {
    for (const p of w.properties) {
      const z = w.zones.find((x) => x.district === p.district)!;
      for (const q of preguntas) {
        const a = visitorAnswer(p, w, q);
        assert.ok(!a.includes(z.medianUSDm2.toLocaleString('en-US')), `${p.id} · ${q}: ${a}`);
        assert.ok(!/promedia|demanda|mercado|se vende/i.test(a), `${p.id} · ${q}: ${a}`);
      }
    }
  });
  it('la cuota se presenta como simulación con supuestos; los impuestos no se calculan', () => {
    const p = w.properties[0];
    assert.match(visitorAnswer(p, w, '¿Cuánto sería la cuota?'), /Simulación no verificada.*simulación con supuestos.*no verificada/);
    assert.ok(!/S\/\s?\d|%/.test(visitorAnswer(p, w, '¿Cuánto es la alcabala?')));
  });
  it('PublicProperty no lee datos de zona ni muestra lecturas', () => {
    const c = code(`${ROOT}/screens/PublicProperty.tsx`);
    assert.ok(!/S\.zone\(|medianUSDm2|\.reading\b/.test(c));
    assert.match(c, /DemoTag/);
  });
});

describe('P1.2A · 4 — Outgoing content: sin afirmaciones comerciales sin Agent Data o Case Data', () => {
  const w = ws();
  const objetivos = ['vender', 'deseo', 'captar', 'reactivar', 'presentar', 'historia'] as const;
  const piezas = ['reel', 'descripcion', 'post', 'whatsapp', 'campana'] as const;

  it('sin evidencia: ninguna pieza de CREA afirma ventas, cierres, compradores ni datos de zona', () => {
    for (const p of w.properties) for (const o of objetivos) for (let v = 0; v < 3; v++) {
      const c = create(p, o, w.agent, v);
      const all = [c.idea, c.why, c.hook, ...piezas.map((x) => pieceText(c, x))].join('\n');
      assert.ok(!COMERCIAL.test(all), `${p.id}/${o}/v${v}: ${all.match(COMERCIAL)?.[0]}`);
      assert.ok(!/38 días|el doble|precio por m², demanda/.test(all));
      assert.ok(c.procedencia.every(afirmableATerceros) || c.procedencia.every((x) => x.sourceType === 'CASE_DATA'));
    }
    assert.ok(!COMERCIAL.test(proposal(w.properties.find((p) => p.status === 'captación')!).text));
  });

  it('con evidencia DEMO tampoco se afirma nada (lo demo no sale a terceros)', () => {
    const cis = w.properties.find((p) => p.id === 'p-pardo')!; // Miraflores: hay un cierre demo y compradores demo
    const ev = evidenciaAgente(w, cis.district, true);
    assert.ok(ev.cierres.count > 0 && ev.compradores.count > 0);
    const c = create(cis, 'captar', w.agent, 0, ev);
    assert.ok(!COMERCIAL.test([c.hook, c.whatsapp, c.idea].join(' ')));
  });

  it('con evidencia real del agente: se afirma exactamente lo registrado', () => {
    const p = w.properties.find((x) => x.id === 'p-pardo')!;
    const ev = evidenciaAgente(w, p.district, false);
    const c = create(p, 'captar', w.agent, 0, ev);
    assert.match(c.hook, /Así vendimos en Miraflores\./);
    assert.match(c.whatsapp, /cerré una venta en Miraflores/);
    assert.match(c.whatsapp, /clientes en mi cartera buscando en Miraflores/);
    assert.ok(c.procedencia.some((x) => x.sourceType === 'AGENT_DATA'));
    // Sin cierres en el distrito (La Molina): no se afirma el cierre aunque haya evidencia de otro tipo.
    const lm = w.properties.find((x) => x.district === 'La Molina')!;
    const c2 = create(lm, 'captar', w.agent, 0, evidenciaAgente(w, lm.district, false));
    assert.ok(!/vendimos|cerré/i.test(c2.hook + c2.whatsapp));
  });

  it('seguimientos y contraoferta: sin compradores inventados, trabajo no hecho ni comparación con la zona', () => {
    for (const cl of w.clients) {
      const p = w.properties.find((x) => x.id === cl.propertyIds[0]);
      for (const step of [undefined, 'propuesta', 'autorización'] as const) {
        const m = followUpMessage(cl, w.agent, p, step);
        assert.ok(!COMERCIAL.test(m), m);
        assert.ok(!/2 minutos|Hice los números|luz de mañana que te gusta/.test(m), m);
      }
    }
    for (const op of w.operations) {
      const m = counterOfferMessage(w.clients.find((c) => c.id === op.buyerId)!, op, w.properties.find((p) => p.id === op.propertyId)!);
      assert.ok(!COMERCIAL.test(m) && !/al contado|zona/.test(m), m);
    }
  });
});

describe('P1.2A · 5 — Commission: los agregados heredan el estado de verificación', () => {
  it('netCommissionStatus usa exactamente los parámetros de commission()', () => {
    assert.equal(netCommissionStatus().estado, evaluarCalculo([...REQUIERE.comision]).estado);
    assert.equal(netCommissionStatus().etiqueta, 'estimado no verificado');
  });
  it('toda vista que agrega netCommissionPEN muestra la etiqueta', () => {
    const usan = APP.filter((p) => /netCommissionPEN\(/.test(code(p)) && !short(p).endsWith('intelligence/finance.ts'));
    assert.ok(usan.length >= 5, usan.map(short).join(', '));
    for (const p of usan) assert.match(code(p), /netCommissionStatus\(\)/, short(p));
  });
});

describe('P1.2A · 6 — Document checklist: ningún requisito legal sin respaldo del Core', () => {
  it('docReader no declara requisitos respaldados ni plazos propios; separa revisión sugerida y pendientes', () => {
    const c = code(`${ROOT}/intelligence/docReader.ts`);
    assert.match(c, /backed: \[\]/);
    assert.match(c, /pending:/);
    assert.ok(!/\d+\s*d[ií]as\)/.test(c));
    const b = code(`${ROOT}/sheets/Blocks.tsx`);
    assert.match(b, /Requisitos respaldados por el Core/);
    assert.match(b, /Revisión sugerida · práctica MUNAY, no verificada/);
    assert.ok(!/label="Qué falta"/.test(b));
  });
  it('con el Core real, ninguna consulta presenta un requisito legal (todo está en BORRADOR)', () => {
    for (const q of ['Q01', 'Q02', 'Q04', 'Q06']) {
      const r = analizar(q, { documentos: [], contexto: { operacion: 'venta' } }, CORE_P1, AS_OF);
      assert.ok(!r.afirmaciones.some((a) => a.grupo === 'requisito_legal'), q);
    }
  });
});

describe('P1.2A · 7 — Single source: T.C., banda, "30 días" y comisión sin definiciones paralelas', () => {
  it('select.ts consume el método canónico y coincide con la regla del Core', () => {
    const c = code(`${ROOT}/data/select.ts`);
    assert.match(c, /METODOS\.rangoValorizacion|RV\.bandaInferior/);
    const w = ws();
    const p = w.properties.find((x) => x.id === 'p-pardo')!;
    const pos = position(w, p);
    const fair = pos.compM2 * p.areaM2;
    assert.equal(pos.fairLow, Math.round((fair * METODOS.rangoValorizacion.parametros.bandaInferior) / 1000) * 1000);
    assert.equal(pos.fairHigh, Math.round((fair * METODOS.rangoValorizacion.parametros.bandaSuperior) / 1000) * 1000);
    assert.match(code(`${ROOT}/core/consultas.ts`), /RV\.bandaInferior/);
  });
  it('el tipo de cambio vive solo en el registro; la comisión viene del agente', () => {
    assert.match(code(`${ROOT}/intelligence/finance.ts`), /valorParametro\('tc\.usd_pen'\)/);
    const cap = code(`${ROOT}/sheets/CaptureSheet.tsx`);
    assert.ok(!/'3% \+ IGV'|'90 días'/.test(cap));
    assert.match(cap, /ws\.agent\.commissionRate/);
  });
  it('"30 días" no aparece fuera del Core (ni siquiera en los datos demo)', () => {
    const fuera = files().filter((p) => !short(p).startsWith('core/') && /30 d[ií]as/.test(readFileSync(p, 'utf8')));
    assert.deepEqual(fuera.map(short), []);
  });
  it('cada método tiene id, nombre, definición y parámetros', () => {
    for (const m of Object.values(METODOS)) assert.ok(m.id.startsWith('M-') && m.nombre && m.definicion.length > 20 && Object.keys(m.parametros).length);
  });
});

describe('P1.2A · 8 — "Parámetros vigentes" solo con respaldo activo', () => {
  it('ningún texto de la app afirma parámetros vigentes/respaldados sin evaluar el respaldo', () => {
    const hallazgos = APP.filter((p) => /par[áa]metros vigentes/i.test(code(p))).map(short);
    assert.deepEqual(hallazgos, []);
    const fin = code(`${ROOT}/intelligence/finance.ts`);
    // "respaldados" solo aparece en la rama en que no hay pendientes.
    for (const m of fin.matchAll(/'[^']*[Rr]espaldad[oa]s[^']*'/g)) {
      const before = fin.slice(Math.max(0, m.index! - 400), m.index!);
      assert.match(before, /pendientes\.length\s*\n?\s*\?/, m[0]);
    }
  });
  it('en el estado actual, comisión e hipoteca no dicen "respaldados"', () => {
    const w = ws();
    assert.ok(!/respaldados/.test(commission(w.operations[0], w.agent).note));
    assert.ok(!/respaldados/.test(mortgage(200000).note));
  });
});

describe('P1.2A · 9 — Demo: todo dato demo visible está identificado', () => {
  it('los datos de mercado se declaran demo', () => assert.equal(MERCADO_ES_DEMO, true));
  it('toda pantalla que muestra datos de mercado referencia la marca DEMO', () => {
    const MERCADO = /S\.zone\(|ws\.zones|ws\.comparables|S\.position\(|compsFor\(/;
    const CAPA_DATOS = ['data/select.ts']; // selector puro: no muestra nada
    const sinMarca = APP.filter((p) => !CAPA_DATOS.includes(short(p)) && MERCADO.test(code(p)) && !/MERCADO_ES_DEMO|DemoTag/.test(code(p)));
    assert.deepEqual(sinMarca.map(short), []);
  });
  it('la cabecera y la vista pública muestran DEMO cuando la fuente es de demostración', () => {
    assert.match(code(`${ROOT}/app/Shell.tsx`), /demo && .*<DemoTag/);
    assert.match(code(`${ROOT}/app/store.tsx`), /demo: source\.demo/);
  });
  it('los datos del seed ya no incluyen lecturas editoriales de zona', () => {
    assert.ok(ws().zones.every((z) => !('reading' in z)));
  });
  it('la procedencia demo nunca es afirmable ante terceros', () => {
    assert.equal(afirmableATerceros(procedencia('AGENT_DATA', 'x', { demo: true })), false);
    assert.equal(afirmableATerceros(procedencia('AGENT_DATA', 'x')), true);
    assert.equal(afirmableATerceros(procedencia('UNVERIFIED', 'x')), false);
    assert.equal(afirmableATerceros(procedencia('MUNAY_METHOD', 'x')), false);
    assert.match(procedencia('CASE_DATA', 'x', { demo: true }).label, /DEMO/);
  });
});
