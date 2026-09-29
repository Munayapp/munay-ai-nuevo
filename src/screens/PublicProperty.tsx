/**
 * PROPERTY QR — experiencia del visitante. "La propiedad cobra vida."
 * No es una ficha: es una conversación con la propiedad que termina en interés para el agente.
 */
import { useState, type CSSProperties } from 'react';
import { useStore } from '../app/store';
import { uid } from '../data/changes';
import * as S from '../data/select';
import type { Lead, Property, Workspace } from '../data/types';
import { mortgage } from '../intelligence/finance';
import { normalize, usd, usdK } from '../lib/format';
import { Icon } from '../ui/Icon';
import { Media, mediaOf, Wordmark } from '../ui/kit';

function answer(p: Property, ws: Workspace, q: string): string {
  const t = normalize(q);
  const z = S.zone(ws, p.district);
  const agent = ws.agent.firstName;
  if (/precio|cuesta|vale|cuanto/.test(t) && !/cuota|mensual/.test(t)) return `${usd(p.priceUSD)}, es decir ${usd(p.priceUSD / p.areaM2)} por m². La zona promedia ${usd(z.medianUSDm2)} por m².`;
  if (/cuota|credito|hipoteca|mensual|financ/.test(t)) return `${mortgage(p.priceUSD).headline} Referencial: 10% de inicial, 20 años. ${agent} puede ayudarte con la precalificación.`;
  if (/estacion|cochera|auto/.test(t)) return p.parking ? `Sí, ${p.parking} estacionamiento${p.parking > 1 ? 's' : ''}.` : 'No incluye estacionamiento.';
  if (/dormitorio|cuarto|habitacion/.test(t)) return p.bedrooms ? `${p.bedrooms} dormitorios y ${p.bathrooms} baños.` : `Es planta libre, con ${p.bathrooms} baños.`;
  if (/metro|m2|area|tamano|grande/.test(t)) return `${p.areaM2} m²${p.floor ? `, en el piso ${p.floor}` : ''}.`;
  if (/zona|barrio|cerca|ubicacion|donde/.test(t)) return `${p.address}, ${p.district}. ${p.features.find((f) => /cuadra|zona|parque|malecon|centro|colegio/i.test(f)) ?? z.reading}`;
  if (/luz|vista|ilumin/.test(t)) return p.features.find((f) => /luz|vista/i.test(f)) ?? `${agent} te lo muestra mejor en persona: es de lo que más gusta.`;
  if (/visita|ver|conocer/.test(t)) return 'Con gusto. Pide tu visita aquí abajo y te confirman el horario.';
  return `Buena pregunta. ${agent} te responderá personalmente; déjala junto con tu interés aquí abajo.`;
}

const QUESTIONS = ['¿Cuánto cuesta?', '¿Cuánto sería la cuota?', '¿Tiene estacionamiento?', '¿Cómo es la zona?', '¿Aceptan mascotas?'];

