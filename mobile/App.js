import { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
  background: '#080A0F',
  surface: '#0E1117',
  surfaceRaised: '#141923',
  border: '#273142',
  text: '#F0F4FF',
  muted: '#91A0B8',
  subtle: '#64748B',
  red: '#EF4444',
  green: '#22C55E',
  teal: '#00D4AA',
};

const FACILITY = {
  name: 'Manila Central',
  campus: 'High School Campus',
  location: 'Building C — Main Hall',
  respondersOnDuty: 4,
  clinicStatus: 'OPEN',
  averageResponse: '3.2 min',
};

const QUICK_CONTACTS = [
  { name: 'Clinic Hotline', extension: 'Main line', phone: '+1-202-555-0101' },
  { name: 'School Nurse', extension: 'loc. 101', phone: '+1-202-555-0102' },
  { name: 'Security Office', extension: 'loc. 105', phone: '+1-202-555-0103' },
  { name: 'Admin Office', extension: 'loc. 100', phone: '+1-202-555-0104' },
];
const CLINIC_HOTLINE = QUICK_CONTACTS[0];
const CAMPUS_CONTACTS = QUICK_CONTACTS.slice(1);

function getDefaultServerAddress() {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return '127.0.0.1:8000';

  try {
    return `${new URL(`http://${hostUri}`).hostname}:8000`;
  } catch {
    return '127.0.0.1:8000';
  }
}

function makeApiBaseUrl(address) {
  const trimmed = address.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  return trimmed ? `http://${trimmed}` : '';
}

async function readResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`The server returned an unreadable response (HTTP ${response.status}).`);
  }
}

function errorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

function Header({ title, eyebrow = 'SAFE', action, onAction }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      {action ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.headerAction}>
          <Text style={styles.headerActionText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PrimaryButton({ title, onPress, disabled, loading = false, loadingTitle, color = COLORS.red }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: color, opacity: disabled || loading ? 0.5 : pressed ? 0.82 : 1 },
      ]}
    >
      {loading ? (
        <View style={styles.buttonLoading}>
          <ActivityIndicator color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>{loadingTitle || 'Please wait...'}</Text>
        </View>
      ) : <Text style={styles.primaryButtonText}>{title}</Text>}
    </Pressable>
  );
}

function TextField({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, multiline, autoCapitalize }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize || (keyboardType === 'email-address' ? 'none' : 'sentences')}
        autoCorrect={false}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.subtle}
        secureTextEntry={secureTextEntry}
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
      />
    </View>
  );
}

