import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, Ambulance, ArrowDown, ArrowLeft, ArrowRight,
  Bell, CalendarDays, Check, CheckCheck, ChevronRight, ClipboardList,
  Clock3, HeartPulse, LayoutDashboard, LoaderCircle, LogOut, MapPin,
  Menu, MessageCircle, Phone, Plus, RefreshCw, Search, Send, Shield,
  Stethoscope, UserRound, Users, X,
} from "lucide-react";

type Page = "overview" | "cases" | "patients" | "calendar" | "messages" | "reports" | "resources" | "settings";
type Bucket = "incoming" | "active" | "completed" | "all";
type Status = "submitted" | "acknowledged" | "in_progress" | "resolved" | "closed";

interface Responder {
  user_id: number;
  name: string;
  department: string;
  contact_number: string;
  availability_status: "available" | "unavailable" | "on_break";
  username: string;
  email: string;
}

interface CaseRecord {
  id: number;
  incident_id: number;
  incident_label: string;
  incident_code: string;
  severity: string;
  guidance: string;
  building: string;
  floor: string;
  description: string;
  status: Status;
  response_eta_minutes: number;
  created_at: string;
  resolved_at: string | null;
  patient: { id: number; case_reference: string; name: string; email: string; phone_number: string; account_type: string } | null;
  timeline: Array<{ id: number; event_type: string; remarks: string; action_time: string; actor: string }>;
  notes: { diagnosis: string; doctor_notes: string; vital_signs: Record<string, string | number>; actions_taken: string[] } | null;
}

interface CaseMessage {
  id: number;
  message: string;
  created_at: string;
  sender_name: string;
  sender_role: string;
}

interface Notice {
  id: number;
  incident_id: number;
  incident_label: string;
  event_type: string;
  message: string;
  created_at: string;
  status: string;
}

interface Dashboard {
  incoming_count: number;
  active_count: number;
  resolved_today: number;
  urgent_open: number;
  responders_available: number;
  responders_total: number;
  unread_notifications: number;
  recent_cases: CaseRecord[];
}

interface Patient {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  reports_count: number;
  last_reported_at: string;
}

