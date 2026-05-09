export const ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  RECEPTIONIST: 'receptionist',
  PATIENT: 'patient',
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

export const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  ARRIVED: 'arrived',
  IN_CONSULTATION: 'in_consultation',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS];

export const DB_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
} as const;

export function getPrimaryRole(roles: string[]): AppRole {
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('doctor')) return 'doctor';
  if (roles.includes('receptionist')) return 'receptionist';
  return 'patient';
}

export function getRoleLabel(role: AppRole): string {
  const labels: Record<AppRole, string> = {
    admin: 'ADMINISTRADOR',
    doctor: 'DOCTOR',
    receptionist: 'RECEPCIONISTA',
    patient: 'PACIENTE',
  };
  return labels[role];
}
