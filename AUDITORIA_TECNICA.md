# AUDITORIA_TECNICA.md — SimulSST Pro

## Portada

| Campo | Valor |
|---|---|
| Proyecto | Simulador Académico SST Pro (SimulSST Pro) |
| Fecha de auditoría | 2026-11-18 |
| Hash del commit auditado (baseline) | `5f01d382e37a9d9adfd7ada57dc417a261672885` ("Actualizar plantilla env", 2026-10-26) |
| Rama de trabajo | `auditoria/fase-1` (creada desde `Natalia`, sin push ni fusión) |
| HEAD de correcciones en rama | `84cc590` (ver sección 5) |
| Alcance | Revisión estática y documental de `apps/api`, `apps/web/public`, configuración, esquema/migraciones, `.gitignore`, `.env.example`, documentación y estado git, conforme a `Plan_Auditoria.md`. |
| Limitaciones | No se leyó ni modificó `.env` real ni `.agents/mcp_config.json` (solo existencia/ignore/rastreo). No se ejecutaron servicios contra BD real, pruebas de humo HTTP, `EXPLAIN`, `npm audit`, `gitleaks`, `depcheck` ni `madge` por disponibilidad/alcance; resultados correspondientes marcados **No verificado**. No se ejecutó `npm ci/install` para evitar cambios de entorno. No se reescribió historial, no se hizo push ni se modificaron ramas remotas. |

## 1. Resumen ejecutivo

- Estado general: **Parcial/Crítico**. Se confirmaron y corrigieron hallazgos críticos de configuración/secretos en ejemplos y defaults, CORS permisivo, ausencia de manejador global de errores en API y datos simulados hardcoded en vistas servidas (`apps/api/src/index.ts`, `apps/api/src/db/index.ts`, `apps/api/drizzle.config.ts`, `.env.example`, `apps/api/.env.example`, `apps/web/public/*`).
- Hallazgos (estimación por revisión): **Cumple 8**, **Parcial 23**, **Crítico 4 remanentes**, **No verificado 19** (distribución por pilar en sección 3; conteo basado en verificaciones planificadas con evidencia disponible).
- Riesgos principales: (1) ausencia de autenticación, autorización por rol y control de propiedad (IDOR) en endpoints API (`apps/api/src/index.ts:49`, `:68`, `:140`, `:283`, `:319`, `:330`, `:401`, `:425`, `:505`, `:550`); (2) exposición/operación sin controles completos de validación, rate-limit y protección de datos sensibles en respuestas/listados (`apps/api/src/index.ts:49-66`, `:505-528`); (3) brechas de confiabilidad y entrega frontend (Tailwind CDN en vistas servidas, fetch hardcodeado a `localhost:4000`, sin cliente HTTP/ErrorBoundary unificado, build/tipos/lint no configurados) (`apps/web/public/index.html:8`, `apps/web/public/08_registro_usuarios.html:9`, `apps/web/package.json:1-13`, `apps/api/package.json:1-29`).
- Correcciones aplicadas: 6 commits en `auditoria/fase-1` (`bbc2a9c`, `eac5b1f`, `4807421`, `d1fc021`, `833c68f`, `84cc590`) con saneamiento de ejemplos/defaults, CORS con lista blanca, 404/middleware de errores/handlers de proceso, y retiro de datos simulados visibles en vistas.
- Pendientes críticos no corregidos: auth/RBAC/IDOR integral, validación robusta (zod) y endurecimiento de endpoints, reemplazo de Tailwind CDN por build compilado y formalización de calidad (lint/typecheck/tests/build) — requieren decisiones de negocio/cambios mayores.

## 2. Metodología

### Herramientas y comandos usados (con redacción de secretos)
- Git/baseline: `git status --short`, `git branch -a --format=...`, `git log --oneline -n 20 --decorate`, `git rev-parse HEAD`, `git log -1 --format=...`, `git rev-list --left-right --count main...<rama>`, `git ls-files`, `git ls-files '*.html'`, `git log --all -- .env .agents/mcp_config.json 'apps/*/.env'`, `git check-ignore -v .env .agents/mcp_config.json`, `git diff --stat`.
- Inspección: lecturas de `package.json`, `apps/api/package.json`, `apps/web/package.json`, `.gitignore`, `.env.example`, `apps/api/.env.example`, `apps/api/src/index.ts`, `apps/api/src/db/index.ts`, `apps/api/src/db/schema.ts`, `apps/api/drizzle.config.ts`, `apps/api/drizzle/0000_rare_penance.sql`, vistas `apps/web/public/*.html`, `README.md`, `PLAN_cl.md`, `docs/product/*`, `docs/architecture.md`.
- Búsquedas de evidencia: `Select-String`/`git grep` sobre fuentes versionadas (excluyendo `node_modules`, `package-lock.json`, y sin leer `.env`/`.agents/mcp_config.json`) para endpoints, CORS, `sql.raw`/`db.execute`/mass-assignment, `cdn.tailwindcss`, `Math.random`, `console.log`, datos simulados y rutas.
- Calidad baseline intentada: `npm --prefix apps/api run build` (invoca `tsc` sin `apps/api/tsconfig.json`), `npm --prefix apps/web run build`, `npm run lint/typecheck` en raíz/api/web (scripts ausentes). Versiones: `node -v` (v22.18.0), `npm -v` (10.9.3).