export function PublicProperty({ id }: { id: string }) {
  const { ws, commit } = useStore();
  const p = S.prop(ws, id);
  const [chat, setChat] = useState<{ q: string; a: string }[]>([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState<null | Lead['kind']>(null);
  const [name, setName] = useState('');
  const [sent, setSent] = useState(false);

  if (!p) {
    return (
      <div className="loading">
        <p className="muted">Esta propiedad ya no está disponible.</p>
      </div>
    );
  }

  const ask = (text: string) => {
    if (!text.trim()) return;
    setChat((c) => [...c, { q: text, a: answer(p, ws, text) }]);
    setQ('');
  };

  const send = () => {
    const lastQ = chat.length ? ` Preguntó: “${chat[chat.length - 1].q}”` : '';
    commit({
      type: 'lead.create',
      lead: { id: uid('ld'), propertyId: p.id, name: name.trim() || 'Un visitante', kind: form ?? 'interés', message: `${form === 'visita' ? 'Pidió una visita.' : 'Dejó su interés.'}${lastQ}`, at: new Date().toISOString(), seen: false },
    });
    setSent(true);
  };

  return (
    <div className="app" style={{ '--accent': 'var(--cream)' } as CSSProperties}>
      <div className="scroll">
        <Media {...mediaOf(p)} height="58dvh" radius={0} style={{ minHeight: 380 }}>
          <div className="hero-shade" />
          <div style={{ position: 'absolute', top: 22, left: 20, right: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Wordmark />
            <span className="small" style={{ opacity: 0.8 }}>con {ws.agent.name}</span>
          </div>
          <div style={{ position: 'absolute', left: 20, right: 20, bottom: 24 }} className="rise">
            <p className="eyebrow" style={{ color: 'var(--cream)', marginBottom: 10 }}>{p.district} · {p.type}</p>
            <h1 className="display" style={{ fontSize: 40, lineHeight: 1.02 }}>{p.story}</h1>
          </div>
        </Media>

        <div className="page" style={{ paddingBottom: 60 }}>
          <div className="stats" style={{ marginTop: 20, gridTemplateColumns: '1.5fr 1fr 1fr 1fr' }}>
            {[
              [usdK(p.priceUSD), 'Precio'],
              [`${p.areaM2}`, 'm²'],
              [p.bedrooms ? `${p.bedrooms}` : '—', 'Dorm.'],
              [`${p.bathrooms}`, 'Baños'],
            ].map(([v, l]) => (
              <div className="stat" key={l} style={{ padding: '12px 10px' }}>
                <div className="stat-value" style={{ fontSize: 17, whiteSpace: 'nowrap' }}>{v}</div>
                <div className="stat-label">{l}</div>
              </div>
            ))}
          </div>

          <section className="section">
            <p className="lead">Pregúntale a esta propiedad.</p>
            <div style={{ marginTop: 14 }}>
              {chat.map((c, i) => (
                <div key={i} className="turn" style={{ marginBottom: 16 }}>
                  <div className="you">{c.q}</div>
                  <p>{c.a}</p>
                </div>
              ))}
            </div>
            <div className="chips" style={{ marginBottom: 12 }}>
              {QUESTIONS.map((x) => (
                <button key={x} className="chip" onClick={() => ask(x)}>
                  {x}
                </button>
              ))}
            </div>
            <div className="composer">
              <textarea rows={1} value={q} placeholder="Escribe tu pregunta…" onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ask(q); } }} />
              <button className="composer-main" aria-label="Preguntar" onClick={() => ask(q)}>
                <Icon name="send" size={18} />
              </button>
            </div>
          </section>

          <section className="section">
            {!sent && !form && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button className="btn primary" onClick={() => setForm('visita')}>
                  <Icon name="calendar" size={18} /> Solicitar visita
                </button>
                <button className="btn" onClick={() => setForm('interés')}>
                  <Icon name="heart" size={18} /> Me interesa
                </button>
              </div>
            )}
            {!sent && form && (
              <div className="rise">
                <p style={{ marginBottom: 10 }}>{form === 'visita' ? '¿Cómo te llamas? Te confirmarán el horario.' : '¿Cómo te llamas? Te escribirán con más detalles.'}</p>
                <input className="field" placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                <div className="actions" style={{ marginTop: 10 }}>
                  <button className="btn primary" onClick={send}>
                    Enviar
                  </button>
                  <button className="btn" onClick={() => setForm(null)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            {sent && (
              <div className="coach rise">
                <span className="coach-icon">
                  <Icon name="check" size={24} />
                </span>
                <span className="coach-text">Listo. {ws.agent.firstName} ya recibió tu {form === 'visita' ? 'solicitud de visita' : 'interés'} y te escribirá pronto.</span>
              </div>
            )}
          </section>

          <section className="section">
            <p className="eyebrow" style={{ marginBottom: 12 }}>Lo que la hace única</p>
            {p.features.map((f) => (
              <p key={f} className="kv" style={{ justifyContent: 'flex-start', gap: 10 }}>
                <Icon name="check" size={16} className="accent" /> <span style={{ color: 'var(--text)' }}>{f}</span>
              </p>
            ))}
          </section>

          <p className="note" style={{ marginTop: 30, textAlign: 'center' }}>
            Experiencia de demostración.{' '}
            <a href="#/hoy" style={{ color: 'var(--text-2)' }}>
              Volver a MUNAY (vista del agente)
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
