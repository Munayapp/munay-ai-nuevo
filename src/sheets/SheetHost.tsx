import type { CSSProperties, ReactNode } from 'react';
import type { SheetSpec } from '../app/nav';
import { useStore } from '../app/store';
import { Icon } from '../ui/Icon';
import { AnalysisSheet } from './AnalysisSheet';
import { CaptureSheet } from './CaptureSheet';
import { ClientSheet } from './ClientSheet';
import { DocumentSheet } from './DocumentSheet';
import { OperationSheet } from './OperationSheet';
import { ProfileSheet } from './ProfileSheet';
import { PropertySheet } from './PropertySheet';
import { PulseSheet } from './PulseSheet';
import { QrSheet } from './QrSheet';
import { ResolverSheet } from './ResolverSheet';

/** Color dominante por contexto de hoja. */
const ACCENT: Record<SheetSpec['kind'], string> = {
  resolver: 'var(--cream)',
  pulse: 'var(--red)',
  profile: 'var(--cream)',
  property: 'var(--teal)',
  qr: 'var(--teal)',
  client: 'var(--gold)',
  operation: 'var(--gold)',
  capture: 'var(--gold)',
  document: 'var(--red)',
  analysis: 'var(--red)',
};

export function Sheet({ label, children, foot, accent }: { label: string; children: ReactNode; foot?: ReactNode; accent?: string }) {
  const { back, closeAll, stack } = useStore();
  return (
    <div className="sheet" style={accent ? ({ '--accent': accent } as CSSProperties) : undefined} role="dialog" aria-label={label}>
      <div className="sheet-hdr">
        <button className="icon-btn" aria-label="Volver" onClick={back}>
          <Icon name="back" size={22} />
        </button>
        <span className="eyebrow">{label}</span>
        {stack.length > 1 ? (
          <button className="icon-btn" aria-label="Cerrar todo" onClick={closeAll} style={{ marginLeft: -40 }}>
            <Icon name="close" size={20} />
          </button>
        ) : null}
      </div>
      <div className="sheet-body">{children}</div>
      {foot && <div className="sheet-foot">{foot}</div>}
    </div>
  );
}

export function SheetHost() {
  const { stack } = useStore();
  const top = stack[stack.length - 1];
  if (!top) return null;
  const accent = top.kind === 'analysis' && top.mode === 'propiedad' ? 'var(--teal)' : ACCENT[top.kind];
  const key = `${stack.length}-${top.kind}`;
  const body = (() => {
    switch (top.kind) {
      case 'resolver': return <ResolverSheet key={key} spec={top} accent={accent} />;
      case 'property': return <PropertySheet key={key} id={top.id} accent={accent} />;
      case 'client': return <ClientSheet key={key} id={top.id} accent={accent} />;
      case 'operation': return <OperationSheet key={key} id={top.id} accent={accent} />;
      case 'document': return <DocumentSheet key={key} id={top.id} accent={accent} />;
      case 'capture': return <CaptureSheet key={key} id={top.id} accent={accent} />;
      case 'analysis': return <AnalysisSheet key={key} spec={top} accent={accent} />;
      case 'pulse': return <PulseSheet key={key} accent={accent} />;
      case 'profile': return <ProfileSheet key={key} accent={accent} />;
      case 'qr': return <QrSheet key={key} id={top.id} accent={accent} />;
    }
  })();
  return body;
}
