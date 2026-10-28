import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
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
  contact_number?: string;
  username?: string;
  email?: string;
  user_type?: string;
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
  | "messages" | "reports" | "resources" | "settings" | "notifications" | "more";
type ClinicTab = "overview" | "cases" | "patients" | "messages" | "more";
type CaseBucket = "incoming" | "active" | "completed" | "all";
type ReportStep = "idle" | "incident" | "details" | "consent" | "sent";

const colors = {
  bg: "#07111C",
  panel: "#0E1B2A",
  panelAlt: "#16283A",
  text: "#F3F7FC",
  muted: "#96A9BF",
  line: "rgba(180,205,230,0.12)",
  red: "#F15A4A",
  green: "#38C6A5",
  blue: "#5BB6D5",
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
        <View style={styles.connectionState}>
          <Text style={styles.brandMark}>SAFE</Text>
          <Title>Connect to your SAFE server</Title>
          <Card>
            <Body>Create expo-native/.env with EXPO_PUBLIC_API_URL set to your computer's Wi-Fi IPv4 address.</Body>
            <Body>Start Django on 0.0.0.0:8000, then restart Expo with npm run start:mobile -- --clear.</Body>
            <Body>Do not use localhost or 127.0.0.1 on a physical phone.</Body>
          </Card>
        </View>
      </Frame>
    );
  }
  if (checkingSession) {
    return (
      <Frame>
        <View style={styles.connectionState}>
          <ActivityIndicator color={colors.red} size="large" />
          <Title>Connecting securely</Title>
          <Body>Checking your SAFE account…</Body>
        </View>
      </Frame>
    );
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
  variant,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "red" | "green" | "neutral" | "blue";
  variant?: "clinic";
}) {
  const backgroundColor = tone === "green" ? "#17634F"
    : tone === "neutral" ? colors.panelAlt
      : tone === "blue" ? "#16495C" : "#B94034";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, variant === "clinic" && styles.clinicButton, { backgroundColor, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 }]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label, value, onChangeText, placeholder, secureTextEntry = false,
  keyboardType, multiline = false, autoCapitalize, variant,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences" | "words";
  variant?: "clinic";
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
        placeholderTextColor={variant === "clinic" ? "#8B9890" : "#66758D"}
        secureTextEntry={secureTextEntry}
        style={[styles.input, variant === "clinic" && styles.clinicInput, multiline && styles.multiline]}
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

