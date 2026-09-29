import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { topSignals } from '../intelligence/pulse';
import { Icon } from '../ui/Icon';
import { DemoTag, Wordmark } from '../ui/kit';
import { Hoy } from '../screens/Hoy';
import { Analiza } from '../screens/Analiza';
import { Mercado } from '../screens/Mercado';
import { Crea } from '../screens/Crea';
import { Negocio } from '../screens/Negocio';
import { SheetHost } from '../sheets/SheetHost';
import { accentOf, TABS, type Tab } from './nav';
import { useStore } from './store';

const TAB_ICON: Record<Tab, string> = { hoy: 'home', analiza: 'wave', mercado: 'market', crea: 'create', negocio: 'person' };

function Header({ solid }: { solid: boolean }) {
  const { ws, open, demo } = useStore();
  const count = topSignals(ws).length;
  return (
    <div className={`hdr${solid ? ' solid' : ''}`}>
      <Wordmark />
      {demo && <span style={{ marginLeft: 10 }}><DemoTag /></span>}
      <span className="hdr-spacer" />
      <button className="icon-btn" aria-label="Pregúntale a MUNAY" onClick={() => open({ kind: 'resolver' })}>
        <Icon name="search" size={22} />
      </button>
      <button className="icon-btn" aria-label={`${count} cosas merecen tu atención`} onClick={() => open({ kind: 'pulse' })}>
        <Icon name="bell" size={22} />
        {count > 0 && <span className="badge">{count}</span>}
      </button>
      <button aria-label="Tu perfil y memoria" onClick={() => open({ kind: 'profile' })} style={{ marginLeft: 4 }}>
        <span className="avatar">{ws.agent.initials}</span>
      </button>
    </div>
  );
}

function TabBar() {
  const { tab, setTab } = useStore();
  return (
    <nav className="tabbar" aria-label="Navegación principal">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`tab${tab === t.id ? ' on' : ''}`}
          style={{ '--tab-accent': t.accent } as CSSProperties}
          aria-current={tab === t.id ? 'page' : undefined}
          onClick={() => setTab(t.id)}
        >
          <span className="tab-icon">
            <Icon name={TAB_ICON[t.id]} size={23} stroke={tab === t.id ? 1.9 : 1.5} fill={t.id === 'hoy' && tab === 'hoy'} />
          </span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}

function Toast() {
  const { toast } = useStore();
  if (!toast || !toast.text) return null;
  return (
    <div className="toast" key={toast.n} role="status">
      <Icon name="check" size={16} stroke={2.2} />
      {toast.text}
    </div>
  );
}

export function Shell() {
  const { tab } = useStore();
  const scroller = useRef<HTMLDivElement>(null);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    setSolid(false);
  }, [tab]);

  const Screen = { hoy: Hoy, analiza: Analiza, mercado: Mercado, crea: Crea, negocio: Negocio }[tab];

  return (
    <div className="app" style={{ '--accent': accentOf(tab) } as CSSProperties}>
      <Header solid={solid} />
      <div className="scroll" ref={scroller} onScroll={(e) => setSolid(e.currentTarget.scrollTop > 24)}>
        <Screen key={tab} />
      </div>
      <TabBar />
      <SheetHost />
      <Toast />
    </div>
  );
}
