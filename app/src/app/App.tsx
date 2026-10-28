import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Activity, AlertOctagon, AlertTriangle, Ambulance, ArrowDown, ArrowLeft, ArrowRight, Battery, Bell, CalendarDays, Check, CheckCheck, CheckCircle, ChevronRight, ClipboardList, Clock, Clock3, CloudSun, Droplets, Heart, HeartPulse, Home, Info, LayoutDashboard, LoaderCircle, LogIn, LogOut, MapPin, Menu, MessageCircle, Mic, MicOff, Phone, Plus, RefreshCw, Search, Send, Settings, Shield, ShieldCheck, Signal, Stethoscope, Thermometer, User, UserPlus, UserRound, Users, Video, VideoOff, Wifi, Wind, X } from "lucide-react";
// @ts-ignore CSS modules are handled by the bundler, not TypeScript.
import "./clinic-staff.css";
import { apiFetch } from "../api";
// App.tsx
type Step = 1 | 2 | 3 | 4 | 5;

function App() {
  const [step, setStep] = useState<Step>(1);
  const [selectedIncident, setSelectedIncident] = useState<IncidentType | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const checkAuthentication = async () => {
      try {
        const csrfResponse = await apiFetch("/api/auth/csrf/", { signal: controller.signal });
        if (!csrfResponse.ok) throw new Error("Could not initialize secure authentication.");
        const response = await apiFetch("/api/auth/me/", { signal: controller.signal });
        const payload = response.ok ? await response.json() : null;
        setCurrentUser(payload?.user ?? null);
      } catch (error) {
        if (!(error instanceof Error && error.name === "AbortError")) {
          setCurrentUser(null);
        }
      } finally {
        if (!controller.signal.aborted) setAuthChecked(true);
      }
    };
    void checkAuthentication();

    return () => controller.abort();
  }, []);

  const handleAuthenticated = (user: AuthenticatedUser) => {
    setCurrentUser(user);
    setAuthChecked(true);
  };

  const handleLogout = async () => {
    const response = await apiFetch("/api/auth/logout/", {
      method: "POST",
    });
    if (!response.ok) throw new Error("Could not sign out. Please try again.");
    setCurrentUser(null);
    handleReset();
  };

  const handleReset = () => {
    setStep(1);
    setSelectedIncident(null);
    setReportData(null);
    setSubmissionError(null);
  };

  const submitReportToBackend = async () => {
    if (!selectedIncident || !reportData) return false;

    setSubmissionError(null);

    try {
      const response = await apiFetch("/api/reports/", {
        method: "POST",
        body: JSON.stringify({
          incident_id: selectedIncident.id,
          incident_label: selectedIncident.label,
          severity: selectedIncident.severity,
          building: reportData.building || "Unknown",
          floor: reportData.floor || "Unknown",
          description: reportData.description || "",
          recording_notice_accepted: reportData.recordingNoticeAccepted,
          audio_enabled: reportData.audioEnabled,
          video_enabled: reportData.videoEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = await response.json();
      console.info("SAFE report saved to backend:", payload);
      setHistoryRefreshKey((key) => key + 1);
      return true;
    } catch (error) {
      console.error("Could not save report to backend:", error);
      setSubmissionError(error instanceof Error ? error.message : "The report could not be saved.");
      return false;
    }
  };

  return (
    <div
      className="size-full flex flex-col overflow-hidden"
      style={{ background: "#080A0F", fontFamily: "Inter, sans-serif" }}
    >
      {!authChecked ? (
        <div className="flex size-full items-center justify-center" style={{ color: "#7A8FAD" }}>
          Checking sign-in...
        </div>
      ) : !currentUser ? (
        <AuthScreen onAuthenticated={handleAuthenticated} />
      ) : currentUser.user_type === "clinic_staff" || currentUser.user_type === "responder" ? (
        <ClinicStaffApp onLogout={handleLogout} />
      ) : (
      <>
      <main
        className="flex-1 min-h-0"
        style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))", boxSizing: "border-box" }}
      >
        <div className="size-full" style={{ display: activeTab === "home" ? "block" : "none" }}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                className="size-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
                <Step1_Trigger onActivate={() => setStep(2)} />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                className="size-full"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <Step2_Incident
                  onSelect={(incident) => {
                    setSelectedIncident(incident);
                    setStep(3);
                  }}
                  onBack={() => setStep(1)}
                />
              </motion.div>
            )}

            {step === 3 && selectedIncident && (
              <motion.div
                key="step3"
                className="size-full"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <Step3_Report
                  incident={selectedIncident}
                  onContinue={(data) => {
                    setReportData(data);
                    setStep(4);
                  }}
                  onBack={() => setStep(2)}
                />
              </motion.div>
            )}

            {step === 4 && selectedIncident && reportData && (
              <motion.div
                key="step4"
                className="size-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Step4_Recording
                  incident={selectedIncident}
                  reportData={reportData}
                  onComplete={async () => {
                    if (await submitReportToBackend()) setStep(5);
                  }}
                />
              </motion.div>
            )}

            {step === 5 && selectedIncident && reportData && (
              <motion.div
                key="step5"
                className="size-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <Step5_Sent
                  incident={selectedIncident}
                  reportData={reportData}
                  onReset={handleReset}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {activeTab === "history" && <ReportHistory refreshKey={historyRefreshKey} />}
        {activeTab === "account" && <AccountTab user={currentUser} onLogout={handleLogout} />}
      </main>
      <AppTabBar activeTab={activeTab} onChange={setActiveTab} />
      {submissionError && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-5"
          style={{ background: "rgba(0,0,0,0.78)" }}
        >
          <section
            role="alertdialog"
            aria-labelledby="submission-error-title"
            aria-describedby="submission-error-description"
            className="w-full max-w-md rounded-2xl p-5"
            style={{ background: "#0E1117", border: "1px solid rgba(239,68,68,0.35)" }}
          >
            <h2 id="submission-error-title" style={{ color: "#FCA5A5", fontSize: "18px", fontWeight: 700 }}>
              Report not saved
            </h2>
            <p id="submission-error-description" className="mt-2 break-words" style={{ color: "#C8D6F0", fontSize: "13px", lineHeight: 1.5 }}>
              {submissionError}. Your report details are still available to retry.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (await submitReportToBackend()) setStep(5);
                }}
                className="rounded-xl px-4 py-3 font-semibold"
                style={{ background: "#B91C1C", color: "#FFFFFF" }}
              >
                Retry submission
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl px-4 py-3"
                style={{ background: "rgba(255,255,255,0.05)", color: "#C8D6F0" }}
              >
                Discard and start over
              </button>
            </div>
          </section>
        </div>
      )}
      </>
      )}
    </div>
  );
}

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
  user_type: string;
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

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  const response = await apiFetch(path, { ...options, headers });
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