interface ReportSummary {
  period_start: string;
  total: number;
  urgent: number;
  resolved: number;
  resolution_rate: number;
  by_status: Array<{ status: string; count: number }>;
}

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || "";

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (options.method && options.method !== "GET") {
    const tokenResponse = await fetch(`${API_BASE_URL}/api/auth/csrf/`, { credentials: "include" });
    if (!tokenResponse.ok) throw new Error("Could not start a secure clinic request.");
    const token = await tokenResponse.json() as { csrf_token: string };
    headers.set("X-CSRFToken", token.csrf_token);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, credentials: "include" });
  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const payload = await response.json() as { detail?: string };
      if (payload.detail) message = payload.detail;
    } catch {
      // Keep the HTTP status message for non-JSON responses.
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const dateTime = (value: string) => new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const pretty = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function ClinicStaffApp() {
  const [responder, setResponder] = useState<Responder | null>(null);
  const [checking, setChecking] = useState(true);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [page, setPage] = useState<Page>("overview");
  const [bucket, setBucket] = useState<Bucket>("incoming");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [selected, setSelected] = useState<CaseRecord | null>(null);
  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [search, setSearch] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [vitals, setVitals] = useState("{}");
  const [actionsTaken, setActionsTaken] = useState("");
  const [availability, setAvailability] = useState<Responder["availability_status"]>("available");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [showNotices, setShowNotices] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!responder) return;
    try {
      const data = await api<Dashboard>("/api/clinic/dashboard/");
      setDashboard(data);
      setNotices(await api<Notice[]>("/api/clinic/notifications/"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load clinic dashboard.");
    } finally {
      setDashboardLoading(false);
    }
  }, [responder]);

  const loadCases = useCallback(async () => {
    if (!responder) return;
    setLoading(true);
    setError("");
    try {
      const items = await api<CaseRecord[]>(`/api/clinic/cases/?bucket=${bucket}&q=${encodeURIComponent(search)}`);
      setCases(items);
      setSelected((current) => current ? items.find((item) => item.id === current.id) ?? current : null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load cases.");
    } finally {
      setLoading(false);
    }
  }, [bucket, responder, search]);

  useEffect(() => {
    api<Responder>("/api/clinic/session/")
      .then((account) => {
        setResponder(account);
        setAvailability(account.availability_status);
        setDashboardLoading(true);
      })
      .catch(() => setResponder(null))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!responder) return;
    void loadDashboard();
    const timer = window.setInterval(() => void loadDashboard(), 20000);
    return () => window.clearInterval(timer);
  }, [loadDashboard, responder]);

  useEffect(() => {
    if (!responder || page !== "cases") return;
    void loadCases();
  }, [bucket, loadCases, page, responder, search]);

  useEffect(() => {
    if (!responder || page !== "patients") return;
    let active = true;
    setPatientsLoading(true);
    api<Patient[]>(`/api/clinic/patients/?q=${encodeURIComponent(search)}`)
      .then((items) => { if (active) setPatients(items); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load patients.");
      })
      .finally(() => { if (active) setPatientsLoading(false); });
    return () => { active = false; };
  }, [page, responder, search]);

  useEffect(() => {
    if (!responder || page !== "reports") return;
    let active = true;
    setReportsLoading(true);
    api<ReportSummary>("/api/clinic/reports/")
      .then((summary) => { if (active) setReport(summary); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load reports.");
      })
      .finally(() => { if (active) setReportsLoading(false); });
    return () => { active = false; };
  }, [page, responder]);

  const loadMessages = useCallback(async (caseId: number) => {
    try {
      setMessages(await api<CaseMessage[]>(`/api/clinic/cases/${caseId}/messages/`));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load case messages.");
    }
  }, []);

  useEffect(() => {
    if (!responder || page !== "cases" || !selected) return;
    const timer = window.setInterval(() => {
      api<CaseRecord>(`/api/clinic/cases/${selected.id}/`)
        .then(setSelected)
        .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Could not refresh the selected case."));
      void loadMessages(selected.id);
    }, 20000);
    return () => window.clearInterval(timer);
  }, [loadMessages, page, responder, selected?.id]);

  const openCase = async (record: CaseRecord) => {
    setSelected(record);
    setDiagnosis(record.notes?.diagnosis ?? "");
    setDoctorNotes(record.notes?.doctor_notes ?? "");
    setVitals(JSON.stringify(record.notes?.vital_signs ?? {}, null, 2));
    setActionsTaken((record.notes?.actions_taken ?? []).join("\n"));
    await loadMessages(record.id);
    setPage("cases");
  };

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");
    setLoginBusy(true);
    try {
      const account = await api<Responder>("/api/clinic/login/", {
        method: "POST",
        body: JSON.stringify({ username: loginName, password: loginPassword }),
      });
      setResponder(account);
      setAvailability(account.availability_status);
      setLoginPassword("");
      setDashboardLoading(true);
    } catch (loginFailure) {
      setLoginError(loginFailure instanceof Error ? loginFailure.message : "Sign in failed.");
    } finally {
      setLoginBusy(false);
    }
  };

  const logout = async () => {
    try {
      await api("/api/clinic/logout/", { method: "POST" });
      setResponder(null);
      setDashboard(null);
      setSelected(null);
    } catch (logoutFailure) {
      setError(logoutFailure instanceof Error ? logoutFailure.message : "Could not sign out.");
    }
  };

  const navigate = (target: Page) => {
    setPage(target);
    setSelected(null);
    setMobileNav(false);
    setError("");
  };

  const performAction = async (action: string, message?: string) => {
    if (!selected) return;
    try {
      const result = await api<{ case: CaseRecord }>(`/api/clinic/cases/${selected.id}/actions/`, {
        method: "POST",
        body: JSON.stringify({ action, message }),
      });
      setSelected(result.case);
      setToast(action === "request_ambulance"
        ? "Ambulance request recorded. Contact emergency services directly."
        : `Case ${action.replaceAll("_", " ")} completed.`);
      await Promise.all([loadDashboard(), loadCases()]);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not complete case action.");
    }
  };

  const saveNotes = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    let parsedVitals: Record<string, string | number>;
    try {
      parsedVitals = JSON.parse(vitals) as Record<string, string | number>;
      if (!parsedVitals || Array.isArray(parsedVitals) || typeof parsedVitals !== "object") throw new Error();
    } catch {
      setError("Vitals must be a valid JSON object, for example {\"pulse\": 78}.");
      return;
    }
    try {
      const notes = await api<NonNullable<CaseRecord["notes"]>>(`/api/clinic/cases/${selected.id}/notes/`, {
        method: "PUT",
        body: JSON.stringify({
          diagnosis,
          doctor_notes: doctorNotes,
          vital_signs: parsedVitals,
          actions_taken: actionsTaken.split("\n").map((line) => line.trim()).filter(Boolean),
        }),
      });
      setSelected({ ...selected, notes });
      setToast("Clinical notes saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save clinical notes.");
    }
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !draftMessage.trim()) return;
    try {
      const sent = await api<CaseMessage>(`/api/clinic/cases/${selected.id}/messages/`, {
        method: "POST",
        body: JSON.stringify({ message: draftMessage.trim() }),
      });
      setMessages((existing) => [...existing, sent]);
      setDraftMessage("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send the message.");
    }
  };

  const changeAvailability = async (value: Responder["availability_status"]) => {
    try {
      const account = await api<Responder>("/api/clinic/availability/", {
        method: "PATCH",
        body: JSON.stringify({ availability_status: value }),
      });
      setAvailability(account.availability_status);
      setResponder(account);
    } catch (availabilityError) {
      setError(availabilityError instanceof Error ? availabilityError.message : "Could not update availability.");
    }
  };

  const markRead = async (notice: Notice) => {
    try {
      await api(`/api/clinic/notifications/${notice.id}/read/`, { method: "POST" });
      setNotices((items) => items.map((item) => item.id === notice.id ? { ...item, status: "read" } : item));
    } catch (noticeError) {
      setError(noticeError instanceof Error ? noticeError.message : "Could not update notification.");
    }
  };

  const navItems = useMemo(() => [
    { id: "overview" as const, label: "Dashboard", icon: LayoutDashboard },
    { id: "cases" as const, label: "Case queue", icon: Activity },
    { id: "patients" as const, label: "Patients", icon: Users },
    { id: "calendar" as const, label: "Timeline", icon: CalendarDays },
    { id: "messages" as const, label: "Messages", icon: MessageCircle },
    { id: "reports" as const, label: "Reports", icon: ClipboardList },
    { id: "resources" as const, label: "Resources", icon: HeartPulse },
    { id: "settings" as const, label: "Settings", icon: Stethoscope },
  ], []);

  if (checking) return <div className="clinic-loading" role="status" aria-live="polite"><LoaderCircle className="spin" /> Checking clinic staff session...</div>;
  if (!responder) {
    return (
      <main className="clinic-login">
        <section className="clinic-login-card">
          <div className="clinic-brand-mark"><Shield size={24} /></div>
          <div className="clinic-kicker">SAFE RESPONSE NETWORK</div>
          <h1>Clinic staff portal</h1>
          <p>Sign in with an account created by your SAFE administrator.</p>
          <form onSubmit={login}>
            <label htmlFor="clinic-username">Username</label>
            <input id="clinic-username" autoComplete="username" value={loginName} onChange={(event) => setLoginName(event.target.value)} required />
            <label htmlFor="clinic-password">Password</label>
            <input id="clinic-password" type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required />
            {loginError && <div className="clinic-error" role="alert">{loginError}</div>}
            <button className="clinic-primary wide" type="submit" disabled={loginBusy} aria-busy={loginBusy}>
              {loginBusy ? <><LoaderCircle className="spin" size={16} /> Signing in...</> : <>Sign in to clinic <ArrowRight size={16} /></>}
            </button>
          </form>
          <div className="login-security"><Shield size={15} /> Private responder access · Secure session</div>
        </section>
      </main>
    );
  }

  return (
    <div className="clinic-shell">
      <aside className={`clinic-sidebar ${mobileNav ? "open" : ""}`}>
        <a className="clinic-logo" href="/clinic-staff/">
          <span className="clinic-logo-icon"><HeartPulse size={22} /></span>
          <span><strong>SAFE</strong><small>CLINIC STAFF</small></span>
        </a>
        <div className="clinic-nav-label">WORKSPACE</div>
        <nav aria-label="Clinic staff navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`clinic-nav-item ${page === id ? "active" : ""}`} onClick={() => navigate(id)}>
              <Icon size={18} /><span>{label}</span>
              {id === "cases" && dashboard?.incoming_count ? <b className="nav-pill">{dashboard.incoming_count}</b> : null}
            </button>
          ))}
        </nav>
        <div className="clinic-sidebar-bottom">
          <div className="clinic-status"><span className="online-dot" /> Response network online</div>
          <button className="clinic-profile" onClick={() => void logout()}>
            <span className="profile-avatar">{responder.name.slice(0, 1).toUpperCase()}</span>
            <span><strong>{responder.name}</strong><small>{responder.department}</small></span>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="clinic-main">
        <header className="clinic-topbar">
          <button className="clinic-icon-button mobile-only" aria-label="Toggle navigation" onClick={() => setMobileNav((open) => !open)}><Menu size={19} /></button>
          <div className="clinic-crumb">SAFE <span>/</span> {navItems.find((item) => item.id === page)?.label}</div>
          <div className="topbar-right">
            <span className="network-live"><span className="online-dot" /> LIVE QUEUE</span>
            <button className="clinic-icon-button notification-button" aria-label="Notifications" onClick={() => setShowNotices((open) => !open)}>
              <Bell size={18} />
              {notices.some((item) => item.status === "new") && <i />}
            </button>
            <button className="availability-trigger" onClick={() => navigate("settings")}><span className={`availability-dot ${availability}`} /> {pretty(availability)}</button>
          </div>
        </header>

        <div className="clinic-content">
          {error && <div className="clinic-alert error"><AlertTriangle size={17} /><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button></div>}
          {toast && <div className="clinic-alert success"><Check size={17} /><span>{toast}</span><button onClick={() => setToast("")} aria-label="Dismiss notification"><X size={16} /></button></div>}
          {showNotices && (
            <section className="notice-popover">
              <div className="notice-title"><strong>Notifications</strong><button onClick={() => setShowNotices(false)} aria-label="Close notifications"><X size={16} /></button></div>
              {notices.length === 0 && <p className="muted">No notifications yet.</p>}
              {notices.map((notice) => (
                <button key={notice.id} className={`notice-row ${notice.status}`} onClick={() => {
                  void markRead(notice);
                  api<CaseRecord>(`/api/clinic/cases/${notice.incident_id}/`)
                    .then((record) => void openCase(record))
                    .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Could not open the notified case."));
                  setShowNotices(false);
                }}>
                  <span><strong>{notice.incident_label}</strong><small>{notice.message}</small><small>{dateTime(notice.created_at)}</small></span>
                  {notice.status === "new" && <i />}
                </button>
              ))}
            </section>
          )}

          {page === "overview" && (
            <DashboardPage dashboard={dashboard} responder={responder} loading={loading} dashboardLoading={dashboardLoading} onRefresh={() => void loadDashboard()} onOpenCase={(record) => void openCase(record)} onGoCases={() => navigate("cases")} />
          )}
          {page === "cases" && (
            selected ? (
              <CaseDetail
                record={selected}
                messages={messages}
                messageDraft={draftMessage}
                onMessageDraft={setDraftMessage}
                diagnosis={diagnosis}
                onDiagnosis={setDiagnosis}
                doctorNotes={doctorNotes}
                onDoctorNotes={setDoctorNotes}
                vitals={vitals}
                onVitals={setVitals}
                actionsTaken={actionsTaken}
                onActionsTaken={setActionsTaken}
                onSaveNotes={(event) => void saveNotes(event)}
                onSendMessage={(event) => void sendMessage(event)}
                onAction={(action, message) => void performAction(action, message)}
                onBack={() => setSelected(null)}
              />
            ) : (
              <CaseQueue bucket={bucket} onBucket={setBucket} cases={cases} search={search} onSearch={setSearch} loading={loading} onOpen={(record) => void openCase(record)} onRefresh={() => void loadCases()} />
            )
          )}
          {page === "patients" && <PatientsPage patients={patients} loading={patientsLoading} search={search} onSearch={setSearch} />}
          {page === "calendar" && <TimelinePage cases={dashboard?.recent_cases ?? []} onOpen={(record) => void openCase(record)} />}
          {page === "messages" && (
            <MessagesPage cases={dashboard?.recent_cases ?? []} onOpen={(record) => void openCase(record)} />
          )}
          {page === "reports" && <ReportsPage report={report} loading={reportsLoading} />}
          {page === "resources" && <ResourcesPage />}
          {page === "settings" && <SettingsPage responder={responder} availability={availability} onAvailability={(value) => void changeAvailability(value)} />}
        </div>
      </main>
      {mobileNav && <button className="clinic-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    </div>
  );
}

