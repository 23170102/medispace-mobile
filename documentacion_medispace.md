# 🏥 MediSpace — Documentación Completa

## ¿Qué es MediSpace?

Es una aplicación móvil de gestión de salud digital desarrollada en React Native (Expo) que centraliza la operación de una clínica médica. Conecta a pacientes, doctores, recepcionistas y administradores en una sola plataforma.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React Native 0.81 + Expo 54 |
| **Lenguaje** | TypeScript 5.9 |
| **Ruteo** | Expo Router (basado en archivos, como Next.js) |
| **Backend / DB** | Supabase (PostgreSQL + Auth + Storage) |
| **Estado servidor** | TanStack React Query v5 (caché y sincronización) |
| **Notificaciones** | Expo Notifications |
| **Autenticación** | Supabase Auth con SecureStore |
| **UI Icons** | @expo/vector-icons (Ionicons) |
| **Fechas** | date-fns v4 |
| **PDF** | expo-print + expo-sharing |

---

## Estructura del Proyecto

```
medispace-mobile/
├── app/                          → Pantallas (ruteo basado en archivos)
│   ├── _layout.tsx               → Layout raíz (providers, AuthGate)
│   ├── index.tsx                 → Welcome / Landing
│   ├── login.tsx                 → Inicio de sesión
│   ├── register.tsx              → Registro de pacientes
│   ├── forgot-password.tsx       → Recuperar contraseña
│   └── (dashboard)/              → Pantallas protegidas (requieren sesión)
│       ├── _layout.tsx           → Barra de tabs inferior (role-based)
│       ├── home.tsx              → Home que carga el dashboard según rol
│       ├── catalog.tsx           → Catálogo de doctores (paciente)
│       ├── appointments.tsx      → Gestión de citas
│       ├── profile.tsx           → Perfil del usuario
│       ├── edit-profile.tsx      → Editar datos personales
│       ├── change-password.tsx   → Cambiar contraseña
│       ├── settings.tsx          → Honorarios (doctor)
│       ├── management.tsx        → Hub de administración
│       ├── branches.tsx          → CRUD sucursales
│       ├── offices.tsx           → CRUD consultorios
│       ├── assignments.tsx       → Asignación horarios doctores
│       ├── user-management.tsx   → Gestión de usuarios staff
│       ├── create-staff.tsx      → Registrar doctor/recepcionista
│       ├── receptionist-ops.tsx  → Operaciones recepción
│       ├── book/[doctorId].tsx   → Flujo de agendamiento
│       ├── faq.tsx               → Preguntas frecuentes
│       ├── legal.tsx             → Aviso de privacidad
│       └── records/
│           ├── index.tsx         → Lista de pacientes (doctor)
│           └── [patientId].tsx   → Expediente del paciente
├── components/
│   ├── dashboard/
│   │   ├── AdminDashboard.tsx    → Home del admin (estadísticas)
│   │   ├── DoctorDashboard.tsx   → Home del doctor (citas, reseñas)
│   │   ├── PatientDashboard.tsx  → Home del paciente (próximas citas)
│   │   ├── ReceptionistDashboard.tsx
│   │   └── DashboardSkeletons.tsx
│   ├── ui/Skeleton.tsx           → Esqueleto animado de carga
│   └── notifications/NotificationHandler.tsx
├── hooks/
│   ├── useAuth.tsx               → Provider de autenticación + perfil
│   ├── useDashboardData.ts       → Hooks para datos del home
│   └── useNotifications.ts       → Push notifications
├── lib/
│   ├── supabase.ts               → Cliente Supabase principal
│   └── secondarySupabase.ts      → Cliente sin sesión (para crear staff)
├── constants/theme.ts            → Colores, sombras, espaciados, tipografía
└── migracion_relacional.sql      → Esquema completo de BD (13 tablas)
```

---

## Roles de Usuario

