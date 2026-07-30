import { useCallback, useEffect, useMemo, useState } from "react";
import { AppProvider, useApp } from "./lib/context";
import { getAppStatus, overridesToRequest } from "./lib/tauri";
import type { AppStatus } from "./lib/types";
import { resolveCluster } from "./lib/solscan";
import { Sidebar } from "./components/layout/Sidebar";
import { StatusBar } from "./components/layout/StatusBar";
import { OutputPanel } from "./components/layout/OutputPanel";
import { GlobalOverridesBar } from "./components/layout/GlobalOverrides";
import { Dashboard } from "./components/pages/Dashboard";
import { CatalogPage } from "./components/pages/CatalogPage";
import { ConsolePage } from "./components/pages/Console";
import { WalletPage } from "./components/pages/Wallet";
import { SoltopPage } from "./components/pages/Soltop";
import "./styles/globals.css";

function Shell() {
  const { page, setPage, overrides, setOverrides, lastResult, running } = useApp();
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const cluster = useMemo(
    () => resolveCluster(overrides.url, status?.config?.stdout),
    [overrides.url, status?.config?.stdout]
  );

  // Only RPC / keypair / config path should re-fetch overview status.
  // commitment, json, verbose, skip-preflight only affect the next command.
  const statusKey = useMemo(
    () =>
      [overrides.configPath, overrides.url, overrides.keypair, overrides.ws].join(
        "\0"
      ),
    [overrides.configPath, overrides.url, overrides.keypair, overrides.ws]
  );

  const refreshStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const s = await getAppStatus(
        overridesToRequest(
          {
            configPath: overrides.configPath,
            url: overrides.url,
            keypair: overrides.keypair,
            commitment: "", // status snapshot uses config default; UI commitment is for runs
            ws: overrides.ws,
            verbose: false,
            skipPreflight: false,
            json: false,
          },
          { binary: "solana", args: [] }
        )
      );
      setStatus(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStatus(false);
    }
    // statusKey intentionally gates when connection identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusKey]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1">
        <Sidebar page={page} onNavigate={setPage} />
        <div className="flex min-w-0 flex-1 flex-col">
          <GlobalOverridesBar value={overrides} onChange={setOverrides} />
          <main className="min-h-0 flex-1 overflow-y-auto p-3">
            {page === "dashboard" ? (
              <Dashboard
                status={status}
                onRefresh={() => void refreshStatus()}
                loading={loadingStatus}
                cluster={cluster}
              />
            ) : page === "console" ? (
              <ConsolePage />
            ) : page === "wallet" ? (
              <WalletPage />
            ) : page === "soltop" ? (
              <SoltopPage />
            ) : (
              <CatalogPage page={page} />
            )}
          </main>
        </div>
        <OutputPanel result={lastResult} cluster={cluster} />
      </div>
      <StatusBar
        status={status}
        running={running}
        overrideUrl={overrides.url}
        cluster={cluster}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