function DashboardPage({ dashboard, responder, loading, dashboardLoading, onRefresh, onOpenCase, onGoCases }: {
  dashboard: Dashboard | null; responder: Responder; loading: boolean; dashboardLoading: boolean; onRefresh: () => void;
  onOpenCase: (record: CaseRecord) => void; onGoCases: () => void;
}) {
  return (
    <>
      <div className="clinic-page-heading">
        <div><div className="clinic-kicker">RESPONSE OVERVIEW</div><h1>Good day, {responder.name.split(" ")[0]}</h1><p>Here is the latest activity from your clinic response queue.</p></div>
        <button className="clinic-secondary" onClick={onRefresh} disabled={loading}><RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh</button>
      </div>
      {dashboardLoading ? <section className="clinic-panel"><LoadingLine message="Loading dashboard and notifications..." /></section> : <>
      <section className="clinic-metrics">
        <Metric label="Incoming cases" value={dashboard?.incoming_count ?? "—"} tone="mint" icon={Activity} note="Shared responder queue" />
        <Metric label="Active responses" value={dashboard?.active_count ?? "—"} tone="blue" icon={HeartPulse} note="Currently being handled" />
        <Metric label="Urgent cases" value={dashboard?.urgent_open ?? "—"} tone="amber" icon={AlertTriangle} note="Needs prompt attention" />
        <Metric label="Resolved today" value={dashboard?.resolved_today ?? "—"} tone="violet" icon={CheckCheck} note="Cases completed today" />
      </section>
      <div className="dashboard-grid">
        <section className="clinic-panel">
          <div className="panel-heading"><div><h2>Incoming cases</h2><p>New reports shared with clinic staff</p></div><button className="text-button" onClick={onGoCases}>View queue <ChevronRight size={15} /></button></div>
          <CaseList cases={(dashboard?.recent_cases ?? []).filter((item) => ["submitted", "acknowledged", "in_progress"].includes(item.status)).slice(0, 5)} onOpen={onOpenCase} compact />
        </section>
        <section className="clinic-panel responders-panel">
          <div className="panel-heading"><div><h2>Clinic coverage</h2><p>Active responder availability</p></div><Users size={18} /></div>
          <div className="coverage-count"><strong>{dashboard?.responders_available ?? "—"}</strong><span>available now</span></div>
          <div className="coverage-track"><span style={{ width: `${dashboard?.responders_total ? Math.min(100, dashboard.responders_available / dashboard.responders_total * 100) : 0}%` }} /></div>
          <p className="coverage-foot">{dashboard?.responders_available ?? 0} available out of {dashboard?.responders_total ?? 0} active responders</p>
          <div className="coverage-notice"><Shield size={16} /><span>Cases are visible to all clinic responders. Please coordinate before taking action.</span></div>
        </section>
      </div>
      <section className="clinic-panel">
        <div className="panel-heading"><div><h2>Recent activity</h2><p>Latest incidents across SAFE</p></div><Clock3 size={18} /></div>
        <CaseList cases={dashboard?.recent_cases ?? []} onOpen={onOpenCase} />
      </section>
      </>}
    </>
  );
}

