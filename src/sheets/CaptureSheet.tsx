import { useRef, useState, type PointerEvent } from 'react';
import { useStore } from '../app/store';
import { uid } from '../data/changes';
import * as S from '../data/select';
import { CAPTURE_STEPS, type CaptureStep } from '../data/types';
import { followUpMessage } from '../intelligence/drafts';
import { usdK } from '../lib/format';
import { Kv, Media, mediaOf, Section, Steps, Thinking } from '../ui/kit';
import { Sheet } from './SheetHost';

const INFO: Record<CaptureStep, { title: string; desc: string; cta: string }> = {
  prospecto: { title: 'Conocer al propietario', desc: 'Motivación, plazos y expectativa de precio. Una buena primera conversación define la exclusiva.', cta: 'Agendar visita de captación' },
  preparación: { title: 'Preparar la visita', desc: 'Llega con comparables, historial de la zona y un caso de éxito cercano.', cta: 'Listo, pasar al análisis' },
  análisis: { title: 'Valor de mercado', desc: 'Un rango defendible con datos es tu mejor argumento frente al propietario.', cta: 'Generar propuesta' },
  propuesta: { title: 'Propuesta enviada', desc: 'Precio sugerido, estrategia de marketing y condiciones de la exclusiva.', cta: 'Registrar aceptación' },
  autorización: { title: 'Autorización de venta', desc: 'El documento está listo. El propietario puede firmar aquí mismo.', cta: 'Firmar ahora' },
  firma: { title: 'Firma', desc: 'Falta la firma del propietario.', cta: 'Firmar ahora' },
  activa: { title: 'Propiedad activa', desc: 'Publicada y lista para recibir interesados.', cta: 'Crear contenido' },
};

function SignaturePad({ onSigned }: { onSigned: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [dirty, setDirty] = useState(false);

  const point = (e: PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * canvas.current!.width, y: ((e.clientY - r.top) / r.height) * canvas.current!.height };
  };

  return (
    <div>
      <canvas
        ref={canvas}
        width={680}
        height={260}
        style={{ width: '100%', height: 150, borderRadius: 14, background: 'var(--paper)', touchAction: 'none', cursor: 'crosshair' }}
        onPointerDown={(e) => {
          drawing.current = true;
          const ctx = canvas.current!.getContext('2d')!;
          const { x, y } = point(e);
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#090B0D';
          ctx.beginPath();
          ctx.moveTo(x, y);
          canvas.current!.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = canvas.current!.getContext('2d')!;
          const { x, y } = point(e);
          ctx.lineTo(x, y);
          ctx.stroke();
          setDirty(true);
        }}
        onPointerUp={() => (drawing.current = false)}
      />
      <div className="actions" style={{ marginTop: 10 }}>
        <button
          className="btn small"
          onClick={() => {
            canvas.current!.getContext('2d')!.clearRect(0, 0, 680, 260);
            setDirty(false);
          }}
        >
          Borrar
        </button>
        <button className="btn small primary" disabled={!dirty} onClick={onSigned}>
          Confirmar firma
        </button>
      </div>
      <p className="note" style={{ marginTop: 10 }}>
        Firma en pantalla de demostración. La firma digital con validez legal se conectará a un proveedor certificado.
      </p>
    </div>
  );
}

