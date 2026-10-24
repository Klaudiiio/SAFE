import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Check, ChevronDown,
  Clock3, FileText, LayoutDashboard, LoaderCircle, LogOut, MapPin, Menu,
  RefreshCw, Search, Shield, ShieldCheck, Users, UserPlus, X, ClipboardList,
  MapPinned, ListChecks, Pencil, Trash2, Plus,
  Stethoscope,
} from "lucide-react";

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || "";
type Page = "overview" | "reports" | "people" | "staff" | "responders" | "catalog" | "locations" | "activity";
type ReportStatus = "submitted" | "acknowledged" | "in_progress" | "resolved" | "closed";
type VerificationStatus = "demo_unverified" | "demo_verified" | "suspended";

interface Report {
  id: number;
  incident_id: string;
  incident_label: string;
  severity: "urgent" | "minor";
  building: string;
  floor: string;
  description: string;
  recording_notice_accepted: boolean;
  audio_enabled: boolean;
  video_enabled: boolean;
  status: ReportStatus;
  response_eta_minutes: number;
  created_at: string;
  updated_at: string;
  reporter: { name: string; email: string };
}

interface Account {
  id: number;
  display_name: string;
  email: string;
  account_type: "student" | "visitor";
  verification_status: VerificationStatus;
  is_active: boolean;
  created_at: string;
  reports_count: number;
}

interface Overview {
  reports_total: number;
  reports_open: number;
  reports_urgent: number;
  reports_resolved: number;
  users_total: number;
  users_unverified: number;
  latest_reports: Report[];
}

interface AdminUser {
  id: number;
  username: string;
}

interface CatalogIncidentType {
  id: number;
  code: string;
  incident_name: string;
  priority_level: "urgent" | "minor";
  guidance: string;
}

interface CatalogLocation {
  id: number;
  building: string;
  room: string;
  latitude: string | null;
  longitude: string | null;
}

