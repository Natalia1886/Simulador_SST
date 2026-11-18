# PLAN_auditoria.md — Fase 1: Auditoría Técnica del Software

**Proyecto:** Simulador Académico SST Pro (SimulSST Pro)
**Ejecutor:** agente de Antigravity en VS Code
**Entregable principal:** `AUDITORIA_TECNICA.md` en la raíz del repositorio
**Alcance adicional:** corregir los hallazgos **críticos** detectados (definición en la sección 2.3)

---


## 1. Contexto del repositorio

| Elemento | Valor esperado |
|---|---|
| Estructura | Monorepo con `apps/web` (React + Vite + Tailwind) y `apps/api` (Node + Express + TypeScript) |
| Base de datos | PostgreSQL con Drizzle ORM |
| Portales / identidades | Docente, Estudiante, ARL SURA, MinTrabajo |
| Ramas | `Natalia`, `Camila`, `main`, `despliegue` |
| Documentos de referencia (si existen) | `PLAN.md`, `PLAN_cl.md`, `docs/` (SRS e historias de usuario) |

Si algo no coincide con esta tabla (por ejemplo, rutas distintas), el agente **documenta la diferencia en el informe** y sigue con lo que encuentre; no la asume.

## 2. Reglas de ejecución

### 2.1 Reglas de seguridad para el agente (obligatorias)

1. **No imprimir secretos.** Al buscar claves, tokens o contraseñas, mostrar solo el archivo, la línea y los 4 primeros caracteres seguidos de `****`. Usar `--redact` en gitleaks si está instalado.
2. **No reescribir el historial** (`filter-branch`, `filter-repo`, `rebase`, `push --force`). Si hay un secreto en el historial, se reporta y se deja la limpieza como acción manual.
3. **No hacer `push`, no crear ni borrar ramas remotas, no borrar ramas locales.**
4. **No leer ni modificar `.env` real.** Para verificar variables se usa `.env.example`. Solo se comprueba que el `.env` existe y que está ignorado.
5. **No instalar herramientas globales sin avisar.** Se prefiere `npx` y lo que ya esté en `package.json`.
6. **No ejecutar comandos destructivos** (`rm -rf`, `DROP`, `TRUNCATE`) ni contra la base de datos de desarrollo con datos reales; las pruebas usan datos del *seed*.

### 2.2 Reglas de rigor

1. **Evidencia primero.** Cada fila del informe cita `ruta/archivo.ext:línea`. Sin evidencia, el estado es **No verificado**, nunca "Cumple".
2. **Separar tres tipos de hallazgo:** *confirmado* (se vio el código o se ejecutó), *probable* (inferido, a confirmar) y *no verificable* (falta acceso o contexto).
3. **No inventar rutas.** Antes de revisar un archivo mencionado en este plan, localizarlo con `git ls-files`. Si no existe, anotarlo.
4. **Medir, no suponer.** Tamaños de *bundle*, tiempos y conteos salen de comandos ejecutados, y el comando va en el anexo del informe.

### 2.3 Definición de hallazgo crítico (se corrige en esta fase)

| Se corrige | Ejemplos |
|---|---|
| Secretos expuestos | `.env` o `.agents/mcp_config.json` versionados; claves en el código o en archivos del repositorio |
| Falta de autenticación o autorización | Endpoint sin guarda; un estudiante accede a datos de otro (IDOR); un rol accede a rutas de otro |
| Inyección SQL | Consultas armadas con concatenación o `sql.raw` con entrada del usuario |
| Caídas por error | La API se cae por una excepción no controlada; el front queda en blanco ante un fallo de red o una lista vacía |
| Datos simulados presentados como reales | Métricas, nombres o cifras *hardcoded* en vistas servidas por la aplicación |
| CORS abierto con credenciales | `origin: '*'` junto con cookies o cabeceras de autorización |

**Se reporta pero no se corrige** (queda en el backlog del informe): optimizaciones de rendimiento, refactorizaciones grandes, cambios de diseño, mejoras de UX no bloqueantes y cualquier cambio que altere el modelo de datos en uso.

### 2.4 Flujo de correcciones

