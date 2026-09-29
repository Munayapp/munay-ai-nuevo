import { useStore } from '../app/store';
import * as S from '../data/select';
import { integrations } from '../data/integrations';
import { netCommissionPEN } from '../intelligence/finance';
import { memory } from '../intelligence/memory';
import { pct, penK, relative } from '../lib/format';
import { Bullets, Meter, Section } from '../ui/kit';
import { Sheet } from './SheetHost';

const STATUS_COLOR = { activa: 'var(--teal)', preparada: 'var(--gold)', futura: 'var(--text-3)' };

export function ProfileSheet({ accent }: { accent: string }) {
  const { ws, reset } = useStore();
  const a = ws.agent;
  const m = memory.get();
  const earned = ws.operations.filter((o) => o.stage === 'cerrada').reduce((s, o) => s + netCommissionPEN(o, a), 0);
  const focus = [
    m.focus.propertyId && `Propiedad: ${S.prop(ws, m.focus.propertyId)?.address.split(',')[0]}`,
    m.focus.clientId && `Cliente: ${S.client(ws, m.focus.clientId)?.name}`,
    m.focus.operationId && `Operación: ${S.prop(ws, S.operation(ws, m.focus.operationId)?.propertyId)?.address.split(',')[0]}`,
  ].filter(Boolean) as string[];

  return (
    <Sheet label="Tú" accent={accent}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
        <span className="avatar" style={{ width: 60, height: 60, fontSize: 18 }}>{a.initials}</span>
        <div>
          <h1 className="title" style={{ fontSize: 30 }}>{a.name}</h1>
          <p className="small muted">
            {a.role} · {a.city}
          </p>
        </div>
      </div>

      <Section title="Meta del mes">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span>{penK(earned)} de {penK(a.goals.monthlyCommissionPEN)}</span>
          <span className="muted">{pct(earned / a.goals.monthlyCommissionPEN)}</span>
        </div>
        <Meter value={Math.min(1, earned / a.goals.monthlyCommissionPEN)} />
      </Section>

      <Section title="Memory · lo que MUNAY recuerda de ti">
        <Bullets
          items={[
            `Trabajas en ${a.preferences.focusDistricts.join(', ')}.`,
            `Tono de tus mensajes: ${a.preferences.tone}.`,
            `Comisión habitual ${pct(a.commissionRate)} · agencia ${pct(a.agencySplit)}.`,
            `${m.sessions} ${m.sessions === 1 ? 'sesión' : 'sesiones'} con MUNAY en este dispositivo.`,
            ...(focus.length ? [`Estabas en → ${focus.join(' · ')}`] : []),
          ]}
        />
        {m.prompts.length > 0 && (
          <>
            <p className="eyebrow" style={{ margin: '20px 0 6px' }}>Lo último que pediste</p>
            {m.prompts.slice(0, 5).map((p) => (
              <div className="kv" key={p.at}>
                <span style={{ color: 'var(--text)' }}>{p.text}</span>
                <span className="faint">{relative(p.at)}</span>
              </div>
            ))}
          </>
        )}
      </Section>

      <Section title="Infraestructura">
        {integrations.map((i) => (
          <div key={i.id} className="kv" style={{ alignItems: 'flex-start' }}>
            <span>
              <span style={{ display: 'block', color: 'var(--text)', fontWeight: 600 }}>{i.name}</span>
              <span className="small">{i.purpose}</span>
            </span>
            <span className="small" style={{ color: STATUS_COLOR[i.status], textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{i.status}</span>
          </div>
        ))}
        <p className="note" style={{ marginTop: 12 }}>Costo actual: S/0. Todo funciona en este dispositivo. Nada se envía a servidores externos.</p>
      </Section>

      <div className="section">
        <button className="btn block" onClick={reset}>
          Reiniciar datos de demostración
        </button>
      </div>
    </Sheet>
  );
}