### 👤 Paciente
| Pantalla | Archivo | Qué hace |
|----------|---------|----------|
| Inicio | `PatientDashboard.tsx` | Próximas citas, botón "Agendar hoy" |
| Catálogo | `catalog.tsx` | Busca doctores por nombre/especialidad |
| Agendar | `book/[doctorId].tsx` | Calendario, selección de horario, pago |
| Citas | `appointments.tsx` | Ver/calificar/cancelar citas |
| Perfil | `profile.tsx`, `edit-profile.tsx` | Datos personales, alergias, contactos |
| Expediente | `records/index.tsx` | Solo ve el suyo propio |

### 👨‍⚕️ Doctor
| Pantalla | Archivo | Qué hace |
|----------|---------|----------|
| Inicio | `DoctorDashboard.tsx` | Citas de hoy, reseñas recibidas |
| Citas | `appointments.tsx` | Lista de pacientes, marcarlos como "No Show" o atenderlos |
| Expedientes | `records/[patientId].tsx` | Historia clínica, notas NOM-004, PDF |
| Horarios | `assignments.tsx` | Ve sus asignaciones, configura su tarifa |
| Perfil | `profile.tsx` | Edita datos, cambia contraseña |

### 🧑‍💼 Recepcionista
| Pantalla | Archivo | Qué hace |
|----------|---------|----------|
| Inicio | `ReceptionistDashboard.tsx` | Accesos rápidos |
| Operaciones | `receptionist-ops.tsx` | Sala de espera (check-in), pagos en efectivo, registro rápido de pacientes |
| Agendar | `catalog.tsx` + `book/[doctorId].tsx` | Agenda citas para pacientes |

### 🛠️ Administrador
| Pantalla | Archivo | Qué hace |
|----------|---------|----------|
| Inicio | `AdminDashboard.tsx` | Estadísticas (doctores, sucursales, consultorios activos) |
| Gestión | `management.tsx` | Hub con acceso a todas las herramientas admin |
| Sucursales | `branches.tsx` | CRUD, activar/suspender (en cascada a consultorios) |
| Consultorios | `offices.tsx` | CRUD, validado contra sucursal suspendida |
| Horarios | `assignments.tsx` | Asignar doctores a consultorios con horarios |
| Usuarios | `user-management.tsx` | Activar/desactivar staff |
| Registrar Staff | `create-staff.tsx` | Crear cuentas de doctor o recepcionista |

---

## Explicación de cada archivo

### `app/_layout.tsx` — Layout Raíz
Envuelve toda la app con los siguientes providers (de afuera hacia adentro):

1. **QueryClientProvider** — TanStack React Query (caché global)
2. **SafeAreaProvider** — Manejo de áreas seguras
3. **AuthProvider** — Contexto de autenticación (`useAuth`)
4. **AuthGate** — Protege rutas: si no hay sesión redirige a login; si hay sesión y está en login/index redirige al dashboard
5. **Stack Navigator** — Navegación entre pantallas públicas y dashboard
6. **StatusBar** (dark style)
7. **Toast** — react-native-toast-message

**AuthGate** funciona así:
- `loading = true` → renderiza nada (espera)
- `user` existe + está en pantalla pública (login, index, forgot-password) y NO en register → redirige a `/(dashboard)/home`
- `user` NO existe + está en dashboard → redirige a `/login`

### `app/(dashboard)/_layout.tsx` — Tabs Inferiores
Define la barra de navegación inferior. Cada pestaña tiene visibilidad según el rol del usuario (`href: null` la oculta):

| Pestaña | Visible para |
|---------|-------------|
| Inicio | Todos |
| Agendar | Paciente, Recepcionista |
| Citas | Todos menos Admin |
| Expedientes | Doctor (lista pacientes), Paciente (solo suyo) |
| Gestión | Solo Admin |
| Operaciones | Solo Recepcionista |
| Perfil | Oculto en tabs (se accede desde home) |
| Sucursales, Consultorios, Usuarios | Oculto en tabs (se acceden desde Gestión) |

### `hooks/useAuth.tsx` — Autenticación (215 líneas)
El corazón del sistema. Provee al contexto:

**Estado:** `user`, `session`, `roles`, `profile`, `loading`

**Métodos:**
- `signOut()` — Cierra sesión vía `supabase.auth.signOut()`, limpia estado local
- `refreshProfile()` — Recarga los datos del perfil desde la BD

