import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api, apiConfigured } from "./src/api";

type User = {
  id: number;
  email: string;
  display_name: string;
  name: string;
  username: string;
  user_type: string;
  account_type?: string;
  student_id?: string;
  course?: string;
  phone_number?: string;
};

type IncidentType = {
  id: number;
  code: string;
  incident_name: string;
  priority_level: "urgent" | "minor";
  guidance: string;
};

type Report = {
  id: number;
  incident_label: string;
  severity: string;
  building: string;
  floor: string;
  description?: string;
  status: string;
  created_at: string;
};

type CaseRecord = {
  id: number;
  incident_label: string;
  severity: string;
  building: string;
  floor: string;
  description: string;
  status: string;
  response_eta_minutes: number;
  created_at: string;
  guidance?: string;
  patient: {
    id: number;
    name: string;
    email: string;
    phone_number: string;
    account_type: string;
    case_reference: string;
  } | null;
  timeline: Array<{ id: number; event_type: string; remarks: string; action_time: string; actor: string }>;
  notes: {
    diagnosis: string;
    doctor_notes: string;
    vital_signs: Record<string, string | number>;
    actions_taken: string[];
  } | null;
};

type CaseMessage = {
  id: number;
  message: string;
  created_at: string;
  sender_name: string;
  sender_role: string;
};

type Responder = {
  user_id: number;
  name: string;
  department: string;
  availability_status: "available" | "unavailable" | "on_break";
};

type Notice = {
  id: number;
  incident_id: number;
  incident_label: string;
  message: string;
  created_at: string;
  status: string;
};

type Dashboard = {
  incoming_count: number;
  active_count: number;
  resolved_today: number;
  urgent_open: number;
  responders_available: number;
  responders_total: number;
  unread_notifications: number;
  recent_cases: CaseRecord[];
};

type Patient = {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  reports_count: number;
  last_reported_at: string;
};

type ReportSummary = {
  period_start: string;
  total: number;
  urgent: number;
  resolved: number;
  resolution_rate: number;
  by_status: Array<{ status: string; count: number }>;
};

type Tab = "home" | "history" | "location" | "account";
type ClinicPage =
  | "overview" | "cases" | "patients" | "timeline"
  | "messages" | "reports" | "resources" | "settings" | "notifications";
type CaseBucket = "incoming" | "active" | "completed" | "all";
type ReportStep = "idle" | "incident" | "details" | "consent" | "sent";

const colors = {
  bg: "#080A0F",
  panel: "#10151E",
  panelAlt: "#151D29",
  text: "#F0F4FF",
  muted: "#91A0B8",
  line: "rgba(255,255,255,0.09)",
  red: "#EF4444",
  green: "#22C55E",
  blue: "#60A5FA",
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    let active = true;
    api<{ user: User }>("/api/auth/me/")
      .then((result) => {
        if (active) setUser(result.user);
      })
      .catch((error: unknown) => {
        if (active && error instanceof Error && !error.message.includes("HTTP 401")) {
          setSessionError(error.message);
        }
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const signOut = async () => {
    await api("/api/auth/logout/", { method: "POST" });
    setUser(null);
  };

  if (!apiConfigured) {
    return (
      <Frame>
        <Title>Connect SAFE to your computer</Title>
        <Card>
          <Body>Create expo-native/.env with EXPO_PUBLIC_API_URL=http://YOUR_PC_LAN_IP:8000.</Body>
          <Body>Start Django on 0.0.0.0:8000, then restart Expo with npm start -- --clear.</Body>
          <Body>Use your computer's Wi-Fi IPv4 address, not localhost or 127.0.0.1.</Body>
        </Card>
      </Frame>
    );
  }
  if (checkingSession) {
    return <Frame><ActivityIndicator color={colors.red} size="large" /><Body>Connecting to SAFE...</Body></Frame>;
  }
  if (!user) return <AuthScreen onAuthenticated={setUser} initialError={sessionError} />;
  if (user.user_type === "clinic_staff" || user.user_type === "responder") {
    return <ClinicScreen responderName={user.name} onLogout={signOut} />;
  }
  return <UserScreen user={user} onLogout={signOut} />;
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.app}>{children}</View>
    </SafeAreaView>
  );
}

function Body({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}

function SmallLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function ActionButton({
  label,
  onPress,
  disabled = false,
  tone = "red",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "red" | "green" | "neutral" | "blue";
}) {
  const backgroundColor = tone === "green" ? "#14532D"
    : tone === "neutral" ? colors.panelAlt
      : tone === "blue" ? "#172554" : "#7F1D1D";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 }]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label, value, onChangeText, placeholder, secureTextEntry = false,
  keyboardType, multiline = false, autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences" | "words";
}) {
  return (
    <View style={styles.field}>
      <SmallLabel>{label}</SmallLabel>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize ?? "sentences"}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#66758D"
        secureTextEntry={secureTextEntry}
        style={[styles.input, multiline && styles.multiline]}
        value={value}
      />
    </View>
  );
}

