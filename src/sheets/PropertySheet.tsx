import { useStore } from '../app/store';
import * as S from '../data/select';
import { pct, relative, usd, usdK } from '../lib/format';
import { ClientRow, OperationRow, StatusPill } from '../ui/entities';
import { Icon } from '../ui/Icon';
import { Bullets, Media, mediaOf, Row, Section } from '../ui/kit';
import { METODOS } from '../core/metodos.ts';
import { MERCADO_ES_DEMO } from '../intelligence/procedencia';
import { Sheet } from './SheetHost';

export function PropertySheet({ id, accent }: { id: string; accent: string }) {
  const { ws, open, go, commit } = useStore();
  const p = S.prop(ws, id);
  if (!p) return null;
  const pos = S.position(ws, p);
  const op = S.operationFor(ws, p.id);
  const lst = S.listingFor(ws, p.id);
  const docs = S.docsFor(ws, p.id);
  const interested = ws.clients.filter((c) => c.role !== 'propietario' && c.propertyIds.includes(p.id));
  const owner = S.client(ws, p.ownerId);
  const leads = ws.leads.filter((l) => l.propertyId === p.id);
  const rate = p.views7d ? p.inquiries7d / p.views7d : 0;

  const important =
    p.status === 'activa'
      ? rate < METODOS.pulseBajaActividad.parametros.conversionMinima
        ? `Poca conversión: ${p.views7d} vistas, ${p.inquiries7d} consulta. ${pos.verdict === 'sobre' ? `El precio está ${pct(pos.diff)} sobre sus comparables${MERCADO_ES_DEMO ? ' (DEMO)' : ''}.` : 'El precio está en línea con sus comparables: revisa cómo se presenta.'}`
        : `Buen interés: ${p.inquiries7d} consultas en 7 días. Momento de agendar visitas.`
      : p.status === 'captación'
        ? `En captación. Rango del método MUNAY${MERCADO_ES_DEMO ? ' (comparables DEMO)' : ''}: ${usdK(pos.fairLow)}–${usdK(pos.fairHigh)}.`
        : op
          ? `${op.stage.charAt(0).toUpperCase() + op.stage.slice(1)}: ${op.nextAction}`
          : 'Operación cerrada.';

  return (
    <Sheet label="Propiedad" accent={accent}>
      <Media {...mediaOf(p)} height={250} style={{ margin: '0 calc(var(--gutter) * -1)', borderRadius: 0 }}>
        <div className="media-shade" />
        <div className="media-caption" style={{ left: 'var(--gutter)' }}>
          <StatusPill status={p.status} state={S.propertyState(ws, p)} />
        </div>
      </Media>

      <h1 className="title" style={{ marginTop: 20, fontSize: 34 }}>
        {p.type} en {p.district}
      </h1>
      <p className="muted" style={{ marginTop: 6 }}>{p.address}</p>

      <div className="stats" style={{ marginTop: 18, gridTemplateColumns: '1.5fr 1fr 1fr 1fr' }}>
        {[
          [usdK(p.priceUSD), 'Precio'],
          [`${p.areaM2}`, 'm²'],
          [p.bedrooms ? `${p.bedrooms}` : '—', 'Dorm.'],
          [`${p.parking}`, 'Estac.'],
        ].map(([v, l]) => (
          <div className="stat" key={l} style={{ padding: '12px 10px' }}>
            <div className="stat-value" style={{ fontSize: 17, whiteSpace: 'nowrap' }}>{v}</div>
            <div className="stat-label">{l}</div>
          </div>
        ))}
      </div>

      <Section title="Lo importante">
        <p className="lead" style={{ fontSize: 21 }}>{important}</p>
        <div className="actions" style={{ marginTop: 14 }}>
          <button className="btn small primary" onClick={() => open({ kind: 'analysis', mode: 'propiedad', subjectId: p.id })}>
            Analizar precio
          </button>
          <button className="btn small" onClick={() => go({ to: 'tab', tab: 'crea', params: { crea: { propertyId: p.id, nonce: Date.now() } } })}>
            Crear contenido
          </button>
          <button className="btn small" onClick={() => open({ kind: 'qr', id: p.id })}>
            <Icon name="qr" size={16} /> QR
          </button>
        </div>
      </Section>

      {leads.length > 0 && (
        <Section title="Interesados desde el QR">
          {leads.map((l) => (
            <div key={l.id} className="signal" onClick={() => !l.seen && commit({ type: 'lead.seen', id: l.id })}>
              <span className={`signal-mark${l.seen ? ' calm' : ''}`} />
              <span>
                <span className="signal-title" style={{ display: 'block' }}>{l.name} · {l.kind}</span>
                <span className="signal-detail" style={{ display: 'block' }}>{l.message} · {relative(l.at)}</span>
              </span>
            </div>
          ))}
        </Section>
      )}

      {op && (
        <Section title="Operación">
          <OperationRow op={op} />
        </Section>
      )}
      {lst && (
        <Section title="Captación">
          <Row title={`En ${lst.step}`} sub={lst.note} onClick={() => open({ kind: 'capture', id: lst.id })} />
        </Section>
      )}

      {interested.length > 0 && (
        <Section title="Clientes interesados">
          {interested.map((c) => (
            <ClientRow key={c.id} c={c} />
          ))}
        </Section>
      )}

      <Section title="Lo que la hace única">
        <p className="serif" style={{ fontSize: 19, fontStyle: 'italic', marginBottom: 14, lineHeight: 1.35 }}>“{p.story}”</p>
        <Bullets items={p.features} />
      </Section>

      <Section title="Detalles">
        {[
          ['Precio / m²', usd(p.priceUSD / p.areaM2)],
          ['Baños', String(p.bathrooms)],
          ...(p.floor ? [['Piso', String(p.floor)]] : []),
          ...(p.status === 'activa' ? [['Días publicada', String(p.daysOnMarket)], ['Vistas · 7 días', String(p.views7d)]] : []),
          ...(owner ? [['Propietario', owner.name]] : []),
        ].map(([k, v]) => (
          <div className="kv" key={k}>
            <span>{k}</span>
            <span>{v}</span>
          </div>
        ))}
      </Section>

      {docs.length > 0 && (
        <Section title="Documentos">
          {docs.map((d) => (
            <Row key={d.id} flat icon="doc" title={d.kind} sub={d.status} onClick={() => open({ kind: 'document', id: d.id })} />
          ))}
        </Section>
      )}
    </Sheet>
  );
}