function Metric({ label, value, tone, icon: Icon, note }: { label: string; value: string | number; tone: string; icon: typeof Activity; note: string }) {
  return <article className="clinic-metric"><div className={`metric-icon ${tone}`}><Icon size={19} /></div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>;
}

function CaseQueue({ bucket, onBucket, cases, search, onSearch, loading, onOpen, onRefresh }: {
  bucket: Bucket; onBucket: (value: Bucket) => void; cases: CaseRecord[]; search: string; onSearch: (value: string) => void;
  loading: boolean; onOpen: (record: CaseRecord) => void; onRefresh: () => void;
}) {
  const tabs: Array<[Bucket, string]> = [["incoming", "Incoming"], ["active", "Active"], ["completed", "Completed"], ["all", "All cases"]];
  return (
    <>
      <div className="clinic-page-heading"><div><div className="clinic-kicker">SHARED RESPONSE WORKSPACE</div><h1>Case queue</h1><p>Review incidents and coordinate a safe, timely response.</p></div><button className="clinic-secondary" onClick={onRefresh} disabled={loading}><RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh</button></div>
      <div className="queue-toolbar">
        <div className="queue-tabs">{tabs.map(([value, label]) => <button key={value} className={bucket === value ? "selected" : ""} onClick={() => onBucket(value)}>{label}</button>)}</div>
        <label className="clinic-search"><Search size={16} /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search cases" /></label>
      </div>
      <section className="clinic-panel queue-panel">
        {loading ? <LoadingLine /> : <CaseList cases={cases} onOpen={onOpen} />}
        {!loading && cases.length === 0 && <EmptyState title="No cases in this view" description="Newly submitted incidents will appear in the shared queue." />}
      </section>
    </>
  );
}

