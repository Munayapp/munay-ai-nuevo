import type { CSSProperties } from 'react';
import { useStore } from '../app/store';
import { signals } from '../intelligence/pulse';
import { relative } from '../lib/format';
import { Icon } from '../ui/Icon';
import { Section } from '../ui/kit';
import { Sheet } from './SheetHost';

export function PulseSheet({ accent }: { accent: string }) {
  const { ws, run } = useStore();
  const all = signals(ws);
  const top = all.slice(0, 3);
  const rest = all.slice(3);

  return (
    <Sheet label="Pulse" accent={accent}>
      <p className="display" style={{ fontSize: 44, marginTop: 20 }}>
        {top.length ? 'Lo que merece tu atención' : 'Todo en calma'}
        <span className="dot" />
      </p>
      <p className="muted" style={{ marginTop: 12 }}>
        MUNAY observa tus clientes, operaciones y propiedades. Solo te interrumpe cuando importa.
      </p>

      {top.length > 0 && (
        <Section title="Ahora">
          {top.map((s, i) => (
            <button key={s.id} className="signal rise" style={{ '--i': i } as CSSProperties} onClick={() => run(s.action)}>
              <span className="signal-mark" />
              <span style={{ display: 'block' }}>
                <span className="signal-title" style={{ display: 'block' }}>{s.title}</span>
                <span className="signal-detail" style={{ display: 'block' }}>{s.detail}</span>
                <span className="signal-cta">
                  {s.action.label} <Icon name="arrow" size={14} stroke={2} />
                </span>
              </span>
            </button>
          ))}
        </Section>
      )}

      {rest.length > 0 && (
        <Section title="Puede esperar">
          {rest.map((s) => (
            <button key={s.id} className="signal" onClick={() => run(s.action)}>
              <span className="signal-mark calm" />
              <span style={{ display: 'block' }}>
                <span className="signal-title" style={{ display: 'block', fontWeight: 500 }}>{s.title}</span>
                <span className="signal-detail" style={{ display: 'block' }}>{s.detail}</span>
              </span>
            </button>
          ))}
        </Section>
      )}

      <Section title="Lo que hiciste">
        {ws.activities.slice(0, 8).map((a) => (
          <div key={a.id} className="kv">
            <span style={{ color: 'var(--text)' }}>{a.text}</span>
            <span className="faint" style={{ whiteSpace: 'nowrap' }}>{relative(a.at)}</span>
          </div>
        ))}
      </Section>
    </Sheet>
  );
}