1. Crear una rama local temporal `auditoria/fase-1` desde la rama actual: `git switch -c auditoria/fase-1`.
2. Un commit por hallazgo, con el formato `fix(<area>): <descripción>` (por ejemplo `fix(security): restrict CORS to allowed origins`).
3. Tras cada corrección, ejecutar lint, tipos y pruebas disponibles (sección 11).
4. La decisión de fusionar a `main` o a las ramas personales **la toma una persona**; el agente no fusiona.

## 3. Fases de ejecución

| Fase | Nombre | Salida |
|---|---|---|
| A | Preparación y reconocimiento | Inventario del repositorio y baseline de comandos |
| B | Revisión por pilares (solo lectura) | Hallazgos con evidencia por cada uno de los 6 pilares |
| C | Correcciones críticas | Commits en `auditoria/fase-1` |
| D | Verificación | Evidencia de que las correcciones funcionan y no rompen nada |
| E | Informe | `AUDITORIA_TECNICA.md` y `docs/GIT_WORKFLOW.md` |

---

## 4. Fase A — Preparación y reconocimiento

**Tareas**

| # | Tarea | Comando o criterio |
|---|---|---|
| A1 | Registrar el estado de git | `git status --short`, `git branch -a`, `git log --oneline -n 20`, `git rev-parse HEAD` (el hash va en la portada del informe) |
| A2 | Inventariar archivos | `git ls-files` y `git ls-files '*.html'`; contar por carpeta y lenguaje |
| A3 | Localizar los archivos clave | Esquema de Drizzle, configuración del *pool*, `app.ts`/`server.ts`, middlewares de auth, `vite.config`, `.gitignore`, `.env.example`, `.agents/` |
| A4 | Leer la documentación existente | `README`, `PLAN.md`, `PLAN_cl.md`, `docs/` |
| A5 | Baseline de calidad | `npm ci` (o `npm install`), `npm run lint`, `npm run typecheck` (o `tsc --noEmit`), `npm run test`, `npm run build`. Anotar qué scripts existen y cuáles fallan **antes** de tocar nada |
| A6 | Arrancar el sistema | Levantar la API y el front en local y confirmar que responden (`GET /api/health` o equivalente). Si la base de datos no está disponible, anotarlo y revisar solo el código |
| A7 | Preparar herramientas de apoyo | Usar si están disponibles o se pueden ejecutar con `npx`: `gitleaks`, `npm audit`, `depcheck`, `madge`. Si alguna no se puede usar, hacer la comprobación manual y decirlo |

**Criterio de salida:** inventario hecho, baseline guardado y lista de archivos clave confirmada.

---

## 5. Pilar 1 — Arquitectura y modularidad

**Objetivo:** confirmar que frontend y backend están realmente separados y que el backend tiene capas claras.

**Revisar**

| # | Verificación | Qué buscar |
|---|---|---|
| 1.1 | Separación `apps/web` ↔ `apps/api` | El front no importa código del backend (salvo `packages/shared` de tipos/esquemas); el backend no sirve ni depende del código de vistas; no hay lógica de negocio en el front que deba estar en el servidor (cálculo de puntajes, conciliación, vigencias) |
| 1.2 | Capas del backend | Flujo `ruta → controlador → servicio → acceso a datos`. Detectar consultas a BD directamente en las rutas, controladores con lógica de negocio larga y archivos de más de 300 líneas |
| 1.3 | Rutas REST | Sustantivos en plural, verbos HTTP correctos, prefijo `/api`, forma de respuesta consistente, sin rutas duplicadas ni sin usar. Generar una **tabla de endpoints** (método, ruta, controlador, guarda de auth) |
| 1.4 | Esquema de Drizzle | Claves primarias y foráneas definidas, `onDelete` explícito, restricciones `unique` y `notNull` donde aplican (por ejemplo email, NIT, `evaluación + estándar`), enums para estados y roles, columnas `createdAt`/`updatedAt`, pesos y puntajes numéricos (no texto), nombres consistentes |
| 1.5 | Migraciones | Las migraciones existen, están versionadas y coinciden con el esquema (`drizzle-kit check` o `generate` sin diferencias). Hay *seed* con datos sintéticos y es repetible |
| 1.6 | Dependencias entre módulos | Ciclos (`npx madge --circular`), código duplicado evidente, módulos sin dueño claro |
| 1.7 | Dependencias de `package.json` | Paquetes sin usar o que sobran en cada app (`npx depcheck`), versiones incompatibles, dependencias de desarrollo en producción |
| 1.8 | Conformidad con el plan | Contrastar con `PLAN.md`/`PLAN_cl.md`: qué módulos y endpoints están implementados, parciales o ausentes |