### Criterios
- **Estado:** Cumple (verificado con evidencia, sin observación relevante), Parcial (existe pero incompleto/inconsistente/riesgo moderado), Crítico (cumple definición 2.3 o incumple control esencial), No verificado (no comprobable con evidencia disponible).
- **Riesgo:** Alto (compromete datos/acceso/disponibilidad), Medio (degrada calidad/rendimiento/mantenibilidad), Bajo (mejora deseable).
- **Hallazgo crítico (2.3):** secretos expuestos, falta de auth/autorización o IDOR, inyección SQL, caídas por error no controlado, datos simulados presentados como reales, CORS abierto con credenciales.

### No verificado / motivos
- Ejecución de API/front, BD PostgreSQL, seeds/migraciones aplicadas, pruebas de humo y códigos HTTP reales: entorno/BD no disponibles en esta sesión.
- `npm audit`, `gitleaks`, `depcheck`, `madge`, `vite-bundle-visualizer`, `EXPLAIN`: herramientas/comandos no ejecutados o no aplicables al estado actual.
- Contenido de `.env` y `.agents/mcp_config.json`: prohibido por reglas (solo verificación de ignore/no rastreo).
- Protección de ramas en remoto/CI: no hay `.github/` versionado; configuración remota no auditable desde el repo.

## 3. Matriz resumen global

| Pilar | Cumple | Parcial | Crítico | No verificado | Estado general |
|---|---:|---:|---:|---:|---|
| 1. Arquitectura y modularidad | 1 | 5 | 0 | 2 | Parcial |
| 2. Seguridad | 4 | 6 | 2 | 5 | Crítico |
| 3. Escalabilidad y rendimiento | 1 | 4 | 1 | 3 | Crítico |
| 4. Calidad de código y deuda técnica | 1 | 4 | 0 | 3 | Parcial |
| 5. Confiabilidad y manejo de errores | 1 | 4 | 0 | 3 | Parcial |
| 6. Usabilidad (UX/UI) y control de versiones | 0 | 3 | 0 | 3 | Parcial |

> Nota: los conteos reflejan las verificaciones priorizadas del plan con evidencia disponible; no sustituyen una prueba exhaustiva en ejecución.

## 4. Matrices por pilar

### Pilar 1 — Arquitectura y modularidad

| ID | Verificación | Estado | Evidencia (ruta:línea) | Riesgo | Corrección aplicada |
|---|---|---|---|---|---|
| 1.1 | Separación web/api real vs esperada | Parcial | `package.json:1-23` (workspaces `apps/*`), `apps/web/package.json:6-9` (`serve public`), `apps/web/public/*.html`, ausencia de `apps/web/src`; API en `apps/api/src/index.ts:1-644`. No se evidencia importación de backend en front; front no es React/Vite como esperaba el plan. | Medio | N/A (diferencia documentada) |
| 1.2 | Capas backend (ruta/controlador/servicio/datos) | Parcial | `apps/api/src/index.ts:39-623` concentra rutas, validaciones, acceso a datos y lógica en un solo archivo; sin estructura de módulos/capas. | Medio | N/A (backlog refactor) |
| 1.3 | Rutas REST y tabla de endpoints | Parcial | Endpoints detectados en `apps/api/src/index.ts:39,49,68,140,188,283,319,330,401,425,505,550`; prefijo `/api` parcial (`/health` fuera), respuestas heterogéneas, sin guards (ver anexo). | Alto | N/A (requiere rediseño/guards) |
| 1.4 | Esquema Drizzle (PK/FK/onDelete/unique/notNull/enums/timestamps/tipos) | Parcial | `apps/api/src/db/schema.ts:15-27,30-50,54-60,63-78,81-96,99-107,110-126,129-147,150-157,160-167,170-177,180-186,189-198,201-211` define PK/unique/notNull/timestamps en varias tablas; FKs sin `onDelete` explícito (`:55,56,75,83,100,101,111,112,121,130,131,140,161,171,181,190`), estados/roles como `text` (no enums), sin índices explícitos adicionales. | Medio | N/A |
| 1.5 | Migraciones/seed coherentes y repetibles | Parcial | Migración versionada `apps/api/drizzle/0000_rare_penance.sql`, config `apps/api/drizzle.config.ts:13-20`; scripts `db:generate/db:migrate/db:seed` en `apps/api/package.json:10-12` pero no se evidencian `apps/api/src/db/migrate.ts` ni `apps/api/src/db/seed.ts` en inventario. Ejecución no verificada. | Medio | `bbc2a9c` exigió `DATABASE_URL` en `apps/api/drizzle.config.ts:8-11` (mejora de configuración, no completa migraciones) |
| 1.6 | Dependencias entre módulos/ciclos | No verificado | Sin ejecución de `madge`/análisis de ciclos; estructura pequeña pero monolítica (`apps/api/src/index.ts`). | Bajo | N/A |
| 1.7 | Dependencias de `package.json` | No verificado | `apps/api/package.json:14-27`, `apps/web/package.json:10-12`, `package.json:18-22`; sin `depcheck`/auditoría de uso. | Bajo | N/A |
| 1.8 | Conformidad con plan/documentación | Parcial | Esperado React/Vite/Tailwind compilado y capas/guards según `Plan_Auditoria.md:1`; implementación real estática y API monolítica (`apps/web/public/index.html:8`, `apps/api/src/index.ts:1-644`). Documentación de referencia presente (`README.md`, `PLAN_cl.md`, `docs/architecture.md`). | Medio | N/A (diferencias documentadas) |

