# Historias de Usuario - Simulador Web de Estándares Mínimos de SST

**Proyecto:** Simulador Web de Estándares Mínimos de SST (ARL SURA & Ministerio del Trabajo)  
**Basado en:** Especificación de Requerimientos del Sistema (SRS) — Resolución 0312 de 2019  

---

## Épica 1: Gestión de Usuarios, Autenticación y Carga Académica

### HU01 - Autenticación y Control de Acceso por Rol
* **Basado en:** RF01, RF02
* **Como:** Usuario del sistema (Estudiante o Docente)
* **Quiero:** Iniciar sesión con credenciales precargadas y acceder a las opciones según el rol
* **Para:** Interactuar con el entorno del simulador de acuerdo con la responsabilidad académica o administrativa.

**Criterios de Aceptación:**
- [ ] El sistema permite el ingreso mediante correo registrado y número de cédula/ID como contraseña inicial.
- [ ] Si el usuario tiene rol **Estudiante**, se habilita el acceso a los módulos simulados de ARL SURA y Ministerio del Trabajo.
- [ ] Si el usuario tiene rol **Docente/Evaluador**, se le redirige al panel de administración y analítica.
- [ ] El proceso de inicio de sesión no requiere integración con el servidor de correo institucional.

---

### HU02 - Selección y Asignación de Empresas Simuladas
* **Basado en:** RF03
* **Como:** Estudiante
* **Quiero:** Seleccionar una empresa del catálogo precreado o ingresar su NIT/ID
* **Para:** Realizar las prácticas de autoevaluación en ambas plataformas para dicha organización.

**Criterios de Aceptación:**
- [ ] El docente puede precrear múltiples empresas en el catálogo general.
- [ ] El estudiante puede visualizar la lista de empresas asignadas o buscar por NIT/ID corporativo.
- [ ] Los datos cargados durante la evaluación quedan asociados de forma exclusiva a la empresa seleccionada.

---

### HU03 - Recuperación Simulada de Contraseña
* **Basado en:** RF04
* **Como:** Estudiante
* **Quiero:** Solicitar el restablecimiento de mi contraseña desde la pantalla de ingreso
* **Para:** Aprender y simular el proceso estándar de autogestión de credenciales en plataformas corporativas.

**Criterios de Aceptación:**
- [ ] Existe la opción "¿Olvidó su contraseña?" en la interfaz de login.
- [ ] Al ingresar el correo, se muestra un mensaje simulando el envío de un enlace de recuperación.
- [ ] Permite cambiar la contraseña actual por una nueva para futuras sesiones dentro del entorno simulado.

---

### HU04 - Desvinculación y Reasignación del Responsable de SST
* **Basado en:** RF05
* **Como:** Docente / Administrador
* **Quiero:** Simular la desvinculación o inactividad de un profesional de SST en una empresa
* **Para:** Reasignar un nuevo responsable manteniendo la trazabilidad e historial previo según la norma legal.

**Criterios de Aceptación:**
- [ ] El docente puede cambiar el estado del responsable de SST a "Inactivo" o "Desvinculado".
- [ ] El historial de autoevaluaciones pasadas se conserva de forma intacta.
- [ ] La empresa queda disponible para que se le asocie un nuevo estudiante/profesional.

---

## Épica 2: Módulo ARL (Simulador Aseguradora - SURA)

### HU05 - Clasificación Dinámica de Empresa y Centros de Trabajo
* **Basado en:** RF06
* **Como:** Estudiante (Responsable de SST)
* **Quiero:** Configurar el centro de trabajo, nivel de riesgo (I-V) y número de trabajadores
* **Para:** Que el sistema determine automáticamente la matriz de estándares mínimos aplicables (10, 21 o 60 estándares).

**Criterios de Aceptación:**
- [ ] Empresas de $\le 10$ trabajadores (Riesgos I, II, III) solo despliegan fases **Planear** y **Hacer** (7 estándares).
- [ ] Empresas de $11$ a $50$ trabajadores (Riesgos I, II, III) despliegan el formulario con 21 estándares.
- [ ] Empresas de $> 50$ trabajadores o Riesgos IV y V despliegan el ciclo completo **PHVA** (60 estándares).
- [ ] Las Unidades Agropecuarias aplican sus reglas específicas según la Resolución 0312.

