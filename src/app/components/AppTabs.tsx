import { useEffect, useState } from "react";
import { AlertTriangle, Clock3, Home, LogOut, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import type { AuthenticatedUser } from "./AuthScreen";

export type AppTab = "home" | "history" | "account";

interface AppTabBarProps {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
}

export function AppTabBar({ activeTab, onChange }: AppTabBarProps) {
  const tabs = [
    { id: "home" as const, label: "HOME", icon: Home },
    { id: "history" as const, label: "HISTORY", icon: Clock3 },
    { id: "account" as const, label: "ACCOUNT", icon: UserRound },
  ];

  return (
    <nav
      aria-label="Main navigation"
      className="grid grid-cols-3 shrink-0"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        background: "#0A0C12",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        padding: "8px 12px max(8px, env(safe-area-inset-bottom))",
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => onChange(tab.id)}
            className="flex flex-col items-center justify-center gap-1 py-1"
            style={{ color: isActive ? "#EF4444" : "#7A8FAD" }}
          >
            <Icon size={19} strokeWidth={isActive ? 2.4 : 1.8} />
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "9px", fontWeight: isActive ? 700 : 500 }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

interface ReportRecord {
  id: number;
  incident_label: string;
  severity: "urgent" | "minor";
  building: string;
  floor: string;
  description: string;
  status: string;
  created_at: string;
}

interface ReportHistoryProps {
  apiBaseUrl: string;
  refreshKey: number;
}

export function ReportHistory({ apiBaseUrl, refreshKey }: ReportHistoryProps) {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoadState("loading");
    setErrorMessage("");

    fetch(`${apiBaseUrl}/api/reports/`, { credentials: "include", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load reports (${response.status}).`);
        return response.json();
      })
      .then((data: unknown) => {
        if (!Array.isArray(data)) throw new Error("The reports response was not a list.");
        setReports(data as ReportRecord[]);
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setErrorMessage(error instanceof Error ? error.message : "Could not load report history.");
        setLoadState("error");
      });

    return () => controller.abort();
  }, [apiBaseUrl, refreshKey, retryCount]);

  return (
    <section className="size-full flex flex-col" style={{ background: "#080A0F", fontFamily: "Inter, sans-serif" }}>
      <header
        className="flex items-center justify-between gap-4 px-5 py-4"
        style={{ background: "#0A0C12", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div>
          <p style={{ color: "#EF4444", fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.12em" }}>
            SAFE
          </p>
          <h1 style={{ color: "#F0F4FF", fontSize: "20px", fontWeight: 700 }}>Report History</h1>
        </div>
        <button
          type="button"
          aria-label="Refresh report history"
          title="Refresh report history"
          onClick={() => setRetryCount((count) => count + 1)}
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ color: "#C8D6F0", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <RefreshCw size={16} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loadState === "loading" && (
          <p style={{ color: "#7A8FAD", fontSize: "13px" }}>Loading reports...</p>
        )}
        {loadState === "error" && (
          <div className="rounded-xl p-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <p style={{ color: "#FCA5A5", fontSize: "13px" }}>{errorMessage}</p>
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              className="mt-3 text-sm font-semibold"
              style={{ color: "#EF4444" }}
            >
              Try again
            </button>
          </div>
        )}
        {loadState === "ready" && reports.length === 0 && (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
            <Clock3 size={24} color="#4A5F7A" />
            <p style={{ color: "#F0F4FF", fontSize: "15px", fontWeight: 600 }}>No reports yet</p>
            <p style={{ color: "#7A8FAD", fontSize: "12px" }}>Submitted reports will appear here.</p>
          </div>
        )}
        {loadState === "ready" && reports.length > 0 && (
          <div className="flex flex-col gap-3">
            {reports.map((report) => {
              const urgent = report.severity === "urgent";
              const accent = urgent ? "#EF4444" : "#22C55E";
              const createdAt = new Date(report.created_at);
              const dateLabel = Number.isNaN(createdAt.getTime()) ? report.created_at : createdAt.toLocaleString();

              return (
                <article
                  key={report.id}
                  className="rounded-xl p-4"
                  style={{ background: "#0E1117", border: `1px solid ${urgent ? "rgba(239,68,68,0.24)" : "rgba(34,197,94,0.2)"}` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <AlertTriangle size={16} color={accent} className="mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <h2 style={{ color: "#F0F4FF", fontSize: "14px", fontWeight: 700, lineHeight: 1.4 }}>
                          {report.incident_label}
                        </h2>
                        <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px", marginTop: "4px" }}>
                          {dateLabel}
                        </p>
                      </div>
                    </div>
                    <span style={{ color: accent, fontFamily: "DM Mono, monospace", fontSize: "9px", fontWeight: 700, textTransform: "uppercase" }}>
                      {report.status}
                    </span>
                  </div>
                  <p className="mt-3" style={{ color: "#AAB8CE", fontSize: "12px", lineHeight: 1.5 }}>
                    {[report.building, report.floor].filter((value) => value && value !== "Unknown").join(" · ") || "Location not provided"}
                  </p>
                  {report.description && (
                    <p className="mt-2 break-words" style={{ color: "#7A8FAD", fontSize: "12px", lineHeight: 1.5 }}>
                      {report.description}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

interface AccountTabProps {
  user: AuthenticatedUser;
  onLogout: () => Promise<void>;
}

export function AccountTab({ user, onLogout }: AccountTabProps) {
  const [logoutError, setLogoutError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError("");
    try {
      await onLogout();
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Could not sign out.");
      setIsLoggingOut(false);
    }
  };

  return (
    <section className="size-full flex flex-col" style={{ background: "#080A0F", fontFamily: "Inter, sans-serif" }}>
      <header className="px-5 py-4" style={{ background: "#0A0C12", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ color: "#EF4444", fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.12em" }}>SAFE</p>
        <h1 style={{ color: "#F0F4FF", fontSize: "20px", fontWeight: 700 }}>Account Information</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
          <div className="flex items-center gap-3 rounded-xl p-4" style={{ background: "#0E1117", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(239,68,68,0.12)", color: "#FCA5A5" }}>
              <UserRound size={21} />
            </div>
            <div className="min-w-0">
              <p className="truncate" style={{ color: "#F0F4FF", fontSize: "16px", fontWeight: 700 }}>{user.display_name}</p>
              <p className="truncate" style={{ color: "#7A8FAD", fontSize: "12px" }}>{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl p-4" style={{ background: "#0E1117", border: "1px solid rgba(34,197,94,0.2)" }}>
            <ShieldCheck size={18} color="#22C55E" />
            <div>
              <p style={{ color: "#F0F4FF", fontSize: "13px", fontWeight: 600 }}>
                {user.account_type === "student" ? "Student demo account" : "Visitor demo account"}
              </p>
              <p style={{ color: "#7A8FAD", fontSize: "11px", marginTop: "3px" }}>
                Identity not verified
              </p>
            </div>
          </div>

          <p style={{ color: "#7A8FAD", fontSize: "11px", lineHeight: 1.5 }}>
            Identity checks are currently disabled. This demo account has not been verified. Do not enter real personal or medical information.
          </p>

          {logoutError && <p role="alert" style={{ color: "#FCA5A5", fontSize: "12px" }}>{logoutError}</p>}
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#C8D6F0" }}
          >
            <LogOut size={16} />
            {isLoggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </div>
    </section>
  );
}