**Salida:** tabla de endpoints, diagrama o lista de capas, matriz del Pilar 1.

**Correcciones permitidas en esta fase:** solo si un hallazgo cumple la definición de crítico (2.3). El resto va al backlog.

---

## 6. Pilar 2 — Seguridad

### 6.1 Secretos y control de versiones

| # | Verificación | Cómo |
|---|---|---|
| 2.1 | `.env` y `.agents/mcp_config.json` están en `.gitignore` | `git check-ignore -v .env .agents/mcp_config.json` (debe indicar la regla que los ignora). Revisar también `apps/*/.env` y `.env.*` |
| 2.2 | No están rastreados | `git ls-files .env .agents/mcp_config.json 'apps/*/.env*'`. Solo `.env.example` debería aparecer. Si un archivo sensible aparece, es **crítico**: `git rm --cached <archivo>` y agregar la regla al `.gitignore` |
| 2.3 | No aparecen en el historial reciente | `git log --all --oneline -- .env .agents/mcp_config.json 'apps/*/.env'`. Revisar los últimos 100 commits o los últimos 30 días, lo que abarque más. Reportar commit, fecha y autor, **sin mostrar el contenido** |
| 2.4 | Búsqueda de secretos en el código y el historial | `gitleaks detect --redact --log-opts="-n 100"` si está disponible. Si no, buscar con `git grep -nI -E` y con `git log -p -n 100 -S` los patrones `CLOUDINARY_API_SECRET`, `API_KEY`, `SECRET`, `PASSWORD=`, `Bearer `, `postgres://` con contraseña, `sk-`, `ghp_`. Considerar también `PLAN.md` y la documentación, donde antes hubo credenciales de Cloudinary escritas |
| 2.5 | `.env.example` limpio | Solo nombres de variables o valores vacíos o ficticios |
| 2.6 | Contenido de `.agents/mcp_config.json` | Verificar solo si contiene campos de credenciales (sin imprimirlos). Si el archivo debe versionarse, proponer una versión con variables de entorno en lugar de valores |

Si se encuentra un secreto en el historial: **no limpiarlo**. Registrar el hallazgo como crítico con la acción manual recomendada (rotar la credencial y, si procede, usar `git filter-repo` o BFG con confirmación humana).

### 6.2 Aplicación

| # | Verificación | Qué buscar |
|---|---|---|
| 2.7 | CORS | Lista blanca de orígenes tomada de variables de entorno; sin `origin: '*'` ni `origin: true` con `credentials: true`; métodos y cabeceras acotados |
| 2.8 | Cabeceras y límites | `helmet`, límite de tamaño del cuerpo (`express.json({ limit })`), `express-rate-limit` en login, recuperación de contraseña y verificación de hash |
| 2.9 | Autenticación | Contraseñas con hash (bcrypt/argon2), nunca en texto plano; secreto del JWT desde el entorno y sin valor por defecto; expiración del token; cookie `httpOnly`, `SameSite` y `secure` según entorno; el login no distingue "usuario no existe" de "clave errónea" |
| 2.10 | Roles y portales | Construir una **matriz endpoint × rol** (Docente, Estudiante, y la identidad de portal ARL SURA / MinTrabajo si el código la modela como rol o como contexto). Marcar esperado vs real. Verificar que ningún endpoint de docente sea accesible por estudiante y que el portal elegido no otorgue permisos adicionales |
| 2.11 | Autorización por propiedad (IDOR) | Todo endpoint con `:id` de empresa, evaluación o plan comprueba que el recurso pertenece al usuario autenticado o que el rol es docente. Probar con dos usuarios de prueba cuando haya BD disponible |
| 2.12 | Validación de entradas | Cada endpoint que recibe cuerpo, parámetros o consulta valida con `zod` (o equivalente): tipos, longitudes, formatos, enumeraciones. Detectar *mass assignment* (`.set(req.body)`, `.values(req.body)`) |
| 2.13 | Inyección SQL | Buscar `sql.raw(`, plantillas `sql\`...${...}\`` con entrada del usuario sin parametrizar, `db.execute(` con cadenas concatenadas, y `like/ilike` con entrada sin escapar comodines. Drizzle parametriza por defecto: lo que importa es el SQL "crudo" |
| 2.14 | Subidas de archivos | Si existe subida (logos, CSV): límite de tamaño, tipos permitidos, validación de la firma real del archivo, sin SVG, nombres no controlados por el usuario |
| 2.15 | Registros y mensajes | Los logs no incluyen contraseñas, tokens ni cuerpos completos de login; los errores no exponen trazas ni SQL al cliente en producción |
| 2.16 | Dependencias | `npm audit --omit=dev` en cada app; listar vulnerabilidades altas y críticas con paquete y versión corregida |
| 2.17 | Credenciales del *seed* | Existen, son sintéticas y están documentadas como solo para desarrollo; la clave inicial se guarda con hash |

