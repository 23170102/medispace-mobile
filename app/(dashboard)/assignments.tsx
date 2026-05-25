import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ActivityIndicator, Alert, ScrollView, RefreshControl, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../constants/theme';
import Toast from 'react-native-toast-message';

const daysList = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const shortDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const BLOCK_STEP_MINUTES = 30;

export default function GlobalAssignmentsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const { user, roles, profile, refreshProfile } = useAuth();
  
  const isDoctor = roles?.includes('doctor');
  const isAdmin = roles?.includes('admin');

   const [fee, setFee] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const isSubmitting = useRef(false);

  // 0. Manage Fee (Doctors only)
  useEffect(() => {
    if (isDoctor && profile?.consultation_fee !== undefined) {
      setFee(profile.consultation_fee?.toString() || '0');
    }
  }, [profile, isDoctor]);

  const updateFeeMutation = useMutation({
    mutationFn: async (newFee: number) => {
      const { error } = await supabase
        .from('doctor_details')
        .update({ consultation_fee: newFee })
        .eq('user_id', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refreshProfile();
      Alert.alert('Éxito', 'Tarifa actualizada correctamente');
    },
    onError: (err: any) => {
      Alert.alert('Error', 'No se pudo actualizar la tarifa: ' + err.message);
    }
  });

  const handleSaveFee = () => {
    const numFee = parseFloat(fee);
    if (isNaN(numFee) || numFee < 0) {
      Alert.alert('Error', 'Por favor ingresa un monto válido');
      return;
    }
    updateFeeMutation.mutate(numFee);
  };

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState(new Date(new Date().setHours(8, 0, 0, 0)));
  const [endTime, setEndTime] = useState(new Date(new Date().setHours(14, 0, 0, 0)));
  const [modality, setModality] = useState<'hourly' | 'daily'>('hourly');
  const [showTimePicker, setShowTimePicker] = useState<'start' | 'end' | null>(null);
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [blockDate, setBlockDate] = useState(new Date());
  const [blockStartTime, setBlockStartTime] = useState(new Date(new Date().setHours(9, 0, 0, 0)));
  const [blockEndTime, setBlockEndTime] = useState(new Date(new Date().setHours(10, 0, 0, 0)));
  const [blockOfficeId, setBlockOfficeId] = useState<string | null>(null);
  const [showBlockPicker, setShowBlockPicker] = useState<'date' | 'start' | 'end' | null>(null);

  // 1. Fetch active doctors (Admins only)
  const { data: doctors } = useQuery({
    queryKey: ['admin-doctors-list'],
    retry: 2,
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data: profilesResult } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'doctor')
        .eq('is_active', true)
        .order('first_name');
      
      return profilesResult?.map((u: any) => ({
        user_id: u.id,
        first_name: u.first_name,
        last_name: u.last_name
      })) || [];
    },
  });

  const filteredDoctors = useMemo(() => {
    if (!doctorSearch.trim()) return doctors;
    const q = doctorSearch.trim().toLowerCase();
    return doctors?.filter(d =>
      `${d.first_name} ${d.last_name}`.toLowerCase().includes(q)
    ) || [];
  }, [doctors, doctorSearch]);

  // 2. Fetch all offices (Admins only)
  const { data: offices } = useQuery({
    queryKey: ['admin-offices-all'],
    retry: 2,
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offices')
        .select('*, branches(name, status)')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // 3. Fetch assignments
  const { data: assignments, isLoading, refetch } = useQuery({
    queryKey: ['admin-global-assignments', user?.id, isDoctor],
    retry: 2,
    enabled: !!user?.id,
    queryFn: async () => {
      let query = supabase
        .from('doctor_assignments')
        .select(`
          *,
          profiles(first_name, last_name, doctor_details(specialty)),
          offices(name, status, branches(name, status))
        `);
      
      if (isDoctor) {
        query = query.eq('doctor_id', user!.id);
      }

      const { data, error } = await query.order('day_of_week');
      if (error) throw error;

      // Group by doctor
      const grouped: any[] = [];
      data?.forEach((item: any) => {
        const docId = item.doctor_id;
        let group = grouped.find(g => g.id === docId);
        if (!group) {
          const profileData = item.profiles;
          const name = profileData ? `Dr. ${profileData.first_name} ${profileData.last_name}` : 'Especialista sin nombre';
          group = {
            id: docId,
            name: name,
            specialty: profileData?.doctor_details?.[0]?.specialty || 'General',
            schedules: []
          };
          grouped.push(group);
        }
        
        // Push all assignments for admin/doctor (mark as suspended in UI if needed)
        group.schedules.push(item);
      });
      return grouped;
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (isSubmitting.current) return;
      isSubmitting.current = true;
      try {
        if (!selectedDoctorId || !selectedOfficeId || selectedDays.length === 0) throw new Error('Selecciona médico, consultorio y días');
        if (modality === 'hourly' && selectedHours.length === 0) throw new Error('Selecciona al menos una hora');

        const newStart = modality === 'daily' ? format(startTime, 'HH:mm:ss') : '';
        const newEnd = modality === 'daily' ? format(endTime, 'HH:mm:ss') : '';

        const { data: existing, error: fetchError } = await supabase
          .from('doctor_assignments')
          .select(`
            *,
            profiles(first_name, last_name),
            offices(name)
          `)
          .in('day_of_week', selectedDays);

        if (fetchError) throw fetchError;

        const slotRanges = modality === 'hourly'
          ? selectedHours.map(h => ({ start: `${h}:00:00`, end: `${h + 1}:00:00` }))
          : [{ start: newStart, end: newEnd }];

        for (const day of selectedDays) {
          const dayConflicts = existing?.filter(ex => ex.day_of_week === day) || [];
          
          for (const slot of slotRanges) {
            for (const ex of dayConflicts) {
              const overlap = (slot.start < ex.end_time && slot.end > ex.start_time);
              if (!overlap) continue;

              const profileData = Array.isArray(ex.profiles) ? ex.profiles[0] : ex.profiles;
              const docName = profileData ? `Dr. ${profileData.first_name} ${profileData.last_name}` : 'el médico';

              if (ex.doctor_id === selectedDoctorId) {
                const dayName = daysList[day];
                throw new Error(
                  `Conflicto de Horario: El ${docName} ya tiene una asignación el ${dayName} de ${ex.start_time.slice(0, 5)} a ${ex.end_time.slice(0, 5)} en ${ex.offices?.name}.`
                );
              }

              if (ex.office_id === selectedOfficeId) {
                const dayName = daysList[day];
                throw new Error(
                  `Conflicto de Consultorio: El consultorio "${ex.offices?.name}" ya está ocupado el ${dayName} de ${ex.start_time.slice(0, 5)} a ${ex.end_time.slice(0, 5)} por ${docName}.`
                );
              }
            }
          }
        }

        const inserts = selectedDays.flatMap(day =>
          slotRanges.map(slot => ({
            doctor_id: selectedDoctorId,
            office_id: selectedOfficeId,
            day_of_week: day,
            start_time: slot.start,
            end_time: slot.end,
            modality: modality,
          }))
        );
        
        const { error } = await supabase.from('doctor_assignments').insert(inserts);
        if (error) throw error;
      } finally {
        isSubmitting.current = false;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-global-assignments'] });
      Alert.alert('Éxito', 'Horarios asignados correctamente');
      closeModal();
    },
    onError: (err: any) => {
      const msg = err?.code === '23505' ? 'Ya existe ese horario asignado.' : err.message;
      Alert.alert('Error', msg);
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('doctor_assignments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-global-assignments'] });
      Toast.show({ type: 'success', text1: 'Horario eliminado' });
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const doctorOfficeOptions = useMemo(() => {
    const map = new Map<string, any>();
    assignments?.forEach((group: any) => {
      group.schedules?.forEach((schedule: any) => {
        if (schedule.office_id && schedule.offices) {
          map.set(schedule.office_id, { id: schedule.office_id, ...schedule.offices });
        }
      });
    });
    return Array.from(map.values());
  }, [assignments]);

  useEffect(() => {
    if (!blockOfficeId && doctorOfficeOptions.length > 0) {
      setBlockOfficeId(doctorOfficeOptions[0].id);
    }
  }, [blockOfficeId, doctorOfficeOptions]);

  const createBlockMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !blockOfficeId) throw new Error('Selecciona un consultorio');

      const dateKey = format(blockDate, 'yyyy-MM-dd');
      const start = new Date(`${dateKey}T${format(blockStartTime, 'HH:mm')}:00`);
      const end = new Date(`${dateKey}T${format(blockEndTime, 'HH:mm')}:00`);
      if (end <= start) throw new Error('La hora final debe ser mayor a la inicial');
      if (start.getTime() < Date.now()) throw new Error('No puedes bloquear horarios en el pasado');

      const { data: existing, error: existingError } = await supabase
        .from('appointments')
        .select('start_time, status')
        .eq('doctor_id', user.id)
        .gte('start_time', new Date(`${dateKey}T00:00:00`).toISOString())
        .lte('start_time', new Date(`${dateKey}T23:59:59`).toISOString())
        .in('status', ['scheduled', 'confirmed', 'arrived', 'blocked']);
      if (existingError) throw existingError;

      const rows: any[] = [];
      for (let cursor = new Date(start); cursor < end; cursor = new Date(cursor.getTime() + BLOCK_STEP_MINUTES * 60000)) {
        const alreadyTaken = existing?.some((apt: any) => new Date(apt.start_time).getTime() === cursor.getTime());
        if (alreadyTaken) throw new Error(`Ya existe una cita o bloqueo a las ${format(cursor, 'HH:mm')}`);
        rows.push({
          patient_id: user.id,
          doctor_id: user.id,
          office_id: blockOfficeId,
          start_time: cursor.toISOString(),
          status: 'blocked',
          total_price: 0,
          amount_paid: 0,
          payment_method: 'blocked',
          notes: 'Horario bloqueado por el doctor',
        });
      }

      const { error } = await supabase.from('appointments').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['existing-appointments'] });
      Toast.show({ type: 'success', text1: 'Horario bloqueado' });
      setBlockModalVisible(false);
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const closeModal = () => {
    setModalVisible(false);
    setSelectedDoctorId(null);
    setSelectedOfficeId(null);
    setSelectedDays([]);
    setSelectedHours([]);
    setDoctorSearch('');
  };

  const toggleDay = (index: number) => {
    setSelectedDays(prev => 
      prev.includes(index) ? prev.filter(d => d !== index) : [...prev, index].sort()
    );
  };

  const renderDoctorGroup = useCallback(({ item }: { item: any }) => (
    <View style={styles.doctorGroupCard}>
      <View style={styles.doctorHeader}>
        <Text style={styles.doctorName}>{item.name}</Text>
        <Ionicons name="medical-outline" size={18} color={Colors.textMuted} opacity={0.5} />
      </View>
      
      <View style={styles.scheduleList}>
        {item.schedules.map((schedule: any) => {
          const isSuspended = schedule.offices?.status !== 'active' || schedule.offices?.branches?.status !== 'active';
          return (
            <View key={schedule.id} style={[styles.scheduleRow, isSuspended && { opacity: 0.6, borderColor: Colors.error + '22' }]}>
              <View style={styles.locationInfo}>
                <View style={styles.branchRow}>
                  <Ionicons name="business" size={14} color={Colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.branchText}>{schedule.offices?.branches?.name}</Text>
                </View>
                <Text style={styles.officeText}>{schedule.offices?.name}</Text>
                {isSuspended && (
                  <View style={styles.suspendedBadge}>
                    <Text style={styles.suspendedText}>SUSPENDIDO</Text>
                  </View>
                )}
              </View>

              <View style={styles.timeInfo}>
                <View style={[styles.dayBadge, isSuspended && { backgroundColor: '#fef2f2' }]}>
                  <Ionicons name="calendar-outline" size={12} color={isSuspended ? Colors.error : "#16a34a"} />
                  <Text style={[styles.dayText, isSuspended && { color: Colors.error }]}>{daysList[schedule.day_of_week]}</Text>
                </View>
                
                <View style={styles.hoursRow}>
                  <Ionicons name="time-outline" size={12} color={Colors.secondary} />
                  <Text style={styles.hoursText}>{schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}</Text>
                  
                  <View style={[styles.modalityBadge, { backgroundColor: schedule.modality === 'daily' ? '#f5f3ff' : '#f0f9ff' }]}>
                    <Text style={[styles.modalityText, { color: schedule.modality === 'daily' ? '#7c3aed' : '#0ea5e9' }]}>
                      {schedule.modality === 'daily' ? 'DÍA' : 'HORA'}
                    </Text>
                  </View>
                </View>
              </View>

              {!isDoctor && (
                <TouchableOpacity 
                  style={styles.deleteIconBtn}
                  onPress={() => {
                    Alert.alert('Eliminar Horario', '¿Estás seguro? Esta acción no se puede deshacer.', [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Eliminar', style: 'destructive', onPress: () => deleteAssignmentMutation.mutate(schedule.id) }
                    ]);
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </View>
  ), [isDoctor, deleteAssignmentMutation]);

  const filteredAssignments = useMemo(() => assignments?.filter(group => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const docMatch = group.name.toLowerCase().includes(q);
    const branchMatch = group.schedules.some((s: any) => 
      s.offices?.branches?.name.toLowerCase().includes(q) || 
      s.offices?.name.toLowerCase().includes(q)
    );
    return docMatch || branchMatch;
  }) || [], [assignments, searchQuery]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isDoctor ? 'Mi Consultorio' : 'Horarios'}</Text>
        {!isDoctor && (
          <TouchableOpacity style={styles.topAddBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={18} color="white" />
            <Text style={styles.topAddBtnText}>Añadir</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.textMuted} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Buscar por médico o sucursal..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.textMuted}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={styles.sectionTitle}>
        <Ionicons name="medical" size={18} color="#16a34a" /> {isDoctor ? 'Mis Horarios' : 'Horarios por Médico'}
      </Text>

      {isDoctor && (
        <View style={styles.feeContainer}>
          <View style={styles.feeCard}>
             <View style={styles.feeIconCircle}>
                <Ionicons name="cash-outline" size={20} color={Colors.secondary} />
             </View>
             <View style={styles.feeInfo}>
                <Text style={styles.feeLabel}>Mi Tarifa de Consulta</Text>
                <Text style={styles.feeSub}>Visible para pacientes al agendar</Text>
             </View>
             <View style={styles.feeInputWrapper}>
               <Text style={styles.feeCurrency}>$</Text>
               <TextInput
                 style={styles.feeInput}
                 value={fee}
                 onChangeText={setFee}
                 keyboardType="numeric"
                 placeholder="0"
               />
               <TouchableOpacity 
                 style={[styles.feeSaveBtn, updateFeeMutation.isPending && { opacity: 0.7 }]} 
                 onPress={handleSaveFee}
                 disabled={updateFeeMutation.isPending}
               >
                 {updateFeeMutation.isPending ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="checkmark" size={20} color="white" />}
               </TouchableOpacity>
             </View>
          </View>
          <TouchableOpacity style={styles.blockScheduleBtn} onPress={() => setBlockModalVisible(true)}>
            <Ionicons name="ban-outline" size={18} color="white" />
            <Text style={styles.blockScheduleText}>Bloquear horario</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.secondary} />
        </View>
      ) : (
        <FlatList
          data={filteredAssignments}
          renderItem={renderDoctorGroup}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={[Colors.secondary]} />}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No hay horarios asignados</Text>
            </View>
          }
        />
      )}

      {isDoctor && (
        <Modal visible={blockModalVisible} animationType="slide" transparent>
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Bloquear Horario</Text>
                <TouchableOpacity onPress={() => setBlockModalVisible(false)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView bounces={false} style={styles.formContainer} showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>Fecha *</Text>
                <TouchableOpacity style={styles.timeInput} onPress={() => setShowBlockPicker('date')}>
                  <Text style={styles.timeLabel}>{format(blockDate, 'dd/MM/yyyy')}</Text>
                </TouchableOpacity>

                <Text style={styles.label}>Consultorio *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollPicker}>
                  {doctorOfficeOptions.map((off: any) => (
                    <TouchableOpacity
                      key={off.id}
                      style={[styles.chip, blockOfficeId === off.id && styles.chipActive]}
                      onPress={() => setBlockOfficeId(off.id)}
                    >
                      <Text style={[styles.chipText, blockOfficeId === off.id && styles.chipTextActive]}>
                        {off.name} {off.branches?.name ? `(${off.branches.name})` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {doctorOfficeOptions.length === 0 && (
                  <Text style={styles.emptyInlineText}>No hay consultorios asignados para bloquear.</Text>
                )}

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Hora Inicio *</Text>
                    <TouchableOpacity style={styles.timeInput} onPress={() => setShowBlockPicker('start')}>
                      <Text style={styles.timeLabel}>{format(blockStartTime, 'HH:mm')}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ width: 15 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Hora Fin *</Text>
                    <TouchableOpacity style={styles.timeInput} onPress={() => setShowBlockPicker('end')}>
                      <Text style={styles.timeLabel}>{format(blockEndTime, 'HH:mm')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.confirmBtn, (!blockOfficeId || createBlockMutation.isPending) && styles.disabledBtn]}
                  onPress={() => createBlockMutation.mutate()}
                  disabled={!blockOfficeId || createBlockMutation.isPending}
                >
                  {createBlockMutation.isPending ? <ActivityIndicator color="white" /> : <Text style={styles.confirmBtnText}>Confirmar Bloqueo</Text>}
                </TouchableOpacity>
                <View style={{ height: 40 }} />
              </ScrollView>

              {showBlockPicker && (
                <DateTimePicker
                  value={showBlockPicker === 'date' ? blockDate : showBlockPicker === 'start' ? blockStartTime : blockEndTime}
                  mode={showBlockPicker === 'date' ? 'date' : 'time'}
                  minimumDate={showBlockPicker === 'date' ? new Date() : undefined}
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  themeVariant="light"
                  textColor={Colors.primary}
                  onChange={(_: any, date?: Date) => {
                    setShowBlockPicker(null);
                    if (date) {
                      if (showBlockPicker === 'date') setBlockDate(date);
                      else if (showBlockPicker === 'start') setBlockStartTime(date);
                      else setBlockEndTime(date);
                    }
                  }}
                />
              )}
            </View>
          </View>
        </Modal>
      )}

      {!isDoctor && (
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Asignar Horario</Text>
                <TouchableOpacity onPress={closeModal}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView bounces={false} style={styles.formContainer} showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>Médico</Text>
                <View style={styles.doctorSearchContainer}>
                  <Ionicons name="search" size={16} color={Colors.textMuted} />
                  <TextInput
                    style={styles.doctorSearchInput}
                    value={doctorSearch}
                    onChangeText={setDoctorSearch}
                    placeholder="Buscar por nombre..."
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {doctorSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setDoctorSearch('')}>
                      <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollPicker}>
                  {filteredDoctors?.map(doc => (
                    <TouchableOpacity 
                      key={doc.user_id} 
                      style={[styles.chip, selectedDoctorId === doc.user_id && styles.chipActive]}
                      onPress={() => setSelectedDoctorId(doc.user_id)}
                    >
                      <Text style={[styles.chipText, selectedDoctorId === doc.user_id && styles.chipTextActive]}>
                        Dr. {doc.first_name} {doc.last_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.label}>Sucursal / Consultorio</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollPicker}>
                  {offices?.map((off: any) => (
                    <TouchableOpacity 
                      key={off.id} 
                      style={[styles.chip, selectedOfficeId === off.id && styles.chipActive, (off.status !== 'active' || off.branches?.status !== 'active') && styles.chipSuspended]}
                      onPress={() => {
                        const isSuspended = off.status !== 'active' || off.branches?.status !== 'active';
                        if (isSuspended) {
                          Alert.alert(
                            'Consultorio suspendido',
                            'Este consultorio está suspendido. Los horarios asignados no estarán disponibles hasta que se reactive.',
                            [{ text: 'Entendido, asignar de todas formas', style: 'destructive', onPress: () => setSelectedOfficeId(off.id) },
                             { text: 'Cancelar', style: 'cancel' }]
                          );
                          return;
                        }
                        setSelectedOfficeId(off.id);
                      }}
                    >
                      <Text style={[styles.chipText, selectedOfficeId === off.id && styles.chipTextActive]}>
                        {off.name} ({off.branches?.name}){off.status !== 'active' ? ' ⚠️' : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.label}>Días (Selección múltiple)</Text>
                <View style={styles.daysGrid}>
                  {shortDays.map((day, i) => (
                    <TouchableOpacity 
                      key={day} 
                      style={[styles.dayCircle, selectedDays.includes(i) && styles.dayCircleActive]}
                      onPress={() => toggleDay(i)}
                    >
                      <Text style={[styles.dayCircleText, selectedDays.includes(i) && styles.dayCircleTextActive]}>{day}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Modalidad de Trabajo</Text>
                <View style={styles.row}>
                  <TouchableOpacity 
                    style={[styles.modalityBtn, modality === 'hourly' && styles.modalityBtnActive]}
                    onPress={() => {
                      setModality('hourly');
                      setSelectedHours([]);
                      setStartTime(new Date(new Date().setHours(9, 0, 0, 0)));
                      setEndTime(new Date(new Date().setHours(14, 0, 0, 0)));
                    }}
                  >
                    <Ionicons name="time-outline" size={18} color={modality === 'hourly' ? 'white' : Colors.textMuted} />
                    <Text style={[styles.modalityBtnText, modality === 'hourly' && { color: 'white' }]}>Por Hora</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalityBtn, modality === 'daily' && styles.modalityBtnActive]}
                    onPress={() => {
                      setModality('daily');
                      setSelectedHours([]);
                      setStartTime(new Date(new Date().setHours(8, 0, 0, 0)));
                      setEndTime(new Date(new Date().setHours(20, 0, 0, 0)));
                    }}
                  >
                    <Ionicons name="today-outline" size={18} color={modality === 'daily' ? 'white' : Colors.textMuted} />
                    <Text style={[styles.modalityBtnText, modality === 'daily' && { color: 'white' }]}>Por Día</Text>
                  </TouchableOpacity>
                </View>

                {modality === 'daily' ? (
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Hora Inicio</Text>
                      <TouchableOpacity style={styles.timeInput} onPress={() => setShowTimePicker('start')}>
                        <Text style={styles.timeLabel}>{format(startTime, 'HH:mm')}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ width: 15 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Hora Fin</Text>
                      <TouchableOpacity style={styles.timeInput} onPress={() => setShowTimePicker('end')}>
                        <Text style={styles.timeLabel}>{format(endTime, 'HH:mm')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={styles.label}>Selecciona las horas de trabajo</Text>
                    <View style={styles.hourGrid}>
                      {Array.from({ length: 15 }, (_, i) => i + 6).map(hour => {
                        const active = selectedHours.includes(hour);
                        return (
                          <TouchableOpacity
                            key={hour}
                            style={[styles.hourSlot, active && styles.hourSlotActive]}
                            onPress={() => {
                              setSelectedHours(prev =>
                                prev.includes(hour)
                                  ? prev.filter(h => h !== hour)
                                  : [...prev, hour].sort()
                              );
                            }}
                          >
                            <Text style={[styles.hourSlotText, active && styles.hourSlotTextActive]}>
                              {`${String(hour).padStart(2, '0')}:00`}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                <TouchableOpacity 
                  style={[styles.confirmBtn, (!selectedDoctorId || !selectedOfficeId || selectedDays.length === 0 || (modality === 'hourly' && selectedHours.length === 0)) && styles.disabledBtn]} 
                  onPress={() => createAssignmentMutation.mutate()}
                  disabled={!selectedDoctorId || !selectedOfficeId || selectedDays.length === 0 || (modality === 'hourly' && selectedHours.length === 0) || createAssignmentMutation.isPending}
                >
                  {createAssignmentMutation.isPending ? <ActivityIndicator color="white" /> : <Text style={styles.confirmBtnText}>Confirmar Asignación</Text>}
                </TouchableOpacity>
                <View style={{ height: 40 }} />
              </ScrollView>

              {showTimePicker && (
                <DateTimePicker
                  value={showTimePicker === 'start' ? startTime : endTime}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  themeVariant="light"
                  textColor={Colors.primary}
                  onChange={(_: any, date?: Date) => {
                    setShowTimePicker(null);
                    if (date) {
                      if (showTimePicker === 'start') setStartTime(date);
                      else setEndTime(date);
                    }
                  }}
                />
              )}
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: Colors.primary, letterSpacing: -0.5 },
  headerSubtitle: { display: 'none' },
  topAddBtn: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#16a34a', 
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, gap: 4,
  },
  topAddBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginHorizontal: Spacing.lg, marginTop: Spacing.xl, marginBottom: Spacing.md },
  list: { padding: Spacing.lg, paddingBottom: 100 },
  doctorGroupCard: { 
    backgroundColor: 'white', borderRadius: 24, padding: Spacing.md, 
    marginBottom: Spacing.lg, borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2,
  },
  doctorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md, paddingHorizontal: 4 },
  doctorName: { fontSize: 20, fontWeight: '800', color: '#1e3a8a' },
  scheduleList: { gap: Spacing.sm },
  scheduleRow: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fcfcfc', 
    borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#f1f5f9',
  },
  locationInfo: { flex: 1.2 },
  branchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  branchText: { fontSize: 13, fontWeight: '800', color: '#475569' },
  officeText: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' },
  timeInfo: { flex: 2, gap: 6 },
  dayBadge: { 
    flexDirection: 'row', alignItems: 'center', gap: 4, 
    backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 2, 
    borderRadius: 6, alignSelf: 'flex-start',
  },
  dayText: { fontSize: 11, fontWeight: '800', color: '#16a34a' },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hoursText: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  modalityBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  modalityText: { fontSize: 9, fontWeight: '900' },
  deleteIconBtn: { padding: 8 },
  suspendedBadge: {
    backgroundColor: '#fff1f2', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, borderWidth: 1, borderColor: '#fda4af',
    alignSelf: 'flex-start', marginTop: 4,
  },
  suspendedText: { color: Colors.error, fontSize: 8, fontWeight: '900' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: Colors.textMuted, marginTop: 10, fontWeight: '600' },
  emptyInlineText: { color: Colors.textMuted, fontSize: 13, fontWeight: '700', marginBottom: Spacing.md, marginLeft: 4 },
  
  // Doctor Search
  doctorSearchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9',
    borderRadius: 12, paddingHorizontal: 12, height: 40, gap: 8,
    marginBottom: 10,
  },
  doctorSearchInput: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.primary, paddingVertical: 0 },

  // Hour Grid
  hourGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
  hourSlot: {
    width: 64, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },
  hourSlotActive: { backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' },
  hourSlotText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  hourSlotTextActive: { color: 'white' },

  // Modal Styles
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: Spacing.xl, maxHeight: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  modalTitle: { fontSize: 24, fontWeight: '800', color: '#1e3a8a' },
  formContainer: { gap: Spacing.md },
  label: { fontSize: 14, fontWeight: '800', color: '#64748b', marginBottom: 10, marginLeft: 4 },
  scrollPicker: { flexDirection: 'row', marginBottom: Spacing.md },
  chip: { 
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, 
    backgroundColor: '#f1f5f9', marginRight: 10, borderWidth: 1, borderColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: '#1e3a8a', borderColor: '#1e3a8a', shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  chipSuspended: { opacity: 0.6, borderColor: '#fda4af', borderStyle: 'dashed' },
  chipText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  chipTextActive: { color: 'white' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.md },
  dayCircle: { 
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#f1f5f9', 
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0',
  },
  dayCircleActive: { backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' },
  dayCircleText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  dayCircleTextActive: { color: 'white' },
  row: { flexDirection: 'row', gap: 10, marginBottom: Spacing.md },
  modalityBtn: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  modalityBtnActive: { backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' },
  modalityBtnText: { fontSize: 14, fontWeight: '800', color: '#475569' },
  timeInput: { 
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', 
    borderRadius: 14, padding: 14, alignItems: 'center',
  },
  timeLabel: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  confirmBtn: { 
    backgroundColor: '#16a34a', padding: 18, borderRadius: 16,
    alignItems: 'center', marginTop: Spacing.lg, shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  confirmBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },
  disabledBtn: { opacity: 0.5, backgroundColor: '#94a3b8' },

  // Fee Styles (Consolidated)
  feeContainer: { paddingHorizontal: Spacing.lg, marginBottom: 4 },
  feeCard: { 
    backgroundColor: 'white', borderRadius: 24, padding: 16, 
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0',
    ...Shadows.small,
  },
  feeIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0f9ff', alignItems: 'center', justifyContent: 'center' },
  feeInfo: { flex: 1, marginLeft: 12 },
  feeLabel: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  feeSub: { fontSize: 11, color: Colors.textMuted },
  feeInputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  feeCurrency: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  feeInput: { 
    width: 60, height: 44, backgroundColor: '#f1f5f9', borderRadius: 12, 
    textAlign: 'center', fontSize: 16, fontWeight: '800', color: Colors.primary,
  },
  feeSaveBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center' },
  blockScheduleBtn: {
    marginTop: 12, backgroundColor: '#dc2626', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
  },
  blockScheduleText: { color: 'white', fontSize: 14, fontWeight: '800' },

  // Search Styles
  searchSection: { paddingHorizontal: Spacing.lg, marginTop: Spacing.sm },
  searchContainer: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', 
    borderRadius: 16, paddingHorizontal: 16, height: 50, gap: 10,
    borderWidth: 1, borderColor: '#e2e8f0', ...Shadows.small,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.primary },
});