function ScreenScroll({ children, variant }: { children: React.ReactNode; variant?: "clinic" }) {
  return (
    <ScrollView
      style={[styles.flex, variant === "clinic" && styles.clinicScroll]}
      contentContainerStyle={[styles.scrollContent, variant === "clinic" && styles.clinicScrollContent]}
      keyboardShouldPersistTaps="handled"
    >
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
        <View style={styles.authShell}>
          <View style={styles.brand}>
            <View style={styles.brandRow}>
              <View style={styles.brandGlyph}><Text style={styles.brandGlyphText}>S</Text></View>
              <View>
                <Text style={styles.brandMark}>SAFE</Text>
                <Text style={styles.brandCaption}>RESPONSE NETWORK</Text>
              </View>
            </View>
            <Text style={styles.authTitle}>{mode === "login" ? "Welcome back." : "Create your account."}</Text>
            <Body>Sign in with your SAFE account to continue.</Body>
          </View>
          <View style={styles.segmented}>
            {(["login", "signup"] as const).map((choice) => (
              <Pressable
                key={choice}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === choice }}
                onPress={() => { setMode(choice); setError(""); }}
                style={[styles.segment, mode === choice && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, mode === choice && styles.segmentTextActive]}>
                  {choice === "login" ? "Log in" : "Create account"}
                </Text>
              </Pressable>
            ))}
          </View>
          <Card style={styles.authCard}>
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
        </View>
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
                <Card style={styles.heroCard}>
                  <SmallLabel>CAMPUS RESPONSE</SmallLabel>
                  <Text style={styles.heroTitle}>Need help?</Text>
                  <Body>Send your location and incident details directly to the campus clinic team.</Body>
                  <ActionButton label={busy ? "Loading..." : "Start an emergency report"} disabled={busy} onPress={() => void startReport()} />
                </Card>
                <Card style={styles.noticeCard}>
                  <SmallLabel>IMPORTANT</SmallLabel>
                  <Body>This app does not contact emergency services or dispatch an ambulance. Call your local emergency number if you need immediate help.</Body>
                </Card>
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
        ["home", "Home", "⌂"],
        ["history", "History", "◷"],
        ["location", "Location", "⌖"],
        ["account", "Account", "♙"],
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
  const [incomingCases, setIncomingCases] = useState<CaseRecord[]>([]);
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
      const [dashboardData, noticeData, incomingData] = await Promise.all([
        api<Dashboard>("/api/clinic/dashboard/"),
        api<Notice[]>("/api/clinic/notifications/"),
        api<CaseRecord[]>("/api/clinic/cases/?bucket=incoming"),
      ]);
      setDashboard(dashboardData);
      setNotices(noticeData);
      setIncomingCases(incomingData);
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

  const callPatient = async (phoneNumber: string) => {
    try {
      await Linking.openURL(`tel:${phoneNumber}`);
    } catch (callError) {
      setError(callError instanceof Error ? callError.message : "Could not open the phone app.");
    }
  };

  const pageItems: Array<[ClinicTab, string, string]> = [
    ["overview", "Home", "⌂"],
    ["cases", "Cases", "▤"],
    ["patients", "Patients", "♙"],
    ["messages", "Messages", "✉"],
    ["more", "More", "•••"],
  ];
  const moreItems: Array<[ClinicPage, string, string, string]> = [
    ["timeline", "Incident timeline", "Review recent case activity", "◷"],
    ["reports", "Reports", "Clinic activity summary", "▥"],
    ["resources", "Resources", "Response guidance and reminders", "♡"],
    ["settings", "Settings", "Responder profile and availability", "⚙"],
    ["notifications", "Notifications", "Assigned case alerts", "♢"],
  ];
  const isMorePage = page === "timeline" || page === "reports" || page === "resources"
    || page === "settings" || page === "notifications";
  const activeTab: ClinicTab = isMorePage ? "more" : page;
  const navigate = (nextPage: ClinicPage) => {
    setPage(nextPage);
    if (nextPage !== "cases") setSelectedCase(null);
    setError("");
  };

  return (
    <Frame>
      <View style={styles.clinicApp}>
      <View style={[styles.topbar, styles.clinicTopbar]}>
        <View><Text style={[styles.brandMark, styles.clinicBrandMark]}>SAFE CLINIC</Text><Text style={[styles.subtitle, styles.clinicSubtitle]}>{responder?.name ?? responderName}</Text></View>
        <Pressable onPress={() => navigate("notifications")}>
          <Text style={styles.network}>Alerts {notices.filter((item) => item.status === "new").length}</Text>
        </Pressable>
      </View>
      <View style={[styles.flex, styles.clinicContent]}>
        <ErrorBanner>{error}</ErrorBanner>
        {page === "overview" && (
          <ScreenScroll variant="clinic">
            <View style={styles.clinicWelcome}>
              <View>
                <Text style={styles.clinicMetricLabel}>SAFE RESPONSE NETWORK</Text>
                <Text style={styles.clinicWelcomeTitle}>Clinic dashboard</Text>
                <Body>Welcome, {(responder?.name ?? responderName).split(" ")[0]}</Body>
              </View>
              <Pressable style={styles.alertButton} onPress={() => navigate("notifications")} accessibilityLabel="Open notifications">
                <Text style={styles.alertButtonIcon}>♢</Text>
                {notices.some((item) => item.status === "new") ? <Text style={styles.alertBadge}>{notices.filter((item) => item.status === "new").length}</Text> : null}
              </Pressable>
            </View>
            <View style={styles.metricGrid}>
              <Metric label="Incoming" value={dashboard?.incoming_count} tone="red" />
              <Metric label="Active" value={dashboard?.active_count} tone="blue" />
              <Metric label="Urgent" value={dashboard?.urgent_open} tone="amber" />
              <Metric label="Resolved today" value={dashboard?.resolved_today} tone="green" />
            </View>
            <Card style={styles.mobileSectionCard}>
              <View style={styles.sectionHeading}>
                <View><Text style={styles.sectionTitle}>Incoming cases</Text><Text style={styles.sectionCaption}>Select a case to review patient details</Text></View>
                <Pressable onPress={() => navigate("cases")}><Text style={styles.sectionLink}>View all →</Text></Pressable>
              </View>
              {incomingCases.slice(0, 6).map((record) => <CaseCard key={record.id} record={record} onPress={() => void openCase(record.id)} />)}
              {incomingCases.length === 0
                ? <Text style={styles.emptyCases}>No open cases right now.</Text>
                : null}
            </Card>
            <Card style={styles.mobileSectionCard}>
              <View style={styles.sectionHeading}>
                <View><Text style={styles.sectionTitle}>Clinic capacity</Text><Text style={styles.sectionCaption}>Responder availability</Text></View>
                <Text style={styles.capacityPercent}>
                  {dashboard?.responders_total ? `${Math.round((dashboard.responders_available / dashboard.responders_total) * 100)}%` : "—"}
                </Text>
              </View>
              <View style={styles.capacityTrack}>
                <View style={[styles.capacityFill, { width: `${dashboard?.responders_total ? Math.min(100, Math.round((dashboard.responders_available / dashboard.responders_total) * 100)) : 0}%` }]} />
              </View>
              <View style={styles.capacityStats}>
                <View style={styles.capacityStat}><Text style={styles.capacityStatValue}>{dashboard?.responders_available ?? "—"}</Text><Text style={styles.capacityStatLabel}>Available</Text></View>
                <View style={styles.capacityDivider} />
                <View style={styles.capacityStat}><Text style={styles.capacityStatValue}>{dashboard?.responders_total ?? "—"}</Text><Text style={styles.capacityStatLabel}>Active responders</Text></View>
                <View style={styles.capacityDivider} />
                <View style={styles.capacityStat}><Text style={styles.capacityStatValue}>{dashboard?.unread_notifications ?? 0}</Text><Text style={styles.capacityStatLabel}>New alerts</Text></View>
              </View>
            </Card>
            {responder ? (
              <Card style={styles.mobileSectionCard}>
                <View style={styles.sectionHeading}>
                  <View><Text style={styles.sectionTitle}>Responder profile</Text><Text style={styles.sectionCaption}>ERD responder account details</Text></View>
                  <Pressable onPress={() => navigate("settings")}><Text style={styles.sectionLink}>Manage</Text></Pressable>
                </View>
                <View style={styles.responderSummary}>
                  <View style={styles.responderAvatar}><Text style={styles.responderAvatarText}>{responder.name.slice(0, 1).toUpperCase()}</Text></View>
                  <View style={styles.responderIdentity}><Text style={styles.responderName}>{responder.name}</Text><Text style={styles.responderDepartment}>{responder.department}</Text></View>
                  <View style={[styles.availabilityBadge, responder.availability_status === "available" ? styles.availableBadge : responder.availability_status === "on_break" ? styles.breakBadge : styles.unavailableBadge]}>
                    <Text style={styles.availabilityBadgeText}>{capitalize(responder.availability_status.replaceAll("_", " "))}</Text>
                  </View>
                </View>
                <View style={styles.profileDetails}>
                  <Text style={styles.profileDetail}>{responder.contact_number || "No contact number on file"}</Text>
                  <Text style={styles.profileDetail}>{responder.username ? `@${responder.username}` : responder.email || "Responder account"}</Text>
                  <Text style={styles.profileDetail}>Responder #{responder.user_id} · {capitalize((responder.user_type || "responder").replaceAll("_", " "))}</Text>
                </View>
              </Card>
            ) : null}
          </ScreenScroll>
        )}
        {page === "cases" && (
          <ScreenScroll variant="clinic">
            {selectedCase ? (
              <CaseDetail
                record={selectedCase} messages={messages} draft={draftMessage}
                diagnosis={diagnosis} doctorNotes={doctorNotes} vitals={vitals}
                actionsTaken={actionsTaken} busy={loading} dashboard={dashboard} responder={responder}
                onCallPatient={(phoneNumber) => void callPatient(phoneNumber)}
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
                <SmallLabel>ASSIGNMENT #{notice.id} · {notice.status.toUpperCase()} · {formatDate(notice.created_at)}</SmallLabel>
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
        {page === "more" && (
          <ScreenScroll variant="clinic">
            <View style={styles.clinicWelcome}>
              <View><Text style={styles.clinicMetricLabel}>CLINIC WORKSPACE</Text><Text style={styles.clinicWelcomeTitle}>More</Text><Body>Tools and account details</Body></View>
            </View>
            <View style={styles.moreMenu}>
              {moreItems.map(([id, label, description, icon]) => (
                <Pressable key={id} style={styles.moreMenuItem} onPress={() => navigate(id)}>
                  <View style={styles.moreMenuIcon}><Text style={styles.moreMenuGlyph}>{icon}</Text></View>
                  <View style={styles.moreMenuCopy}><Text style={styles.moreMenuTitle}>{label}</Text><Text style={styles.moreMenuDescription}>{description}</Text></View>
                  {id === "notifications" && notices.some((item) => item.status === "new") ? (
                    <Text style={styles.moreMenuBadge}>{notices.filter((item) => item.status === "new").length}</Text>
                  ) : null}
                  <Text style={styles.caseArrow}>›</Text>
                </Pressable>
              ))}
            </View>
            {responder ? (
              <Card style={styles.mobileSectionCard}>
                <View style={styles.responderSummary}>
                  <View style={styles.responderAvatar}><Text style={styles.responderAvatarText}>{responder.name.slice(0, 1).toUpperCase()}</Text></View>
                  <View style={styles.responderIdentity}><Text style={styles.responderName}>{responder.name}</Text><Text style={styles.responderDepartment}>{responder.department}</Text></View>
                  <Pressable onPress={() => void logout()}><Text style={styles.sectionLink}>Sign out</Text></Pressable>
                </View>
              </Card>
            ) : null}
          </ScreenScroll>
        )}
      </View>
      <View style={styles.clinicBottomBar}>
        {pageItems.map(([id, label, icon]) => {
          const selected = activeTab === id;
          const badgeCount = id === "cases"
            ? dashboard?.incoming_count ?? 0
            : id === "more"
              ? dashboard?.unread_notifications ?? 0
              : 0;
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              onPress={() => navigate(id)}
              style={styles.clinicBottomTab}
            >
              <View style={[styles.clinicBottomIconWrap, selected && styles.clinicBottomIconWrapActive]}>
                <Text style={[styles.clinicBottomIcon, selected && styles.clinicBottomIconActive]}>{icon}</Text>
                {badgeCount > 0 ? <Text style={styles.clinicBottomBadge}>{badgeCount > 99 ? "99+" : badgeCount}</Text> : null}
              </View>
              <Text style={[styles.clinicBottomLabel, selected && styles.clinicBottomLabelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      </View>
    </Frame>
  );
}

function Metric({ label, value, tone = "blue" }: { label: string; value: string | number | undefined; tone?: "red" | "blue" | "amber" | "green" }) {
  const toneStyle = tone === "red" ? styles.metricRed
    : tone === "amber" ? styles.metricAmber
      : tone === "green" ? styles.metricGreen : styles.metricBlue;
  return <Card style={[styles.metric, toneStyle]}><Text style={styles.clinicMetricLabel}>{label.toUpperCase()}</Text><Text style={styles.metricValue}>{value ?? "—"}</Text></Card>;
}

function CaseCard({ record, onPress }: { record: CaseRecord; onPress: () => void }) {
  const urgent = record.severity.toLowerCase() === "urgent";
  return (
    <Pressable onPress={onPress} style={styles.mobileCaseRow}>
      <View style={[styles.caseSeverityMark, urgent ? styles.caseUrgentMark : styles.caseMinorMark]}><Text style={styles.caseSeverityGlyph}>{urgent ? "!" : "+"}</Text></View>
      <View style={styles.mobileCaseCopy}>
        <View style={styles.mobileCaseTitleRow}>
          <Text style={styles.mobileCaseTitle} numberOfLines={1}>{record.incident_label}</Text>
          <View style={[styles.caseBadge, urgent ? styles.urgentCaseBadge : styles.minorCaseBadge]}><Text style={[styles.caseBadgeText, urgent ? styles.urgentCaseText : styles.minorCaseText]}>{capitalize(record.severity)}</Text></View>
        </View>
        <Text style={styles.mobileCaseLocation} numberOfLines={1}>{record.building}{record.floor ? ` · ${record.floor}` : ""}</Text>
        <Text style={styles.mobileCaseMeta} numberOfLines={1}>{record.patient?.case_reference ?? `Case #${record.id}`} · {formatDate(record.created_at)}</Text>
      </View>
      <Text style={styles.caseArrow}>›</Text>
    </Pressable>
  );
}

function CaseDetail({
  record, messages, draft, diagnosis, doctorNotes, vitals, actionsTaken, busy,
  dashboard, responder, onCallPatient, onBack, onAction, onDiagnosis, onDoctorNotes, onVitals, onActionsTaken,
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
  dashboard: Dashboard | null;
  responder: Responder | null;
  onCallPatient: (phoneNumber: string) => void;
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
  const open = ["submitted", "acknowledged", "in_progress"].includes(record.status);
  const needsAcknowledgement = ["submitted", "acknowledged"].includes(record.status);
  const capacityPercent = dashboard?.responders_total
    ? Math.min(100, Math.round((dashboard.responders_available / dashboard.responders_total) * 100))
    : 0;
  const parsedVitals = (() => {
    try {
      const value: unknown = JSON.parse(vitals);
      return value && typeof value === "object" && !Array.isArray(value)
        ? Object.entries(value as Record<string, string | number>).slice(0, 4)
        : [];
    } catch {
      return [];
    }
  })();

  return (
    <>
      <Pressable style={styles.mobileBackButton} onPress={onBack}><Text style={styles.mobileBackText}>‹  Case queue</Text></Pressable>
      <View style={styles.caseDetailHero}>
        <View style={styles.caseDetailHeading}>
          <View style={styles.caseReferencePill}><Text style={styles.caseReferenceText}>CASE #{record.id} · {record.patient?.case_reference ?? "Patient"}</Text></View>
          <View style={[styles.caseBadge, record.severity.toLowerCase() === "urgent" ? styles.urgentCaseBadge : styles.minorCaseBadge]}>
            <Text style={[styles.caseBadgeText, record.severity.toLowerCase() === "urgent" ? styles.urgentCaseText : styles.minorCaseText]}>{capitalize(record.severity)}</Text>
          </View>
        </View>
        <Text style={styles.caseDetailTitle}>{record.incident_label}</Text>
        <Text style={styles.caseDetailSubtitle}>{record.patient?.name ?? "Unknown patient"} · {record.patient?.case_reference ?? "Patient"} · {capitalize(record.status.replaceAll("_", " "))}</Text>
        <View style={styles.caseLocationBanner}><Text style={styles.caseLocationIcon}>⌖</Text><Text style={styles.caseLocationText}>{record.building}{record.floor ? ` · ${record.floor}` : ""}</Text></View>
      </View>

      <Card style={styles.mobileSectionCard}>
        <View style={styles.sectionHeading}><View><Text style={styles.sectionTitle}>Patient timeline</Text><Text style={styles.sectionCaption}>Case activity and response updates</Text></View><Text style={styles.timelineEta}>ETA {record.response_eta_minutes} min</Text></View>
        {record.timeline.length ? record.timeline.map((event) => (
          <View style={styles.mobileTimelineEvent} key={event.id}>
            <View style={styles.mobileTimelineRail}><View style={styles.mobileTimelineDot} /></View>
            <View style={styles.mobileTimelineCopy}>
              <Text style={styles.mobileTimelineTime}>{new Date(event.action_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
              <Text style={styles.mobileTimelineTitle}>{capitalize(event.event_type.replaceAll("_", " "))}</Text>
              <Text style={styles.mobileTimelineDescription}>{event.remarks || event.actor}</Text>
            </View>
          </View>
        )) : (
          <View style={styles.mobileTimelineEvent}>
            <View style={styles.mobileTimelineRail}><View style={styles.mobileTimelineDot} /></View>
            <View style={styles.mobileTimelineCopy}>
              <Text style={styles.mobileTimelineTime}>{new Date(record.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
              <Text style={styles.mobileTimelineTitle}>Symptoms submitted</Text>
              <Text style={styles.mobileTimelineDescription}>{formatDate(record.created_at)}</Text>
            </View>
          </View>
        )}
      </Card>

      <Card style={styles.mobileSectionCard}>
        <View style={styles.sectionHeading}><View><Text style={styles.sectionTitle}>Treatment &amp; notes</Text><Text style={styles.sectionCaption}>Clinical observations and care provided</Text></View></View>
        <Field label="ASSESSMENT" value={diagnosis} onChangeText={onDiagnosis} placeholder="Add a brief assessment" variant="clinic" />
        <Field label="DOCTOR NOTES" value={doctorNotes} onChangeText={onDoctorNotes} multiline placeholder="Document relevant notes" variant="clinic" />
        {parsedVitals.length ? (
          <View style={styles.vitalsGrid}>
            {parsedVitals.map(([label, value]) => <View key={label} style={styles.vitalCell}><Text style={styles.vitalLabel}>{capitalize(label.replaceAll("_", " "))}</Text><Text style={styles.vitalValue}>{value}</Text></View>)}
          </View>
        ) : null}
        <Field label="VITAL SIGNS · JSON" value={vitals} onChangeText={onVitals} multiline placeholder='{"pulse": 78}' variant="clinic" />
        <Field label="ACTIONS TAKEN · ONE PER LINE" value={actionsTaken} onChangeText={onActionsTaken} multiline placeholder="One action per line" variant="clinic" />
        <ActionButton label={busy ? "Saving notes..." : "Save notes"} onPress={onSaveNotes} disabled={busy} tone="green" variant="clinic" />
      </Card>

      <Card style={styles.mobileSectionCard}>
        <View style={styles.sectionHeading}><View><Text style={styles.sectionTitle}>Clinic capacity</Text><Text style={styles.sectionCaption}>Responder coverage right now</Text></View><Text style={styles.capacityPercent}>{capacityPercent}%</Text></View>
        <View style={styles.capacityTrack}><View style={[styles.capacityFill, { width: `${capacityPercent}%` }]} /></View>
        <View style={styles.capacityStats}>
          <View style={styles.capacityStat}><Text style={styles.capacityStatValue}>{dashboard?.responders_available ?? "—"}</Text><Text style={styles.capacityStatLabel}>Available</Text></View>
          <View style={styles.capacityDivider} />
          <View style={styles.capacityStat}><Text style={styles.capacityStatValue}>{dashboard?.responders_total ?? "—"}</Text><Text style={styles.capacityStatLabel}>Responders</Text></View>
          <View style={styles.capacityDivider} />
          <View style={styles.capacityStat}><Text style={styles.capacityStatValue}>{responder?.department || "—"}</Text><Text style={styles.capacityStatLabel}>Department</Text></View>
        </View>
      </Card>

      <Card style={styles.mobileSectionCard}>
        <View style={styles.sectionHeading}><View><Text style={styles.sectionTitle}>Communication</Text><Text style={styles.sectionCaption}>Reach the patient or update the case</Text></View></View>
        {record.patient?.phone_number
          ? <ActionButton label="Call patient" onPress={() => onCallPatient(record.patient?.phone_number ?? "")} tone="green" variant="clinic" />
          : <Text style={styles.noPhoneText}>No patient phone number is available.</Text>}
        <Field label="SECURE MESSAGE" value={draft} onChangeText={onDraft} multiline placeholder="Write a message to the patient..." variant="clinic" />
        <ActionButton label="Send secure message" onPress={onSendMessage} disabled={!draft.trim() || busy} tone="blue" variant="clinic" />
        {messages.slice(-3).map((message) => (
          <View key={message.id} style={styles.message}>
            <SmallLabel>{message.sender_name} · {message.sender_role}</SmallLabel><Body>{message.message}</Body>
          </View>
        ))}
        {record.guidance ? <Text style={styles.guidanceText}>{record.guidance}</Text> : null}
      </Card>

      {open ? (
        <Card style={styles.mobileSectionCard}>
          <View style={styles.sectionHeading}><View><Text style={styles.sectionTitle}>Case actions</Text><Text style={styles.sectionCaption}>Updates are shared with the clinic team</Text></View></View>
          {needsAcknowledgement ? <ActionButton label="Accept case" onPress={() => onAction("accept")} disabled={busy} tone="green" variant="clinic" /> : null}
          {record.status !== "in_progress" ? <ActionButton label="Start response" onPress={() => onAction("start_response")} disabled={busy} tone="blue" variant="clinic" /> : null}
          <Field label="REQUEST MORE INFORMATION" value={draft} onChangeText={onDraft} multiline placeholder="Add a question for the patient" variant="clinic" />
          <ActionButton label="Request more information" onPress={() => onAction("request_more_info", draft)} disabled={busy || !draft.trim()} tone="neutral" variant="clinic" />
          <ActionButton label="Record ambulance request" onPress={() => onAction("request_ambulance")} disabled={busy} tone="neutral" variant="clinic" />
          <Text style={styles.disclaimer}>This records a request for clinic staff only; it does not contact emergency services.</Text>
          <ActionButton label="Mark resolved" onPress={() => onAction("resolve")} disabled={busy} tone="green" variant="clinic" />
        </Card>
      ) : (
        <Card style={styles.resolvedCard}><Text style={styles.resolvedTitle}>✓ Case completed</Text><Body>This case is marked {capitalize(record.status)}.</Body></Card>
      )}
    </>
  );
}

function TabBar({
  active, onChange, items,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
  items: Array<[Tab, string, string]>;
}) {
  return (
    <View style={styles.tabbar}>
      {items.map(([id, label, icon]) => (
        <Pressable
          key={id}
          accessibilityRole="tab"
          accessibilityLabel={label}
          accessibilityState={{ selected: active === id }}
          onPress={() => onChange(id)}
          style={[styles.tab, active === id && styles.tabActive]}
        >
          <Text style={[styles.tabIcon, active === id && styles.tabIconActive]}>{icon}</Text>
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
  app: { flex: 1, width: "100%", maxWidth: 1120, alignSelf: "center", backgroundColor: colors.bg },
  clinicApp: { flex: 1, backgroundColor: "#F3F7F4" },
  clinicScroll: { backgroundColor: "#F3F7F4" },
  clinicScrollContent: { padding: 16, paddingBottom: 34, gap: 12 },
  clinicTopbar: { backgroundColor: "#FFFFFF", borderBottomColor: "#E4ECE6" },
  clinicBrandMark: { color: "#145D40" },
  clinicSubtitle: { color: "#74867B" },
  clinicNavigation: { backgroundColor: "#FFFFFF", borderBottomColor: "#E4ECE6" },
  clinicNavItem: { paddingHorizontal: 13, paddingVertical: 13 },
  clinicNavItemActive: { borderBottomWidth: 2, borderBottomColor: "#18784E" },
  clinicNavText: { color: "#74867B", fontSize: 11, fontWeight: "700" },
  clinicNavTextActive: { color: "#176B47" },
  clinicContent: { flex: 1, backgroundColor: "#F3F7F4" },
  clinicMetricLabel: { color: "#738278", fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  clinicBottomBar: { minHeight: 66, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 5, paddingTop: 6, paddingBottom: 5, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E2EAE4" },
  clinicBottomTab: { flex: 1, minWidth: 0, minHeight: 52, alignItems: "center", justifyContent: "center", gap: 2 },
  clinicBottomIconWrap: { position: "relative", minWidth: 43, height: 29, alignItems: "center", justifyContent: "center", borderRadius: 16 },
  clinicBottomIconWrapActive: { backgroundColor: "#EAF5EC" },
  clinicBottomIcon: { color: "#829188", fontSize: 20, fontWeight: "700", lineHeight: 24 },
  clinicBottomIconActive: { color: "#176B47" },
  clinicBottomLabel: { color: "#829188", fontSize: 9, fontWeight: "700" },
  clinicBottomLabelActive: { color: "#176B47", fontWeight: "900" },
  clinicBottomBadge: { position: "absolute", top: -4, right: -3, minWidth: 16, height: 16, paddingHorizontal: 3, overflow: "hidden", borderWidth: 1, borderColor: "#FFFFFF", borderRadius: 8, backgroundColor: "#D8524A", color: "#FFFFFF", fontSize: 8, lineHeight: 14, fontWeight: "900", textAlign: "center" },
  moreMenu: { overflow: "hidden", paddingHorizontal: 13, borderRadius: 15, borderWidth: 1, borderColor: "#E4EBE5", backgroundColor: "#FFFFFF" },
  moreMenuItem: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: 1, borderBottomColor: "#EEF2EF" },
  moreMenuIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: "#EDF6EF" },
  moreMenuGlyph: { color: "#26734C", fontSize: 20, fontWeight: "700" },
  moreMenuCopy: { flex: 1, gap: 3 },
  moreMenuTitle: { color: "#294637", fontSize: 12, fontWeight: "800" },
  moreMenuDescription: { color: "#87958B", fontSize: 9 },
  moreMenuBadge: { minWidth: 19, paddingHorizontal: 5, paddingVertical: 3, borderRadius: 10, backgroundColor: "#D8524A", color: "#FFFFFF", fontSize: 9, fontWeight: "900", textAlign: "center" },
  flex: { flex: 1 },
  scrollContent: { width: "100%", padding: 20, paddingBottom: 36, gap: 14 },
  connectionState: { flex: 1, width: "100%", maxWidth: 520, alignSelf: "center", justifyContent: "center", padding: 24, gap: 12 },
  topbar: {
    minHeight: 72, paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: "#0B1725", borderBottomWidth: 1, borderBottomColor: colors.line,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  brand: { gap: 10, paddingVertical: 22 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  brandGlyph: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(241,90,74,0.14)", borderWidth: 1, borderColor: "rgba(241,90,74,0.32)" },
  brandGlyphText: { color: colors.red, fontSize: 22, fontWeight: "900" },
  brandMark: { color: colors.text, fontSize: 18, fontWeight: "900", letterSpacing: 2 },
  brandCaption: { color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 1.4, marginTop: 2 },
  authShell: { width: "100%", maxWidth: 500, alignSelf: "center", paddingTop: 12 },
  authTitle: { color: colors.text, fontSize: 32, lineHeight: 38, fontWeight: "800", letterSpacing: -0.6 },
  segmented: { flexDirection: "row", gap: 4, padding: 4, borderRadius: 14, backgroundColor: "#0A1725" },
  segment: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 10, borderRadius: 11 },
  segmentActive: { backgroundColor: colors.panelAlt },
  segmentText: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  segmentTextActive: { color: colors.text },
  network: { color: colors.green, fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
  label: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 6 },
  title: { color: colors.text, fontSize: 23, fontWeight: "800", marginVertical: 6 },
  body: { color: "#B7C7DA", fontSize: 14, lineHeight: 21, marginVertical: 3 },
  card: {
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line,
    borderRadius: 18, padding: 18, gap: 11,
  },
  authCard: { marginTop: 14, padding: 20 },
  heroCard: { padding: 22, borderColor: "rgba(241,90,74,0.3)", backgroundColor: "#102034" },
  heroTitle: { color: colors.text, fontSize: 30, lineHeight: 36, fontWeight: "800", letterSpacing: -0.5 },
  noticeCard: { backgroundColor: "#10202C", borderColor: "rgba(56,198,165,0.2)" },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  button: {
    minHeight: 48, borderRadius: 13, paddingHorizontal: 16, paddingVertical: 12,
    alignItems: "center", justifyContent: "center", flex: 1,
  },
  buttonText: { color: colors.text, fontSize: 14, fontWeight: "800", textAlign: "center" },
  row: { flexDirection: "row", gap: 10 },
  field: { gap: 4, marginVertical: 4 },
  input: {
    minHeight: 50, color: colors.text, backgroundColor: "#091522",
    borderColor: "rgba(180,205,230,0.16)", borderWidth: 1, borderRadius: 13,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
  multiline: { minHeight: 96, textAlignVertical: "top" },
  errorBox: { padding: 12, backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.38)", borderWidth: 1, borderRadius: 12 },
  errorText: { color: "#FCA5A5", fontSize: 13, lineHeight: 19 },
  disclaimer: { color: colors.muted, fontSize: 11, marginTop: 12, marginBottom: 12, textAlign: "center" },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 9, paddingVertical: 5 },
  check: { color: colors.red, fontSize: 20 },
  tabbar: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 8, paddingVertical: 8, borderTopWidth: 1, borderColor: colors.line, backgroundColor: "#0B1725" },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 42, paddingVertical: 8, marginHorizontal: 3, borderRadius: 12 },
  tabActive: { backgroundColor: colors.panelAlt },
  tabIcon: { color: "#8497AC", fontSize: 19, lineHeight: 21, fontWeight: "700" },
  tabIconActive: { color: colors.green },
  tabText: { color: "#8497AC", fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: colors.green },
  clinicNav: { borderBottomWidth: 1, borderColor: colors.line, backgroundColor: "#0B1725" },
  navItem: { paddingHorizontal: 15, paddingVertical: 15 },
  navItemActive: { borderBottomWidth: 2, borderBottomColor: colors.green },
  navText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  navTextActive: { color: colors.text },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: { width: "48%", minHeight: 82, justifyContent: "center", padding: 13, gap: 5, backgroundColor: "#FFFFFF", borderColor: "#E5ECE6", borderRadius: 13 },
  metricRed: { borderLeftWidth: 3, borderLeftColor: "#D8524A" },
  metricBlue: { borderLeftWidth: 3, borderLeftColor: "#387DAA" },
  metricAmber: { borderLeftWidth: 3, borderLeftColor: "#DEA13B" },
  metricGreen: { borderLeftWidth: 3, borderLeftColor: "#238451" },
  metricValue: { color: "#19382D", fontSize: 23, fontWeight: "800" },
  message: { padding: 10, borderRadius: 10, backgroundColor: colors.panelAlt, marginVertical: 4 },
  clinicWelcome: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 3 },
  clinicWelcomeTitle: { color: "#19382D", fontSize: 24, fontWeight: "800", marginTop: 3 },
  alertButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 13, borderWidth: 1, borderColor: "#E2EAE4", backgroundColor: "#FFFFFF" },
  alertButtonIcon: { color: "#276A49", fontSize: 24, lineHeight: 28 },
  alertBadge: { position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, paddingHorizontal: 4, overflow: "hidden", borderRadius: 9, backgroundColor: "#D8524A", color: "#FFFFFF", fontSize: 10, lineHeight: 18, fontWeight: "800", textAlign: "center" },
  mobileSectionCard: { padding: 15, gap: 11, borderRadius: 15, borderColor: "#E4EBE5", backgroundColor: "#FFFFFF", elevation: 1 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sectionTitle: { color: "#19382D", fontSize: 15, fontWeight: "800" },
  sectionCaption: { color: "#839188", fontSize: 10, marginTop: 3 },
  sectionLink: { color: "#18784E", fontSize: 11, fontWeight: "800" },
  emptyCases: { paddingVertical: 12, color: "#839188", fontSize: 12, textAlign: "center" },
  mobileCaseRow: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#EEF2EF" },
  caseSeverityMark: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  caseUrgentMark: { backgroundColor: "#FFF0EB" },
  caseMinorMark: { backgroundColor: "#FFF7E8" },
  caseSeverityGlyph: { color: "#C34D42", fontSize: 17, fontWeight: "900" },
  mobileCaseCopy: { flex: 1, minWidth: 0, gap: 3 },
  mobileCaseTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  mobileCaseTitle: { flex: 1, color: "#294637", fontSize: 12, fontWeight: "800" },
  caseBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 12 },
  urgentCaseBadge: { backgroundColor: "#FFF0EB" },
  minorCaseBadge: { backgroundColor: "#FFF5DF" },
  caseBadgeText: { fontSize: 9, fontWeight: "800" },
  urgentCaseText: { color: "#B74734" },
  minorCaseText: { color: "#9B6B19" },
  mobileCaseLocation: { color: "#607369", fontSize: 10, fontWeight: "600" },
  mobileCaseMeta: { color: "#91A097", fontSize: 9 },
  caseArrow: { color: "#9BAAA0", fontSize: 24, paddingLeft: 2 },
  capacityPercent: { color: "#18784E", fontSize: 19, fontWeight: "900" },
  capacityTrack: { height: 8, overflow: "hidden", borderRadius: 5, backgroundColor: "#EAF0EA" },
  capacityFill: { height: "100%", borderRadius: 5, backgroundColor: "#27915D" },
  capacityStats: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingTop: 7 },
  capacityStat: { flex: 1, alignItems: "center", gap: 3 },
  capacityStatValue: { color: "#244635", fontSize: 16, fontWeight: "900" },
  capacityStatLabel: { color: "#85938A", fontSize: 9, textAlign: "center" },
  capacityDivider: { width: 1, height: 30, backgroundColor: "#E8EEE9" },
  responderSummary: { flexDirection: "row", alignItems: "center", gap: 10 },
  responderAvatar: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 21, backgroundColor: "#E7F2E9" },
  responderAvatarText: { color: "#176B47", fontSize: 17, fontWeight: "900" },
  responderIdentity: { flex: 1, gap: 3 },
  responderName: { color: "#294637", fontSize: 12, fontWeight: "800" },
  responderDepartment: { color: "#849288", fontSize: 10 },
  availabilityBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12 },
  availableBadge: { backgroundColor: "#E9F5EC" },
  breakBadge: { backgroundColor: "#FFF5DF" },
  unavailableBadge: { backgroundColor: "#EEF1EF" },
  availabilityBadgeText: { color: "#427456", fontSize: 9, fontWeight: "800" },
  profileDetails: { paddingTop: 9, borderTopWidth: 1, borderTopColor: "#EEF2EF", gap: 5 },
  profileDetail: { color: "#6E8075", fontSize: 10 },
  mobileBackButton: { alignSelf: "flex-start", paddingVertical: 3, paddingHorizontal: 2 },
  mobileBackText: { color: "#23764E", fontSize: 13, fontWeight: "800" },
  caseDetailHero: { padding: 16, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E4EBE5", gap: 7 },
  caseDetailHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  caseReferencePill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, backgroundColor: "#F0F5F1" },
  caseReferenceText: { color: "#638071", fontSize: 9, fontWeight: "800" },
  caseDetailTitle: { color: "#19382D", fontSize: 22, fontWeight: "900" },
  caseDetailSubtitle: { color: "#708177", fontSize: 11 },
  caseLocationBanner: { flexDirection: "row", alignItems: "center", gap: 7, padding: 9, borderRadius: 9, backgroundColor: "#F3F8F3", marginTop: 4 },
  caseLocationIcon: { color: "#23764E", fontSize: 16, fontWeight: "900" },
  caseLocationText: { color: "#456452", fontSize: 10, fontWeight: "700" },
  timelineEta: { color: "#667B6E", fontSize: 9, fontWeight: "800" },
  mobileTimelineEvent: { flexDirection: "row", gap: 9, minHeight: 51 },
  mobileTimelineRail: { width: 12, alignItems: "center" },
  mobileTimelineDot: { zIndex: 1, width: 10, height: 10, marginTop: 3, borderWidth: 2, borderColor: "#B9DFC4", borderRadius: 5, backgroundColor: "#21854D" },
  mobileTimelineCopy: { flex: 1, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#F0F3F0", gap: 2 },
  mobileTimelineTime: { color: "#24764B", fontSize: 9, fontWeight: "800" },
  mobileTimelineTitle: { color: "#304C3B", fontSize: 11, fontWeight: "800" },
  mobileTimelineDescription: { color: "#839188", fontSize: 9 },
  clinicInput: { color: "#294637", backgroundColor: "#FFFFFF", borderColor: "#DCE7DD", borderRadius: 10 },
  clinicButton: { flex: 0, alignSelf: "stretch", minHeight: 43, borderRadius: 10 },
  vitalsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  vitalCell: { minWidth: "22%", flexGrow: 1, padding: 9, borderRadius: 9, backgroundColor: "#F2F7F2" },
  vitalLabel: { color: "#7A8E80", fontSize: 9 },
  vitalValue: { color: "#284A36", fontSize: 13, fontWeight: "900", marginTop: 3 },
  noPhoneText: { color: "#87958B", fontSize: 10, paddingVertical: 6 },
  guidanceText: { paddingTop: 8, borderTopWidth: 1, borderTopColor: "#EDF2ED", color: "#718177", fontSize: 10, lineHeight: 16 },
  resolvedCard: { backgroundColor: "#EDF7EF", borderColor: "#D5E9D9" },
  resolvedTitle: { color: "#26734C", fontSize: 14, fontWeight: "900" },
});
