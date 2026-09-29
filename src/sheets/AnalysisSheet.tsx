import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { AnalysisMode, MunayAction, SheetSpec } from '../app/nav';
import { useStore } from '../app/store';
import * as S from '../data/select';
import type { Operation, Property, Workspace } from '../data/types';
import { readFile, type DocReading } from '../intelligence/docReader';
import { followUpMessage } from '../intelligence/drafts';
import { commission, netCommissionPEN, rentalYield } from '../intelligence/finance';
import { pct, penK, signedPct, usd, usdK } from '../lib/format';
import { ENTRIES } from '../screens/Analiza';
import { ClientRow, OperationRow, PropertyRow } from '../ui/entities';
import { Icon } from '../ui/Icon';
import { Bullets, Kv, Reveal, Row, Thinking } from '../ui/kit';
import { ActionBar, BreakdownView, ReadingView } from './Blocks';
import { Sheet } from './SheetHost';

interface Result {
  headline: string;
  why: ReactNode;
  details: ReactNode;
  actions: MunayAction[];
  subject?: ReactNode;
}

function propertyResult(ws: Workspace, p: Property): Result {
  const pos = S.position(ws, p);
  const z = S.zone(ws, p.district);
  const owner = S.client(ws, p.ownerId);
  const headline =
    pos.verdict === 'sobre'
      ? `Está ${pct(pos.diff)} sobre el mercado. En ${usdK(pos.fairHigh)} se vendería en ~${z.daysOnMarket} días.`
      : pos.verdict === 'bajo'
        ? `Está ${pct(-pos.diff)} bajo el mercado. Hay margen para defender el precio.`
        : `Está en precio de mercado (${usdK(pos.fairLow)}–${usdK(pos.fairHigh)}).`;
  const priceMsg = owner
    ? `Hola ${owner.name.split(' ')[0]}, revisé ${pos.comps.length} comparables cerca de ${p.address.split(',')[0]}. Hoy el rango que se vende está entre ${usdK(pos.fairLow)} y ${usdK(pos.fairHigh)}. Te propongo ajustar a ${usdK(pos.fairHigh)} para entrar en ese rango. ¿Lo conversamos?`
    : '';
  return {
    headline,
    subject: <PropertyRow p={p} />,
    why: (
      <>
        <Kv rows={pos.comps.slice(0, 5).map((c) => [`${c.address} · ${c.areaM2} m²`, `${usd(c.priceUSD / c.areaM2)}/m²`] as [string, string])} />
        <p className="small muted" style={{ marginTop: 10 }}>
          {z.reading} {p.status === 'activa' ? `En 7 días: ${p.views7d} vistas, ${p.inquiries7d} consultas.` : ''}
        </p>
      </>
    ),
    details: (
      <Kv
        rows={[
          ['Tu precio / m²', usd(pos.ownM2)],
          ['Comparables / m²', usd(pos.compM2)],
          ['Mediana de la zona', `${usd(z.medianUSDm2)}/m²`],
          ['Tendencia 12 meses', signedPct(z.changeYoY)],
          ['Días promedio de venta', String(z.daysOnMarket)],
        ]}
      />
    ),
    actions: [
      ...(pos.verdict === 'sobre' && priceMsg ? [{ label: 'Copiar mensaje al propietario', primary: true, effects: [{ do: 'copy' as const, text: priceMsg, toast: 'Mensaje copiado' }] }] : []),
      { label: 'Ver en Mercado', go: { to: 'tab', tab: 'mercado', params: { mercado: { district: p.district, propertyId: p.id, seg: 'comparables' } } } },
      { label: 'Crear contenido', go: { to: 'tab', tab: 'crea', params: { crea: { propertyId: p.id, nonce: Date.now() } } } },
    ],
  };
}

function clientResult(ws: Workspace, id: string): Result {
  const c = S.client(ws, id)!;
  const props = c.propertyIds.map((x) => S.prop(ws, x)!);
  const fit = c.budgetUSD ? props.filter((p) => p.priceUSD <= c.budgetUSD![1] * 1.05) : props;
  const level = c.probability >= 0.8 ? 'alta' : c.probability >= 0.6 ? 'media' : 'baja';
  return {
    headline: `Probabilidad ${level} (${pct(c.probability)}). ${c.lastContactDays >= 5 ? `Lleva ${c.lastContactDays} días sin contacto: escríbele hoy.` : 'Mantén el ritmo actual.'}`,
    subject: <ClientRow c={c} />,
    why: (
      <>
        <Bullets items={c.memory} />
        {c.budgetUSD && (
          <p className="small muted" style={{ marginTop: 12 }}>
            {fit.length ? `${fit.length} de ${props.length} propiedades encajan en su presupuesto.` : 'Ninguna propiedad actual encaja en su presupuesto.'}
          </p>
        )}
      </>
    ),
    details: (
      <Kv
        rows={[
          ['Busca', c.wants],
          ...(c.budgetUSD ? ([['Presupuesto', `${usdK(c.budgetUSD[0])}–${usdK(c.budgetUSD[1])}`]] as [string, string][]) : []),
          ['Zonas', c.districts.join(', ')],
          ['Último contacto', c.lastContactDays ? `hace ${c.lastContactDays} días` : 'hoy'],
        ]}
      />
    ),
    actions: [
      { label: 'Copiar mensaje', primary: true, effects: [{ do: 'copy', text: followUpMessage(c, ws.agent, props[0]), toast: 'Mensaje copiado' }, { do: 'change', change: { type: 'client.contacted', id: c.id }, toast: 'Mensaje copiado · contacto registrado' }] },
      { label: 'Ver cliente', go: { to: 'sheet', sheet: { kind: 'client', id: c.id } } },
    ],
  };
}

