import qrcode from 'qrcode-generator';
import { useMemo } from 'react';
import { useStore } from '../app/store';
import * as S from '../data/select';
import { Icon } from '../ui/Icon';
import { Sheet } from './SheetHost';

export const publicUrl = (id: string) => `${location.origin}${location.pathname}#/p/${id}`;

export function QrSheet({ id, accent }: { id: string; accent: string }) {
  const { ws, run } = useStore();
  const p = S.prop(ws, id);
  const url = publicUrl(id);
  const svg = useMemo(() => {
    const q = qrcode(0, 'M');
    q.addData(url);
    q.make();
    return q.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
  }, [url]);
  if (!p) return null;
  const leads = ws.leads.filter((l) => l.propertyId === id).length;

  return (
    <Sheet label="QR de la propiedad" accent={accent}>
      <h1 className="display" style={{ fontSize: 42, marginTop: 20 }}>
        La propiedad cobra vida<span className="dot" />
      </h1>
      <p className="muted" style={{ margin: '14px 0 26px' }}>
        Quien escanee este código podrá conocer {p.type === 'Casa' ? 'la casa' : `el ${p.type.toLowerCase()}`}, hacer preguntas, pedir una visita o dejar su interés. Todo llega a tu Pulse.
      </p>

      <div className="qr-box rise" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="small muted" style={{ textAlign: 'center', marginTop: 12 }}>
        {p.address.split(',')[0]} · {leads} {leads === 1 ? 'interesado' : 'interesados'}
      </p>

      <div className="actions" style={{ marginTop: 24, justifyContent: 'center' }}>
        <a className="btn primary" href={`#/p/${id}`}>
          <Icon name="eye" size={18} /> Ver como visitante
        </a>
        <button className="btn" onClick={() => run({ label: '', effects: [{ do: 'copy', text: url, toast: 'Enlace copiado' }] })}>
          <Icon name="copy" size={18} /> Copiar enlace
        </button>
      </div>
      <p className="note" style={{ marginTop: 24, textAlign: 'center' }}>
        En este prototipo el enlace funciona en este dispositivo. Publicarlo para cualquier visitante requiere alojar MUNAY (hay opciones gratuitas).
      </p>
    </Sheet>
  );
}
