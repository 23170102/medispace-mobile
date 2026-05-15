
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\d{10}$/;
  const cleanPhone = phone.replace(/\D/g, '');
  return phoneRegex.test(cleanPhone);
};

export const formatPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

export const cleanPhone = (phone: string): string => {
  return phone.replace(/\D/g, '').slice(0, 10);
};

export const translateSupabaseError = (message: string): string => {
  const translations: Record<string, string> = {
    'Invalid login credentials': 'Credenciales incorrectas',
    'Email address is invalid': 'El correo electrónico no es válido',
    'Invalid email': 'Correo electrónico inválido',
    'Unable to validate email address: invalid format': 'Formato de correo electrónico inválido',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
    'New password should have at least 6 characters': 'La nueva contraseña debe tener al menos 6 caracteres',
    'User already registered': 'Este correo ya está registrado',
    'Email not confirmed': 'No has confirmado tu correo electrónico',
    'Invalid refresh token': 'Sesión expirada, inicia sesión nuevamente',
    'Refresh token not found': 'Sesión expirada, inicia sesión nuevamente',
    'Invalid recovery code': 'Código de recuperación inválido',
    'Code expired': 'El código ha expirado',
    'User not found': 'Usuario no encontrado',
    'Phone number should have at least': 'El número de teléfono no es válido',
    'Signup not allowed for this instance': 'El registro no está disponible',
    'Signups not allowed for this instance': 'El registro no está disponible en este momento',
    'Rate limit exceeded': 'Demasiados intentos, intenta más tarde',
    'Too many requests': 'Demasiados intentos, intenta más tarde',
    'weak_password': 'La contraseña es demasiado débil',
    'forbidden_claim': 'No tienes permisos para esta acción',
  };

  for (const [key, translation] of Object.entries(translations)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return translation;
    }
  }

  return message;
};
