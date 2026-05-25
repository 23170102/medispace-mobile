import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { hasInternetConnection } from '../../lib/network';
import { Colors, Spacing } from '../../constants/theme';

export default function ConnectivityGate() {
  const [isOnline, setIsOnline] = useState(true);
  const [checking, setChecking] = useState(true);

  const checkConnection = async () => {
    setChecking(true);
    const online = await hasInternetConnection();
    setIsOnline(online);
    setChecking(false);
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Modal visible={!isOnline} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Ionicons name="cloud-offline-outline" size={56} color={Colors.error} />
          <Text style={styles.title}>Sin conexión a internet</Text>
          <Text style={styles.message}>Revisa tu conexión para continuar usando MediSpace.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={checkConnection} disabled={checking}>
            {checking ? <ActivityIndicator color="white" /> : <Text style={styles.retryText}>Reintentar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  card: { width: '100%', backgroundColor: 'white', borderRadius: 24, padding: Spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: '#fee2e2' },
  title: { fontSize: 20, fontWeight: '900', color: Colors.primary, marginTop: 16, textAlign: 'center' },
  message: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  retryBtn: { minWidth: 140, backgroundColor: Colors.secondary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' },
  retryText: { color: 'white', fontSize: 15, fontWeight: '800' },
});
