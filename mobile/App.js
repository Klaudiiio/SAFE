import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function App() {
  const [address, setAddress] = useState('http://192.168.0.108:5173');
  const [appUrl, setAppUrl] = useState(address);
  const [reloadVersion, setReloadVersion] = useState(0);

  const loadApp = () => {
    const nextUrl = address.trim();
    if (!nextUrl) return;
    setAppUrl(nextUrl.startsWith('http://') || nextUrl.startsWith('https://') ? nextUrl : `http://${nextUrl}`);
    setReloadVersion((version) => version + 1);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.toolbar}>
          <Text style={styles.title}>SAFE</Text>
          <TextInput
            accessibilityLabel="SAFE app address"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            onChangeText={setAddress}
            onSubmitEditing={loadApp}
            placeholder="http://computer-ip:5173"
            placeholderTextColor="#8490A2"
            returnKeyType="go"
            selectTextOnFocus
            style={styles.addressInput}
            value={address}
          />
          <Pressable accessibilityRole="button" onPress={loadApp} style={styles.loadButton}>
            <Text style={styles.loadButtonText}>Open</Text>
          </Pressable>
        </View>
        <WebView
          key={`${appUrl}:${reloadVersion}`}
          cacheEnabled={false}
          originWhitelist={['http://*', 'https://*']}
          source={{ uri: appUrl }}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator color="#EF4444" size="large" />
              <Text style={styles.loadingText}>Connecting to SAFE...</Text>
            </View>
          )}
          style={styles.webView}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080A0F',
  },
  safeArea: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0A0C12',
  },
  title: {
    color: '#F0F4FF',
    fontWeight: '800',
    fontSize: 16,
  },
  addressInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#273142',
    borderRadius: 8,
    color: '#F0F4FF',
    fontSize: 12,
  },
  loadButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#B91C1C',
  },
  loadButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  webView: {
    flex: 1,
    backgroundColor: '#080A0F',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#080A0F',
  },
  loadingText: {
    color: '#C8D6F0',
  },
});
