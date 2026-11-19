"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentSubmissions = exports.assignmentCriteria = exports.passwordResets = exports.settings = exports.eventLogs = exports.improvementPlanItems = exports.mintrabajoSubmissions = exports.responsablesSst = exports.evidenceCatalog = exports.evaluationItems = exports.evaluations = exports.standardGroups = exports.standards = exports.companyAssignments = exports.companies = exports.groups = exports.users = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
// 1. Usuarios (Estudiantes y Docentes)
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    fullName: (0, pg_core_1.text)('full_name'), // Nombre completo real del usuario
    phone: (0, pg_core_1.text)('phone'), // Número de celular
    email: (0, pg_core_1.text)('email').notNull().unique(),
    passwordHash: (0, pg_core_1.text)('password_hash').notNull(),
    role: (0, pg_core_1.text)('role').notNull(), // 'estudiante' | 'docente'
    mustChangePassword: (0, pg_core_1.boolean)('must_change_password').default(true).notNull(),
    groupId: (0, pg_core_1.text)('group_id'),
    active: (0, pg_core_1.boolean)('active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
// 2. Grupos de clase / Cursos
exports.groups = (0, pg_core_1.pgTable)('groups', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    name: (0, pg_core_1.text)('name').notNull(),
    term: (0, pg_core_1.text)('term').notNull(), // Ej: "2026-2"
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
});
// 3. Empresas Simuladas
exports.companies = (0, pg_core_1.pgTable)('companies', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    nit: (0, pg_core_1.text)('nit').notNull().unique(),
    razonSocial: (0, pg_core_1.text)('razon_social').notNull(),
    regimen: (0, pg_core_1.text)('regimen').notNull(),
    representanteLegal: (0, pg_core_1.text)('representante_legal').notNull(),
    sede: (0, pg_core_1.text)('sede').notNull(),
    ciiu: (0, pg_core_1.text)('ciiu').notNull(),
    numTrabajadores: (0, pg_core_1.integer)('num_trabajadores').notNull(),
    riesgo: (0, pg_core_1.text)('riesgo').notNull(), // 'I', 'II', 'III', 'IV', 'V'
    logoPublicId: (0, pg_core_1.text)('logo_public_id'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
// 4. Asignaciones de Empresas a Estudiantes
exports.companyAssignments = (0, pg_core_1.pgTable)('company_assignments', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id').references(() => exports.companies.id).notNull(),
    userId: (0, pg_core_1.uuid)('user_id').references(() => exports.users.id).notNull(),
    status: (0, pg_core_1.text)('status').notNull(), // 'activo' | 'inactivo' | 'desvinculado'
    startedAt: (0, pg_core_1.timestamp)('started_at', { withTimezone: true }).defaultNow().notNull(),
    endedAt: (0, pg_core_1.timestamp)('ended_at', { withTimezone: true }),
});
// 5. Estándares Mínimos (Resolución 0312 de 2019)
exports.standards = (0, pg_core_1.pgTable)('standards', {
    code: (0, pg_core_1.text)('code').primaryKey(), // Ej: "E1.1.1"
    phva: (0, pg_core_1.text)('phva').notNull(), // 'P' | 'H' | 'V' | 'A'
    name: (0, pg_core_1.text)('name').notNull(),
    criteria: (0, pg_core_1.text)('criteria').notNull(),
    verificationMode: (0, pg_core_1.text)('verification_mode').notNull(),
    weight: (0, pg_core_1.numeric)('weight', { precision: 5, scale: 2 }).notNull(),
});
// 6. Grupos de Aplicabilidad de Estándares (7, 21 o 60)
exports.standardGroups = (0, pg_core_1.pgTable)('standard_groups', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    standardCode: (0, pg_core_1.text)('standard_code').references(() => exports.standards.code).notNull(),
    group: (0, pg_core_1.text)('group').notNull(), // '7' | '21' | '60'
    weightOverride: (0, pg_core_1.numeric)('weight_override', { precision: 5, scale: 2 }),
});
// 7. Evaluaciones / Intentos
exports.evaluations = (0, pg_core_1.pgTable)('evaluations', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id').references(() => exports.companies.id).notNull(),
    userId: (0, pg_core_1.uuid)('user_id').references(() => exports.users.id).notNull(),
    attempt: (0, pg_core_1.integer)('attempt').default(1).notNull(),
    configJson: (0, pg_core_1.jsonb)('config_json').notNull(), // centro, riesgo, trabajadores, agropecuaria
    standardsGroup: (0, pg_core_1.text)('standards_group').notNull(), // '7' | '21' | '60'
    status: (0, pg_core_1.text)('status').default('borrador').notNull(), // 'borrador' | 'enviada'
    startedAt: (0, pg_core_1.timestamp)('started_at', { withTimezone: true }).defaultNow().notNull(),
    submittedAt: (0, pg_core_1.timestamp)('submitted_at', { withTimezone: true }),
});
// 8. Ítems Evaluados en Autoevaluación
exports.evaluationItems = (0, pg_core_1.pgTable)('evaluation_items', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    evaluationId: (0, pg_core_1.uuid)('evaluation_id').references(() => exports.evaluations.id).notNull(),
    standardCode: (0, pg_core_1.text)('standard_code').references(() => exports.standards.code).notNull(),
    value: (0, pg_core_1.text)('value').notNull(), // 'cumple' | 'no_cumple' | 'no_aplica'
    observation: (0, pg_core_1.text)('observation').notNull(),
    evidenceStatus: (0, pg_core_1.text)('evidence_status'), // 'valido' | 'vencido' | 'trampa' | null
    evidenceSha256: (0, pg_core_1.text)('evidence_sha256'),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.unique)().on(t.evaluationId, t.standardCode)
]);
// 9. Catálogo de Hashes de Evidencias
exports.evidenceCatalog = (0, pg_core_1.pgTable)('evidence_catalog', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    standardCode: (0, pg_core_1.text)('standard_code').references(() => exports.standards.code).notNull(),
    sha256: (0, pg_core_1.text)('sha256').notNull().unique(),
    status: (0, pg_core_1.text)('status').notNull(), // 'valido' | 'vencido' | 'trampa'
    label: (0, pg_core_1.text)('label').notNull(),
    note: (0, pg_core_1.text)('note').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
});
// 10. Responsable del SG-SST
exports.responsablesSst = (0, pg_core_1.pgTable)('responsables_sst', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id').references(() => exports.users.id).notNull(),
    companyId: (0, pg_core_1.uuid)('company_id').references(() => exports.companies.id).notNull(),
    licencia: (0, pg_core_1.text)('licencia').notNull(),
    resolucion: (0, pg_core_1.text)('resolucion').notNull(),
    entidad: (0, pg_core_1.text)('entidad').notNull(),
    experienciaMeses: (0, pg_core_1.integer)('experiencia_meses').notNull(),
    curso50Fecha: (0, pg_core_1.timestamp)('curso50_fecha', { withTimezone: true }).notNull(),
    curso20Fecha: (0, pg_core_1.timestamp)('curso20_fecha', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
});
// 11. Reportes y Conciliaciones MinTrabajo
exports.mintrabajoSubmissions = (0, pg_core_1.pgTable)('mintrabajo_submissions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    evaluationId: (0, pg_core_1.uuid)('evaluation_id').references(() => exports.evaluations.id).notNull(),
    companyDataJson: (0, pg_core_1.jsonb)('company_data_json').notNull(),
    scoresJson: (0, pg_core_1.jsonb)('scores_json').notNull(),
    reconciled: (0, pg_core_1.boolean)('reconciled').default(false).notNull(),
    submittedAt: (0, pg_core_1.timestamp)('submitted_at', { withTimezone: true }).defaultNow().notNull(),
});
// 12. Ítems del Plan de Mejoramiento
exports.improvementPlanItems = (0, pg_core_1.pgTable)('improvement_plan_items', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    evaluationId: (0, pg_core_1.uuid)('evaluation_id').references(() => exports.evaluations.id).notNull(),
    standardCode: (0, pg_core_1.text)('standard_code').references(() => exports.standards.code).notNull(),
    actividad: (0, pg_core_1.text)('actividad').notNull(),
    responsable: (0, pg_core_1.text)('responsable').notNull(),
    meta: (0, pg_core_1.text)('meta').notNull(),
    plazoDias: (0, pg_core_1.integer)('plazo_dias').notNull(),
    estado: (0, pg_core_1.text)('estado').default('pendiente').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
});
// 13. Trazabilidad y Logs de Navegación Silenciosos
exports.eventLogs = (0, pg_core_1.pgTable)('event_logs', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id').references(() => exports.users.id),
    evaluationId: (0, pg_core_1.uuid)('evaluation_id').references(() => exports.evaluations.id),
    type: (0, pg_core_1.text)('type').notNull(), // 'navigation' | 'hash_attempt' | 'answer_change' | 'no_aplica'
    route: (0, pg_core_1.text)('route').notNull(),
    payloadJson: (0, pg_core_1.jsonb)('payload_json'),
    durationMs: (0, pg_core_1.integer)('duration_ms'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
});
// 14. Parámetros Generales de la Plataforma
exports.settings = (0, pg_core_1.pgTable)('settings', {
    key: (0, pg_core_1.text)('key').primaryKey(),
    value: (0, pg_core_1.text)('value').notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
// 15. Recuperación Simulada de Contraseñas
exports.passwordResets = (0, pg_core_1.pgTable)('password_resets', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id').references(() => exports.users.id).notNull(),
    tokenHash: (0, pg_core_1.text)('token_hash').notNull(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { withTimezone: true }).notNull(),
    usedAt: (0, pg_core_1.timestamp)('used_at', { withTimezone: true }),
});
// 16. Criterios de Simulación y Casos PHVA (Docente)
exports.assignmentCriteria = (0, pg_core_1.pgTable)('assignment_criteria', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyName: (0, pg_core_1.text)('company_name').notNull(),
    sector: (0, pg_core_1.text)('sector').notNull(),
    riskLevel: (0, pg_core_1.text)('risk_level').notNull(),
    timeLimitMinutes: (0, pg_core_1.integer)('time_limit_minutes').default(30).notNull(),
    description: (0, pg_core_1.text)('description').notNull(),
    expectedPhva: (0, pg_core_1.jsonb)('expected_phva').notNull(), // { P: ['politica', 'matriz'], H: ['capacitacion'], V: ['auditoria'], A: ['mejora'] }
    active: (0, pg_core_1.boolean)('active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
});
// 17. Entregas de Estudiantes y Evaluación Automática (PHVA)
exports.studentSubmissions = (0, pg_core_1.pgTable)('student_submissions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    studentName: (0, pg_core_1.text)('student_name').notNull(),
    studentEmail: (0, pg_core_1.text)('student_email').notNull(),
    module: (0, pg_core_1.text)('module').notNull(), // 'MinTrabajo' | 'ARL SURA' | 'ATEL'
    fileName: (0, pg_core_1.text)('file_name').notNull(),
    fileSize: (0, pg_core_1.integer)('file_size').default(0),
    phvaPhase: (0, pg_core_1.text)('phva_phase').default('Planear').notNull(), // 'Planear' | 'Hacer' | 'Verificar' | 'Actuar'
    score: (0, pg_core_1.integer)('score').default(0).notNull(), // 0 - 100
    status: (0, pg_core_1.text)('status').default('Calificado').notNull(), // 'Esperando Calificación' | 'Calificado' | 'Aprobado'
    criteriaMatches: (0, pg_core_1.jsonb)('criteria_matches'), // Resultados del motor de comparación
    feedback: (0, pg_core_1.text)('feedback').notNull(),
    submittedAt: (0, pg_core_1.timestamp)('submitted_at', { withTimezone: true }).defaultNow().notNull(),
});