### Pilar 2 — Seguridad

| ID | Verificación | Estado | Evidencia (ruta:línea) | Riesgo | Corrección aplicada |
|---|---|---|---|---|---|
| 2.1 | `.env` y `.agents/mcp_config.json` ignorados | Cumple | `.gitignore:3` (`.env`), `.gitignore:5` (`.agents/mcp_config.json`); `git check-ignore -v` confirma reglas para `.env`, `.agents/mcp_config.json`, `apps/api/.env`. | Bajo | N/A |
| 2.2 | Archivos sensibles no rastreados | Cumple | `git ls-files .env .agents/mcp_config.json 'apps/*/.env'` sin resultados. `.env.example` y `apps/api/.env.example` rastreados como plantillas (`git ls-files '*.env*'` implícito por inventario). | Bajo | N/A |
| 2.3 | Secretos en historial reciente | Cumple (no evidencia hallada) | `git log --all -- .env .agents/mcp_config.json 'apps/*/.env'` sin resultados. Búsqueda limitada al alcance disponible (sin gitleaks). | Medio | N/A |
| 2.4 | Búsqueda de secretos en código/historial | Parcial | Sin `gitleaks`. `.env.example:6,9` y `apps/api/src/db/index.ts:8`, `apps/api/drizzle.config.ts:11`, `apps/api/src/index.ts:69` tenían valores/defaults sensibles antes de corrección (confirmado por diff de `bbc2a9c`); estado actual saneado. `.agents/mcp_config.json` no leído. | Alto | `bbc2a9c` (saneamiento ejemplos/defaults) |
| 2.5 | `.env.example` limpio | Cumple | `.env.example:6,9-10` y `apps/api/.env.example:4,6-7` usan placeholders/vacíos (`usuario:contraseña`, `JWT_SECRET=`, `TEACHER_REGISTRATION_CODE=`) tras corrección. | Bajo | `bbc2a9c` |
| 2.6 | `.agents/mcp_config.json` (campos de credenciales) | No verificado | Archivo ignorado y no rastreado (`.gitignore:5`); lectura prohibida por reglas. | Medio | N/A |
| 2.7 | CORS restringido | Cumple | `apps/api/src/index.ts:17-34` usa lista blanca desde `CORS_ORIGINS` (default local), rechaza orígenes no permitidos, limita métodos/cabeceras y mantiene `credentials: true` solo con origen permitido. | Alto | `eac5b1f` |
| 2.8 | Cabeceras y límites (helmet/body limit/rate-limit) | Parcial | `helmet()` en `apps/api/src/index.ts:17`; `express.json({ limit: '1mb' })` en `:36`. No se evidencia `express-rate-limit` en login/registro (`apps/api/package.json:14-27`). | Medio | `eac5b1f` (límite body) |
| 2.9 | Autenticación (hash/JWT/cookies/login genérico) | Parcial | Hash bcrypt en registro/login (`apps/api/src/index.ts:6,118-120,156-161`), login no distingue usuario/clave en respuestas 401 (`:153,159`). No hay JWT/sesión emitida ni cookies de sesión; secretos/config auth incompletos. | Alto | Pendiente (backlog, cambio mayor) |
| 2.10 | Matriz endpoint × rol | Crítico | Ningún endpoint aplica guarda de autenticación/rol en handlers (`apps/api/src/index.ts:39,49,68,140,188,283,319,330,401,425,505,550`); portal/rol no enforceado en servidor. | Alto | Pendiente (requiere diseño de auth/RBAC) |
| 2.11 | Autorización por propiedad (IDOR) | Crítico | Endpoints consultan/operan por parámetros/cuerpo sin verificar identidad/propiedad (ej. `GET /api/evaluations/summary?email=`, `GET /api/submissions?studentEmail=`, `GET /api/students`, `POST /api/submissions/upload`) en `apps/api/src/index.ts:401-423,425-503,505-548,330-399`. | Alto | Pendiente (backlog) |
| 2.12 | Validación de entradas (zod/anti mass-assignment) | Parcial | Validaciones manuales puntuales (`apps/api/src/index.ts:71-77,143-145,286-288,553-555`), pero sin esquema robusto (zod) ni cobertura uniforme; múltiples inserciones desde `req.body` con normalización parcial (`:122-131,293-301,373-387,562-599`). Sin búsqueda de `.set(req.body)`/`.values(req.body)` en API. | Alto | Pendiente (backlog) |
| 2.13 | Inyección SQL | Cumple (patrones buscados no hallados) | Búsqueda de `sql.raw`, `db.execute`, `.set(req.body)`, `.values(req.body)` en `apps/api/src` sin coincidencias; uso de Drizzle query builder (`apps/api/src/index.ts:51-58,110,149,295,321,332,373,404,433,442,508,552,562,585`). | Medio | N/A |
| 2.14 | Subidas de archivos | No verificado | Se reciben metadatos/contenido textual en JSON (`apps/api/src/index.ts:333,351,370`), no carga multipart real evidente; controles de tamaño/tipo/firma no verificables. | Medio | N/A |
| 2.15 | Registros y mensajes | Parcial | `console.error` presente en manejadores (`apps/api/src/index.ts:62,134,176,273,313,395,419,499,544,616,629,633`), middleware global evita exponer detalle interno en 500 (`:636-639`); no se evidencian logs de contraseñas/tokens en revisión estática. | Medio | `4807421` (respuesta 500 controlada) |
| 2.16 | Dependencias (npm audit) | No verificado | No se ejecutó `npm audit --omit=dev`. Dependencias declaradas en `apps/api/package.json:14-27`. | Alto | N/A |
| 2.17 | Credenciales del seed | No verificado | No se localizó archivo de seed ejecutable (`apps/api/src/db/seed.ts` ausente según inventario); credenciales de desarrollo no verificables. | Medio | N/A |