function ClinicStaffApp({ onLogout }: { onLogout: () => void }) {
  const [responder, setResponder] = useState<Responder | null>(null);
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState("");
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
      .catch((sessionFailure: unknown) => {
        setSessionError(sessionFailure instanceof Error ? sessionFailure.message : "Could not verify your clinic staff session.");
      })
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

  const logout = async () => {
    try {
      await onLogout();
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
          <h1>Clinic session unavailable</h1>
          <p role="alert">{sessionError || "Your clinic staff session could not be verified."}</p>
          <button className="clinic-primary wide" type="button" onClick={() => void logout()}>
            Return to SAFE APP sign in <ArrowRight size={16} />
          </button>
        </section>
      </main>
    );
  }

  return (
    <div className="clinic-shell">
      <aside className={`clinic-sidebar ${mobileNav ? "open" : ""}`}>
        <a className="clinic-logo" href="/">
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
                  <span><strong>{notice.incident_label}</strong><small>{notice.message}</small><small>Alert #{notice.id} · {pretty(notice.status)} · notice {dateTime(notice.created_at)}</small></span>
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
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const activeCases = (dashboard?.recent_cases ?? []).filter((item) =>
    ["submitted", "acknowledged", "in_progress"].includes(item.status),
  );
  const selectedCase = activeCases.find((item) => item.id === selectedCaseId) ?? activeCases[0] ?? null;
  const capacityPercent = dashboard?.responders_total
    ? Math.min(100, Math.round((dashboard.responders_available / dashboard.responders_total) * 100))
    : 0;

  return (
    <>
      <div className="clinic-page-heading">
        <div><div className="clinic-kicker">RESPONSE OVERVIEW</div><h1>Good day, {responder.name.split(" ")[0]}</h1><p>Here is the latest activity from your clinic response queue.</p></div>
        <button className="clinic-secondary" onClick={onRefresh} disabled={loading}><RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh</button>
      </div>
      {dashboardLoading ? <section className="clinic-panel"><LoadingLine message="Loading dashboard and notifications..." /></section> : <>
      <section className="clinic-metrics clinic-metrics-compact">
        <Metric label="Incoming cases" value={dashboard?.incoming_count ?? "—"} tone="mint" icon={Activity} note="Awaiting clinic response" />
        <Metric label="Active responses" value={dashboard?.active_count ?? "—"} tone="blue" icon={HeartPulse} note="In progress" />
        <Metric label="Urgent cases" value={dashboard?.urgent_open ?? "—"} tone="amber" icon={AlertTriangle} note="Needs prompt attention" />
        <Metric label="Resolved today" value={dashboard?.resolved_today ?? "—"} tone="violet" icon={CheckCheck} note="Completed today" />
      </section>
      <div className="clinic-dashboard-grid">
        <section className="clinic-panel dashboard-queue-panel">
          <div className="panel-heading">
            <div><h2>Incoming cases <span className="dashboard-count">{activeCases.length}</span></h2><p>Shared with the clinic response team</p></div>
            <button className="text-button" onClick={onGoCases}>Full queue <ChevronRight size={15} /></button>
          </div>
          {activeCases.length ? (
            <div className="dashboard-case-list">
              {activeCases.map((record) => (
                <button
                  type="button"
                  key={record.id}
                  className={`dashboard-case-card ${selectedCase?.id === record.id ? "selected" : ""}`}
                  onClick={() => setSelectedCaseId(record.id)}
                  onDoubleClick={() => onOpenCase(record)}
                  aria-pressed={selectedCase?.id === record.id}
                >
                  <span className={`case-symbol ${record.severity.toLowerCase() === "urgent" ? "urgent" : ""}`}><Activity size={17} /></span>
                  <span className="dashboard-case-copy">
                    <strong>{record.incident_label}</strong>
                    <small>{record.building}{record.floor ? ` · ${record.floor}` : ""}</small>
                    <small>{record.patient?.case_reference ?? `Case #${record.id}`} · {dateTime(record.created_at)}</small>
                  </span>
                  <span className={`severity-badge ${record.severity.toLowerCase()}`}>{pretty(record.severity)}</span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="No open cases" description="New incidents assigned to the clinic will appear here." />
          )}
        </section>

        <section className="clinic-panel dashboard-patient-panel">
          {selectedCase ? (
            <>
              <div className="panel-heading dashboard-patient-heading">
                <div><div className="clinic-kicker">PATIENT CASE DETAIL</div><h2>{selectedCase.incident_label}</h2><p>{selectedCase.patient?.case_reference ?? `Case #${selectedCase.id}`} · {selectedCase.building}{selectedCase.floor ? ` · ${selectedCase.floor}` : ""}</p></div>
                <div className="dashboard-case-badges">
                  <span className={`severity-badge ${selectedCase.severity.toLowerCase()}`}>{pretty(selectedCase.severity)}</span>
                  <span className={`status-badge ${selectedCase.status}`}>{pretty(selectedCase.status)}</span>
                </div>
              </div>
              <div className="dashboard-patient-summary">
                <span className="profile-avatar large">{(selectedCase.patient?.name ?? "?").slice(0, 1).toUpperCase()}</span>
                <div><strong>{selectedCase.patient?.name ?? "Unknown patient"}</strong><small>{selectedCase.patient?.account_type ? pretty(selectedCase.patient.account_type) : "Patient"} · reported {dateTime(selectedCase.created_at)}</small></div>
              </div>
              <div className="dashboard-detail-block">
                <div className="dashboard-subheading"><Clock3 size={15} /><strong>Patient timeline</strong></div>
                {selectedCase.timeline.length ? (
                  <div className="dashboard-timeline">
                    {selectedCase.timeline.slice(-4).map((event) => (
                      <div className="dashboard-timeline-event" key={event.id}>
                        <span className="timeline-dot" />
                        <div><strong>{pretty(event.event_type)}</strong><small>{event.remarks || event.actor} · {dateTime(event.action_time)}</small></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="dashboard-timeline">
                    <div className="dashboard-timeline-event"><span className="timeline-dot" /><div><strong>Symptoms submitted</strong><small>{dateTime(selectedCase.created_at)}</small></div></div>
                  </div>
                )}
              </div>
              <div className="dashboard-detail-block dashboard-notes-preview">
                <div className="dashboard-subheading"><Stethoscope size={15} /><strong>Treatment &amp; notes</strong></div>
                {selectedCase.notes ? (
                  <>
                    {selectedCase.notes.diagnosis && <p><b>Assessment:</b> {selectedCase.notes.diagnosis}</p>}
                    {selectedCase.notes.doctor_notes && <p>{selectedCase.notes.doctor_notes}</p>}
                    {Object.entries(selectedCase.notes.vital_signs).length > 0 && (
                      <div className="dashboard-vitals">
                        {Object.entries(selectedCase.notes.vital_signs).slice(0, 4).map(([label, value]) => <div key={label}><small>{pretty(label)}</small><strong>{value}</strong></div>)}
                      </div>
                    )}
                    {selectedCase.notes.actions_taken.length > 0 && <p><b>Actions:</b> {selectedCase.notes.actions_taken.join(" · ")}</p>}
                  </>
                ) : <p className="dashboard-note-empty">No clinical notes have been added to this case yet.</p>}
              </div>
              {selectedCase.description && <p className="dashboard-case-description">{selectedCase.description}</p>}
            </>
          ) : (
            <div className="dashboard-detail-empty"><span><UserRound size={22} /></span><strong>Select an incoming case</strong><p>Patient details and the response timeline will appear here.</p></div>
          )}
        </section>

        <aside className="dashboard-side-column">
          <section className="clinic-panel dashboard-capacity-panel">
            <div className="panel-heading"><div><h2>Clinic capacity</h2><p>Active responder availability</p></div><Users size={18} /></div>
            <div className="dashboard-capacity-value"><strong>{capacityPercent}%</strong><span>available</span></div>
            <div className="coverage-track"><span style={{ width: `${capacityPercent}%` }} /></div>
            <div className="dashboard-staff-counts">
              <div><span className="dashboard-count-icon"><UserRound size={17} /></span><strong>{dashboard?.responders_available ?? "—"}</strong><small>Available</small></div>
              <div><span className="dashboard-count-icon"><Users size={17} /></span><strong>{dashboard?.responders_total ?? "—"}</strong><small>Active responders</small></div>
            </div>
            <p className="coverage-notice"><Shield size={15} /> Cases are shared across the responder team.</p>
          </section>

          <section className="clinic-panel dashboard-responder-panel">
            <div className="panel-heading"><div><h2>Responder profile</h2><p>Clinic staff account</p></div><Stethoscope size={18} /></div>
            <div className="dashboard-responder-identity"><span className="profile-avatar">{responder.name.slice(0, 1).toUpperCase()}</span><div><strong>{responder.name}</strong><small>{responder.department}</small></div></div>
            <dl className="dashboard-responder-details">
              <div><dt>Responder ID</dt><dd>#{responder.user_id}</dd></div>
              <div><dt>Username</dt><dd>{responder.username}</dd></div>
              <div><dt>Contact</dt><dd>{responder.contact_number || "Not provided"}</dd></div>
              <div><dt>Account type</dt><dd>{pretty(responder.user_type)}</dd></div>
            </dl>
            <div className="dashboard-availability"><span className={`availability-dot ${responder.availability_status}`} /> {pretty(responder.availability_status)}</div>
          </section>

          {selectedCase && (
            <section className="clinic-panel dashboard-communication-panel">
              <div className="panel-heading"><div><h2>Communication</h2><p>Contact the patient about this case</p></div><MessageCircle size={18} /></div>
              {selectedCase.patient?.phone_number ? (
                <a className="clinic-primary wide" href={`tel:${selectedCase.patient.phone_number}`}><Phone size={15} /> Call patient</a>
              ) : (
                <button className="clinic-secondary wide" disabled><Phone size={15} /> No phone number</button>
              )}
              <button className="clinic-secondary wide" onClick={() => onOpenCase(selectedCase)}><MessageCircle size={15} /> Open secure case messages</button>
              <button className="clinic-primary wide dashboard-open-case" onClick={() => onOpenCase(selectedCase)}><ChevronRight size={15} /> Open case workspace</button>
            </section>
          )}
        </aside>
      </div>
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

export interface AuthenticatedUser {
  id: number;
  username: string;
  name: string;
  display_name?: string;
  email?: string;
  department?: string;
  contact_number?: string;
  phone_number?: string;
  student_id?: string;
  course?: string;
  account_type?: string;
  user_type: string;
  verification_status?: string;
}

interface AuthScreenProps {
  onAuthenticated: (user: AuthenticatedUser) => void;
}

interface AuthApiPayload {
  detail?: unknown;
  csrf_token?: string;
  user?: AuthenticatedUser;
}

type AuthMode = "login" | "signup";

async function readAuthApiPayload(response: Response): Promise<AuthApiPayload> {
  const responseText = await response.text();
  if (!responseText) return {};

  try {
    const payload: unknown = JSON.parse(responseText);
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      return payload as AuthApiPayload;
    }
  } catch {
    return {};
  }

  return {};
}

function getApiErrorMessage(payload: AuthApiPayload): string | undefined {
  if (typeof payload.detail === "string" && payload.detail.trim()) return payload.detail;
  if (Array.isArray(payload.detail)) {
    const messages = payload.detail.filter((item): item is string => typeof item === "string");
    if (messages.length) return messages.join(" ");
  }
  return undefined;
}

function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [course, setCourse] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [accountType, setAccountType] = useState<"student" | "visitor">("student");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (mode === "login" && !identifier.trim()) {
      setFormError("Enter your email or username.");
      return;
    }
    if (mode === "signup" && (!displayName.trim() || !username.trim() || !email.trim())) {
      setFormError("Enter your name, username, and email address.");
      return;
    }
    if (!password) {
      setFormError("Enter your password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const isSignup = mode === "signup";
      const response = await apiFetch(`/api/auth/${isSignup ? "signup" : "login"}/`, {
        method: "POST",
        body: JSON.stringify(isSignup
          ? {
              display_name: displayName,
              username,
              email,
              student_id: studentId,
              course,
              phone_number: phoneNumber,
              account_type: accountType,
              password,
            }
          : { identifier: identifier.trim(), password }),
      });

      const result = await readAuthApiPayload(response);
      if (!response.ok) {
        const detail = getApiErrorMessage(result);
        if (detail) throw new Error(detail);
        if (response.status >= 500) {
          throw new Error(`Server error (HTTP ${response.status}). Check the Django terminal.`);
        }
        throw new Error(`Unexpected response (HTTP ${response.status}).`);
      }

      if (!result.user) throw new Error("The server did not return a valid user profile.");
      setPassword("");
      onAuthenticated(result.user);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed.";
      setFormError(message === "Failed to fetch"
        ? "Can’t reach the backend server. Check that Django is running at http://127.0.0.1:8000."
        : message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = {
    background: "#0E1117",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#F0F4FF",
  };
  const fieldClass = "rounded-xl px-3 py-3 outline-none";

  return (
    <div className="size-full overflow-y-auto flex items-center justify-center p-4" style={{ background: "#080A0F", color: "#F0F4FF", fontFamily: "Inter, sans-serif" }}>
      <section className="w-full max-w-lg rounded-3xl p-6 sm:p-8" style={{ background: "rgba(14,17,23,0.96)", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 24px 80px rgba(0,0,0,0.32)" }}>
        <header className="mb-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "rgba(220,38,38,0.14)", border: "1px solid rgba(220,38,38,0.3)" }}>
            <ShieldCheck size={24} color="#EF4444" />
          </div>
          <p style={{ color: "#EF4444", fontFamily: "DM Mono, monospace", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em" }}>SAFE RESPONSE NETWORK</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">SAFE APP</h1>
          <p className="mt-1" style={{ color: "#91A0B8", fontSize: "13px" }}>
            {mode === "login"
              ? "Sign in to continue to your SAFE dashboard."
              : "Create a student or visitor account to get started."}
          </p>
        </header>

        <div className="mb-5 grid grid-cols-2 rounded-xl p-1" style={{ background: "#090C12" }} role="tablist" aria-label="Account access">
          {(["login", "signup"] as const).map((choice) => (
            <button
              key={choice}
              type="button"
              role="tab"
              aria-selected={mode === choice}
              onClick={() => { setMode(choice); setFormError(""); }}
              className="rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors"
              style={{ background: mode === choice ? "#17202D" : "transparent", color: mode === choice ? "#F0F4FF" : "#7A8FAD" }}
            >
              {choice === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "signup" ? (
            <>
              <label className="flex flex-col gap-2">
                <span style={{ color: "#AAB8CE", fontSize: "12px", fontWeight: 600 }}>Full name</span>
                <input required maxLength={50} autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" className={fieldClass} style={inputStyle} />
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span style={{ color: "#AAB8CE", fontSize: "12px", fontWeight: 600 }}>Username</span>
                  <input required maxLength={150} autoCapitalize="none" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Choose a username" className={fieldClass} style={inputStyle} />
                </label>
                <label className="flex flex-col gap-2">
                  <span style={{ color: "#AAB8CE", fontSize: "12px", fontWeight: 600 }}>Account type</span>
                  <select value={accountType} onChange={(event) => setAccountType(event.target.value as "student" | "visitor")} className={fieldClass} style={inputStyle}>
                    <option value="student">Student</option>
                    <option value="visitor">Visitor</option>
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-2">
                <span style={{ color: "#AAB8CE", fontSize: "12px", fontWeight: 600 }}>Email address</span>
                <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className={fieldClass} style={inputStyle} />
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span style={{ color: "#AAB8CE", fontSize: "12px", fontWeight: 600 }}>Student ID</span>
                  <input required maxLength={100} value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="Your ID" className={fieldClass} style={inputStyle} />
                </label>
                <label className="flex flex-col gap-2">
                  <span style={{ color: "#AAB8CE", fontSize: "12px", fontWeight: 600 }}>Course</span>
                  <input required maxLength={100} value={course} onChange={(event) => setCourse(event.target.value)} placeholder="Course or program" className={fieldClass} style={inputStyle} />
                </label>
              </div>
              <label className="flex flex-col gap-2">
                <span style={{ color: "#AAB8CE", fontSize: "12px", fontWeight: 600 }}>Phone number</span>
                <input required type="tel" maxLength={20} autoComplete="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="Contact number" className={fieldClass} style={inputStyle} />
              </label>
            </>
          ) : (
            <label className="flex flex-col gap-2">
              <span style={{ color: "#AAB8CE", fontSize: "12px", fontWeight: 600 }}>Email or username</span>
              <input required maxLength={150} autoCapitalize="none" autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="Enter your email or username" className={fieldClass} style={inputStyle} />
            </label>
          )}

          <label className="flex flex-col gap-2">
            <span style={{ color: "#AAB8CE", fontSize: "12px", fontWeight: 600 }}>Password</span>
            <input required type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "login" ? "Your password" : "Create a password"} className={fieldClass} style={inputStyle} />
          </label>

          {formError && (
            <div role="alert" aria-live="polite" className="rounded-xl px-3 py-2.5" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#FCA5A5", fontSize: "12px", lineHeight: 1.5 }}>
              {formError}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="mt-2 flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 font-bold transition-colors disabled:opacity-50" style={{ background: "#15803D", color: "#FFFFFF" }}>
            {mode === "login" ? <LogIn size={17} /> : <UserPlus size={17} />}
            {isSubmitting
              ? mode === "login" ? "Signing in..." : "Creating account..."
              : mode === "login" ? "Sign in to SAFE" : "Create SAFE account"}
            {!isSubmitting && <ArrowRight size={16} />}
          </button>
        </form>

        <div className="mt-6 text-center">
          <span style={{ color: "#4A5F7A", fontSize: "11px" }}>Secure session · Clinic staff sign in with their administrator-provided account</span>
        </div>
      </section>
    </div>
  );
}

// AlertHistory.tsx
interface AlertEntry {
  id: string;
  type: AlertStatus;
  message: string;
  time: string;
  resolved: boolean;
}

const MOCK_ALERTS: AlertEntry[] = [
  { id: "1", type: "emergency", message: "Emergency alert triggered — unit 4B", time: "09:14", resolved: true },
  { id: "2", type: "elevated", message: "Elevated risk threshold exceeded", time: "08:52", resolved: true },
  { id: "3", type: "caution", message: "Mild anomaly detected in vitals", time: "07:30", resolved: true },
  { id: "4", type: "safe", message: "System check passed — all clear", time: "06:00", resolved: true },
  { id: "5", type: "caution", message: "Location outside safe zone", time: "Yesterday 22:11", resolved: true },
];

export function AlertHistory() {
  return (
    <div className="flex flex-col gap-2">
      {MOCK_ALERTS.map((alert) => {
        const config = STATUS_CONFIG[alert.type];
        return (
          <div
            key={alert.id}
            className="flex items-start gap-3 rounded-xl px-3.5 py-3"
            style={{ background: config.bg, border: `1px solid ${config.ring}` }}
          >
            <div className="mt-0.5 shrink-0">
              {alert.type === "emergency" ? (
                <AlertTriangle size={14} style={{ color: config.color }} />
              ) : alert.type === "safe" ? (
                <Check size={14} style={{ color: config.color }} />
              ) : (
                <Info size={14} style={{ color: config.color }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ color: "#C8D6F0", fontFamily: "Inter, sans-serif", fontSize: "13px", lineHeight: 1.4 }}>
                {alert.message}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Clock size={10} style={{ color: "#7A8FAD" }} />
              <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>
                {alert.time}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// AppTabs.tsx
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
  refreshKey: number;
}

export function ReportHistory({ refreshKey }: ReportHistoryProps) {
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
      const response = await apiFetch(path, { signal: controller.signal });
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
  }, [refreshKey, retryCount]);

  const visibleReports = historyView === "mine" ? reports : recentReports;

  useEffect(() => {
    if (messageReportId === null) return;
    const controller = new AbortController();
    setMessageError("");
    const loadMessages = async () => {
      try {
        const response = await apiFetch(`/api/reports/${messageReportId}/messages/`, {
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
  }, [messageReportId]);

  const sendCaseMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (messageReportId === null || !messageDraft.trim()) return;
    setMessageBusy(true);
    setMessageError("");
    try {
      const response = await apiFetch(`/api/reports/${messageReportId}/messages/`, {
        method: "POST",
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
              const description = "description" in report && typeof report.description === "string"
                ? report.description
                : undefined;

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
                  {historyView === "mine" && description && (
                    <p className="mt-2 break-words" style={{ color: "#7A8FAD", fontSize: "12px", lineHeight: 1.5 }}>
                      {description}
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
              <p className="truncate" style={{ color: "#F0F4FF", fontSize: "16px", fontWeight: 700 }}>{user.display_name ?? user.name}</p>
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

// ConfirmationScreen.tsx
interface ConfirmationScreenProps {
  onDismiss: () => void;
  onCancel: () => void;
}

export function ConfirmationScreen({ onDismiss, onCancel }: ConfirmationScreenProps) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(8,13,26,0.96)", backdropFilter: "blur(12px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-sm rounded-3xl p-6 flex flex-col gap-5"
        style={{ background: "#111827", border: "1px solid rgba(239,68,68,0.3)", boxShadow: "0 0 60px rgba(239,68,68,0.2)" }}
        initial={{ scale: 0.85, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <motion.div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.4)" }}
            animate={{ boxShadow: ["0 0 0 0 rgba(239,68,68,0.4)", "0 0 0 16px rgba(239,68,68,0)", "0 0 0 0 rgba(239,68,68,0)"] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <CheckCircle size={32} color="#EF4444" />
          </motion.div>
          <div>
            <h2 style={{ color: "#F0F4FF", fontFamily: "Inter, sans-serif", fontSize: "20px", fontWeight: 700 }}>
              Alert Sent
            </h2>
            <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "11px", marginTop: "4px" }}>
              Emergency services have been notified
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl" style={{ background: "#0D1525" }}>
            <Clock size={14} color="#00D4AA" />
            <div>
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>TIME SENT</p>
              <p style={{ color: "#F0F4FF", fontFamily: "DM Mono, monospace", fontSize: "13px", fontWeight: 500 }}>{timeStr}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl" style={{ background: "#0D1525" }}>
            <MapPin size={14} color="#00D4AA" />
            <div>
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>LOCATION</p>
              <p style={{ color: "#F0F4FF", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500 }}>Memorial Medical Center, FL</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl" style={{ background: "#0D1525" }}>
            <Phone size={14} color="#22C55E" />
            <div>
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>RESPONDERS ALERTED</p>
              <p style={{ color: "#22C55E", fontFamily: "DM Mono, monospace", fontSize: "13px", fontWeight: 500 }}>ETA ~4 min — Unit 7 dispatched</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-98"
            style={{ background: "#EF4444", color: "#fff", fontFamily: "Inter, sans-serif" }}
            onClick={onDismiss}
          >
            I'm aware — close this
          </button>
          <button
            className="w-full py-3 rounded-xl text-sm transition-all active:scale-98 flex items-center justify-center gap-2"
            style={{ background: "rgba(255,255,255,0.06)", color: "#7A8FAD", fontFamily: "Inter, sans-serif", border: "1px solid rgba(255,255,255,0.08)" }}
            onClick={onCancel}
          >
            <X size={14} />
            Cancel alert (false alarm)
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// EmergencyButton.tsx
interface EmergencyButtonProps {
  onActivate: () => void;
  isEmergency: boolean;
  size?: "mobile" | "tablet";
}

export function EmergencyButton({ onActivate, isEmergency, size = "mobile" }: EmergencyButtonProps) {
  const [pressing, setPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timerRef, setTimerRef] = useState<ReturnType<typeof setInterval> | null>(null);

  const buttonSize = size === "tablet" ? 220 : 180;
  const strokeWidth = size === "tablet" ? 6 : 5;
  const radius = (buttonSize - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  const handlePressStart = useCallback(() => {
    if (isEmergency) return;
    setPressing(true);
    let p = 0;
    const interval = setInterval(() => {
      p += 2.5;
      setProgress(Math.min(p, 100));
      if (p >= 100) {
        clearInterval(interval);
        setPressing(false);
        setProgress(0);
        onActivate();
      }
    }, 40);
    setTimerRef(interval);
  }, [isEmergency, onActivate]);

  const handlePressEnd = useCallback(() => {
    if (timerRef) clearInterval(timerRef);
    setTimerRef(null);
    setPressing(false);
    setProgress(0);
  }, [timerRef]);

  const strokeOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative select-none" style={{ width: buttonSize, height: buttonSize }}>
        {/* Outer glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: isEmergency
              ? "radial-gradient(circle, rgba(239,68,68,0.3) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(0,212,170,0.15) 0%, transparent 70%)",
          }}
          animate={isEmergency ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 1.2, repeat: Infinity }}
        />

        {/* SVG progress ring */}
        <svg
          className="absolute inset-0"
          width={buttonSize}
          height={buttonSize}
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx={buttonSize / 2}
            cy={buttonSize / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={buttonSize / 2}
            cy={buttonSize / 2}
            r={radius}
            fill="none"
            stroke={isEmergency ? "#EF4444" : "#00D4AA"}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            style={{ transition: "stroke-dashoffset 0.04s linear" }}
          />
        </svg>

        {/* Main button */}
        <motion.button
          className="absolute rounded-full flex flex-col items-center justify-center cursor-pointer focus:outline-none"
          style={{
            inset: strokeWidth * 2,
            background: isEmergency
              ? "radial-gradient(135deg, #7F1D1D 0%, #450A0A 100%)"
              : pressing
              ? "radial-gradient(135deg, #0D3B33 0%, #064E3B 100%)"
              : "radial-gradient(135deg, #1A3A33 0%, #0F2D27 100%)",
            border: `2px solid ${isEmergency ? "#EF4444" : pressing ? "#00D4AA" : "rgba(0,212,170,0.3)"}`,
            boxShadow: isEmergency
              ? "0 0 40px rgba(239,68,68,0.4), inset 0 1px 0 rgba(255,255,255,0.1)"
              : pressing
              ? "0 0 30px rgba(0,212,170,0.35), inset 0 1px 0 rgba(255,255,255,0.1)"
              : "0 0 20px rgba(0,212,170,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          whileTap={{ scale: 0.97 }}
          aria-label="Emergency alert button — hold to activate"
        >
          <AnimatePresence mode="wait">
            {isEmergency ? (
              <motion.div
                key="emergency"
                className="flex flex-col items-center gap-1"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <motion.div
                  animate={{ rotate: [0, -8, 8, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1.5 }}
                >
                  <AlertTriangle size={size === "tablet" ? 44 : 36} color="#EF4444" />
                </motion.div>
                <span style={{ color: "#EF4444", fontFamily: "DM Mono, monospace", fontSize: size === "tablet" ? "12px" : "10px", fontWeight: 600, letterSpacing: "0.15em" }}>
                  ACTIVE
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                className="flex flex-col items-center gap-2"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <span style={{ color: "#00D4AA", fontFamily: "Inter, sans-serif", fontSize: size === "tablet" ? "13px" : "11px", fontWeight: 700, letterSpacing: "0.12em", textAlign: "center", lineHeight: 1.3 }}>
                  {pressing ? `SENDING...` : "HOLD TO\nALERT"}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "11px", letterSpacing: "0.08em", textAlign: "center" }}>
        {isEmergency ? "Alert sent • Emergency services notified" : pressing ? `${Math.round(progress)}% — keep holding` : "Hold button to send emergency signal"}
      </p>
    </div>
  );
}

// LocationCard.tsx
interface LocationCardProps {
  compact?: boolean;
}

export function LocationCard({ compact = false }: LocationCardProps) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(0,212,170,0.12)" }}
          >
            <MapPin size={14} color="#00D4AA" />
          </div>
          <span style={{ color: "#F0F4FF", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600 }}>
            Location
          </span>
        </div>
        <div className="flex items-center gap-1">
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#22C55E" }}
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span style={{ color: "#22C55E", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>
            LIVE
          </span>
        </div>
      </div>

      <div>
        <p style={{ color: "#F0F4FF", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500 }}>
          Memorial Medical Center
        </p>
        <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "11px", marginTop: "2px" }}>
          1420 NW 12th Ave, Miami FL 33136
        </p>
      </div>

      {!compact && (
        <div
          className="rounded-xl overflow-hidden relative"
          style={{ height: "100px", background: "#0D1525" }}
        >
          <svg width="100%" height="100%" viewBox="0 0 300 100" preserveAspectRatio="xMidYMid slice">
            <rect width="300" height="100" fill="#0D1525" />
            <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <line x1="150" y1="0" x2="150" y2="100" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            {[...Array(6)].map((_, i) => (
              <line key={i} x1={i * 50} y1="0" x2={i * 50} y2="100" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            ))}
            {[...Array(4)].map((_, i) => (
              <line key={i} x1="0" y1={i * 25} x2="300" y2={i * 25} stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            ))}
            <circle cx="150" cy="50" r="8" fill="rgba(0,212,170,0.2)" />
            <circle cx="150" cy="50" r="4" fill="#00D4AA" />
            <circle cx="150" cy="50" r="16" fill="none" stroke="rgba(0,212,170,0.25)" strokeWidth="1" />
            <circle cx="150" cy="50" r="24" fill="none" stroke="rgba(0,212,170,0.1)" strokeWidth="1" />
          </svg>
          <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md" style={{ background: "rgba(0,0,0,0.5)" }}>
            <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "9px" }}>
              25.7617° N, 80.1918° W
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Signal size={12} color="#00D4AA" />
          <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>GPS ±3m</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wifi size={12} color="#0EA5E9" />
          <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>LTE Connected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Battery size={12} color="#22C55E" />
          <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>84%</span>
        </div>
      </div>
    </div>
  );
}

// MobileView.tsx
interface MobileViewProps {
  status: AlertStatus;
  onStatusChange: (s: AlertStatus) => void;
  isEmergency: boolean;
  onEmergency: () => void;
  onCancelEmergency: () => void;
}

type Tab = "home" | "history" | "location" | "settings";

export function MobileView({ status, onStatusChange, isEmergency, onEmergency, onCancelEmergency }: MobileViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [showConfirm, setShowConfirm] = useState(false);

  const handleActivate = () => {
    onEmergency();
    setShowConfirm(true);
  };

  const handleDismissConfirm = () => {
    setShowConfirm(false);
  };

  const handleCancelAlert = () => {
    setShowConfirm(false);
    onCancelEmergency();
  };

  const navItems: { id: Tab; icon: typeof Home; label: string }[] = [
    { id: "home", icon: Home, label: "Home" },
    { id: "history", icon: Clock, label: "History" },
    { id: "location", icon: MapPin, label: "Location" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: "#080D1A", fontFamily: "Inter, sans-serif" }}>
      {/* Top bar */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: "#00D4AA" }} />
            <span style={{ color: "#F0F4FF", fontSize: "16px", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Safe Alert
            </span>
          </div>
          <p style={{ color: "#7A8FAD", fontSize: "11px", fontFamily: "DM Mono, monospace", marginTop: "2px" }}>
            Maya Chen · ID #4821
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} size="sm" />
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center relative"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Bell size={15} color="#7A8FAD" />
            {isEmergency && (
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full" style={{ background: "#EF4444" }} />
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <AnimatePresence mode="wait">
          {activeTab === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col items-center gap-6 pt-4"
            >
              {/* Vitals strip */}
              <div className="w-full grid grid-cols-3 gap-2">
                {[
                  { label: "HEART RATE", value: "72", unit: "bpm", color: "#EF4444" },
                  { label: "OXYGEN", value: "98", unit: "%", color: "#0EA5E9" },
                  { label: "TEMP", value: "98.4", unit: "°F", color: "#F97316" },
                ].map((v) => (
                  <div
                    key={v.label}
                    className="rounded-xl p-3 flex flex-col items-center gap-0.5"
                    style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "9px", letterSpacing: "0.06em" }}>{v.label}</span>
                    <span style={{ color: v.color, fontFamily: "DM Mono, monospace", fontSize: "18px", fontWeight: 600, lineHeight: 1 }}>{v.value}</span>
                    <span style={{ color: "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "9px" }}>{v.unit}</span>
                  </div>
                ))}
              </div>

              {/* Emergency button */}
              <div className="flex flex-col items-center gap-2">
                <EmergencyButton onActivate={handleActivate} isEmergency={isEmergency} size="mobile" />
              </div>

              {/* Status selector */}
              <div className="w-full">
                <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.1em", marginBottom: "10px" }}>
                  SET STATUS
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {(["safe", "caution", "elevated", "emergency"] as AlertStatus[]).map((s) => {
                    const colors = { safe: "#22C55E", caution: "#EAB308", elevated: "#F97316", emergency: "#EF4444" };
                    const labels = { safe: "Safe", caution: "Mild", elevated: "High", emergency: "Alert" };
                    const color = colors[s];
                    const isActive = status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => onStatusChange(s)}
                        className="py-2.5 rounded-xl flex flex-col items-center gap-1 transition-all"
                        style={{
                          background: isActive ? `rgba(${color === "#22C55E" ? "34,197,94" : color === "#EAB308" ? "234,179,8" : color === "#F97316" ? "249,115,22" : "239,68,68"},0.15)` : "rgba(255,255,255,0.04)",
                          border: `1px solid ${isActive ? color : "rgba(255,255,255,0.07)"}`,
                        }}
                      >
                        <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                        <span style={{ color: isActive ? color : "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "9px", fontWeight: isActive ? 600 : 400 }}>
                          {labels[s]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Activity mini card */}
              <div className="w-full rounded-2xl p-4" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Activity size={13} color="#00D4AA" />
                    <span style={{ color: "#F0F4FF", fontSize: "12px", fontWeight: 600 }}>Today's Overview</span>
                  </div>
                  <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>Jun 16</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Alerts", value: "0", sub: "today" },
                    { label: "Status changes", value: "2", sub: "today" },
                    { label: "Uptime", value: "99.8%", sub: "this week" },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col gap-0.5">
                      <span style={{ color: "#F0F4FF", fontFamily: "DM Mono, monospace", fontSize: "16px", fontWeight: 600 }}>{item.value}</span>
                      <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "9px" }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="pt-4"
            >
              <h2 style={{ color: "#F0F4FF", fontSize: "18px", fontWeight: 700, marginBottom: "16px" }}>Alert History</h2>
              <AlertHistory />
            </motion.div>
          )}

          {activeTab === "location" && (
            <motion.div
              key="location"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="pt-4"
            >
              <h2 style={{ color: "#F0F4FF", fontSize: "18px", fontWeight: 700, marginBottom: "16px" }}>Location</h2>
              <LocationCard compact={false} />
              <div className="mt-4">
                <h3 style={{ color: "#F0F4FF", fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>Safety Updates</h3>
                <SafetyUpdates />
              </div>
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="pt-4"
            >
              <h2 style={{ color: "#F0F4FF", fontSize: "18px", fontWeight: 700, marginBottom: "16px" }}>Settings</h2>
              {[
                { label: "Notifications", detail: "Push alerts enabled" },
                { label: "Emergency contacts", detail: "Dr. Sarah Wong, James Chen" },
                { label: "Auto-location sharing", detail: "Always on" },
                { label: "Alert hold duration", detail: "1.5 seconds" },
                { label: "Device ID", detail: "#4821-MC-SAFE" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between px-4 py-3.5 rounded-xl mb-2"
                  style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div>
                    <p style={{ color: "#F0F4FF", fontSize: "13px", fontWeight: 500 }}>{item.label}</p>
                    <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>{item.detail}</p>
                  </div>
                  <div style={{ color: "#4A5F7A", fontSize: "18px" }}>›</div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      <div
        className="px-4 py-3 flex items-center justify-around"
        style={{ background: "#0D1525", borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        {navItems.map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all"
              style={{ background: isActive ? "rgba(0,212,170,0.1)" : "transparent" }}
            >
              <Icon size={18} color={isActive ? "#00D4AA" : "#4A5F7A"} />
              <span style={{ color: isActive ? "#00D4AA" : "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "9px", fontWeight: isActive ? 600 : 400 }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {showConfirm && (
          <ConfirmationScreen onDismiss={handleDismissConfirm} onCancel={handleCancelAlert} />
        )}
      </AnimatePresence>
    </div>
  );
}

// SafetyUpdates.tsx
const updates = [
  {
    icon: ShieldCheck,
    iconColor: "#22C55E",
    iconBg: "rgba(34,197,94,0.12)",
    title: "All systems operational",
    detail: "Emergency response: 4.2 min avg",
    time: "Now",
  },
  {
    icon: CloudSun,
    iconColor: "#0EA5E9",
    iconBg: "rgba(14,165,233,0.12)",
    title: "Weather: Clear skies",
    detail: "Visibility 10+ miles — low risk",
    time: "10 min ago",
  },
  {
    icon: Thermometer,
    iconColor: "#F97316",
    iconBg: "rgba(249,115,22,0.12)",
    title: "Heat advisory in effect",
    detail: "85°F — stay hydrated",
    time: "1 hr ago",
  },
  {
    icon: Wind,
    iconColor: "#A78BFA",
    iconBg: "rgba(167,139,250,0.12)",
    title: "Air quality: Moderate",
    detail: "AQI 68 — acceptable for most",
    time: "2 hr ago",
  },
];

export function SafetyUpdates() {
  return (
    <div className="flex flex-col gap-2">
      {updates.map((item, i) => {
        const Icon = item.icon;
        return (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl px-3.5 py-3"
            style={{ background: "#0D1525", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: item.iconBg }}
            >
              <Icon size={15} color={item.iconColor} />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ color: "#C8D6F0", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500 }}>
                {item.title}
              </p>
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px", marginTop: "1px" }}>
                {item.detail}
              </p>
            </div>
            <span className="shrink-0" style={{ color: "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>
              {item.time}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// StatusBadge.tsx
export type AlertStatus = "safe" | "caution" | "elevated" | "emergency";

interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  ring: string;
  pulse: boolean;
  description: string;
}

export const STATUS_CONFIG: Record<AlertStatus, StatusConfig> = {
  safe: {
    label: "Safe",
    color: "#22C55E",
    bg: "rgba(34,197,94,0.12)",
    ring: "rgba(34,197,94,0.4)",
    pulse: false,
    description: "Normal conditions",
  },
  caution: {
    label: "Caution",
    color: "#EAB308",
    bg: "rgba(234,179,8,0.12)",
    ring: "rgba(234,179,8,0.4)",
    pulse: false,
    description: "Mild risk detected",
  },
  elevated: {
    label: "Elevated",
    color: "#F97316",
    bg: "rgba(249,115,22,0.12)",
    ring: "rgba(249,115,22,0.4)",
    pulse: true,
    description: "High risk — stay alert",
  },
  emergency: {
    label: "EMERGENCY",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.15)",
    ring: "rgba(239,68,68,0.5)",
    pulse: true,
    description: "Alert activated",
  },
};

interface StatusBadgeProps {
  status: AlertStatus;
  size?: "sm" | "md" | "lg";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  const sizeClasses = {
    sm: "px-2 py-0.5 gap-1.5",
    md: "px-3 py-1.5 gap-2",
    lg: "px-4 py-2 gap-2.5",
  };

  const dotSize = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  };

  const textSize = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div
      className={`inline-flex items-center rounded-full ${sizeClasses[size]}`}
      style={{ backgroundColor: config.bg, border: `1px solid ${config.ring}` }}
    >
      <div className="relative flex items-center justify-center">
        <div
          className={`rounded-full ${dotSize[size]}`}
          style={{ backgroundColor: config.color }}
        />
        {config.pulse && (
          <motion.div
            className={`absolute rounded-full ${dotSize[size]}`}
            style={{ backgroundColor: config.color }}
            animate={{ scale: [1, 2.2, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
        )}
      </div>
      <span
        className={`${textSize[size]} font-semibold tracking-wide`}
        style={{ color: config.color, fontFamily: "DM Mono, monospace" }}
      >
        {config.label}
      </span>
    </div>
  );
}

// Step1_Trigger.tsx
interface Step1Props {
  onActivate: () => void;
}

function useTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function Step1_Trigger({ onActivate }: Step1Props) {
  const [pressed, setPressed] = useState(false);
  const [ripples, setRipples] = useState<number[]>([]);
  const now = useTime();

  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const handlePress = () => {
    if (pressed) return;
    setPressed(true);
    setRipples((r) => [...r, Date.now()]);
    setTimeout(() => onActivate(), 900);
  };

  return (
    <div
      className="size-full flex flex-col"
      style={{ background: "#080A0F", fontFamily: "Inter, sans-serif" }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-6 lg:px-10 py-3 lg:py-4"
        style={{ background: "#0A0C12", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)" }}
          >
            <Shield size={18} color="#EF4444" />
          </div>
          <div>
            <p style={{ color: "#EF4444", fontFamily: "DM Mono, monospace", fontSize: "clamp(10px, 1.5vw, 13px)", fontWeight: 600, letterSpacing: "0.12em" }}>
              SAFE
            </p>
            <p style={{ color: "#F0F4FF", fontSize: "clamp(12px, 1.8vw, 16px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>
              Medical-Incident Emergency Alert System
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{ background: "#22C55E" }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span style={{ color: "#22C55E", fontFamily: "DM Mono, monospace", fontSize: "11px", letterSpacing: "0.08em" }}>
            SYSTEM ONLINE
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-visible flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12 px-6 lg:px-16 py-6 lg:py-8">

        {/* LEFT side panel — environment data */}
        <div className="flex w-full flex-col items-stretch gap-4 lg:w-72 lg:gap-5">
          {/* Clock */}
          <div
            className="w-full rounded-2xl lg:rounded-3xl p-4 lg:p-6 flex flex-col gap-1 lg:gap-2"
            style={{ background: "#0E1117", border: "1px solid rgba(255,255,255,0.07)", minWidth: 0 }}
          >
            <div className="flex items-center gap-2">
              <Clock size={12} color="#7A8FAD" />
              <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.1em" }}>LOCAL TIME</span>
            </div>
            <p style={{ color: "#F0F4FF", fontFamily: "DM Mono, monospace", fontSize: "clamp(22px, 4vw, 42px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>
              {timeStr}
            </p>
            <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "clamp(9px, 1.2vw, 12px)" }}>
              {dateStr}
            </p>
          </div>

          {/* Temperature */}
          <div
            className="w-full rounded-2xl lg:rounded-3xl p-4 lg:p-6 flex flex-col gap-3"
            style={{ background: "#0E1117", border: "1px solid rgba(249,115,22,0.2)" }}
          >
            <div className="flex items-center gap-2">
              <Thermometer size={12} color="#F97316" />
              <span style={{ color: "#F97316", fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.1em" }}>TEMPERATURE</span>
            </div>
            <div className="flex items-end gap-2">
              <span style={{ color: "#F97316", fontFamily: "DM Mono, monospace", fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 700, lineHeight: 1 }}>
                88
              </span>
              <span style={{ color: "#F97316", fontFamily: "DM Mono, monospace", fontSize: "clamp(14px, 2vw, 22px)", fontWeight: 400, paddingBottom: "4px" }}>°F</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: "68%", background: "linear-gradient(90deg, #F97316, #EF4444)" }} />
              </div>
              <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>68%</span>
            </div>
          </div>

          {/* Heat index */}
          <div
            className="w-full rounded-2xl lg:rounded-3xl p-4 lg:p-6 flex flex-col gap-3"
            style={{ background: "#0E1117", border: "1px solid rgba(234,179,8,0.2)" }}
          >
            <div className="flex items-center gap-2">
              <Wind size={12} color="#EAB308" />
              <span style={{ color: "#EAB308", fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.1em" }}>HEAT INDEX</span>
            </div>
            <div className="flex items-end gap-2">
              <span style={{ color: "#EAB308", fontFamily: "DM Mono, monospace", fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 700, lineHeight: 1 }}>
                96
              </span>
              <span style={{ color: "#EAB308", fontFamily: "DM Mono, monospace", fontSize: "clamp(14px, 2vw, 22px)", fontWeight: 400, paddingBottom: "4px" }}>°F</span>
            </div>
            <div
              className="flex items-center gap-2 px-2 py-1 rounded-lg"
              style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.2)" }}
            >
              <AlertTriangle size={10} color="#EAB308" />
              <span style={{ color: "#EAB308", fontFamily: "DM Mono, monospace", fontSize: "9px" }}>CAUTION LEVEL</span>
            </div>

            <div className="flex items-center gap-2">
              <Droplets size={10} color="#0EA5E9" />
              <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>Humidity: 72%</span>
            </div>
          </div>
        </div>

        {/* CENTER — Emergency button */}
        <div className="flex flex-col items-center gap-6 lg:gap-8">
          <div className="text-center">
            <h1 style={{ color: "#F0F4FF", fontSize: "clamp(20px, 3.5vw, 40px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              EMERGENCY
            </h1>
            <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "clamp(10px, 1.4vw, 14px)", marginTop: "6px", letterSpacing: "0.06em" }}>
              PRESS ONCE TO ACTIVATE ALERT
            </p>
          </div>

          {/* The big red button */}
          <div className="relative flex items-center justify-center" style={{ width: "clamp(220px, 32vw, 380px)", height: "clamp(220px, 32vw, 380px)" }}>
            {/* Outer pulse rings */}
            {!pressed && (
              <>
                <motion.div
                  className="absolute rounded-full"
                  style={{ inset: "-20px", border: "2px solid rgba(220,38,38,0.15)" }}
                  animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.1, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute rounded-full"
                  style={{ inset: "-40px", border: "1px solid rgba(220,38,38,0.08)" }}
                  animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0.05, 0.3] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                />
              </>
            )}

            {/* Ripple effect on press */}
            <AnimatePresence>
              {ripples.map((key) => (
                <motion.div
                  key={key}
                  className="absolute rounded-full pointer-events-none"
                  style={{ inset: 0, border: "3px solid rgba(220,38,38,0.6)" }}
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  exit={{}}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                />
              ))}
            </AnimatePresence>

            {/* Button */}
            <motion.button
              className="absolute inset-0 rounded-full flex flex-col items-center justify-center cursor-pointer select-none focus:outline-none"
              style={{
                background: pressed
                  ? "radial-gradient(circle at 40% 35%, #991B1B, #450A0A)"
                  : "radial-gradient(circle at 40% 35%, #DC2626, #7F1D1D)",
                boxShadow: pressed
                  ? "0 0 80px rgba(220,38,38,0.6), 0 0 160px rgba(220,38,38,0.25), inset 0 -6px 20px rgba(0,0,0,0.5), inset 0 4px 12px rgba(255,255,255,0.08)"
                  : "0 0 60px rgba(220,38,38,0.5), 0 0 120px rgba(220,38,38,0.2), inset 0 -8px 24px rgba(0,0,0,0.4), inset 0 6px 16px rgba(255,255,255,0.12)",
                border: "4px solid rgba(239,68,68,0.5)",
              }}
              onClick={handlePress}
              whileTap={{ scale: 0.96 }}
              animate={pressed ? {} : { boxShadow: ["0 0 60px rgba(220,38,38,0.5), 0 0 120px rgba(220,38,38,0.2)", "0 0 80px rgba(220,38,38,0.7), 0 0 160px rgba(220,38,38,0.3)", "0 0 60px rgba(220,38,38,0.5), 0 0 120px rgba(220,38,38,0.2)"] }}
              transition={pressed ? {} : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
              aria-label="Emergency alert — press once to activate"
            >
              <motion.div
                className="flex flex-col items-center gap-2"
                animate={pressed ? { scale: 0.9, opacity: 0.7 } : {}}
              >
                <AlertTriangle
                  style={{ width: "clamp(36px, 6vw, 72px)", height: "clamp(36px, 6vw, 72px)" }}
                  color="rgba(255,255,255,0.95)"
                  strokeWidth={2}
                />
                <span style={{
                  color: "rgba(255,255,255,0.95)",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "clamp(14px, 2.5vw, 24px)",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  textAlign: "center",
                  lineHeight: 1.2,
                }}>
                  {pressed ? "ACTIVATING..." : "EMERGENCY"}
                </span>
              </motion.div>
            </motion.button>
          </div>

          <p style={{ color: "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "clamp(9px, 1.2vw, 11px)", textAlign: "center", letterSpacing: "0.08em", maxWidth: "280px" }}>
            ONE PRESS ACTIVATES EMERGENCY PROTOCOL · ALL SESSIONS ARE LOGGED
          </p>
        </div>

        {/* RIGHT side panel — facility info */}
        <div className="hidden lg:flex flex-col gap-4 lg:gap-5">
          <div
            className="rounded-3xl p-6 flex flex-col gap-3"
            style={{ background: "#0E1117", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.1em" }}>
              FACILITY
            </span>
            <div>
              <p style={{ color: "#F0F4FF", fontSize: "16px", fontWeight: 700 }}>Manila Central</p>
              <p style={{ color: "#F0F4FF", fontSize: "14px", fontWeight: 500 }}>High School Campus</p>
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "11px", marginTop: "4px" }}>Building C — Main Hall</p>
            </div>
            <div className="flex flex-col gap-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                { label: "RESPONDERS ON DUTY", value: "4" },
                { label: "CLINIC STATUS", value: "OPEN" },
                { label: "RESPONSE AVG", value: "3.2 min" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span style={{ color: "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "9px", letterSpacing: "0.08em" }}>{item.label}</span>
                  <span style={{ color: "#C8D6F0", fontFamily: "DM Mono, monospace", fontSize: "11px", fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-3xl p-6 flex flex-col gap-3"
            style={{ background: "#0E1117", border: "1px solid rgba(14,165,233,0.15)" }}
          >
            <span style={{ color: "#0EA5E9", fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.1em" }}>
              QUICK CONTACTS
            </span>
            {[
              { name: "School Nurse", ext: "loc. 101" },
              { name: "Security Office", ext: "loc. 105" },
              { name: "Admin Office", ext: "loc. 100" },
            ].map((c) => (
              <div key={c.name} className="flex items-center justify-between">
                <span style={{ color: "#C8D6F0", fontSize: "13px" }}>{c.name}</span>
                <span style={{ color: "#0EA5E9", fontFamily: "DM Mono, monospace", fontSize: "11px" }}>{c.ext}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Step2_Incident.tsx
export interface IncidentType {
  id: string;
  label: string;
  signs: string;
  severity: "urgent" | "minor";
}

interface IncidentTypeResponse {
  code: string;
  incident_name: string;
  priority_level: "urgent" | "minor";
  guidance: string;
}

interface Step2Props {
  onSelect: (incident: IncidentType) => void;
  onBack: () => void;
}

export function Step2_Incident({ onSelect, onBack }: Step2Props) {
  const [tab, setTab] = useState<"urgent" | "minor">("urgent");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<IncidentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const loadIncidentTypes = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await apiFetch("/api/incident-types/");
      if (!response.ok) throw new Error(`Could not load incident types (HTTP ${response.status}).`);
      const types = await response.json() as IncidentTypeResponse[];
      if (!Array.isArray(types)) throw new Error("The server returned an invalid incident type list.");
      setIncidents(types.map((type) => ({
        id: type.code,
        label: type.incident_name,
        signs: type.guidance,
        severity: type.priority_level,
      })));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load incident types.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void loadIncidentTypes();
  }, []);

  const list = incidents.filter((incident) => incident.severity === tab);
  const urgentCount = incidents.filter((incident) => incident.severity === "urgent").length;
  const minorCount = incidents.filter((incident) => incident.severity === "minor").length;

  return (
    <div
      className="size-full flex flex-col"
      style={{ background: "#080A0F", fontFamily: "Inter, sans-serif" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-4 px-6 lg:px-10 py-4"
        style={{ background: "#0A0C12", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#7A8FAD" }}
        >
          <ArrowLeft size={15} />
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: "11px" }}>Back</span>
        </button>
        <div>
          <p style={{ color: "#EF4444", fontFamily: "DM Mono, monospace", fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em" }}>
            STEP 1 OF 4
          </p>
          <h2 style={{ color: "#F0F4FF", fontSize: "clamp(14px, 2vw, 20px)", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Select the Type of Medical Incident
          </h2>
        </div>
        {/* Progress */}
        <div className="ml-auto flex items-center gap-2">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="rounded-full"
              style={{
                width: n === 1 ? "24px" : "8px",
                height: "8px",
                background: n === 1 ? "#EF4444" : "rgba(255,255,255,0.12)",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>
      </div>

      {/* Tab toggle */}
      <div className="px-6 lg:px-10 pt-4 pb-3">
        <div
          className="inline-flex p-1 rounded-2xl gap-1"
          style={{ background: "#0E1117", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <button
            onClick={() => setTab("urgent")}
            className="flex items-center gap-2 px-4 lg:px-6 py-2.5 rounded-xl transition-all"
            style={{
              background: tab === "urgent" ? "rgba(239,68,68,0.15)" : "transparent",
              border: tab === "urgent" ? "1px solid rgba(239,68,68,0.35)" : "1px solid transparent",
              color: tab === "urgent" ? "#EF4444" : "#7A8FAD",
            }}
          >
            <AlertTriangle size={14} />
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "12px", fontWeight: tab === "urgent" ? 600 : 400 }}>
              URGENT / EMERGENCY
            </span>
            <span
              className="px-1.5 py-0.5 rounded-md"
              style={{ background: tab === "urgent" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)", fontSize: "10px", fontFamily: "DM Mono, monospace" }}
            >
              {urgentCount}
            </span>
          </button>
          <button
            onClick={() => setTab("minor")}
            className="flex items-center gap-2 px-4 lg:px-6 py-2.5 rounded-xl transition-all"
            style={{
              background: tab === "minor" ? "rgba(34,197,94,0.12)" : "transparent",
              border: tab === "minor" ? "1px solid rgba(34,197,94,0.3)" : "1px solid transparent",
              color: tab === "minor" ? "#22C55E" : "#7A8FAD",
            }}
          >
            <Stethoscope size={14} />
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "12px", fontWeight: tab === "minor" ? 600 : 400 }}>
              MINOR INCIDENT
            </span>
            <span
              className="px-1.5 py-0.5 rounded-md"
              style={{ background: tab === "minor" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)", fontSize: "10px", fontFamily: "DM Mono, monospace" }}
            >
              {minorCount}
            </span>
          </button>
        </div>

        {tab === "urgent" && (
          <p style={{ color: "#EF4444", fontFamily: "DM Mono, monospace", fontSize: "10px", marginTop: "10px", letterSpacing: "0.08em" }}>
            ⚡ THESE CONDITIONS REQUIRE IMMEDIATE EMERGENCY RESPONSE
          </p>
        )}
        {tab === "minor" && (
          <p style={{ color: "#22C55E", fontFamily: "DM Mono, monospace", fontSize: "10px", marginTop: "10px", letterSpacing: "0.08em" }}>
            ✓ THESE INCIDENTS REQUIRE CLINIC ASSESSMENT AND BASIC FIRST AID
          </p>
        )}
      </div>

      {/* Incident grid */}
      <div className="flex-1 overflow-y-auto px-6 lg:px-10 pb-6">
        {loadError ? (
          <div role="alert" className="rounded-2xl p-5" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#F0F4FF" }}>
            <p>{loadError}</p>
            <button onClick={() => void loadIncidentTypes()} className="mt-3 rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.08)", color: "#F0F4FF" }}>Try again</button>
          </div>
        ) : loading ? (
          <p role="status" style={{ color: "#7A8FAD" }}>Loading incident types...</p>
        ) : list.length === 0 ? (
          <p style={{ color: "#7A8FAD" }}>No {tab} incident types are currently available.</p>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {list.map((incident, i) => {
            const isUrgent = incident.severity === "urgent";
            const accentColor = isUrgent ? "#EF4444" : "#22C55E";
            const accentBg = isUrgent ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.07)";
            const accentBorder = isUrgent ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.2)";
            const isHovered = hoveredId === incident.id;

            return (
              <motion.button
                key={incident.id}
                className="flex items-center gap-4 rounded-2xl text-left w-full transition-all"
                style={{
                  background: isHovered ? accentBg : "#0E1117",
                  border: `1px solid ${isHovered ? accentColor : "rgba(255,255,255,0.07)"}`,
                  padding: "16px 20px",
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onMouseEnter={() => setHoveredId(incident.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelect(incident)}
              >
                {/* Number badge */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: isHovered ? accentBg : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isHovered ? accentBorder : "rgba(255,255,255,0.07)"}`,
                  }}
                >
                  <span style={{ color: isHovered ? accentColor : "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "12px", fontWeight: 700 }}>
                    {i + 1}
                  </span>
                </div>

                {/* Labels */}
                <div className="flex-1 min-w-0">
                  <p style={{ color: "#F0F4FF", fontSize: "14px", fontWeight: 600, lineHeight: 1.3 }}>
                    {incident.label}
                  </p>
                  <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px", marginTop: "3px", lineHeight: 1.4 }}>
                    {incident.signs}
                  </p>
                </div>

                <ChevronRight size={16} color={isHovered ? accentColor : "#2A3A52"} className="shrink-0 transition-colors" />
              </motion.button>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}

// Step3_Report.tsx
interface Step3Props {
  incident: IncidentType;
  onContinue: (data: ReportData) => void;
  onBack: () => void;
}

export interface ReportData {
  incidentId: string;
  incidentLabel: string;
  severity: "urgent" | "minor";
  building: string;
  floor: string;
  description: string;
  recordingNoticeAccepted: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

export function Step3_Report({ incident, onContinue, onBack }: Step3Props) {
  const [accepted, setAccepted] = useState(false);
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [description, setDescription] = useState("");
  const isUrgent = incident.severity === "urgent";
  const accentColor = isUrgent ? "#EF4444" : "#22C55E";

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const handleContinue = () => {
    if (!accepted) return;

    onContinue({
      incidentId: incident.id,
      incidentLabel: incident.label,
      severity: incident.severity,
      building,
      floor,
      description,
      recordingNoticeAccepted: true,
      audioEnabled: true,
      videoEnabled: true,
    });
  };

  return (
    <div
      className="size-full flex flex-col"
      style={{ background: "#080A0F", fontFamily: "Inter, sans-serif" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-4 px-6 lg:px-10 py-4"
        style={{ background: "#0A0C12", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#7A8FAD" }}
        >
          <ArrowLeft size={15} />
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: "11px" }}>Back</span>
        </button>
        <div>
          <p style={{ color: accentColor, fontFamily: "DM Mono, monospace", fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em" }}>
            STEP 2 OF 4
          </p>
          <h2 style={{ color: "#F0F4FF", fontSize: "clamp(14px, 2vw, 20px)", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Recording Notice
          </h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="rounded-full"
              style={{
                width: n <= 2 ? "24px" : "8px",
                height: "8px",
                background: n <= 2 ? accentColor : "rgba(255,255,255,0.12)",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>
      </div>

      {/* Content — centered single column */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center px-6 lg:px-10 py-8">
        <div className="w-full max-w-xl flex flex-col gap-5">

          {/* Incident badge */}
          <div
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{
              background: isUrgent ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.07)",
              border: `1px solid ${isUrgent ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.25)"}`,
            }}
          >
            <AlertTriangle size={18} color={accentColor} className="shrink-0 mt-0.5" />
            <div>
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.08em" }}>
                SELECTED INCIDENT
              </p>
              <p style={{ color: "#F0F4FF", fontSize: "15px", fontWeight: 700, marginTop: "3px" }}>
                {incident.label}
              </p>
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px", marginTop: "3px", lineHeight: 1.5 }}>
                {incident.signs}
              </p>
            </div>
          </div>

          {/* Recording notice card */}
          <div
            className="rounded-2xl p-6 flex flex-col gap-5"
            style={{ background: "#0E1117", border: "1px solid rgba(234,179,8,0.25)" }}
          >
            <div className="flex items-center gap-3">
              <motion.div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.3)" }}
                animate={{ boxShadow: ["0 0 0 0 rgba(234,179,8,0.3)", "0 0 0 10px rgba(234,179,8,0)", "0 0 0 0 rgba(234,179,8,0)"] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Video size={22} color="#EAB308" />
              </motion.div>
              <div>
                <p style={{ color: "#EAB308", fontFamily: "DM Mono, monospace", fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em" }}>
                  ⚠ RECORDING NOTICE
                </p>
                <p style={{ color: "#F0F4FF", fontSize: "15px", fontWeight: 700 }}>
                  You are about to be recorded
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {[
                "Your audio and video will be captured for this emergency report.",
                "This recording will be immediately transmitted to the school emergency response team.",
                "All recordings are securely stored and accessible only to authorized personnel.",
                "This session is logged with your timestamp, incident type, and device information.",
                "False or frivolous reports may result in disciplinary action.",
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: "#EAB308" }} />
                  <p style={{ color: "#C8D6F0", fontSize: "13px", lineHeight: 1.6 }}>{text}</p>
                </div>
              ))}
            </div>

            {/* Timestamp */}
            <div
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <Clock size={13} color="#7A8FAD" />
              <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>
                Report initiated: {timeStr} · {dateStr}
              </span>
            </div>

            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
              style={{ color: "#C8D6F0" }}
            >
              <label className="flex flex-col gap-2 text-left">
                <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>BUILDING</span>
                <input
                  value={building}
                  onChange={(event) => setBuilding(event.target.value)}
                  placeholder="Main Hall"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F0F4FF", padding: "10px 12px", borderRadius: "12px" }}
                />
              </label>
              <label className="flex flex-col gap-2 text-left">
                <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>FLOOR / ROOM</span>
                <input
                  value={floor}
                  onChange={(event) => setFloor(event.target.value)}
                  placeholder="2nd Floor / 204"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F0F4FF", padding: "10px 12px", borderRadius: "12px" }}
                />
              </label>
            </div>

            <label className="flex flex-col gap-2 text-left">
              <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>DETAILS</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe what happened, the condition of the student, and any actions already taken."
                rows={4}
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F0F4FF", padding: "12px", borderRadius: "12px", resize: "vertical" }}
              />
            </label>

            {/* Acknowledgment checkbox */}
            <button
              className="flex items-start gap-3 text-left"
              onClick={() => setAccepted(!accepted)}
            >
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background: accepted ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.04)",
                  border: `2px solid ${accepted ? "#EF4444" : "rgba(255,255,255,0.15)"}`,
                  transition: "all 0.2s",
                }}
              >
                {accepted && (
                  <span style={{ color: "#EF4444", fontSize: "11px", fontWeight: 700 }}>✓</span>
                )}
              </div>
              <p style={{ color: "#C8D6F0", fontSize: "13px", lineHeight: 1.6 }}>
                I understand and acknowledge that this emergency report will be recorded, logged, and transmitted to school authorities.
              </p>
            </button>
          </div>

          {/* Continue button */}
          <motion.button
            onClick={handleContinue}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all"
            style={{
              background: accepted
                ? isUrgent
                  ? "linear-gradient(135deg, #DC2626, #7F1D1D)"
                  : "linear-gradient(135deg, #16A34A, #14532D)"
                : "rgba(255,255,255,0.05)",
              border: `1px solid ${accepted ? accentColor : "rgba(255,255,255,0.07)"}`,
              cursor: accepted ? "pointer" : "not-allowed",
              opacity: accepted ? 1 : 0.5,
            }}
            whileTap={accepted ? { scale: 0.98 } : {}}
          >
            <Video size={18} color={accepted ? "#fff" : "#4A5F7A"} />
            <span style={{ color: accepted ? "#fff" : "#4A5F7A", fontSize: "15px", fontWeight: 700, letterSpacing: "0.04em" }}>
              START RECORDING
            </span>
          </motion.button>

          {!accepted && (
            <p style={{ color: "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "10px", textAlign: "center" }}>
              Accept the recording notice above to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Step4_Recording.tsx
interface Step4Props {
  incident: IncidentType;
  reportData: ReportData;
  onComplete: () => void;
}

const TOTAL_SECONDS = 25;

export function Step4_Recording({ incident, reportData, onComplete }: Step4Props) {
  const [phase, setPhase] = useState<"countdown" | "recording" | "sending" | "done">("countdown");
  const [countdownVal, setCountdownVal] = useState(3);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioActive, setAudioActive] = useState(true);
  const [videoActive, setVideoActive] = useState(true);
  const [waveform, setWaveform] = useState<number[]>(Array(32).fill(4));
  const waveformRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isUrgent = incident.severity === "urgent";
  const accentColor = isUrgent ? "#EF4444" : "#22C55E";

  // Countdown 3…2…1
  useEffect(() => {
    if (phase !== "countdown") return;
    const id = setInterval(() => {
      setCountdownVal((v) => {
        if (v <= 1) {
          clearInterval(id);
          setPhase("recording");
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Recording timer
  useEffect(() => {
    if (phase !== "recording") return;
    const id = setInterval(() => {
      setRecordSeconds((s) => {
        if (s >= TOTAL_SECONDS) {
          clearInterval(id);
          setPhase("sending");
          setTimeout(() => setPhase("done"), 2500);
          return s;
        }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Waveform animation
  useEffect(() => {
    if (phase !== "recording") {
      if (waveformRef.current) clearInterval(waveformRef.current);
      return;
    }
    waveformRef.current = setInterval(() => {
      setWaveform(Array.from({ length: 32 }, () =>
        audioActive ? Math.floor(Math.random() * 36) + 4 : 4
      ));
    }, 80);
    return () => { if (waveformRef.current) clearInterval(waveformRef.current); };
  }, [phase, audioActive]);

  const progress = recordSeconds / TOTAL_SECONDS;
  const remaining = TOTAL_SECONDS - recordSeconds;

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div
      className="size-full flex flex-col items-center justify-center"
      style={{ background: "#080A0F", fontFamily: "Inter, sans-serif" }}
    >
      <AnimatePresence mode="wait">

        {/* COUNTDOWN */}
        {phase === "countdown" && (
          <motion.div
            key="countdown"
            className="flex flex-col items-center gap-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
          >
            <div className="flex items-center gap-3">
              <motion.div
                className="w-3 h-3 rounded-full"
                style={{ background: "#EF4444" }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              />
              <span style={{ color: "#EF4444", fontFamily: "DM Mono, monospace", fontSize: "14px", letterSpacing: "0.15em" }}>
                RECORDING STARTS IN
              </span>
            </div>
            <motion.div
              key={countdownVal}
              style={{ color: "#F0F4FF", fontFamily: "DM Mono, monospace", fontSize: "clamp(80px, 18vw, 180px)", fontWeight: 800, lineHeight: 1 }}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {countdownVal}
            </motion.div>
            <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "12px" }}>
              Stay calm — speak clearly about the situation
            </p>
          </motion.div>
        )}

        {/* RECORDING */}
        {phase === "recording" && (
          <motion.div
            key="recording"
            className="w-full max-w-2xl px-6 flex flex-col items-center gap-6 lg:gap-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <motion.div
                className="w-4 h-4 rounded-full"
                style={{ background: "#EF4444" }}
                animate={{ opacity: [1, 0.2, 1], scale: [1, 1.15, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <span style={{ color: "#EF4444", fontFamily: "DM Mono, monospace", fontSize: "clamp(14px, 2vw, 18px)", fontWeight: 700, letterSpacing: "0.1em" }}>
                RECORDING IN PROGRESS
              </span>
            </div>

            {/* Incident badge */}
            <div
              className="px-4 py-2 rounded-xl"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}
            >
              <p style={{ color: "#C8D6F0", fontFamily: "DM Mono, monospace", fontSize: "11px", textAlign: "center" }}>
                <span style={{ color: "#EF4444" }}>●</span> {incident.label} · {reportData.building}, {reportData.floor}
              </p>
            </div>

            {/* Timer ring */}
            <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
              <svg width={180} height={180} style={{ transform: "rotate(-90deg)", position: "absolute" }}>
                <circle cx={90} cy={90} r={82} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
                <motion.circle
                  cx={90}
                  cy={90}
                  r={82}
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 82}
                  strokeDashoffset={(1 - progress) * 2 * Math.PI * 82}
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <div className="flex flex-col items-center gap-1 z-10">
                <span style={{ color: "#F0F4FF", fontFamily: "DM Mono, monospace", fontSize: "40px", fontWeight: 800, lineHeight: 1 }}>
                  {formatTime(recordSeconds)}
                </span>
                <span style={{ color: "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "11px" }}>
                  {remaining}s remaining
                </span>
              </div>
            </div>

            {/* Waveform */}
            <div className="w-full flex items-center justify-center gap-0.5" style={{ height: 56 }}>
              {waveform.map((h, i) => (
                <motion.div
                  key={i}
                  className="rounded-full"
                  style={{ width: 3, background: audioActive ? "#EF4444" : "#2A3A52" }}
                  animate={{ height: h }}
                  transition={{ duration: 0.08 }}
                />
              ))}
            </div>

            {/* Guidance prompt */}
            <div
              className="w-full rounded-2xl p-4"
              style={{ background: "#0E1117", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.08em", marginBottom: "8px" }}>
                PLEASE DESCRIBE THE FOLLOWING:
              </p>
              {[
                "Where exactly you are on campus right now",
                "What you are observing — describe the symptoms or situation",
                "How many people are affected",
                "Any actions already taken (first aid, CPR, etc.)",
              ].map((prompt, i) => (
                <div key={i} className="flex items-start gap-2.5 mb-2">
                  <span style={{ color: "#EF4444", fontFamily: "DM Mono, monospace", fontSize: "11px", minWidth: "16px" }}>{i + 1}.</span>
                  <p style={{ color: "#C8D6F0", fontSize: "13px", lineHeight: 1.5 }}>{prompt}</p>
                </div>
              ))}
            </div>

            {/* Media toggles */}
            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all"
                style={{
                  background: audioActive ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${audioActive ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.08)"}`,
                }}
                onClick={() => setAudioActive(!audioActive)}
              >
                {audioActive ? <Mic size={14} color="#EF4444" /> : <MicOff size={14} color="#4A5F7A" />}
                <span style={{ color: audioActive ? "#EF4444" : "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "11px" }}>
                  {audioActive ? "MIC ON" : "MIC OFF"}
                </span>
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all"
                style={{
                  background: videoActive ? "rgba(14,165,233,0.1)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${videoActive ? "rgba(14,165,233,0.3)" : "rgba(255,255,255,0.08)"}`,
                }}
                onClick={() => setVideoActive(!videoActive)}
              >
                {videoActive ? <Video size={14} color="#0EA5E9" /> : <VideoOff size={14} color="#4A5F7A" />}
                <span style={{ color: videoActive ? "#0EA5E9" : "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "11px" }}>
                  {videoActive ? "CAM ON" : "CAM OFF"}
                </span>
              </button>
              <div className="flex items-center gap-2 px-3 py-2.5">
                <Clock size={12} color="#7A8FAD" />
                <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "11px" }}>
                  {formatTime(recordSeconds)} / {formatTime(TOTAL_SECONDS)}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* SENDING */}
        {phase === "sending" && (
          <motion.div
            key="sending"
            className="flex flex-col items-center gap-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.4)" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            >
              <Send size={28} color="#EF4444" />
            </motion.div>
            <div className="text-center">
              <p style={{ color: "#EF4444", fontFamily: "DM Mono, monospace", fontSize: "16px", fontWeight: 700, letterSpacing: "0.1em" }}>
                TRANSMITTING REPORT...
              </p>
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "12px", marginTop: "6px" }}>
                Sending to emergency response team
              </p>
            </div>
          </motion.div>
        )}

        {/* DONE — auto-transition */}
        {phase === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onAnimationComplete={() => setTimeout(onComplete, 400)}
          />
        )}

      </AnimatePresence>
    </div>
  );
}

// Step5_Sent.tsx
interface Step5Props {
  incident: IncidentType;
  reportData: ReportData;
  onReset: () => void;
}

function ElapsedTimer({ startTime }: { startTime: Date }) {
  const now = useTime();
  const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
  const min = Math.floor(elapsed / 60);
  const sec = elapsed % 60;
  return <>{min > 0 ? `${min}m ` : ""}{sec}s ago</>;
}

const URGENT_STEPS = [
  { icon: Shield, color: "#EF4444", bg: "rgba(239,68,68,0.12)", title: "Do NOT move the person", detail: "Unless there is immediate danger (fire, structural collapse). Keep them still and calm." },
  { icon: Heart, color: "#F97316", bg: "rgba(249,115,22,0.12)", title: "Check breathing & pulse", detail: "If unresponsive and not breathing normally, begin CPR if you are trained. Call out for an AED." },
  { icon: Users, color: "#0EA5E9", bg: "rgba(14,165,233,0.12)", title: "Clear the area", detail: "Ask bystanders to step back and give space. Only trained persons should assist." },
  { icon: Phone, color: "#22C55E", bg: "rgba(34,197,94,0.12)", title: "Stay on the line", detail: "A responder may call you back for live guidance. Keep your phone accessible and volume up." },
  { icon: Clock, color: "#A78BFA", bg: "rgba(167,139,250,0.12)", title: "Wait for responders", detail: "School emergency team has been dispatched. Average response time is 3–5 minutes." },
];

const MINOR_STEPS = [
  { icon: Shield, color: "#22C55E", bg: "rgba(34,197,94,0.12)", title: "Escort to the clinic", detail: "If the student can walk, bring them to the school clinic for assessment." },
  { icon: Heart, color: "#0EA5E9", bg: "rgba(14,165,233,0.12)", title: "Keep them comfortable", detail: "Have them sit or lie down in a safe location while waiting." },
  { icon: Users, color: "#EAB308", bg: "rgba(234,179,8,0.12)", title: "Monitor the situation", detail: "Watch for any worsening symptoms. If condition deteriorates, alert again immediately." },
  { icon: Phone, color: "#A78BFA", bg: "rgba(167,139,250,0.12)", title: "Notify a teacher or staff", detail: "Inform the nearest adult or faculty member about the incident." },
  { icon: Clock, color: "#00D4AA", bg: "rgba(0,212,170,0.12)", title: "Wait for the nurse", detail: "School health staff has been notified and will respond shortly." },
];

export function Step5_Sent({ incident, reportData, onReset }: Step5Props) {
  const [sentTime] = useState(new Date());
  const isUrgent = incident.severity === "urgent";
  const steps = isUrgent ? URGENT_STEPS : MINOR_STEPS;
  const accentColor = isUrgent ? "#EF4444" : "#22C55E";
  const accentBg = isUrgent ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.08)";
  const etaMin = isUrgent ? "3–5" : "5–10";

  const sentTimeStr = sentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

  return (
    <div
      className="size-full flex flex-col"
      style={{ background: "#080A0F", fontFamily: "Inter, sans-serif" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-4 px-6 lg:px-10 py-4"
        style={{ background: "#0A0C12", borderBottom: `1px solid ${accentColor}22` }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: accentBg, border: `1px solid ${accentColor}55` }}
            animate={{ boxShadow: [`0 0 0 0 ${accentColor}44`, `0 0 0 12px ${accentColor}00`, `0 0 0 0 ${accentColor}00`] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <CheckCircle size={20} color={accentColor} />
          </motion.div>
          <div>
            <p style={{ color: accentColor, fontFamily: "DM Mono, monospace", fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em" }}>
              REPORT TRANSMITTED
            </p>
            <h2 style={{ color: "#F0F4FF", fontSize: "clamp(14px, 2vw, 18px)", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Emergency Alert Sent — Help Is On the Way
            </h2>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="rounded-full"
              style={{ width: "24px", height: "8px", background: accentColor }}
            />
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT — Confirmation card */}
          <div className="flex flex-col gap-4 lg:col-span-1">
            {/* Status card */}
            <motion.div
              className="rounded-2xl p-5 flex flex-col gap-4"
              style={{ background: accentBg, border: `1px solid ${accentColor}44` }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-col items-center gap-3 text-center py-2">
                <motion.div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: `${accentColor}22`, border: `2px solid ${accentColor}55` }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <CheckCircle size={32} color={accentColor} />
                </motion.div>
                <div>
                  <p style={{ color: "#F0F4FF", fontSize: "18px", fontWeight: 800 }}>Alert Delivered</p>
                  <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "11px", marginTop: "4px" }}>
                    Confirmed at {sentTimeStr}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                {[
                  { label: "INCIDENT TYPE", value: incident.label, icon: AlertTriangle, color: accentColor },
                  { label: "SENT", value: sentTimeStr, icon: Clock, color: "#A78BFA" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <Icon size={12} color={item.color} className="mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p style={{ color: "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "9px", letterSpacing: "0.08em" }}>{item.label}</p>
                        <p style={{ color: "#C8D6F0", fontSize: "12px", fontWeight: 500, marginTop: "1px", wordBreak: "break-word" }}>{item.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>TIME ELAPSED</span>
                <span style={{ color: "#F0F4FF", fontFamily: "DM Mono, monospace", fontSize: "12px", fontWeight: 600 }}>
                  <ElapsedTimer startTime={sentTime} />
                </span>
              </div>
            </motion.div>

            {/* ETA card */}
            <div
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: "#0E1117", border: "1px solid rgba(0,212,170,0.2)" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(0,212,170,0.12)" }}>
                <Clock size={18} color="#00D4AA" />
              </div>
              <div>
                <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "9px", letterSpacing: "0.1em" }}>ESTIMATED RESPONSE</p>
                <p style={{ color: "#00D4AA", fontFamily: "DM Mono, monospace", fontSize: "22px", fontWeight: 800, lineHeight: 1 }}>
                  {etaMin} min
                </p>
                <p style={{ color: "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>Responders dispatched</p>
              </div>
            </div>

            {/* Reset */}
            <button
              onClick={onReset}
              className="flex items-center justify-center gap-2 py-3 rounded-xl transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#7A8FAD" }}
            >
              <RefreshCw size={13} />
              <span style={{ fontFamily: "DM Mono, monospace", fontSize: "11px" }}>File Another Report</span>
            </button>
          </div>

          {/* RIGHT — What to do now */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div>
              <h3 style={{ color: "#F0F4FF", fontSize: "18px", fontWeight: 700, letterSpacing: "-0.01em" }}>
                What to do while waiting for responders
              </h3>
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "11px", marginTop: "4px" }}>
                Follow these steps carefully until emergency personnel arrive
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={i}
                    className="flex items-start gap-4 rounded-2xl p-4"
                    style={{ background: "#0E1117", border: "1px solid rgba(255,255,255,0.07)" }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: step.bg, border: `1px solid ${step.color}33` }}
                    >
                      <Icon size={18} color={step.color} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="px-2 py-0.5 rounded-md"
                          style={{ background: "rgba(255,255,255,0.06)", color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "9px" }}
                        >
                          STEP {i + 1}
                        </span>
                        <p style={{ color: "#F0F4FF", fontSize: "14px", fontWeight: 700 }}>{step.title}</p>
                      </div>
                      <p style={{ color: "#7A8FAD", fontSize: "13px", lineHeight: 1.6 }}>{step.detail}</p>
                    </div>
                    <ChevronRight size={14} color="#2A3A52" className="shrink-0 mt-1" />
                  </motion.div>
                );
              })}
            </div>

            {/* Emergency numbers */}
            <div
              className="rounded-2xl p-4 grid grid-cols-3 gap-3"
              style={{ background: "#0E1117", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex items-center gap-2 col-span-3 mb-1">
                <Phone size={13} color="#00D4AA" />
                <span style={{ color: "#F0F4FF", fontSize: "13px", fontWeight: 600 }}>Emergency Contacts</span>
              </div>
              {[
                { name: "School Nurse", ext: "loc. 101", color: "#22C55E" },
                { name: "Security", ext: "loc. 105", color: "#EF4444" },
                { name: "National Emergency", ext: "911", color: "#EF4444" },
              ].map((c) => (
                <div
                  key={c.name}
                  className="flex flex-col gap-0.5 px-3 py-2.5 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "9px" }}>{c.name}</span>
                  <span style={{ color: c.color, fontFamily: "DM Mono, monospace", fontSize: "16px", fontWeight: 700 }}>{c.ext}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// TabletView.tsx
interface TabletViewProps {
  status: AlertStatus;
  onStatusChange: (s: AlertStatus) => void;
  isEmergency: boolean;
  onEmergency: () => void;
  onCancelEmergency: () => void;
}

type PanelTab = "alerts" | "location" | "updates";

export function TabletView({ status, onStatusChange, isEmergency, onEmergency, onCancelEmergency }: TabletViewProps) {
  const [panelTab, setPanelTab] = useState<PanelTab>("alerts");
  const [showConfirm, setShowConfirm] = useState(false);
  const statusConfig = STATUS_CONFIG[status];

  const handleActivate = () => {
    onEmergency();
    setShowConfirm(true);
  };

  const handleDismissConfirm = () => setShowConfirm(false);
  const handleCancelAlert = () => { setShowConfirm(false); onCancelEmergency(); };

  return (
    <div className="flex flex-col h-full" style={{ background: "#080D1A", fontFamily: "Inter, sans-serif" }}>
      {/* Top navigation bar */}
      <div
        className="flex items-center justify-between px-8 py-4"
        style={{ background: "#0D1525", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(0,212,170,0.15)", border: "1px solid rgba(0,212,170,0.25)" }}
          >
            <Shield size={18} color="#00D4AA" />
          </div>
          <div>
            <h1 style={{ color: "#F0F4FF", fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Safe Alert System
            </h1>
            <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>
              Emergency Medical Response Network
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}>
            <User size={13} color="#7A8FAD" />
            <div>
              <p style={{ color: "#F0F4FF", fontSize: "12px", fontWeight: 600 }}>Maya Chen</p>
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "9px" }}>ID #4821 · Unit 7</p>
            </div>
          </div>
          <StatusBadge status={status} size="md" />
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center relative cursor-pointer"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <Bell size={15} color="#7A8FAD" />
            {isEmergency && (
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                style={{ background: "#EF4444" }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main content — 3-column grid */}
      <div className="flex-1 overflow-hidden grid gap-5 p-6" style={{ gridTemplateColumns: "280px 1fr 320px" }}>

        {/* LEFT PANEL — user status + status selector */}
        <div className="flex flex-col gap-4 overflow-y-auto">
          {/* User status card */}
          <div
            className="rounded-2xl p-5 flex flex-col gap-4"
            style={{
              background: "#111827",
              border: `1px solid ${statusConfig.ring}`,
              boxShadow: `0 0 24px ${statusConfig.ring}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.1em" }}>
                CURRENT STATUS
              </span>
              <StatusBadge status={status} size="sm" />
            </div>

            <div className="flex flex-col items-center gap-2 py-3">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: statusConfig.bg }}
              >
                <Shield size={28} color={statusConfig.color} />
              </div>
              <p style={{ color: statusConfig.color, fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 700, textAlign: "center" }}>
                {statusConfig.description}
              </p>
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>
                Updated 09:14 AM
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {(["safe", "caution", "elevated", "emergency"] as AlertStatus[]).map((s) => {
                const cfg = STATUS_CONFIG[s];
                const isActive = status === s;
                return (
                  <button
                    key={s}
                    onClick={() => onStatusChange(s)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-left"
                    style={{
                      background: isActive ? cfg.bg : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isActive ? cfg.ring : "rgba(255,255,255,0.06)"}`,
                    }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                    <div className="flex-1 min-w-0">
                      <p style={{ color: isActive ? cfg.color : "#C8D6F0", fontFamily: "DM Mono, monospace", fontSize: "11px", fontWeight: isActive ? 600 : 400 }}>
                        {cfg.label}
                      </p>
                      <p style={{ color: "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "9px" }}>
                        {cfg.description}
                      </p>
                    </div>
                    {isActive && <ChevronRight size={12} color={cfg.color} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vitals card */}
          <div
            className="rounded-2xl p-5 flex flex-col gap-3"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center gap-2">
              <Activity size={13} color="#00D4AA" />
              <span style={{ color: "#F0F4FF", fontSize: "12px", fontWeight: 600 }}>Live Vitals</span>
              <motion.div
                className="ml-auto w-1.5 h-1.5 rounded-full"
                style={{ background: "#22C55E" }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>
            {[
              { label: "Heart Rate", value: "72 bpm", color: "#EF4444" },
              { label: "Blood O₂", value: "98%", color: "#0EA5E9" },
              { label: "Temperature", value: "98.4°F", color: "#F97316" },
              { label: "Blood Pressure", value: "118/78", color: "#A78BFA" },
              { label: "Resp. Rate", value: "15/min", color: "#00D4AA" },
            ].map((v) => (
              <div key={v.label} className="flex items-center justify-between">
                <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>{v.label}</span>
                <span style={{ color: v.color, fontFamily: "DM Mono, monospace", fontSize: "12px", fontWeight: 600 }}>{v.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER PANEL — emergency button + stats */}
        <div className="flex flex-col items-center justify-center gap-8">
          {/* Emergency button */}
          <div
            className="w-full rounded-3xl flex flex-col items-center justify-center gap-6 py-10"
            style={{
              background: isEmergency
                ? "radial-gradient(ellipse at center, rgba(239,68,68,0.08) 0%, #111827 70%)"
                : "radial-gradient(ellipse at center, rgba(0,212,170,0.06) 0%, #111827 70%)",
              border: `1px solid ${isEmergency ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.07)"}`,
            }}
          >
            <div>
              <h2 style={{ color: "#F0F4FF", fontSize: "22px", fontWeight: 700, textAlign: "center", letterSpacing: "-0.02em" }}>
                {isEmergency ? "Emergency Alert Active" : "Emergency Control"}
              </h2>
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "11px", textAlign: "center", marginTop: "4px" }}>
                {isEmergency ? "Services dispatched — Unit 7 ETA 4 min" : "Hold the button to send an emergency alert"}
              </p>
            </div>
            <EmergencyButton onActivate={handleActivate} isEmergency={isEmergency} size="tablet" />
          </div>

          {/* Stats row */}
          <div className="w-full grid grid-cols-4 gap-3">
            {[
              { label: "Response Time", value: "4.2 min", sub: "avg today", color: "#00D4AA" },
              { label: "Alerts Sent", value: "0", sub: "today", color: "#F0F4FF" },
              { label: "System Uptime", value: "99.8%", sub: "this week", color: "#22C55E" },
              { label: "Active Units", value: "12", sub: "nearby", color: "#0EA5E9" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl p-4 flex flex-col gap-1"
                style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <span style={{ color: stat.color, fontFamily: "DM Mono, monospace", fontSize: "22px", fontWeight: 700, lineHeight: 1 }}>
                  {stat.value}
                </span>
                <span style={{ color: "#F0F4FF", fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500 }}>
                  {stat.label}
                </span>
                <span style={{ color: "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "9px" }}>
                  {stat.sub}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL — tabbed info panel */}
        <div
          className="rounded-2xl flex flex-col overflow-hidden"
          style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {/* Panel tabs */}
          <div
            className="flex items-center gap-0 p-1.5"
            style={{ background: "#0D1525", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            {([
              { id: "alerts" as PanelTab, icon: Clock, label: "History" },
              { id: "location" as PanelTab, icon: MapPin, label: "Location" },
              { id: "updates" as PanelTab, icon: Shield, label: "Safety" },
            ]).map(({ id, icon: Icon, label }) => {
              const isActive = panelTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setPanelTab(id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all"
                  style={{
                    background: isActive ? "#111827" : "transparent",
                    border: isActive ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
                  }}
                >
                  <Icon size={12} color={isActive ? "#00D4AA" : "#4A5F7A"} />
                  <span style={{ color: isActive ? "#F0F4FF" : "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "10px", fontWeight: isActive ? 600 : 400 }}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-4">
            <AnimatePresence mode="wait">
              {panelTab === "alerts" && (
                <motion.div
                  key="alerts"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-3"
                >
                  <h3 style={{ color: "#F0F4FF", fontSize: "13px", fontWeight: 600 }}>Recent Alerts</h3>
                  <AlertHistory />
                </motion.div>
              )}
              {panelTab === "location" && (
                <motion.div
                  key="location"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <LocationCard compact={false} />
                </motion.div>
              )}
              {panelTab === "updates" && (
                <motion.div
                  key="updates"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-3"
                >
                  <h3 style={{ color: "#F0F4FF", fontSize: "13px", fontWeight: 600 }}>Safety Updates</h3>
                  <SafetyUpdates />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showConfirm && (
          <ConfirmationScreen onDismiss={handleDismissConfirm} onCancel={handleCancelAlert} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
