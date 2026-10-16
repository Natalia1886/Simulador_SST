# Documento de Especificación de Requerimientos del Sistema (SRS)

## Proyecto: Simulador Web de Estándares Mínimos de SST (ARL Sura & Ministerio del Trabajo)

---

### 1. Gestión de Usuarios, Autenticación y Carga Académica

* **RF01 - Gestión de Accesos por Rol Diferenciado:**
  El sistema debe permitir dos tipos de acceso claramente definidos:
  * **Estudiante:** Asume el rol de Responsable de SG-SST o Asesor Técnico, permitiéndole interactuar tanto con el módulo de ARL como con el módulo del Ministerio del Trabajo.
  * **Docente / Evaluador:** Asume el rol de Administrador/Superusuario, encargado de la gestión de empresas simuladas, precarga de parámetros/archivos de referencia y visualización de métricas de desempeño.

* **RF02 - Autenticación Simplificada por Lote:**
  El sistema debe permitir el inicio de sesión del estudiante mediante un mecanismo simplificado que valida credenciales previamente cargadas por el docente (archivo con correo y número de ID/Cédula como contraseña inicial), evitando la dependencia o integración directa con la infraestructura de correo institucional de la universidad.

* **RF03 - Asignación y Selección de Empresas Simuladas:**
  El sistema debe permitir al docente precrear un catálogo de empresas en la base de datos. El estudiante podrá seleccionar o tener asignada(s) una o varias empresas mediante su NIT o ID corporativo para desarrollar el ejercicio práctico en ambas plataformas.

* **RF04 - Módulo de Recuperación de Contraseña:**
  El simulador debe incluir la interfaz y flujo de "¿Olvidó su contraseña?", simulando el envío del enlace de restauración al correo registrado para enseñar al estudiante el proceso formal de autogestión de credenciales.

* **RF05 - Desvinculación y Reasignación de Profesionales de SST:**
  El sistema debe permitir simular la inactividad o desvinculación de un profesional de SST en una empresa antes de asociar a uno nuevo (liberando o reasignando el histórico), reflejando las buenas prácticas de confidencialidad y responsabilidad legal exigidas por la norma.

---

### 2. Módulo ARL (Simulador Aseguradora - Ej. SURA)

* **RF06 - Selección de Centro de Trabajo y Clasificación Dinámica:**
  El sistema debe permitir clasificar la empresa por sus centros de trabajo (ej. Administrativo vs. Operativo) y parametrizar su nivel de riesgo (I a V) y número de trabajadores para determinar automáticamente la cantidad de estándares aplicables a evaluar:
  * Unidades agropecuarias (Riesgo I, II, III).
  * 10 o menos trabajadores (Riesgo I, II, III) $\rightarrow$ Despliega solo fases Planear y Hacer.
  * 11 a 50 trabajadores (Riesgo I, II, III).
  * Más de 50 trabajadores o Riesgo IV y V $\rightarrow$ Despliega el ciclo completo PHVA (Planear, Hacer, Verificar, Actuar).

* **RF07 - Creación de Evaluaciones desde Cero:**
  El estudiante debe iniciar obligatoriamente la autoevaluación desde cero en el entorno simulado para garantizar el aprendizaje del diagnóstico real.

* **RF08 - Formulario e Ítems de Estándares Mínimos:**
  El sistema debe desplegar los ítems de evaluación según el nivel de riesgo asignado, permitiendo seleccionar los criterios de respuesta (*Cumple, No Cumple, No Aplica*) e indicando el modo de verificación sugerido para cada estándar.

* **RF09 - Validación Sintética por Hash para Evidencias (Sin Almacenamiento de PDF):**
  Para evitar el colapso de almacenamiento en el servidor web de la universidad, el sistema no guardará los archivos PDF pesados que suba el estudiante. La plataforma procesará el archivo seleccionado en el navegador del estudiante, calculará en tiempo real su identificador único (Hash) y lo comparará contra la base de datos de huellas de archivos válidos precargada por el profesor. De esta manera, certificará de forma inmediata si el documento cargado es el correcto, si es una "cascarita/trampa" o si carece de vigencia.

* **RF10 - Justificación y Campo de Observaciones:**
  Cada ítem de evaluación evaluado debe contar con un campo obligatorio de observaciones para que el estudiante argumente técnicamente su criterio de calificación o la aplicación de la opción "No Aplica".

* **RF11 - Pausa, Guardado Temporal y Progreso de Evaluación:**
  El sistema debe permitir guardar el estado parcial de la evaluación en la sesión del usuario para que el estudiante pueda suspender la actividad y continuar en sesiones posteriores.

---

### 3. Módulo Ministerio del Trabajo y Controles Normativos

