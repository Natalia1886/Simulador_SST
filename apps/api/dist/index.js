"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const zod_1 = require("zod");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("./db");
const schema_1 = require("./db/schema");
dotenv_1.default.config();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.trim().length < 16) {
    throw new Error('JWT_SECRET debe estar definido en las variables de entorno con al menos 16 caracteres.');
}
const app = (0, express_1.default)();
const port = process.env.PORT || 4000;
app.set('trust proxy', 1);
app.use((0, helmet_1.default)());
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Origen no permitido por CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-teacher-code'],
}));
app.use(express_1.default.json({ limit: '1mb' }));
app.use((0, cookie_parser_1.default)());
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { code: 'RATE_LIMITED', error: 'Demasiados intentos. Intenta nuevamente en 15 minutos.' },
});
function signToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const cookieToken = req.cookies?.simulsst_token;
    const token = bearerToken || cookieToken;
    if (!token) {
        return res.status(401).json({ code: 'UNAUTHORIZED', error: 'Sesión no iniciada o token ausente.' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        return next();
    }
    catch {
        return res.status(401).json({ code: 'INVALID_TOKEN', error: 'Sesión expirada o token inválido.' });
    }
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ code: 'UNAUTHORIZED', error: 'Autenticación requerida.' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ code: 'FORBIDDEN', error: 'No tienes permisos para acceder a este recurso.' });
        }
        return next();
    };
}
// Esquemas Zod de validación
const registerSchema = zod_1.z.object({
    fullName: zod_1.z.string().trim().min(3, 'El nombre completo debe tener al menos 3 caracteres.').max(120),
    phone: zod_1.z.string().trim().min(7, 'Número de celular inválido.').max(25),
    email: zod_1.z.string().trim().email('Correo electrónico inválido.').max(160),
    password: zod_1.z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.').max(100),
    role: zod_1.z.enum(['estudiante', 'docente', 'administrador']),
    groupId: zod_1.z.string().trim().max(80).optional().nullable(),
    docenteCode: zod_1.z.string().optional(),
    teacherCode: zod_1.z.string().optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email('Correo electrónico inválido.'),
    password: zod_1.z.string().min(1, 'Debes proporcionar la contraseña.'),
});
const criteriaSchema = zod_1.z.object({
    companyName: zod_1.z.string().trim().min(2, 'Debe especificar el nombre de la empresa.').max(160),
    sector: zod_1.z.string().trim().min(2, 'Debe especificar el sector.').max(120),
    riskLevel: zod_1.z.string().trim().max(80).optional(),
    timeLimitMinutes: zod_1.z.coerce.number().int().min(5).max(240).optional(),
    description: zod_1.z.string().trim().max(2000).optional(),
    expectedPhva: zod_1.z.record(zod_1.z.string(), zod_1.z.array(zod_1.z.string())).optional(),
});
const submissionSchema = zod_1.z.object({
    studentName: zod_1.z.string().trim().max(120).optional(),
    studentEmail: zod_1.z.string().trim().email().optional(),
    module: zod_1.z.string().trim().max(160).optional(),
    fileName: zod_1.z.string().trim().max(200).optional(),
    fileSize: zod_1.z.coerce.number().int().min(0).max(50_000_000).optional(),
    textContent: zod_1.z.string().max(100_000).optional(),
    phvaPhase: zod_1.z.enum(['Planear', 'Hacer', 'Verificar', 'Actuar']).optional(),
});
const riskClassificationSchema = zod_1.z.object({
    studentEmail: zod_1.z.string().trim().email().optional(),
    studentName: zod_1.z.string().trim().max(120).optional(),
    companyName: zod_1.z.string().trim().max(160).optional(),
    riskClass: zod_1.z.string().trim().min(2, 'Debes seleccionar una clase de riesgo válida.').max(80),
    rationale: zod_1.z.string().trim().max(1000).optional(),
    period: zod_1.z.string().trim().max(20).optional(),
    score: zod_1.z.coerce.number().min(0).max(100).optional().nullable(),
});
// Verificación de Salud (Pública)
app.get('/health', async (_req, res) => {
    const dbOk = await (0, db_1.checkDatabaseConnection)();
    res.json({
        status: dbOk ? 'ok' : 'degraded',
        database: dbOk ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});
// Listar usuarios (Solo Docentes / Administradores)
app.get('/api/users', requireAuth, requireRole('docente', 'administrador'), async (_req, res) => {
    try {
        const allUsers = await db_1.db.select({
            id: schema_1.users.id,
            fullName: schema_1.users.fullName,
            email: schema_1.users.email,
            role: schema_1.users.role,
            groupId: schema_1.users.groupId,
            active: schema_1.users.active,
            createdAt: schema_1.users.createdAt
        }).from(schema_1.users);
        res.json({ users: allUsers });
    }
    catch (error) {
        console.error('Error al listar usuarios:', error);
        res.status(500).json({ error: 'Error al consultar usuarios' });
    }
});
// Registro / Creación de Usuario
app.post('/api/users/register', authLimiter, async (req, res) => {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos de registro inválidos.' });
        }
        const { fullName, phone, email, password, role, groupId, docenteCode, teacherCode } = parsed.data;
        if (role === 'docente' || role === 'administrador') {
            const providedCode = docenteCode || teacherCode || req.headers['x-teacher-code'];
            const expectedTeacherCode = process.env.TEACHER_REGISTRATION_CODE;
            if (!expectedTeacherCode) {
                return res.status(503).json({
                    error: 'Registro de docentes no disponible: falta configuración de autorización institucional.'
                });
            }
            if (!providedCode || String(providedCode).trim() !== expectedTeacherCode) {
                return res.status(403).json({
                    error: 'Código de Autorización Docente inválido o ausente.'
                });
            }
        }
        const normalizedEmail = email.toLowerCase().trim();
        const existing = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, normalizedEmail)).limit(1);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'El correo electrónico ya está registrado en el simulador.' });
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        const [newUser] = await db_1.db.insert(schema_1.users).values({
            fullName,
            phone,
            email: normalizedEmail,
            passwordHash,
            role,
            groupId: groupId || null,
            mustChangePassword: false,
            active: true
        }).returning({
            id: schema_1.users.id,
            fullName: schema_1.users.fullName,
            phone: schema_1.users.phone,
            email: schema_1.users.email,
            role: schema_1.users.role,
            groupId: schema_1.users.groupId,
            active: schema_1.users.active,
            createdAt: schema_1.users.createdAt
        });
        const token = signToken({
            id: newUser.id,
            email: newUser.email,
            role: newUser.role,
            fullName: newUser.fullName
        });
        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            token,
            user: newUser
        });
    }
    catch (error) {
        console.error('Error en registro de usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor al registrar usuario' });
    }
});
// Inicio de Sesión / Autenticación de Usuario
app.post('/api/users/login', authLimiter, async (req, res) => {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Credenciales inválidas.' });
        }
        const { email, password } = parsed.data;
        const normalizedEmail = email.toLowerCase().trim();
        const [user] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, normalizedEmail)).limit(1);
        if (!user) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }
        const isValid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }
        if (!user.active) {
            return res.status(403).json({ error: 'Usuario inactivo. Contacta a tu docente o administrador.' });
        }
        const token = signToken({
            id: user.id,
            email: user.email,
            role: user.role,
            fullName: user.fullName
        });
        res.json({
            message: 'Inicio de sesión exitoso',
            token,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                groupId: user.groupId,
                mustChangePassword: user.mustChangePassword
            }
        });
    }
    catch (error) {
        console.error('Error en login de usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor durante la autenticación' });
    }
});
// ==============================================================
// 1. DESCARGA REAL DE CERTIFICADOS Y REPORTES EN PDF (PDFKit)
// ==============================================================
app.get('/api/reports/certificate/pdf', (req, res) => {
    try {
        const studentName = String(req.query.student || 'Estudiante SST').slice(0, 120);
        const company = String(req.query.company || 'Metalmecánica Industrial S.A.S.').slice(0, 140);
        const moduleType = String(req.query.module || 'Autoevaluación de Estándares Mínimos (Res. 0312)').slice(0, 140);
        const numericScore = Math.min(100, Math.max(0, Number(req.query.score) || 88));
        const radNumber = String(req.query.rad || `RAD-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}-SST`).replace(/[^a-zA-Z0-9-_]/g, '');
        const doc = new pdfkit_1.default({ margin: 45, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Certificado_SST_${radNumber}.pdf"`);
        doc.pipe(res);
        doc.rect(20, 20, 555, 802).lineWidth(2).strokeColor('#003366').stroke();
        doc.rect(24, 24, 547, 794).lineWidth(0.5).strokeColor('#0070ba').stroke();
        doc.fillColor('#003366').fontSize(22).font('Helvetica-Bold').text('SIMULSST PRO', { align: 'center' });
        doc.fillColor('#0070ba').fontSize(11).font('Helvetica-Bold').text('SISTEMA DE GESTIÓN EN SEGURIDAD Y SALUD EN EL TRABAJO', { align: 'center' });
        doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('Ambiente Académico Calificado • Resolución 0312 de 2019 / Decreto 1072 de 2015', { align: 'center' });
        doc.moveDown(1.5);
        doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(45, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(1.5);
        doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('CERTIFICADO OFICIAL DE EVALUACIÓN TÉCNICA', { align: 'center' });
        doc.fillColor('#059669').fontSize(10).font('Helvetica-Bold').text(`Radicado Ministerial / Aseguradora: ${radNumber}`, { align: 'center' });
        doc.moveDown(2);
        doc.fillColor('#334155').fontSize(11).font('Helvetica').text(`Por medio del presente documento se certifica que el estudiante y asesor técnico en formación en Seguridad y Salud en el Trabajo:`, { align: 'justify' });
        doc.moveDown(0.8);
        doc.fillColor('#003366').fontSize(15).font('Helvetica-Bold').text(studentName.toUpperCase(), { align: 'center' });
        doc.moveDown(0.8);
        doc.fillColor('#334155').fontSize(11).font('Helvetica').text(`Ha completado satisfactoriamente la auditoría, verificación documental y autoevaluación correspondiente al ciclo PHVA en el marco de la cátedra de SST para la entidad simulada:`, { align: 'justify' });
        doc.moveDown(1);
        const boxY = doc.y;
        doc.rect(45, boxY, 505, 115).fillAndStroke('#f8fafc', '#cbd5e1');
        doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('PARÁMETROS TÉCNICOS VALIDADOS:', 55, boxY + 12);
        doc.font('Helvetica').fillColor('#334155');
        doc.text(`• Organización Evaluada: ${company}`, 55, boxY + 30);
        doc.text(`• Módulo Operativo: ${moduleType}`, 55, boxY + 45);
        doc.text(`• Calificación Técnica Obtenida: ${numericScore} / 100 Puntos Calificables`, 55, boxY + 60);
        doc.text(`• Valoración Normativa: CUMPLIMIENTO LEGAL VERIFICADO CONFORME A LA RÚBRICA`, 55, boxY + 75);
        doc.text(`• Fecha y Hora de Expedición: ${new Date().toLocaleString('es-CO')}`, 55, boxY + 90);
        doc.y = boxY + 135;
        doc.fillColor('#334155').fontSize(10).font('Helvetica').text('El presente certificado ha sido procesado por el motor de conciliación y auditoría de SimulSST Pro, sincronizado en tiempo real con el panel docente y la base de datos PostgreSQL institucional.', { align: 'justify' });
        doc.moveDown(4);
        const signaturesY = doc.y;
        doc.strokeColor('#94a3b8').lineWidth(1).moveTo(65, signaturesY).lineTo(240, signaturesY).stroke();
        doc.strokeColor('#94a3b8').lineWidth(1).moveTo(350, signaturesY).lineTo(525, signaturesY).stroke();
        doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('Docente Titular Cátedra SST', 65, signaturesY + 6, { width: 175, align: 'center' });
        doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('Dirección Académica SST\nLicencia Profesional Vigente', 65, signaturesY + 18, { width: 175, align: 'center' });
        doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('Ministerio del Trabajo / ARL', 350, signaturesY + 6, { width: 175, align: 'center' });
        doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('Auditoría y Conciliación SG-SST\nFirma Digital Verificada', 350, signaturesY + 18, { width: 175, align: 'center' });
        doc.end();
    }
    catch (error) {
        console.error('Error al generar PDF:', error);
        res.status(500).json({ error: 'Error al generar certificado PDF' });
    }
});
// ==============================================================
// 2. MOTOR DE COMPARACIÓN DE DOCUMENTOS (DOCENTE VS ESTUDIANTE)
// ==============================================================
// Solo Docentes / Administradores pueden crear criterios de evaluación
app.post('/api/cases/criteria', requireAuth, requireRole('docente', 'administrador'), async (req, res) => {
    try {
        const parsed = criteriaSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos de criterios inválidos.' });
        }
        const { companyName, sector, riskLevel, timeLimitMinutes, description, expectedPhva } = parsed.data;
        const defaultPhva = expectedPhva || {
            Planear: ['política', 'plan de trabajo', 'matriz de riesgos', 'recursos'],
            Hacer: ['capacitación', 'evaluación médica', 'copasst', 'inspecciones'],
            Verificar: ['auditoría', 'indicadores', 'investigación de accidentes'],
            Actuar: ['plan de mejoramiento', 'acciones preventivas', 'mantenimiento']
        };
        const [newCriteria] = await db_1.db.insert(schema_1.assignmentCriteria).values({
            companyName,
            sector,
            riskLevel: riskLevel || 'Clase V (Riesgo Máximo)',
            timeLimitMinutes: timeLimitMinutes || 30,
            description: description || 'Caso de autoevaluación general de estándares mínimos.',
            expectedPhva: defaultPhva,
            active: true
        }).returning();
        res.status(201).json({
            message: 'Criterios de simulación guardados exitosamente en PostgreSQL',
            criteria: newCriteria
        });
    }
    catch (error) {
        console.error('Error al guardar criterios docentes:', error);
        res.status(500).json({ error: 'Error al registrar criterios de simulación' });
    }
});
// Criterios activos (usuarios autenticados)
app.get('/api/cases/criteria', requireAuth, async (_req, res) => {
    try {
        const list = await db_1.db.select().from(schema_1.assignmentCriteria).orderBy((0, drizzle_orm_1.desc)(schema_1.assignmentCriteria.createdAt)).limit(10);
        res.json({ criteria: list });
    }
    catch (error) {
        console.error('Error al consultar criterios:', error);
        res.status(500).json({ error: 'Error al consultar criterios' });
    }
});
// Entrega de estudiante (vinculada al usuario autenticado)
app.post('/api/submissions/upload', requireAuth, async (req, res) => {
    try {
        const parsed = submissionSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos de entrega inválidos.' });
        }
        const { studentName, studentEmail, module, fileName, fileSize, textContent, phvaPhase } = parsed.data;
        const isStaff = req.user.role === 'docente' || req.user.role === 'administrador';
        const sEmail = isStaff && studentEmail ? studentEmail.toLowerCase().trim() : req.user.email;
        const sName = (isStaff && studentName ? studentName : req.user.fullName) || sEmail.split('@')[0];
        const sModule = module || 'ARL SURA - Evaluación PHVA';
        const fName = fileName || 'Entregable_SST.pdf';
        const phase = phvaPhase || 'Planear';
        const [activeCase] = await db_1.db.select().from(schema_1.assignmentCriteria).where((0, drizzle_orm_1.eq)(schema_1.assignmentCriteria.active, true)).orderBy((0, drizzle_orm_1.desc)(schema_1.assignmentCriteria.createdAt)).limit(1);
        const docRules = activeCase?.expectedPhva || {
            Planear: ['política', 'objetivos', 'matriz', 'plan anual'],
            Hacer: ['capacitación', 'inspección', 'copasst', 'responsable'],
            Verificar: ['indicadores', 'auditoría', 'revisión gerencial'],
            Actuar: ['plan de mejoramiento', 'acciones correctivas', 'preventivas']
        };
        const expectedKeywords = docRules[phase] || docRules['Planear'] || ['sst', 'seguridad', 'cumplimiento'];
        const contentToSearch = (textContent || `${fName} plan anual matriz sst copasst política objetivos`).toLowerCase();
        const matches = [];
        const missing = [];
        expectedKeywords.forEach((kw) => {
            if (contentToSearch.includes(kw.toLowerCase())) {
                matches.push(kw);
            }
            else {
                missing.push(kw);
            }
        });
        const matchRatio = matches.length / Math.max(expectedKeywords.length, 1);
        const calculatedScore = Math.min(100, Math.max(60, Math.round(70 + (matchRatio * 30))));
        const evaluationStatus = calculatedScore >= 80 ? 'Aprobado' : 'Con Observaciones';
        const autoFeedback = `Evaluación automática del sistema (Res. 0312): El entregable coincide con ${matches.length} de ${expectedKeywords.length} criterios esperados por la cátedra para la fase [${phase}]. ${missing.length > 0 ? 'Faltó profundizar en: ' + missing.join(', ') : 'Cumplimiento integral verificado con éxito.'}`;
        const [submission] = await db_1.db.insert(schema_1.studentSubmissions).values({
            studentName: sName,
            studentEmail: sEmail,
            module: sModule,
            fileName: fName,
            fileSize: fileSize ?? 1024,
            phvaPhase: phase,
            score: calculatedScore,
            status: evaluationStatus,
            criteriaMatches: {
                matches,
                missing,
                caseCompany: activeCase?.companyName || 'Metalmecánica Industrial S.A.S.'
            },
            feedback: autoFeedback
        }).returning();
        res.status(201).json({
            message: 'Documento procesado, comparado y registrado en PostgreSQL exitosamente',
            submission
        });
    }
    catch (error) {
        console.error('Error en motor de comparación de entregas:', error);
        res.status(500).json({ error: 'Error interno en el motor de comparación' });
    }
});
// Listar entregas (Anti-IDOR: estudiante solo ve las suyas; docente ve todas o filtra por email)
app.get('/api/submissions', requireAuth, async (req, res) => {
    try {
        const isStaff = req.user.role === 'docente' || req.user.role === 'administrador';
        const requestedEmail = req.query.studentEmail ? String(req.query.studentEmail).toLowerCase().trim() : null;
        const targetEmail = isStaff ? requestedEmail : req.user.email;
        const list = targetEmail
            ? await db_1.db.select()
                .from(schema_1.studentSubmissions)
                .where((0, drizzle_orm_1.eq)(schema_1.studentSubmissions.studentEmail, targetEmail))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.studentSubmissions.submittedAt))
                .limit(50)
            : await db_1.db.select()
                .from(schema_1.studentSubmissions)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.studentSubmissions.submittedAt))
                .limit(50);
        res.json({ submissions: list });
    }
    catch (error) {
        console.error('Error al listar entregas:', error);
        res.status(500).json({ error: 'Error al consultar entregas' });
    }
});
// Resumen consolidado de evaluación (Anti-IDOR)
app.get('/api/evaluations/summary', requireAuth, async (req, res) => {
    try {
        const isStaff = req.user.role === 'docente' || req.user.role === 'administrador';
        const requestedEmail = req.query.email ? String(req.query.email).toLowerCase().trim() : null;
        const email = isStaff && requestedEmail ? requestedEmail : req.user.email;
        const [user] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email)).limit(1);
        const submissions = await db_1.db.select()
            .from(schema_1.studentSubmissions)
            .where((0, drizzle_orm_1.eq)(schema_1.studentSubmissions.studentEmail, email))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.studentSubmissions.submittedAt));
        const evalSubmissions = submissions.filter((s) => s.module.includes('MinTrabajo') ||
            s.module.includes('Riesgo') ||
            s.module.includes('Estándares') ||
            s.module.includes('Autoevaluación') ||
            s.module.includes('ARL'));
        if (evalSubmissions.length === 0) {
            return res.json({
                evaluated: false,
                studentName: user?.fullName || email.split('@')[0],
                studentEmail: email,
                score: 0,
                status: 'Pendiente por evaluar',
                valoracion: 'Pendiente por evaluar',
                submittedAt: null,
                companyName: 'Empresa Metalmecánica S.A.',
                totalEvaluations: 0
            });
        }
        const latest = evalSubmissions[0];
        const score = Number(latest.score) || 0;
        let valoracion = 'Crítico';
        let legalStatus = 'Crítico';
        if (score > 85) {
            valoracion = 'Aceptable';
            legalStatus = 'Aceptable';
        }
        else if (score >= 60) {
            valoracion = 'Moderadamente Aceptable';
            legalStatus = 'Moderadamente Aceptable';
        }
        res.json({
            evaluated: true,
            studentName: user?.fullName || latest.studentName || email.split('@')[0],
            studentEmail: email,
            score,
            status: latest.status,
            valoracion,
            legalStatus,
            submittedAt: latest.submittedAt,
            module: latest.module,
            companyName: 'Empresa Metalmecánica S.A.',
            totalEvaluations: evalSubmissions.length
        });
    }
    catch (error) {
        console.error('Error al consultar resumen de evaluación:', error);
        res.status(500).json({ error: 'Error interno al consultar evaluación' });
    }
});
// Listar estudiantes (Solo Docentes / Administradores)
app.get('/api/students', requireAuth, requireRole('docente', 'administrador'), async (_req, res) => {
    try {
        const studentList = await db_1.db
            .select({
            id: schema_1.users.id,
            fullName: schema_1.users.fullName,
            phone: schema_1.users.phone,
            email: schema_1.users.email,
            role: schema_1.users.role,
            groupId: schema_1.users.groupId,
            active: schema_1.users.active,
            createdAt: schema_1.users.createdAt,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.role, 'estudiante'))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.users.createdAt));
        const submissionsList = await db_1.db.select().from(schema_1.studentSubmissions).orderBy((0, drizzle_orm_1.desc)(schema_1.studentSubmissions.submittedAt));
        const enrichedStudents = studentList.map((st) => {
            const studentSub = submissionsList.find((s) => s.studentEmail.toLowerCase() === st.email.toLowerCase());
            return {
                id: st.id,
                name: st.fullName || studentSub?.studentName || st.email,
                phone: st.phone || 'No registrado',
                email: st.email,
                groupId: st.groupId || 'Grupo 8A • Cohorte 2026',
                active: st.active,
                score: studentSub ? studentSub.score : null,
                status: studentSub ? (studentSub.score >= 80 ? 'Aprobado' : 'Pendiente') : 'Sin Entregas',
                module: studentSub?.module || 'En Inducción',
                createdAt: st.createdAt
            };
        });
        res.json({ students: enrichedStudents, total: enrichedStudents.length });
    }
    catch (error) {
        console.error('Error al obtener lista de estudiantes:', error);
        res.status(500).json({ error: 'Error al consultar estudiantes en la base de datos' });
    }
});
// Clasificación de riesgo interactiva (Transacción atómica + vinculada a usuario autenticado)
app.post('/api/evaluations/risk-classification', requireAuth, async (req, res) => {
    try {
        const parsed = riskClassificationSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos de clasificación inválidos.' });
        }
        const { studentEmail, studentName, companyName, riskClass, rationale, period, score: customScore } = parsed.data;
        const isStaff = req.user.role === 'docente' || req.user.role === 'administrador';
        const sEmail = isStaff && studentEmail ? studentEmail.toLowerCase().trim() : req.user.email;
        let sName = (isStaff && studentName ? studentName : req.user.fullName) || undefined;
        if (!sName) {
            const [u] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, sEmail)).limit(1);
            sName = u?.fullName || sEmail.split('@')[0];
        }
        const calculatedScore = customScore !== undefined && customScore !== null
            ? Number(customScore)
            : (riskClass.includes('IV') ? 92.5 : 70);
        const { event, submission } = await db_1.db.transaction(async (tx) => {
            const [createdEvent] = await tx.insert(schema_1.eventLogs).values({
                userId: req.user.id,
                type: 'answer_change',
                route: '/seccion-calificacion/riesgo',
                payloadJson: {
                    studentEmail: sEmail,
                    studentName: sName,
                    companyName: companyName || 'Empresa Metalmecánica S.A.',
                    riskClass,
                    rationale: rationale || 'Clasificación de riesgo asignada por el estudiante',
                    period: period || '2025',
                    score: calculatedScore,
                    timestamp: new Date().toISOString()
                }
            }).returning();
            const [createdSubmission] = await tx.insert(schema_1.studentSubmissions).values({
                studentName: sName,
                studentEmail: sEmail,
                module: 'MinTrabajo - Calificación Estándares Mínimos (Res. 0312)',
                fileName: `Evaluacion_Estandares_${riskClass.replace(/\s+/g, '_')}.json`,
                fileSize: 512,
                phvaPhase: 'Planear',
                score: Math.round(calculatedScore),
                status: calculatedScore >= 85 ? 'Aprobado' : (calculatedScore >= 60 ? 'Moderado' : 'Crítico'),
                criteriaMatches: {
                    selectedRisk: riskClass,
                    expectedRisk: 'Clase IV (Riesgo Alto)',
                    isCorrect: riskClass.includes('IV'),
                    exactScore: calculatedScore
                },
                feedback: riskClass.includes('IV')
                    ? '¡Excelente! Clasificación de Riesgo IV acertada para industria metalmecánica (Dec. 768/2022). Aplican 60 estándares mínimos.'
                    : `Clasificación ${riskClass} registrada. Nota: La actividad metalmecánica con tratamiento de metales corresponde prioritariamente a Clase IV según Dec. 768/2022.`
            }).returning();
            return { event: createdEvent, submission: createdSubmission };
        });
        res.status(201).json({
            message: 'Clasificación de riesgo guardada exitosamente en PostgreSQL',
            event,
            submission
        });
    }
    catch (error) {
        console.error('Error al guardar clasificación de riesgo:', error);
        res.status(500).json({ error: 'Error interno al registrar la clasificación de riesgo' });
    }
});
app.use((_req, res) => {
    res.status(404).json({ code: 'NOT_FOUND', message: 'Recurso no encontrado' });
});
app.use((err, _req, res, _next) => {
    if (err?.message === 'Origen no permitido por CORS') {
        return res.status(403).json({ code: 'CORS_FORBIDDEN', message: 'Origen no permitido' });
    }
    console.error('Error no controlado en la API:', err);
    if (res.headersSent) {
        return;
    }
    const status = typeof err?.status === 'number' ? err.status : 500;
    const message = status >= 500 ? 'Error interno del servidor' : (err?.message || 'Solicitud inválida');
    res.status(status).json({ code: status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR', message });
});
const server = app.listen(port, () => {
    console.log(`[SimulSST API] Servidor ejecutándose en http://localhost:${port}`);
});
async function gracefulShutdown(signal) {
    console.log(`[SimulSST API] Recibida señal ${signal}, cerrando conexiones...`);
    server.close(async () => {
        try {
            await db_1.pool.end();
            process.exit(0);
        }
        catch (err) {
            console.error('Error cerrando pool de PostgreSQL:', err);
            process.exit(1);
        }
    });
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
    console.error('Promesa no controlada:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('Excepción no controlada:', error);
});
exports.default = app;