function opportunityResult(ws: Workspace, p: Property): Result {
  const pos = S.position(ws, p);
  const z = S.zone(ws, p.district);
  const rentRate = p.district === 'Barranco' || p.district === 'Miraflores' ? 0.058 : 0.048;
  const rent = Math.round((p.priceUSD * rentRate) / 12 / 10) * 10;
  const y = rentalYield(p.priceUSD, rent);
  const riskScore = (pos.verdict === 'sobre' ? 1 : 0) + (z.demand === 'baja' ? 1 : 0) + (z.daysOnMarket > 70 ? 1 : 0);
  const risk = riskScore === 0 ? 'bajo' : riskScore === 1 ? 'medio' : 'alto';
  const total = rentRate + z.changeYoY;
  return {
    headline: `Riesgo ${risk}. Retorno estimado ${pct(total, 1)} anual (renta ${pct(rentRate, 1)} + valorización ${pct(z.changeYoY, 1)}).`,
    subject: <PropertyRow p={p} />,
    why: (
      <Bullets
        items={[
          `Demanda ${z.demand} en ${p.district}; se vende en ~${z.daysOnMarket} días.`,
          pos.verdict === 'sobre' ? `Precio ${pct(pos.diff)} sobre comparables: negociar entrada.` : 'Precio alineado con comparables.',
          `Estrategia: ${p.district === 'Barranco' ? 'renta corta a profesionales y extranjeros.' : total > 0.08 ? 'comprar para alquilar y mantener 5+ años.' : 'priorizar uso propio o renta larga.'}`,
        ]}
      />
    ),
    details: <BreakdownView data={y} />,
    actions: [
      { label: 'Presentar a un inversionista', primary: true, prompt: `Seguimiento a ${ws.clients.find((c) => c.role === 'inversionista')?.name ?? 'inversionista'}` },
      { label: 'Ver propiedad', go: { to: 'sheet', sheet: { kind: 'property', id: p.id } } },
    ],
  };
}

