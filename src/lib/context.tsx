import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
  lastResult: CommandResult | null;
  setLastResult: (r: CommandResult | null) => void;
  running: boolean;
  setRunning: (v: boolean) => void;
  history: CommandResult[];
  pushHistory: (r: CommandResult) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<PageId>("dashboard");
  const [overrides, setOverridesState] = useState<GlobalOverrides>(defaultOverrides);
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<CommandResult[]>([]);

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
      lastResult,
      setLastResult,
      running,
      setRunning,
      history,
      pushHistory,
    }),
    [page, overrides, setOverrides, lastResult, running, history, pushHistory]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
