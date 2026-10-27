import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Clock3, AlertTriangle, RefreshCw } from 'lucide-react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.50:8000';

interface ReportRecord {
  id: number;
  incident_label: string;
  severity: 'urgent' | 'minor';
  building: string;
  floor: string;
  description: string;
  status: string;
  created_at: string;
}

export default function HistoryScreen() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchReports = async () => {
    setErrorMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`Could not load reports (${response.status}).`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setReports(data);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load report history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>SAFE</Text>
          <Text style={styles.title}>Report History</Text>
        </View>
        <TouchableOpacity onPress={fetchReports} style={styles.refreshButton}>
          <RefreshCw size={16} color="#C8D6F0" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity onPress={fetchReports} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EF4444" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Clock3 size={32} color="#4A5F7A" />
              <Text style={styles.emptyTitle}>No reports yet</Text>
              <Text style={styles.emptySubtitle}>Reports submitted from your account will appear here.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isUrgent = item.severity === 'urgent';
            const accentColor = isUrgent ? '#EF4444' : '#22C55E';
            return (
              <View style={[styles.reportCard, { borderColor: isUrgent ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.2)' }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <AlertTriangle size={16} color={accentColor} />
                    <Text style={styles.reportTitle}>{item.incident_label}</Text>
                  </View>
                  <Text style={[styles.statusBadge, { color: accentColor }]}>{item.status.toUpperCase()}</Text>
                </View>
                <Text style={styles.reportLocation}>
                  {[item.building, item.floor].filter(Boolean).join(' · ')}
                </Text>
                {item.description ? (
                  <Text style={styles.reportDescription} numberOfLines={2}>{item.description}</Text>
                ) : null}
                <Text style={styles.reportTime}>{new Date(item.created_at).toLocaleString()}</Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080A0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A0C12',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  kicker: {
    color: '#EF4444',
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  title: {
    color: '#F0F4FF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#7A8FAD',
    fontSize: 13,
    marginTop: 10,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 13,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyTitle: {
    color: '#F0F4FF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: '#7A8FAD',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 240,
  },
  reportCard: {
    backgroundColor: '#0E1117',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  reportTitle: {
    color: '#F0F4FF',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
  },
  reportLocation: {
    color: '#AAB8CE',
    fontSize: 12,
    marginBottom: 6,
  },
  reportDescription: {
    color: '#7A8FAD',
    fontSize: 12,
    marginBottom: 10,
  },
  reportTime: {
    color: '#4A5F7A',
    fontFamily: 'monospace',
    fontSize: 10,
  },
});