### Pilar 3 — Escalabilidad y rendimiento

| ID | Verificación | Estado | Evidencia (ruta:línea) | Riesgo | Corrección aplicada |
|---|---|---|---|---|---|
| 3.1 | Pool único y configurado | Parcial | Pool único exportado en `apps/api/src/db/index.ts:14-19` con `max/idleTimeoutMillis/connectionTimeoutMillis` desde entorno; validación de `DATABASE_URL` en `:8-11`. No se evidencia cierre ordenado `pool.end()` en `SIGTERM/SIGINT` (`apps/api/src/index.ts:636-644`). | Medio | `bbc2a9c` (configuración/validación de pool) |
| 3.2 | Cadena de conexión desde entorno | Cumple | `apps/api/src/db/index.ts:8-11`, `apps/api/drizzle.config.ts:8-11` requieren `DATABASE_URL` sin default hardcodeado. | Alto | `bbc2a9c` |
| 3.3 | Consultas ineficientes/N+1/paginación | Parcial | Enriquecimiento de estudiantes con `submissionsList.find(...)` en memoria tras cargar listados completos (`apps/api/src/index.ts:508-523`), listados con `limit` fijo pero sin paginación real por cursor/offset (`:321-322,404-417,442-446,508-516`). | Medio | N/A |
| 3.4 | Transacciones en escrituras múltiples | Parcial | `POST /api/evaluations/risk-classification` realiza inserciones separadas en `eventLogs` y `studentSubmissions` sin `db.transaction` (`apps/api/src/index.ts:562-599`). | Medio | N/A |
| 3.5 | Índices y EXPLAIN | No verificado | Esquema sin índices explícitos adicionales visibles (`apps/api/src/db/schema.ts`); sin BD/`EXPLAIN` ejecutado. | Medio | N/A |
| 3.6 | Logs de eventos no bloqueantes/lotes | No verificado | Inserción directa por petición (`apps/api/src/index.ts:562-583`); no hay evidencia de batching/cola. | Bajo | N/A |
| 3.7 | Peso de bundle | No verificado | Frontend estático sin build/bundle Vite (`apps/web/package.json:6-9`), sin `dist/` medible en repo. | Medio | N/A |
| 3.8 | Tailwind compilado (sin CDN en vistas servidas) | Crítico | Uso de CDN en vistas servidas: `apps/web/public/index.html:8`, `apps/web/public/08_registro_usuarios.html:9`. | Medio | Pendiente (requiere incorporar pipeline CSS/build) |
| 3.9 | Carga diferida | No verificado | No aplica arquitectura SPA React/Lazy en código actual (HTML estático). | Bajo | N/A |
| 3.10 | Recursos estáticos | No verificado | No se realizó inventario de pesos/formatos de imágenes/fuentes (>200 KB). | Bajo | N/A |
| 3.11 | Renderizado/peticiones duplicadas | No verificado | Requiere pruebas de ejecución y perfilado; múltiples fetches inline en vistas (`apps/web/public/*.html`). | Medio | N/A |

### Pilar 4 — Calidad de código y deuda técnica