function decisionResult(ws: Workspace, op: Operation): Result {
  const p = S.prop(ws, op.propertyId)!;
  const buyer = S.client(ws, op.buyerId)!;
  const scenarios = [
    { name: 'Aceptar la contraoferta', price: op.priceUSD, prob: 0.74, viable: true },
    { name: 'Sostener precio de lista', price: p.priceUSD, prob: 0.42, viable: true },
    { name: 'Proponer punto medio', price: Math.round((op.priceUSD * 0.985) / 500) * 500, prob: 0.86, viable: false },
  ].map((s) => ({ ...s, net: netCommissionPEN({ ...op, priceUSD: s.price }, ws.agent) }));
  const best = scenarios.filter((s) => s.viable).sort((a, b) => b.prob * b.net - a.prob * a.net)[0];
  return {
    headline: `Recomiendo: ${best.name.toLowerCase()} (${usdK(best.price)}). Mayor valor esperado con ${pct(best.prob)} de probabilidad de cierre.`,
    subject: <OperationRow op={op} />,
    why: (
      <div className="stack" style={{ gap: 8 }}>
        {scenarios.map((s) => (
          <div key={s.name} className="stat" style={{ borderColor: s === best ? 'var(--accent)' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</span>
              <span className="small">{usdK(s.price)}</span>
            </div>
            <div className="small muted" style={{ marginTop: 4 }}>
              Cierre {pct(s.prob)} · tu comisión {penK(s.net)} · valor esperado {penK(s.prob * s.net)}
              {!s.viable && ' · requiere que el propietario baje'}
            </div>
          </div>
        ))}
      </div>
    ),
    details: (
      <>
        <Bullets items={[...op.risks, ...buyer.memory]} />
        <div style={{ marginTop: 14 }}>
          <BreakdownView data={commission(op, ws.agent, p)} />
        </div>
      </>
    ),
    actions: [{ label: 'Abrir operación', primary: true, go: { to: 'sheet', sheet: { kind: 'operation', id: op.id } } }],
  };
}

function DocAnalysis({ initial }: { initial?: File }) {
  const { ws, open } = useStore();
  const picker = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState<DocReading | null>(null);
  const [busy, setBusy] = useState(false);
  const [animDone, setAnimDone] = useState(false);
  const ready = animDone && reading !== null;

  const onFile = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    setAnimDone(false);
    setReading(null);
    setReading(await readFile(f));
  };

  const started = useRef(false);
  useEffect(() => {
    if (initial && !started.current) {
      started.current = true;
      onFile(initial);
    }
  }, [initial]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {!busy && (
        <>
          <button className="row" style={{ borderStyle: 'dashed', padding: 22, marginTop: 8 }} onClick={() => picker.current?.click()}>
            <span className="row-icon">
              <Icon name="attach" size={24} />
            </span>
            <span className="row-body">
              <span className="row-title" style={{ display: 'block' }}>Adjuntar documento</span>
              <span className="row-sub" style={{ display: 'block' }}>Contrato, partida, minuta, autovalúo…</span>
            </span>
          </button>
          <input ref={picker} type="file" hidden accept=".pdf,.txt,.md,.csv,.doc,.docx,image/*" onChange={(e) => onFile(e.target.files?.[0])} />
          <p className="eyebrow" style={{ margin: '28px 0 6px' }}>O revisa uno de tus documentos</p>
          {ws.documents.map((d) => (
            <Row key={d.id} flat icon="doc" title={d.kind} sub={`${d.status} · ${d.name}`} onClick={() => open({ kind: 'document', id: d.id })} />
          ))}
        </>
      )}
      {busy && !ready && <Thinking stages={['Leyendo el documento…', 'Buscando datos clave…', 'Revisando lo que falta…', 'Encontré esto.']} onDone={() => setAnimDone(true)} />}
      {busy && ready && reading && (
        <div className="answer rise">
          <p className="understood">{reading.doc.name}</p>
          <p className="lead">{reading.doc.summary}</p>
          <ReadingView reading={reading} />
          <button className="btn small" onClick={() => setBusy(false)}>
            Revisar otro
          </button>
        </div>
      )}
    </>
  );
}

const TITLE: Record<AnalysisMode, string> = { propiedad: 'Propiedad', cliente: 'Cliente', documento: 'Documento', oportunidad: 'Oportunidad', decision: 'Decisión' };

export function AnalysisSheet({ spec, accent }: { spec: Extract<SheetSpec, { kind: 'analysis' }>; accent: string }) {
  const { ws } = useStore();
  const [subject, setSubject] = useState<string | undefined>(spec.subjectId);
  const [done, setDone] = useState(false);
  const entry = ENTRIES.find((e) => e.mode === spec.mode)!;

  if (spec.mode === 'documento') {
    return (
      <Sheet label="Analiza · Documento" accent={accent}>
        <h1 className="title" style={{ marginTop: 16 }}>{entry.sub}</h1>
        <DocAnalysis initial={spec.files?.[0]} />
      </Sheet>
    );
  }

  const options: { id: string; node: ReactNode }[] =
    spec.mode === 'cliente'
      ? ws.clients.map((c) => ({ id: c.id, node: c.name }))
      : spec.mode === 'decision'
        ? S.activeOperations(ws).map((o) => ({ id: o.id, node: `${S.prop(ws, o.propertyId)!.address.split(',')[0]} · ${o.stage}` }))
        : ws.properties.filter((p) => p.status !== 'vendida').map((p) => ({ id: p.id, node: `${p.type} · ${p.address.split(',')[0]}` }));

  let result: Result | null = null;
  if (subject) {
    if (spec.mode === 'propiedad') result = propertyResult(ws, S.prop(ws, subject)!);
    if (spec.mode === 'cliente') result = clientResult(ws, subject);
    if (spec.mode === 'oportunidad') result = opportunityResult(ws, S.prop(ws, subject)!);
    if (spec.mode === 'decision') result = decisionResult(ws, S.operation(ws, subject)!);
  }

  return (
    <Sheet label={`Analiza · ${TITLE[spec.mode]}`} accent={accent}>
      {!subject && (
        <div className="rise">
          <h1 className="title" style={{ margin: '16px 0 4px' }}>{entry.sub}</h1>
          <p className="muted" style={{ marginBottom: 14 }}>¿Qué analizamos?</p>
          {options.map((o) => (
            <Row key={o.id} flat title={o.node} onClick={() => { setSubject(o.id); setDone(false); }} />
          ))}
        </div>
      )}
      {subject && !done && (
        <div style={{ paddingTop: 20 }}>
          <Thinking stages={['Reuniendo datos…', 'Comparando…', 'Formando criterio…', 'Encontré esto.']} onDone={() => setDone(true)} />
        </div>
      )}
      {subject && done && result && (
        <div className="answer rise" style={{ paddingTop: 12 }}>
          {result.subject}
          <p className="eyebrow" style={{ marginTop: 22 }}>Lo importante</p>
          <p className="lead">{result.headline}</p>
          <ActionBar actions={result.actions} />
          <div style={{ marginTop: 18 }}>
            <Reveal label="Por qué" open>
              {result.why}
            </Reveal>
            <Reveal label="Detalles">{result.details}</Reveal>
          </div>
          {!spec.subjectId && (
            <button className="link small" onClick={() => setSubject(undefined)}>
              ← Analizar otro
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
}