**Flujo de autenticación:**
1. Al montar, llama `supabase.auth.getSession()` para restaurar sesión desde SecureStore
2. Se suscribe a `onAuthStateChange` (eventos: SIGNED_IN, USER_UPDATED, SIGNED_OUT)
3. Cuando hay usuario, `fetchUserData(userId)` consulta:
   - `profiles` — obtiene el rol
   - Si es paciente: también `patient_details`
   - Si es doctor: también `doctor_details`
   - Todo se fusiona en un objeto `Profile`
4. `signOut()` fuerza limpieza incluso si Supabase falla

**Types:**
```typescript
type AppRole = 'admin' | 'doctor' | 'receptionist' | 'patient'

interface Profile {
  user_id, first_name, last_name, phone, specialty,
  consultation_fee, medical_license, date_of_birth, gender,
  address, blood_type, allergies, emergency_contact_name,
  emergency_contact_phone, avatar_url
}
```

### `hooks/useDashboardData.ts` — Datos de Home (135 líneas)
Cuatro hooks exportados:

1. **`useAdminStats()`** — Consultas `count(*)` con `head: true` para: doctores, recepcionistas, sucursales, consultorios activos
   - Query key: `['admin-dashboard-stats']`

2. **`useDoctorFeedback()`** — Reseñas del doctor actual con join a `profiles` del paciente
   - Query key: `['my-reviews', user.id]`

3. **`useUpcomingAppointments(role)`** — Citas próximas (scheduled/confirmed/arrived) desde hoy
   - Filtra por `patient_id` o `doctor_id` según el rol
   - Recepcionista ve todas
   - Joins con `profiles` para datos del paciente/doctor
   - Query key: `['upcoming-appointments', role, user.id]`

4. **`useUpdateAppointmentStatus()`** — Mutation para cambiar estado de cita y navegar al expediente

### `hooks/useNotifications.ts` — Notificaciones Push (76 líneas)
- Registra el dispositivo para recibir notificaciones cuando el usuario está autenticado
- Crea canal de notificaciones en Android
- Obtiene el Expo Push Token y lo guarda en `profiles.expo_push_token`
- Solo se ejecuta una vez por usuario

### `lib/supabase.ts` — Cliente Supabase Principal (50 líneas)
- URL: `https://lzajurbkaynigljrsfab.supabase.co`
- Anon Key embebida
- Storage adapter: `expo-secure-store` en móvil, `localStorage` en web
- Config: `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: false`

### `lib/secondarySupabase.ts` — Cliente Secundario (14 líneas)
- Misma URL y anon key
- Config: `persistSession: false`, `autoRefreshToken: false`
- Se usa en `create-staff.tsx` y `receptionist-ops.tsx` para crear usuarios Auth sin desloguear al admin

### `constants/theme.ts` — Sistema de Diseño
Define todos los tokens visuales de la aplicación:

| Token | Valores clave |
|-------|--------------|
| **Colors** | `primary: #0f172a`, `secondary: #10b981`, `background: #f8fafc`, `error: #ef4444` |
| **Gradients** | `primary: [#0f172a, #334155]`, `secondary: [#10b981, #059669]` |
| **Shadows** | `small`, `medium`, `large` con distintas elevaciones |
| **Spacing** | `xs: 4`, `sm: 8`, `md: 16`, `lg: 24`, `xl: 32` |
| **FontSizes** | `xs: 10` a `xxxl: 32` |
| **BorderRadius** | `sm: 8` a `full: 9999` |

---

## Pantallas a detalle

### `app/(dashboard)/branches.tsx` — Sucursales (323 líneas)

**Qué hace:** CRUD completo de sucursales clínicas.

**Queries:**
- `supabase.from('branches').select('*').order('name')` — key `['admin-branches-bento']`

**Mutations:**
- `saveMutation` — Inserta o actualiza sucursal. Cuando el status cambia a `suspended`, también actualiza todos los consultorios vinculados (`offices`) al mismo status (suspensión en cascada).

**UI:**
- FlatList con cards que muestran: nombre, dirección, teléfono, badge de status (Activo/Suspendido)
- La primera sucursal se marca como "SEDE PRINCIPAL"
- Modal slide-up para crear/editar con campos: nombre, dirección, teléfono, status switch
- Al cambiar a "Suspendido" muestra alerta de confirmación

