/**
 * Fase 8 — HubSpot: mapeo del proxy (functions/_lib/hubspot.ts) y unión con el catálogo local.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  type HsObject,
  DEFAULT_STAGES,
  NOTE_MARK,
  buildSnapshot,
  parseChange,
  parseStages,
  planWrite,
  toRemote,
} from '../../../functions/_lib/hubspot.ts';
import { createHubSpotSource, merge } from '../../data/adapters/hubspot.ts';
import { createSeed } from '../../data/mock/seed.ts';

const NOW = Date.parse('2026-10-01T12:00:00Z');
const o = (id: string, properties: HsObject['properties'], associations?: HsObject['associations']): HsObject => ({ id, properties, associations });
const assoc = (...ids: string[]) => ({ results: ids.map((id) => ({ id })) });

const raw = {
  contacts: [
    o('11', { firstname: 'Lucía', lastname: 'Rojas', phone: '+51 999 111 222', hs_lead_status: 'IN_PROGRESS', munay_rol: 'Comprador', munay_presupuesto: '150,000 - 220,000', munay_distritos: 'miraflores; Surco', munay_busca: '3 dormitorios', createdate: '2026-09-01T00:00:00Z' }),
    o('12', { firstname: 'Jorge', lastname: 'Gutiérrez', munay_rol: 'propietario', createdate: '2026-08-01T00:00:00Z' }),
  ],
  deals: [
    o('21', { dealname: 'Pardo 640', amount: '225000', dealstage: 'decisionmakerboughtin', closedate: '2026-10-15T00:00:00Z', hs_next_step: 'Revisar partida', munay_property_id: 'p-pardo', munay_comision: '3', munay_riesgos: 'Partida observada bloquea\nFalta tasación' }, { contacts: assoc('12', '11') }),
    o('22', { dealname: 'Perdido', amount: '1', dealstage: 'closedlost', munay_property_id: 'p-pardo' }, { contacts: assoc('11') }),
    o('23', { dealname: 'Sin propiedad', amount: '100000', dealstage: 'contractsent' }, { contacts: assoc('11') }),
  ],
  tasks: [
    o('31', { hs_task_subject: 'Visita con Lucía', hs_timestamp: '1790000000000', hs_task_status: 'NOT_STARTED', hs_task_type: 'TODO' }, { contacts: assoc('11') }),
    o('32', { hs_task_subject: 'Llamar a Jorge', hs_timestamp: '2026-10-02T15:00:00Z', hs_task_status: 'COMPLETED', hs_task_type: 'CALL' }, { deals: assoc('21') }),
  ],
  notes: [
    o('41', { hs_note_body: '<p>Prefiere piso alto &amp; vista</p>', hs_timestamp: '2026-09-28T10:00:00Z' }, { contacts: assoc('11') }),
    o('42', { hs_note_body: `${NOTE_MARK}Contacto registrado desde MUNAY.`, hs_timestamp: '2026-09-30T10:00:00Z' }, { contacts: assoc('11') }),
  ],
};

describe('Fase 8 · HubSpot → MUNAY', () => {
  const snap = buildSnapshot(raw, DEFAULT_STAGES, NOW);

  it('contactos → clientes con rol, presupuesto, distritos, probabilidad y último contacto', () => {
    const lucia = snap.clients.find((c) => c.id === 'hs-c-11')!;
    assert.equal(lucia.name, 'Lucía Rojas');
    assert.equal(lucia.role, 'comprador');
    assert.deepEqual(lucia.budgetUSD, [150000, 220000]);
    assert.deepEqual(lucia.districts, ['Miraflores', 'Santiago de Surco']);
    assert.equal(lucia.probability, 0.6);
    assert.equal(lucia.lastContactDays, 1); // la nota más reciente cuenta como contacto
    assert.deepEqual(lucia.propertyIds, ['p-pardo']);
  });

  it('la memoria del cliente usa sus notas, no las que escribe MUNAY', () => {
    assert.deepEqual(snap.clients.find((c) => c.id === 'hs-c-11')!.memory, ['Prefiere piso alto & vista']);
  });

  it('negocios → operaciones: etapa mapeada, perdidos fuera, propietario como vendedor', () => {
    assert.deepEqual(snap.operations.map((x) => x.id), ['hs-d-21', 'hs-d-23']);
    const op = snap.operations[0];
    assert.equal(op.stage, 'documentación');
    assert.equal(op.buyerId, 'hs-c-11');
    assert.equal(op.sellerId, 'hs-c-12');
    assert.equal(op.priceUSD, 225000);
    assert.equal(op.commissionRate, 0.03);
    assert.deepEqual(op.risks, ['Partida observada bloquea', 'Falta tasación']);
    assert.equal(op.nextAction, 'Revisar partida');
  });

  it('tareas y notas conservan fecha, estado, tipo y relación', () => {
    const [visita, llamada] = snap.tasks;
    assert.equal(visita.kind, 'visita');
    assert.equal(visita.relatedId, 'hs-c-11');
    assert.equal(visita.when, new Date(1790000000000).toISOString());
    assert.equal(llamada.kind, 'llamada');
    assert.equal(llamada.done, true);
    assert.equal(llamada.relatedId, 'hs-d-21');
    assert.equal(snap.activities[0].text, 'Contacto registrado desde MUNAY.');
  });

  it('HUBSPOT_DEAL_STAGES reemplaza solo las etapas indicadas', () => {
    const m = parseStages('{"tasación":"appraisal, valuation"}');
    assert.deepEqual(m.tasación, ['appraisal', 'valuation']);
    assert.deepEqual(m.firma, DEFAULT_STAGES.firma);
    assert.equal(parseStages('no es json'), DEFAULT_STAGES);
  });
});

describe('Fase 8 · MUNAY → HubSpot (lista cerrada)', () => {
  it('solo acepta IDs remotos numéricos', () => {
    assert.equal(toRemote('deal', 'hs-d-21'), '21');
    assert.equal(toRemote('deal', 'hs-d-21/../contacts'), null);
    assert.equal(toRemote('deal', 'o-1'), null);
  });

  it('rechaza cambios fuera de la lista o con datos inválidos', () => {
    assert.equal(parseChange({ type: 'listing.advance', id: 'l-1', step: 'firma' }), null);
    assert.equal(parseChange({ type: 'task.complete', id: 't-local' }), null);
    assert.equal(parseChange({ type: 'activity.log', activity: { text: 'x', at: 'ayer', relatedId: 'hs-c-1' } }), null);
    assert.equal(parseChange({ type: 'operation.update', id: 'hs-d-1', patch: { happened: ['x'] } }), null);
  });

  it('task.create asocia la tarea al contacto', () => {
    const c = parseChange({ type: 'task.create', task: { id: 't-1', title: 'Visita', when: '2026-10-02T15:30:00Z', kind: 'visita', relatedId: 'hs-c-11', done: false } })!;
    const plan = planWrite(c, DEFAULT_STAGES)!;
    assert.equal(plan.first.path, '/crm/v3/objects/tasks');
    assert.deepEqual((plan.first.body.associations as any)[0].to, { id: '11' });
    assert.equal((plan.first.body.associations as any)[0].types[0].associationTypeId, 204);
  });

  it('operation.update escribe etapa, monto y siguiente paso; sin equivalente, no escribe', () => {
    const c = parseChange({ type: 'operation.update', id: 'hs-d-21', patch: { stage: 'cerrada', happened: ['x'] } })!;
    const plan = planWrite(c, DEFAULT_STAGES, '2026-10-01T00:00:00.000Z')!;
    assert.equal(plan.first.method, 'PATCH');
    assert.equal(plan.first.path, '/crm/v3/objects/deals/21');
    assert.deepEqual(plan.first.body.properties, { dealstage: 'closedwon', closedate: '2026-10-01T00:00:00.000Z' });
    assert.equal(planWrite(parseChange({ type: 'operation.update', id: 'hs-d-21', patch: { stage: 'tasación' } })!, DEFAULT_STAGES), null);
  });

  it('lead.create crea el contacto y luego la nota con el mensaje', () => {
    const c = parseChange({ type: 'lead.create', lead: { id: 'ld', propertyId: 'p-pardo', name: 'Ana María Paz', kind: 'visita', message: 'Pidió una visita.', at: '2026-10-01T10:00:00Z', seen: false }, propertyLabel: 'Departamento · Av. José Pardo 640' })!;
    const plan = planWrite(c, DEFAULT_STAGES)!;
    assert.deepEqual(plan.first.body.properties, { firstname: 'Ana', lastname: 'María Paz', hs_lead_status: 'NEW', lifecyclestage: 'lead' });
    const note = plan.then!('99');
    assert.match(String((note.body.properties as any).hs_note_body), /^\[MUNAY\] Lead desde QR \(visita\) · Departamento · Av\. José Pardo 640: Pidió una visita\.$/);
    assert.deepEqual((note.body.associations as any)[0].to, { id: '99' });
  });
});

describe('Fase 8 · catálogo local + CRM', () => {
  const local = { ...createSeed(), clients: createSeed().clients.filter((c) => c.id === 'c-gutierrez'), operations: [], tasks: [], activities: [], leads: [] };
  const { ws, skippedDeals } = merge(local, buildSnapshot(raw, DEFAULT_STAGES, NOW));

  it('solo muestra negocios con propiedad del catálogo y comprador; cuenta los demás', () => {
    assert.deepEqual(ws.operations.map((x) => x.id), ['hs-d-21']);
    assert.equal(skippedDeals, 1);
  });

  it('conserva los propietarios del catálogo y completa la comisión con la del agente si falta', () => {
    assert.ok(ws.clients.some((c) => c.id === 'c-gutierrez'));
    const m = merge(local, { clients: [], tasks: [], activities: [], operations: [{ ...buildSnapshot(raw, DEFAULT_STAGES, NOW).operations[0], buyerId: 'c-gutierrez', commissionRate: undefined }] });
    assert.equal(m.ws.operations[0].commissionRate, local.agent.commissionRate);
  });

  it('un seguimiento (contacto + actividad del mismo cliente) deja una sola nota en HubSpot', async () => {
    const sent: any[] = [];
    const prev = globalThis.fetch;
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      sent.push(JSON.parse(String(init.body)).change);
      return new Response('{"ok":true}', { status: 200 });
    }) as typeof fetch;
    try {
      const src = createHubSpotSource();
      const at = new Date(NOW).toISOString();
      await Promise.all([
        src.commit({ type: 'client.contacted', id: 'hs-c-11' }, ws),
        src.commit({ type: 'activity.log', activity: { id: 'ac-1', at, text: 'Seguimiento enviado a Lucía.', relatedId: 'hs-c-11' } }, ws),
        src.commit({ type: 'listing.advance', id: 'l-1', step: 'firma' }, ws),
      ]);
      assert.deepEqual(sent.map((c) => c.type), ['activity.log']);
      sent.length = 0;
      await src.commit({ type: 'client.contacted', id: 'hs-c-11' }, ws);
      assert.deepEqual(sent.map((c) => c.type), ['client.contacted']);
    } finally {
      globalThis.fetch = prev;
    }
  });

  it('la fuente HubSpot sigue declarándose demo mientras el catálogo sea de demostración', () => {
    assert.equal(createHubSpotSource().demo, true);
  });

  it('el token de HubSpot solo existe en el servidor', () => {
    const SRC = decodeURIComponent(new URL('../../', import.meta.url).pathname);
    const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(`${d}/${f}`).isDirectory() ? walk(`${d}/${f}`) : [`${d}/${f}`]));
    const leaks = walk(SRC).filter((p) => !p.includes('/core/tests/') && /HUBSPOT_TOKEN|api\.hubapi\.com/.test(readFileSync(p, 'utf8')));
    assert.deepEqual(leaks, []);
  });
});