| ID | Verificación | Estado | Evidencia (ruta:línea) | Riesgo | Corrección aplicada |
|---|---|---|---|---|---|
| 4.1 | Clasificación de HTML/JS | Cumple | Vistas servidas identificadas en `apps/web/public/02_login_docente.html`, `03_login_mintrabajo.html`, `04_login_arl_sura.html`, `05_docente_dashboard.html`, `06_arl_sura_evaluacion.html`, `07_mintrabajo_estudiante.html`, `08_registro_usuarios.html`, `index.html` y script `apps/web/public/wire_links.js`. No se hallaron exportaciones Stitch en `docs/` durante inventario. | Bajo | N/A |
| 4.2 | Datos simulados/hardcoded en vistas servidas | Parcial | Corregidos: historial/radicados y rad aleatorio en MinTrabajo, estudiante hardcodeado/rad aleatorio y console en ARL, console logs en dashboard, perfil demo en landing (`apps/web/public/07_mintrabajo_estudiante.html`, `apps/web/public/06_arl_sura_evaluacion.html`, `apps/web/public/05_docente_dashboard.html`, `apps/web/public/index.html`, commits `d1fc021`, `833c68f`, `84cc590`). Persisten datos de catálogo/ejemplo de empresa en formularios/etiquetas (ej. `apps/web/public/07_mintrabajo_estudiante.html:718,771,784,790,795,805,1131`), a evaluar como catálogo vs dato simulado. | Medio | `d1fc021`, `833c68f`, `84cc590` |
| 4.3 | `Math.random`, `console.log/debugger` | Parcial | `Math.random` removido de vistas corregidas (reemplazado por `Date.now()` en `apps/web/public/06_arl_sura_evaluacion.html`, `apps/web/public/07_mintrabajo_estudiante.html`; commits `d1fc021`). `console.log` de depuración removido de `apps/web/public/05_docente_dashboard.html` (`d1fc021`); persisten `console.error` en API para errores (`apps/api/src/index.ts:62,134,176,273,313,395,419,499,544,616,629,633`). | Bajo | `d1fc021` (frontend) |
| 4.4 | Enlaces rotos/placeholders | No verificado | No se realizó barrido exhaustivo de `href="#"`, `javascript:` y rutas inexistentes en todas las vistas tras cambios; requiere prueba de navegación. | Medio | N/A |
| 4.5 | Código muerto y dependencias de terceros innecesarias | Parcial | API monolítica extensa (`apps/api/src/index.ts:1-644`), scripts CDN externos en vistas (`apps/web/public/index.html:8-11,14`, `apps/web/public/08_registro_usuarios.html:9-11,14`); sin `depcheck`/análisis de uso. | Medio | N/A |
| 4.6 | Texto de relleno visible | No verificado | Revisión puntual realizada; no se garantiza ausencia total de textos prototipo en todas las pantallas. | Bajo | N/A |
| 4.7 | Baseline lint/typecheck/test/build | Parcial | Scripts ausentes en raíz y apps (`package.json:6-12`, `apps/api/package.json:6-12`, `apps/web/package.json:6-9`); `tsc` sin `tsconfig` en `apps/api`; no se introdujeron nuevos scripts. | Medio | N/A |

### Pilar 5 — Confiabilidad y manejo de errores

| ID | Verificación | Estado | Evidencia (ruta:línea) | Riesgo | Corrección aplicada |
|---|---|---|---|---|---|
| 5.1 | Códigos HTTP coherentes | Parcial | Uso de `400/401/403/404/409/500/503` en rutas (`apps/api/src/index.ts:72,76,90,96,113,144,153,159,164,287,312,398,418,428,498,543,554,615`); 404 global y manejo de error CORS/500 global añadidos (`:624-639`). Consistencia de forma de error no uniforme (`{error}` vs `{code,message}`). | Medio | `4807421`, `bbc2a9c` (503 en registro docente sin config) |
| 5.2 | Forma uniforme de error | Parcial | Middleware global responde `{ code, message }` (`apps/api/src/index.ts:625,632,638`), pero rutas previas responden mayoritariamente `{ error: ... }`. | Medio | Parcial en `4807421` |
| 5.3 | Manejador global y async | Parcial | Middleware 404 y de error al final (`apps/api/src/index.ts:624-639`); controladores async con `try/catch` en la mayoría de handlers, pero sin wrapper global tipo `express-async-errors` para promesas no capturadas fuera de try. | Alto | `4807421` |
| 5.4 | Procesos (unhandledRejection/uncaughtException) | Parcial | Handlers registrados en `apps/api/src/index.ts:628-634`; sin política de apagado controlado/restart definida. | Medio | `4807421` |
| 5.5 | Pruebas prácticas HTTP (400/401/403/404/500) | No verificado | API no ejecutada durante auditoría. | Alto | N/A |
| 5.6 | Comportamiento con BD caída | No verificado | `checkDatabaseConnection` existe (`apps/api/src/db/index.ts:25-35`, `/health` en `apps/api/src/index.ts:39-46`), pero no se probó en ejecución. | Medio | N/A |
| 5.7 | Cliente HTTP único en frontend | Parcial | Llamadas `fetch` directas dispersas en vistas (`apps/web/public/index.html`, `02_login_docente.html`, `05_docente_dashboard.html`, `06_arl_sura_evaluacion.html`, `07_mintrabajo_estudiante.html`, `08_registro_usuarios.html`) con URLs `http://localhost:4000` hardcodeadas. | Medio | N/A |
| 5.8 | Sesión vencida/401 en frontend | No verificado | No se evidenció manejo uniforme de 401/redirección en revisión estática; requiere prueba funcional. | Medio | N/A |
| 5.9 | Estados carga/error/vacío | Parcial | Algunas vistas muestran mensajes/estados puntuales; tras corrección se añadió estado vacío en tablas de expedientes/vinculación (`apps/web/public/07_mintrabajo_estudiante.html`). Cobertura completa no verificada. | Medio | `d1fc021`, `84cc590` (estados vacíos puntuales) |
| 5.10 | ErrorBoundary global/módulo | No verificado | Frontend no es React con ErrorBoundary; no hay mecanismo equivalente evidenciado. | Medio | N/A |
| 5.11 | Pruebas prácticas frontend | No verificado | No ejecutadas (API detenida/BD no disponible). | Medio | N/A |