### `app/(dashboard)/offices.tsx` — Consultorios (349 líneas)

**Qué hace:** CRUD de consultorios médicos.

**Queries:**
- `admin-branches-list` — Todas las sucursales (para filtro)
- `admin-offices-global` — Consultorios con join a `branches(name)`, filtrados por sucursal seleccionada

**Mutations:**
- `saveMutation` — Inserta o actualiza consultorio (name, floor, branch_id, status)

**Regla de negocio:**
- No permite activar un consultorio si la sucursal está suspendida. Muestra alerta: *"No puedes activar este consultorio porque la sucursal está suspendida. Activa la sucursal primero."*

**UI:**
- Filtro horizontal por sucursal
- Cards con nombre, sucursal, piso, badge de status
- Modal para crear/editar con selector de sucursal

### `app/(dashboard)/assignments.tsx` — Horarios (765 líneas)

**Qué hace:** Para admins: asignar doctores a consultorios con horarios. Para doctores: ver su horario y configurar tarifa.

**Vista de lista:**
- Agrupa asignaciones por doctor (grouped flatlist)
- Cada `scheduleRow` muestra: sucursal, consultorio, día, horario, modalidad (HORA/DÍA)
- Si el consultorio o su sucursal está suspendido: opacidad reducida, badge "SUSPENDIDO"
- Admin puede eliminar asignaciones

**Modal de creación de asignación:**

1. **Médico** — Buscador por nombre + apellido con input de texto. Lista filtrada de chips horizontales. Muestra nombre completo (`Dr. Juan Pérez`)

2. **Sucursal / Consultorio** — Chips horizontales con nombre y sucursal. Si está suspendido: borde rojo punteado, ⚠️, opacidad reducida. Al seleccionarlo: alerta advirtiendo que está suspendido pero permite asignar de todas formas.

3. **Días** — Selección múltiple con círculos (Dom-Sáb)

4. **Modalidad de Trabajo:**
   - **Por Hora** — Cuadrícula de bloques de 1 hora (06:00 a 20:00). Selección múltiple no contigua (permite breaks tipo 7-13 y 16-19). Cada bloque = una asignación independiente.
   - **Por Día** — Selectores de hora inicio y fin con DateTimePicker nativo.

5. **Validación de conflictos:**
   - Descarga todas las asignaciones existentes en los días seleccionados
   - Para cada slot horario elegido, verifica:
     - ¿El doctor ya tiene una asignación en ese horario?
     - ¿El consultorio ya está ocupado en ese horario?
   - Si hay conflicto: lanza error descriptivo

6. **Inserción:**
   - **Hourly:** `selectedDays × selectedHours` asignaciones individuales (cada una con start_time = hora, end_time = hora+1)
   - **Daily:** `selectedDays` asignaciones con el rango start_time/end_time

**Vista doctor:**
- Tarjeta para configurar `consultation_fee` con input numérico y botón de guardar
- Misma vista de lista pero solo sus asignaciones y sin botones de eliminar

### `app/(dashboard)/book/[doctorId].tsx` — Agendamiento (753 líneas)

La pantalla más grande y compleja. Flujo completo de agendamiento de citas:

1. **Info del doctor** — Nombre, especialidad, tarifa de consulta
2. **Reseñas** — Carrusel horizontal con comentarios de pacientes
3. **Selección de fecha** — Calendario (`react-native-calendars`)
4. **Generación de slots:**
   - Obtiene `doctor_assignments` para el día de la semana seleccionado
   - Genera slots de 30 minutos desde start_time hasta end_time
   - Filtra slots ocupados (citas existentes)
   - Filtra slots bloqueados (`slot_locks` con polling cada 5s)
   - Agrupa en mañana (< 12:00) y tarde (≥ 12:00)
5. **Selección de método de pago:**
   - Tarjeta de crédito/débito
   - SPEI
   - OXXO
