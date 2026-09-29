import type { CSSProperties } from 'react';
import type { AnalysisMode } from '../app/nav';
import { useStore } from '../app/store';
import { coach } from '../intelligence/coach';
import { Coach, Display, Row, Section } from '../ui/kit';

export const ENTRIES: { mode: AnalysisMode; icon: string; title: string; sub: string }[] = [
  { mode: 'propiedad', icon: 'house', title: 'Propiedad', sub: 'Precio, comparables, posicionamiento.' },
  { mode: 'cliente', icon: 'person', title: 'Cliente', sub: 'Perfil, interés y probabilidad.' },
  { mode: 'documento', icon: 'doc', title: 'Documento', sub: 'Revisión legal y resumen.' },
  { mode: 'oportunidad', icon: 'target', title: 'Oportunidad', sub: 'Riesgo, retorno y estrategia.' },
  { mode: 'decision', icon: 'bars', title: 'Decisión', sub: 'Escenarios y recomendación.' },
];

export function Analiza() {
  const { ws, open, go } = useStore();
  const advice = coach('analiza', ws);
  const pending = ws.documents.filter((d) => d.status !== 'recibido');

  return (
    <div className="page">
      <Display
        title="Analiza"
        sub={
          <>
            Convierte información
            <br />
            en decisiones.
          </>
        }
      />
      <div className="stack">
        {ENTRIES.map((e, i) => (
          <Row key={e.mode} icon={e.icon} title={e.title} sub={e.sub} style={{ '--i': i + 1 } as CSSProperties} onClick={() => open({ kind: 'analysis', mode: e.mode })} />
        ))}
      </div>

      {advice && (
        <div className="section">
          <Coach label="Decisión de hoy" icon="alert" text={advice.text} cta={advice.action.label} onClick={() => advice.action.go && go(advice.action.go)} />
        </div>
      )}

      {pending.length > 0 && (
        <Section title="Documentos esperando revisión">
          {pending.map((d) => (
            <Row key={d.id} flat title={d.kind} sub={d.status === 'observado' ? d.flags[0] : d.summary} onClick={() => open({ kind: 'document', id: d.id })} />
          ))}
        </Section>
      )}
    </div>
  );
}
