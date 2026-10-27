import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldCheck, LogIn, UserPlus } from 'lucide-react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.101:8000';

type AuthMode = 'login' | 'signup';

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [identifier, setIdentifier] = useState(''); // Email or username for login
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [course, setCourse] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountType, setAccountType] = useState<'student' | 'visitor'>('student');

  const handleAuth = async () => {
    // Validation
    if (mode === 'login' && !identifier.trim()) {
      Alert.alert('Error', 'Enter your email or username.');
      return;
    }
    if (mode === 'signup' && (!displayName.trim() || !username.trim() || !email.trim())) {
      Alert.alert('Error', 'Enter your name, username, and email address.');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Enter your password.');
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch CSRF token
      const csrfRes = await fetch(`${API_BASE_URL}/api/auth/csrf/`, { credentials: 'include' });
      const csrfData = await csrfRes.json();

      if (!csrfRes.ok || !csrfData.csrf_token) {
        throw new Error('Security check expired. Check that Django is running.');
      }

      const endpoint = mode === 'signup' ? '/api/auth/signup/' : '/api/auth/login/';
      const bodyPayload = mode === 'signup'
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
        : {
            identifier: identifier.trim(),
            password,
          };

      // 2. Submit Auth request
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfData.csrf_token,
        },
        body: JSON.stringify(bodyPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Authentication failed.');
      }

      if (!result.user) {
        throw new Error('The server did not return a valid user profile.');
      }

      const user = result.user;
      Alert.alert('Success', `Welcome, ${user.display_name || user.name || 'User'}!`);

      // 3. ROLE-BASED REDIRECTION
      if (user.user_type === 'clinic_staff' || user.user_type === 'responder') {
        router.replace('/clinic'); // Route to clinic dashboard
      } else {
        router.replace('/(tabs)'); // Route to standard student/visitor tabs
      }

    } catch (error) {
      Alert.alert('Authentication Error', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconBox}>
          <ShieldCheck size={24} color="#EF4444" />
        </View>
        <Text style={styles.kicker}>SAFE RESPONSE NETWORK</Text>
        <Text style={styles.title}>SAFE APP</Text>
        <Text style={styles.subtitle}>
          {mode === 'login' ? 'Sign in to continue to your dashboard.' : 'Create a student or visitor account.'}
        </Text>

        {/* Mode Selector Tabs */}
        <View style={styles.tabSwitch}>
          <TouchableOpacity
            style={[styles.tabButton, mode === 'login' && styles.activeTab]}
            onPress={() => setMode('login')}
          >
            <Text style={[styles.tabText, mode === 'login' && styles.activeTabText]}>Log in</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, mode === 'signup' && styles.activeTab]}
            onPress={() => setMode('signup')}
          >
            <Text style={[styles.tabText, mode === 'signup' && styles.activeTabText]}>Sign up</Text>
          </TouchableOpacity>
        </View>

        {/* Form Inputs */}
        {mode === 'signup' ? (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Full name</Text>
              <TextInput style={styles.input} placeholder="Your name" placeholderTextColor="#7A8FAD" value={displayName} onChangeText={setDisplayName} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Username</Text>
              <TextInput style={styles.input} placeholder="Choose a username" placeholderTextColor="#7A8FAD" autoCapitalize="none" value={username} onChangeText={setUsername} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Account type</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[styles.tabButton, accountType === 'student' && styles.activeTab]}
                  onPress={() => setAccountType('student')}
                >
                  <Text style={[styles.tabText, accountType === 'student' && styles.activeTabText]}>Student</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabButton, accountType === 'visitor' && styles.activeTab]}
                  onPress={() => setAccountType('visitor')}
                >
                  <Text style={[styles.tabText, accountType === 'visitor' && styles.activeTabText]}>Visitor</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Email address</Text>
              <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor="#7A8FAD" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Student ID</Text>
              <TextInput style={styles.input} placeholder="Your ID" placeholderTextColor="#7A8FAD" value={studentId} onChangeText={setStudentId} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Course</Text>
              <TextInput style={styles.input} placeholder="Course or program" placeholderTextColor="#7A8FAD" value={course} onChangeText={setCourse} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Phone number</Text>
              <TextInput style={styles.input} placeholder="Contact number" placeholderTextColor="#7A8FAD" keyboardType="phone-pad" value={phoneNumber} onChangeText={setPhoneNumber} />
            </View>
          </>
        ) : (
          <View style={styles.field}>
            <Text style={styles.label}>Email or username</Text>
            <TextInput style={styles.input} placeholder="Enter your email or username" placeholderTextColor="#7A8FAD" autoCapitalize="none" value={identifier} onChangeText={setIdentifier} />
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} placeholder="Your password" placeholderTextColor="#7A8FAD" secureTextEntry value={password} onChangeText={setPassword} />
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleAuth} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              {mode === 'login' ? <LogIn size={17} color="#fff" /> : <UserPlus size={17} color="#fff" />}
              <Text style={styles.submitText}>
                {mode === 'login' ? 'Sign in to SAFE' : 'Create SAFE account'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Clinic staff sign in with their administrator-provided account credentials.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#080A0F',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#0E1117',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    padding: 24,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(220,38,38,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  kicker: {
    color: '#EF4444',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: {
    color: '#F0F4FF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: '#91A0B8',
    fontSize: 13,
    marginBottom: 20,
  },
  tabSwitch: {
    flexDirection: 'row',
    backgroundColor: '#090C12',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#17202D',
  },
  tabText: {
    color: '#7A8FAD',
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#F0F4FF',
  },
  field: {
    marginBottom: 14,
  },
  label: {
    color: '#AAB8CE',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#090C12',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    color: '#F0F4FF',
    fontSize: 14,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#15803D',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footerNote: {
    color: '#4A5F7A',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 16,
  },
});