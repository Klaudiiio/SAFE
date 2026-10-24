import { useEffect, useState } from "react";
import { AlertTriangle, Clock3, Home, LogOut, MessageCircle, RefreshCw, Send, ShieldCheck, UserRound } from "lucide-react";
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

interface RecentReportRecord extends Omit<ReportRecord, "description"> {}

interface ReportHistoryProps {
  apiBaseUrl: string;
  refreshKey: number;
}

export function ReportHistory({ apiBaseUrl, refreshKey }: ReportHistoryProps) {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [recentReports, setRecentReports] = useState<RecentReportRecord[]>([]);
  const [historyView, setHistoryView] = useState<"mine" | "recent">("mine");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [messageReportId, setMessageReportId] = useState<number | null>(null);
  const [caseMessages, setCaseMessages] = useState<Array<{ id: number; message: string; created_at: string; sender_name: string; sender_role: string }>>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [messageError, setMessageError] = useState("");
  const [messageBusy, setMessageBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoadState("loading");
    setErrorMessage("");

    const fetchReportList = async <T,>(path: string): Promise<T[]> => {
      const response = await fetch(`${apiBaseUrl}${path}`, { credentials: "include", signal: controller.signal });
      if (!response.ok) throw new Error(`Could not load reports (${response.status}).`);
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error("The reports response was not a list.");
      return data as T[];
    };

    Promise.all([
      fetchReportList<ReportRecord>("/api/reports/"),
      fetchReportList<RecentReportRecord>("/api/reports/recent/"),
    ])
      .then(([mine, recent]) => {
        setReports(mine);
        setRecentReports(recent);
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setErrorMessage(error instanceof Error ? error.message : "Could not load report history.");
        setLoadState("error");
      });

    return () => controller.abort();
  }, [apiBaseUrl, refreshKey, retryCount]);

  const visibleReports = historyView === "mine" ? reports : recentReports;

  useEffect(() => {
    if (messageReportId === null) return;
    const controller = new AbortController();
    setMessageError("");
    const loadMessages = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/reports/${messageReportId}/messages/`, {
          credentials: "include",
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          const detail = typeof payload === "object" && payload !== null && "detail" in payload
            ? String(payload.detail)
            : `Could not load messages (${response.status}).`;
          throw new Error(detail);
        }
        if (!Array.isArray(payload)) throw new Error("The case messages response was not a list.");
        setCaseMessages(payload);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setMessageError(error instanceof Error ? error.message : "Could not load case messages.");
      }
    };
    void loadMessages();
    const interval = window.setInterval(() => void loadMessages(), 15000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [apiBaseUrl, messageReportId]);

  const sendCaseMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (messageReportId === null || !messageDraft.trim()) return;
    setMessageBusy(true);
    setMessageError("");
    try {
      const csrfResponse = await fetch(`${apiBaseUrl}/api/auth/csrf/`, { credentials: "include" });
      const csrfPayload = await csrfResponse.json() as { csrf_token?: string };
      if (!csrfResponse.ok || !csrfPayload.csrf_token) throw new Error("Could not start a secure message.");
      const response = await fetch(`${apiBaseUrl}/api/reports/${messageReportId}/messages/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfPayload.csrf_token },
        body: JSON.stringify({ message: messageDraft.trim() }),
      });
      const payload = await response.json() as { detail?: string; id?: number; message?: string; created_at?: string; sender_name?: string; sender_role?: string };
      if (!response.ok) throw new Error(payload.detail || `Could not send message (${response.status}).`);
      if (payload.id && payload.message && payload.created_at) {
        setCaseMessages((items) => [...items, {
          id: payload.id!, message: payload.message!, created_at: payload.created_at!,
          sender_name: payload.sender_name ?? "You", sender_role: payload.sender_role ?? "patient",
        }]);
      }
      setMessageDraft("");
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : "Could not send case message.");
    } finally {
      setMessageBusy(false);
    }
  };

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
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl p-1" style={{ background: "#0E1117", border: "1px solid rgba(255,255,255,0.07)" }}>
          {([
            ["mine", "My reports"],
            ["recent", "All · 7 days"],
          ] as const).map(([view, label]) => (
            <button
              key={view}
              type="button"
              aria-pressed={historyView === view}
              onClick={() => setHistoryView(view)}
              className="rounded-lg px-3 py-2 text-xs font-semibold"
              style={{ background: historyView === view ? "rgba(239,68,68,0.14)" : "transparent", color: historyView === view ? "#FCA5A5" : "#7A8FAD" }}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mb-3" style={{ color: "#7A8FAD", fontSize: "11px" }}>
          {historyView === "mine" ? "Reports submitted by your account." : "Recent incident summaries. Personal details are not shown."}
        </p>
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
        {loadState === "ready" && visibleReports.length === 0 && (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
            <Clock3 size={24} color="#4A5F7A" />
            <p style={{ color: "#F0F4FF", fontSize: "15px", fontWeight: 600 }}>
              {historyView === "mine" ? "No reports yet" : "No reports in the past 7 days"}
            </p>
            <p style={{ color: "#7A8FAD", fontSize: "12px" }}>
              {historyView === "mine" ? "Reports submitted from your account will appear here." : "Newly submitted reports will appear here."}
            </p>
          </div>
        )}
        {loadState === "ready" && visibleReports.length > 0 && (
          <div className="flex flex-col gap-3">
            {visibleReports.map((report) => {
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
                  {historyView === "mine" && report.description && (
                    <p className="mt-2 break-words" style={{ color: "#7A8FAD", fontSize: "12px", lineHeight: 1.5 }}>
                      {report.description}
                    </p>
                  )}
                  {historyView === "mine" && (
                    <div className="mt-3">
                      <button type="button" onClick={() => setMessageReportId((current) => current === report.id ? null : report.id)} className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: "#60A5FA" }}>
                        <MessageCircle size={14} /> {messageReportId === report.id ? "Hide secure messages" : "Secure messages"}
                      </button>
                      {messageReportId === report.id && (
                        <div className="mt-3 rounded-lg p-3" style={{ background: "#090C12", border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="mb-3 flex max-h-48 flex-col gap-2 overflow-y-auto">
                            {caseMessages.length === 0 && !messageError && <p style={{ color: "#7A8FAD", fontSize: "11px" }}>No messages yet. You can message the clinic staff about this report.</p>}
                            {caseMessages.map((message) => (
                              <div key={message.id} className="rounded-lg p-2" style={{ background: message.sender_role === "patient" ? "rgba(59,130,246,0.1)" : "rgba(34,197,94,0.1)" }}>
                                <div className="flex justify-between gap-2"><strong style={{ color: "#C8D6F0", fontSize: "10px" }}>{message.sender_name}</strong><small style={{ color: "#7A8FAD", fontSize: "9px" }}>{new Date(message.created_at).toLocaleString()}</small></div>
                                <p className="mt-1 whitespace-pre-wrap break-words" style={{ color: "#AAB8CE", fontSize: "11px" }}>{message.message}</p>
                              </div>
                            ))}
                          </div>
                          {messageError && <p role="alert" className="mb-2" style={{ color: "#FCA5A5", fontSize: "10px" }}>{messageError}</p>}
                          <form onSubmit={(event) => void sendCaseMessage(event)} className="flex gap-2">
                            <input aria-label="Message clinic staff" maxLength={3000} value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Write a message..." className="min-w-0 flex-1 rounded-lg px-3 py-2 text-xs outline-none" style={{ color: "#F0F4FF", background: "#121721", border: "1px solid rgba(255,255,255,0.1)" }} />
                            <button type="submit" disabled={messageBusy || !messageDraft.trim()} aria-label="Send message" className="rounded-lg px-3" style={{ color: "#fff", background: "#2563EB" }}><Send size={14} /></button>
                          </form>
                        </div>
                      )}
                    </div>
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