---

### HU06 - Diligenciamiento de Autoevaluación en ARL desde Cero
* **Basado en:** RF07, RF08, RF10
* **Como:** Estudiante
* **Quiero:** Iniciar un formulario de autoevaluación desde cero marcando los criterios (*Cumple, No Cumple, No Aplica*) y argumentando las decisiones
* **Para:** Diagnosticar el estado real de la empresa en materia de SST.

**Criterios de Aceptación:**
- [ ] La autoevaluación siempre inicia vacía para cada nuevo intento.
- [ ] Para cada estándar se indica el modo de verificación sugerido.
- [ ] Es obligatorio diligenciar el campo "Observaciones / Justificación" en cada ítem evaluado.

---

### HU07 - Validación Sintética de Evidencias por Algoritmo Hash
* **Basado en:** RF09, RNF04
* **Como:** Estudiante
* **Quiero:** Adjuntar archivos de evidencia en formato PDF desde el equipo
* **Para:** Verificar si los documentos cargados cumplen con la vigencia y validez técnica sin saturar el almacenamiento del servidor.

**Criterios de Aceptación:**
- [ ] El sistema lee el archivo PDF de manera local en el navegador del usuario.
- [ ] Se calcula la huella/hash SHA-256 o MD5 en el cliente y se compara contra la base de datos de firmas cargadas por el docente.
- [ ] Muestra de inmediato si la evidencia es correcta, si está vencida o si es un documento erróneo/trampa.
- [ ] El servidor **no almacena ni recibe** el archivo pesado en sus discos.

---

### HU08 - Guardado Parcial y Continuación del Diagnóstico
* **Basado en:** RF11
* **Como:** Estudiante
* **Quiero:** Pausar la autoevaluación en cualquier momento y guardar mi avance
* **Para:** Retomar el trabajo en sesiones posteriores sin perder la información registrada.

**Criterios de Aceptación:**
- [ ] Existe un botón visible de "Guardar borrador" / "Guardar y continuar luego".
- [ ] Al reingresar al simulador con el mismo usuario y empresa, la evaluación se carga en el último punto guardado.

---

## Épica 3: Módulo Ministerio del Trabajo y Controles Normativos

### HU09 - Inscripción Inicial de la Empresa ante el Ministerio
* **Basado en:** RF12
* **Como:** Estudiante
* **Quiero:** Registrar los datos generales de la empresa simulada en el formulario del Ministerio del Trabajo
* **Para:** Iniciar formalmente el proceso de reporte institucional.

**Criterios de Aceptación:**
- [ ] El formulario exige: NIT, Razón Social, Régimen Tributario, Datos del Representante Legal, Sede Principal, Código CIIU y Número de Trabajadores.
- [ ] Los datos deben coincidir con la información precargada de la empresa.

---

### HU10 - Registro del Profesional SST y Validación de Licencias / Cursos
* **Basado en:** RF13
* **Como:** Estudiante
* **Quiero:** Ingresar mis datos de perfil (Licencia SST, resolución, fechas de cursos de 50 y 20 horas)
* **Para:** Validar si cumplo con las exigencias legales para firmar el SG-SST.

**Criterios de Aceptación:**
- [ ] El sistema valida la fecha del curso de 50 horas (vigencia de 3 años).
- [ ] Si el curso está vencido y no se registra la actualización de 20 horas, el sistema muestra un Pop-up de bloqueo impidiendo continuar.

---

### HU11 - Puntuación Directa, Conciliación y Reporte Consolidado
* **Basado en:** RF14, RF15
* **Como:** Estudiante
* **Quiero:** Reportar las calificaciones cuantitativas e imprimir el consolidado final
* **Para:** Obtener el certificado final simulado de la evaluación ante el Ministerio del Trabajo.

