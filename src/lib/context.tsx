import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { loadGuiConfig, saveGuiConfig } from "./tauri";
import type { CommandResult, GlobalOverrides, PageId } from "./types";

const defaultOverrides: GlobalOverrides = {
  configPath: "",
  url: "",
  keypair: "",
  commitment: "confirmed",
  ws: "",
  verbose: false,
  skipPreflight: false,
  json: false,
};

interface AppContextValue {
  page: PageId;
  setPage: (p: PageId) => void;
  overrides: GlobalOverrides;
  setOverrides: (patch: Partial<GlobalOverrides>) => void;
  configReady: boolean;
  lastResult: CommandResult | null;
  running: boolean;
  setRunning: (v: boolean) => void;
  history: CommandResult[];
  pushHistory: (r: CommandResult) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<PageId>("dashboard");
  const [overrides, setOverridesState] = useState<GlobalOverrides>(defaultOverrides);
  const [configReady, setConfigReady] = useState(false);
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<CommandResult[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(true);

  // Load ~/.config/solana-cli-gui/config.toml on startup
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await loadGuiConfig();
        if (cancelled) return;
        setOverridesState({
          ...defaultOverrides,
          ...res.config,
          commitment: res.config.commitment || "confirmed",
        });
      } catch (e) {
        console.error("load gui config:", e);
      } finally {
        if (!cancelled) {
          setConfigReady(true);
          // Don't rewrite file immediately after load
          skipNextSave.current = true;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist overrides to config.toml (debounced)
  useEffect(() => {
    if (!configReady) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveGuiConfig(overrides).catch((e) => console.error("save gui config:", e));
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [overrides, configReady]);

  const setOverrides = useCallback((patch: Partial<GlobalOverrides>) => {
    setOverridesState((prev) => ({ ...prev, ...patch }));
  }, []);

  const pushHistory = useCallback((r: CommandResult) => {
    setHistory((prev) => [r, ...prev].slice(0, 50));
    setLastResult(r);
  }, []);

  const value = useMemo(
    () => ({
      page,
      setPage,
      overrides,
      setOverrides,
      configReady,
      lastResult,
      running,
      setRunning,
      history,
      pushHistory,
    }),
    [page, overrides, setOverrides, configReady, lastResult, running, history, pushHistory]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