6. **Modalidad de pago:** Completo vs Anticipo (50%)
7. **Formulario de tarjeta** (simulado) — número, vencimiento, CVV, nombre
8. **Bloqueo de slot** — Inserta en `slot_locks` con expiración de 10 minutos
9. **Confirmación:**
   - Inserta en `appointments` con status `confirmed` (tarjeta) o `scheduled` (SPEI/OXXO)
   - Elimina el bloqueo
   - Genera voucher PDF descargable vía `expo-print` + `expo-sharing`

**Staff mode:** Admin/recepcionista puede buscar y seleccionar un paciente antes de agendar.

### `app/(dashboard)/records/[patientId].tsx` — Expediente (836 líneas)

Tres tabs:

**1. Perfil**
- Información de identificación del paciente
- Datos clínicos: tipo sanguíneo, alergias, contactos de emergencia
- Foto de perfil (el doctor puede cambiarla)

**2. Historia**
- Antecedentes familiares, patológicos, no patológicos, obstétricos/ginecológicos
- Campos editables por el doctor via `updateHistoryMutation`
- Guarda en `patient_details`

**3. Evolución**
- Lista de notas médicas ordenadas por fecha descendente
- Cada nota incluye: motivo, exploración física, signos vitales, diagnóstico, tratamiento, receta
- El doctor puede crear una nueva nota (NOM-004 compliant)
- Al crear nota: actualiza la cita a status `completed`
- Puede descargar cada nota como PDF individual
- Puede eliminar notas

**Queries:**
- `patient-profile` — `profiles` + `patient_details`
- `patient-records` — `medical_records` para ese paciente

### `app/(dashboard)/appointments.tsx` — Citas

**Características:**
- Suscripción en tiempo real via `supabase.channel('appointments-realtime')` con `postgres_changes`
- Buscador por nombre de paciente/doctor
- Vista de próximas y pasadas
- Filtro por status

**Por rol:**
- **Doctor:** Ve solo sus pacientes. Puede marcar "No Show" o atender (navega a expediente)
- **Paciente:** Ve solo sus citas. Puede calificar (rating 1-5 con comentario) o cancelar
- **Admin/Recepcionista:** Ve todas las citas

**Acciones:**
- `sendRatingMutation` — Inserta en `ratings` (score, comment)
- `cancelMutation` — Actualiza status a `cancelled`, aplica política de reembolso (100% si falta > 24h, 50% si es menor)
- `statusMutation` — Cambio genérico de status (para "No Show" y reactivaciones)

### `app/(dashboard)/create-staff.tsx` — Registrar Staff (264 líneas)

**Qué hace:** Formulario para que el admin cree cuentas de doctor o recepcionista.

**Particularidad técnica:** Usa `secondarySupabase` (sin persistencia de sesión) para crear el usuario en Auth SIN desloguear al admin actual.

**Flujo:**
1. Selecciona rol: Médico o Recepción
2. Llena: email, contraseña, nombre, apellidos, teléfono
3. Si es doctor: especialidad (chips: Medicina General, Cardiología, etc.), cédula profesional, costo consulta
4. `secondarySupabase.auth.signUp()` → crea en Auth
5. Espera 1.5s para que el trigger de BD cree el perfil inicial
6. Upsert en `profiles` con `is_active: true`
7. Si es doctor: upsert en `doctor_details` con especialidad, cédula, honorarios

### `app/(dashboard)/user-management.tsx` — Gestión de Usuarios (234 líneas)

**Qué hace:** Lista de todo el personal (excluye pacientes) con opción de activar/desactivar.

**Queries:**
- `admin-staff-users-bento` — `profiles` con `role != 'patient'`

**Mutations:**
- `toggleActiveMutation` — Actualiza `is_active` en `profiles`

**UI:**
- Barra de búsqueda por nombre o teléfono
- Filtro por rol: Todos, Médicos, Recepción
- Cards con avatar (iniciales), nombre, badge de rol, teléfono
- Botón "Dar Baja" (rojo) para activos, "Activar" (verde) para inactivos
- No permite desactivarse a sí mismo
- Confirmación antes de cambiar status

### `app/(dashboard)/receptionist-ops.tsx` — Operaciones Recepción

**Qué hace:** Sala de espera digital y operaciones de recepción.