**Criterios de Aceptación:**
- [ ] El sistema exige que las puntuaciones coincidan exactamente con la autoevaluación realizada previamente en el módulo ARL.
- [ ] Se calculan automáticamente los porcentajes del ciclo PHVA.
- [ ] Se habilita la descarga de un certificado consolidado oficial en PDF.

---

### HU12 - Generación Obligatoria del Plan de Mejoramiento
* **Basado en:** RF16
* **Como:** Estudiante
* **Quiero:** Diligenciar la matriz del Plan de Mejoramiento dentro de la plataforma
* **Para:** Cumplir con las acciones correctivas exigidas cuando la puntuación es inferior al 100% o no alcanza los mínimos normativos.

**Criterios de Aceptación:**
- [ ] Si la calificación final es menor al 100%, la sección de "Plan de Mejoramiento" se activa obligatoriamente.
- [ ] Permite asignar responsables, actividades, metas y plazos de cumplimiento para los ítems no cumplidos.
- [ ] Permite exportar la matriz en formato PDF/Excel.

---

## Épica 4: Módulo Docente, Alertas y Analítica Educativa

### HU13 - Registro Silencioso de Navegación y Comportamiento (Logs)
* **Basado en:** RF17
* **Como:** Docente / Evaluador
* **Quiero:** Que el sistema registre la interacción y tiempos de respuesta de cada estudiante
* **Para:** Analizar sus patrones de toma de decisiones e identificar dudas o errores recurrentes.

**Criterios de Aceptación:**
- [ ] Se registran métricas en segundo plano: tiempo por sección, cambios de respuesta, intentos fallidos de archivos Hash y uso indebido del "No Aplica".
- [ ] La recolección de datos no afecta el rendimiento de la interfaz gráfica del estudiante.

---

### HU14 - Dashboard de Analítica Educativa para Docentes
* **Basado en:** RF18, RF20
* **Como:** Docente
* **Quiero:** Visualizar un panel con gráficos, estadísticas e informes descargables
* **Para:** Evaluar el rendimiento general e individual de la clase y descargar los reportes en `.xlsx`.

**Criterios de Aceptación:**
- [ ] Panel con indicadores: promedio de tiempo global, tasa de fallas por estándar y errores de carga de evidencias.
- [ ] Filtros de consulta por grupo, estudiante o empresa simulada.
- [ ] Botón de exportación a Excel (`.xlsx`) con todo el histórico detallado.

---

### HU15 - Sistema de Alertas Pedagógicas y Manejo de Errores
* **Basado en:** RF19
* **Como:** Estudiante
* **Quiero:** Recibir alertas explicativas ante inconsistencias o errores en el flujo
* **Para:** Comprender la falla normativa o procedural cometida durante la simulación.

**Criterios de Aceptación:**
- [ ] Ventanas emergentes (Pop-ups) pedagógicas al detectar:
  - Intento de ingreso sin activación previa.
  - Selección de cantidad de estándares no acorde al riesgo/tamaño de la empresa.
  - Inconsistencia en la justificación de "No Aplica".

---

## Épica 5: Requerimientos No Funcionales y Calidad del Sistema

### HU16 - Fidelidad Visual y Réplica UI/UX (SURA / MinTrabajo)
* **Basado en:** RNF01
* **Como:** Estudiante
* **Quiero:** Interactuar con una interfaz idéntica en colores, menús y disposición a los portales reales
* **Para:** Facilitar la transferencia del aprendizaje a la práctica profesional real.

---

### HU17 - Parametrización y Actualización Normativa sin Código
* **Basado en:** RNF02
* **Como:** Docente / Administrador
* **Quiero:** Modificar textos, ítems de la Resolución 0312 o porcentajes desde la base de datos
* **Para:** Mantener actualizado el simulador ante eventuales cambios de ley sin depender de programadores.

---

### HU18 - Entorno Seguro con Datos Sintéticos
* **Basado en:** RNF03, RNF05
* **Como:** Administrador del Sistema
* **Quiero:** Garantizar que la aplicación funcione 100% en entorno web y con datos de prueba
* **Para:** Cumplir con normativas de protección de datos personales y asegurar la accesibilidad en cualquier navegador moderno.