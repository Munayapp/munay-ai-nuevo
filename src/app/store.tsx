import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { applyChange, type Change } from '../data/changes';
import { activeSource } from '../data/integrations';
import * as S from '../data/select';
import type { Workspace } from '../data/types';
import { memory } from '../intelligence/memory';
import type { Go, MunayAction, SheetSpec, Tab, TabParams } from './nav';

interface Ask {
  text: string;
  files: File[];
  nonce: number;
}

interface Store {
  ws: Workspace;
  tab: Tab;
  params: TabParams;
  stack: SheetSpec[];
  toast: { text: string; n: number } | null;
  ask: Ask | null;
  setTab(tab: Tab, params?: TabParams): void;
  open(sheet: SheetSpec): void;
  back(): void;
  closeAll(): void;
  go(g: Go): void;
  run(a: MunayAction): void;
  commit(c: Change): void;
  notify(text: string): void;
  askMunay(text: string, files?: File[]): void;
  reset(): Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fuera de StoreProvider');
  return s;
};

const TAB_IDS: Tab[] = ['hoy', 'analiza', 'mercado', 'crea', 'negocio'];
const tabFromHash = (): Tab => {
  const h = location.hash.replace('#/', '') as Tab;
  return TAB_IDS.includes(h) ? h : 'hoy';
};

function focusFor(ws: Workspace, s: SheetSpec) {
  if (s.kind === 'property') memory.focus({ propertyId: s.id });
  if (s.kind === 'client') memory.focus({ clientId: s.id });
  if (s.kind === 'operation') memory.focus({ operationId: s.id, propertyId: S.operation(ws, s.id)?.propertyId });
  if (s.kind === 'capture') memory.focus({ listingId: s.id, propertyId: S.listing(ws, s.id)?.propertyId });
}

export function StoreProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const source = useRef(activeSource()).current;
  const [ws, setWs] = useState<Workspace | null>(null);
  const [tab, setTabState] = useState<Tab>(tabFromHash);
  const [params, setParams] = useState<TabParams>({});
  const [stack, setStack] = useState<SheetSpec[]>([]);
  const [toast, setToast] = useState<Store['toast']>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  const wsRef = useRef<Workspace | null>(null);
  wsRef.current = ws;

  useEffect(() => {
    memory.startSession();
    source.load().then(setWs);
  }, [source]);

  useEffect(() => {
    const onHash = () => setTabState(tabFromHash());
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  const notify = useCallback((text: string) => setToast({ text, n: Date.now() }), []);

  const commit = useCallback(
    (c: Change) => {
      const cur = wsRef.current;
      if (!cur) return;
      const next = applyChange(cur, c);
      wsRef.current = next;
      setWs(next);
      source.commit(c, next).catch(() => notify('No pude guardar el cambio'));
    },
    [source, notify],
  );

  const setTab = useCallback((t: Tab, p?: TabParams) => {
    setStack([]);
    setTabState(t);
    if (p) setParams((prev) => ({ ...prev, ...p }));
    if (location.hash !== `#/${t}`) history.replaceState(null, '', `#/${t}`);
  }, []);

  const open = useCallback((s: SheetSpec) => {
    if (wsRef.current) focusFor(wsRef.current, s);
    setStack((st) => [...st, s]);
  }, []);

  const back = useCallback(() => setStack((st) => st.slice(0, -1)), []);
  const closeAll = useCallback(() => setStack([]), []);

  const go = useCallback((g: Go) => (g.to === 'tab' ? setTab(g.tab, g.params) : open(g.sheet)), [setTab, open]);

  const stackRef = useRef(stack);
  stackRef.current = stack;

  const askMunay = useCallback((text: string, files: File[] = []) => {
    const top = stackRef.current[stackRef.current.length - 1];
    if (top?.kind === 'resolver') setAsk({ text, files, nonce: Date.now() });
    else setStack((st) => [...st, { kind: 'resolver', prompt: text, files }]);
  }, []);

  const run = useCallback(
    (a: MunayAction) => {
      let message = '';
      for (const e of a.effects ?? []) {
        if (e.do === 'copy') {
          navigator.clipboard?.writeText(e.text).catch(() => undefined);
          message = e.toast ?? 'Copiado';
        } else {
          commit(e.change);
          if (e.toast) message = e.toast;
        }
      }
      if (message) notify(message);
      if (a.prompt) askMunay(a.prompt);
      if (a.go) go(a.go);
    },
    [commit, notify, askMunay, go],
  );

  const reset = useCallback(async () => {
    memory.clear();
    const fresh = await (source.reset?.() ?? source.load());
    setWs(fresh);
    setStack([]);
    setTab('hoy');
    notify('Demo reiniciada');
  }, [source, setTab, notify]);

  const value = useMemo<Store | null>(
    () => (ws ? { ws, tab, params, stack, toast, ask, setTab, open, back, closeAll, go, run, commit, notify, askMunay, reset } : null),
    [ws, tab, params, stack, toast, ask, setTab, open, back, closeAll, go, run, commit, notify, askMunay, reset],
  );

  if (!value) return <>{fallback}</>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