interface IncidentLog {
  id: number;
  incident_id: number;
  incident_label: string;
  admin_username: string;
  action_time: string;
  remarks: string;
  event_type: string;
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (options.method && options.method !== "GET") {
    const csrfResponse = await fetch(`${API_BASE_URL}/api/auth/csrf/`, { credentials: "include" });
    if (!csrfResponse.ok) throw new Error("Could not start a secure admin request.");
    const csrfPayload = await csrfResponse.json() as { csrf_token: string };
    headers.set("X-CSRFToken", csrfPayload.csrf_token);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const payload = await response.json() as { detail?: string };
      if (payload.detail) message = payload.detail;
    } catch {
      // Use the HTTP status message when the response is not JSON.
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function AdminApp() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [page, setPage] = useState<Page>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportStatus, setReportStatus] = useState<ReportStatus>("submitted");
  const [reportEta, setReportEta] = useState(5);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [staffUsername, setStaffUsername] = useState("");
  const [staffName, setStaffName] = useState("");
  const [staffStudentId, setStaffStudentId] = useState("");
  const [staffCourse, setStaffCourse] = useState("");
  const [staffPhoneNumber, setStaffPhoneNumber] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffCreated, setStaffCreated] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [overviewResult, reportsResult, usersResult] = await Promise.all([
        api<Overview>("/api/admin/overview/"),
        api<Report[]>(`/api/admin/reports/?q=${encodeURIComponent(search)}${filterStatus === "all" ? "" : `&status=${filterStatus}`}`),
        api<Account[]>(`/api/admin/users/?q=${encodeURIComponent(search)}`),
      ]);
      setOverview(overviewResult);
      setReports(reportsResult);
      setAccounts(usersResult);
      setSelectedReport((current) => current ? reportsResult.find((report) => report.id === current.id) ?? null : null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load admin data.");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  useEffect(() => {
    api<AdminUser>("/api/admin/session/")
      .then(setAdmin)
      .catch(() => setAdmin(null))
      .finally(() => setCheckingSession(false));
  }, []);

  const navigate = (nextPage: Page) => {
    setPage(nextPage);
    setMobileNavOpen(false);
    setStaffCreated("");
    setError("");
  };

  useEffect(() => {
    if (admin) void loadData();
  }, [admin, loadData]);

  const totals = useMemo(() => ({
    open: overview?.reports_open ?? 0,
    urgent: overview?.reports_urgent ?? 0,
    resolved: overview?.reports_resolved ?? 0,
    users: overview?.users_total ?? 0,
  }), [overview]);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");
    try {
      const result = await api<AdminUser>("/api/admin/login/", {
        method: "POST",
        body: JSON.stringify({ username: loginName, password: loginPassword }),
      });
      setAdmin(result);
      setLoginPassword("");
    } catch (loginFailure) {
      setLoginError(loginFailure instanceof Error ? loginFailure.message : "Sign in failed.");
    }
  };

  const logout = async () => {
    try {
      await api("/api/admin/logout/", { method: "POST" });
      setAdmin(null);
      setOverview(null);
      setReports([]);
      setAccounts([]);
    } catch (logoutFailure) {
      setError(logoutFailure instanceof Error ? logoutFailure.message : "Could not sign out.");
    }
  };

  const openReport = (report: Report) => {
    setSelectedReport(report);
    setReportStatus(report.status);
    setReportEta(report.response_eta_minutes);
  };

  const saveReport = async () => {
    if (!selectedReport) return;
    try {
      const updated = await api<Report>(`/api/admin/reports/${selectedReport.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: reportStatus, response_eta_minutes: reportEta }),
      });
      setSelectedReport(updated);
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update the report.");
    }
  };

  const updateAccount = async (account: Account, updates: Partial<Pick<Account, "verification_status" | "is_active">>) => {
    try {
      await api<Account>(`/api/admin/users/${account.id}/`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      await loadData();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update the account.");
    }
  };

  const createStaffAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setStaffCreated("");
    try {
      const created = await api<{ username: string }>("/api/admin/staff/", {
        method: "POST",
        body: JSON.stringify({
          username: staffUsername.trim(),
          name: staffName.trim(),
          student_id: staffStudentId.trim(),
          course: staffCourse.trim(),
          phone_number: staffPhoneNumber.trim(),
          email: staffEmail.trim(),
          password: staffPassword,
        }),
      });
      setStaffCreated(`Staff account "${created.username}" was created. They can now sign in to the admin console.`);
      setStaffUsername("");
      setStaffName("");
      setStaffStudentId("");
      setStaffCourse("");
      setStaffPhoneNumber("");
      setStaffEmail("");
      setStaffPassword("");
      await loadData();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create the staff account.");
    }
  };

  const navItems = [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "reports" as const, label: "Incident reports", icon: FileText },
    { id: "catalog" as const, label: "Incident types", icon: ListChecks },
    { id: "locations" as const, label: "Locations", icon: MapPinned },
    { id: "activity" as const, label: "Activity log", icon: ClipboardList },
    { id: "people" as const, label: "Accounts", icon: Users },
    { id: "responders" as const, label: "Clinic responders", icon: Stethoscope },
    { id: "staff" as const, label: "Create admin account", icon: UserPlus },
  ];

  if (checkingSession) {
    return <div className="loading-screen"><LoaderCircle className="spin" size={24} /> Checking administrator session</div>;
  }

  if (!admin) {
    return (
      <main className="login-page">
        <div className="login-card">
          <div className="brand-mark"><Shield size={23} /></div>
          <div className="eyebrow">SAFE RESPONSE PLATFORM</div>
          <h1>Admin console</h1>
          <p className="login-subtitle">Sign in with an administrator account to manage response activity.</p>
          <form onSubmit={login} className="login-form">
            <label htmlFor="admin-username">Username</label>
            <input id="admin-username" autoComplete="username" value={loginName} onChange={(event) => setLoginName(event.target.value)} required />
            <label htmlFor="admin-password">Password</label>
            <input id="admin-password" type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required />
            {loginError && <div role="alert" className="inline-error">{loginError}</div>}
            <button className="primary-button login-button" type="submit">Sign in securely <ArrowUpRight size={16} /></button>
          </form>
          <div className="login-foot"><ShieldCheck size={15} /> Staff access only · Session protected</div>
        </div>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <a className="brand" href="/admin/" aria-label="SAFE admin home">
          <span className="brand-mark small"><Shield size={19} /></span>
          <span><strong>SAFE</strong><small>ADMIN CONSOLE</small></span>
        </a>
        <div className="nav-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Admin navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${page === id ? "active" : ""}`} onClick={() => navigate(id)}>
              <Icon size={18} /><span>{label}</span>
              {id === "reports" && totals.open > 0 && <span className="nav-count">{totals.open}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="system-state"><span className="pulse-dot" /><div><b>System operational</b><small>Emergency reporting online</small></div></div>
          <button className="profile-button" onClick={() => void logout()}>
            <div className="avatar">{admin.username.slice(0, 1).toUpperCase()}</div>
            <div className="profile-copy"><b>{admin.username}</b><small>Administrator</small></div>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Toggle navigation" onClick={() => setMobileNavOpen((open) => !open)}><Menu size={20} /></button>
          <div className="breadcrumbs">SAFE <span>/</span> {navItems.find((item) => item.id === page)?.label}</div>
          <div className="topbar-actions">
            <span className="live-label"><span className="pulse-dot" /> LIVE</span>
            <button className="icon-button" aria-label="Refresh data" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw className={loading ? "spin" : ""} size={17} />
            </button>
            <div className="avatar top-avatar">{admin.username.slice(0, 1).toUpperCase()}</div>
          </div>
        </header>

        <div className="page-content">
          {error && <div role="alert" className="error-banner"><AlertTriangle size={17} /><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError("")}><X size={16} /></button></div>}
          {page === "overview" && (
            <>
              <div className="page-heading">
                <div><div className="eyebrow">RESPONSE OPERATIONS</div><h1>Good day, {admin.username}</h1><p>Here’s what’s happening across the SAFE network.</p></div>
                <div className="heading-actions">
                  <button className="secondary-button" onClick={() => navigate("staff")}><UserPlus size={16} /> Create staff account</button>
                  <button className="primary-button" onClick={() => navigate("reports")}><FileText size={16} /> Review reports</button>
                </div>
              </div>
              <section className="metric-grid" aria-label="Response metrics">
                <MetricCard label="Open reports" value={totals.open} icon={Activity} tone="blue" note="Awaiting response" trend={<ArrowUpRight size={14} />} />
                <MetricCard label="Urgent incidents" value={totals.urgent} icon={AlertTriangle} tone="red" note="Needs attention" trend={<ArrowDownRight size={14} />} />
                <MetricCard label="Resolved reports" value={totals.resolved} icon={Check} tone="green" note="Closed or resolved" trend={<ArrowUpRight size={14} />} />
                <MetricCard label="Registered accounts" value={totals.users} icon={Users} tone="violet" note={`${overview?.users_unverified ?? 0} unverified`} trend={<Users size={14} />} />
              </section>
              <section className="overview-grid">
                <div className="panel">
                  <div className="panel-heading"><div><h2>Recent incidents</h2><p>Latest reports submitted by SAFE users</p></div><button className="text-button" onClick={() => navigate("reports")}>View all <ArrowUpRight size={14} /></button></div>
                  <ReportTable reports={overview?.latest_reports ?? []} onOpen={openReport} compact />
                </div>
                <div className="panel pulse-panel">
                  <div className="panel-heading"><div><h2>Safety network</h2><p>Service health at a glance</p></div><span className="status-pill success"><span className="pulse-dot" /> Operational</span></div>
                  <div className="health-row"><div className="health-icon blue"><Activity size={17} /></div><div><b>Emergency reporting</b><small>Incident intake and processing</small></div><span className="health-value">Online</span></div>
                  <div className="health-row"><div className="health-icon green"><ShieldCheck size={17} /></div><div><b>Admin API</b><small>Authenticated staff access</small></div><span className="health-value">Online</span></div>
                  <div className="health-row"><div className="health-icon amber"><Clock3 size={17} /></div><div><b>Open response queue</b><small>Items requiring follow-up</small></div><span className={`health-value ${totals.open ? "warning-text" : ""}`}>{totals.open} reports</span></div>
                  <div className="health-note"><ShieldCheck size={15} /><span>Dashboard data is synced with the SAFE response database.</span></div>
                </div>
              </section>
              <section className="quick-links">
                <button className="quick-link" onClick={() => navigate("reports")}><span className="quick-icon red"><AlertTriangle size={17} /></span><span><b>Incident response</b><small>Review severity, location, and update response status</small></span><ArrowUpRight size={16} /></button>
                <button className="quick-link" onClick={() => navigate("people")}><span className="quick-icon violet"><Users size={17} /></span><span><b>Account oversight</b><small>Verify demo profiles and manage account access</small></span><ArrowUpRight size={16} /></button>
              </section>
            </>
          )}

          {page === "reports" && (
            <>
              <div className="page-heading"><div><div className="eyebrow">INCIDENT MANAGEMENT</div><h1>Incident reports</h1><p>Review user-submitted alerts and coordinate response status.</p></div><span className="result-count">{reports.length} reports</span></div>
              <div className="toolbar">
                <form className="search-box" onSubmit={(event) => { event.preventDefault(); setSearch(searchValue.trim()); }}><Search size={17} /><input placeholder="Search reports, location, reporter..." value={searchValue} onChange={(event) => setSearchValue(event.target.value)} /><button type="submit">Search</button></form>
                <label className="select-wrap"><span>Status</span><select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}><option value="all">All statuses</option>{(["submitted", "acknowledged", "in_progress", "resolved", "closed"] as ReportStatus[]).map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select><ChevronDown size={14} /></label>
              </div>
              <div className="panel table-panel"><ReportTable reports={reports} onOpen={openReport} /></div>
            </>
          )}

          {page === "catalog" && <IncidentTypesPage />}
          {page === "locations" && <LocationsPage />}
          {page === "activity" && <IncidentActivityPage />}

          {page === "people" && (
            <>
              <div className="page-heading"><div><div className="eyebrow">USER MANAGEMENT</div><h1>Accounts</h1><p>Review account types, verification, and access status.</p></div><span className="result-count">{accounts.length} accounts</span></div>
              <div className="toolbar">
                <form className="search-box" onSubmit={(event) => { event.preventDefault(); setSearch(searchValue.trim()); }}><Search size={17} /><input placeholder="Search name or email..." value={searchValue} onChange={(event) => setSearchValue(event.target.value)} /><button type="submit">Search</button></form>
              </div>
              <div className="panel table-panel">
                <div className="table-scroll"><table><thead><tr><th>ACCOUNT</th><th>TYPE</th><th>STUDENT ID</th><th>COURSE</th><th>PHONE</th><th>VERIFICATION</th><th>REPORTS</th><th>JOINED</th><th>ACCESS</th></tr></thead>
                  <tbody>{accounts.map((account) => (
                    <tr key={account.id}>
                      <td><div className="person-cell"><div className="avatar person-avatar">{account.display_name.slice(0, 1).toUpperCase()}</div><div><b>{account.display_name}</b><small>{account.email}</small></div></div></td>
                      <td><span className="account-type">{titleCase(account.account_type)}</span></td>
                      <td className="muted-cell">{account.student_id || "—"}</td>
                      <td className="muted-cell">{account.course || "—"}</td>
                      <td className="muted-cell">{account.phone_number || "—"}</td>
                      <td><select className={`verification-select ${account.verification_status}`} aria-label={`Verification status for ${account.display_name}`} value={account.verification_status} onChange={(event) => void updateAccount(account, { verification_status: event.target.value as VerificationStatus })}><option value="demo_unverified">Unverified</option><option value="demo_verified">Verified</option><option value="suspended">Suspended</option></select></td>
                      <td className="muted-cell">{account.reports_count}</td>
                      <td className="muted-cell">{formatDate(account.created_at)}</td>
                      <td><button className={`access-toggle ${account.is_active ? "enabled" : "disabled"}`} onClick={() => void updateAccount(account, { is_active: !account.is_active })}>{account.is_active ? "Active" : "Disabled"}</button></td>
                    </tr>
                  ))}</tbody></table>
                  {accounts.length === 0 && <EmptyState title="No accounts found" description="Try a different search term." />}
                </div>
              </div>
              <p className="privacy-note"><ShieldCheck size={15} /> Verification is for demo account management only and does not confirm real-world identity.</p>
            </>
          )}

          {page === "staff" && (
            <>
              <div className="page-heading"><div><div className="eyebrow">STAFF MANAGEMENT</div><h1>Create admin account</h1><p>Add a staff member who can sign in to the SAFE admin console.</p></div></div>
              <section className="panel signup-panel">
                <div className="panel-heading"><div><h2>New staff account</h2><p>Only signed-in administrators and staff can create these accounts.</p></div><span className="status-pill success"><ShieldCheck size={13} /> Staff only</span></div>
                <form className="staff-form" onSubmit={createStaffAccount}>
                  <label>Name<input maxLength={50} autoComplete="name" value={staffName} onChange={(event) => setStaffName(event.target.value)} required /></label>
                  <label>Username<input autoComplete="off" value={staffUsername} onChange={(event) => setStaffUsername(event.target.value)} required /></label>
                  <label>Student ID<input maxLength={100} value={staffStudentId} onChange={(event) => setStaffStudentId(event.target.value)} required /></label>
                  <label>Course<input maxLength={100} value={staffCourse} onChange={(event) => setStaffCourse(event.target.value)} required /></label>
                  <label>Phone number<input type="tel" maxLength={20} autoComplete="tel" value={staffPhoneNumber} onChange={(event) => setStaffPhoneNumber(event.target.value)} required /></label>
                  <label>Email address<input type="email" autoComplete="email" value={staffEmail} onChange={(event) => setStaffEmail(event.target.value)} required /></label>
                  <label>Password<input type="password" autoComplete="new-password" value={staffPassword} onChange={(event) => setStaffPassword(event.target.value)} required /></label>
                  {staffCreated && <div className="staff-success" role="status"><ShieldCheck size={17} />{staffCreated}</div>}
                  <p className="staff-notice"><ShieldCheck size={15} /> The new account receives staff access only, not superuser permissions. Django password requirements apply.</p>
                  <button className="primary-button" type="submit"><UserPlus size={16} /> Create staff account</button>
                </form>
              </section>
            </>
          )}
          {page === "responders" && <RespondersPage />}
        </div>
      </main>

      {mobileNavOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      {selectedReport && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedReport(null); }}>
        <section className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-title">
          <header className="modal-header"><div><div className="eyebrow">REPORT #{selectedReport.id}</div><h2 id="report-title">{selectedReport.incident_label}</h2></div><button className="icon-button" aria-label="Close report" onClick={() => setSelectedReport(null)}><X size={19} /></button></header>
          <div className="modal-body">
            <div className="report-summary"><span className={`severity-badge ${selectedReport.severity}`}>{selectedReport.severity === "urgent" && <AlertTriangle size={13} />}{titleCase(selectedReport.severity)} severity</span><span className={`status-pill ${selectedReport.status}`}>{titleCase(selectedReport.status)}</span></div>
            <div className="detail-grid">
              <Detail label="Reporter" value={selectedReport.reporter.name} sub={selectedReport.reporter.email} />
              <Detail label="Submitted" value={formatDate(selectedReport.created_at)} />
              <Detail label="Location" value={`${selectedReport.building || "Not specified"}${selectedReport.floor ? ` · ${selectedReport.floor}` : ""}`} icon={<MapPin size={14} />} />
              <Detail label="Incident reference" value={selectedReport.incident_id} />
            </div>
            <div className="description-block"><div className="field-label">DESCRIPTION</div><p>{selectedReport.description || "No additional details were provided."}</p></div>
            <div className="recording-block"><div className="field-label">RECORDING PREFERENCES</div><div className="recording-tags"><span>{selectedReport.recording_notice_accepted ? "Notice accepted" : "Notice not accepted"}</span><span>Audio {selectedReport.audio_enabled ? "enabled" : "disabled"}</span><span>Video {selectedReport.video_enabled ? "enabled" : "disabled"}</span></div><small>Media is not stored or available through this admin console.</small></div>
            <div className="response-controls"><label><span className="field-label">RESPONSE STATUS</span><select value={reportStatus} onChange={(event) => setReportStatus(event.target.value as ReportStatus)}>{(["submitted", "acknowledged", "in_progress", "resolved", "closed"] as ReportStatus[]).map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select></label><label><span className="field-label">RESPONSE ETA (MINUTES)</span><input type="number" min="0" max="1440" value={reportEta} onChange={(event) => setReportEta(Number(event.target.value))} /></label></div>
          </div>
          <footer className="modal-footer"><button className="secondary-button" onClick={() => setSelectedReport(null)}>Close</button><button className="primary-button" onClick={() => void saveReport()}>Save response update</button></footer>
        </section>
      </div>}
    </div>
  );
}