**Salida:** matriz del Pilar 2, matriz endpoint × rol y lista de secretos (solo ubicación).

**Correcciones críticas esperables:** quitar archivos sensibles del índice, reforzar `.gitignore`, restringir CORS, añadir guardas de autenticación/rol/propiedad, validar con `zod` los endpoints sin validación, reemplazar SQL concatenado por consultas parametrizadas.

---

## 7. Pilar 3 — Escalabilidad y rendimiento

### 7.1 Base de datos (PostgreSQL + Drizzle)

| # | Verificación | Qué buscar |
|---|---|---|
| 3.1 | *Pool* de conexiones | Un único `Pool` (`pg`) compartido en toda la API, con `max`, `idleTimeoutMillis` y `connectionTimeoutMillis` configurados desde el entorno. Detectar un `Pool` o `Client` creado por petición, conexiones sin liberar y ausencia de cierre ordenado (`pool.end()` al recibir `SIGTERM`/`SIGINT`) |
| 3.2 | Cadena de conexión | Tomada de `DATABASE_URL` en el entorno, validada al arrancar, sin valores por defecto con credenciales |
| 3.3 | Consultas ineficientes | Patrón N+1 (consultas dentro de `for`/`map` con `await`), `select()` sin columnas sobre tablas anchas, listados sin paginación ni `limit`, agregaciones hechas en JavaScript que podrían hacerse en SQL |
| 3.4 | Transacciones | Operaciones con varias escrituras (enviar evaluación, conciliar, importar usuarios por CSV) dentro de `db.transaction` |
| 3.5 | Índices | Columnas de filtro y de unión frecuentes: `users.email`, `companies.nit`, claves foráneas, `evaluation_items(evaluation_id, standard_code)`, `event_logs(user_id, created_at)`. Si hay BD con *seed*, ejecutar `EXPLAIN (ANALYZE, BUFFERS)` en las 5 consultas más pesadas y adjuntar el resultado al anexo |
| 3.6 | Logs de eventos | El registro de interacciones se escribe por lotes y no bloquea la respuesta de la API |

### 7.2 Frontend (`apps/web`)

| # | Verificación | Cómo medir |
|---|---|---|
| 3.7 | Peso del *bundle* | `npm run build` y registrar el tamaño de cada archivo en `dist/` (sin comprimir y gzip). Referencia orientativa: JS inicial por debajo de unos 250 KB comprimido. Identificar los 5 paquetes más pesados (`npx vite-bundle-visualizer` o la salida de Vite) |
| 3.8 | Tailwind | Se usa Tailwind compilado por el *build* y **no** el script CDN (`cdn.tailwindcss.com`) en producción. Buscar el CDN en todos los HTML. Comprobar que el CSS final es pequeño y que no hay clases generadas en exceso |
| 3.9 | Carga diferida | Rutas pesadas (docente, gráficas, reportes) cargadas con `React.lazy`/`import()`; bibliotecas grandes (gráficas, PDF) importadas solo donde se usan |
| 3.10 | Recursos estáticos | Imágenes y logos con tamaño razonable (reportar los de más de 200 KB), formatos modernos (webp/svg), fuentes limitadas a los pesos usados y sin dependencias de CDN innecesarias |
| 3.11 | Renderizado | Listas largas sin paginación, estados que provocan renderizados en cascada, peticiones duplicadas al montar componentes |

