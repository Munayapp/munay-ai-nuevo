import { useEffect, useState } from 'react';
import { Shell } from './app/Shell';
import { StoreProvider } from './app/store';
import { PublicProperty } from './screens/PublicProperty';
import { Wordmark } from './ui/kit';

const publicId = () => location.hash.match(/^#\/p\/([\w-]+)/)?.[1];

function Splash() {
  return (
    <div className="loading">
      <Wordmark />
    </div>
  );
}

export default function App() {
  const [pid, setPid] = useState(publicId);
  useEffect(() => {
    const on = () => setPid(publicId());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);

  return (
    <div className="stage">
      <div className="device">
        <StoreProvider fallback={<Splash />}>{pid ? <PublicProperty id={pid} /> : <Shell />}</StoreProvider>
      </div>
      <aside className="stage-note">
        <b>MUNAY</b>
        Tu inteligencia inmobiliaria en movimiento.
        <span>Prototipo v0.1 · datos de demostración · costo S/0</span>
        <span>Prueba: “¿Cuánto me queda de esta venta?”</span>
      </aside>
    </div>
  );
}
