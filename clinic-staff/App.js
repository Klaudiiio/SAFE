import { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  ActivityIndicator,
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

const C = {
  background: '#F5F8F5',
  surface: '#FFFFFF',
  border: '#E5ECE6',
  text: '#19382D',
  muted: '#74867B',
  subtle: '#97A49B',
  green: '#18784E',
  greenLight: '#EAF5EC',
  red: '#B74734',
  redLight: '#FFF0EB',
  amber: '#B97925',
  amberLight: '#FFF5E5',
  blue: '#4E76A0',
  blueLight: '#EDF4FB',
};

function defaultApiAddress() {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    try {
      return `${new URL(`http://${hostUri}`).hostname}:8000`;
    } catch {
      // Fall back to localhost when Expo does not expose its host.
    }
  }
  return '127.0.0.1:8000';
}

function makeBaseUrl(address) {
  const value = address.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  return value ? `http://${value}` : '';
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

function pretty(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function App() {
  const [serverAddress, setServerAddress] = useState(defaultApiAddress);
  const baseUrl = useMemo(() => makeBaseUrl(serverAddress), [serverAddress]);
  const [responder, setResponder] = useState(null);
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [screen, setScreen] = useState('dashboard');
  const [bucket, setBucket] = useState('incoming');
  const [dashboard, setDashboard] = useState(null);
  const [cases, setCases] = useState([]);
  const [patients, setPatients] = useState([]);
  const [notices, setNotices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [search, setSearch] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [vitals, setVitals] = useState('{}');
  const [actionsTaken, setActionsTaken] = useState('');
  const [report, setReport] = useState(null);
  const [availability, setAvailability] = useState('available');
  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const api = useCallback(async (path, options = {}) => {
    if (!baseUrl) throw new Error('Enter the computer IP address running the SAFE API.');
    const headers = { ...(options.headers || {}) };
    if (options.body) headers['Content-Type'] = 'application/json';
    if (options.method && options.method !== 'GET') {
      const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf/`, { credentials: 'include' });
      if (!csrfResponse.ok) throw new Error(`Could not start a secure clinic request (HTTP ${csrfResponse.status}).`);
      const csrf = await readResponse(csrfResponse);
      if (!csrf.csrf_token) throw new Error('The server did not provide a security token.');
      headers['X-CSRFToken'] = csrf.csrf_token;
    }
    let response;
    try {
      response = await fetch(`${baseUrl}${path}`, { ...options, headers, credentials: 'include' });
    } catch {
      throw new Error(`Could not reach ${baseUrl}. Make sure Django is running and the phone can reach this computer.`);
    }
    const payload = await readResponse(response);
    if (!response.ok) throw new Error(payload.detail || `Request failed (HTTP ${response.status}).`);
    return payload;
  }, [baseUrl]);

  const loadNotices = useCallback(async () => {
    setNoticesLoading(true);
    try {
      setNotices(await api('/api/clinic/notifications/'));
    } finally {
      setNoticesLoading(false);
    }
  }, [api]);

  const loadDashboard = useCallback(async () => {
    if (!responder) return;
    try {
      setDashboard(await api('/api/clinic/dashboard/'));
      await loadNotices();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load the clinic dashboard.');
    } finally {
      setDashboardLoading(false);
    }
  }, [api, loadNotices, responder]);

  const loadCases = useCallback(async (nextBucket = bucket, query = search) => {
    if (!responder) return;
    setLoading(true);
    setError('');
    try {
      const result = await api(`/api/clinic/cases/?bucket=${nextBucket}&q=${encodeURIComponent(query)}`);
      setCases(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load cases.');
    } finally {
      setLoading(false);
    }
  }, [api, bucket, responder, search]);

  const loadMessages = useCallback(async (caseId) => {
    try {
      setMessages(await api(`/api/clinic/cases/${caseId}/messages/`));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load case messages.');
    }
  }, [api]);

  const openCase = async (record) => {
    setSelected(record);
    setDiagnosis(record.notes?.diagnosis || '');
    setDoctorNotes(record.notes?.doctor_notes || '');
    setVitals(JSON.stringify(record.notes?.vital_signs || {}, null, 2));
    setActionsTaken((record.notes?.actions_taken || []).join('\n'));
    setScreen('case');
    await loadMessages(record.id);
  };

  useEffect(() => {
    let active = true;
    api('/api/clinic/session/')
      .then((account) => {
        if (!active) return;
        setResponder(account);
        setAvailability(account.availability_status);
        setDashboardLoading(true);
      })
      .catch(() => {
        if (active) setResponder(null);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => { active = false; };
  }, [api]);

  useEffect(() => {
    if (!responder) return undefined;
    void loadDashboard();
    const timer = setInterval(() => void loadDashboard(), 20000);
    return () => clearInterval(timer);
  }, [loadDashboard, responder]);

  useEffect(() => {
    if (screen === 'cases') void loadCases(bucket, search);
  }, [bucket, loadCases, screen, search]);

  useEffect(() => {
    if (screen !== 'patients' || !responder) return;
    let active = true;
    setPatientsLoading(true);
    api(`/api/clinic/patients/?q=${encodeURIComponent(search)}`)
      .then((items) => { if (active) setPatients(items); })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load patients.');
      })
      .finally(() => { if (active) setPatientsLoading(false); });
    return () => { active = false; };
  }, [api, responder, screen, search]);

  useEffect(() => {
    if (screen !== 'reports' || !responder) return;
    let active = true;
    setReportsLoading(true);
    api('/api/clinic/reports/')
      .then((data) => { if (active) setReport(data); })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load reports.');
      })
      .finally(() => { if (active) setReportsLoading(false); });
    return () => { active = false; };
  }, [api, responder, screen]);

  useEffect(() => {
    if (!selected || screen !== 'case') return undefined;
    const timer = setInterval(() => {
      api(`/api/clinic/cases/${selected.id}/`)
        .then(setSelected)
        .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Could not refresh case details.'));
      void loadMessages(selected.id);
    }, 20000);
    return () => clearInterval(timer);
  }, [api, loadMessages, screen, selected?.id]);

  const signIn = async () => {
    setLoginError('');
    setWorking(true);
    try {
      const account = await api('/api/clinic/login/', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password }),
      });
      setResponder(account);
      setAvailability(account.availability_status);
      setDashboardLoading(true);
      setPassword('');
    } catch (loginFailure) {
      setLoginError(loginFailure instanceof Error ? loginFailure.message : 'Sign in failed.');
    } finally {
      setWorking(false);
    }
  };

  const signOut = async () => {
    try {
      await api('/api/clinic/logout/', { method: 'POST' });
      setResponder(null);
      setSelected(null);
      setDashboard(null);
      setScreen('dashboard');
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : 'Could not sign out.');
    }
  };

  const doAction = async (action, message) => {
    if (!selected) return;
    setWorking(true);
    setError('');
    try {
      const result = await api(`/api/clinic/cases/${selected.id}/actions/`, {
        method: 'POST',
        body: JSON.stringify({ action, message }),
      });
      setSelected(result.case);
      setNotice(action === 'request_ambulance'
        ? 'Ambulance request recorded. Contact emergency services directly.'
        : `Case ${pretty(action).toLowerCase()} completed.`);
      await Promise.all([loadDashboard(), loadCases()]);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not complete case action.');
    } finally {
      setWorking(false);
    }
  };

  const saveNotes = async () => {
    if (!selected) return;
    let vitalSigns;
    try {
      vitalSigns = JSON.parse(vitals);
      if (!vitalSigns || Array.isArray(vitalSigns) || typeof vitalSigns !== 'object') throw new Error();
    } catch {
      setError('Vitals must be a JSON object, for example {"pulse": 78}.');
      return;
    }
    setWorking(true);
    try {
      const savedNotes = await api(`/api/clinic/cases/${selected.id}/notes/`, {
        method: 'PUT',
        body: JSON.stringify({
          diagnosis,
          doctor_notes: doctorNotes,
          vital_signs: vitalSigns,
          actions_taken: actionsTaken.split('\n').map((line) => line.trim()).filter(Boolean),
        }),
      });
      setSelected({ ...selected, notes: savedNotes });
      setNotice('Clinical notes saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save notes.');
    } finally {
      setWorking(false);
    }
  };

  const sendMessage = async () => {
    if (!selected || !messageDraft.trim()) return;
    setWorking(true);
    try {
      const sent = await api(`/api/clinic/cases/${selected.id}/messages/`, {
        method: 'POST',
        body: JSON.stringify({ message: messageDraft.trim() }),
      });
      setMessages((previous) => [...previous, sent]);
      setMessageDraft('');
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Could not send message.');
    } finally {
      setWorking(false);
    }
  };

  const updateAvailability = async (value) => {
    try {
      const account = await api('/api/clinic/availability/', {
        method: 'PATCH',
        body: JSON.stringify({ availability_status: value }),
      });
      setAvailability(account.availability_status);
      setResponder(account);
    } catch (availabilityError) {
      setError(availabilityError instanceof Error ? availabilityError.message : 'Could not update availability.');
    }
  };

  const markRead = async (item) => {
    try {
      await api(`/api/clinic/notifications/${item.id}/read/`, { method: 'POST' });
      setNotices((previous) => previous.map((entry) => entry.id === item.id ? { ...entry, status: 'read' } : entry));
      const record = await api(`/api/clinic/cases/${item.incident_id}/`);
      await openCase(record);
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : 'Could not open the notified case.');
    }
  };

  const navItems = [
    ['dashboard', 'Home', 'home-outline'],
    ['cases', 'Cases', 'clipboard-list-outline'],
    ['patients', 'Patients', 'account-group-outline'],
    ['notifications', 'Alerts', 'bell-outline'],
    ['reports', 'Reports', 'chart-box-outline'],
    ['settings', 'Settings', 'cog-outline'],
  ];

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        {checking ? (
          <View style={styles.startupLoading} accessibilityRole="progressbar" accessibilityLabel="Checking clinic staff session">
            <View style={styles.brandMark}><Text style={styles.brandHeart}>+</Text></View>
            <ActivityIndicator color={C.green} size="large" />
            <Text style={styles.loadingTitle}>Checking clinic session</Text>
            <Text style={styles.muted}>Connecting securely to the SAFE response network...</Text>
          </View>
        ) : !responder ? (
          <ScrollView contentContainerStyle={styles.loginPage} keyboardShouldPersistTaps="handled">
            <View style={styles.loginCard}>
              <View style={styles.brandMark}><Text style={styles.brandHeart}>+</Text></View>
              <Text style={styles.eyebrow}>SAFE RESPONSE NETWORK</Text>
              <Text style={styles.loginTitle}>Clinic staff portal</Text>
              <Text style={styles.muted}>Sign in with an account created by your SAFE administrator.</Text>
              <Field label="Username" value={username} onChangeText={setUsername} placeholder="Responder username" autoCapitalize="none" />
              <Field label="Password" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
              <Field label="Django server address" value={serverAddress} onChangeText={setServerAddress} placeholder="192.168.1.10:8000" autoCapitalize="none" />
              {loginError ? <Banner tone="error">{loginError}</Banner> : null}
              <Button title="Sign in to clinic" loadingTitle="Signing in..." onPress={() => void signIn()} loading={working} />
              <Text style={styles.loginFoot}>Separate responder access · Secure session</Text>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.app}>
            <View style={styles.topbar}>
              {selected && screen === 'case' ? (
                <Pressable onPress={() => { setSelected(null); setScreen('cases'); }}><Text style={styles.backText}>‹  CASES</Text></Pressable>
              ) : (
                <View>
                  <Text style={styles.eyebrow}>SAFE CLINIC STAFF</Text>
                  <Text style={styles.topTitle}>{screen === 'case' ? 'Case details' : navItems.find(([id]) => id === screen)?.[1] || 'Clinic'}</Text>
                </View>
              )}
              <View style={styles.topRight}>
                <View style={[styles.availabilityDot, availability === 'on_break' && styles.breakDot, availability === 'unavailable' && styles.offlineDot]} />
                <Text style={styles.availabilityText}>{pretty(availability)}</Text>
              </View>
            </View>

            <ScrollView
              key={`${screen}-${selected?.id || ''}`}
              style={styles.scroll}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              {error ? <Banner tone="error" onClose={() => setError('')}>{error}</Banner> : null}
              {notice ? <Banner tone="success" onClose={() => setNotice('')}>{notice}</Banner> : null}

              {screen === 'dashboard' && (
                <DashboardScreen
                  responder={responder}
                  dashboard={dashboard}
                  loading={dashboardLoading}
                  onRefresh={() => void loadDashboard()}
                  onCases={() => { setBucket('incoming'); setScreen('cases'); }}
                  onOpenCase={(record) => void openCase(record)}
                />
              )}
              {screen === 'cases' && !selected && (
                <CaseQueue
                  bucket={bucket}
                  onBucket={setBucket}
                  cases={cases}
                  search={search}
                  onSearch={setSearch}
                  loading={loading}
                  onRefresh={() => void loadCases()}
                  onOpen={(record) => void openCase(record)}
                />
              )}
              {screen === 'case' && selected && (
                <CaseScreen
                  record={selected}
                  messages={messages}
                  messageDraft={messageDraft}
                  onMessageDraft={setMessageDraft}
                  onSendMessage={() => void sendMessage()}
                  diagnosis={diagnosis}
                  onDiagnosis={setDiagnosis}
                  doctorNotes={doctorNotes}
                  onDoctorNotes={setDoctorNotes}
                  vitals={vitals}
                  onVitals={setVitals}
                  actionsTaken={actionsTaken}
                  onActionsTaken={setActionsTaken}
                  onSaveNotes={() => void saveNotes()}
                  onAction={(action, message) => void doAction(action, message)}
                  working={working}
                />
              )}
              {screen === 'patients' && <PatientsScreen patients={patients} loading={patientsLoading} search={search} onSearch={setSearch} />}
              {screen === 'notifications' && <NotificationsScreen notices={notices} loading={noticesLoading} onOpen={(item) => void markRead(item)} />}
              {screen === 'reports' && <ReportsScreen report={report} loading={reportsLoading} />}
              {screen === 'settings' && <SettingsScreen responder={responder} availability={availability} serverAddress={serverAddress} onAvailability={(value) => void updateAvailability(value)} onServerAddress={setServerAddress} onLogout={() => void signOut()} />}
            </ScrollView>

            {screen !== 'case' && (
              <View style={styles.tabbar}>
                {navItems.map(([id, label, iconName]) => (
                  <Pressable
                    key={id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: screen === id }}
                    style={styles.tab}
                    onPress={() => {
                      setSelected(null);
                      setScreen(id);
                      setError('');
                      if (id === 'cases') void loadCases(bucket, search);
                      if (id === 'patients') setPatientsLoading(true);
                      if (id === 'reports') setReportsLoading(true);
                      if (id === 'notifications') setNoticesLoading(true);
                      if (id === 'notifications') void loadNotices().catch((loadError) => setError(loadError.message));
                    }}
                  >
                    <MaterialCommunityIcons
                      name={iconName}
                      size={21}
                      color={screen === id ? C.green : '#89978D'}
                    />
                    <Text style={[styles.tabText, screen === id && styles.tabActive]}>{label}</Text>
                    {id === 'notifications' && notices.some((item) => item.status === 'new') ? <View style={styles.tabDot} /> : null}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function DashboardScreen({ responder, dashboard, loading, onRefresh, onCases, onOpenCase }) {
  const stats = [
    ['Incoming', dashboard?.incoming_count ?? '—', 'Cases to review', C.green, C.greenLight],
    ['In response', dashboard?.active_count ?? '—', 'Active cases', C.blue, C.blueLight],
    ['Urgent', dashboard?.urgent_open ?? '—', 'Needs attention', C.red, C.redLight],
    ['Resolved today', dashboard?.resolved_today ?? '—', 'Cases completed', C.green, C.greenLight],
  ];
  const latest = dashboard?.recent_cases || [];
  return (
    <>
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>RESPONSE OVERVIEW</Text>
          <Text style={styles.pageTitle}>Hello, {responder.name.split(' ')[0]}</Text>
          <Text style={styles.muted}>Latest activity from your clinic queue.</Text>
        </View>
        <Pressable style={styles.smallButton} onPress={onRefresh}><Text style={styles.smallButtonText}>Refresh</Text></Pressable>
      </View>
      {loading ? <View style={styles.dataLoading}><ActivityIndicator color={C.green} /><Text style={styles.muted}>Loading dashboard and notifications...</Text></View> : <>
      <View style={styles.statsGrid}>{stats.map(([label, value, description, color, tint]) => <View key={label} style={styles.statCard}><Text style={[styles.statLabel, { color }]}>{label}</Text><Text style={styles.statValue}>{value}</Text><Text style={styles.statNote}>{description}</Text></View>)}</View>
      <Card title="Clinic coverage" subtitle="Available clinic responders">
        <View style={styles.coverageLine}><Text style={styles.coverageNumber}>{dashboard?.responders_available ?? '—'}</Text><Text style={styles.muted}> available out of {dashboard?.responders_total ?? '—'}</Text></View>
        <View style={styles.progress}><View style={[styles.progressFill, { width: `${dashboard?.responders_total ? Math.min(100, dashboard.responders_available / dashboard.responders_total * 100) : 0}%` }]} /></View>
        <Text style={styles.helper}>Cases are shared with clinic responders. Coordinate before taking action.</Text>
      </Card>
      <View style={styles.sectionHeading}><View><Text style={styles.cardTitle}>Recent cases</Text><Text style={styles.helper}>Latest reports across SAFE</Text></View><Pressable onPress={onCases}><Text style={styles.link}>Open queue ›</Text></Pressable></View>
      {latest.length === 0 ? <Empty title="No recent cases" text="New incidents will appear in your shared queue." /> : latest.map((record) => <CaseCard key={record.id} record={record} onPress={() => onOpenCase(record)} />)}
      </>}
    </>
  );
}

function CaseQueue({ bucket, onBucket, cases, search, onSearch, loading, onRefresh, onOpen }) {
  const buckets = [['incoming', 'Incoming'], ['active', 'Active'], ['completed', 'Done'], ['all', 'All']];
  return (
    <>
      <Text style={styles.eyebrow}>SHARED RESPONDER QUEUE</Text>
      <Text style={styles.pageTitle}>Case queue</Text>
      <Text style={styles.muted}>Review and coordinate incident response.</Text>
      <TextInput value={search} onChangeText={onSearch} placeholder="Search cases" placeholderTextColor={C.subtle} style={styles.input} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {buckets.map(([value, label]) => <Pressable key={value} onPress={() => onBucket(value)} style={[styles.filter, bucket === value && styles.filterActive]}><Text style={[styles.filterText, bucket === value && styles.filterTextActive]}>{label}</Text></Pressable>)}
        <Pressable style={styles.filter} onPress={onRefresh}><Text style={styles.filterText}>Refresh</Text></Pressable>
      </ScrollView>
      {loading ? <ActivityIndicator color={C.green} style={{ marginTop: 24 }} /> : cases.length ? cases.map((record) => <CaseCard key={record.id} record={record} onPress={() => onOpen(record)} />) : <Empty title="No cases in this view" text="New incidents will appear here when reported." />}
    </>
  );
}

function CaseCard({ record, onPress }) {
  const urgent = String(record.severity).toLowerCase() === 'urgent';
  return (
    <Pressable style={styles.caseCard} onPress={onPress}>
      <View style={styles.caseTop}><Text style={[styles.caseTitle, urgent && { color: C.red }]}>{record.incident_label}</Text><Text style={[styles.badge, urgent ? styles.badgeUrgent : styles.badgeMinor]}>{pretty(record.severity)}</Text></View>
      <Text style={styles.casePatient}>{record.patient?.name || 'Unknown patient'} · {record.building}{record.floor ? `, ${record.floor}` : ''}</Text>
      {record.description ? <Text style={styles.caseDescription} numberOfLines={2}>{record.description}</Text> : null}
      <View style={styles.caseBottom}><Text style={[styles.statusBadge, statusStyle(record.status)]}>{pretty(record.status)}</Text><Text style={styles.helper}>{dateTime(record.created_at)}</Text></View>
    </Pressable>
  );
}

function CaseScreen(props) {
  const { record } = props;
  const [infoMessage, setInfoMessage] = useState('');
  const canAct = ['submitted', 'acknowledged', 'in_progress'].includes(record.status);
  return (
    <>
      <Text style={styles.eyebrow}>CASE #{record.id} · {dateTime(record.created_at)}</Text>
      <Text style={styles.pageTitle}>{record.incident_label}</Text>
      <View style={styles.inlineBadges}><Text style={[styles.badge, String(record.severity).toLowerCase() === 'urgent' ? styles.badgeUrgent : styles.badgeMinor]}>{pretty(record.severity)}</Text><Text style={[styles.statusBadge, statusStyle(record.status)]}>{pretty(record.status)}</Text></View>
      <Card title="Patient and location" subtitle={record.patient?.case_reference || `Case ${record.id}`}>
        <Text style={styles.bodyStrong}>{record.patient?.name || 'Unknown patient'}</Text>
        <Text style={styles.bodyText}>{record.building}{record.floor ? ` · ${record.floor}` : ''}</Text>
        <Text style={styles.bodyText}>{record.patient?.account_type ? pretty(record.patient.account_type) : 'Account type unavailable'}</Text>
        <View style={styles.actionRow}>
          {record.patient?.phone_number ? <Button title="Call patient" variant="secondary" onPress={() => Linking.openURL(`tel:${record.patient.phone_number}`)} /> : <Text style={styles.helper}>No phone number provided</Text>}
        </View>
      </Card>
      <Card title="Incident summary" subtitle={record.guidance || 'Follow clinic response procedures.'}>
        <Text style={styles.bodyText}>{record.description || 'No additional details were submitted.'}</Text>
      </Card>
      <Card title="Case actions" subtitle="Shared with clinic response team">
        {record.status === 'submitted' || record.status === 'acknowledged' ? <Button title="Acknowledge case" loading={props.working} onPress={() => props.onAction('accept')} /> : null}
        {canAct ? <Button title="Start response" variant="secondary" loading={props.working} onPress={() => props.onAction('start_response')} /> : null}
        {canAct ? <Button title="Record ambulance request" variant="warning" loading={props.working} onPress={() => props.onAction('request_ambulance')} /> : null}
        {canAct ? <View style={styles.field}><Text style={styles.label}>Request information from patient</Text><TextInput value={infoMessage} onChangeText={setInfoMessage} placeholder="Write a question for the patient" placeholderTextColor={C.subtle} style={[styles.input, { minHeight: 62 }]} multiline /></View> : null}
        {canAct && infoMessage.trim() ? <Button title="Send information request" variant="secondary" loading={props.working} onPress={() => { props.onAction('request_more_info', infoMessage.trim()); setInfoMessage(''); }} /> : null}
        {canAct ? <Button title="Mark resolved" variant="resolve" loading={props.working} onPress={() => props.onAction('resolve')} /> : <Text style={styles.helper}>This case is marked complete.</Text>}
        <Text style={styles.disclaimer}>An ambulance request is recorded for clinic staff only. This app does not contact emergency services.</Text>
      </Card>
      <Card title="Clinical notes" subtitle="Document observations and care provided">
        <Field label="Assessment" value={props.diagnosis} onChangeText={props.onDiagnosis} placeholder="Brief assessment" />
        <Field label="Doctor notes" value={props.doctorNotes} onChangeText={props.onDoctorNotes} placeholder="Relevant clinical notes" multiline />
        <Field label="Vitals (JSON)" value={props.vitals} onChangeText={props.onVitals} placeholder='{"pulse": 78}' multiline />
        <Field label="Actions taken (one per line)" value={props.actionsTaken} onChangeText={props.onActionsTaken} placeholder="One action per line" multiline />
        <Button title="Save clinical notes" loading={props.working} onPress={props.onSaveNotes} />
      </Card>
      <Card title="Secure case messages" subtitle="Patient and authenticated clinic staff">
        {props.messages.length === 0 ? <Text style={styles.helper}>No messages yet.</Text> : props.messages.map((item) => <View key={item.id} style={[styles.message, item.sender_role === 'clinic' && styles.staffMessage]}><Text style={styles.messageMeta}>{item.sender_name} · {dateTime(item.created_at)}</Text><Text style={styles.bodyText}>{item.message}</Text></View>)}
        <TextInput value={props.messageDraft} onChangeText={props.onMessageDraft} placeholder="Write a secure message" placeholderTextColor={C.subtle} style={styles.input} multiline />
        <Button title="Send message" loading={props.working} onPress={props.onSendMessage} disabled={!props.messageDraft.trim()} />
      </Card>
      <Card title="Case timeline" subtitle="Recorded responder and incident activity">
        {record.timeline?.length ? record.timeline.map((event) => <View key={event.id} style={styles.timelineItem}><Text style={styles.timelineTitle}>{pretty(event.event_type)}</Text><Text style={styles.bodyText}>{event.remarks}</Text><Text style={styles.helper}>{event.actor} · {dateTime(event.action_time)}</Text></View>) : <Text style={styles.helper}>No timeline events recorded.</Text>}
      </Card>
    </>
  );
}

function PatientsScreen({ patients, loading, search, onSearch }) {
  return (
    <>
      <Text style={styles.eyebrow}>PATIENT RECORDS</Text><Text style={styles.pageTitle}>Patients</Text>
      <TextInput value={search} onChangeText={onSearch} placeholder="Search name or email" placeholderTextColor={C.subtle} style={styles.input} />
      {loading ? <View style={styles.dataLoading}><ActivityIndicator color={C.green} /><Text style={styles.muted}>Loading patient records...</Text></View> : patients.length ? patients.map((item) => <Card key={item.id} title={item.name} subtitle={item.email}><Text style={styles.bodyText}>Phone: {item.phone_number || 'Not provided'}</Text><Text style={styles.bodyText}>Incident reports: {item.reports_count}</Text><Text style={styles.helper}>Last report: {dateTime(item.last_reported_at)}</Text></Card>) : <Empty title="No patient records" text="Records appear when patients submit incident reports." />}
    </>
  );
}

function NotificationsScreen({ notices, loading, onOpen }) {
  return (
    <>
      <Text style={styles.eyebrow}>IN-APP ALERTS</Text><Text style={styles.pageTitle}>Notifications</Text>
      {loading ? <View style={styles.dataLoading}><ActivityIndicator color={C.green} /><Text style={styles.muted}>Loading notifications...</Text></View> : notices.length ? notices.map((item) => <Pressable key={item.id} style={[styles.caseCard, item.status === 'new' && styles.unread]} onPress={() => onOpen(item)}><Text style={styles.caseTitle}>{item.incident_label}</Text><Text style={styles.bodyText}>{item.message}</Text><Text style={styles.helper}>{pretty(item.event_type)} · {dateTime(item.created_at)}</Text></Pressable>) : <Empty title="No notifications" text="New incident and case updates will appear here." />}
    </>
  );
}

function ReportsScreen({ report, loading }) {
  if (loading) return <View style={styles.dataLoading}><ActivityIndicator color={C.green} /><Text style={styles.muted}>Loading clinic reports...</Text></View>;
  if (!report) return <Empty title="Reports unavailable" text="The report summary could not be loaded. Check the error message above and try again." />;
  const metrics = [['Total cases', report.total], ['Urgent cases', report.urgent], ['Resolved', report.resolved], ['Resolution rate', `${report.resolution_rate}%`]];
  return (
    <>
      <Text style={styles.eyebrow}>LAST 30 DAYS</Text><Text style={styles.pageTitle}>Clinic reports</Text>
      <View style={styles.statsGrid}>{metrics.map(([label, value]) => <View key={label} style={styles.statCard}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>)}</View>
      <Card title="Cases by status" subtitle={`Since ${new Date(report.period_start).toLocaleDateString()}`}>
        {report.by_status.map((item) => <View key={item.status} style={styles.reportRow}><Text style={styles.bodyText}>{pretty(item.status)}</Text><Text style={styles.bodyStrong}>{item.count}</Text></View>)}
      </Card>
    </>
  );
}

function SettingsScreen({ responder, availability, serverAddress, onAvailability, onServerAddress, onLogout }) {
  return (
    <>
      <Text style={styles.eyebrow}>ACCOUNT PREFERENCES</Text><Text style={styles.pageTitle}>Settings</Text>
      <Card title="Responder profile" subtitle="Managed by your SAFE administrator">
        <Text style={styles.bodyStrong}>{responder.name}</Text><Text style={styles.bodyText}>{responder.department}</Text>
        <Text style={styles.bodyText}>{responder.username} · {responder.email}</Text><Text style={styles.bodyText}>{responder.contact_number}</Text>
      </Card>
      <Card title="Availability" subtitle="Available responders receive new case alerts">
        {['available', 'on_break', 'unavailable'].map((value) => <Pressable key={value} onPress={() => onAvailability(value)} style={[styles.option, availability === value && styles.optionSelected]}><Text style={styles.bodyStrong}>{pretty(value)} {availability === value ? '✓' : ''}</Text><Text style={styles.helper}>{value === 'available' ? 'Receive in-app alerts' : value === 'on_break' ? 'On break, but still notified' : 'Do not notify me of new reports'}</Text></Pressable>)}
      </Card>
      <Card title="Backend connection" subtitle="Use the computer IP address when testing on a phone">
        <Field label="Django server address" value={serverAddress} onChangeText={onServerAddress} placeholder="192.168.1.10:8000" autoCapitalize="none" />
      </Card>
      <Button title="Sign out" variant="secondary" onPress={onLogout} />
    </>
  );
}

function Card({ title, subtitle, children }) {
  return <View style={styles.card}><View style={styles.cardHeading}><Text style={styles.cardTitle}>{title}</Text>{subtitle ? <Text style={styles.helper}>{subtitle}</Text> : null}</View><View style={styles.cardBody}>{children}</View></View>;
}

function Field({ label, value, onChangeText, placeholder, secureTextEntry, multiline, autoCapitalize }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.subtle} secureTextEntry={secureTextEntry} multiline={multiline} autoCapitalize={autoCapitalize || 'sentences'} autoCorrect={false} style={[styles.input, multiline && styles.multiline]} /></View>;
}

function Button({ title, loadingTitle = 'Working...', onPress, loading, variant = 'primary', disabled }) {
  const variantStyle = variant === 'primary' ? styles.buttonPrimary
    : variant === 'warning' ? styles.buttonWarning
      : variant === 'resolve' ? styles.buttonResolve : styles.buttonSecondary;
  return <Pressable disabled={disabled || loading} onPress={onPress} accessibilityState={{ disabled: disabled || loading, busy: loading }} style={[styles.button, variantStyle, (disabled || loading) && { opacity: 0.55 }]}>{loading ? <View style={styles.buttonLoading}><ActivityIndicator color={variant === 'secondary' ? C.green : '#fff'} /><Text style={[styles.buttonText, variant === 'secondary' && { color: C.green }, variant === 'warning' && { color: C.amber }]}>{loadingTitle}</Text></View> : <Text style={[styles.buttonText, variant === 'secondary' && { color: C.green }, variant === 'warning' && { color: C.amber }]}>{title}</Text>}</Pressable>;
}

function Banner({ tone, children, onClose }) {
  return <View style={[styles.banner, tone === 'error' ? styles.errorBanner : styles.successBanner]}><Text style={styles.bannerText}>{children}</Text>{onClose ? <Pressable onPress={onClose}><Text style={styles.closeText}>×</Text></Pressable> : null}</View>;
}

function Empty({ title, text }) {
  return <View style={styles.empty}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.helper}>{text}</Text></View>;
}

function statusStyle(value) {
  if (value === 'submitted') return { color: C.amber, backgroundColor: C.amberLight };
  if (value === 'acknowledged') return { color: C.blue, backgroundColor: C.blueLight };
  if (value === 'in_progress') return { color: C.green, backgroundColor: C.greenLight };
  return { color: C.green, backgroundColor: C.greenLight };
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.background },
  app: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 },
  startupLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 28 },
  loadingTitle: { color: C.text, fontSize: 16, fontWeight: '800', marginTop: 3 },
  dataLoading: { minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20, borderWidth: 1, borderColor: C.border, borderRadius: 11, backgroundColor: '#fff', marginBottom: 12 },
  muted: { color: C.muted, fontSize: 12, lineHeight: 18 },
  helper: { color: C.subtle, fontSize: 10, lineHeight: 15 },
  eyebrow: { color: '#438466', fontSize: 9, letterSpacing: 1.4, fontWeight: '800' },
  loginPage: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  loginCard: { padding: 23, borderRadius: 17, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  brandMark: { width: 43, height: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: C.green, marginBottom: 20 },
  brandHeart: { color: '#fff', fontSize: 30, lineHeight: 34, fontWeight: '500' },
  loginTitle: { color: C.text, fontSize: 25, fontWeight: '800', marginTop: 7, marginBottom: 7 },
  loginFoot: { color: C.subtle, textAlign: 'center', marginTop: 17, fontSize: 10 },
  field: { gap: 6, marginTop: 12 },
  label: { color: '#496253', fontSize: 11, fontWeight: '700' },
  input: { minHeight: 42, paddingHorizontal: 11, paddingVertical: Platform.OS === 'web' ? 0 : 10, borderWidth: 1, borderColor: '#DCE7DD', borderRadius: 8, color: C.text, backgroundColor: '#fff', fontSize: 12 },
  multiline: { minHeight: 76, paddingTop: 10, textAlignVertical: 'top' },
  button: { minHeight: 41, alignItems: 'center', justifyContent: 'center', borderRadius: 9, paddingHorizontal: 13, marginTop: 9 },
  buttonLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  buttonPrimary: { backgroundColor: C.green },
  buttonResolve: { backgroundColor: '#376E4E' },
  buttonWarning: { backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#F0DEC8' },
  buttonSecondary: { backgroundColor: '#F4F8F4', borderWidth: 1, borderColor: C.border },
  buttonText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  topbar: { minHeight: 57, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: '#fff' },
  topTitle: { color: C.text, fontSize: 16, fontWeight: '800', marginTop: 2 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  availabilityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#35A369' },
  breakDot: { backgroundColor: '#E7A13E' },
  offlineDot: { backgroundColor: '#9BA7A0' },
  availabilityText: { color: C.muted, fontSize: 10, fontWeight: '700' },
  backText: { color: C.green, fontSize: 12, fontWeight: '800' },
  scroll: { flex: 1 },
  content: { padding: 15, paddingBottom: 28 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
  pageTitle: { color: C.text, fontSize: 24, lineHeight: 30, fontWeight: '800', marginTop: 5, marginBottom: 4 },
  smallButton: { paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: C.border, borderRadius: 8, backgroundColor: '#fff' },
  smallButtonText: { color: C.green, fontSize: 10, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 14 },
  statCard: { width: '48%', minHeight: 95, flexGrow: 1, padding: 12, borderWidth: 1, borderColor: C.border, borderRadius: 11, backgroundColor: '#fff' },
  statLabel: { color: C.muted, fontSize: 10, fontWeight: '700' },
  statValue: { color: C.text, fontSize: 23, fontWeight: '800', marginTop: 5 },
  statNote: { color: C.subtle, fontSize: 9, marginTop: 2 },
  card: { borderWidth: 1, borderColor: C.border, borderRadius: 11, backgroundColor: '#fff', marginBottom: 12, overflow: 'hidden' },
  cardHeading: { padding: 13, borderBottomWidth: 1, borderBottomColor: '#EFF3EF' },
  cardTitle: { color: '#284738', fontSize: 13, fontWeight: '800' },
  cardBody: { padding: 13, gap: 7 },
  coverageLine: { flexDirection: 'row', alignItems: 'baseline' },
  coverageNumber: { color: C.green, fontSize: 28, fontWeight: '800' },
  progress: { height: 7, borderRadius: 8, backgroundColor: '#EDF2ED', overflow: 'hidden', marginVertical: 4 },
  progressFill: { height: 7, backgroundColor: '#54AC73', borderRadius: 8 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 12 },
  link: { color: C.green, fontSize: 10, fontWeight: '800' },
  caseCard: { padding: 12, borderWidth: 1, borderColor: C.border, borderRadius: 10, backgroundColor: '#fff', marginBottom: 9 },
  caseTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  caseTitle: { flex: 1, color: C.text, fontSize: 12, fontWeight: '800' },
  casePatient: { color: C.muted, fontSize: 10, marginTop: 7 },
  caseDescription: { color: C.subtle, fontSize: 10, lineHeight: 15, marginTop: 5 },
  caseBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 },
  badge: { overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 12, fontSize: 8, fontWeight: '800' },
  badgeUrgent: { color: C.red, backgroundColor: C.redLight },
  badgeMinor: { color: '#4C7D58', backgroundColor: '#ECF6ED' },
  statusBadge: { overflow: 'hidden', alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 12, fontSize: 8, fontWeight: '700' },
  inlineBadges: { flexDirection: 'row', gap: 7, marginVertical: 6 },
  bodyStrong: { color: '#314D3D', fontSize: 11, fontWeight: '800' },
  bodyText: { color: '#60736A', fontSize: 11, lineHeight: 16 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 5 },
  disclaimer: { color: '#9A7754', fontSize: 9, lineHeight: 14, marginTop: 6 },
  message: { padding: 9, borderRadius: 9, backgroundColor: '#F1F6F1', marginBottom: 7 },
  staffMessage: { backgroundColor: '#E9F4ED' },
  messageMeta: { color: '#668071', fontSize: 9, fontWeight: '700', marginBottom: 5 },
  timelineItem: { borderLeftWidth: 2, borderLeftColor: '#DCE9DE', paddingLeft: 10, paddingBottom: 11 },
  timelineTitle: { color: '#3F5949', fontSize: 10, fontWeight: '800' },
  filters: { gap: 6, paddingVertical: 11 },
  filter: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff' },
  filterActive: { borderColor: '#92C5A0', backgroundColor: C.greenLight },
  filterText: { color: C.muted, fontSize: 9, fontWeight: '700' },
  filterTextActive: { color: C.green },
  empty: { alignItems: 'center', padding: 24, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, marginTop: 8 },
  emptyTitle: { color: '#425D4D', fontSize: 12, fontWeight: '800', marginBottom: 5 },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#EFF3EF' },
  option: { padding: 11, borderWidth: 1, borderColor: C.border, borderRadius: 8, marginBottom: 6 },
  optionSelected: { backgroundColor: '#F2F8F3', borderColor: '#92C5A0' },
  banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 10, borderRadius: 8, marginBottom: 10 },
  bannerText: { flex: 1, fontSize: 10, lineHeight: 15 },
  errorBanner: { backgroundColor: '#FFF0ED', borderWidth: 1, borderColor: '#F2D7D0' },
  successBanner: { backgroundColor: '#EAF6ED', borderWidth: 1, borderColor: '#D1E9D6' },
  closeText: { color: C.muted, fontSize: 18, paddingHorizontal: 4 },
  tabbar: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: C.border, backgroundColor: '#fff', paddingTop: 6, paddingBottom: Platform.OS === 'ios' ? 3 : 6 },
  tab: { flex: 1, minWidth: 48, alignItems: 'center', justifyContent: 'center', gap: 2, position: 'relative', paddingHorizontal: 2, paddingVertical: 3 },
  tabText: { color: '#89978D', fontSize: 9, fontWeight: '700', paddingVertical: 2 },
  tabActive: { color: C.green },
  tabDot: { position: 'absolute', top: 1, right: '27%', width: 6, height: 6, borderRadius: 3, backgroundColor: '#E0813B' },
  unread: { backgroundColor: '#F5FAF5' },
});

export default function ClinicStaffApp() {
  return <App />;
}