**Salida:** matriz del Pilar 3, tabla de pesos del *bundle* y resultados de `EXPLAIN` en el anexo.

**Correcciones críticas esperables:** un solo *pool* con cierre ordenado si hoy se crea uno por petición; reemplazar el CDN de Tailwind si está en las vistas que sirve la aplicación. El resto de optimizaciones va al backlog.

---

## 8. Pilar 4 — Calidad de código y deuda técnica

**Objetivo:** encontrar y limpiar datos simulados, métricas *hardcoded*, enlaces rotos y código muerto.

### 8.1 Paso previo: clasificar cada archivo HTML/JS

Antes de limpiar, localizar con `git ls-files '*.html' '*.js'` los archivos como `05_docente_dashboard.html`, `07_mintrabajo_estudiante.html` y los demás. Clasificar cada uno:

| Tipo | Cómo reconocerlo | Qué hacer |
|---|---|---|
| **Vista servida por la aplicación** | Está en `apps/web/src`, `apps/web/public` o es importada/enlazada por el router | Se limpia y se corrige |
| **Referencia de diseño** (exportación de Stitch) | Vive en `docs/`, `design/` o similar y no se enlaza desde la aplicación | **No se borra ni se edita.** Se documenta como referencia en el informe y, si está dentro de `public/`, se propone moverla a `docs/design/` para que no se publique |
| **Duplicado obsoleto** | Misma pantalla que una vista ya migrada a componentes | Se reporta; se elimina solo si no tiene referencias (`git grep` del nombre) |

### 8.2 Búsquedas obligatorias

Ejecutar con `git grep -nI -E` sobre `apps/` y las vistas HTML, y registrar archivo y línea de cada coincidencia:

| Categoría | Patrones |
|---|---|
| Métricas y cifras fijas | Porcentajes, conteos y promedios escritos en JSX o HTML (por ejemplo `85%`, `24 estudiantes`, `4.2 min`), en tarjetas de KPI, gráficas y tablas de calificaciones |
| Datos simulados | `mock`, `fake`, `dummy`, `sample`, `lorem`, `placeholder`, `Math.random(`, `faker`, arreglos literales con nombres, NIT, correos o empresas de ejemplo, `setTimeout` que imita una petición |
| Enlaces y navegación rotos | `href="#"`, `href=""`, `javascript:`, rutas a archivos `.html` inexistentes, `onclick="alert(`, botones sin manejador, rutas del router que apuntan a componentes inexistentes |
| Código muerto | Componentes, hooks y utilidades sin importaciones (`depcheck` y `git grep` del nombre), variables y funciones sin uso (ESLint `no-unused-vars`), bloques comentados, `console.log` y `debugger`, `TODO`/`FIXME` abandonados |
| Dependencias de terceros innecesarias | Scripts de CDN en las vistas (Tailwind, fuentes, íconos), SDK que no se usan |
| Texto de relleno | Frases de prototipo ("Lorem ipsum", "Usuario Demo") visibles para el usuario |

### 8.3 Cómo corregir

| Situación | Acción |
|---|---|
| Dato fijo y **existe** el endpoint que lo entrega | Reemplazar por la llamada a la API con estados de carga, error y vacío |
| Dato fijo y el endpoint **no existe** | **No inventar datos.** Mostrar un estado vacío ("Sin datos todavía") y registrar el hallazgo como *pendiente de backend* en el informe, con el endpoint que haría falta |
| Dato legítimo de catálogo (textos normativos, etiquetas fijas, enumeraciones) | Dejarlo, pero moverlo a una constante o a la base de datos si debe ser parametrizable (RNF02) |
| Enlace roto | Apuntar a la ruta real o quitar el elemento; nunca dejar `#` |
| Código muerto sin referencias | Eliminar. Si hay duda, reportar en lugar de borrar |
| `console.log` y `debugger` | Eliminar (o pasar a un logger con nivel) |

**Salida:** matriz del Pilar 4 con el conteo de cada categoría **antes y después** de la limpieza.

---

## 9. Pilar 5 — Confiabilidad y manejo de errores

### 9.1 API

