import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
  uuid,
  unique
} from 'drizzle-orm/pg-core';

// 1. Usuarios (Estudiantes y Docentes)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  fullName: text('full_name'), // Nombre completo real del usuario
  phone: text('phone'), // Número de celular
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull(), // 'estudiante' | 'docente'
  mustChangePassword: boolean('must_change_password').default(true).notNull(),
  groupId: text('group_id'),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. Grupos de clase / Cursos
export const groups = pgTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  term: text('term').notNull(), // Ej: "2026-2"
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 3. Empresas Simuladas
export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  nit: text('nit').notNull().unique(),
  razonSocial: text('razon_social').notNull(),
  regimen: text('regimen').notNull(),
  representanteLegal: text('representante_legal').notNull(),
  sede: text('sede').notNull(),
  ciiu: text('ciiu').notNull(),
  numTrabajadores: integer('num_trabajadores').notNull(),
  riesgo: text('riesgo').notNull(), // 'I', 'II', 'III', 'IV', 'V'
  logoPublicId: text('logo_public_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 4. Asignaciones de Empresas a Estudiantes
export const companyAssignments = pgTable('company_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  status: text('status').notNull(), // 'activo' | 'inactivo' | 'desvinculado'
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
});

// 5. Estándares Mínimos (Resolución 0312 de 2019)
export const standards = pgTable('standards', {
  code: text('code').primaryKey(), // Ej: "E1.1.1"
  phva: text('phva').notNull(), // 'P' | 'H' | 'V' | 'A'
  name: text('name').notNull(),
  criteria: text('criteria').notNull(),
  verificationMode: text('verification_mode').notNull(),
  weight: numeric('weight', { precision: 5, scale: 2 }).notNull(),
});

// 6. Grupos de Aplicabilidad de Estándares (7, 21 o 60)
export const standardGroups = pgTable('standard_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  standardCode: text('standard_code').references(() => standards.code).notNull(),
  group: text('group').notNull(), // '7' | '21' | '60'
  weightOverride: numeric('weight_override', { precision: 5, scale: 2 }),
});

// 7. Evaluaciones / Intentos
export const evaluations = pgTable('evaluations', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  attempt: integer('attempt').default(1).notNull(),
  configJson: jsonb('config_json').notNull(), // centro, riesgo, trabajadores, agropecuaria
  standardsGroup: text('standards_group').notNull(), // '7' | '21' | '60'
  status: text('status').default('borrador').notNull(), // 'borrador' | 'enviada'
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
});

// 8. Ítems Evaluados en Autoevaluación
export const evaluationItems = pgTable('evaluation_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  evaluationId: uuid('evaluation_id').references(() => evaluations.id).notNull(),
  standardCode: text('standard_code').references(() => standards.code).notNull(),
  value: text('value').notNull(), // 'cumple' | 'no_cumple' | 'no_aplica'
  observation: text('observation').notNull(),
  evidenceStatus: text('evidence_status'), // 'valido' | 'vencido' | 'trampa' | null
  evidenceSha256: text('evidence_sha256'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique().on(t.evaluationId, t.standardCode)
]);

// 9. Catálogo de Hashes de Evidencias
export const evidenceCatalog = pgTable('evidence_catalog', {
  id: uuid('id').defaultRandom().primaryKey(),
  standardCode: text('standard_code').references(() => standards.code).notNull(),
  sha256: text('sha256').notNull().unique(),
  status: text('status').notNull(), // 'valido' | 'vencido' | 'trampa'
  label: text('label').notNull(),
  note: text('note').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 10. Responsable del SG-SST
export const responsablesSst = pgTable('responsables_sst', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  licencia: text('licencia').notNull(),
  resolucion: text('resolucion').notNull(),
  entidad: text('entidad').notNull(),
  experienciaMeses: integer('experiencia_meses').notNull(),
  curso50Fecha: timestamp('curso50_fecha', { withTimezone: true }).notNull(),
  curso20Fecha: timestamp('curso20_fecha', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 11. Reportes y Conciliaciones MinTrabajo
export const mintrabajoSubmissions = pgTable('mintrabajo_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  evaluationId: uuid('evaluation_id').references(() => evaluations.id).notNull(),
  companyDataJson: jsonb('company_data_json').notNull(),
  scoresJson: jsonb('scores_json').notNull(),
  reconciled: boolean('reconciled').default(false).notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
});

// 12. Ítems del Plan de Mejoramiento
export const improvementPlanItems = pgTable('improvement_plan_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  evaluationId: uuid('evaluation_id').references(() => evaluations.id).notNull(),
  standardCode: text('standard_code').references(() => standards.code).notNull(),
  actividad: text('actividad').notNull(),
  responsable: text('responsable').notNull(),
  meta: text('meta').notNull(),
  plazoDias: integer('plazo_dias').notNull(),
  estado: text('estado').default('pendiente').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 13. Trazabilidad y Logs de Navegación Silenciosos
export const eventLogs = pgTable('event_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  evaluationId: uuid('evaluation_id').references(() => evaluations.id),
  type: text('type').notNull(), // 'navigation' | 'hash_attempt' | 'answer_change' | 'no_aplica'
  route: text('route').notNull(),
  payloadJson: jsonb('payload_json'),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 14. Parámetros Generales de la Plataforma
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 15. Recuperación Simulada de Contraseñas
export const passwordResets = pgTable('password_resets', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
});

// 16. Criterios de Simulación y Casos PHVA (Docente)
export const assignmentCriteria = pgTable('assignment_criteria', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyName: text('company_name').notNull(),
  sector: text('sector').notNull(),
  riskLevel: text('risk_level').notNull(),
  timeLimitMinutes: integer('time_limit_minutes').default(30).notNull(),
  description: text('description').notNull(),
  expectedPhva: jsonb('expected_phva').notNull(), // { P: ['politica', 'matriz'], H: ['capacitacion'], V: ['auditoria'], A: ['mejora'] }
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 17. Entregas de Estudiantes y Evaluación Automática (PHVA)
export const studentSubmissions = pgTable('student_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentName: text('student_name').notNull(),
  studentEmail: text('student_email').notNull(),
  module: text('module').notNull(), // 'MinTrabajo' | 'ARL SURA' | 'ATEL'
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size').default(0),
  phvaPhase: text('phva_phase').default('Planear').notNull(), // 'Planear' | 'Hacer' | 'Verificar' | 'Actuar'
  score: integer('score').default(0).notNull(), // 0 - 100
  status: text('status').default('Calificado').notNull(), // 'Esperando Calificación' | 'Calificado' | 'Aprobado'
  criteriaMatches: jsonb('criteria_matches'), // Resultados del motor de comparación
  feedback: text('feedback').notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
});

