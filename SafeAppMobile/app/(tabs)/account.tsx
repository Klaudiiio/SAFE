import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { UserRound, ShieldCheck, LogOut } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.50:8000';

interface UserProfile {
  name?: string;
  display_name?: string;
  email?: string;
  account_type?: string;
}

export default function AccountScreen() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  // Example placeholder user state (in production, pass this via Context or Auth State)
  const [user] = useState<UserProfile>({
    display_name: 'Student User',
    email: 'user@example.com',
    account_type: 'student',
  });

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      // 1. Fetch CSRF Token
      const csrfRes = await fetch(`${API_BASE_URL}/api/auth/csrf/`, { credentials: 'include' });
      const csrfData = await csrfRes.json();

      // 2. Send logout request
      const response = await fetch(`${API_BASE_URL}/api/auth/logout/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfData?.csrf_token || '',
        },
      });

      if (!response.ok) {
        throw new Error('Could not complete sign out.');
      }

      // Navigate back to the auth/login root
      router.replace('/');
    } catch (error) {
      Alert.alert('Logout Error', error instanceof Error ? error.message : 'Something went wrong signing out.');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.kicker}>SAFE</Text>
        <Text style={styles.title}>Account Information</Text>
      </View>

      <View style={styles.cardGroup}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarBox}>
            <UserRound size={22} color="#FCA5A5" />
          </View>
          <View style={styles.profileText}>
            <Text style={styles.userName}>{user.display_name || user.name || 'SAFE User'}</Text>
            <Text style={styles.userEmail}>{user.email || 'No email associated'}</Text>
          </View>
        </View>

        {/* Verification Status */}
        <View style={styles.statusCard}>
          <ShieldCheck size={20} color="#22C55E" />
          <View style={styles.statusText}>
            <Text style={styles.statusTitle}>
              {user.account_type === 'student' ? 'Student Demo Account' : 'Visitor Demo Account'}
            </Text>
            <Text style={styles.statusSubtitle}>Identity Check Status: Active Session</Text>
          </View>
        </View>

        {/* Disclaimer Notice */}
        <Text style={styles.disclaimerText}>
          Identity checks and emergency logging are active for your security. Ensure your emergency contact details remain up to date.
        </Text>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loggingOut}
          activeOpacity={0.8}
        >
          {loggingOut ? (
            <ActivityIndicator color="#C8D6F0" />
          ) : (
            <>
              <LogOut size={16} color="#C8D6F0" />
              <Text style={styles.logoutText}>Sign out</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080A0F',
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#0A0C12',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom: 20,
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
  cardGroup: {
    paddingHorizontal: 16,
    gap: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0E1117',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239,68,68,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    flex: 1,
  },
  userName: {
    color: '#F0F4FF',
    fontSize: 16,
    fontWeight: '700',
  },
  userEmail: {
    color: '#7A8FAD',
    fontSize: 12,
    marginTop: 2,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0E1117',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
    padding: 16,
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    color: '#F0F4FF',
    fontSize: 13,
    fontWeight: '600',
  },
  statusSubtitle: {
    color: '#7A8FAD',
    fontSize: 11,
    marginTop: 2,
  },
  disclaimerText: {
    color: '#7A8FAD',
    fontSize: 11,
    lineHeight: 16,
    marginVertical: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  logoutText: {
    color: '#C8D6F0',
    fontSize: 14,
    fontWeight: '600',
  },
});