| # | Verificación | Resultado esperado |
|---|---|---|
| 5.1 | Códigos HTTP | `400` entrada inválida (con detalle por campo), `401` sin sesión o credenciales erróneas, `403` rol o propiedad insuficiente, `404` recurso inexistente, `409` conflicto (por ejemplo NIT duplicado), `500` error interno sin detalles sensibles. No usar `200` con un campo `error`, ni `500` para errores de validación |
| 5.2 | Forma uniforme del error | Una sola estructura, por ejemplo `{ code, message, details? }`, con mensajes claros en español |
| 5.3 | Manejador global | Existe middleware de errores al final de la cadena y un manejador para rutas no encontradas. Los controladores asíncronos no dejan promesas sin capturar (`express-async-errors`, `try/catch` o envoltorio) |
| 5.4 | Procesos | `unhandledRejection` y `uncaughtException` registrados; la API no se cae por una consulta fallida |
| 5.5 | Prueba práctica | Con la API en marcha, ejecutar con `curl` al menos: cuerpo inválido (400), sin sesión (401), recurso de otro usuario o rol incorrecto (403), id inexistente (404), y forzar un error (500). Adjuntar código y cuerpo de cada respuesta en el anexo |
| 5.6 | Base de datos caída | Qué responde la API si PostgreSQL no está disponible: debe devolver un error controlado y no quedarse colgada |

### 9.2 Frontend

| # | Verificación | Resultado esperado |
|---|---|---|
| 5.7 | Cliente HTTP único | Un envoltorio de `fetch`/axios con tiempo máximo de espera, manejo de error de red y traducción de los códigos de la API a mensajes de usuario |
| 5.8 | Sesión vencida | Un `401` limpia la sesión y redirige al login del portal correspondiente, sin pantalla en blanco |
| 5.9 | Estados de interfaz | Cada pantalla que consulta datos define **carga, error y vacío**: tablas sin filas, dashboard sin estudiantes, evaluación sin ítems, empresa sin responsable |
| 5.10 | Límite de errores | Existe un `ErrorBoundary` global y por módulo; un fallo de renderizado no deja la aplicación en blanco |
| 5.11 | Prueba práctica | Detener la API y recorrer las pantallas principales; devolver listas vacías; simular un `500`. Registrar qué se rompe |

**Salida:** matriz del Pilar 5 y tabla de pruebas de códigos HTTP (petición, código esperado, código real).

**Correcciones críticas esperables:** middleware global de errores, validación que devuelva `400` en lugar de `500`, `ErrorBoundary`, estados vacíos y de error en las pantallas que hoy se rompen.

---

## 10. Pilar 6 — Usabilidad (UX/UI) y control de versiones

### 10.1 Flujos de navegación y redirección

