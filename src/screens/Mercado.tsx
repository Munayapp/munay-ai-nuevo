import { useState, type CSSProperties } from 'react';
import { useStore } from '../app/store';
import * as S from '../data/select';
import type { Comparable, District, Property } from '../data/types';
import { coach } from '../intelligence/coach';
import { pct, signedPct, usd, usdK } from '../lib/format';
import { Icon } from '../ui/Icon';
import { Coach, DemoTag, Display, LineChart, Media, Section, Seg, Thinking } from '../ui/kit';
import { METODOS } from '../core/metodos.ts';
import { MERCADO_ES_DEMO } from '../intelligence/procedencia';
import { ZoneMap } from '../ui/ZoneMap';

type SegId = 'zonas' | 'comparables' | 'tendencias';
const DISTRICTS: District[] = ['Miraflores', 'San Isidro', 'Barranco', 'Santiago de Surco', 'La Molina'];

function CompCard({ c, width = 118 }: { c: Comparable; width?: number }) {
  return (
    <div className="comp" style={{ width }}>
      <Media scene={c.type === 'Casa' ? 'terrace' : 'facade'} seed={c.seed} photo={c.photo} alt={c.address} />
      <div className="comp-price">{usd(c.priceUSD)}</div>
      <div className="comp-meta">
        {c.areaM2} m² · {c.bedrooms} dorm
        <br />A {c.distanceBlocks} cuadras · {c.status}
      </div>
    </div>
  );
}

/** "¿Qué significa esto para tu propiedad?" — MUNAY traduce datos en criterio. */
function Meaning({ p }: { p: Property }) {
  const { ws, open, go } = useStore();
  const [phase, setPhase] = useState<'idle' | 'thinking' | 'done'>('idle');
  const pos = S.position(ws, p);
  if (phase === 'idle')
    return (
      <button className="btn block primary" onClick={() => setPhase('thinking')}>
        ¿Qué significa esto para tu propiedad?
      </button>
    );
  if (phase === 'thinking') return <Thinking stages={['Comparando precio por m²…', `Leyendo ${p.district}…`, 'Encontré esto.']} onDone={() => setPhase('done')} />;
  const verdict =
    pos.verdict === 'sobre'
      ? `Estás ${pct(pos.diff)} sobre tus comparables.`
      : pos.verdict === 'bajo'
        ? `Estás ${pct(-pos.diff)} bajo tus comparables: hay margen para negociar mejor.`
        : 'Estás en línea con tus comparables.';
  const act = pos.verdict === 'sobre' ? `Ajustar a ${usdK(pos.fairHigh)} te pondría dentro del rango del método MUNAY.` : 'Mantén el precio y trabaja la visibilidad.';
  return (
    <div className="answer rise">
      <p className="lead">{verdict}</p>
      <p className="muted">{act}</p>
      <div className="kv">
        <span>Tu precio / m²</span>
        <span>{usd(pos.ownM2)}</span>
      </div>
      <div className="kv">
        <span>Comparables / m²</span>
        <span>{usd(pos.compM2)}</span>
      </div>
      <div className="kv strong">
        <span>{METODOS.rangoValorizacion.nombre}</span>
        <span>
          {usdK(pos.fairLow)}–{usdK(pos.fairHigh)}
        </span>
      </div>
      <div className="actions">
        <button className="btn small primary" onClick={() => open({ kind: 'analysis', mode: 'propiedad', subjectId: p.id })}>
          Análisis completo
        </button>
        <button className="btn small" onClick={() => go({ to: 'tab', tab: 'crea', params: { crea: { propertyId: p.id, objective: 'vender', piece: 'post', nonce: Date.now() } } })}>
          Comunicar el valor
        </button>
      </div>
    </div>
  );
}

