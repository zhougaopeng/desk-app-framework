import { APP_DISPLAY_NAME } from "@desk-framework/shared";
import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api, isElectron } from "@/api/adapter";

function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.settings.get().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="mb-4 text-lg font-semibold">Settings</h2>
      <pre className="rounded-lg bg-muted p-4 text-sm">
        {JSON.stringify(settings, null, 2)}
      </pre>
    </div>
  );
}

function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">{APP_DISPLAY_NAME}</h1>
      <p className="text-muted-foreground">
        Your desktop application skeleton is ready.
      </p>
    </div>
  );
}

export function App() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    return window.electronAPI?.ipc?.on("frontend:update-ready", () => {
      window.location.reload();
    });
  }, []);

  const goHome = useCallback(() => navigate("/"), [navigate]);
  const goSettings = useCallback(() => navigate("/settings"), [navigate]);

  const barTitle = location.pathname === "/settings" ? "Settings" : "";

  return (
    <div className="flex h-full flex-col bg-background">
      {isElectron && (
        <div className="drag-region flex h-11 shrink-0">
          <div className="flex w-56 shrink-0 items-center border-r border-sidebar-border bg-sidebar pl-20 pr-4">
            <span className="text-sm font-medium text-sidebar-foreground tracking-tight">
              {APP_DISPLAY_NAME}
            </span>
          </div>
          <div className="flex flex-1 items-center bg-[oklch(0.97_0.009_80)] px-4">
            {barTitle && (
              <span className="truncate text-sm text-sidebar-foreground/70">{barTitle}</span>
            )}
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside
          className={`flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar${isElectron ? " drag-region" : ""}`}
        >
          {!isElectron && (
            <div className="flex h-12 shrink-0 items-center px-4">
              <span className="text-sm font-medium text-sidebar-foreground tracking-tight">
                {APP_DISPLAY_NAME}
              </span>
            </div>
          )}

          <div className={`flex flex-1 flex-col overflow-y-auto px-2${isElectron ? " no-drag" : ""}`}>
            <nav className="mt-2 flex flex-col gap-1">
              <button
                type="button"
                onClick={goHome}
                className={`flex items-center rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  location.pathname === "/"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                Home
              </button>
              <button
                type="button"
                onClick={goSettings}
                className={`flex items-center rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  location.pathname === "/settings"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                Settings
              </button>
            </nav>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
