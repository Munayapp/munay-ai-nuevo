import { useStore } from '../app/store';
import { uid } from '../data/changes';
import * as S from '../data/select';
import { followUpMessage } from '../intelligence/drafts';
import { evidenciaAgente } from '../intelligence/evidencia';
import { METODOS } from '../core/metodos.ts';
import { pct, relative, usdK } from '../lib/format';
import { PropertyRow } from '../ui/entities';
import { Bullets, Initials, Meter, Section } from '../ui/kit';
import { Sheet } from './SheetHost';

export function ClientSheet({ id, accent }: { id: string; accent: string }) {
  const { ws, run, demo } = useStore();
  const c = S.client(ws, id);
  if (!c) return null;
  const props = c.propertyIds.map((pid) => S.prop(ws, pid)!).filter(Boolean);
  const draft = followUpMessage(c, ws.agent, props[0], props[0] && S.listingFor(ws, props[0].id)?.step, props[0] && evidenciaAgente(ws, props[0].district, demo));
  const history = ws.activities.filter((a) => a.relatedId === c.id);
  const role = { comprador: 'Comprador', propietario: 'Propietario', inversionista: 'Inversionista' }[c.role];
  const urgent = c.lastContactDays >= METODOS.pulseSeguimiento.parametros.diasSinContacto;

  return (
    <Sheet label="Cliente" accent={accent}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 12 }}>
        <span style={{ transform: 'scale(1.35)', transformOrigin: 'left center', marginRight: 14 }}>
          <Initials name={c.name} />
        </span>
        <div>
          <h1 className="title" style={{ fontSize: 30 }}>{c.name}</h1>
          <p className="muted small">
            {role} · {c.phone}
          </p>
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="small muted">{c.role === 'propietario' ? 'Probabilidad de firmar' : 'Probabilidad de compra'}</span>
          <span className="small" style={{ fontWeight: 700 }}>{pct(c.probability)}</span>
        </div>
        <Meter value={c.probability} />
      </div>

      <Section title="Lo importante">
        <p className="lead" style={{ fontSize: 21 }}>
          {urgent ? `${c.lastContactDays} días sin contacto. Es el momento de escribirle.` : c.lastContactDays === 0 ? 'Contactado hoy. Siguiente paso en marcha.' : `Contacto reciente (hace ${c.lastContactDays} días).`}
        </p>
        <div style={{ marginTop: 14 }}>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Mensaje sugerido · WhatsApp</p>
          <div className="draft">{draft}</div>
          <div className="actions" style={{ marginTop: 12 }}>
            <button
              className="btn small primary"
              onClick={() =>
                run({
                  label: 'Copiar',
                  effects: [
                    { do: 'copy', text: draft },
                    { do: 'change', change: { type: 'client.contacted', id: c.id }, toast: 'Mensaje copiado · contacto registrado' },
                    { do: 'change', change: { type: 'activity.log', activity: { id: uid('ac'), at: new Date().toISOString(), text: `Seguimiento enviado a ${c.name}.`, relatedId: c.id } }, toast: '' },
                  ],
                })
              }
            >
              Copiar y registrar contacto
            </button>
          </div>
        </div>
      </Section>

      <Section title="MUNAY recuerda">
        <Bullets items={c.memory} />
      </Section>

      <Section title="Perfil">
        <div className="kv">
          <span>Busca</span>
          <span>{c.wants}</span>
        </div>
        {c.budgetUSD && (
          <div className="kv">
            <span>Presupuesto</span>
            <span>
              {usdK(c.budgetUSD[0])}–{usdK(c.budgetUSD[1])}
            </span>
          </div>
        )}
        <div className="kv">
          <span>Zonas</span>
          <span>{c.districts.join(', ')}</span>
        </div>
      </Section>

      {props.length > 0 && (
        <Section title="Propiedades">
          <div className="stack">
            {props.map((p) => (
              <PropertyRow key={p.id} p={p} />
            ))}
          </div>
        </Section>
      )}

      {history.length > 0 && (
        <Section title="Historial">
          {history.map((a) => (
            <div key={a.id} className="kv">
              <span>{a.text}</span>
              <span className="faint">{relative(a.at)}</span>
            </div>
          ))}
        </Section>
      )}
    </Sheet>
  );
}
