import { Platform } from 'react-native';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase';

export const hasInternetConnection = async (timeoutMs = 5000): Promise<boolean> => {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  try {
    const healthCheck = fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: 'GET',
      headers: { apikey: SUPABASE_ANON_KEY },
    });

    const timeout = new Promise<Response>((_, reject) => {
      setTimeout(() => reject(new Error('network-timeout')), timeoutMs);
    });

    const response = await Promise.race([healthCheck, timeout]);
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
};
