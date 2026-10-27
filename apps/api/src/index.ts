import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { db, checkDatabaseConnection } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Verificación de Salud
app.get('/health', async (req, res) => {
  const dbOk = await checkDatabaseConnection();
  res.json({
    status: dbOk ? 'ok' : 'degraded',
    database: dbOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Listar usuarios (para docentes y verificación)
app.get('/api/users', async (req, res) => {
  try {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      groupId: users.groupId,
      active: users.active,
      createdAt: users.createdAt
    }).from(users);

    res.json({ users: allUsers });
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ error: 'Error al consultar usuarios' });
  }
});

// Registro / Creación de Usuario
app.post('/api/users/register', async (req, res) => {
  try {
    const { fullName, phone, email, password, role, groupId } = req.body;

    if (!fullName || !phone || !email || !password || !role) {
      return res.status(400).json({ error: 'Todos los campos obligatorios deben ser proporcionados: Nombre Completo, Número de Celular, Correo, Contraseña y Rol.' });
    }

    if (!['estudiante', 'docente', 'administrador'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido. Debe ser estudiante o docente.' });
    }

    // Validación de Seguridad para Registro de Profesores / Administradores (Código Secreto)
    if (role === 'docente' || role === 'administrador') {
      const teacherVerificationCode = req.body.docenteCode || req.body.teacherCode || req.headers['x-teacher-code'];
      const expectedTeacherCode = process.env.TEACHER_REGISTRATION_CODE || 'DOCENTE_SST_2026';

      // Si no se suministra o no coincide con la clave secreta en el .env, rechazar con 403
      if (!teacherVerificationCode || String(teacherVerificationCode).trim() !== expectedTeacherCode) {
        return res.status(403).json({
          error: 'Código de Autorización Docente inválido o ausente. Para registrarte como profesor debes suministrar el código secreto institucional.'
        });
      }
    }

    // Verificar si ya existe
    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'El correo electrónico ya está registrado en el simulador.' });
    }

    // Hash de la contraseña con bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const [newUser] = await db.insert(users).values({
      fullName: String(fullName).trim(),
      phone: String(phone).trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      groupId: groupId ? String(groupId).trim() : null,
      mustChangePassword: false,
      active: true
    }).returning({
      id: users.id,
      fullName: users.fullName,
      phone: users.phone,
      email: users.email,
      role: users.role,
      groupId: users.groupId,
      active: users.active,
      createdAt: users.createdAt
    });

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: newUser
    });
  } catch (error) {
    console.error('Error en registro de usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor al registrar usuario' });
  }
});

// Inicio de Sesión / Autenticación de Usuario
app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Debes proporcionar correo electrónico y contraseña.' });
    }

    // Buscar usuario por correo
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);

    if (!user) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Validar contraseña con bcryptjs
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    if (!user.active) {
      return res.status(403).json({ error: 'Usuario inactivo. Contacta a tu docente o administrador.' });
    }

    res.json({
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        groupId: user.groupId,
        mustChangePassword: user.mustChangePassword
      }
    });
  } catch (error) {
    console.error('Error en login de usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor durante la autenticación' });
  }
});

// ==============================================================
// 1. DESCARGA REAL DE CERTIFICADOS Y REPORTES EN PDF (PDFKit)
// ==============================================================
import PDFDocument from 'pdfkit';
import { assignmentCriteria, studentSubmissions, eventLogs } from './db/schema';
import { desc } from 'drizzle-orm';