function CaseList({ cases, onOpen, compact = false }: { cases: CaseRecord[]; onOpen: (record: CaseRecord) => void; compact?: boolean }) {
  if (cases.length === 0) return <EmptyState title="No cases yet" description="There are no incidents to display right now." />;
  return <div className="case-list">{cases.map((record) => (
    <button key={record.id} className={`case-row ${compact ? "compact" : ""}`} onClick={() => onOpen(record)}>
      <span className={`case-symbol ${record.severity.toLowerCase() === "urgent" ? "urgent" : ""}`}><Activity size={18} /></span>
      <span className="case-main"><strong>{record.incident_label}</strong><small>{record.patient?.name ?? "Unknown patient"} · {record.building}{record.floor ? `, ${record.floor}` : ""}</small><small className="case-description">{record.description || "No additional description provided."}</small></span>
      <span className="case-meta"><span className={`severity-badge ${record.severity.toLowerCase()}`}>{pretty(record.severity)}</span><span className={`status-badge ${record.status}`}>{pretty(record.status)}</span><small>{dateTime(record.created_at)}</small></span>
      <ChevronRight size={17} className="case-chevron" />
    </button>
  ))}</div>;
}

function CaseDetail(props: {
  record: CaseRecord; messages: CaseMessage[]; messageDraft: string; onMessageDraft: (value: string) => void;
  diagnosis: string; onDiagnosis: (value: string) => void; doctorNotes: string; onDoctorNotes: (value: string) => void;
  vitals: string; onVitals: (value: string) => void; actionsTaken: string; onActionsTaken: (value: string) => void;
  onSaveNotes: (event: FormEvent<HTMLFormElement>) => void; onSendMessage: (event: FormEvent<HTMLFormElement>) => void;
  onAction: (action: string, message?: string) => void; onBack: () => void;
}) {
  const [requestText, setRequestText] = useState("");
  const record = props.record;
  return (
    <>
      <button className="back-link" onClick={props.onBack}><ArrowLeft size={16} /> Back to case queue</button>
      <div className="case-detail-heading"><div><div className="clinic-kicker">CASE #{record.id} · {dateTime(record.created_at)}</div><h1>{record.incident_label}</h1><div className="detail-badges"><span className={`severity-badge ${record.severity.toLowerCase()}`}>{pretty(record.severity)}</span><span className={`status-badge ${record.status}`}>{pretty(record.status)}</span></div></div><span className="detail-reference">{record.patient?.case_reference ?? `C${record.id}`}</span></div>
      <div className="case-detail-layout">
        <div className="detail-main-column">
          <section className="clinic-panel patient-panel">
            <div className="panel-heading"><div><h2><UserRound size={18} /> Patient information</h2><p>Personal information is available to authenticated clinic responders.</p></div></div>
            <div className="patient-facts">
              <div><small>Patient</small><strong>{record.patient?.name ?? "Unknown patient"}</strong></div>
              <div><small>Patient reference</small><strong>{record.patient?.case_reference ?? "Unavailable"}</strong></div>
              <div><small>Location</small><strong><MapPin size={14} /> {record.building}{record.floor ? ` · ${record.floor}` : ""}</strong></div>
              <div><small>Account</small><strong>{pretty(record.patient?.account_type ?? "unknown")}</strong></div>
            </div>
            <div className="patient-actions">
              {record.patient?.phone_number ? <a className="clinic-secondary" href={`tel:${record.patient.phone_number}`}><Phone size={15} /> Call patient</a> : <span className="muted">No patient phone number</span>}
              <button className="clinic-secondary" onClick={() => document.getElementById("case-messages")?.scrollIntoView({ behavior: "smooth" })}><MessageCircle size={15} /> Secure message</button>
            </div>
          </section>
          <section className="clinic-panel">
            <div className="panel-heading"><div><h2>Incident summary</h2><p>{record.incident_code} · {record.guidance || "Follow clinic response procedures."}</p></div><AlertTriangle size={18} /></div>
            <p className="incident-description">{record.description || "No additional incident details were submitted."}</p>
          </section>
          <section className="clinic-panel">
            <div className="panel-heading"><div><h2><Stethoscope size={18} /> Clinical notes</h2><p>Record clinical observations and care provided.</p></div></div>
            <form className="clinical-form" onSubmit={props.onSaveNotes}>
              <label>Assessment<input value={props.diagnosis} maxLength={200} onChange={(event) => props.onDiagnosis(event.target.value)} placeholder="Add a brief assessment" /></label>
              <label>Doctor notes<textarea rows={4} value={props.doctorNotes} onChange={(event) => props.onDoctorNotes(event.target.value)} placeholder="Document relevant notes" /></label>
              <label>Vitals <span className="input-hint">JSON format, e.g. {"{\"pulse\": 78}"}</span><textarea className="code-input" rows={4} value={props.vitals} onChange={(event) => props.onVitals(event.target.value)} /></label>
              <label>Actions taken <span className="input-hint">One action per line</span><textarea rows={3} value={props.actionsTaken} onChange={(event) => props.onActionsTaken(event.target.value)} placeholder="One action per line" /></label>
              <button className="clinic-primary" type="submit"><Check size={16} /> Save clinical notes</button>
            </form>
          </section>
          <section className="clinic-panel" id="case-messages">
            <div className="panel-heading"><div><h2><MessageCircle size={18} /> Secure case messages</h2><p>Conversation is limited to this patient and authenticated responders.</p></div></div>
            <div className="message-list">{props.messages.length === 0 ? <p className="muted">No messages yet.</p> : props.messages.map((message) => <article key={message.id} className={`message-bubble ${message.sender_role === "clinic" ? "staff-message" : ""}`}><div><strong>{message.sender_name}</strong><small>{dateTime(message.created_at)}</small></div><p>{message.message}</p></article>)}</div>
            <form className="send-message-form" onSubmit={props.onSendMessage}><input value={props.messageDraft} maxLength={3000} onChange={(event) => props.onMessageDraft(event.target.value)} placeholder="Write a secure message..." required /><button className="clinic-primary" type="submit"><Send size={16} /> Send</button></form>
          </section>
        </div>
        <aside className="detail-side-column">
          <section className="clinic-panel">
            <div className="panel-heading"><div><h2>Case actions</h2><p>Actions are shared with the responder team.</p></div></div>
            <div className="case-action-list">
              {["submitted", "acknowledged"].includes(record.status) && <button className="clinic-primary wide" onClick={() => props.onAction("accept")}><Check size={16} /> Acknowledge case</button>}
              {["submitted", "acknowledged", "in_progress"].includes(record.status) && <button className="clinic-secondary wide" onClick={() => props.onAction("start_response")}><Activity size={16} /> Start response</button>}
              {["submitted", "acknowledged", "in_progress"].includes(record.status) && <button className="clinic-secondary wide ambulance-action" onClick={() => props.onAction("request_ambulance")}><Ambulance size={16} /> Record ambulance request</button>}
              {["submitted", "acknowledged", "in_progress"].includes(record.status) && <button className="clinic-secondary wide" onClick={() => {
                const message = requestText.trim();
                if (!message) return;
                props.onAction("request_more_info", message);
                setRequestText("");
              }}><MessageCircle size={16} /> Request more information</button>}
              {["submitted", "acknowledged", "in_progress"].includes(record.status) && <input className="request-info-input" value={requestText} maxLength={3000} onChange={(event) => setRequestText(event.target.value)} placeholder="Message to patient (required above)" />}
              {["submitted", "acknowledged", "in_progress"].includes(record.status) && <button className="clinic-primary wide resolve-action" onClick={() => props.onAction("resolve")}><CheckCheck size={16} /> Mark resolved</button>}
              {["resolved", "closed"].includes(record.status) && <div className="resolved-note"><CheckCheck size={17} /> This case is marked complete.</div>}
              <p className="action-disclaimer">Recording an ambulance request only logs the request for clinic staff. It does not dispatch or contact emergency services.</p>
            </div>
          </section>
          <section className="clinic-panel">
            <div className="panel-heading"><div><h2>Case timeline</h2><p>Recorded case and responder activity</p></div><Clock3 size={18} /></div>
            <div className="timeline">{record.timeline.map((event) => <div className="timeline-event" key={event.id}><span className="timeline-dot" /><div><strong>{pretty(event.event_type)}</strong><p>{event.remarks}</p><small>{event.actor} · {dateTime(event.action_time)}</small></div></div>)}</div>
          </section>
        </aside>
      </div>
    </>
  );
}