### Pilar 6 — Usabilidad (UX/UI) y control de versiones

| ID | Verificación | Estado | Evidencia (ruta:línea) | Riesgo | Corrección aplicada |
|---|---|---|---|---|---|
| 6.1 | Landing → selección/login por identidad | Parcial | Estructura de vistas y enlaces presentes (`apps/web/public/index.html`, `02_login_docente.html`, `03_login_mintrabajo.html`, `04_login_arl_sura.html`, `wire_links.js`); flujo completo no probado en ejecución. | Medio | N/A |
| 6.2 | Login y acceso por rol | Parcial | Login API retorna rol (`apps/api/src/index.ts:166-174`), front redirige según rol/entidad en `apps/web/public/index.html`; sin enforcement server-side. | Alto | N/A (depende de auth backend) |
| 6.3 | Acceso directo sin sesión / retorno | No verificado | No se evidenciaron guards de ruta del lado cliente/servidor verificables sin ejecución. | Medio | N/A |
| 6.4 | Cierre de sesión y back | No verificado | Requiere prueba de navegación/sesión. | Medio | N/A |
| 6.5 | Ruta inexistente (404 UI) | No verificado | App servida como estático (`apps/web/package.json:7`); comportamiento 404 no verificado. | Bajo | N/A |
| 6.6 | Flujo ARL → MinTrabajo condicionado | No verificado | Lógica de negocio/flujo no validada funcionalmente. | Medio | N/A |
| 6.7 | Recuperación de contraseña | No verificado | No se identificó flujo completo en revisión rápida; requiere verificación funcional. | Medio | N/A |
| 6.8 | Accesibilidad básica | No verificado | No se realizaron pruebas de teclado/foco/contraste. | Bajo | N/A |
| 6.9 | Consistencia visual y responsive | No verificado | Revisión visual no sistemática; mezcla de Tailwind CDN y estilos propios. | Bajo | N/A |
| 6.10 | Esquema de ramas documentado | Parcial (cumplido con entregable) | `docs/GIT_WORKFLOW.md` creado con estado real, flujo propuesto, convención, plantilla PR y comandos; no hay CI/protección versionada (`.github/` ausente). | Bajo | Entregable generado en esta fase |

## 5. Cambios aplicados

Commits de corrección crítica en `auditoria/fase-1` (no fusionados, sin push):

| Hash | Mensaje | Archivos | Motivo |
|---|---|---|---|
| `bbc2a9c` | `fix(config): sanear ejemplos y defaults de credenciales` | `.env.example`, `apps/api/.env.example`, `apps/api/drizzle.config.ts`, `apps/api/src/db/index.ts`, `apps/api/src/index.ts` | Eliminar valores/defaults sensibles y requerir configuración por entorno (`DATABASE_URL`, código docente) para reducir exposición/malas configuraciones. |
| `eac5b1f` | `fix(security): restringir CORS a orígenes permitidos` | `apps/api/src/index.ts` | Reemplazar CORS abierto (`origin: true` + credenciales) por lista blanca configurable y límites de métodos/cabeceras. |
| `4807421` | `fix(api): agregar manejo global de errores y 404` | `apps/api/src/index.ts` | Añadir respuesta 404 uniforme, middleware global de errores y handlers de proceso para evitar caídas/respuestas no controladas. |
| `d1fc021` | `fix(web): retirar datos simulados hardcoded en vistas` | `apps/web/public/05_docente_dashboard.html`, `apps/web/public/06_arl_sura_evaluacion.html`, `apps/web/public/07_mintrabajo_estudiante.html` | Remover métricas/registros/identidades simuladas, `Math.random` y logs de depuración en vistas servidas; mostrar estados vacíos donde no hay datos reales. |
| `833c68f` | `fix(web): retirar perfil de estudiante simulado en landing` | `apps/web/public/index.html` | Eliminar perfil de estudiante hardcodeado y hidratar desde sesión almacenada cuando exista. |
| `84cc590` | `fix(web): retirar empresas simuladas en auditoría de licencia` | `apps/web/public/07_mintrabajo_estudiante.html` | Retirar entidades simuladas restantes del selector y tabla de vinculación de licencia. |