function App() {
  const [serverAddress, setServerAddress] = useState(getDefaultServerAddress);
  const apiBaseUrl = useMemo(() => makeApiBaseUrl(serverAddress), [serverAddress]);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [demoMode, setDemoMode] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [accountType, setAccountType] = useState('student');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [studentId, setStudentId] = useState('');
  const [course, setCourse] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('home');
  const [step, setStep] = useState('trigger');
  const [incidentFilter, setIncidentFilter] = useState('urgent');
  const [incident, setIncident] = useState(null);
  const [incidentTypes, setIncidentTypes] = useState([]);
  const [incidentTypesLoading, setIncidentTypesLoading] = useState(false);
  const [incidentTypesError, setIncidentTypesError] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [description, setDescription] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [reports, setReports] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [historyView, setHistoryView] = useState('mine');
  const [historyError, setHistoryError] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [messageReportId, setMessageReportId] = useState(null);
  const [caseMessages, setCaseMessages] = useState([]);
  const [caseMessageDraft, setCaseMessageDraft] = useState('');
  const [caseMessageError, setCaseMessageError] = useState('');
  const [caseMessageBusy, setCaseMessageBusy] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [callError, setCallError] = useState('');

  const loadIncidentTypes = useCallback(async () => {
    setIncidentTypesLoading(true);
    setIncidentTypesError('');
    try {
      const response = await fetch(`${apiBaseUrl}/api/incident-types/`);
      const payload = await readResponse(response);
      if (!response.ok) throw new Error(payload.detail || `Could not load incident types (HTTP ${response.status}).`);
      if (!Array.isArray(payload)) throw new Error('The SAFE API returned an invalid incident type list.');
      setIncidentTypes(payload.map((item) => ({
        id: item.code,
        label: item.incident_name,
        signs: item.guidance,
        severity: item.priority_level,
      })));
    } catch (error) {
      setIncidentTypesError(errorMessage(error, 'Could not load incident types.'));
    } finally {
      setIncidentTypesLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) {
      setIncidentTypes([]);
      setIncidentTypesError('');
      return;
    }
    void loadIncidentTypes();
  }, [loadIncidentTypes, user]);

  useEffect(() => {
    let active = true;
    if (!apiBaseUrl) {
      setAuthError('Enter the computer IP address and port running the SAFE API.');
      setAuthChecked(true);
      return undefined;
    }

    setAuthChecked(false);
    setAuthError('');
    Promise.all([
      fetch(`${apiBaseUrl}/api/auth/demo-config/`).then(async (response) => {
        if (!response.ok) throw new Error(`Could not check demo sign-up settings (HTTP ${response.status}).`);
        return readResponse(response);
      }),
      fetch(`${apiBaseUrl}/api/auth/me/`, { credentials: 'include' }).then(async (response) => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error(`Could not check sign-in status (HTTP ${response.status}).`);
        const payload = await readResponse(response);
        return payload.user ?? null;
      }),
    ])
      .then(([config, currentUser]) => {
        if (!active) return;
        setDemoMode(Boolean(config.demo_mode));
        setUser(currentUser);
      })
      .catch((error) => {
        if (!active) return;
        setAuthError(
          `${errorMessage(error, 'Could not reach the SAFE API.')} Make sure Django is running and your phone can reach ${apiBaseUrl}.`,
        );
      })
      .finally(() => {
        if (active) setAuthChecked(true);
      });

    return () => {
      active = false;
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!user || tab !== 'history' || !apiBaseUrl) return undefined;
    let active = true;
    setHistoryLoading(true);
    setHistoryError('');
    Promise.all(['/api/reports/', '/api/reports/recent/'].map(async (path) => {
      const response = await fetch(`${apiBaseUrl}${path}`, { credentials: 'include' });
      const payload = await readResponse(response);
      if (!response.ok) throw new Error(payload.detail || `Could not load reports (HTTP ${response.status}).`);
      if (!Array.isArray(payload)) throw new Error('The SAFE API returned an invalid report list.');
      return payload;
    }))
      .then(([mine, recent]) => {
        if (active) {
          setReports(mine);
          setRecentReports(recent);
        }
      })
      .catch((error) => {
        if (active) setHistoryError(errorMessage(error, 'Could not load report history.'));
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [apiBaseUrl, tab, user, historyRefresh]);

  useEffect(() => {
    if (!user || tab !== 'history' || messageReportId === null) return undefined;
    let active = true;
    setCaseMessageError('');
    const loadCaseMessages = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/reports/${messageReportId}/messages/`, { credentials: 'include' });
        const payload = await readResponse(response);
        if (!response.ok) throw new Error(payload.detail || `Could not load messages (HTTP ${response.status}).`);
        if (!Array.isArray(payload)) throw new Error('The case messages response was not a list.');
        if (active) setCaseMessages(payload);
      } catch (error) {
        if (active) setCaseMessageError(errorMessage(error, 'Could not load case messages.'));
      }
    };
    void loadCaseMessages();
    const interval = setInterval(() => void loadCaseMessages(), 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [apiBaseUrl, messageReportId, tab, user]);

  const getCsrfToken = async () => {
    const response = await fetch(`${apiBaseUrl}/api/auth/csrf/`, { credentials: 'include' });
    const payload = await readResponse(response);
    if (!response.ok || !payload.csrf_token) {
      throw new Error(`Could not start a secure request (HTTP ${response.status}).`);
    }
    return payload.csrf_token;
  };

  const sendCaseMessage = async () => {
    if (messageReportId === null || !caseMessageDraft.trim()) return;
    setCaseMessageBusy(true);
    setCaseMessageError('');
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`${apiBaseUrl}/api/reports/${messageReportId}/messages/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        body: JSON.stringify({ message: caseMessageDraft.trim() }),
      });
      const payload = await readResponse(response);
      if (!response.ok) throw new Error(payload.detail || `Could not send message (HTTP ${response.status}).`);
      setCaseMessages((items) => [...items, payload]);
      setCaseMessageDraft('');
    } catch (error) {
      setCaseMessageError(errorMessage(error, 'Could not send case message.'));
    } finally {
      setCaseMessageBusy(false);
    }
  };

  const handleAuth = async () => {
    setAuthError('');
    const normalizedEmail = email.trim().toLowerCase();
    if (authMode === 'signup' && !displayName.trim()) {
      setAuthError('Enter your name.');
      return;
    }
    if (authMode === 'signup' && !username.trim()) {
      setAuthError('Enter a username.');
      return;
    }
    if (authMode === 'signup' && !studentId.trim()) {
      setAuthError('Enter your student ID.');
      return;
    }
    if (authMode === 'signup' && !course.trim()) {
      setAuthError('Enter your course.');
      return;
    }
    if (authMode === 'signup' && !phoneNumber.trim()) {
      setAuthError('Enter your phone number.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setAuthError('Enter a valid email address.');
      return;
    }
    if (!password || (authMode === 'signup' && password.length < 8)) {
      setAuthError(authMode === 'signup' ? 'Choose a password with at least 8 characters.' : 'Enter your password.');
      return;
    }

    setBusy(true);
    try {
      const csrfToken = await getCsrfToken();
      const endpoint = authMode === 'login' ? 'login' : 'signup';
      const body = authMode === 'login'
        ? { email: normalizedEmail, password }
        : {
            display_name: displayName.trim(),
            username: username.trim(),
            student_id: studentId.trim(),
            course: course.trim(),
            phone_number: phoneNumber.trim(),
            email: normalizedEmail,
            password,
            account_type: accountType,
          };
      const response = await fetch(`${apiBaseUrl}/api/auth/${endpoint}/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        body: JSON.stringify(body),
      });
      const payload = await readResponse(response);
      if (!response.ok) {
        const detail = Array.isArray(payload.password_errors)
          ? payload.password_errors.join(' ')
          : payload.detail;
        throw new Error(detail || `Sign-in failed (HTTP ${response.status}).`);
      }
      if (!payload.user) throw new Error('The SAFE API did not return an account.');
      setPassword('');
      setUser(payload.user);
      setTab('home');
      setStep('trigger');
    } catch (error) {
      setAuthError(
        errorMessage(error, 'Sign-in failed. Check that Django is running and reachable from your phone.'),
      );
    } finally {
      setBusy(false);
    }
  };

  const resetReport = () => {
    setIncident(null);
    setBuilding('');
    setFloor('');
    setDescription('');
    setConsentAccepted(false);
    setSubmitError('');
    setStep('trigger');
  };

  const submitReport = async () => {
    if (!incident || !consentAccepted) return;
    setBusy(true);
    setSubmitError('');
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`${apiBaseUrl}/api/reports/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        body: JSON.stringify({
          incident_id: incident.id,
          incident_label: incident.label,
          severity: incident.severity,
          building: building.trim() || 'Unknown',
          floor: floor.trim() || 'Unknown',
          description: description.trim(),
          recording_notice_accepted: true,
          audio_enabled: false,
          video_enabled: false,
        }),
      });
      const payload = await readResponse(response);
      if (!response.ok) throw new Error(payload.detail || `Could not submit the report (HTTP ${response.status}).`);
      setStep('sent');
      setHistoryRefresh((value) => value + 1);
    } catch (error) {
      setSubmitError(errorMessage(error, 'Could not submit the report.'));
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    setLogoutError('');
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`${apiBaseUrl}/api/auth/logout/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRFToken': csrfToken },
      });
      if (!response.ok) throw new Error(`Could not sign out (HTTP ${response.status}).`);
      setUser(null);
      resetReport();
      setTab('home');
    } catch (error) {
      setLogoutError(errorMessage(error, 'Could not sign out.'));
    } finally {
      setBusy(false);
    }
  };

  const callContact = async (contact) => {
    setCallError('');
    try {
      await Linking.openURL(`tel:${contact.phone}`);
    } catch {
      setCallError(`Could not open the phone app for ${contact.name}.`);
    }
  };

  const scrollContent = (children) => (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );

  const renderAuth = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.fill}
    >
      <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
        <View style={styles.brandMark}><Text style={styles.brandMarkText}>S</Text></View>
        <Text style={styles.eyebrow}>SAFE · DEMO ACCESS</Text>
        <Text style={styles.authTitle}>A safer response starts here.</Text>
        <Text style={styles.bodyText}>Sign in to access your SAFE reports, or create a demo account to explore the app.</Text>

        <View style={styles.segment}>
          {['login', 'signup'].map((mode) => (
            <Pressable
              key={mode}
              onPress={() => {
                setAuthMode(mode);
                setAuthError('');
              }}
              style={[styles.segmentButton, authMode === mode && styles.segmentButtonSelected]}
            >
              <Text style={[styles.segmentText, authMode === mode && styles.segmentTextSelected]}>
                {mode === 'login' ? 'Sign in' : 'Sign up'}
              </Text>
            </Pressable>
          ))}
        </View>

        {authMode === 'signup' ? (
          <>
            <TextField label="Name" value={displayName} onChangeText={setDisplayName} placeholder="Your name" />
            <TextField label="Username" value={username} onChangeText={setUsername} placeholder="Choose a username" autoCapitalize="none" />
            <TextField label="Student ID" value={studentId} onChangeText={setStudentId} placeholder="Student ID" />
            <TextField label="Course" value={course} onChangeText={setCourse} placeholder="Course or program" />
            <TextField label="Phone number" value={phoneNumber} onChangeText={setPhoneNumber} placeholder="Phone number" keyboardType="phone-pad" />
            <Text style={styles.fieldLabel}>Account type</Text>
            <View style={styles.segment}>
              {['student', 'visitor'].map((type) => (
                <Pressable key={type} onPress={() => setAccountType(type)} style={[styles.segmentButton, accountType === type && styles.segmentButtonSelected]}>
                  <Text style={[styles.segmentText, accountType === type && styles.segmentTextSelected]}>
                    {type === 'student' ? 'Student' : 'Visitor'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
        <TextField label="Email" value={email} onChangeText={setEmail} placeholder="student@example.test" keyboardType="email-address" />
        <TextField label="Password" value={password} onChangeText={setPassword} placeholder="Enter your password" secureTextEntry />

        <TextField
          label="Django API address"
          value={serverAddress}
          onChangeText={setServerAddress}
          placeholder="Computer IP:8000"
          keyboardType="url"
        />
        <Text style={styles.helperText}>Use your computer’s local IP and port 8000. No web server or website address is used.</Text>

        {demoMode === false && authMode === 'signup' ? (
          <Notice tone="warning">Demo sign-up is disabled by the server.</Notice>
        ) : null}
        {authError ? <Notice tone="error">{authError}</Notice> : null}
        <PrimaryButton
          title={authMode === 'login' ? 'Sign in' : 'Create demo account'}
          loadingTitle={authMode === 'login' ? 'Signing in...' : 'Creating account...'}
          onPress={handleAuth}
          disabled={!authChecked}
          loading={busy}
        />
        <Text style={styles.disclaimer}>Demo only. Accounts are not identity-verified. Do not enter real personal or medical information.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderHome = () => {
    if (step === 'trigger') {
      return (
        <View style={styles.fill}>
          <ScrollView contentContainerStyle={styles.homeContent}>
            <View style={styles.environmentCard}>
            <Text style={styles.environmentLabel}>LOCAL TIME</Text>
            <Text style={styles.clockValue}>
              {currentTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
              })}
            </Text>
            <Text style={styles.helperText}>
              {currentTime.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
            </View>
            <View style={styles.environmentMetrics}>
              <View style={[styles.environmentCard, styles.environmentMetric, styles.temperatureCard]}>
                <Text style={[styles.environmentLabel, styles.temperatureText]}>TEMPERATURE</Text>
                <Text style={[styles.metricValue, styles.temperatureText]}>88°F</Text>
                <Text style={styles.helperText}>Sample reading</Text>
              </View>
              <View style={[styles.environmentCard, styles.environmentMetric, styles.heatIndexCard]}>
                <Text style={[styles.environmentLabel, styles.heatIndexText]}>HEAT INDEX</Text>
                <Text style={[styles.metricValue, styles.heatIndexText]}>96°F</Text>
                <Text style={styles.helperText}>Caution · Humidity: 72%</Text>
              </View>
            </View>
            <Text style={styles.environmentDisclaimer}>Temperature, heat index, and humidity are sample values, not live sensor readings.</Text>
            <View style={styles.homeIncidentSection}>
              <View style={styles.homeIncidentHeading}>
                <Text style={styles.heroTitle}>Your safety matters.</Text>
                <Text style={styles.bodyText}>Create an incident report for campus responders.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Start an emergency incident report"
                onPress={() => setStep('incident')}
                style={({ pressed }) => [styles.emergencyButtonOuter, pressed && styles.buttonPressed]}
              >
                <View style={styles.emergencyButton}>
                  <Text style={styles.emergencySymbol}>!</Text>
                  <Text style={styles.emergencyButtonText}>REPORT AN INCIDENT</Text>
                  <Text style={styles.emergencySubtext}>Tap to begin</Text>
                </View>
              </Pressable>
              <Notice tone="warning">For immediate danger, contact local emergency services directly. This demo does not dispatch responders.</Notice>
            </View>
            <View style={styles.facilityCard}>
              <Text style={styles.environmentLabel}>FACILITY · DEMO STATUS</Text>
              <View>
                <Text style={styles.cardTitle}>{FACILITY.name}</Text>
                <Text style={styles.facilityCampus}>{FACILITY.campus}</Text>
                <Text style={styles.facilityLocation}>{FACILITY.location}</Text>
              </View>
              <View style={styles.facilityDivider} />
              {[
                { label: 'RESPONDERS ON DUTY', value: String(FACILITY.respondersOnDuty) },
                { label: 'CLINIC STATUS', value: FACILITY.clinicStatus },
                { label: 'RESPONSE AVG', value: FACILITY.averageResponse },
              ].map((item) => (
                <View key={item.label} style={styles.facilityMetricRow}>
                  <Text style={styles.facilityMetricLabel}>{item.label}</Text>
                  <Text style={styles.facilityMetricValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      );
    }

    if (step === 'incident') {
      const filteredIncidents = incidentTypes.filter((item) => item.severity === incidentFilter);
      return (
        <View style={styles.fill}>
          <Header title="Select incident" action="Back" onAction={() => setStep('trigger')} />
          {scrollContent(
            <>
              <View style={styles.segment}>
                {['urgent', 'minor'].map((severity) => (
                  <Pressable key={severity} onPress={() => setIncidentFilter(severity)} style={[styles.segmentButton, incidentFilter === severity && styles.segmentButtonSelected]}>
                    <Text style={[styles.segmentText, incidentFilter === severity && styles.segmentTextSelected]}>
                      {severity === 'urgent' ? 'Urgent' : 'Minor'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {incidentTypesError ? (
                <>
                  <Notice tone="error">{incidentTypesError}</Notice>
                  <Pressable accessibilityRole="button" onPress={() => void loadIncidentTypes()} style={{ padding: 12, alignItems: 'center', backgroundColor: COLORS.surfaceRaised, borderRadius: 12 }}>
                    <Text style={{ color: COLORS.text, fontWeight: '700' }}>Try again</Text>
                  </Pressable>
                </>
              ) : incidentTypesLoading ? (
                <View style={styles.inlineLoading}>
                  <ActivityIndicator color={COLORS.teal} />
                  <Text style={styles.bodyText}>Loading incident types...</Text>
                </View>
              ) : filteredIncidents.length === 0 ? (
                <Text style={styles.bodyText}>No {incidentFilter} incident types are currently available.</Text>
              ) : null}
              {filteredIncidents.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setIncident(item);
                    setStep('details');
                  }}
                  style={styles.incidentCard}
                >
                  <View style={styles.incidentRow}>
                    <View style={[styles.statusDot, { backgroundColor: item.severity === 'urgent' ? COLORS.red : COLORS.green }]} />
                    <Text style={styles.cardTitle}>{item.label}</Text>
                  </View>
                  <Text style={styles.bodyText}>{item.signs}</Text>
                  <Text style={styles.cardLink}>Select incident  ›</Text>
                </Pressable>
              ))}
            </>,
          )}
        </View>
      );
    }

    if (step === 'details' && incident) {
      return (
        <View style={styles.fill}>
          <Header title="Incident details" action="Back" onAction={() => setStep('incident')} />
          {scrollContent(
            <>
              <View style={[styles.incidentCard, { borderColor: incident.severity === 'urgent' ? '#783238' : '#28543A' }]}>
                <Text style={styles.eyebrow}>SELECTED INCIDENT</Text>
                <Text style={styles.cardTitle}>{incident.label}</Text>
                <Text style={styles.bodyText}>{incident.signs}</Text>
              </View>
              <TextField label="Building" value={building} onChangeText={setBuilding} placeholder="Building name" />
              <TextField label="Floor or room" value={floor} onChangeText={setFloor} placeholder="Floor or room (optional)" />
              <TextField label="Additional details" value={description} onChangeText={setDescription} placeholder="Describe what happened (optional)" multiline />
              <View style={styles.noticeCard}>
                <Text style={styles.cardTitle}>Recording and privacy notice</Text>
                <Text style={styles.bodyText}>
                  This native demo does not record or upload audio or video. It only submits the incident details you enter.
                </Text>
                <Pressable onPress={() => setConsentAccepted((value) => !value)} style={styles.consentRow}>
                  <View style={[styles.checkbox, consentAccepted && styles.checkboxSelected]}>
                    {consentAccepted ? <Text style={styles.checkmark}>✓</Text> : null}
                  </View>
                  <Text style={styles.bodyText}>I understand and consent to submit these incident details.</Text>
                </Pressable>
              </View>
              <PrimaryButton title="Review report" onPress={() => setStep('review')} disabled={!consentAccepted} />
            </>,
          )}
        </View>
      );
    }

    if (step === 'review' && incident) {
      return (
        <View style={styles.fill}>
          <Header title="Review report" action="Back" onAction={() => setStep('details')} />
          {scrollContent(
            <>
              <View style={styles.noticeCard}>
                <Text style={styles.eyebrow}>INCIDENT</Text>
                <Text style={styles.cardTitle}>{incident.label}</Text>
                <Text style={styles.bodyText}>{[building.trim(), floor.trim()].filter(Boolean).join(' · ') || 'Location not provided'}</Text>
                {description.trim() ? <Text style={styles.bodyText}>{description.trim()}</Text> : null}
              </View>
              <Notice tone="warning">Submitting sends this report to the SAFE server. It does not contact emergency services.</Notice>
              {submitError ? (
                <Notice tone="error">
                  {submitError}
                  {'\n'}Your report details are still available. Retry submission or go back to edit them.
                </Notice>
              ) : null}
              <PrimaryButton
                title={submitError ? 'Retry submission' : 'Submit report'}
                loadingTitle="Sending report..."
                onPress={submitReport}
                loading={busy}
              />
              <PrimaryButton title="Edit report" onPress={() => setStep('details')} color={COLORS.surfaceRaised} />
            </>,
          )}
        </View>
      );
    }

    if (step === 'sent') {
      return scrollContent(
        <>
          <View style={styles.successMark}><Text style={styles.successMarkText}>✓</Text></View>
          <Text style={styles.heroTitle}>Report submitted</Text>
          <Text style={styles.bodyText}>The SAFE server accepted your report. This demo does not dispatch responders.</Text>
          {incident ? (
            <View style={styles.noticeCard}>
              <Text style={styles.eyebrow}>SUBMITTED INCIDENT</Text>
              <Text style={styles.cardTitle}>{incident.label}</Text>
              <Text style={styles.bodyText}>{[building.trim(), floor.trim()].filter(Boolean).join(' · ') || 'Location not provided'}</Text>
            </View>
          ) : null}
          <PrimaryButton title="Start a new report" onPress={resetReport} />
          <PrimaryButton title="View report history" onPress={() => { resetReport(); setTab('history'); }} color={COLORS.surfaceRaised} />
        </>,
      );
    }
    return null;
  };

  const renderHistory = () => (
    <View style={styles.fill}>
      <Header title="Report history" action="Refresh" onAction={() => setHistoryRefresh((value) => value + 1)} />
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <View style={styles.segment}>
          {[
            ['mine', 'My reports'],
            ['recent', 'All · 7 days'],
          ].map(([view, label]) => (
            <Pressable key={view} onPress={() => setHistoryView(view)} style={[styles.segmentButton, historyView === view && styles.segmentButtonSelected]}>
              <Text style={[styles.segmentText, historyView === view && styles.segmentTextSelected]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.helperText}>
          {historyView === 'mine' ? 'Reports submitted by your account.' : 'Recent incident summaries. Personal details are not shown.'}
        </Text>
      </View>
      {historyLoading ? (
        <View style={styles.centered}><ActivityIndicator color={COLORS.red} /><Text style={styles.bodyText}>Loading reports...</Text></View>
      ) : historyError ? (
        scrollContent(
          <>
            <Notice tone="error">{historyError}</Notice>
            <PrimaryButton title="Try again" onPress={() => setHistoryRefresh((value) => value + 1)} />
          </>,
        )
      ) : (historyView === 'mine' ? reports : recentReports).length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.cardTitle}>{historyView === 'mine' ? 'No reports for this account' : 'No reports in the past 7 days'}</Text>
          <Text style={styles.bodyText}>{historyView === 'mine' ? 'Reports submitted while signed in to this account will appear here.' : 'Newly submitted reports will appear here.'}</Text>
          <Pressable onPress={() => setHistoryRefresh((value) => value + 1)} style={styles.historyRefresh}>
            <Text style={styles.cardLink}>Refresh report history</Text>
          </Pressable>
        </View>
      ) : (
        scrollContent(
          (historyView === 'mine' ? reports : recentReports).map((report) => (
            <View key={report.id} style={[styles.incidentCard, { borderColor: report.severity === 'urgent' ? '#783238' : '#28543A' }]}>
              <View style={styles.reportHeader}>
                <Text style={styles.cardTitle}>{report.incident_label}</Text>
                <Text style={[styles.statusText, { color: report.severity === 'urgent' ? COLORS.red : COLORS.green }]}>{report.status}</Text>
              </View>
              <Text style={styles.helperText}>{new Date(report.created_at).toLocaleString()}</Text>
              <Text style={styles.bodyText}>{[report.building, report.floor].filter((value) => value && value !== 'Unknown').join(' · ') || 'Location not provided'}</Text>
              {historyView === 'mine' && report.description ? <Text style={styles.bodyText}>{report.description}</Text> : null}
              {historyView === 'mine' ? (
                <View style={{ marginTop: 5, gap: 9 }}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setMessageReportId((current) => current === report.id ? null : report.id);
                      setCaseMessages([]);
                      setCaseMessageError('');
                    }}
                    style={{ alignSelf: 'flex-start', paddingVertical: 5 }}
                  >
                    <Text style={{ color: '#38BDF8', fontSize: 11, fontWeight: '700' }}>
                      {messageReportId === report.id ? 'Hide secure messages' : 'Open secure messages'}
                    </Text>
                  </Pressable>
                  {messageReportId === report.id ? (
                    <View style={{ gap: 8, padding: 10, borderRadius: 10, backgroundColor: '#101722', borderWidth: 1, borderColor: '#273142' }}>
                      {caseMessages.length === 0 && !caseMessageError ? <Text style={styles.helperText}>No messages yet. Message clinic staff about this report.</Text> : null}
                      {caseMessages.map((message) => (
                        <View key={message.id} style={{ padding: 9, borderRadius: 8, backgroundColor: message.sender_role === 'patient' ? '#15253a' : '#123025' }}>
                          <Text style={{ color: COLORS.text, fontSize: 10, fontWeight: '700' }}>{message.sender_name} · {new Date(message.created_at).toLocaleString()}</Text>
                          <Text style={[styles.bodyText, { marginTop: 5 }]}>{message.message}</Text>
                        </View>
                      ))}
                      {caseMessageError ? <Text style={{ color: '#FCA5A5', fontSize: 10 }}>{caseMessageError}</Text> : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                        <TextInput
                          accessibilityLabel="Message clinic staff"
                          value={caseMessageDraft}
                          onChangeText={setCaseMessageDraft}
                          placeholder="Write a message..."
                          placeholderTextColor={COLORS.subtle}
                          maxLength={3000}
                          style={{ flex: 1, minHeight: 38, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, backgroundColor: COLORS.surfaceRaised, fontSize: 11 }}
                        />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Send message"
                          disabled={caseMessageBusy || !caseMessageDraft.trim()}
                          onPress={() => void sendCaseMessage()}
                          style={{ padding: 10, borderRadius: 8, backgroundColor: COLORS.teal }}
                        >
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{caseMessageBusy ? '...' : 'SEND'}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          )),
        )
      )}
    </View>
  );

  const renderContacts = () => (
    <View style={styles.fill}>
      <Header title="Quick contacts" />
      {scrollContent(
        <>
          <View style={styles.hotlineCard}>
            <Text style={styles.hotlineEyebrow}>PRIMARY CONTACT · CALL FIRST</Text>
            <Text style={styles.hotlineTitle}>Clinic Main Hotline</Text>
            <Text style={styles.hotlineNumber}>{CLINIC_HOTLINE.phone}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Call the main clinic hotline"
              onPress={() => callContact(CLINIC_HOTLINE)}
              style={({ pressed }) => [styles.hotlineCallButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.hotlineCallButtonText}>CALL CLINIC HOTLINE</Text>
            </Pressable>
          </View>
          <View style={styles.quickContactsCard}>
            <Text style={styles.quickContactsTitle}>OTHER CAMPUS CONTACTS</Text>
            {CAMPUS_CONTACTS.map((contact) => (
              <View key={contact.name} style={styles.contactRow}>
                <View style={styles.contactCopy}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactExtension}>{contact.extension} · {contact.phone}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${contact.name}`}
                  onPress={() => callContact(contact)}
                  style={({ pressed }) => [styles.callButton, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.callButtonText}>CALL</Text>
                </Pressable>
              </View>
            ))}
          </View>
          <Text style={styles.environmentDisclaimer}>Demo numbers only. Replace with verified clinic contacts before real use.</Text>
          {callError ? <Notice tone="error">{callError}</Notice> : null}
        </>,
      )}
    </View>
  );

  const renderAccount = () => (
    <View style={styles.fill}>
      <Header title="Account" />
      {scrollContent(
        <>
          <View style={styles.noticeCard}>
            <Text style={styles.cardTitle}>{user?.display_name}</Text>
            <Text style={styles.bodyText}>{user?.email}</Text>
          </View>
          <View style={styles.noticeCard}>
            <Text style={styles.cardTitle}>{user?.account_type === 'student' ? 'Student demo account' : 'Visitor demo account'}</Text>
            <Text style={styles.bodyText}>Identity not verified.</Text>
          </View>
          <Text style={styles.disclaimer}>Identity checks are disabled. This demo account is not verified. Do not enter real personal or medical information.</Text>
          {logoutError ? <Notice tone="error">{logoutError}</Notice> : null}
          <PrimaryButton title="Sign out" loadingTitle="Signing out..." onPress={handleLogout} loading={busy} color={COLORS.surfaceRaised} />
        </>,
      )}
    </View>
  );

  const renderTabContent = () => {
    if (tab === 'history') return renderHistory();
    if (tab === 'contacts') return renderContacts();
    if (tab === 'account') return renderAccount();
    return renderHome();
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.app}>
        <StatusBar style="light" />
        {!authChecked ? (
          <View style={styles.startupLoading} accessibilityRole="progressbar" accessibilityLabel="Connecting to SAFE">
            <View style={styles.brandMark}><Text style={styles.brandMarkText}>S</Text></View>
            <ActivityIndicator color={COLORS.red} size="large" />
            <Text style={styles.startupTitle}>Connecting to SAFE</Text>
            <Text style={styles.bodyText}>Checking your session and loading sign-in options...</Text>
          </View>
        ) : !user ? (
          renderAuth()
        ) : (
          <>
            <View style={styles.main}>{renderTabContent()}</View>
            <View style={styles.tabBar}>
              {[
                ['home', 'Home', 'home-outline'],
                ['history', 'History', 'history'],
                ['contacts', 'Contacts', 'phone-outline'],
                ['account', 'Account', 'account-outline'],
              ].map(([key, label, iconName]) => (
                <Pressable
                  key={key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === key }}
                  onPress={() => setTab(key)}
                  style={styles.tabButton}
                >
                  <MaterialCommunityIcons
                    name={iconName}
                    size={21}
                    color={tab === key ? COLORS.red : COLORS.subtle}
                  />
                  <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Notice({ children, tone = 'info' }) {
  const color = tone === 'error' ? '#FCA5A5' : tone === 'warning' ? '#FCD34D' : COLORS.muted;
  const borderColor = tone === 'error' ? '#783238' : tone === 'warning' ? '#725B27' : COLORS.border;
  return (
    <View style={[styles.notice, { borderColor, backgroundColor: tone === 'error' ? '#301316' : COLORS.surface }]}>
      <Text style={[styles.noticeText, { color }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: COLORS.background },
  fill: { flex: 1 },
  main: { flex: 1 },
  content: { padding: 20, paddingBottom: 32, gap: 14 },
  homeContent: { padding: 20, paddingBottom: 24, gap: 14 },
  authContent: { flexGrow: 1, padding: 24, paddingBottom: 36, justifyContent: 'center', gap: 14 },
  brandMark: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#301316', borderWidth: 1, borderColor: '#783238' },
  brandMarkText: { color: COLORS.red, fontSize: 28, fontWeight: '900' },
  eyebrow: { color: COLORS.red, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 5 },
  authTitle: { color: COLORS.text, fontSize: 32, fontWeight: '800', lineHeight: 38, marginTop: 4 },
  heroTitle: { color: COLORS.text, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  bodyText: { color: COLORS.muted, fontSize: 14, lineHeight: 21 },
  header: { minHeight: 72, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border, backgroundColor: '#0A0C12' },
  headerCopy: { flex: 1 },
  headerTitle: { color: COLORS.text, fontSize: 19, fontWeight: '700' },
  headerAction: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9, backgroundColor: COLORS.surfaceRaised },
  headerActionText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  field: { gap: 7 },
  fieldLabel: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  input: { minHeight: 48, paddingHorizontal: 13, paddingVertical: 11, color: COLORS.text, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 10, fontSize: 15 },
  multilineInput: { minHeight: 104, textAlignVertical: 'top' },
  helperText: { color: COLORS.subtle, fontSize: 11, lineHeight: 16 },
  disclaimer: { color: COLORS.subtle, fontSize: 11, lineHeight: 17 },
  segment: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: 11, backgroundColor: COLORS.surface },
  segmentButton: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  segmentButtonSelected: { backgroundColor: COLORS.surfaceRaised, borderWidth: 1, borderColor: COLORS.border },
  segmentText: { color: COLORS.muted, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  segmentTextSelected: { color: COLORS.text },
  primaryButton: { minHeight: 50, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  buttonLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  buttonPressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  notice: { padding: 13, borderWidth: 1, borderRadius: 10 },
  noticeText: { fontSize: 12, lineHeight: 18 },
  homeIncidentSection: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  homeIncidentHeading: { alignItems: 'center', gap: 4 },
  emergencyButtonOuter: { width: 204, height: 204, borderRadius: 102, alignItems: 'center', justifyContent: 'center', backgroundColor: '#301316', borderWidth: 1, borderColor: '#783238' },
  emergencyButton: { width: 170, height: 170, borderRadius: 85, alignItems: 'center', justifyContent: 'center', backgroundColor: '#B91C1C', borderWidth: 5, borderColor: '#EF4444' },
  emergencySymbol: { color: '#FFFFFF', fontSize: 46, fontWeight: '900', lineHeight: 52 },
  emergencyButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  emergencySubtext: { color: '#FECACA', fontSize: 10, marginTop: 5 },
  environmentCard: { padding: 16, gap: 5, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14 },
  environmentLabel: { color: COLORS.subtle, fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  clockValue: { color: COLORS.text, fontSize: 30, fontWeight: '700', fontVariant: ['tabular-nums'] },
  environmentMetrics: { flexDirection: 'row', gap: 12 },
  environmentMetric: { flex: 1, minWidth: 0, justifyContent: 'space-between' },
  temperatureCard: { borderColor: '#7C3D1D' },
  temperatureText: { color: '#F97316' },
  heatIndexCard: { borderColor: '#6B581B' },
  heatIndexText: { color: '#EAB308' },
  metricValue: { fontSize: 28, fontWeight: '800', marginVertical: 5 },
  environmentDisclaimer: { color: COLORS.subtle, fontSize: 10, lineHeight: 15 },
  facilityCard: { padding: 18, gap: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 22 },
  facilityCampus: { color: COLORS.text, fontSize: 14, fontWeight: '500', marginTop: 3 },
  facilityLocation: { color: '#7A8FAD', fontSize: 11, marginTop: 5 },
  facilityDivider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginVertical: 2 },
  facilityMetricRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  facilityMetricLabel: { color: '#647A98', fontSize: 9, letterSpacing: 0.8, flexShrink: 1 },
  facilityMetricValue: { color: '#C8D6F0', fontSize: 11, fontWeight: '700' },
  quickContactsCard: { padding: 18, gap: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#16445A', borderRadius: 22 },
  quickContactsTitle: { color: '#0EA5E9', fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  hotlineCard: { padding: 18, gap: 9, backgroundColor: '#10251E', borderWidth: 1, borderColor: '#23744B', borderRadius: 18 },
  hotlineEyebrow: { color: '#4ADE80', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  hotlineTitle: { color: COLORS.text, fontSize: 19, fontWeight: '800' },
  hotlineNumber: { color: '#86EFAC', fontSize: 14, fontWeight: '700', letterSpacing: 0.4 },
  hotlineCallButton: { minHeight: 48, marginTop: 4, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#15803D' },
  hotlineCallButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 0.6 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contactCopy: { flex: 1, minWidth: 0, gap: 4 },
  contactName: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  contactExtension: { color: '#0EA5E9', fontSize: 10 },
  callButton: { minWidth: 58, minHeight: 36, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#073047', borderWidth: 1, borderColor: '#0B6688' },
  callButtonText: { color: '#38BDF8', fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  historyRefresh: { padding: 10 },
  incidentCard: { padding: 15, gap: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12 },
  incidentRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', flexShrink: 1 },
  cardLink: { color: COLORS.red, fontSize: 12, fontWeight: '700', marginTop: 2 },
  noticeCard: { padding: 16, gap: 9, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12 },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 5 },
  checkbox: { width: 23, height: 23, borderRadius: 6, borderWidth: 1, borderColor: COLORS.subtle, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: COLORS.red, borderColor: COLORS.red },
  checkmark: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  startupLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
  startupTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginTop: 4 },
  inlineLoading: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 10 },
  successMark: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#123322', borderWidth: 1, borderColor: '#28543A', alignItems: 'center', justifyContent: 'center' },
  successMarkText: { color: COLORS.teal, fontSize: 32, fontWeight: '800' },
  reportHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  tabBar: { minHeight: 66, flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border, backgroundColor: '#0A0C12' },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 7 },
  tabLabel: { color: COLORS.subtle, fontSize: 10, fontWeight: '600' },
  tabLabelActive: { color: COLORS.red },
});

export default App;