| # | Flujo | Verificar |
|---|---|---|
| 6.1 | Landing → selección de portal → login de la identidad elegida (SURA, MinTrabajo, Docente) | Cada botón lleva al login correcto y con su identidad visual |
| 6.2 | Login exitoso | El estudiante llega a su módulo y el docente a su panel; un rol no entra a las rutas del otro (redirección, no pantalla en blanco) |
| 6.3 | Acceso directo por URL sin sesión | Redirige al login y, tras ingresar, vuelve a la ruta pedida |
| 6.4 | Cerrar sesión | Limpia el estado y no permite volver con el botón "atrás" a pantallas protegidas |
| 6.5 | Ruta inexistente | Pantalla `404` con salida clara |
| 6.6 | Flujo ARL → MinTrabajo | MinTrabajo no permite avanzar sin la evaluación ARL enviada; el mensaje explica por qué |
| 6.7 | Recuperación de contraseña | Flujo completo y con mensajes comprensibles |
| 6.8 | Accesibilidad básica | Etiquetas en formularios, foco visible, navegación con teclado, contraste de texto (los colores #FFC107 y #00A3E0 no deben usarse como color de texto sobre blanco) |
| 6.9 | Consistencia | Paleta de marca (#005EB8, #007BFF, #00A3E0, #28A745, #FFC107), logo y tipografía coherentes entre pantallas; adaptación a pantallas pequeñas |

**Salida:** diagrama o tabla del mapa de rutas con la guarda de cada una, y matriz del Pilar 6.

### 10.2 Control de versiones: esquema de ramas

1. **Documentar el estado real:** `git branch -a`, última actividad de cada rama (`git log -1 --format='%h %an %ad' <rama>`), commits de diferencia respecto a `main` (`git rev-list --left-right --count main...<rama>`), y si existe protección de ramas o integración continua (`.github/`).
2. **Crear `docs/GIT_WORKFLOW.md`** con el siguiente esquema (el agente lo ajusta si el estado real obliga a alguna precisión, y lo explica):

| Rama | Propósito | Reglas |
|---|---|---|
| `main` | Código estable y revisado; fuente de verdad | Sin *push* directo; solo se actualiza mediante *pull request* con al menos una revisión; debe compilar y pasar pruebas |
| `despliegue` | Versión lista para publicar | Solo recibe fusiones desde `main`; cada fusión lleva una etiqueta de versión (`v0.1.0`) |
| `Natalia` | Rama de trabajo personal de Natalia | Se actualiza desde `main` con frecuencia; se integra a `main` por *pull request* en cambios pequeños |
| `Camila` | Rama de trabajo personal de Camila | Igual que la anterior |

Flujo propuesto: `Natalia`/`Camila` → *pull request* → `main` → fusión a `despliegue` con etiqueta.

3. **Incluir en el documento:** convención de commits (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`), plantilla de *pull request* con lista de verificación (lint, tipos, pruebas, sin secretos), regla de resolución de conflictos, y los comandos del día a día (`git switch`, `git fetch`, `git merge origin/main`, `git push -u origin <rama>`).
4. **No ejecutar** cambios sobre las ramas existentes. Proponer los comandos de protección de ramas como texto en el documento.

---

## 11. Fase C y D — Correcciones y verificación

### 11.1 Fase C: aplicar correcciones críticas

1. Ordenar los hallazgos críticos por riesgo: secretos > autenticación/autorización > inyección > caídas por error > datos simulados > CORS.
2. Aplicar cada corrección en su propio commit (regla 2.4) y anotar el hash en la columna **Corrección aplicada** del informe.
3. Si una corrección exige una decisión de negocio o un cambio de datos, **no aplicarla**: registrarla como pendiente con la propuesta concreta.

### 11.2 Fase D: verificación

| Comprobación | Criterio |
|---|---|
| Lint y tipos | Sin errores nuevos respecto al baseline de la Fase A |
| Pruebas | Las que pasaban siguen pasando; añadir pruebas mínimas para cada corrección crítica (por ejemplo, 401/403 en un endpoint protegido) |
| *Build* | `npm run build` termina bien en ambas apps |
| Prueba de humo | Con API y front en marcha: login por rol, una acción por portal, un endpoint protegido sin sesión (401) y uno ajeno (403) |
| Repetir búsquedas | Volver a ejecutar las búsquedas de los pilares 2 y 4; el conteo de hallazgos críticos debe bajar a cero o quedar justificado |
| Revisión del *diff* | `git diff main...auditoria/fase-1 --stat` y revisión de que no se tocaron secretos, datos ni archivos fuera de alcance |

---

## 12. Fase E — Informe `AUDITORIA_TECNICA.md`

Generar el archivo en la raíz con esta estructura, en español, con tono profesional y sin relleno.

### 12.1 Estructura obligatoria

| Sección | Contenido |
|---|---|
| Portada | Nombre del proyecto, fecha, hash del commit auditado, rama, alcance y limitaciones de la revisión |
| 1. Resumen ejecutivo | Máximo 10 líneas: estado general, número de hallazgos por estado, los 3 riesgos principales y qué se corrigió |
| 2. Metodología | Herramientas y comandos usados, criterios de estado y de riesgo, qué no se pudo verificar y por qué |
| 3. Matriz resumen global | Una fila por pilar con el conteo de Cumple / Parcial / Crítico y el estado general |
| 4. Matrices por pilar (6) | Una matriz por cada pilar (formato abajo) |
| 5. Cambios aplicados | Lista de commits de `auditoria/fase-1` con hash, archivos y motivo |
| 6. Pendientes y backlog | Hallazgos no corregidos, con prioridad, esfuerzo estimado (S/M/L) y propuesta |
| 7. Conclusiones técnicas | Para la entrega universitaria (ver 12.3) |
| Anexos | Salida resumida de los comandos (con secretos ocultos), tabla de endpoints, matriz endpoint × rol, tamaños del *bundle*, resultados de `EXPLAIN` y de las pruebas de códigos HTTP |

### 12.2 Formato de la matriz por pilar

```markdown
### Pilar N — <nombre>

| ID | Verificación | Estado | Evidencia (ruta:línea) | Riesgo | Corrección aplicada |
|---|---|---|---|---|---|
| 2.1 | `.env` ignorado | Cumple | `.gitignore:3` | Bajo | N/A |
| 2.13 | SQL crudo con entrada de usuario | Crítico | `apps/api/src/modules/x/x.repo.ts:42` | Alto | Commit `abc1234`: consulta parametrizada |
```

**Criterios**

| Estado | Significado |
|---|---|
| **Cumple** | Verificado con evidencia y sin observaciones relevantes |
| **Parcial** | Existe pero incompleto, inconsistente o con riesgo moderado |
| **Crítico** | Cumple la definición de 2.3 o incumple un control esencial |
| **No verificado** | No se pudo comprobar (falta de acceso, de BD o de herramienta); nunca se cuenta como "Cumple" |

| Riesgo | Criterio |
|---|---|
| **Alto** | Compromete datos, acceso o disponibilidad |
| **Medio** | Degrada calidad, rendimiento o mantenibilidad de forma apreciable |
| **Bajo** | Mejora deseable sin impacto inmediato |

La columna **Corrección aplicada** indica el hash del commit, o "Pendiente (backlog)" / "N/A".

### 12.3 Conclusiones técnicas para la entrega universitaria

Incluir, de forma concreta y honesta:

1. Fortalezas verificadas del sistema (separación front/back, validaciones, parametrización normativa, etc.), cada una con evidencia.
2. Limitaciones conocidas del prototipo y su justificación (entorno local, datos sintéticos, alcance académico).
3. Estado de la seguridad: qué controles existen, cuáles se corrigieron y cuáles quedan abiertos.
4. Trabajo futuro priorizado (primeros 5 elementos del backlog).
5. Alineación con prácticas de desarrollo seguro (revisión de secretos, validación de entradas, control de acceso, dependencias) y con el esquema de ramas documentado.
6. Declaración de alcance: la auditoría fue asistida por un agente y **requiere revisión humana** de los hallazgos críticos y de los *commits* antes de fusionarlos.

---

## 13. Checklist de cierre

- [ ] Inventario y baseline de la Fase A registrados (con el hash del commit auditado)
- [ ] `.env` y `.agents/mcp_config.json` ignorados, sin rastrear y sin aparecer en el historial reciente (o hallazgo crítico registrado)
- [ ] Ningún valor de secreto impreso en el informe, en los commits ni en la conversación
- [ ] CORS restringido a una lista blanca; autenticación, roles y propiedad verificados con la matriz endpoint × rol
- [ ] Todos los endpoints con entrada validada y sin SQL concatenado
- [ ] Un solo *pool* de PostgreSQL con cierre ordenado; consultas N+1 y falta de índices reportadas
- [ ] Tamaño del *bundle* medido; Tailwind compilado en lugar de CDN en lo que sirve la aplicación
- [ ] Vistas revisadas (`05_docente_dashboard.html`, `07_mintrabajo_estudiante.html` y demás): sin métricas *hardcoded* ni datos simulados presentados como reales, o pendientes registrados
- [ ] API con `400/401/403/404/500` correctos y cuerpo de error uniforme; front con estados de carga, error y vacío
- [ ] Mapa de navegación documentado y `docs/GIT_WORKFLOW.md` creado
- [ ] Correcciones críticas en commits separados sobre `auditoria/fase-1`, sin `push` ni fusión
- [ ] Lint, tipos, pruebas y *build* sin errores nuevos
- [ ] `AUDITORIA_TECNICA.md` completo, con matrices por pilar, evidencia con ruta y línea, y conclusiones

## 14. Fuera de alcance de esta fase

Cambios de diseño o de funcionalidades nuevas, migración de base de datos con datos reales, limpieza del historial de git, despliegue, y optimizaciones de rendimiento que no sean críticas. Todo ello se registra en el backlog del informe.