Otros commits presentes en la rama respecto al historial previo (contexto): `7b7da62`, `0ce4234`, `03b7f1c` (no creados como parte de estos fixes críticos; revisar antes de fusionar).

## 6. Pendientes y backlog

| Prioridad | Hallazgo | Riesgo | Esfuerzo | Propuesta |
|---|---|---|---|---|
| Alta | Autenticación/autorización/RBAC y control de propiedad (IDOR) en todos los endpoints sensibles | Alto | L | Implementar JWT/sesión segura, middleware `auth`/`requireRole`, y verificación de propiedad por recurso (`apps/api/src/index.ts:49,283,319,330,401,425,505,550`); adaptar frontend a envío de credenciales/tokens y manejo 401/403. |
| Alta | Validación robusta de entradas y endurecimiento de API | Alto | M | Incorporar `zod` (o equivalente) por endpoint, esquemas de body/query/params, sanitización, `rate-limit` en login/registro y forma de error uniforme `{ code, message, details? }`. |
| Alta | Tailwind CDN en vistas servidas y estrategia de build frontend | Medio | M | Eliminar CDN (`apps/web/public/index.html:8`, `apps/web/public/08_registro_usuarios.html:9`), integrar Tailwind compilado/build reproducible y gestionar assets/local fonts según necesidad. |
| Media | Cierre ordenado de pool y manejo de señales/DB caída | Medio | S | Añadir `SIGTERM/SIGINT` con `pool.end()` y respuestas controladas ante indisponibilidad de BD; validar con pruebas. |
| Media | Calidad automatizada y configuración TypeScript | Medio | M | Agregar `tsconfig.json` en `apps/api`, scripts `lint/typecheck/test/build` en workspaces, y pipeline CI (`.github/workflows`) con checks mínimos. |

Hallazgos adicionales diferidos (rendimiento/UX/refactor): N+1/paginación real (`apps/api/src/index.ts:508-523`), transacciones atómicas (`:562-599`), cliente HTTP único y estados UI completos, revisión de enlaces/accesibilidad, índices/EXPLAIN, modularización de API, resolución de divergencia de `origin/Camila`.

## 7. Conclusiones técnicas

1. **Fortalezas verificadas:** monorepo con separación física `apps/api` y `apps/web` (`package.json:1-23`); uso de Drizzle ORM y esquema tipado con PK/unique/timestamps en varias tablas (`apps/api/src/db/schema.ts:15-27,30-50,63-78`); hash de contraseñas con bcrypt (`apps/api/src/index.ts:118-120,156`); migración versionada (`apps/api/drizzle/0000_rare_penance.sql`) y endpoint de salud (`apps/api/src/index.ts:39-46`).
2. **Limitaciones del prototipo:** implementación difiere del stack esperado (HTML estático servido con `serve`, sin React/Vite/src ni pipeline de build), API monolítica, ausencia de lint/typecheck/tests configurados (`apps/api/package.json:6-12`, `apps/web/package.json:6-9`), y verificación funcional limitada por falta de BD/ejecución.
3. **Estado de seguridad:** se corrigieron CORS permisivo con credenciales, defaults/ejemplos sensibles y se añadió manejo global básico de errores (`bbc2a9c`, `eac5b1f`, `4807421`). Persisten controles esenciales abiertos: autenticación/autorización/IDOR, validación robusta, rate limiting y hardening integral de endpoints (`apps/api/src/index.ts:49,330,401,505,550`).
4. **Trabajo futuro priorizado (top 5):** (1) Auth/RBAC/IDOR, (2) validación zod + rate limit + errores uniformes, (3) eliminar Tailwind CDN e incorporar build, (4) cierre ordenado de pool y resiliencia BD, (5) toolchain de calidad y CI.
5. **Alineación con prácticas de desarrollo seguro y ramas:** se reforzó revisión de configuración/secrets, restricciones CORS y manejo de errores; se documentó flujo de ramas/PR/commits en `docs/GIT_WORKFLOW.md`. Falta implementar controles de acceso y automatización de verificación en CI.
6. **Declaración de alcance:** esta auditoría fue asistida por un agente y **requiere revisión humana** de los hallazgos críticos y de los commits en `auditoria/fase-1` antes de fusionarlos.

## Anexos

