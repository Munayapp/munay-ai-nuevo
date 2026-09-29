import { useStore } from '../app/store';
import * as S from '../data/select';
import { Pill } from '../ui/kit';
import { ReadingView } from './Blocks';
import { Sheet } from './SheetHost';

export function DocumentSheet({ id, accent }: { id: string; accent: string }) {
  const { ws, open } = useStore();
  const d = S.doc(ws, id);
  if (!d) return null;
  const p = S.prop(ws, d.propertyId);
  return (
    <Sheet label="Documento" accent={accent}>
      <div style={{ marginTop: 14 }}>
        {/* Rojo solo si el documento tiene observaciones; pendiente/recibido son neutros. */}
        <Pill tone={d.status === 'observado' ? 'solid' : 'neutral'}>{d.status}</Pill>
        <h1 className="title" style={{ marginTop: 12, fontSize: 30 }}>{d.kind}</h1>
        <p className="small muted" style={{ marginTop: 4 }}>
          {d.name}
          {d.pages ? ` · ${d.pages} páginas` : ''}
        </p>
        {p && (
          <button className="link small" style={{ marginTop: 6 }} onClick={() => open({ kind: 'property', id: p.id })}>
            {p.type} · {p.address.split(',')[0]} →
          </button>
        )}
      </div>

      <div className="section" style={{ marginTop: 26 }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>Lo importante</p>
        <p className="lead" style={{ fontSize: 21 }}>{d.summary}</p>
      </div>

      <div style={{ marginTop: 22 }}>
        <ReadingView reading={{ doc: d, real: true, note: 'MUNAY es una primera capa de inteligencia documental. No sustituye la revisión de un abogado o notario.' }} />
      </div>
    </Sheet>
  );
}