function PatientsPage({ patients, loading, search, onSearch }: { patients: Patient[]; loading: boolean; search: string; onSearch: (value: string) => void }) {
  return <>
    <div className="clinic-page-heading"><div><div className="clinic-kicker">PATIENT RECORDS</div><h1>Patients</h1><p>Patients who have submitted an incident report.</p></div><span className="result-count">{patients.length} records</span></div>
    <label className="clinic-search patient-search"><Search size={16} /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search patients by name or email" /></label>
    <section className="clinic-panel table-panel">{loading ? <LoadingLine message="Loading patient records..." /> : <><div className="patient-table-head"><span>Patient</span><span>Phone</span><span>Reports</span><span>Last report</span></div>{patients.map((patient) => <div className="patient-table-row" key={patient.id}><span><strong>{patient.name}</strong><small>{patient.email}</small></span><span>{patient.phone_number || "Not provided"}</span><span>{patient.reports_count}</span><span>{dateTime(patient.last_reported_at)}</span></div>)}{patients.length === 0 && <EmptyState title="No patient records" description="Patient records appear after an incident is submitted." />}</>}</section>
  </>;
}

function TimelinePage({ cases, onOpen }: { cases: CaseRecord[]; onOpen: (record: CaseRecord) => void }) {
  const groups = cases.reduce<Record<string, CaseRecord[]>>((result, item) => {
    const day = new Date(item.created_at).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
    (result[day] ??= []).push(item);
    return result;
  }, {});
  return <>
    <div className="clinic-page-heading"><div><div className="clinic-kicker">RESPONSE ACTIVITY</div><h1>Incident timeline</h1><p>Recent cases arranged by the date they were reported.</p></div><CalendarDays size={23} /></div>
    <div className="timeline-page">{Object.entries(groups).map(([day, items]) => <section key={day} className="clinic-panel"><div className="panel-heading"><h2>{day}</h2><span className="result-count">{items.length} cases</span></div><CaseList cases={items} onOpen={onOpen} compact /></section>)}</div>
    {cases.length === 0 && <EmptyState title="No recent activity" description="Incidents will appear here as they are reported." />}
  </>;
}