**Mutations:**
- `quickRegisterMutation` — Crea paciente rápido con email auto-generado (`{teléfono}@medispace.tmp`) y contraseña por defecto. Usa `secondarySupabase`.
- `checkInMutation` — Actualiza status de cita a `arrived`
- `registerPaymentMutation` — Registra pago en efectivo (`amount_paid = total_price`, `payment_method = 'cash'`)

### `components/dashboard/` — Dashboards por rol

**AdminDashboard.tsx:**
- Cuadrícula de 4 tarjetas con estadísticas: doctores, recepcionistas, sucursales, consultorios activos
- Cada tarjeta tiene icono con gradiente de fondo
- Usa `useAdminStats()`
- Loading state: `StatsSkeleton`

**DoctorDashboard.tsx:**
- Tarjeta ancha con conteo de citas de hoy
- Carrusel horizontal de reseñas con `useDoctorFeedback()`
- Lista de próximas citas con diseño de "ticket" y botón "Atender"
- Usa `useUpcomingAppointments('doctor')` y `useUpdateAppointmentStatus()`

**PatientDashboard.tsx:**
- Tarjeta con conteo de citas activas
- Lista de próximas citas
- Botón "Agendar una cita" → navega al catálogo
- Empty state con icono

**ReceptionistDashboard.tsx:**
- Dos accesos directos: "Operaciones" y "Agendar"
- Vista rápida de hasta 3 citas de hoy con badge de status

---

## Base de Datos (13 tablas)

### Diagrama relacional

```
auth.users
    ↓ (trigger handle_new_user)
profiles ──── patient_details
    │         doctor_details
    │         payment_methods
    │
    ├── branches ──── offices ──── doctor_assignments
    │                                       │
    └── appointments ───────────────────────┘
           │
           ├── medical_records
           └── ratings

slot_locks (temporal, para bloqueo de agenda)
activity_logs (auditoría)
```

### Detalle de tablas

| Tabla | PK | FKs | Columnas clave |
|-------|----|-----|----------------|
| **profiles** | `id` (UUID → auth.users) | | `role`, `email`, `first_name`, `last_name`, `phone`, `is_active`, `avatar_url`, `expo_push_token` |
| **patient_details** | `user_id` | → profiles | `birth_date`, `gender`, `address`, `blood_type`, `allergies`, `family_history`, `pathological_history`, `non_pathological_history`, `obstetric_history`, `emergency_contacts` |
| **doctor_details** | `user_id` | → profiles | `specialty`, `consultation_fee`, `medical_license`, `contract_start/end`, `custom_schedule` (JSONB) |
| **branches** | `id` (UUID) | | `name`, `address`, `phone`, `gps_url`, `status` |
| **offices** | `id` (UUID) | → branches | `name`, `status`, `floor` |
| **doctor_assignments** | `id` (UUID) | → profiles, → offices | `modality` (hourly/daily), `day_of_week` (0-6), `start_time`, `end_time` |
| **appointments** | `id` (UUID) | → offices, → profiles (x2) | `start_time`, `status`, `total_price`, `amount_paid`, `payment_method`, `transfer_reference` |
| **medical_records** | `appointment_id` | → appointments | `consultation_reason`, `previous_diseases`, `clinical_notes`, `diagnosis`, `medications` |
| **ratings** | `id` (UUID) | → profiles (x2) | `score` (1-5), `comment` |
| **payment_methods** | `id` (UUID) | → profiles | `last_four`, `brand`, `gateway_token`, `is_default` |
| **slot_locks** | `id` (UUID) | → profiles (x2) | `start_time`, `expires_at` |
| **activity_logs** | `id` (UUID) | → profiles | `event_type`, `description` |

### Trigger: `handle_new_user()`

Se ejecuta AFTER INSERT en `auth.users`. Extrae `raw_user_meta_data` y:
1. Inserta en `profiles` (first_name, last_name, phone, role)
2. Si role = 'patient': inserta en `patient_details` (birth_date, gender, allergies)
3. Si role = 'doctor': inserta en `doctor_details` (fila vacía)

### RLS (Row Level Security)

Políticas a nivel de fila implementadas en todas las tablas principales:

