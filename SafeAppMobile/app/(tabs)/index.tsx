import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Shield, AlertTriangle, Clock, Thermometer, Wind, Droplets } from 'lucide-react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.50:8000';

export default function HomeScreen() {
  const [pressed, setPressed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update local clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleEmergencyPress = async () => {
    setPressed(true);

    try {
      // Example emergency trigger API call
      // You can route this to your emergency report workflow or step 2 incident selection
      Alert.alert(
        'Emergency Triggered',
        'Your emergency alert signal has been sent to the response network.',
        [{ text: 'OK', onPress: () => setPressed(false) }]
      );
    } catch (error) {
      Alert.alert('Error', 'Could not transmit emergency signal.');
      setPressed(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBox}>
            <Shield size={18} color="#EF4444" />
          </View>
          <View>
            <Text style={styles.headerKicker}>SAFE</Text>
            <Text style={styles.headerTitle}>Emergency Alert System</Text>
          </View>
        </View>
        <View style={styles.onlineBadge}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>ONLINE</Text>
        </View>
      </View>

      {/* Environmental Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Clock size={12} color="#7A8FAD" />
            <Text style={styles.statLabel}>LOCAL TIME</Text>
          </View>
          <Text style={styles.statValueLarge}>
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={styles.statSubText}>{currentTime.toLocaleDateString()}</Text>
        </View>

        <View style={[styles.statCard, { borderColor: 'rgba(249,115,22,0.2)' }]}>
          <View style={styles.statHeader}>
            <Thermometer size={12} color="#F97316" />
            <Text style={[styles.statLabel, { color: '#F97316' }]}>TEMPERATURE</Text>
          </View>
          <Text style={[styles.statValueLarge, { color: '#F97316' }]}>88°F</Text>
          <Text style={styles.statSubText}>Humidity: 72%</Text>
        </View>
      </View>

      {/* Center Emergency Trigger Button */}
      <View style={styles.triggerContainer}>
        <Text style={styles.triggerMainTitle}>EMERGENCY</Text>
        <Text style={styles.triggerSubtitle}>PRESS ONCE TO ACTIVATE ALERT</Text>

        <TouchableOpacity
          style={[styles.emergencyButton, pressed && styles.emergencyButtonPressed]}
          activeOpacity={0.8}
          onPress={handleEmergencyPress}
        >
          <AlertTriangle size={52} color="#FFFFFF" />
          <Text style={styles.buttonText}>{pressed ? 'ACTIVATING...' : 'EMERGENCY'}</Text>
        </TouchableOpacity>

        <Text style={styles.footerWarning}>
          ONE PRESS ACTIVATES EMERGENCY PROTOCOL · ALL SESSIONS ARE LOGGED
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#080A0F',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A0C12',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(220,38,38,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerKicker: {
    color: '#EF4444',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerTitle: {
    color: '#F0F4FF',
    fontSize: 13,
    fontWeight: '700',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 'auto',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  onlineText: {
    color: '#22C55E',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#0E1117',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statLabel: {
    color: '#7A8FAD',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '600',
  },
  statValueLarge: {
    color: '#F0F4FF',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 2,
  },
  statSubText: {
    color: '#7A8FAD',
    fontFamily: 'monospace',
    fontSize: 10,
  },
  triggerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  triggerMainTitle: {
    color: '#F0F4FF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  triggerSubtitle: {
    color: '#7A8FAD',
    fontFamily: 'monospace',
    fontSize: 11,
    marginTop: 4,
    marginBottom: 30,
    letterSpacing: 1,
  },
  emergencyButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 10,
    borderWidth: 4,
    borderColor: 'rgba(239,68,68,0.5)',
  },
  emergencyButtonPressed: {
    backgroundColor: '#991B1B',
    transform: [{ scale: 0.96 }],
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
    letterSpacing: 1,
  },
  footerWarning: {
    color: '#4A5F7A',
    fontFamily: 'monospace',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 35,
    letterSpacing: 0.5,
    maxWidth: 280,
  },
});