function MessagesPage({ cases, onOpen }: { cases: CaseRecord[]; onOpen: (record: CaseRecord) => void }) {
  const withPatients = cases.filter((item) => item.patient);
  return <>
    <div className="clinic-page-heading"><div><div className="clinic-kicker">PATIENT COMMUNICATION</div><h1>Secure messages</h1><p>Open a case to continue its patient conversation.</p></div><MessageCircle size={22} /></div>
    <section className="clinic-panel"><div className="panel-heading"><div><h2>Case conversations</h2><p>Messages stay within the patient’s case record.</p></div></div>{withPatients.length ? <CaseList cases={withPatients} onOpen={onOpen} /> : <EmptyState title="No conversations" description="Patient case conversations appear when reports are submitted." />}</section>
  </>;
}

function ReportsPage({ report, loading }: { report: ReportSummary | null; loading: boolean }) {
  return <>
    <div className="clinic-page-heading"><div><div className="clinic-kicker">CLINIC ACTIVITY</div><h1>Reports</h1><p>Incident summary for the last 30 days.</p></div><ClipboardList size={23} /></div>
    {loading ? <LoadingLine message="Loading clinic reports..." /> : !report ? <EmptyState title="Reports unavailable" description="The clinic report summary could not be loaded. Check the error message above and try again." /> : <>
      <section className="clinic-metrics report-metrics"><Metric label="Total cases" value={report.total} tone="mint" icon={Activity} note={`Since ${new Date(report.period_start).toLocaleDateString()}`} /><Metric label="Urgent cases" value={report.urgent} tone="amber" icon={AlertTriangle} note="Priority incidents" /><Metric label="Resolved" value={report.resolved} tone="blue" icon={CheckCheck} note="Closed or resolved" /><Metric label="Resolution rate" value={`${report.resolution_rate}%`} tone="violet" icon={ArrowDown} note="Resolved share of all cases" /></section>
      <section className="clinic-panel status-report"><div className="panel-heading"><div><h2>Cases by status</h2><p>Last 30 days</p></div></div>{report.by_status.map(({ status, count }) => <div className="status-report-row" key={status}><span>{pretty(status)}</span><div className="report-bar"><i style={{ width: `${report.total ? Math.max(count ? 4 : 0, count / report.total * 100) : 0}%` }} /></div><strong>{count}</strong></div>)}</section>
    </>}
  </>;
}