- **profiles:** Usuario ve/edita su propio perfil. Admin ve todo. Staff (doctor/receptionist) visible a todos los autenticados.
- **patient_details / doctor_details:** Usuario ve/edita sus propios detalles. Admin ve todo.
- **appointments:** Visibles según rol (paciente ve sus citas, doctor las suyas, admin/receptionist todas)
- **branches / offices / doctor_assignments:** Visibles a todos los autenticados
- Función helper `is_admin()` verifica rol en profiles (SECURITY DEFINER)

---

## Decisiones Técnicas Clave

### 1. Dos clientes Supabase
El cliente principal (`lib/supabase.ts`) persiste la sesión del usuario actual. El secundario (`lib/secondarySupabase.ts`) con `persistSession: false` permite crear usuarios en Auth (registro de staff, registro rápido de pacientes) sin desloguear al administrador.

### 2. Slot Locking (bloqueo de 10 min)
Cuando un paciente inicia el flujo de agendamiento y selecciona un horario, se crea un registro en `slot_locks` con expiración a 10 minutos. Esto evita que dos pacientes reserven el mismo slot simultáneamente. Los locks se consultan cada 5 segundos (`refetchInterval: 5000`) para reflejar disponibilidad en tiempo real.

### 3. Realtime vs Polling
- **Slots disponibles:** Polling cada 5s (consistencia fuerte para evitar dobles reservas)
- **Citas:** `postgres_changes` via Supabase Realtime (actualizaciones inmediatas cuando alguien modifica una cita)

### 4. Skeleton Loading
Todas las pantallas de dashboard usan el componente `Skeleton.tsx` que muestra rectángulos grises animados (opacidad oscilante 0.3 ↔ 0.7) mientras los datos cargan. Cada dashboard tiene su propio conjunto de skeletons (StatsSkeleton, AppointmentSkeleton, FeedbackSkeleton).

### 5. PDF nativo sin servidor
Usa `expo-print` para generar HTML → PDF y `expo-sharing` para compartirlo. Todo del lado del cliente, sin necesidad de servidor intermedio. Se usa para:
- Recetas / resúmenes médicos
- Vouchers de pago de citas

### 6. Suspensión en cascada
Cuando un admin suspende una sucursal (`branches.tsx`), automáticamente se suspenden todos sus consultorios. En el selector de horarios, los consultorios suspendidos aún aparecen (con advertencia) para que el admin pueda asignar horarios anticipados.

### 7. Horarios no contiguos ("Por Hora")
El modal de asignación de horarios permite seleccionar múltiples bloques de 1 hora no consecutivos, permitiendo modelar horarios con descansos (ej. 7-13 y 16-19). Cada bloque genera una asignación independiente en la BD.

---

## Flujo de Autenticación Completo

```
1. App inicia
   → AuthProvider monta
   → useEffect llama supabase.auth.getSession()
   → Si hay sesión guardada en SecureStore:
       → setUser(session.user)
       → fetchUserData(user.id)
           → SELECT * FROM profiles WHERE id = userId
           → SELECT * FROM patient_details WHERE user_id = userId (si es paciente)
           → SELECT * FROM doctor_details WHERE user_id = userId (si es doctor)
           → setProfile(datos combinados)
           → setRoles([profile.role])
       → loading = false
   → Si NO hay sesión:
       → loading = false, user = null

2. AuthGate evalúa:
   loading=true  → renderiza null
   user≠null + ruta=pública → redirect a /(dashboard)/home
   user=null + ruta=dashboard → redirect a /login

3. Login:
   → signInWithPassword(email, password)
   → AuthStateChange evento SIGNED_IN
   → fetchUserData() se ejecuta
   → AuthGate redirige a home

4. Registro:
   → signUp(email, password, { data: metadata })
   → Supabase crea auth.users
   → trigger handle_new_user() crea profiles + patient_details/doctor_details
   → Usuario redirigido a login

5. Logout:
   → signOut()
   → supabase.auth.signOut()
   → Limpieza forzada de estado local
   → Toast de confirmación
```

---

*Documentación generada para presentación del proyecto MediSpace.*