export function CaptureSheet({ id, accent }: { id: string; accent: string }) {
  const { ws, run, go, open } = useStore();
  const [mode, setMode] = useState<'view' | 'sign' | 'saving'>('view');
  const l = S.listing(ws, id);
  if (!l) return null;
  const p = S.prop(ws, l.propertyId)!;
  const owner = S.client(ws, l.ownerId)!;
  const idx = CAPTURE_STEPS.indexOf(l.step);
  const info = INFO[l.step];
  const pos = S.position(ws, p);
  const auth = ws.documents.find((d) => d.propertyId === p.id && d.kind === 'Autorización de venta');

  const advance = (step: CaptureStep, toast: string) =>
    run({
      label: '',
      effects: [
        { do: 'change', change: { type: 'listing.advance', id: l.id, step }, toast },
        { do: 'change', change: { type: 'activity.log', activity: { id: uid('ac'), at: new Date().toISOString(), text: `Captación ${p.address.split(',')[0]}: ${step}.`, relatedId: owner.id } }, toast: '' },
      ],
    });

  const primary = () => {
    const next = CAPTURE_STEPS[idx + 1];
    if (l.step === 'autorización' || l.step === 'firma') return setMode('sign');
    if (l.step === 'activa') return go({ to: 'tab', tab: 'crea', params: { crea: { propertyId: p.id, objective: 'presentar', piece: 'reel', nonce: Date.now() } } });
    if (l.step === 'prospecto') {
      const d = new Date(); d.setDate(d.getDate() + 2); d.setHours(17, 0, 0, 0);
      run({ label: '', effects: [{ do: 'change', change: { type: 'task.create', task: { id: uid('t'), title: `Visita de captación: ${owner.name}`, when: d.toISOString(), kind: 'visita', relatedId: l.id, done: false } }, toast: '' }] });
    }
    advance(next, `Avanzó a ${next}`);
  };

  return (
    <Sheet label="Captación" accent={accent}>
      <Media {...mediaOf(p)} height={150} style={{ marginTop: 8 }}>
        <div className="media-shade" />
        <div className="media-caption">
          <p style={{ fontWeight: 600 }}>{p.type} · {p.district}</p>
          <p className="small muted">{owner.name}</p>
        </div>
      </Media>

      <div className="section" style={{ marginTop: 24 }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>Paso {idx + 1} de {CAPTURE_STEPS.length}</p>
        <h1 className="title">{info.title}</h1>
        <p className="muted" style={{ marginTop: 8 }}>{info.desc}</p>
      </div>

      {(l.step === 'análisis' || l.step === 'preparación' || l.step === 'propuesta') && (
        <div style={{ marginTop: 18 }}>
          <Kv
            rows={[
              ['Valor sugerido', `${usdK(pos.fairLow)}–${usdK(pos.fairHigh)}`],
              ['Comparables usados', String(pos.comps.length)],
              ...(l.step === 'propuesta'
                ? ([
                    ['Comisión', '3% + IGV'],
                    ['Exclusiva', l.exclusive ? '90 días' : 'No exclusiva'],
                    ['Marketing', 'Reel + portales + QR de propiedad'],
                  ] as [string, string][])
                : []),
            ]}
          />
          <p className="small muted" style={{ marginTop: 10 }}>{owner.memory[owner.memory.length - 1]}</p>
        </div>
      )}

      {(l.step === 'autorización' || l.step === 'firma') && auth && mode === 'view' && (
        <button className="row" style={{ marginTop: 18 }} onClick={() => open({ kind: 'document', id: auth.id })}>
          <span className="row-body">
            <span className="row-title" style={{ display: 'block' }}>{auth.kind}</span>
            <span className="row-sub" style={{ display: 'block' }}>{auth.summary}</span>
          </span>
        </button>
      )}

      <div className="section" style={{ marginTop: 22 }}>
        {mode === 'view' && (
          <div className="actions">
            <button className="btn primary" onClick={primary}>
              {info.cta}
            </button>
            {l.step === 'propuesta' && (
              <button className="btn" onClick={() => run({ label: '', effects: [{ do: 'copy', text: followUpMessage(owner, ws.agent, p), toast: 'Recordatorio copiado' }] })}>
                Recordar a {owner.name.split(' ')[0]}
              </button>
            )}
            {l.step === 'activa' && (
              <button className="btn" onClick={() => open({ kind: 'qr', id: p.id })}>
                Ver QR
              </button>
            )}
          </div>
        )}
        {mode === 'sign' && (
          <div className="rise">
            <p className="small muted" style={{ marginBottom: 10 }}>
              {owner.name} firma aquí:
            </p>
            <SignaturePad onSigned={() => setMode('saving')} />
          </div>
        )}
        {mode === 'saving' && (
          <Thinking
            stages={['Registrando la firma…', 'Activando la propiedad…', 'Propiedad activa.']}
            onDone={() => {
              advance('activa', 'Autorización firmada · propiedad activa');
              setMode('view');
            }}
          />
        )}
      </div>

      <Section title="Recorrido">
        <Steps steps={CAPTURE_STEPS} current={idx} />
      </Section>
    </Sheet>
  );
}
