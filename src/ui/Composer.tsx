/**
 * Punto de entrada universal: texto, voz, documentos e imágenes.
 * Voz: Web Speech API del navegador (gratuita). Si no existe, lo dice con honestidad.
 */
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../app/store';
import { Icon } from './Icon';

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getRecognition(): Recognition | null {
  const w = window as unknown as Record<string, new () => Recognition>;
  const C = w.SpeechRecognition || w.webkitSpeechRecognition;
  return C ? new C() : null;
}

export function Composer({ onSubmit, placeholder = 'Cuéntame en qué te ayudo…', autoFocus }: { onSubmit: (text: string, files: File[]) => void; placeholder?: string; autoFocus?: boolean }) {
  const { notify } = useStore();
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => () => rec.current?.stop(), []);

  const submit = () => {
    const t = text.trim();
    if (!t && !files.length) return;
    onSubmit(t, files);
    setText('');
    setFiles([]);
  };

  const toggleVoice = () => {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const r = getRecognition();
    if (!r) {
      notify('Tu navegador no permite dictado. Escríbeme.');
      input.current?.focus();
      return;
    }
    r.lang = 'es-PE';
    r.interimResults = true;
    r.continuous = false;
    let finalText = '';
    r.onresult = (e) => {
      finalText = Array.from(e.results).map((x) => x[0].transcript).join(' ');
      setText(finalText);
    };
    r.onend = () => {
      setListening(false);
      if (finalText.trim()) {
        onSubmit(finalText.trim(), files);
        setText('');
        setFiles([]);
      }
    };
    r.onerror = () => {
      setListening(false);
      notify('No pude escucharte. Revisa el permiso del micrófono.');
    };
    rec.current = r;
    setListening(true);
    r.start();
  };

  const hasContent = text.trim().length > 0 || files.length > 0;

  return (
    <div>
      {files.length > 0 && (
        <div className="files">
          {files.map((f) => (
            <span className="file-chip" key={f.name}>
              <Icon name={f.type.startsWith('image/') ? 'image' : 'doc'} size={14} />
              <span>{f.name}</span>
              <button aria-label="Quitar" onClick={() => setFiles(files.filter((x) => x !== f))}>
                <Icon name="close" size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className={`composer${listening ? ' listening' : ''}`}>
        <span className="composer-wave">
          <Icon name="wave" size={24} stroke={1.5} />
        </span>
        <textarea
          ref={input}
          rows={2}
          value={text}
          autoFocus={autoFocus}
          placeholder={listening ? 'Te escucho…' : placeholder}
          aria-label="Escríbele a MUNAY"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button className="composer-btn" aria-label="Adjuntar documento o imagen" onClick={() => picker.current?.click()}>
          <Icon name="attach" size={20} />
        </button>
        <input
          ref={picker}
          type="file"
          hidden
          multiple
          accept=".pdf,.txt,.md,.csv,.doc,.docx,image/*"
          onChange={(e) => {
            setFiles([...files, ...Array.from(e.target.files ?? [])]);
            e.target.value = '';
          }}
        />
        <button className="composer-main" aria-label={hasContent ? 'Enviar' : listening ? 'Detener' : 'Hablar'} onClick={hasContent && !listening ? submit : toggleVoice}>
          <Icon name={hasContent && !listening ? 'send' : 'mic'} size={20} stroke={1.8} />
        </button>
      </div>
    </div>
  );
}
