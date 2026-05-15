import { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { translateSupabaseError } from '../../lib/validation';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import Toast from 'react-native-toast-message';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { signOut, signOutLocal } = useAuth();
  const inFlight = useRef(false);
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    // Prevent double submission from rapid taps
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      // change-password: updateUser started

      const updatePromise = supabase.auth.updateUser({ password: newPassword });

      // Wait up to 6s for the update to complete; if it hangs proceed to sign out
      const race = await Promise.race([
        updatePromise.then((r) => ({ res: r })),
        new Promise((resolve) => setTimeout(() => resolve({ timedOut: true }), 6000)),
      ]) as { res?: any; timedOut?: true };

      if (race.timedOut) {
        if (__DEV__) console.warn('[change-password] updateUser timed out — proceeding to sign out (safe)');
        Toast.show({ type: 'info', text1: 'Actualización en proceso', text2: 'Se ha solicitado el cambio de contraseña. Te desconectamos para que ingreses con la nueva contraseña.' });

        // Safe sign-out: don't block indefinitely on network calls.
        try {
          const so = signOut();
          const soRace = await Promise.race([
            so.then(() => ({ ok: true })),
            new Promise((resolve) => setTimeout(() => resolve({ timedOut: true }), 3000)),
          ]) as { ok?: true; timedOut?: true };
          if ((soRace as any).timedOut) {
            if (__DEV__) console.warn('[change-password] signOut timed out, falling back to signOutLocal');
            await signOutLocal();
          }
        } catch (e) {
          if (__DEV__) console.warn('[change-password] signOut threw, falling back to signOutLocal', e);
          await signOutLocal();
        }

        router.replace('/login');
        // Let the original updatePromise continue in background (no await).
        return;
      }

      const { res } = race;
      // change-password: updateUser result

      if (res?.error) {
        throw res.error;
      }

      Toast.show({
        type: 'success',
        text1: 'Contraseña actualizada',
        text2: 'Inicia sesión con tu nueva contraseña',
      });

      // change-password: calling safe signOut
      try {
        const so = signOut();
        const soRace = await Promise.race([
          so.then(() => ({ ok: true })),
          new Promise((resolve) => setTimeout(() => resolve({ timedOut: true }), 3000)),
        ]) as { ok?: true; timedOut?: true };
        if ((soRace as any).timedOut) {
          if (__DEV__) console.warn('[change-password] signOut timed out, falling back to signOutLocal');
          await signOutLocal();
        }
      } catch (e) {
        if (__DEV__) console.warn('[change-password] signOut threw, falling back to signOutLocal', e);
        await signOutLocal();
      }

      router.replace('/login');
      // change-password: router.replace done
    } catch (error: any) {
      console.error('[change-password] error:', error?.message ?? error);
      Alert.alert('Error', translateSupabaseError(error.message) || 'No se pudo actualizar la contraseña');
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/(dashboard)/profile')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cambiar Contraseña</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark-outline" size={32} color={Colors.secondary} />
            <Text style={styles.infoText}>
              Para tu seguridad, elige una contraseña fuerte que no uses en otros sitios.
            </Text>
          </View>

          <View style={[styles.inputGroup, { marginTop: Spacing.xl }]}>
            <Text style={styles.label}>Nueva Contraseña</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Ingresa tu nueva contraseña"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmar Contraseña</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repite la nueva contraseña"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPass}
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.saveBtn, loading && styles.saveBtnDisabled]} 
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveBtnText}>Actualizar Contraseña</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.primary },
  content: { padding: Spacing.lg },
  infoBox: { 
    backgroundColor: Colors.secondaryLight, padding: Spacing.lg, 
    borderRadius: BorderRadius.lg, alignItems: 'center', gap: Spacing.sm,
  },
  infoText: { fontSize: FontSizes.sm, color: Colors.secondary, textAlign: 'center', lineHeight: 20, fontWeight: '600' },
  inputGroup: { marginBottom: Spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginLeft: 4 },
  inputContainer: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, paddingVertical: 12, fontSize: FontSizes.md, color: Colors.text },
  saveBtn: { 
    backgroundColor: Colors.secondary, padding: Spacing.md, borderRadius: BorderRadius.lg,
    alignItems: 'center', marginTop: Spacing.xxl, marginBottom: Spacing.xl,
    shadowColor: Colors.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: 'white', fontSize: FontSizes.md, fontWeight: '700' },
});