* **RF12 - Registro e Información Inicial de la Entidad:**
  Debe simular el formulario de inscripción inicial de la empresa ante el Ministerio del Trabajo, recopilando datos oficiales como NIT, Razón Social, Régimen Tributario, Datos del Representante Legal, Sede Principal, Actividad Económica (CIIU) y Número de Trabajadores.

* **RF13 - Registro del Responsable de SST con Validación de Vigencias y Restricciones:**
  El sistema exigirá al estudiante registrar los datos de su perfil profesional (Licencia en SST, resolución, entidad emisora, experiencia en meses) y certificaciones (Curso de 50 horas / Actualización de 20 horas).
  * *Alerta y Bloqueo de Vigencia:* Si el estudiante ingresa fechas vencidas de sus cursos (ej. certificado de 50 horas con más de 3 años de antigüedad sin la actualización de 20 horas), el sistema bloqueará el avance mediante una ventana emergente que le notifique que no cumple con las condiciones vigentes para continuar.

* **RF14 - Formulario de Puntuación Directa y Conciliación:**
  Permitirá al estudiante ingresar la calificación cuantitativa final por ítem (*Cumple, No Cumple, No Aplica*), asegurando que el resultado concuerde de forma exacta con la autoevaluación previa realizada en la ARL.

* **RF15 - Consolidado Global y Reporte en PDF:**
  El sistema calculará automáticamente los porcentajes alcanzados en cada fase del ciclo PHVA y generará el reporte consolidado formal en PDF, simulando el certificado de autoevaluación del Ministerio del Trabajo.

* **RF16 - Módulo Integrado de Plan de Mejoramiento:**
  Cuando la evaluación obtenga una calificación global inferior al 100% (o por debajo de los umbrales mínimos normativos), el sistema activará de forma obligatoria un módulo dinámico donde el estudiante diligenciará, descargará y registrará directamente la matriz del Plan de Mejoramiento para la empresa.

---

### 4. Módulo Docente, Alertas y Analítica Educativa

* **RF17 - Trazabilidad y Registro de Interacciones (Logs de Usuario):**
  El sistema registrará silenciosamente la navegación del estudiante (tiempos consumidos por sección, rutas tomadas, puntos de estancamiento, omisiones de ítems o intentos de marcar "No Aplica" erróneamente) para contrastar su comportamiento con la ruta de un profesional experto.

* **RF18 - Dashboard de Analítica Educativa para el Docente:**
  Módulo exclusivo para el profesor que consolida métricas de rendimiento académico individuales y grupales (promedio de tiempo por intento, tasa de errores por estándar, fallas de criterio en la carga de evidencias y patrones de confusión).

* **RF19 - Sistema de Alertas Emergentes y Manejo de Errores Comunes:**
  Para preparar al estudiante ante fallas reales del entorno profesional, la plataforma desplegará mensajes instructivos o ventanas emergentes (pop-ups) cuando ocurran situaciones como:
  * Intentar ingresar sin activación del usuario por parte del administrador de la empresa.
  * Incongruencias entre el nivel de riesgo de la empresa y la cantidad de estándares obligatorios elegidos.
  * Intentos de suplantación o modificación ilegítima de archivos.

* **RF20 - Exportación Consolidada a Excel:**
  Permitirá al docente descargar en formato `.xlsx` los informes de calificaciones, el detalle de diagnósticos y el histórico de interacción de los estudiantes.

---

### 5. Requerimientos No Funcionales (RNF)

* **RNF01 - Usabilidad y Fidelidad Visual (UI/UX):**
  La interfaz gráfica debe simular fielmente la paleta de colores, menús, botones y flujos originales de las plataformas de ARL SURA y del Ministerio del Trabajo para propiciar una inmersión completa y favorecer la transferencia directa al campo laboral.

* **RNF02 - Mantenibilidad y Parametrización Normativa:**
  Toda la matriz de estándares mínimos, porcentajes, preguntas y textos legales de la Resolución 0312 de 2019 debe estar parametrizada en base de datos. Esto garantizará que el docente pueda editar o actualizar preguntas/normas ante futuros cambios regulatorios sin tocar el código fuente.

* **RNF03 - Protección de Datos Sintéticos y Privacidad:**
  El sistema operará estrictamente bajo un entorno de datos ficticios/sintéticos para evitar la recolección o exposición de información confidencial de empresas o personas reales.

* **RNF04 - Eficiencia Técnica y Optimización del Almacenamiento:**
  La aplicación evitará guardar archivos multimedia o documentos pesados en el servidor; basará la validación en lectura en cliente mediante algoritmos Hash y almacenamiento ligero en sesión/navegador.

* **RNF05 - Despliegue Web y Accesibilidad:**
  La solución será 100% web, accesible desde cualquier navegador moderno estándar (Chrome, Firefox, Edge) sin requerir librerías ni software especial instalado en los equipos de la universidad.