export function Mercado() {
  const { ws, params, open, go } = useStore();
  const pm = params.mercado ?? {};
  const [seg, setSeg] = useState<SegId>(pm.seg ?? 'zonas');
  const [district, setDistrict] = useState<District>(pm.district ?? ws.agent.preferences.focusDistricts[0]);
  const [range, setRange] = useState<6 | 12>(6);
  const zone = S.zone(ws, district);
  const mine = ws.properties.filter((p) => p.district === district && p.status !== 'vendida');
  const [focusId, setFocusId] = useState<string | undefined>(pm.propertyId);
  const focus = mine.find((p) => p.id === focusId) ?? mine.find((p) => p.status === 'activa') ?? mine[0];
  const comps = focus ? S.compsFor(ws, focus) : ws.comparables.filter((c) => c.district === district);
  const areas = comps.map((c) => c.areaM2);
  const lo = Math.floor(Math.min(...areas) / 10) * 10;
  const hi = Math.ceil(Math.max(...areas) / 10) * 10;
  const advice = coach('mercado', ws);
  const series = zone.series.slice(-range).map((s) => ({ label: s.month, value: s.usdM2 }));

  const pickDistrict = (d: District) => {
    setDistrict(d);
    setFocusId(undefined);
  };

  return (
    <div className="page">
      <Display title="Mercado" sub="Datos que te dan ventaja." />
      {MERCADO_ES_DEMO && (
        <p className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <DemoTag what="Datos de mercado de demostración" /> Zonas, comparables y tendencias de demostración: sin fuente de mercado conectada.
        </p>
      )}

      <Seg<SegId>
        value={seg}
        onChange={setSeg}
        options={[
          { id: 'zonas', label: 'Zonas' },
          { id: 'comparables', label: 'Comparables' },
          { id: 'tendencias', label: 'Tendencias' },
        ]}
      />

      <div className="chips" style={{ marginBottom: 16 }}>
        {DISTRICTS.map((d) => (
          <button key={d} className="chip" style={d === district ? { color: 'var(--ink)', background: 'var(--teal)', borderColor: 'var(--teal)', fontWeight: 600 } : undefined} onClick={() => pickDistrict(d)}>
            {d}
          </button>
        ))}
      </div>

      {seg === 'zonas' && (
        <div className="rise" key={district}>
          <ZoneMap comps={comps} focus={focus} />
          <button className="section-head" style={{ width: '100%', marginTop: 16, alignItems: 'center' }} onClick={() => setSeg('comparables')}>
            <span style={{ textAlign: 'left' }}>
              <span style={{ display: 'block', fontSize: 17, fontWeight: 600 }}>{district}</span>
              <span className="small muted">
                {focus?.type === 'Casa' ? 'Casas' : 'Departamentos'} · {lo}–{hi} m²
              </span>
            </span>
            <span className="icon-btn" style={{ border: '1px solid var(--line-2)' }}>
              <Icon name="arrow" size={18} />
            </span>
          </button>
          <div className="scroller" style={{ marginBottom: 8 }}>
            {comps.slice(0, 5).map((c) => (
              <CompCard key={c.id} c={c} />
            ))}
          </div>

          <Section title="Evolución de precios en la zona" link={range === 6 ? '6M ⌄' : '12M ⌄'} onLink={() => setRange(range === 6 ? 12 : 6)}>
            <LineChart data={series} format={(v) => (Math.round(v / 10) * 10).toLocaleString('en-US')} />
            <p className="small muted" style={{ marginTop: 10 }}>
              US$/m² · {signedPct(zone.changeYoY)} en 12 meses · {zone.daysOnMarket} días promedio de venta
            </p>
          </Section>

          {advice && (
            <div className="section">
              <Coach label="Lectura de MUNAY" icon="eye" text={advice.text} cta={advice.action.label} onClick={() => advice.action.go && go(advice.action.go)} />
            </div>
          )}
        </div>
      )}

      {seg === 'comparables' && (
        <div className="rise" key={`c-${district}`}>
          {mine.length > 0 && (
            <>
              <p className="eyebrow" style={{ marginBottom: 10 }}>Comparar con</p>
              <div className="chips" style={{ marginBottom: 18 }}>
                {mine.map((p) => (
                  <button key={p.id} className="chip" style={p.id === focus?.id ? { color: 'var(--text)', borderColor: 'var(--teal)' } : undefined} onClick={() => setFocusId(p.id)}>
                    {p.address.split(',')[0]} · {usdK(p.priceUSD)}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="stack">
            {comps.map((c, i) => (
              <div key={c.id} className="entity rise" style={{ '--i': i, cursor: 'default' } as CSSProperties}>
                <Media scene={c.type === 'Casa' ? 'terrace' : 'facade'} seed={c.seed} photo={c.photo} alt={c.address} />
                <span>
                  <span className="entity-title" style={{ display: 'block' }}>{usd(c.priceUSD)}</span>
                  <span className="entity-sub" style={{ display: 'block', marginBottom: 4 }}>
                    {c.address} · {c.areaM2} m² · {c.bedrooms} dorm
                  </span>
                  <span className="small faint">
                    {usd(c.priceUSD / c.areaM2)}/m² · {c.status} · {c.daysListed} d
                  </span>
                </span>
                <span />
              </div>
            ))}
          </div>
          {focus && (
            <div className="section">
              <Meaning key={focus.id} p={focus} />
            </div>
          )}
          <p className="note" style={{ marginTop: 20 }}>Comparables de demostración. Preparado para conectar fuentes MLS y portales.</p>
        </div>
      )}

      {seg === 'tendencias' && (
        <div className="rise">
          <p className="lead" style={{ marginBottom: 6 }}>
            {district} {zone.changeYoY >= 0 ? 'sube' : 'baja'} {pct(Math.abs(zone.changeYoY), 1)} en el año.
          </p>

          <div className="stats" style={{ marginBottom: 22 }}>
            <div className="stat">
              <div className="stat-value">{zone.medianUSDm2.toLocaleString('en-US')}</div>
              <div className="stat-label">US$/m² mediana</div>
            </div>
            <div className="stat">
              <div className="stat-value">{zone.daysOnMarket}</div>
              <div className="stat-label">Días de venta</div>
            </div>
            <div className="stat">
              <div className="stat-value" style={{ textTransform: 'capitalize' }}>{zone.demand}</div>
              <div className="stat-label">Demanda</div>
            </div>
          </div>
          <LineChart data={zone.series.map((s) => ({ label: s.month, value: s.usdM2 }))} format={(v) => (Math.round(v / 10) * 10).toLocaleString('en-US')} />

          <Section title="Todas las zonas · US$/m²">
            {[...ws.zones]
              .sort((a, b) => b.changeYoY - a.changeYoY)
              .map((z) => {
                const max = Math.max(...ws.zones.map((x) => x.medianUSDm2));
                return (
                  <button key={z.district} className="kv" style={{ width: '100%', alignItems: 'center' }} onClick={() => pickDistrict(z.district)}>
                    <span style={{ flex: '0 0 118px', textAlign: 'left', color: z.district === district ? 'var(--text)' : undefined }}>{z.district}</span>
                    <span style={{ flex: 1, height: 4, background: 'var(--line)', borderRadius: 2, overflow: 'hidden' }}>
                      <i style={{ display: 'block', height: '100%', width: `${(z.medianUSDm2 / max) * 100}%`, background: z.district === district ? 'var(--teal)' : 'var(--line-3)' }} />
                    </span>
                    <span style={{ flex: '0 0 92px' }}>
                      {z.medianUSDm2.toLocaleString('en-US')} <span className="faint">{signedPct(z.changeYoY)}</span>
                    </span>
                  </button>
                );
              })}
          </Section>
          {focus && (
            <div className="section">
              <button className="btn block" onClick={() => open({ kind: 'analysis', mode: 'propiedad', subjectId: focus.id })}>
                ¿Cómo afecta esto a {focus.address.split(',')[0]}?
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