function ErrorBanner({ children }: { children: string }) {
  if (!children) return null;
  return (
    <View accessibilityRole="alert" style={styles.errorBox}>
      <Text style={styles.errorText}>{children}</Text>
    </View>
  );
}

function ScreenScroll({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

function AuthScreen({
  onAuthenticated, initialError,
}: {
  onAuthenticated: (user: User) => void;
  initialError: string;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [course, setCourse] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [accountType, setAccountType] = useState<"student" | "visitor">("student");
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      const result = mode === "login"
        ? await api<{ user: User }>("/api/auth/login/", {
            method: "POST",
            body: { identifier: identifier.trim(), password },
          })
        : await api<{ user: User }>("/api/auth/signup/", {
            method: "POST",
            body: {
              display_name: displayName, username, email, student_id: studentId,
              course, phone_number: phoneNumber, account_type: accountType, password,
            },
          });
      setPassword("");
      onAuthenticated(result.user);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Frame>
      <ScreenScroll>
        <View style={styles.brand}>
          <Text style={styles.brandMark}>SAFE</Text>
          <SmallLabel>RESPONSE NETWORK</SmallLabel>
          <Title>{mode === "login" ? "Welcome back" : "Create your account"}</Title>
          <Body>Sign in with your SAFE account to continue.</Body>
        </View>
        <View style={styles.row}>
          <ActionButton label="Log in" onPress={() => { setMode("login"); setError(""); }} tone={mode === "login" ? "red" : "neutral"} />
          <ActionButton label="Sign up" onPress={() => { setMode("signup"); setError(""); }} tone={mode === "signup" ? "red" : "neutral"} />
        </View>
        <Card>
          {mode === "signup" ? (
            <>
              <Field label="FULL NAME" value={displayName} onChangeText={setDisplayName} />
              <Field label="USERNAME" value={username} onChangeText={setUsername} autoCapitalize="none" />
              <View style={styles.row}>
                {(["student", "visitor"] as const).map((choice) => (
                  <ActionButton
                    key={choice}
                    label={capitalize(choice)}
                    onPress={() => setAccountType(choice)}
                    tone={accountType === choice ? "blue" : "neutral"}
                  />
                ))}
              </View>
              <Field label="EMAIL ADDRESS" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              <Field label="STUDENT ID" value={studentId} onChangeText={setStudentId} />
              <Field label="COURSE" value={course} onChangeText={setCourse} />
              <Field label="PHONE NUMBER" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
            </>
          ) : (
            <Field label="EMAIL OR USERNAME" value={identifier} onChangeText={setIdentifier} autoCapitalize="none" />
          )}
          <Field label="PASSWORD" value={password} onChangeText={setPassword} secureTextEntry />
          <ErrorBanner>{error}</ErrorBanner>
          <ActionButton label={busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"} disabled={busy} onPress={() => void submit()} />
          {mode === "signup" ? <Body>Demo signup is available only while the local Django server is in debug mode.</Body> : null}
        </Card>
        <Body style={styles.disclaimer}>Use fictional details for this demo. SAFE is not an emergency-services dispatcher.</Body>
      </ScreenScroll>
    </Frame>
  );
}

function UserScreen({ user, onLogout }: { user: User; onLogout: () => Promise<void> }) {
  const [tab, setTab] = useState<Tab>("home");
  const [step, setStep] = useState<ReportStep>("idle");
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentType | null>(null);
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [description, setDescription] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const startReport = async () => {
    setError("");
    setBusy(true);
    try {
      setIncidentTypes(await api<IncidentType[]>("/api/incident-types/"));
      setStep("incident");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load incident types.");
    } finally {
      setBusy(false);
    }
  };

  const resetReport = () => {
    setStep("idle");
    setSelectedIncident(null);
    setBuilding("");
    setFloor("");
    setDescription("");
    setAccepted(false);
    setAudioEnabled(true);
    setVideoEnabled(true);
    setError("");
  };

  const submitReport = async () => {
    if (!selectedIncident) return;
    setError("");
    setBusy(true);
    try {
      await api("/api/reports/", {
        method: "POST",
        body: {
          incident_id: selectedIncident.code,
          building: building.trim() || "Unknown",
          floor: floor.trim() || "Unknown",
          description: description.trim(),
          recording_notice_accepted: accepted,
          audio_enabled: audioEnabled,
          video_enabled: videoEnabled,
        },
      });
      setRefreshKey((value) => value + 1);
      setStep("sent");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save the report.");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    try {
      await onLogout();
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Could not sign out.");
    }
  };

  return (
    <Frame>
      <View style={styles.topbar}>
        <View><Text style={styles.brandMark}>SAFE</Text><Text style={styles.subtitle}>{user.display_name || user.name}</Text></View>
        <Text style={styles.network}>● ONLINE</Text>
      </View>
      <View style={styles.flex}>
        {tab === "home" && (
          <ScreenScroll>
            {step === "idle" && (
              <>
                <Card>
                  <SmallLabel>MEDICAL INCIDENT RESPONSE</SmallLabel>
                  <Title>Need help?</Title>
                  <Body>Start an incident report to alert the clinic response team.</Body>
                  <ActionButton label={busy ? "Loading..." : "Start an emergency report"} disabled={busy} onPress={() => void startReport()} />
                </Card>
                <Card><SmallLabel>IMPORTANT</SmallLabel><Body>This app records a report for the campus clinic. It does not dispatch an ambulance or contact emergency services.</Body></Card>
              </>
            )}
            {step === "incident" && (
              <>
                <Title>Select incident</Title>
                <Body>Choose the closest description of what happened.</Body>
                {incidentTypes.map((incident) => (
                  <Pressable key={incident.id} onPress={() => { setSelectedIncident(incident); setStep("details"); setError(""); }}>
                    <Card>
                      <SmallLabel>{incident.priority_level.toUpperCase()} PRIORITY</SmallLabel>
                      <Text style={styles.cardTitle}>{incident.incident_name}</Text>
                      <Body>{incident.guidance}</Body>
                    </Card>
                  </Pressable>
                ))}
                <ActionButton label="Cancel" onPress={resetReport} tone="neutral" />
              </>
            )}
            {step === "details" && (
              <>
                <Title>Incident details</Title>
                {selectedIncident ? <Body>{selectedIncident.incident_name}</Body> : null}
                <Card>
                  <Field label="BUILDING" value={building} onChangeText={setBuilding} placeholder="Building name" />
                  <Field label="FLOOR / ROOM" value={floor} onChangeText={setFloor} placeholder="Floor or room" />
                  <Field label="WHAT HAPPENED?" value={description} onChangeText={setDescription} multiline placeholder="Describe the situation and any actions already taken." />
                  <ActionButton label="Continue to notice" onPress={() => setStep("consent")} />
                  <ActionButton label="Back" onPress={() => setStep("incident")} tone="neutral" />
                </Card>
              </>
            )}
            {step === "consent" && (
              <>
                <Title>Recording notice</Title>
                <Card>
                  <SmallLabel>PLEASE REVIEW</SmallLabel>
                  <Body>This local demo stores the report details and recording preferences. It does not capture or upload audio or video.</Body>
                  <Body>Your report will be sent to authorized clinic staff. Do not include unnecessary sensitive information.</Body>
                  <ToggleRow checked={accepted} label="I understand and acknowledge the report notice." onPress={() => setAccepted((value) => !value)} />
                  <ToggleRow checked={audioEnabled} label={`Audio preference: ${audioEnabled ? "on" : "off"}`} onPress={() => setAudioEnabled((value) => !value)} />
                  <ToggleRow checked={videoEnabled} label={`Video preference: ${videoEnabled ? "on" : "off"}`} onPress={() => setVideoEnabled((value) => !value)} />
                  <ActionButton label={busy ? "Submitting..." : "Submit incident report"} disabled={!accepted || busy} onPress={() => void submitReport()} />
                  <ActionButton label="Back" onPress={() => setStep("details")} tone="neutral" />
                </Card>
              </>
            )}
            {step === "sent" && (
              <Card>
                <SmallLabel>REPORT SUBMITTED</SmallLabel>
                        <Title>Report sent to the clinic</Title>
                <Body>Your report has been sent to the clinic team. The app does not contact emergency services.</Body>
                <ActionButton label="Start another report" onPress={resetReport} tone="green" />
                <ActionButton label="View report history" onPress={() => { setTab("history"); resetReport(); }} tone="neutral" />
              </Card>
            )}
            <ErrorBanner>{error}</ErrorBanner>
          </ScreenScroll>
        )}
        {tab === "history" && <UserHistory refreshKey={refreshKey} />}
        {tab === "location" && <UserLocation />}
        {tab === "account" && (
          <ScreenScroll>
            <Title>Account</Title>
            <Card>
              <Body>{user.display_name || user.name}</Body>
              <Body>{user.email}</Body>
              <Body>{user.account_type ?? user.user_type}</Body>
              {user.student_id ? <Body>Student ID: {user.student_id}</Body> : null}
              {user.course ? <Body>Course: {user.course}</Body> : null}
              {user.phone_number ? <Body>Phone: {user.phone_number}</Body> : null}
              <ActionButton label="Sign out" onPress={() => void logout()} tone="neutral" />
            </Card>
            <ErrorBanner>{error}</ErrorBanner>
          </ScreenScroll>
        )}
      </View>
      <TabBar active={tab} onChange={setTab} items={[
        ["home", "Home"], ["history", "History"], ["location", "Location"], ["account", "Account"],
      ]} />
    </Frame>
  );
}

function ToggleRow({ checked, label, onPress }: { checked: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.checkRow}>
      <Text style={styles.check}>{checked ? "☑" : "□"}</Text>
      <Body>{label}</Body>
    </Pressable>
  );
}

function UserHistory({ refreshKey }: { refreshKey: number }) {
  const [historyView, setHistoryView] = useState<"mine" | "recent">("mine");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReport, setSelectedReport] = useState<number | null>(null);
  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api<Report[]>(historyView === "mine" ? "/api/reports/" : "/api/reports/recent/")
      .then((items) => { if (active) setReports(items); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load report history.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [historyView, refreshKey]);

  const toggleMessages = async (reportId: number) => {
    if (selectedReport === reportId) {
      setSelectedReport(null);
      return;
    }
    setSelectedReport(reportId);
    setError("");
    try {
      setMessages(await api<CaseMessage[]>(`/api/reports/${reportId}/messages/`));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load messages.");
    }
  };

  const sendMessage = async () => {
    if (selectedReport === null || !draft.trim()) return;
    setError("");
    try {
      const sent = await api<CaseMessage>(`/api/reports/${selectedReport}/messages/`, {
        method: "POST",
        body: { message: draft.trim() },
      });
      setMessages((current) => [...current, sent]);
      setDraft("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send message.");
    }
  };

  return (
    <ScreenScroll>
      <Title>Report history</Title>
      <View style={styles.row}>
        <ActionButton label="My reports" onPress={() => setHistoryView("mine")} tone={historyView === "mine" ? "blue" : "neutral"} />
        <ActionButton label="Recent · 7 days" onPress={() => setHistoryView("recent")} tone={historyView === "recent" ? "blue" : "neutral"} />
      </View>
      <Body>{historyView === "mine" ? "Reports submitted by your account." : "Recent summaries. Reporter details are not shown."}</Body>
      {loading ? <ActivityIndicator color={colors.red} /> : null}
      <ErrorBanner>{error}</ErrorBanner>
      {!loading && reports.length === 0 ? <Card><Body>No reports in this view yet.</Body></Card> : null}
      {reports.map((report) => (
        <Card key={report.id}>
          <SmallLabel>{report.status.toUpperCase()} · {report.severity.toUpperCase()}</SmallLabel>
          <Text style={styles.cardTitle}>{report.incident_label}</Text>
          <Body>{[report.building, report.floor].filter(Boolean).join(" · ") || "Location not provided"}</Body>
          <Body>{formatDate(report.created_at)}</Body>
          {historyView === "mine" && report.description ? <Body>{report.description}</Body> : null}
          {historyView === "mine" ? (
            <>
              <ActionButton label={selectedReport === report.id ? "Hide secure messages" : "Secure messages"} onPress={() => void toggleMessages(report.id)} tone="blue" />
              {selectedReport === report.id ? (
                <>
                  {messages.map((message) => (
                    <View key={message.id} style={styles.message}>
                      <SmallLabel>{message.sender_name} · {message.sender_role}</SmallLabel>
                      <Body>{message.message}</Body>
                    </View>
                  ))}
                  <Field label="MESSAGE CLINIC STAFF" value={draft} onChangeText={setDraft} multiline />
                  <ActionButton label="Send message" onPress={() => void sendMessage()} disabled={!draft.trim()} tone="blue" />
                </>
              ) : null}
            </>
          ) : null}
        </Card>
      ))}
    </ScreenScroll>
  );
}

function UserLocation() {
  return (
    <ScreenScroll>
      <Title>Location</Title>
      <Card><SmallLabel>REPORT LOCATION</SmallLabel><Body>Enter your building and room in the incident report. This demo does not collect device location.</Body></Card>
      <Card><SmallLabel>RESPONSE NETWORK</SmallLabel><Body>Use an accurate building and room so responders can find you quickly.</Body></Card>
    </ScreenScroll>
  );
}

function ClinicScreen({ responderName, onLogout }: { responderName: string; onLogout: () => Promise<void> }) {
  const [page, setPage] = useState<ClinicPage>("overview");
  const [responder, setResponder] = useState<Responder | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [vitals, setVitals] = useState("{}");
  const [actionsTaken, setActionsTaken] = useState("");
  const [bucket, setBucket] = useState<CaseBucket>("incoming");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadOverview = async () => {
    try {
      const [dashboardData, noticeData] = await Promise.all([
        api<Dashboard>("/api/clinic/dashboard/"),
        api<Notice[]>("/api/clinic/notifications/"),
      ]);
      setDashboard(dashboardData);
      setNotices(noticeData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load clinic dashboard.");
    }
  };

  const loadCases = async () => {
    setLoading(true);
    setError("");
    try {
      setCases(await api<CaseRecord[]>(
        `/api/clinic/cases/?bucket=${bucket}&q=${encodeURIComponent(search)}`,
      ));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load cases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    api<Responder>("/api/clinic/session/")
      .then((account) => { if (active) setResponder(account); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not verify clinic account.");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!responder) return;
    void loadOverview();
    const timer = setInterval(() => void loadOverview(), 20000);
    return () => clearInterval(timer);
  }, [responder]);

  useEffect(() => {
    if (page === "cases" && !selectedCase) void loadCases();
  }, [page, bucket, search, selectedCase]);

  useEffect(() => {
    if (page !== "timeline" && page !== "messages") return;
    let active = true;
    api<CaseRecord[]>("/api/clinic/cases/?bucket=all")
      .then((items) => { if (active) setCases(items); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load cases.");
      });
    return () => { active = false; };
  }, [page]);

  useEffect(() => {
    if (page !== "patients") return;
    let active = true;
    api<Patient[]>(`/api/clinic/patients/?q=${encodeURIComponent(search)}`)
      .then((items) => { if (active) setPatients(items); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load patients.");
      });
    return () => { active = false; };
  }, [page, search]);

  useEffect(() => {
    if (page !== "reports") return;
    api<ReportSummary>("/api/clinic/reports/")
      .then(setReport)
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Could not load clinic reports.");
      });
  }, [page]);

  const openCase = async (caseId: number) => {
    setError("");
    setLoading(true);
    try {
      const [detail, caseMessages] = await Promise.all([
        api<CaseRecord>(`/api/clinic/cases/${caseId}/`),
        api<CaseMessage[]>(`/api/clinic/cases/${caseId}/messages/`),
      ]);
      setSelectedCase(detail);
      setMessages(caseMessages);
      setDiagnosis(detail.notes?.diagnosis ?? "");
      setDoctorNotes(detail.notes?.doctor_notes ?? "");
      setVitals(JSON.stringify(detail.notes?.vital_signs ?? {}, null, 2));
      setActionsTaken((detail.notes?.actions_taken ?? []).join("\n"));
      setDraftMessage("");
      setPage("cases");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not open case.");
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (action: string, message?: string) => {
    if (!selectedCase) return;
    setError("");
    setLoading(true);
    try {
      const result = await api<{ case: CaseRecord }>(`/api/clinic/cases/${selectedCase.id}/actions/`, {
        method: "POST", body: { action, message },
      });
      setSelectedCase(result.case);
      if (action === "request_more_info") {
        setMessages(await api<CaseMessage[]>(`/api/clinic/cases/${selectedCase.id}/messages/`));
        setDraftMessage("");
      }
      await loadOverview();
      if (action === "request_ambulance") {
        setError("Request recorded for the clinic team only; it does not contact emergency services.");
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not complete case action.");
    } finally {
      setLoading(false);
    }
  };

  const saveNotes = async () => {
    if (!selectedCase) return;
    setError("");
    let parsedVitals: Record<string, string | number>;
    try {
      const parsed: unknown = JSON.parse(vitals);
      if (!isVitalSigns(parsed)) {
        throw new Error('Vitals must be a JSON object with up to 12 entries, for example {"pulse": 78}.');
      }
      parsedVitals = parsed;
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Vitals must be valid JSON.");
      return;
    }
    setLoading(true);
    try {
      const updatedNotes = await api<NonNullable<CaseRecord["notes"]>>(
        `/api/clinic/cases/${selectedCase.id}/notes/`,
        { method: "PUT", body: {
          diagnosis, doctor_notes: doctorNotes, vital_signs: parsedVitals,
          actions_taken: actionsTaken.split("\n").map((item) => item.trim()).filter(Boolean),
        } },
      );
      setSelectedCase({ ...selectedCase, notes: updatedNotes });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save notes.");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (caseId: number) => {
    if (!draftMessage.trim()) return;
    try {
      const sent = await api<CaseMessage>(`/api/clinic/cases/${caseId}/messages/`, {
        method: "POST", body: { message: draftMessage.trim() },
      });
      setMessages((current) => [...current, sent]);
      setDraftMessage("");
    } catch (messageError) {
      setError(messageError instanceof Error ? messageError.message : "Could not send message.");
    }
  };

  const updateAvailability = async (value: Responder["availability_status"]) => {
    try {
      setResponder(await api<Responder>("/api/clinic/availability/", {
        method: "PATCH", body: { availability_status: value },
      }));
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

  const logout = async () => {
    try {
      await onLogout();
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Could not sign out.");
    }
  };

  const pageItems: Array<[ClinicPage, string]> = [
    ["overview", "Overview"], ["cases", "Cases"], ["patients", "Patients"],
    ["timeline", "Timeline"], ["messages", "Messages"], ["reports", "Reports"],
    ["resources", "Resources"], ["settings", "Settings"],
  ];
  const navigate = (nextPage: ClinicPage) => {
    setPage(nextPage);
    if (nextPage !== "cases") setSelectedCase(null);
    setError("");
  };

  return (
    <Frame>
      <View style={styles.topbar}>
        <View><Text style={styles.brandMark}>SAFE CLINIC</Text><Text style={styles.subtitle}>{responder?.name ?? responderName}</Text></View>
        <Pressable onPress={() => navigate("notifications")}>
          <Text style={styles.network}>Alerts {notices.filter((item) => item.status === "new").length}</Text>
        </Pressable>
      </View>
      <View style={styles.clinicNav}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {pageItems.map(([id, label]) => (
            <Pressable key={id} onPress={() => navigate(id)} style={[styles.navItem, page === id && styles.navItemActive]}>
              <Text style={[styles.navText, page === id && styles.navTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <View style={styles.flex}>
        <ErrorBanner>{error}</ErrorBanner>
        {page === "overview" && (
          <ScreenScroll>
            <Title>Clinic dashboard</Title>
            <View style={styles.metricGrid}>
              <Metric label="Incoming" value={dashboard?.incoming_count} />
              <Metric label="Active" value={dashboard?.active_count} />
              <Metric label="Urgent open" value={dashboard?.urgent_open} />
              <Metric label="Resolved today" value={dashboard?.resolved_today} />
            </View>
            <Card>
              <SmallLabel>RESPONDER COVERAGE</SmallLabel>
              <Body>{dashboard?.responders_available ?? "—"} available / {dashboard?.responders_total ?? "—"} active</Body>
              <Body>{dashboard?.unread_notifications ?? 0} unread notifications</Body>
            </Card>
            <SmallLabel>RECENT CASES</SmallLabel>
            {(dashboard?.recent_cases ?? []).map((record) => <CaseCard key={record.id} record={record} onPress={() => void openCase(record.id)} />)}
            <ActionButton label="Open case queue" onPress={() => navigate("cases")} tone="blue" />
          </ScreenScroll>
        )}
        {page === "cases" && (
          <ScreenScroll>
            {selectedCase ? (
              <CaseDetail
                record={selectedCase} messages={messages} draft={draftMessage}
                diagnosis={diagnosis} doctorNotes={doctorNotes} vitals={vitals}
                actionsTaken={actionsTaken} busy={loading}
                onBack={() => setSelectedCase(null)}
                onAction={(action, message) => void performAction(action, message)}
                onDiagnosis={setDiagnosis} onDoctorNotes={setDoctorNotes}
                onVitals={setVitals} onActionsTaken={setActionsTaken}
                onSaveNotes={() => void saveNotes()} onDraft={setDraftMessage}
                onSendMessage={() => void sendMessage(selectedCase.id)}
              />
            ) : (
              <>
                <Title>Case queue</Title>
                <Field label="SEARCH CASES" value={search} onChangeText={setSearch} placeholder="Patient, incident, location..." />
                <View style={styles.row}>
                  {(["incoming", "active", "completed", "all"] as const).map((value) => (
                    <ActionButton key={value} label={capitalize(value)} onPress={() => setBucket(value)} tone={bucket === value ? "blue" : "neutral"} />
                  ))}
                </View>
                {loading ? <ActivityIndicator color={colors.red} /> : null}
                {cases.map((record) => <CaseCard key={record.id} record={record} onPress={() => void openCase(record.id)} />)}
                {!loading && cases.length === 0 ? <Card><Body>No cases in this queue.</Body></Card> : null}
              </>
            )}
          </ScreenScroll>
        )}
        {page === "patients" && (
          <ScreenScroll>
            <Title>Patients</Title>
            <Field label="SEARCH PATIENTS" value={search} onChangeText={setSearch} placeholder="Name or email" />
            {patients.map((patient) => (
              <Card key={patient.id}>
                <Text style={styles.cardTitle}>{patient.name}</Text>
                <Body>{patient.email}</Body><Body>{patient.phone_number || "No phone number"}</Body>
                <Body>{patient.reports_count} reports · last {formatDate(patient.last_reported_at)}</Body>
              </Card>
            ))}
            {patients.length === 0 ? <Body>No patient records found.</Body> : null}
          </ScreenScroll>
        )}
        {page === "timeline" && (
          <ScreenScroll>
            <Title>Incident timeline</Title>
            {sortByDate(cases).map((record) => <CaseCard key={record.id} record={record} onPress={() => void openCase(record.id)} />)}
          </ScreenScroll>
        )}
        {page === "messages" && (
          <ScreenScroll>
            <Title>Case messages</Title>
            {cases.map((record) => (
              <Card key={record.id}>
                <Text style={styles.cardTitle}>#{record.id} · {record.incident_label}</Text>
                <Body>{record.patient?.name ?? "Patient"} · {record.status}</Body>
                <ActionButton label="Open messages" onPress={() => void openCase(record.id)} tone="blue" />
              </Card>
            ))}
          </ScreenScroll>
        )}
        {page === "reports" && (
          <ScreenScroll>
            <Title>Reports · past 30 days</Title>
            <View style={styles.metricGrid}>
              <Metric label="Total" value={report?.total} />
              <Metric label="Urgent" value={report?.urgent} />
              <Metric label="Resolved" value={report?.resolved} />
              <Metric label="Resolution rate" value={report ? `${report.resolution_rate}%` : undefined} />
            </View>
            {report?.by_status.map((item) => <Card key={item.status}><Body>{capitalize(item.status.replaceAll("_", " "))}: {item.count}</Body></Card>)}
          </ScreenScroll>
        )}
        {page === "resources" && (
          <ScreenScroll>
            <Title>Clinic resources</Title>
            <Card><SmallLabel>RESPONSE REMINDER</SmallLabel><Body>Review incident details and location before contacting the patient.</Body><Body>Use case notes to record diagnosis, vitals, and actions taken.</Body></Card>
            <Card><SmallLabel>EMERGENCY SERVICES</SmallLabel><Body>An ambulance request in SAFE is recorded for the clinic team only. It does not contact emergency services.</Body></Card>
          </ScreenScroll>
        )}
        {page === "settings" && (
          <ScreenScroll>
            <Title>Responder settings</Title>
            <Card>
              <SmallLabel>AVAILABILITY</SmallLabel>
              {(["available", "on_break", "unavailable"] as const).map((value) => (
                <ActionButton key={value} label={`${value === responder?.availability_status ? "✓ " : ""}${capitalize(value.replaceAll("_", " "))}`} onPress={() => void updateAvailability(value)} tone={value === responder?.availability_status ? "green" : "neutral"} />
              ))}
            </Card>
            <Card><Body>{responder?.name ?? responderName}</Body><Body>{responder?.department}</Body><ActionButton label="Sign out" onPress={() => void logout()} tone="neutral" /></Card>
          </ScreenScroll>
        )}
        {page === "notifications" && (
          <ScreenScroll>
            <Title>Notifications</Title>
            {notices.map((notice) => (
              <Card key={notice.id}>
                <SmallLabel>{notice.status.toUpperCase()} · {formatDate(notice.created_at)}</SmallLabel>
                <Text style={styles.cardTitle}>{notice.incident_label}</Text><Body>{notice.message}</Body>
                <View style={styles.row}>
                  <ActionButton label="Open case" onPress={() => void openCase(notice.incident_id)} tone="blue" />
                  {notice.status === "new" ? <ActionButton label="Mark read" onPress={() => void markRead(notice)} tone="neutral" /> : null}
                </View>
              </Card>
            ))}
            {notices.length === 0 ? <Body>No notifications.</Body> : null}
          </ScreenScroll>
        )}
      </View>
    </Frame>
  );
}

function Metric({ label, value }: { label: string; value: string | number | undefined }) {
  return <Card style={styles.metric}><SmallLabel>{label.toUpperCase()}</SmallLabel><Text style={styles.metricValue}>{value ?? "—"}</Text></Card>;
}

function CaseCard({ record, onPress }: { record: CaseRecord; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card>
        <SmallLabel>{record.severity.toUpperCase()} · {record.status.replaceAll("_", " ").toUpperCase()}</SmallLabel>
        <Text style={styles.cardTitle}>{record.incident_label}</Text>
        <Body>{record.patient?.name ?? "Unknown patient"} · {[record.building, record.floor].filter(Boolean).join(" · ")}</Body>
        <Body>{formatDate(record.created_at)}</Body>
      </Card>
    </Pressable>
  );
}

function CaseDetail({
  record, messages, draft, diagnosis, doctorNotes, vitals, actionsTaken, busy,
  onBack, onAction, onDiagnosis, onDoctorNotes, onVitals, onActionsTaken,
  onSaveNotes, onDraft, onSendMessage,
}: {
  record: CaseRecord;
  messages: CaseMessage[];
  draft: string;
  diagnosis: string;
  doctorNotes: string;
  vitals: string;
  actionsTaken: string;
  busy: boolean;
  onBack: () => void;
  onAction: (action: string, message?: string) => void;
  onDiagnosis: (value: string) => void;
  onDoctorNotes: (value: string) => void;
  onVitals: (value: string) => void;
  onActionsTaken: (value: string) => void;
  onSaveNotes: () => void;
  onDraft: (value: string) => void;
  onSendMessage: () => void;
}) {
  return (
    <>
      <ActionButton label="← Back to cases" onPress={onBack} tone="neutral" />
      <Title>{record.incident_label}</Title>
      <Card>
        <SmallLabel>CASE #{record.id} · {record.status.toUpperCase()}</SmallLabel>
        <Body>{record.patient?.name ?? "Unknown patient"} · {record.patient?.email}</Body>
        <Body>{record.patient?.phone_number}</Body>
        <Body>{[record.building, record.floor].filter(Boolean).join(" · ")}</Body>
        <Body>{record.description || "No additional details."}</Body>
        <Body>Response ETA: {record.response_eta_minutes} minutes</Body>
        {record.guidance ? <Body>{record.guidance}</Body> : null}
      </Card>
      <Card>
        <SmallLabel>CASE ACTIONS</SmallLabel>
        <ActionButton label="Acknowledge case" onPress={() => onAction("accept")} disabled={busy} tone="blue" />
        <ActionButton label="Start response" onPress={() => onAction("start_response")} disabled={busy} tone="green" />
        <ActionButton label="Resolve case" onPress={() => onAction("resolve")} disabled={busy} tone="green" />
        <ActionButton label="Record ambulance request" onPress={() => onAction("request_ambulance")} disabled={busy} tone="neutral" />
        <Field label="MESSAGE FOR PATIENT (OPTIONAL)" value={draft} onChangeText={onDraft} multiline />
        <ActionButton label="Request more information" onPress={() => onAction("request_more_info", draft)} disabled={busy || !draft.trim()} tone="blue" />
      </Card>
      <Card>
        <SmallLabel>CLINICAL NOTES</SmallLabel>
        <Field label="DIAGNOSIS" value={diagnosis} onChangeText={onDiagnosis} />
        <Field label="DOCTOR NOTES" value={doctorNotes} onChangeText={onDoctorNotes} multiline />
        <Field label="VITAL SIGNS (JSON)" value={vitals} onChangeText={onVitals} multiline />
        <Field label="ACTIONS TAKEN (ONE PER LINE)" value={actionsTaken} onChangeText={onActionsTaken} multiline />
        <ActionButton label={busy ? "Saving..." : "Save notes"} onPress={onSaveNotes} disabled={busy} tone="blue" />
      </Card>
      <Card>
        <SmallLabel>SECURE MESSAGES</SmallLabel>
        {messages.map((message) => (
          <View key={message.id} style={styles.message}>
            <SmallLabel>{message.sender_name} · {message.sender_role}</SmallLabel><Body>{message.message}</Body>
          </View>
        ))}
        {messages.length === 0 ? <Body>No messages yet.</Body> : null}
        <Field label="MESSAGE PATIENT" value={draft} onChangeText={onDraft} multiline />
        <ActionButton label="Send message" onPress={onSendMessage} disabled={!draft.trim()} tone="blue" />
      </Card>
      <Card>
        <SmallLabel>ACTIVITY</SmallLabel>
        {record.timeline.map((event) => <Body key={event.id}>{formatDate(event.action_time)} · {event.actor}: {event.remarks}</Body>)}
      </Card>
    </>
  );
}

function TabBar({
  active, onChange, items,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
  items: Array<[Tab, string]>;
}) {
  return (
    <View style={styles.tabbar}>
      {items.map(([id, label]) => (
        <Pressable key={id} accessibilityRole="tab" onPress={() => onChange(id)} style={styles.tab}>
          <Text style={[styles.tabText, active === id && styles.tabTextActive]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function capitalize(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sortByDate(cases: CaseRecord[]): CaseRecord[] {
  return [...cases].sort((left, right) => right.created_at.localeCompare(left.created_at));
}

function isVitalSigns(value: unknown): value is Record<string, string | number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return entries.length <= 12 && entries.every(([key, item]) =>
    key.length <= 40
    && (typeof item === "string" || typeof item === "number")
    && String(item).length <= 40
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  app: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scrollContent: { padding: 18, paddingBottom: 36, gap: 12 },
  topbar: {
    minHeight: 66, paddingHorizontal: 18, paddingVertical: 12,
    backgroundColor: "#0A0C12", borderBottomWidth: 1, borderBottomColor: colors.line,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  brand: { gap: 8, paddingVertical: 16 },
  brandMark: { color: colors.red, fontSize: 18, fontWeight: "900", letterSpacing: 2 },
  network: { color: colors.green, fontSize: 11, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  label: { color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1.1, marginBottom: 6 },
  title: { color: colors.text, fontSize: 23, fontWeight: "800", marginVertical: 6 },
  body: { color: "#C8D6F0", fontSize: 14, lineHeight: 21, marginVertical: 3 },
  card: {
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line,
    borderRadius: 16, padding: 15, gap: 9,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  button: {
    minHeight: 44, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    alignItems: "center", justifyContent: "center", flex: 1,
  },
  buttonText: { color: colors.text, fontSize: 13, fontWeight: "700", textAlign: "center" },
  row: { flexDirection: "row", gap: 8 },
  field: { gap: 3, marginVertical: 3 },
  input: {
    minHeight: 46, color: colors.text, backgroundColor: "#0A0D13",
    borderColor: colors.line, borderWidth: 1, borderRadius: 11,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  multiline: { minHeight: 96, textAlignVertical: "top" },
  errorBox: { padding: 12, backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.38)", borderWidth: 1, borderRadius: 12 },
  errorText: { color: "#FCA5A5", fontSize: 13, lineHeight: 19 },
  disclaimer: { color: colors.muted, fontSize: 11, marginBottom: 12 },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 9, paddingVertical: 5 },
  check: { color: colors.red, fontSize: 20 },
  tabbar: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 10, borderTopWidth: 1, borderColor: colors.line, backgroundColor: "#0D1525" },
  tab: { flex: 1, alignItems: "center", paddingVertical: 5 },
  tabText: { color: "#64748B", fontSize: 11, fontWeight: "600" },
  tabTextActive: { color: "#00D4AA" },
  clinicNav: { borderBottomWidth: 1, borderColor: colors.line, backgroundColor: "#0A0C12" },
  navItem: { paddingHorizontal: 13, paddingVertical: 13 },
  navItemActive: { borderBottomWidth: 2, borderBottomColor: colors.red },
  navText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  navTextActive: { color: colors.text },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: { width: "48%", minHeight: 84, justifyContent: "center" },
  metricValue: { color: colors.text, fontSize: 24, fontWeight: "800" },
  message: { padding: 10, borderRadius: 10, backgroundColor: colors.panelAlt, marginVertical: 4 },
});