function ResourcesPage() {
  return <>
    <div className="clinic-page-heading"><div><div className="clinic-kicker">CLINIC REFERENCE</div><h1>Resources</h1><p>Quick reminders for clinic response coordination.</p></div><HeartPulse size={24} /></div>
    <div className="resource-grid">
      <section className="clinic-panel resource-card"><span className="resource-icon"><Ambulance size={20} /></span><h2>Emergency transport</h2><p>Use the case action to document that an ambulance was requested. This app does not place calls or dispatch emergency services.</p></section>
      <section className="clinic-panel resource-card"><span className="resource-icon blue"><MessageCircle size={20} /></span><h2>Patient communication</h2><p>Use secure case messages for relevant follow-up. Keep conversations professional and limited to care coordination.</p></section>
      <section className="clinic-panel resource-card"><span className="resource-icon amber"><Users size={20} /></span><h2>Shared case queue</h2><p>All available clinic responders see incoming cases. Coordinate as a team before acting to prevent duplicated response.</p></section>
      <section className="clinic-panel resource-card"><span className="resource-icon violet"><Shield size={20} /></span><h2>Patient privacy</h2><p>Patient details, clinical notes, and case messages are restricted to authenticated responder accounts and the patient.</p></section>
    </div>
  </>;
}

function SettingsPage({ responder, availability, onAvailability }: {
  responder: Responder; availability: Responder["availability_status"];
  onAvailability: (value: Responder["availability_status"]) => void;
}) {
  return <>
    <div className="clinic-page-heading"><div><div className="clinic-kicker">ACCOUNT PREFERENCES</div><h1>Settings</h1><p>Manage your responder profile and clinic availability.</p></div><Stethoscope size={23} /></div>
    <section className="clinic-panel settings-panel"><div className="panel-heading"><div><h2>Responder profile</h2><p>Profile details are managed by your SAFE administrator.</p></div></div><div className="settings-profile"><span className="profile-avatar large">{responder.name.slice(0, 1).toUpperCase()}</span><div><strong>{responder.name}</strong><small>{responder.department}</small><small>{responder.username} · {responder.email}</small><small>{responder.contact_number}</small></div></div></section>
    <section className="clinic-panel settings-panel"><div className="panel-heading"><div><h2>Availability</h2><p>Available responders receive in-app incident notifications.</p></div></div><div className="availability-options">{(["available", "on_break", "unavailable"] as const).map((value) => <button key={value} className={availability === value ? "active" : ""} onClick={() => onAvailability(value)}><span className={`availability-dot ${value}`} /><span><strong>{pretty(value)}</strong><small>{value === "available" ? "Receive case notifications" : value === "on_break" ? "Temporarily away, still notified" : "Do not include me in new alerts"}</small></span>{availability === value && <Check size={18} />}</button>)}</div></section>
  </>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="clinic-empty"><span><Activity size={21} /></span><strong>{title}</strong><p>{description}</p></div>;
}

function LoadingLine({ message = "Loading clinic data..." }: { message?: string }) {
  return <div className="clinic-loading-line" role="status" aria-live="polite"><LoaderCircle className="spin" size={19} /> {message}</div>;
}

export default ClinicStaffApp;
