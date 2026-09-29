import { useEffect, useRef, useState } from 'react';
import type { SheetSpec } from '../app/nav';
import { useStore } from '../app/store';
import { memory } from '../intelligence/memory';
import { resolve, type Resolution } from '../intelligence/resolver';
import { Composer } from '../ui/Composer';
import { Thinking } from '../ui/kit';
import { ActionBar, BlockView } from './Blocks';
import { Sheet } from './SheetHost';

interface Turn {
  id: number;
  text: string;
  files: string[];
  res?: Resolution;
  done: boolean;
}

const EXAMPLES = ['Quiero captar esta propiedad', 'Analiza este documento', '¿Cuánto me queda de esta venta?', 'Necesito hacer seguimiento a este cliente', 'Créame un Reel', '¿Qué tengo que hacer hoy?'];

function TurnView({ t, onDone }: { t: Turn; onDone: () => void }) {
  return (
    <div className="turn">
      {(t.text || t.files.length > 0) && <div className="you">{t.text || t.files.join(', ')}</div>}
      {!t.res && <Thinking stages={['Entendiendo…']} />}
      {t.res && !t.done && <Thinking stages={t.res.stages} onDone={onDone} step={460} />}
      {t.res && t.done && (
        <div className="answer">
          <p className="understood">{t.res.understood}</p>
          <p className="lead">{t.res.headline}</p>
          {t.res.why && <p className="muted">{t.res.why}</p>}
          {t.res.blocks.map((b, i) => (
            <div key={i} className="rise" style={{ ['--i' as string]: i + 1 }}>
              <BlockView b={b} />
            </div>
          ))}
          <ActionBar actions={t.res.actions} />
        </div>
      )}
    </div>
  );
}

export function ResolverSheet({ spec, accent }: { spec: Extract<SheetSpec, { kind: 'resolver' }>; accent: string }) {
  const { ws, ask } = useStore();
  const [turns, setTurns] = useState<Turn[]>([]);
  const body = useRef<HTMLDivElement>(null);
  const wsRef = useRef(ws);
  wsRef.current = ws;
  const seq = useRef(0);
  const lastAsk = useRef(ask?.nonce);

  const submit = (text: string, files: File[] = []) => {
    const id = ++seq.current;
    setTurns((ts) => [...ts, { id, text, files: files.map((f) => f.name), done: false }]);
    resolve(text, wsRef.current, files).then((res) => setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, res } : t))));
  };

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (spec.prompt || spec.files?.length) submit(spec.prompt ?? '', spec.files);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (ask && ask.nonce !== lastAsk.current) {
      lastAsk.current = ask.nonce;
      submit(ask.text, ask.files);
    }
  }, [ask]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lleva al inicio del último turno, no al final: el titular (lo importante) queda siempre a la vista.
  useEffect(() => {
    const el = body.current?.closest('.sheet')?.querySelector('.sheet-body');
    const last = body.current?.querySelector('.turn:last-of-type');
    if (!el || !last) return;
    const top = el.scrollTop + last.getBoundingClientRect().top - el.getBoundingClientRect().top - 12;
    el.scrollTo({ top, behavior: 'smooth' });
  }, [turns]);

  const recent = memory.get().prompts.slice(0, 3);

  return (
    <Sheet label="MUNAY" accent={accent} foot={<Composer onSubmit={submit} autoFocus={!spec.prompt} />}>
      <div ref={body}>
        {turns.length === 0 && (
          <div className="rise" style={{ paddingTop: 28 }}>
            <p className="display" style={{ fontSize: 44 }}>
              ¿En qué te ayudo?
            </p>
            <p className="muted" style={{ margin: '14px 0 22px' }}>Dime tu objetivo. Yo sé dónde está cada cosa.</p>
            <div className="stack" style={{ gap: 0 }}>
              {EXAMPLES.map((e) => (
                <button key={e} className="row flat" onClick={() => submit(e)}>
                  <span className="row-body">
                    <span className="row-title" style={{ fontSize: 15 }}>{e}</span>
                  </span>
                </button>
              ))}
            </div>
            {recent.length > 0 && (
              <>
                <p className="eyebrow" style={{ margin: '28px 0 8px' }}>Lo último que me pediste</p>
                <div className="chips">
                  {recent.map((r) => (
                    <button key={r.at} className="chip" onClick={() => submit(r.text)}>
                      {r.text}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {turns.map((t) => (
          <TurnView key={t.id} t={t} onDone={() => setTurns((ts) => ts.map((x) => (x.id === t.id ? { ...x, done: true } : x)))} />
        ))}
      </div>
    </Sheet>
  );
}
