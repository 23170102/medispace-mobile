import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';

type AppRole = 'admin' | 'doctor' | 'receptionist' | 'patient';

interface Profile {
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  specialty: string | null;
  consultation_fee: number | null;
  medical_license: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  blood_type: string | null;
  allergies: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  roles: [],
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const clearAuth = async (shouldSignOutSDK = true) => {
    setUser(null);
    setSession(null);
    setRoles([]);
    setProfile(null);
    
    if (shouldSignOutSDK) {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (e) {
        // Ignorar errores en el cierre local
      }
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      // 1. Fetch user base data
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (userError) {
        if (userError.message?.includes('Refresh Token') || userError.message?.includes('invalid_grant')) {
          console.log('Auth error during fetchUserData, signing out...');
          clearAuth();
          return;
        }
        if (userError.code !== 'PGRST116') {
          console.error('Error fetching user base data:', userError);
        }
      }
      
      // ... rest of the function remains same but I should probably include it for completeness if I'm replacing the whole block
      const role = userData?.role as AppRole || 'patient';
      setRoles([role]);

      let combinedProfile: Profile | null = null;

      if (userData) {
        // Build base profile
        combinedProfile = {
          user_id: userData.id,
          first_name: userData.first_name,
          last_name: userData.last_name || '',
          phone: userData.phone,
          avatar_url: userData.avatar_url,
          specialty: null,
          consultation_fee: null,
          medical_license: null,
          date_of_birth: null,
          gender: null,
          address: null,
          blood_type: null,
          allergies: null,
          emergency_contact_name: null,
          emergency_contact_phone: null,
        };

        // Fetch details based on role
        if (role === 'patient') {
          const { data: patientDetails } = await supabase
            .from('patient_details')
            .select('*')
            .eq('user_id', userId)
            .single();
            
          if (patientDetails) {
            combinedProfile = {
              ...combinedProfile,
              date_of_birth: patientDetails.birth_date,
              gender: patientDetails.gender,
              address: patientDetails.address,
              blood_type: patientDetails.blood_type,
              allergies: patientDetails.allergies,
              emergency_contact_name: patientDetails.emergency_contact_name,
              emergency_contact_phone: patientDetails.emergency_contact_phone,
            };
          }
        } else if (role === 'doctor') {
          const { data: doctorDetails } = await supabase
            .from('doctor_details')
            .select('*')
            .eq('user_id', userId)
            .single();
            
          if (doctorDetails) {
            combinedProfile = {
              ...combinedProfile,
              specialty: doctorDetails.specialty,
              consultation_fee: doctorDetails.consultation_fee,
              medical_license: doctorDetails.medical_license,
            };
          }
        }
      }

      setProfile(combinedProfile);
    } catch (error: any) {
      console.error('Unexpected error in fetchUserData:', error);
      if (error.message?.includes('Refresh Token')) {
        clearAuth();
      }
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchUserData(user.id);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.log('Session recovery error:', error.message);
          clearAuth();
        } else if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          await fetchUserData(initialSession.user.id);
        } else {
          // No session found, ensure local state is clear
          clearAuth();
        }
      } catch (err: any) {
        console.error('Auth init error:', err.message || err);
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth Event:', event);

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          await fetchUserData(currentSession.user.id);
        } else {
          clearAuth(false);
        }
      } else if (event === 'SIGNED_OUT') {
        clearAuth(false);
      } else if (!currentSession && (event as any) === 'INITIAL_SESSION') {
        clearAuth(false);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      Toast.show({ type: 'success', text1: 'Sesión cerrada' });
    } catch (error: any) {
      console.error('SignOut error:', error.message);
      clearAuth();
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo cerrar sesión. Se ha forzado el cierre local.' });
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, roles, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
