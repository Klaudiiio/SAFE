import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, TextInput,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ShieldCheck, Activity, HeartPulse, CheckCircle,
  AlertTriangle, LogOut, RefreshCw, ChevronRight,
  LayoutDashboard, Users, CalendarDays, MessageCircle,
  ClipboardList, Stethoscope, ArrowLeft, Send, Check, Phone, MapPin, CheckCheck, Shield, Ambulance
} from 'lucide-react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.101:8000';

type Page = "overview" | "cases" | "patients" | "calendar" | "messages" | "reports" | "resources" | "settings";
type Bucket = "incoming" | "active" | "completed" | "all";

interface CaseRecord {
  id: number;
  incident_label: string;
  severity: 'urgent' | 'minor';
  building: string;
  floor: string;
  description: string;
  status: string;
  created_at: string;
  guidance?: string;
  patient?: {
    id: number;
    case_reference?: string;
    name?: string;
    email?: string;
    phone_number?: string;
    account_type?: string;
  } | null;
  timeline?: Array<{ id: number; event_type: string; remarks: string; action_time: string; actor: string }>;
}

interface Responder {
  name: string;
  department: string;
  username: string;
  email: string;
  contact_number: string;
  availability_status: "available" | "unavailable" | "on_break";
}

export default function ClinicDashboardScreen() {
  const router = useRouter();
  const [responder, setResponder] = useState<Responder | null>(null);
  const [page, setPage] = useState<Page>("overview");
  const [bucket, setBucket] = useState<Bucket>("incoming");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [search, setSearch] = useState("");
  const [dashboard, setDashboard] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [reportSummary, setReportSummary] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState('');

  const fetchClinicData = useCallback(async () => {
    setErrorMessage('');
    try {
      const sessionRes = await fetch(`${API_BASE_URL}/api/clinic/session/`, { credentials: 'include' });
      if (sessionRes.ok) {
        setResponder(await sessionRes.json());
      }

      const dashRes = await fetch(`${API_BASE_URL}/api/clinic/dashboard/`, { credentials: 'include' });
      if (dashRes.ok) {
        setDashboard(await dashRes.json());
      }

      const casesRes = await fetch(`${API_BASE_URL}/api/clinic/cases/?bucket=${bucket}&q=${encodeURIComponent(search)}`, {
        credentials: 'include',
      });
      if (casesRes.ok) {
        const data = await casesRes.json();
        if (Array.isArray(data)) setCases(data);
      }

      if (page === 'patients') {
        const patRes = await fetch(`${API_BASE_URL}/api/clinic/patients/?q=${encodeURIComponent(search)}`, { credentials: 'include' });
        if (patRes.ok) setPatients(await patRes.json());
      }

      if (page === 'reports') {
        const repRes = await fetch(`${API_BASE_URL}/api/clinic/reports/`, { credentials: 'include' });
        if (repRes.ok) setReportSummary(await repRes.json());
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load clinic data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bucket, page, search]);

  useEffect(() => {
    fetchClinicData();
  }, [fetchClinicData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClinicData();
  };

  const handleLogout = async () => {
    try {
      const csrfRes = await fetch(`${API_BASE_URL}/api/auth/csrf/`, { credentials: 'include' });
      const csrfData = await csrfRes.json();
      await fetch(`${API_BASE_URL}/api/auth/logout/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRFToken': csrfData?.csrf_token || '' },
      });
      router.replace('/');
    } catch {
      router.replace('/');
    }
  };

  const updateCaseStatus = async (caseId: number, action: string) => {
    try {
      const csrfRes = await fetch(`${API_BASE_URL}/api/auth/csrf/`, { credentials: 'include' });
      const csrfData = await csrfRes.json();
      const res = await fetch(`${API_BASE_URL}/api/clinic/cases/${caseId}/actions/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfData?.csrf_token || '',
        },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error('Could not update case status.');
      Alert.alert('Success', 'Case action completed.');
      fetchClinicData();
      if (selectedCase) setSelectedCase(null);
    } catch (err) {
      Alert.alert('Action Error', err instanceof Error ? err.message : 'Failed to process action.');
    }
  };

  const openCase = async (record: CaseRecord) => {
    setSelectedCase(record);
    try {
      const msgRes = await fetch(`${API_BASE_URL}/api/clinic/cases/${record.id}/messages/`, { credentials: 'include' });
      if (msgRes.ok) setMessages(await msgRes.json());
    } catch {
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!selectedCase || !messageDraft.trim()) return;
    try {
      const csrfRes = await fetch(`${API_BASE_URL}/api/auth/csrf/`, { credentials: 'include' });
      const csrfData = await csrfRes.json();
      const res = await fetch(`${API_BASE_URL}/api/clinic/cases/${selectedCase.id}/messages/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfData?.csrf_token || '',
        },
        body: JSON.stringify({ message: messageDraft.trim() }),
      });
      if (res.ok) {
        const sentMsg = await res.json();
        setMessages((prev) => [...prev, sentMsg]);
        setMessageDraft('');
      }
    } catch {
      Alert.alert('Error', 'Could not send message.');
    }
  };

  const changeAvailability = async (status: "available" | "unavailable" | "on_break") => {
    try {
      const csrfRes = await fetch(`${API_BASE_URL}/api/auth/csrf/`, { credentials: 'include' });
      const csrfData = await csrfRes.json();
      const res = await fetch(`${API_BASE_URL}/api/clinic/availability/`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfData?.csrf_token || '',
        },
        body: JSON.stringify({ availability_status: status }),
      });
      if (res.ok) {
        setResponder(await res.json());
      }
    } catch {
      Alert.alert('Error', 'Could not update availability.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topbar}>
        <View style={styles.logoGroup}>
          <View style={styles.logoIcon}>
            <HeartPulse size={16} color="#fff" />
          </View>
          <View>
            <Text style={styles.logoTitle}>SAFE</Text>
            <Text style={styles.logoSubtitle}>CLINIC STAFF</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut size={14} color="#19382D" />
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Main Scrollable Content Area (padded at bottom to avoid overlapping fixed tab bar) */}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#18784E" />}
      >
        {errorMessage ? (
          <View style={styles.alertError}>
            <AlertTriangle size={15} color="#A34132" />
            <Text style={styles.alertErrorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* 1. DASHBOARD TAB */}
        {page === 'overview' && !selectedCase && (
          <>
            <View style={styles.pageHeading}>
              <Text style={styles.kicker}>RESPONSE OVERVIEW</Text>
              <Text style={styles.headingTitle}>Good day, {responder?.name?.split(' ')[0] || 'Staff'}</Text>
              <Text style={styles.headingSubtitle}>Here is the latest activity from your clinic response queue.</Text>
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <View style={[styles.metricIconBox, { backgroundColor: '#e5f5eb' }]}>
                  <Activity size={18} color="#18784E" />
                </View>
                <View>
                  <Text style={styles.metricLabel}>Incoming cases</Text>
                  <Text style={styles.metricValue}>{dashboard?.incoming_count ?? 0}</Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconBox, { backgroundColor: '#eaf3f9' }]}>
                  <HeartPulse size={18} color="#457C9C" />
                </View>
                <View>
                  <Text style={styles.metricLabel}>Active responses</Text>
                  <Text style={styles.metricValue}>{dashboard?.active_count ?? 0}</Text>
                </View>
              </View>
            </View>

            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Recent emergency queue</Text>
                <TouchableOpacity onPress={() => setPage('cases')}>
                  <Text style={styles.linkText}>View all <ChevronRight size={13} color="#28784F" /></Text>
                </TouchableOpacity>
              </View>
              {dashboard?.recent_cases?.length === 0 ? (
                <Text style={styles.mutedText}>No recent cases recorded.</Text>
              ) : (
                dashboard?.recent_cases?.map((item: CaseRecord) => (
                  <TouchableOpacity key={item.id} style={styles.caseRow} onPress={() => openCase(item)}>
                    <View style={styles.caseSymbol}>
                      <Activity size={15} color="#18784E" />
                    </View>
                    <View style={styles.caseMain}>
                      <Text style={styles.caseTitle} numberOfLines={1}>{item.incident_label}</Text>
                      <Text style={styles.caseSub}>{item.building} · {item.floor}</Text>
                    </View>
                    <View style={[styles.badge, item.severity === 'urgent' ? styles.badgeUrgent : styles.badgeMinor]}>
                      <Text style={[styles.badgeText, item.severity === 'urgent' ? styles.badgeTextUrgent : styles.badgeTextMinor]}>
                        {item.severity.toUpperCase()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}

        {/* 2. CASE QUEUE TAB OR CASE DETAIL VIEW */}
        {page === 'cases' && !selectedCase && (
          <>
            <View style={styles.pageHeading}>
              <Text style={styles.kicker}>SHARED RESPONSE WORKSPACE</Text>
              <Text style={styles.headingTitle}>Case queue</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bucketRow}>
              {(['incoming', 'active', 'completed', 'all'] as Bucket[]).map((b) => (
                <TouchableOpacity key={b} style={[styles.bucketTab, bucket === b && styles.bucketTabActive]} onPress={() => setBucket(b)}>
                  <Text style={[styles.bucketText, bucket === b && styles.bucketTextActive]}>{b.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={styles.searchInput}
              placeholder="Search building, code, or incident..."
              placeholderTextColor="#98A59C"
              value={search}
              onChangeText={setSearch}
            />

            <View style={styles.panel}>
              {cases.length === 0 ? (
                <Text style={styles.mutedText}>No matching cases found.</Text>
              ) : (
                cases.map((item) => (
                  <TouchableOpacity key={item.id} style={styles.caseRow} onPress={() => openCase(item)}>
                    <View style={styles.caseSymbol}>
                      <Activity size={15} color="#18784E" />
                    </View>
                    <View style={styles.caseMain}>
                      <Text style={styles.caseTitle}>{item.incident_label}</Text>
                      <Text style={styles.caseSub}>{item.building} ({item.floor})</Text>
                    </View>
                    <View style={[styles.badge, item.status === 'resolved' ? styles.badgeResolved : styles.badgeMinor]}>
                      <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}

        {/* CASE DETAIL VIEW */}
        {selectedCase && (
          <View style={styles.panel}>
            <TouchableOpacity style={styles.backButton} onPress={() => setSelectedCase(null)}>
              <ArrowLeft size={15} color="#19382D" />
              <Text style={styles.backText}>Back to queue</Text>
            </TouchableOpacity>

            <Text style={styles.detailHeading}>Case #{selectedCase.id}: {selectedCase.incident_label}</Text>
            <Text style={styles.detailSub}>{selectedCase.building} · {selectedCase.floor}</Text>

            <View style={styles.sectionBox}>
              <Text style={styles.sectionHeader}>Patient Information</Text>
              <Text style={styles.factText}>Name: {selectedCase.patient?.name || 'Unknown'}</Text>
              <Text style={styles.factText}>Phone: {selectedCase.patient?.phone_number || 'Not provided'}</Text>
            </View>

            <View style={styles.sectionBox}>
              <Text style={styles.sectionHeader}>Incident Description</Text>
              <Text style={styles.descriptionText}>{selectedCase.description || 'No description provided.'}</Text>
            </View>

            <View style={styles.sectionBox}>
              <Text style={styles.sectionHeader}>Secure Case Messages</Text>
              {messages.length === 0 ? (
                <Text style={styles.mutedText}>No messages exchanged yet.</Text>
              ) : (
                messages.map((m, idx) => (
                  <View key={idx} style={[styles.chatBubble, m.sender_role === 'clinic' && styles.chatBubbleStaff]}>
                    <Text style={styles.chatSender}>{m.sender_name}</Text>
                    <Text style={styles.chatText}>{m.message}</Text>
                  </View>
                ))
              )}
              <View style={styles.messageForm}>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Type a message..."
                  placeholderTextColor="#98A59C"
                  value={messageDraft}
                  onChangeText={setMessageDraft}
                />
                <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                  <Send size={15} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.actionColumn}>
              {['submitted', 'acknowledged'].includes(selectedCase.status) && (
                <TouchableOpacity style={styles.primaryButton} onPress={() => updateCaseStatus(selectedCase.id, 'accept')}>
                  <Check size={14} color="#fff" />
                  <Text style={styles.primaryButtonText}>Acknowledge Case</Text>
                </TouchableOpacity>
              )}
              {['submitted', 'acknowledged', 'in_progress'].includes(selectedCase.status) && (
                <TouchableOpacity style={styles.resolveButton} onPress={() => updateCaseStatus(selectedCase.id, 'resolve')}>
                  <CheckCheck size={14} color="#fff" />
                  <Text style={styles.resolveButtonText}>Mark Resolved</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* 3. PATIENTS TAB */}
        {page === 'patients' && !selectedCase && (
          <View style={styles.panel}>
            <Text style={styles.headingTitle}>Registered Patients</Text>
            <Text style={[styles.mutedText, { marginBottom: 10 }]}>Patients who have submitted an incident report.</Text>
            {patients.length === 0 ? (
              <Text style={styles.mutedText}>No patient records found.</Text>
            ) : (
              patients.map((p, idx) => (
                <View key={idx} style={styles.caseRow}>
                  <View style={styles.caseMain}>
                    <Text style={styles.caseTitle}>{p.name}</Text>
                    <Text style={styles.caseSub}>{p.email} · {p.phone_number || 'No phone'}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* 4. TIMELINE / CALENDAR TAB */}
        {page === 'calendar' && !selectedCase && (
          <View style={styles.panel}>
            <Text style={styles.headingTitle}>Activity Timeline</Text>
            <Text style={[styles.mutedText, { marginBottom: 10 }]}>Recent cases arranged chronologically.</Text>
            {dashboard?.recent_cases?.length === 0 ? (
              <Text style={styles.mutedText}>No recent activity.</Text>
            ) : (
              dashboard?.recent_cases?.map((c: CaseRecord) => (
                <TouchableOpacity key={c.id} style={styles.caseRow} onPress={() => openCase(c)}>
                  <View style={styles.caseMain}>
                    <Text style={styles.caseTitle}>{c.incident_label}</Text>
                    <Text style={styles.caseSub}>{new Date(c.created_at).toLocaleString()}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* 5. MESSAGES TAB */}
        {page === 'messages' && !selectedCase && (
          <View style={styles.panel}>
            <Text style={styles.headingTitle}>Secure Messages</Text>
            <Text style={[styles.mutedText, { marginBottom: 10 }]}>Open a case to continue its patient conversation.</Text>
            {dashboard?.recent_cases?.length === 0 ? (
              <Text style={styles.mutedText}>No active conversations.</Text>
            ) : (
              dashboard?.recent_cases?.map((c: CaseRecord) => (
                <TouchableOpacity key={c.id} style={styles.caseRow} onPress={() => openCase(c)}>
                  <View style={styles.caseMain}>
                    <Text style={styles.caseTitle}>{c.incident_label} ({c.patient?.name || 'Patient'})</Text>
                    <Text style={styles.caseSub}>Tap to open chat</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* 6. REPORTS TAB */}
        {page === 'reports' && !selectedCase && (
          <View style={styles.panel}>
            <Text style={styles.headingTitle}>Clinic Reports</Text>
            <Text style={[styles.mutedText, { marginBottom: 10 }]}>Incident summary for the last 30 days.</Text>
            {reportSummary ? (
              <View style={{ gap: 8, marginTop: 6 }}>
                <Text style={styles.factText}>Total cases: {reportSummary.total}</Text>
                <Text style={styles.factText}>Urgent cases: {reportSummary.urgent}</Text>
                <Text style={styles.factText}>Resolved cases: {reportSummary.resolved}</Text>
                <Text style={styles.factText}>Resolution rate: {reportSummary.resolution_rate}%</Text>
              </View>
            ) : (
              <Text style={styles.mutedText}>Loading summary reports...</Text>
            )}
          </View>
        )}

        {/* 7. RESOURCES TAB */}
        {page === 'resources' && !selectedCase && (
          <View style={styles.panel}>
            <Text style={styles.headingTitle}>Clinic Resources</Text>
            <View style={{ gap: 12, marginTop: 10 }}>
              <View style={styles.resourceCard}>
                <Text style={styles.caseTitle}>Emergency Transport</Text>
                <Text style={styles.mutedText}>Use case actions to log ambulance requests. Does not place emergency calls automatically.</Text>
              </View>
              <View style={styles.resourceCard}>
                <Text style={styles.caseTitle}>Patient Privacy</Text>
                <Text style={styles.mutedText}>All patient communications and clinical details are restricted to authorized responders.</Text>
              </View>
            </View>
          </View>
        )}

        {/* 8. SETTINGS TAB */}
        {page === 'settings' && !selectedCase && (
          <View style={styles.panel}>
            <Text style={styles.headingTitle}>Responder Settings</Text>
            <Text style={styles.sectionHeader}>Profile Info</Text>
            <Text style={styles.factText}>{responder?.name} ({responder?.department})</Text>
            <Text style={styles.factText}>{responder?.email}</Text>

            <Text style={[styles.sectionHeader, { marginTop: 14 }]}>Current Availability</Text>
            <View style={{ gap: 8, marginTop: 6 }}>
              {(['available', 'on_break', 'unavailable'] as const).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.bucketTab, responder?.availability_status === status && styles.bucketTabActive]}
                  onPress={() => changeAvailability(status)}
                >
                  <Text style={[styles.bucketText, responder?.availability_status === status && styles.bucketTextActive]}>
                    {status.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Navigation Bar (Non-scrollable, pinned at bottom) */}
      <View style={styles.bottomNav}>
        {[
          { id: 'overview', label: 'Home', icon: LayoutDashboard },
          { id: 'cases', label: 'Queue', icon: Activity },
          { id: 'patients', label: 'Patients', icon: Users },
          { id: 'calendar', label: 'Timeline', icon: CalendarDays },
          { id: 'messages', label: 'Chats', icon: MessageCircle },
          { id: 'reports', label: 'Reports', icon: ClipboardList },
          { id: 'resources', label: 'Resources', icon: HeartPulse },
          { id: 'settings', label: 'Settings', icon: Stethoscope },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = page === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.bottomNavItem}
              onPress={() => { setPage(tab.id as Page); setSelectedCase(null); }}
              activeOpacity={0.8}
            >
              <Icon size={18} color={isActive ? '#18784E' : '#74867B'} />
              <Text style={[styles.bottomNavText, isActive && styles.bottomNavTextActive]} numberOfLines={1}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8F5' },
  topbar: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E6EDE7' },
  logoGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#18784E', alignItems: 'center', justifyContent: 'center' },
  logoTitle: { color: '#19382D', fontWeight: '800', fontSize: 14 },
  logoSubtitle: { color: '#74867B', fontSize: 7, fontWeight: '800' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DFE8E0', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  logoutText: { color: '#19382D', fontSize: 10, fontWeight: '700' },

  // Fixed Bottom Navigation Bar Styles
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E6EDE7',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 4,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: { ios: 0.05, android: 0.1 }[Platform.OS === 'ios' ? 'ios' : 'android'] || 0.05,
    shadowRadius: 4,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  bottomNavText: {
    color: '#74867B',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  bottomNavTextActive: {
    color: '#18784E',
    fontWeight: '800',
  },

  content: { padding: 16, paddingBottom: 80, gap: 14 },
  pageHeading: { marginBottom: 2 },
  kicker: { color: '#438466', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  headingTitle: { color: '#19382D', fontSize: 20, fontWeight: '800', marginTop: 2 },
  headingSubtitle: { color: '#74867B', fontSize: 11, marginTop: 2 },
  metricsGrid: { flexDirection: 'row', gap: 10 },
  metricCard: { flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E7EEE8', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  metricIconBox: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  metricLabel: { color: '#728379', fontSize: 9, fontWeight: '600' },
  metricValue: { color: '#213E30', fontSize: 18, fontWeight: '800' },
  panel: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E7EEE8', borderRadius: 10, padding: 14 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  panelTitle: { color: '#284738', fontSize: 13, fontWeight: '700' },
  linkText: { color: '#28784F', fontSize: 10, fontWeight: '700' },
  mutedText: { color: '#8B9990', fontSize: 11 },
  caseRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#EFF3EF' },
  caseSymbol: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#EDF7EF', alignItems: 'center', justifyContent: 'center' },
  caseMain: { flex: 1 },
  caseTitle: { color: '#294637', fontSize: 11, fontWeight: '700' },
  caseSub: { color: '#87968C', fontSize: 9, marginTop: 1 },
  badge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 20 },
  badgeUrgent: { backgroundColor: '#FFF0EB' },
  badgeMinor: { backgroundColor: '#ECF6ED' },
  badgeResolved: { backgroundColor: '#E8F5EC' },
  badgeText: { fontSize: 8, fontWeight: '700' },
  badgeTextUrgent: { color: '#B74734' },
  badgeTextMinor: { color: '#4C7D58' },
  bucketRow: { flexDirection: 'row', marginBottom: 4 },
  bucketTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5ECE6', marginRight: 6 },
  bucketTabActive: { backgroundColor: '#EAF5EC', borderColor: '#92C5A0' },
  bucketText: { color: '#75867B', fontSize: 9, fontWeight: '600' },
  bucketTextActive: { color: '#216E49', fontWeight: '700' },
  searchInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E3EAE4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 11, color: '#355346', marginBottom: 4 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  backText: { color: '#19382D', fontSize: 11, fontWeight: '700' },
  detailHeading: { color: '#19382D', fontSize: 16, fontWeight: '800' },
  detailSub: { color: '#74867B', fontSize: 10, marginBottom: 10 },
  sectionBox: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#EDF2ED' },
  sectionHeader: { color: '#284738', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  factText: { color: '#60736A', fontSize: 10 },
  descriptionText: { color: '#60736A', fontSize: 10, backgroundColor: '#F7FAF7', padding: 8, borderRadius: 6 },
  chatBubble: { backgroundColor: '#F1F6F1', padding: 8, borderRadius: 8, marginBottom: 6 },
  chatBubbleStaff: { backgroundColor: '#E9F4ED' },
  chatSender: { color: '#486451', fontSize: 9, fontWeight: '700' },
  chatText: { color: '#476051', fontSize: 10, marginTop: 2 },
  messageForm: { flexDirection: 'row', gap: 6, marginTop: 8 },
  messageInput: { flex: 1, borderWidth: 1, borderColor: '#DCE7DD', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 10, backgroundColor: '#FFF' },
  sendButton: { backgroundColor: '#18784E', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, borderRadius: 6 },
  actionColumn: { marginTop: 14, gap: 8 },
  primaryButton: { backgroundColor: '#18784E', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 6 },
  primaryButtonText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  resolveButton: { backgroundColor: '#145D40', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 6 },
  resolveButtonText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  alertError: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF0ED', borderWidth: 1, borderColor: '#F2D7D0', padding: 10, borderRadius: 8, marginBottom: 8 },
  alertErrorText: { color: '#9C4738', fontSize: 11 },
  resourceCard: { backgroundColor: '#F7FAF7', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E6EDE7' },
});