interface ClinicResponder {
  user_id: number;
  name: string;
  department: string;
  contact_number: string;
  availability_status: "available" | "unavailable" | "on_break";
  username: string;
  email: string;
  is_active: boolean;
}

function RespondersPage() {
  const [responders, setResponders] = useState<ClinicResponder[]>([]);
  const [draft, setDraft] = useState({
    username: "", name: "", email: "", department: "", contact_number: "", password: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setResponders(await api<ClinicResponder[]>("/api/admin/responders/"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load clinic responders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const createResponder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await api<ClinicResponder>("/api/admin/responders/", {
        method: "POST",
        body: JSON.stringify({
          username: draft.username.trim(),
          name: draft.name.trim(),
          email: draft.email.trim(),
          department: draft.department.trim(),
          contact_number: draft.contact_number.trim(),
          password: draft.password,
        }),
      });
      setNotice(`Clinic responder "${result.username}" was created. Their account can sign in at /clinic-staff/.`);
      setDraft({ username: "", name: "", email: "", department: "", contact_number: "", password: "" });
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create the responder account.");
    } finally {
      setSaving(false);
    }
  };

  const updateResponder = async (account: ClinicResponder, updates: Partial<Pick<ClinicResponder, "availability_status" | "is_active">>) => {
    setError("");
    setNotice("");
    try {
      await api<ClinicResponder>(`/api/admin/responders/${account.user_id}/`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update the responder.");
    }
  };

  return (
    <>
      <div className="page-heading">
        <div><div className="eyebrow">CLINIC ACCESS</div><h1>Clinic responders</h1><p>Create separate responder accounts and manage clinic access.</p></div>
      </div>
      {error && <div role="alert" className="error-banner"><AlertTriangle size={17} /><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError("")}><X size={16} /></button></div>}
      {notice && <div className="success-banner"><Check size={17} /><span>{notice}</span></div>}
      <section className="panel signup-panel">
        <div className="panel-title"><div className="panel-icon"><Stethoscope size={18} /></div><div><h2>Create clinic responder</h2><p>Responder accounts are separate from student and admin accounts.</p></div></div>
        <form className="staff-form-grid" onSubmit={(event) => void createResponder(event)}>
          <label>Full name<input required maxLength={50} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label>Username<input required maxLength={150} autoComplete="off" value={draft.username} onChange={(event) => setDraft({ ...draft, username: event.target.value })} /></label>
          <label>Email<input type="email" required value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label>
          <label>Department<input required maxLength={100} value={draft.department} onChange={(event) => setDraft({ ...draft, department: event.target.value })} placeholder="e.g. Campus Clinic" /></label>
          <label>Contact number<input required maxLength={20} value={draft.contact_number} onChange={(event) => setDraft({ ...draft, contact_number: event.target.value })} /></label>
          <label>Password<input type="password" required autoComplete="new-password" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} /></label>
          <div className="staff-form-actions"><button className="primary-button" type="submit" disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />} Create responder account</button></div>
        </form>
      </section>
      <section className="panel table-panel">
        <div className="panel-title"><div className="panel-icon"><Users size={18} /></div><div><h2>Responder accounts</h2><p>Only active accounts may access the clinic portal.</p></div><button className="icon-button" aria-label="Refresh responders" onClick={() => void load()}><RefreshCw className={loading ? "spin" : ""} size={16} /></button></div>
        {loading ? <div className="empty-state">Loading responder accounts...</div> : responders.length === 0 ? <div className="empty-state">No clinic responders have been created yet.</div> : (
          <div className="responder-table">
            <div className="responder-row responder-header"><span>Responder</span><span>Department</span><span>Availability</span><span>Access</span></div>
            {responders.map((account) => (
              <div className="responder-row" key={account.user_id}>
                <span className="responder-identity"><strong>{account.name}</strong><small>{account.username} · {account.email}</small><small>{account.contact_number}</small></span>
                <span>{account.department}</span>
                <select aria-label={`Availability for ${account.name}`} value={account.availability_status} onChange={(event) => void updateResponder(account, { availability_status: event.target.value as ClinicResponder["availability_status"] })}>
                  <option value="available">Available</option><option value="on_break">On break</option><option value="unavailable">Unavailable</option>
                </select>
                <button className={`access-toggle ${account.is_active ? "enabled" : ""}`} onClick={() => void updateResponder(account, { is_active: !account.is_active })}>{account.is_active ? "Active" : "Disabled"}</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function IncidentTypesPage() {
  const [types, setTypes] = useState<CatalogIncidentType[]>([]);
  const [draft, setDraft] = useState({ code: "", incident_name: "", priority_level: "minor" as "urgent" | "minor", guidance: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState(draft);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadTypes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setTypes(await api<CatalogIncidentType[]>("/api/admin/incident-types/"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load incident types.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadTypes(); }, [loadTypes]);

  const saveType = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try {
      if (editingId === null) {
        await api("/api/admin/incident-types/", { method: "POST", body: JSON.stringify(draft) });
        setDraft({ code: "", incident_name: "", priority_level: "minor", guidance: "" });
      } else {
        await api(`/api/admin/incident-types/${editingId}/`, { method: "PATCH", body: JSON.stringify(editingDraft) });
        setEditingId(null);
      }
      await loadTypes();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save incident type.");
    }
  };

  const deleteType = async (type: CatalogIncidentType) => {
    if (!window.confirm(`Delete incident type "${type.incident_name}"?`)) return;
    setError("");
    try {
      await api<void>(`/api/admin/incident-types/${type.id}/`, { method: "DELETE" });
      await loadTypes();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete incident type.");
    }
  };

  return (
    <>
      <div className="page-heading"><div><div className="eyebrow">INCIDENT CONFIGURATION</div><h1>Incident types</h1><p>Manage the categories, urgency, and guidance shown in user reporting.</p></div><span className="result-count">{types.length} types</span></div>
      {error && <div role="alert" className="error-banner"><AlertTriangle size={17} /><span>{error}</span></div>}
      <section className="panel catalog-panel">
        <div className="panel-heading"><div><h2>{editingId === null ? "Add incident type" : "Edit incident type"}</h2><p>Changes are shared by the web and mobile reporting flows.</p></div></div>
        <form className="catalog-form" onSubmit={saveType}>
          <label>Code<input className="catalog-input" value={editingId === null ? draft.code : editingDraft.code} onChange={(event) => editingId === null ? setDraft({ ...draft, code: event.target.value }) : setEditingDraft({ ...editingDraft, code: event.target.value })} required maxLength={80} /></label>
          <label>Incident name<input className="catalog-input" value={editingId === null ? draft.incident_name : editingDraft.incident_name} onChange={(event) => editingId === null ? setDraft({ ...draft, incident_name: event.target.value }) : setEditingDraft({ ...editingDraft, incident_name: event.target.value })} required maxLength={50} /></label>
          <label>Priority<select className="catalog-input" value={editingId === null ? draft.priority_level : editingDraft.priority_level} onChange={(event) => editingId === null ? setDraft({ ...draft, priority_level: event.target.value as "urgent" | "minor" }) : setEditingDraft({ ...editingDraft, priority_level: event.target.value as "urgent" | "minor" })}><option value="urgent">Urgent</option><option value="minor">Minor</option></select></label>
          <label>Guidance<input className="catalog-input" value={editingId === null ? draft.guidance : editingDraft.guidance} onChange={(event) => editingId === null ? setDraft({ ...draft, guidance: event.target.value }) : setEditingDraft({ ...editingDraft, guidance: event.target.value })} maxLength={200} /></label>
          <div className="catalog-form-actions"><button className="primary-button" type="submit">{editingId === null ? <><Plus size={15} /> Add type</> : <><Check size={15} /> Save changes</>}</button>{editingId !== null && <button className="secondary-button" type="button" onClick={() => setEditingId(null)}>Cancel</button>}</div>
        </form>
      </section>
      <section className="panel table-panel catalog-table-panel">
        <div className="table-scroll"><table><thead><tr><th>CODE</th><th>INCIDENT NAME</th><th>PRIORITY</th><th>GUIDANCE</th><th>ACTIONS</th></tr></thead>
          <tbody>{types.map((type) => <tr key={type.id}><td className="muted-cell">{type.code}</td><td><b>{type.incident_name}</b></td><td><span className={`severity-badge ${type.priority_level}`}>{titleCase(type.priority_level)}</span></td><td className="muted-cell">{type.guidance || "—"}</td><td><div className="catalog-row-actions"><button className="icon-button" aria-label={`Edit ${type.incident_name}`} onClick={() => { setEditingId(type.id); setEditingDraft({ code: type.code, incident_name: type.incident_name, priority_level: type.priority_level, guidance: type.guidance }); }}><Pencil size={15} /></button><button className="icon-button danger-action" aria-label={`Delete ${type.incident_name}`} onClick={() => void deleteType(type)}><Trash2 size={15} /></button></div></td></tr>)}</tbody>
        </table>{!loading && types.length === 0 && <EmptyState title="No incident types" description="Add an incident type to make it available for reporting." />}{loading && <div className="catalog-loading">Loading incident types...</div>}</div>
      </section>
    </>
  );
}

function LocationsPage() {
  const [locations, setLocations] = useState<CatalogLocation[]>([]);
  const [draft, setDraft] = useState({ building: "", room: "", latitude: "", longitude: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState(draft);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadLocations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setLocations(await api<CatalogLocation[]>("/api/admin/locations/"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load locations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadLocations(); }, [loadLocations]);

  const saveLocation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const values = editingId === null ? draft : editingDraft;
    const payload = {
      building: values.building,
      room: values.room,
      latitude: values.latitude || null,
      longitude: values.longitude || null,
    };
    try {
      if (editingId === null) {
        await api("/api/admin/locations/", { method: "POST", body: JSON.stringify(payload) });
        setDraft({ building: "", room: "", latitude: "", longitude: "" });
      } else {
        await api(`/api/admin/locations/${editingId}/`, { method: "PATCH", body: JSON.stringify(payload) });
        setEditingId(null);
      }
      await loadLocations();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save location.");
    }
  };

  const deleteLocation = async (location: CatalogLocation) => {
    if (!window.confirm(`Delete location "${location.building}${location.room ? ` · ${location.room}` : ""}"?`)) return;
    setError("");
    try {
      await api<void>(`/api/admin/locations/${location.id}/`, { method: "DELETE" });
      await loadLocations();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete location.");
    }
  };

  return (
    <>
      <div className="page-heading"><div><div className="eyebrow">CAMPUS CONFIGURATION</div><h1>Locations</h1><p>Manage manual building and room values. Coordinates remain optional.</p></div><span className="result-count">{locations.length} locations</span></div>
      {error && <div role="alert" className="error-banner"><AlertTriangle size={17} /><span>{error}</span></div>}
      <section className="panel catalog-panel">
        <div className="panel-heading"><div><h2>{editingId === null ? "Add location" : "Edit location"}</h2><p>Latitude and longitude are optional and are not collected from users.</p></div></div>
        <form className="catalog-form location-form" onSubmit={saveLocation}>
          <label>Building<input className="catalog-input" value={editingId === null ? draft.building : editingDraft.building} onChange={(event) => editingId === null ? setDraft({ ...draft, building: event.target.value }) : setEditingDraft({ ...editingDraft, building: event.target.value })} required maxLength={50} /></label>
          <label>Room / floor<input className="catalog-input" value={editingId === null ? draft.room : editingDraft.room} onChange={(event) => editingId === null ? setDraft({ ...draft, room: event.target.value }) : setEditingDraft({ ...editingDraft, room: event.target.value })} maxLength={100} /></label>
          <label>Latitude (optional)<input className="catalog-input" type="number" step="any" value={editingId === null ? draft.latitude : editingDraft.latitude} onChange={(event) => editingId === null ? setDraft({ ...draft, latitude: event.target.value }) : setEditingDraft({ ...editingDraft, latitude: event.target.value })} /></label>
          <label>Longitude (optional)<input className="catalog-input" type="number" step="any" value={editingId === null ? draft.longitude : editingDraft.longitude} onChange={(event) => editingId === null ? setDraft({ ...draft, longitude: event.target.value }) : setEditingDraft({ ...editingDraft, longitude: event.target.value })} /></label>
          <div className="catalog-form-actions"><button className="primary-button" type="submit">{editingId === null ? <><Plus size={15} /> Add location</> : <><Check size={15} /> Save changes</>}</button>{editingId !== null && <button className="secondary-button" type="button" onClick={() => setEditingId(null)}>Cancel</button>}</div>
        </form>
      </section>
      <section className="panel table-panel catalog-table-panel">
        <div className="table-scroll"><table><thead><tr><th>BUILDING</th><th>ROOM / FLOOR</th><th>LATITUDE</th><th>LONGITUDE</th><th>ACTIONS</th></tr></thead>
          <tbody>{locations.map((location) => <tr key={location.id}><td><b>{location.building}</b></td><td className="muted-cell">{location.room || "—"}</td><td className="muted-cell">{location.latitude || "—"}</td><td className="muted-cell">{location.longitude || "—"}</td><td><div className="catalog-row-actions"><button className="icon-button" aria-label={`Edit ${location.building}`} onClick={() => { setEditingId(location.id); setEditingDraft({ building: location.building, room: location.room, latitude: location.latitude || "", longitude: location.longitude || "" }); }}><Pencil size={15} /></button><button className="icon-button danger-action" aria-label={`Delete ${location.building}`} onClick={() => void deleteLocation(location)}><Trash2 size={15} /></button></div></td></tr>)}</tbody>
        </table>{!loading && locations.length === 0 && <EmptyState title="No locations" description="Add a campus building or room to begin." />}{loading && <div className="catalog-loading">Loading locations...</div>}</div>
      </section>
    </>
  );
}

function IncidentActivityPage() {
  const [logs, setLogs] = useState<IncidentLog[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<IncidentLog[]>("/api/admin/incident-logs/")
      .then(setLogs)
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Could not load activity logs."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-heading"><div><div className="eyebrow">AUDIT TRAIL</div><h1>Incident activity</h1><p>Review incident submissions and administrator response updates.</p></div><span className="result-count">Latest {logs.length} events</span></div>
      {error && <div role="alert" className="error-banner"><AlertTriangle size={17} /><span>{error}</span></div>}
      <section className="panel table-panel">
        <div className="table-scroll"><table><thead><tr><th>TIME</th><th>INCIDENT</th><th>EVENT</th><th>ADMIN</th><th>REMARKS</th></tr></thead>
          <tbody>{logs.map((log) => <tr key={log.id}><td className="date-cell">{formatDate(log.action_time)}</td><td><b>{log.incident_label}</b><small className="activity-id">SAFE-{log.incident_id.toString().padStart(4, "0")}</small></td><td><span className="status-pill">{titleCase(log.event_type)}</span></td><td className="muted-cell">{log.admin_username || "User / system"}</td><td className="muted-cell">{log.remarks || "—"}</td></tr>)}</tbody>
        </table>{!loading && logs.length === 0 && <EmptyState title="No activity yet" description="Incident submissions and admin updates will appear here." />}{loading && <div className="catalog-loading">Loading activity...</div>}</div>
      </section>
    </>
  );
}

function MetricCard({ label, value, icon: Icon, tone, note, trend }: { label: string; value: number; icon: typeof Activity; tone: string; note: string; trend: React.ReactNode }) {
  return <article className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={19} /></div><div className="metric-trend">{trend}</div><div className="metric-label">{label}</div><div className="metric-value">{value.toLocaleString()}</div><div className="metric-note">{note}</div></article>;
}

function ReportTable({ reports, onOpen, compact = false }: { reports: Report[]; onOpen: (report: Report) => void; compact?: boolean }) {
  return <div className="table-scroll"><table><thead><tr><th>INCIDENT</th><th>LOCATION</th>{!compact && <th>REPORTER</th>}<th>SEVERITY</th><th>STATUS</th><th>SUBMITTED</th></tr></thead>
    <tbody>{reports.map((report) => <tr key={report.id} className="clickable-row" onClick={() => onOpen(report)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") onOpen(report); }}>
      <td><div className="incident-cell"><span className={`incident-dot ${report.severity}`} /><div><b>{report.incident_label}</b><small>SAFE-{report.id.toString().padStart(4, "0")}</small></div></div></td>
      <td><span className="location-cell"><MapPin size={13} />{report.building || "Unknown"}{report.floor ? ` · ${report.floor}` : ""}</span></td>
      {!compact && <td><div className="reporter-cell"><b>{report.reporter.name}</b><small>{report.reporter.email}</small></div></td>}
      <td><span className={`severity-badge ${report.severity}`}>{report.severity === "urgent" ? "Urgent" : "Minor"}</span></td>
      <td><span className={`status-pill ${report.status}`}>{titleCase(report.status)}</span></td>
      <td className="date-cell">{formatDate(report.created_at)}</td>
    </tr>)}</tbody></table>
    {reports.length === 0 && <EmptyState title="No reports found" description="New reports will appear here when submitted." />}
  </div>;
}

function Detail({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return <div className="detail-item"><div className="field-label">{label}</div><div className="detail-value">{icon}{value}</div>{sub && <small>{sub}</small>}</div>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><div className="empty-icon"><FileText size={22} /></div><b>{title}</b><p>{description}</p></div>;
}

export default AdminApp;