### A. Comandos ejecutados (resumen, secretos ocultos)
- `git status --short` → rama `auditoria/fase-1`, `Plan_Auditoria.md` no rastreado durante el trabajo.
- `git branch -a`, `git log --oneline -n 20`, `git rev-parse HEAD` → baseline `5f01d38`, correcciones hasta `84cc590`.
- `git rev-list --left-right --count main...Natalia` → `0 2`; `main...despliegue` → `0 0`; `main...origin/Natalia` → `0 2`; `main...origin/Camila` → `4 0`.
- `git ls-files` / conteos → 52 archivos (html/ts/js/sql/json/md) rastreados en subconjunto consultado; 8 vistas en `apps/web/public/`.
- `git check-ignore -v .env .agents/mcp_config.json apps/api/.env` → ignorados por `.gitignore:3,5`.
- `git ls-files .env .agents/mcp_config.json 'apps/*/.env'` → vacío.
- `git log --all -- .env .agents/mcp_config.json 'apps/*/.env'` → vacío.
- `npm --prefix apps/api run build` → invocación `tsc` sin `tsconfig.json` (no verificable como build completo).
- `npm --prefix apps/web run build`, `npm run lint/typecheck` (root/api/web) → scripts ausentes.
- `node -v` → `v22.18.0`; `npm -v` → `10.9.3`.

### B. Tabla de endpoints (evidencia estática)

| Método | Ruta | Handler/ubicación | Guarda auth/rol | Observaciones |
|---|---|---|---|---|
| GET | `/health` | `apps/api/src/index.ts:39` | No | Estado de BD |
| GET | `/api/users` | `apps/api/src/index.ts:49` | No | Lista usuarios (datos sensibles potenciales) |
| POST | `/api/users/register` | `apps/api/src/index.ts:68` | No (código docente por entorno) | Crea usuario, hash bcrypt |
| POST | `/api/users/login` | `apps/api/src/index.ts:140` | No | Valida credenciales, sin emisión de token/sesión |
| GET | `/api/reports/certificate/pdf` | `apps/api/src/index.ts:188` | No | Genera PDF con parámetros de query |
| POST | `/api/cases/criteria` | `apps/api/src/index.ts:283` | No | Crea criterios de simulación |
| GET | `/api/cases/criteria` | `apps/api/src/index.ts:319` | No | Lista criterios |
| POST | `/api/submissions/upload` | `apps/api/src/index.ts:330` | No | Registra entrega/evaluación automática |
| GET | `/api/submissions` | `apps/api/src/index.ts:401` | No | Lista entregas, filtro por email en query |
| GET | `/api/evaluations/summary` | `apps/api/src/index.ts:425` | No | Resumen por email (query) |
| GET | `/api/students` | `apps/api/src/index.ts:505` | No | Lista estudiantes enriquecida |
| POST | `/api/evaluations/risk-classification` | `apps/api/src/index.ts:550` | No | Registra clasificación/evento/submission |

### C. Matriz endpoint × rol (esperado vs real)

| Endpoint | Docente | Estudiante | ARL/MinTrabajo (portal) | Real observado |
|---|---|---|---|---|
| `/api/users` GET | Esperado (gestión) | No esperado | No esperado | Accesible sin auth (`apps/api/src/index.ts:49`) |
| `/api/users/register` POST | Según política | Según política | No esperado | Accesible sin auth; código docente requerido solo para rol docente/admin (`:68-106`) |
| `/api/users/login` POST | Sí | Sí | Según diseño | Accesible sin auth (`:140`) |
| `/api/cases/criteria` POST/GET | Sí | Parcial (lectura) | No esperado | Sin auth (`:283,:319`) |
| `/api/submissions*`, `/api/evaluations/summary`, `/api/students` | Sí (supervisión) | Solo propios datos | No esperado | Sin auth ni verificación de propiedad (`:330,:401,:425,:505`) |
| `/api/evaluations/risk-classification` POST | No | Sí (propio) | Contexto portal | Sin auth ni verificación de propiedad (`:550`) |
| `/api/reports/certificate/pdf` GET | Sí | Sí (propio) | Según diseño | Sin auth, parámetros controlados por query (`:188`) |

### D. Tamaños de bundle
- **No verificado / no aplica:** `apps/web` es frontend estático servido con `serve public` (`apps/web/package.json:6-9`), sin pipeline Vite/build ni artefactos `dist/` en el repositorio. Se detecta carga de Tailwind por CDN en `apps/web/public/index.html:8` y `apps/web/public/08_registro_usuarios.html:9`.

### E. Resultados `EXPLAIN (ANALYZE, BUFFERS)`
- **No verificado:** base de datos no disponible/ejecución fuera de alcance en esta auditoría.

### F. Pruebas de códigos HTTP (API)
- **No verificado:** no se ejecutaron peticiones `curl`/humo (400/401/403/404/500, BD caída) por ausencia de entorno de ejecución controlado. Se añadió manejador 404 y middleware global de error en `apps/api/src/index.ts:624-639` como corrección preventiva.