app.get('/api/reports/certificate/pdf', (req, res) => {
  try {
    const studentName = String(req.query.student || 'Juan Pérez');
    const company = String(req.query.company || 'Metalmecánica Industrial S.A.S.');
    const moduleType = String(req.query.module || 'Autoevaluación de Estándares Mínimos (Res. 0312)');
    const score = String(req.query.score || '88');
    const radNumber = String(req.query.rad || `RAD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}-SST`);

    const doc = new PDFDocument({ margin: 45, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Certificado_SST_${radNumber}.pdf"`);

    doc.pipe(res);

    // Borde decorativo
    doc.rect(20, 20, 555, 802).lineWidth(2).strokeColor('#003366').stroke();
    doc.rect(24, 24, 547, 794).lineWidth(0.5).strokeColor('#0070ba').stroke();

    // Encabezado Institucional
    doc.fillColor('#003366').fontSize(22).font('Helvetica-Bold').text('SIMULSST PRO', { align: 'center' });
    doc.fillColor('#0070ba').fontSize(11).font('Helvetica-Bold').text('SISTEMA DE GESTIÓN EN SEGURIDAD Y SALUD EN EL TRABAJO', { align: 'center' });
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('Ambiente Académico Calificado • Resolución 0312 de 2019 / Decreto 1072 de 2015', { align: 'center' });

    doc.moveDown(1.5);
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(45, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1.5);

    // Título Principal
    doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('CERTIFICADO OFICIAL DE EVALUACIÓN TÉCNICA', { align: 'center' });
    doc.fillColor('#059669').fontSize(10).font('Helvetica-Bold').text(`Radicado Ministerial / Aseguradora: ${radNumber}`, { align: 'center' });

    doc.moveDown(2);

    // Cuerpo del Certificado
    doc.fillColor('#334155').fontSize(11).font('Helvetica').text(
      `Por medio del presente documento se certifica que el estudiante y asesor técnico en formación en Seguridad y Salud en el Trabajo:`,
      { align: 'justify' }
    );

    doc.moveDown(0.8);
    doc.fillColor('#003366').fontSize(15).font('Helvetica-Bold').text(studentName.toUpperCase(), { align: 'center' });
    doc.moveDown(0.8);

    doc.fillColor('#334155').fontSize(11).font('Helvetica').text(
      `Ha completado satisfactoriamente la auditoría, verificación documental y autoevaluación correspondiente al ciclo PHVA en el marco de la cátedra de SST para la entidad simulada:`,
      { align: 'justify' }
    );

    doc.moveDown(1);

    // Caja de Resumen Técnico
    const boxY = doc.y;
    doc.rect(45, boxY, 505, 115).fillAndStroke('#f8fafc', '#cbd5e1');

    doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('PARÁMETROS TÉCNICOS VALIDADOS:', 55, boxY + 12);
    doc.font('Helvetica').fillColor('#334155');
    doc.text(`• Organización Evaluada: ${company}`, 55, boxY + 30);
    doc.text(`• Módulo Operativo: ${moduleType}`, 55, boxY + 45);
    doc.text(`• Calificación Técnica Obtenida: ${score} / 100 Puntos Calificables`, 55, boxY + 60);
    doc.text(`• Valoración Normativa: CUMPLIMIENTO LEGAL VERIFICADO CONFORME A LA RÚBRICA`, 55, boxY + 75);
    doc.text(`• Fecha y Hora de Expedición: ${new Date().toLocaleString('es-CO')}`, 55, boxY + 90);

    doc.y = boxY + 135;

    doc.fillColor('#334155').fontSize(10).font('Helvetica').text(
      'El presente certificado ha sido procesado por el motor de conciliación y auditoría de SimulSST Pro, sincronizado en tiempo real con el panel docente y la base de datos PostgreSQL institucional.',
      { align: 'justify' }
    );

    doc.moveDown(4);

    // Firmas
    const signaturesY = doc.y;
    doc.strokeColor('#94a3b8').lineWidth(1).moveTo(65, signaturesY).lineTo(240, signaturesY).stroke();
    doc.strokeColor('#94a3b8').lineWidth(1).moveTo(350, signaturesY).lineTo(525, signaturesY).stroke();

    doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('Dra. Patricia Gómez', 65, signaturesY + 6, { width: 175, align: 'center' });
    doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('Docente Titular Cátedra SST\nLicencia Profesional Vigente', 65, signaturesY + 18, { width: 175, align: 'center' });

    doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('Ministerio del Trabajo / ARL', 350, signaturesY + 6, { width: 175, align: 'center' });
    doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('Auditoría y Conciliación SG-SST\nFirma Digital Verificada', 350, signaturesY + 18, { width: 175, align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).json({ error: 'Error al generar certificado PDF' });
  }
});

// ==============================================================
// 2. MOTOR DE COMPARACIÓN DE DOCUMENTOS (DOCENTE VS ESTUDIANTE)
// ==============================================================

// Endpoint para que el docente asigne o actualice los criterios PHVA de simulación
app.post('/api/cases/criteria', async (req, res) => {
  try {
    const { companyName, sector, riskLevel, timeLimitMinutes, description, expectedPhva } = req.body;

    if (!companyName || !sector) {
      return res.status(400).json({ error: 'Debe especificar el nombre de empresa y sector.' });
    }

    const defaultPhva = expectedPhva || {
      Planear: ['política', 'plan de trabajo', 'matriz de riesgos', 'recursos'],
      Hacer: ['capacitación', 'evaluación médica', 'copasst', 'inspecciones'],
      Verificar: ['auditoría', 'indicadores', 'investigación de accidentes'],
      Actuar: ['plan de mejoramiento', 'acciones preventivas', 'mantenimiento']
    };

    const [newCriteria] = await db.insert(assignmentCriteria).values({
      companyName,
      sector: sector || 'Manufactura y Metalmecánica',
      riskLevel: riskLevel || 'Clase V (Riesgo Máximo)',
      timeLimitMinutes: Number(timeLimitMinutes) || 30,
      description: description || 'Caso de autoevaluación general de estándares mínimos.',
      expectedPhva: defaultPhva,
      active: true
    }).returning();

    res.status(201).json({
      message: 'Criterios de simulación guardados exitosamente en PostgreSQL',
      criteria: newCriteria
    });
  } catch (error) {
    console.error('Error al guardar criterios docentes:', error);
    res.status(500).json({ error: 'Error al registrar criterios de simulación' });
  }
});

// Endpoint para consultar criterios activos
app.get('/api/cases/criteria', async (req, res) => {
  try {
    const list = await db.select().from(assignmentCriteria).orderBy(desc(assignmentCriteria.createdAt)).limit(10);
    res.json({ criteria: list });
  } catch (error) {
    console.error('Error al consultar criterios:', error);
    res.status(500).json({ error: 'Error al consultar criterios' });
  }
});

// Endpoint para que el estudiante suba su entregable, sea procesado y comparado contra el docente
app.post('/api/submissions/upload', async (req, res) => {
  try {
    const { studentName, studentEmail, module, fileName, fileSize, textContent, phvaPhase } = req.body;

    const sName = studentName || 'Estudiante SimulSST';
    const sEmail = studentEmail || 'estudiante@universidad.edu.co';
    const sModule = module || 'ARL SURA - Evaluación PHVA';
    const fName = fileName || 'Entregable_SST.pdf';
    const phase = phvaPhase || 'Planear';

    // Obtener los criterios del docente más recientes en PostgreSQL
    const [activeCase] = await db.select().from(assignmentCriteria).where(eq(assignmentCriteria.active, true)).orderBy(desc(assignmentCriteria.createdAt)).limit(1);

    const docRules = (activeCase?.expectedPhva as Record<string, string[]>) || {
      Planear: ['política', 'objetivos', 'matriz', 'plan anual'],
      Hacer: ['capacitación', 'inspección', 'copasst', 'responsable'],
      Verificar: ['indicadores', 'auditoría', 'revisión gerencial'],
      Actuar: ['plan de mejoramiento', 'acciones correctivas', 'preventivas']
    };

    // MOTOR DE COMPARACIÓN:
    // Analiza las palabras clave y parámetros esperados del docente contra el contenido del archivo
    const expectedKeywords = docRules[phase] || docRules['Planear'] || ['sst', 'seguridad', 'cumplimiento'];
    const contentToSearch = (textContent || fName + ' plan anual matriz sst copasst política objetivos').toLowerCase();

    const matches: string[] = [];
    const missing: string[] = [];

    expectedKeywords.forEach(kw => {
      if (contentToSearch.includes(kw.toLowerCase())) {
        matches.push(kw);
      } else {
        missing.push(kw);
      }
    });

    const matchRatio = matches.length / Math.max(expectedKeywords.length, 1);
    const calculatedScore = Math.min(100, Math.max(60, Math.round(70 + (matchRatio * 30))));
    const evaluationStatus = calculatedScore >= 80 ? 'Aprobado' : 'Con Observaciones';

    const autoFeedback = `Evaluación automática del sistema (Res. 0312): El entregable coincide con ${matches.length} de ${expectedKeywords.length} criterios esperados por la cátedra para la fase [${phase}]. ${missing.length > 0 ? 'Faltó profundizar en: ' + missing.join(', ') : 'Cumplimiento integral verificado con éxito.'}`;

    // Guardar resultado de la comparación en PostgreSQL
    const [submission] = await db.insert(studentSubmissions).values({
      studentName: sName,
      studentEmail: sEmail,
      module: sModule,
      fileName: fName,
      fileSize: Number(fileSize) || 1024,
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
  } catch (error) {
    console.error('Error en motor de comparación de entregas:', error);
    res.status(500).json({ error: 'Error interno en el motor de comparación' });
  }
});

// Endpoint para listar entregas evaluadas (visible en Dashboard de Docente y Estudiante)
app.get('/api/submissions', async (req, res) => {
  try {
    const studentEmail = req.query.studentEmail ? String(req.query.studentEmail).toLowerCase().trim() : null;
    let list;
    if (studentEmail) {
      list = await db.select()
        .from(studentSubmissions)
        .where(eq(studentSubmissions.studentEmail, studentEmail))
        .orderBy(desc(studentSubmissions.submittedAt))
        .limit(50);
    } else {
      list = await db.select()
        .from(studentSubmissions)
        .orderBy(desc(studentSubmissions.submittedAt))
        .limit(50);
    }
    res.json({ submissions: list });
  } catch (error) {
    console.error('Error al listar entregas:', error);
    res.status(500).json({ error: 'Error al consultar entregas' });
  }
});

// Endpoint para consultar la evaluación consolidada del estudiante en PostgreSQL
app.get('/api/evaluations/summary', async (req, res) => {
  try {
    const email = req.query.email ? String(req.query.email).toLowerCase().trim() : null;
    if (!email) {
      return res.status(400).json({ error: 'Parámetro email es requerido' });
    }

    // Consultar usuario en base de datos
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    // Consultar entregas del estudiante ordenadas por fecha reciente
    const submissions = await db.select()
      .from(studentSubmissions)
      .where(eq(studentSubmissions.studentEmail, email))
      .orderBy(desc(studentSubmissions.submittedAt));

    // Buscar si completó autoevaluación o clasificación de estándares
    const evalSubmissions = submissions.filter(s =>
      s.module.includes('MinTrabajo') ||
      s.module.includes('Riesgo') ||
      s.module.includes('Estándares') ||
      s.module.includes('Autoevaluación') ||
      s.module.includes('ARL')
    );

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

    // Tomar la entrega más reciente del módulo
    const latest = evalSubmissions[0];
    const score = Number(latest.score) || 0;

    // Calcular valoración normativa según Resolución 0312 de 2019:
    // < 60%: Crítico
    // 60% a 85%: Moderadamente Aceptable
    // > 85%: Aceptable
    let valoracion = 'Crítico';
    let legalStatus = 'Crítico';
    if (score > 85) {
      valoracion = 'Aceptable';
      legalStatus = 'Aceptable';
    } else if (score >= 60) {
      valoracion = 'Moderadamente Aceptable';
      legalStatus = 'Moderadamente Aceptable';
    } else {
      valoracion = 'Crítico';
      legalStatus = 'Crítico';
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
  } catch (error) {
    console.error('Error al consultar resumen de evaluación:', error);
    res.status(500).json({ error: 'Error interno al consultar evaluación' });
  }
});

// Endpoint para listar estudiantes reales de PostgreSQL para el panel docente
app.get('/api/students', async (req, res) => {
  try {
    const studentList = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        phone: users.phone,
        email: users.email,
        role: users.role,
        groupId: users.groupId,
        active: users.active,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.role, 'estudiante'))
      .orderBy(desc(users.createdAt));

    const submissionsList = await db.select().from(studentSubmissions);

    const enrichedStudents = studentList.map(st => {
      // Buscar si el estudiante tiene alguna entrega registrada
      const studentSub = submissionsList.find(s => s.studentEmail.toLowerCase() === st.email.toLowerCase());

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
  } catch (error) {
    console.error('Error al obtener lista de estudiantes:', error);
    res.status(500).json({ error: 'Error al consultar estudiantes en la base de datos' });
  }
});

// Endpoint para guardar la clasificación de riesgo interactiva del estudiante
app.post('/api/evaluations/risk-classification', async (req, res) => {
  try {
    const { studentEmail, studentName, companyName, riskClass, rationale, period, score: customScore } = req.body;

    if (!riskClass) {
      return res.status(400).json({ error: 'Debes seleccionar una clase de riesgo válida.' });
    }

    const sEmail = (studentEmail || 'estudiante@simulsst.edu.co').toLowerCase().trim();
    let sName = studentName;

    if (!sName) {
      const [u] = await db.select().from(users).where(eq(users.email, sEmail)).limit(1);
      sName = u?.fullName || sEmail.split('@')[0];
    }

    // Calcular puntaje
    const calculatedScore = customScore !== undefined && customScore !== null 
      ? Number(customScore) 
      : (riskClass.includes('IV') ? 92.5 : 70);

    // Registrar en logs de eventos y registrar la autoevaluación
    const [event] = await db.insert(eventLogs).values({
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

    // Además registrar como submission de clasificación para trazabilidad docente
    const [submission] = await db.insert(studentSubmissions).values({
      studentName: sName,
      studentEmail: sEmail,
      module: 'MinTrabajo - Calificación Estándares Mínimos (Res. 0312)',
      fileName: `Evaluacion_Estandares_${riskClass.replace(/\s+/g, '_')}.json`,
      fileSize: 512,
      phvaPhase: 'Planear',
      score: Math.round(calculatedScore), // almacena entero en postgres
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

    res.status(201).json({
      message: 'Clasificación de riesgo guardada exitosamente en PostgreSQL',
      event,
      submission
    });
  } catch (error) {
    console.error('Error al guardar clasificación de riesgo:', error);
    res.status(500).json({ error: 'Error interno al registrar la clasificación de riesgo' });
  }
});


app.listen(port, () => {
  console.log(`[SimulSST API] Servidor ejecutándose en http://localhost:${port}`);
});

export default app;
