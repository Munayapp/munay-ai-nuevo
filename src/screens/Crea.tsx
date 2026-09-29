import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Objective, Piece } from '../app/nav';
import { useStore } from '../app/store';
import * as S from '../data/select';
import type { Property } from '../data/types';
import { create, OBJECTIVES, PIECES, pieceText, proposal, type Creation } from '../intelligence/creative';
import { evidenciaAgente } from '../intelligence/evidencia';
import { memory } from '../intelligence/memory';
import { Icon } from '../ui/Icon';
import { Coach, Display, Media, mediaOf, Seg, Thinking } from '../ui/kit';

function ReelPreview({ p, c }: { p: Property; c: Creation }) {
  const [playing, setPlaying] = useState(false);
  const [i, setI] = useState(0);
  const scenes = c.reel.scenes;

  useEffect(() => {
    if (!playing) return;
    if (i >= scenes.length - 1) {
      const t = setTimeout(() => { setPlaying(false); setI(0); }, 1600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setI(i + 1), 1600);
    return () => clearTimeout(t);
  }, [playing, i, scenes.length]);

  const s = scenes[playing ? i : 0];
  return (
    <Media {...mediaOf(p)} seed={p.seed + (playing ? i : 0)} height={250}>
      <div className="media-shade" />
      <span className="pill neutral" style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(9,11,13,.6)', color: 'var(--paper)' }}>
        0:{String(playing ? Math.round(((i + 1) / scenes.length) * c.reel.duration) : c.reel.duration).padStart(2, '0')}
      </span>
      {!playing && (
        <button
          aria-label="Reproducir vista previa"
          onClick={() => setPlaying(true)}
          style={{ position: 'absolute', left: '50%', top: '44%', transform: 'translate(-50%,-50%)', width: 58, height: 58, borderRadius: '50%', background: 'rgba(9,11,13,.55)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', color: 'var(--paper)' }}
        >
          <Icon name="play" size={24} fill />
        </button>
      )}
      <div className="media-caption" key={playing ? i : 'still'} style={{ animation: 'fade-up 380ms var(--ease)' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{p.district}</p>
        <p style={{ fontSize: 17, lineHeight: 1.2, maxWidth: '85%' }}>{s.text}</p>
        <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
          {scenes.map((_, k) => (
            <i key={k} style={{ flex: 1, height: 2, borderRadius: 1, background: playing && k <= i ? 'var(--violet)' : 'rgba(245,243,239,.3)' }} />
          ))}
        </div>
      </div>
    </Media>
  );
}

export function Crea() {
  const { ws, params, run, demo } = useStore();
  const pc = params.crea ?? {};
  const candidates = ws.properties.filter((p) => p.status !== 'vendida');
  const initialProp = S.prop(ws, pc.propertyId) ?? S.prop(ws, memory.get().focus.propertyId) ?? candidates.find((p) => p.status === 'activa')!;
  const [pid, setPid] = useState(initialProp.id);
  const p = S.prop(ws, pid)!;
  const evidencia = useMemo(() => evidenciaAgente(ws, p.district, demo), [ws, p.district, demo]);
  const suggestion = proposal(p, evidencia);
  const [objective, setObjective] = useState<Objective>(pc.objective ?? suggestion.objective);
  const [piece, setPiece] = useState<Piece>(pc.piece ?? suggestion.piece);
  const [version, setVersion] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'thinking' | 'done'>(pc.nonce ? 'thinking' : 'idle');

  useEffect(() => {
    if (!pc.nonce) return;
    if (pc.propertyId) setPid(pc.propertyId);
    if (pc.objective) setObjective(pc.objective);
    if (pc.piece) setPiece(pc.piece);
    setPhase('thinking');
  }, [pc.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const creation = useMemo(() => create(p, objective, ws.agent, version, evidencia), [p, objective, ws.agent, version, evidencia]);
  const generate = () => setPhase('thinking');

  // El momento de creación ocurre donde el agente está mirando.
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phase !== 'idle') stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [phase]);

  return (
    <div className="page">
      <Display
        title="Crea"
        sub={
          <>
            Ideas que hacen mover
            <br />
            tu negocio.
          </>
        }
      />

      <div className="grid-3">
        {OBJECTIVES.map((o, i) => (
          <button
            key={o.id}
            className={`tile rise${o.id === objective ? ' on' : ''}`}
            style={{ '--i': i } as CSSProperties}
            aria-pressed={o.id === objective}
            onClick={() => {
              setObjective(o.id);
              if (phase === 'done') generate();
            }}
          >
            <Icon name={o.icon} size={26} stroke={1.4} />
            {o.label}
          </button>
        ))}
      </div>

      <p className="eyebrow" style={{ margin: '26px 0 10px' }}>Para</p>
      <div className="scroller">
        {candidates.map((x) => (
          <button
            key={x.id}
            onClick={() => {
              setPid(x.id);
              setPhase('idle');
            }}
            style={{ width: 128, textAlign: 'left', opacity: x.id === pid ? 1 : 0.55, transition: 'opacity var(--t-fast)' }}
          >
            <Media {...mediaOf(x)} height={72} radius={10} style={x.id === pid ? { boxShadow: '0 0 0 2px var(--violet)' } : undefined} />
            <span className="small" style={{ display: 'block', marginTop: 6, fontWeight: 600 }}>{x.type}</span>
            <span className="small muted" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.address.split(',')[0]}</span>
          </button>
        ))}
      </div>

      {phase === 'idle' && (
        <div className="section">
          <p className="lead" style={{ marginBottom: 12 }}>MUNAY te propone.</p>
          <Coach
            label="Propuesta"
            text={suggestion.text}
            cta="Crear así"
            onClick={() => {
              setObjective(suggestion.objective);
              setPiece(suggestion.piece);
              generate();
            }}
          />
          <button className="btn block primary on-dark" style={{ marginTop: 12 }} onClick={generate}>
            <Icon name="sparkle" size={18} /> Crear · {OBJECTIVES.find((o) => o.id === objective)!.label}
          </button>
        </div>
      )}

      {phase === 'thinking' && (
        <div className="section" ref={stageRef} style={{ scrollMarginTop: 'calc(var(--header-h) + 12px)' }}>
          <Thinking stages={['Entendiendo la propiedad…', 'Buscando el ángulo…', 'Escribiendo…', 'Listo.']} step={480} onDone={() => setPhase('done')} />
        </div>
      )}

      {phase === 'done' && (
        <div className="section rise" key={`${pid}-${objective}-${version}`} ref={stageRef} style={{ scrollMarginTop: 'calc(var(--header-h) + 12px)' }}>
          <Seg<Piece> value={piece} onChange={setPiece} options={PIECES} />

          {piece === 'reel' && <ReelPreview p={p} c={creation} />}

          <div className="grid-3" style={{ margin: '16px 0', gap: 12 }}>
            {[
              ['Idea', creation.idea],
              ['Por qué', creation.why],
              ['Pieza', piece === 'reel' ? `Reel de ${creation.reel.duration} s listo para grabar.` : `${PIECES.find((x) => x.id === piece)!.label} lista para usar.`],
            ].map(([k, v]) => (
              <div key={k}>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{k}</p>
                <p className="small muted" style={{ lineHeight: 1.4 }}>{v}</p>
              </div>
            ))}
          </div>

          {piece === 'reel' ? (
            <div className="draft">
              {creation.reel.scenes.map((s) => (
                <div key={s.t} style={{ display: 'grid', gridTemplateColumns: '58px 1fr', gap: 10, padding: '6px 0' }}>
                  <span className="small faint" style={{ fontVariantNumeric: 'tabular-nums' }}>{s.t}</span>
                  <span>
                    <span style={{ display: 'block' }}>{s.shot}</span>
                    <span className="small" style={{ color: 'var(--violet)' }}>“{s.text}”</span>
                  </span>
                </div>
              ))}
              <p className="small faint" style={{ marginTop: 8 }}>Audio: {creation.reel.audio}</p>
            </div>
          ) : (
            <div className="draft">{pieceText(creation, piece)}</div>
          )}

          <div className="action-grid" style={{ gridTemplateColumns: '1fr 1fr 1.2fr', marginTop: 14 }}>
            <button
              className="btn small"
              onClick={() => {
                const idx = OBJECTIVES.findIndex((o) => o.id === objective);
                setObjective(OBJECTIVES[(idx + 1) % OBJECTIVES.length].id);
              }}
            >
              <Icon name="refresh" size={16} /> Cambiar enfoque
            </button>
            <button className="btn small" onClick={() => setVersion(version + 1)}>
              <Icon name="layers" size={16} /> Otra versión
            </button>
            <button
              className="btn small primary on-dark"
              onClick={() =>
                run({
                  label: 'Copiar',
                  effects: [
                    { do: 'copy', text: pieceText(creation, piece), toast: 'Copiado. Listo para publicar.' },
                    { do: 'change', change: { type: 'activity.log', activity: { id: `ac-cr-${Date.now()}`, at: new Date().toISOString(), text: `Creaste ${PIECES.find((x) => x.id === piece)!.label.toLowerCase()} para ${p.address.split(',')[0]}.`, relatedId: p.id } }, toast: '' },
                  ],
                })
              }
            >
              <Icon name="copy" size={16} /> Copiar
            </button>
          </div>
          <p className="note" style={{ marginTop: 14 }}>Publicación directa en redes: preparada para integrarse en una fase futura.</p>
        </div>
      )}
    </div>
  );
}
