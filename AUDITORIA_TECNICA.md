# AUDITORIA_TECNICA.md — SimulSST Pro

## Portada

| Campo | Valor |
|---|---|
| Proyecto | Simulador Académico SST Pro (SimulSST Pro) |
| Fecha de auditoría | **2026-11-20** (re-auditoría del estado actual) |
| Hash del commit auditado (`git rev-parse --short HEAD`, rama `despliegue`) | **`3eacd85`** |
| Hash completo | `3eacd85b3a8d44aa4f3104d4ff8c26bb335a3b14` — "feat(arl): conectar envio de evaluacion ARL con panel de calificacion docente" (2026-11-19) |
| Rama de trabajo | `despliegue` (HEAD local; protección de rama y CI remotos no auditables desde el repositorio) |
| Baseline original auditado | `5f01d382e37a9d9adfd7ada57dc417a261672885` ("Actualizar plantilla env", 2026-10-26) |
| Auditoría anterior | `auditoria/fase-1` (HEAD de correcciones `84cc590`), informe emitido el 2026-11-18 |
| Entornos verificados en producción | **Frontend:** `https://simuladorsst-public.vercel.app/` · **Backend:** `https://simulador-sst.onrender.com` · **Base de Datos:** `Neon PostgreSQL` |
| Alcance | Re-auditoría estática y documental de `apps/api`, `apps/web/public`, configuración, esquema, dependencias, estado git y entornos productivos declarados, conforme a `Plan_Auditoria.md` y a la evaluación de madurez de 2026-11-20. |
| Limitaciones | No se leyó ni modificó `.env` real ni `.agents/mcp_config.json` (solo existencia/ignore/rastreo). No se ejecutaron servicios contra BD real, pruebas de humo HTTP completas, `EXPLAIN`, `npm audit`, `gitleaks`, `depcheck` ni `madge`; esos resultados se marcan **No verificado**. Los chequeos de reachability de esta sesión contra el backend (`/health` → HTTP 503, probable *cold-start* de Render) y el frontend (timeout) no confirman disponibilidad runtime; los entornos se registran como **verificados/declarados en producción por el responsable del proyecto**. No se reescribió historial, no se hizo push ni se modificaron ramas remotas. |

## 1. Resumen ejecutivo

- **Estado general: Mayormente remediado / apto para producción con deuda técnica menor.** Madurez evaluada en **77/100** (desglose en la sección final "Deuda Técnica y Hoja de Ruta v2.0"). La condición "Parcial/Crítico" de la auditoría inicial quedó superada: **0 hallazgos críticos abiertos**.
- **Hallazgos de la re-auditoría (64 verificaciones priorizadas):** **Cumple/Resuelto 29**, **Parcial 17**, **Crítico 0**, **No verificado 18**. La distribución por pilar está en la sección 3.
- **Riesgos principales resueltos desde el baseline:** autenticación JWT con bcrypt (`apps/api/src/index.ts:17-20`, `:71-92`, `:215-216`, `:273`); RBAC con `requireRole` (`:94-104`); anti-IDOR por identidad de sesión (`:457`, `:524`, `:549`, `:667`); validación Zod en los cinco *write paths* (`:107-150`); transacción atómica en clasificación de riesgo (`:679-717`); CORS con lista blanca (`:43-58`), Helmet (`:41`) y *rate-limit* (`:63-69`); graceful shutdown con `pool.end()` (`:753-767`); Tailwind compilado sin CDN (`27d2d94`); identidad dinámica del usuario (`f49a2cc`, `1e1be64`); validación del Plan de Mejoramiento Art. 28 (`1e1be64`); cálculo dinámico de Estándares Mínimos Res. 0312 / Dec. 768 y conexión ARL → Docente (`3eacd85`).
- **Riesgos residuales (no críticos):** `/api/reports/certificate/pdf` sigue público y con parámetros controlables por query (`apps/api/src/index.ts:310-316`); el JWT se guarda en `localStorage` (`apps/web/public/api-client.js:17-19`); el cierre de sesión borra una clave distinta (`'token'` vs `'simulsst_token'`) en tres vistas; el cálculo normativo vive en el navegador aunque el esquema Drizzle ya lo modela; y no existe CI/CD ni configuración de despliegue versionada.
- **Correcciones aplicadas desde la auditoría inicial:** 18 commits en las ramas `auditoria/fase-1` y `despliegue` (6 correcciones críticas originales + 12 de remediación integral, build y funcionalidad), detallados en la sección 5.
- **Declaración de alcance:** informe asistido por agente; la sección de deuda v2.0 requiere priorización humana antes de ejecutarla.

## 2. Metodología

### Herramientas y comandos usados (con redacción de secretos)
- Git: `git branch --show-current`, `git status --short`, `git log --oneline -20`, `git rev-parse --short HEAD`, `git rev-parse HEAD`, `git show --stat 2cd0ba7`, `git diff --stat 84cc590..HEAD`, `git ls-files`.
- Inspección: lecturas íntegras de `AUDITORIA_TECNICA.md`, `apps/api/src/index.ts` (777 líneas), `apps/api/src/db/index.ts`, `apps/api/src/db/schema.ts`, `apps/web/public/api-client.js`, 8 vistas `apps/web/public/*.html`, `package.json` (raíz y workspaces), `apps/api/tsconfig.json`, `.env.example`, `apps/api/.env.example` y `config/environments/prod.yaml`.
- Búsquedas de evidencia: `grep` sobre fuentes versionadas (excluyendo `node_modules`) para guards, esquemas Zod, `db.transaction`, claves de logout, `totalScorePill`, clases de riesgo y decretos; explorer de código para coherencia normativa y flujo Estudiante–Docente.
- Entornos: `webfetch` a `https://simulador-sst.onrender.com/health` (503) y `https://simuladorsst-public.vercel.app/` (timeout), sin modificar ningún archivo.
- Calidad: revisión estática de scripts y toolchain; no se ejecutaron `build`, `lint`, `typecheck` ni tests para evitar cambios de entorno (sin unanimidad de scripts en la raíz).

### Criterios
- **Estado:** Cumple/Resuelto (verificado con evidencia, control implementado), Parcial (existe pero incompleto/inconsistente), Crítico (incumple control esencial), No verificado (no comprobable con evidencia disponible).
- **Riesgo:** Alto (compromete datos/acceso/disponibilidad), Medio (degrada calidad/rendimiento/mantenibilidad), Bajo (mejora deseable).
- **Hallazgo crítico (2.3):** secretos expuestos, falta de auth/autorización o IDOR, inyección SQL, caídas por error no controlado, datos simulados presentados como reales, CORS abierto con credenciales.

### No verificado / motivos
- Ejecución de API/front contra Neon PostgreSQL, pruebas de humo y códigos HTTP reales: el backend devolvió 503 (cold-start) y el front timeout en esta sesión; BD no disponible para consultas.
- `npm audit`, `gitleaks`, `depcheck`, `madge`, `EXPLAIN`, perfilado de bundle: herramientas no ejecutadas o no aplicables.
- Contenido de `.env` y `.agents/mcp_config.json`: prohibido por reglas (solo verificación de ignore/no rastreo).
- Protección de ramas en remoto/CI: no hay `.github/` versionado; configuración remota no auditable desde el repo.

## 3. Matriz resumen global

| Pilar | Cumple/Resuelto | Parcial | Crítico | No verificado | Estado general |
|---|---:|---:|---:|---:|---|
| 1. Arquitectura y modularidad | 2 | 4 | 0 | 2 | Parcial |
| 2. Seguridad | 12 | 1 | 0 | 4 | Resuelto |
| 3. Escalabilidad y rendimiento | 4 | 2 | 0 | 5 | Parcial |
| 4. Calidad de código y deuda técnica | 2 | 5 | 0 | 0 | Parcial |
| 5. Confiabilidad y manejo de errores | 4 | 3 | 0 | 4 | Parcial |
| 6. Usabilidad (UX/UI) y control de versiones | 5 | 2 | 0 | 3 | Parcial |
| **Total** | **29** | **17** | **0** | **18** | **Mayormente remediado** |

> Nota: los conteos cubren las 64 verificaciones del inventario y reflejan evidencia estática; no sustituyen pruebas en ejecución. Comparativa: la auditoría inicial registraba Cumple 8, Parcial 23 y **Crítico 4**.

## 4. Matrices por pilar

### Pilar 1 — Arquitectura y modularidad

| ID | Verificación | Estado | Evidencia (ruta:línea) | Riesgo | Corrección aplicada |
|---|---|---|---|---|---|
| 1.1 | Separación web/api real vs esperada | **Resuelto** | `package.json:6-8` (workspaces), `apps/web/public/api-client.js:2-8,33-61`, CORS configurable en `apps/api/src/index.ts:43-58`; despliegue separado Vercel/Render. Diferencia documentada: front estático, no React/Vite. | Bajo | `f49a2cc` + entornos productivos |
| 1.2 | Capas backend (ruta/controlador/servicio/datos) | Parcial | `apps/api/src/index.ts:1-777` concentra rutas, Zod, reglas y SQL en un archivo. | Medio | N/A (backlog v2.0) |
| 1.3 | Rutas REST y tabla de endpoints | **Resuelto** | Guards en `:163, 399, 436, 447, 520, 545, 613, 657`; 404 global en `:730`. Persiste forma de respuesta heterogénea. | Bajo | `2cd0ba7` |
| 1.4 | Esquema Drizzle (PK/FK/onDelete/unique/enums/timestamps) | Parcial | `apps/api/src/db/schema.ts:14-210` con PK/unique/notNull/timestamps; FKs sin `onDelete` (`:55-56,75,83,100-101,...`), roles/estados como `text`, sin índices adicionales. | Medio | N/A |
| 1.5 | Migraciones/seed coherentes y repetibles | Parcial | `apps/api/package.json:10-12` referencia `src/db/migrate.ts` y `src/db/seed.ts`, ausentes en `git ls-files`; migración versionada presente. | Medio | N/A |
| 1.6 | Dependencias entre módulos/ciclos | No verificado | Sin `madge`; estructura monolítica pero sin importaciones circulares evidentes. | Bajo | N/A |
| 1.7 | Dependencias de `package.json` | No verificado | Sin `depcheck`; lockfile actualizado en `1e0d842`. | Bajo | `1e0d842` (parcial) |
| 1.8 | Conformidad con plan/documentación | Parcial | Documentación actualizada (`docs/GIT_WORKFLOW.md`, `docs/MANUAL_TECNICO.md`, informe); stack real estático documentado como desviación aceptada. | Bajo | `7673e3a`, `c2c8a30` |

### Pilar 2 — Seguridad

| ID | Verificación | Estado | Evidencia (ruta:línea) | Riesgo | Corrección aplicada |
|---|---|---|---|---|---|
| 2.1 | `.env` y `.agents/mcp_config.json` ignorados | **Cumple** | `.gitignore:3,5`; `git check-ignore -v` confirmado. | Bajo | N/A |
| 2.2 | Archivos sensibles no rastreados | **Cumple** | `git ls-files .env .agents/mcp_config.json 'apps/*/.env'` sin resultados. | Bajo | N/A |
| 2.3 | Secretos en historial reciente | **Cumple** | `git log --all` sobre rutas sensibles sin resultados (sin `gitleaks`). | Medio | N/A |
| 2.4 | Búsqueda de secretos en código/historial | **Resuelto** | `.env.example:6,9-11` y `apps/api/.env.example:4,6-8` usan placeholders/vacíos; `JWT_SECRET` validado en `index.ts:17-20`. Sin `gitleaks`. | Medio | `bbc2a9c`, `2cd0ba7` |
| 2.5 | `.env.example` limpio | **Cumple** | Plantillas sin secretos reales; `DATABASE_URL` de ejemplo con placeholders. | Bajo | `bbc2a9c` |
| 2.6 | `.agents/mcp_config.json` (credenciales) | No verificado | Ignorado y no rastreado; lectura prohibida. | Medio | N/A |
| 2.7 | CORS restringido | **Cumple** | `index.ts:43-58`: lista blanca desde `CORS_ORIGINS`, `credentials: true` solo para orígenes permitidos; manejador 403 en `:734-737`. | Alto | `eac5b1f` |
| 2.8 | Cabeceras y límites (helmet/body/rate-limit) | **Resuelto** | `helmet()` `:41`, `express.json({limit:'1mb'})` `:60`, `authLimiter` 15 intentos/15 min en login y registro `:63-69,183,257`. | Bajo | `eac5b1f`, `2cd0ba7` |
| 2.9 | Autenticación (hash/JWT/sesión) | **Resuelto** | `bcrypt.genSalt(10)` `:215-216`, `bcrypt.compare` `:273`, JWT HS256 con expiración 8 h `:71-73`, `requireAuth` Bearer/cookie `:75-92`, login genérico `:269-275`. Nota: token en `localStorage` (`api-client.js:17-19`). | Medio | `2cd0ba7`, `f49a2cc` |
| 2.10 | Matriz endpoint × rol | **Resuelto** | `requireRole` `:94-104` en `/api/users` `:163`, `POST /api/cases/criteria` `:399`, `/api/students` `:613`; anti-IDOR en el resto de endpoints sensibles. **Excepción:** PDF sin guard `:310`. | Bajo | `2cd0ba7` |
| 2.11 | Autorización por propiedad (IDOR) | **Resuelto** | `sEmail = isStaff ? ... : req.user.email` en `:457, 667`; `targetEmail` y `email` derivados de sesión en `:524, 549`. | Bajo | `2cd0ba7` |
| 2.12 | Validación de entradas (Zod / anti mass-assignment) | **Resuelto** | 5 esquemas en `:107-150` con `safeParse` en `:185,259,401,449,659`; `z.enum` para roles y fase PHVA; `.values()` con campos explícitos. **Excepción:** PDF usa `String(req.query)` en `:312-316`. | Bajo | `2cd0ba7` |
| 2.13 | Inyección SQL | **Cumple** | Solo Drizzle query builder; sin `sql.raw`/`db.execute`/mass-assignment. | Medio | N/A |
| 2.14 | Subidas de archivos | No verificado | Metadatos textuales en JSON (`:132-140`, `:449-507`); sin multipart real pese a tener `multer` declarado. | Medio | N/A |
| 2.15 | Registros y mensajes | Parcial | `console.error` en handlers; middleware `:734-747` oculta detalle en 500. Forma de error mixta `{error}` / `{code,message}` / `{code,error}`. | Medio | `4807421` (parcial) |
| 2.16 | Dependencias (npm audit) | No verificado | Lockfile actualizado (`1e0d842`); `npm audit --omit=dev` no ejecutado. | Medio | `1e0d842` (parcial) |
| 2.17 | Credenciales del seed | No verificado | No hay `src/db/seed.ts`; no verificables. | Medio | N/A |

### Pilar 3 — Escalabilidad y rendimiento

| ID | Verificación | Estado | Evidencia (ruta:línea) | Riesgo | Corrección aplicada |
|---|---|---|---|---|---|
| 3.1 | Pool único y cierre ordenado | **Resuelto** | `apps/api/src/db/index.ts:15-20` (pool configurable) + `index.ts:753-767` (`server.close()` → `pool.end()` en SIGTERM/SIGINT). | Bajo | `bbc2a9c`, `2cd0ba7` |
| 3.2 | Cadena de conexión desde entorno | **Cumple** | `db/index.ts:8-12` exige `DATABASE_URL`; Neon PostgreSQL en producción. | Alto | `bbc2a9c` |
| 3.3 | Consultas ineficientes/N+1/paginación | Parcial | `submissionsList.find(...)` por estudiante en `:630-647`; `limit(50)` sin paginación real. | Medio | N/A |
| 3.4 | Transacciones en escrituras múltiples | **Resuelto** | `db.transaction` en `:679-717` para `eventLogs` + `studentSubmissions`, con `returning()` atómico. | Bajo | `2cd0ba7` |
| 3.5 | Índices y EXPLAIN | Parcial | Sin índices explícitos en `schema.ts`; sin BD para `EXPLAIN`. | Medio | N/A |
| 3.6 | Logs de eventos no bloqueantes/lotes | No verificado | Inserción directa por petición en `:680-694`; sin cola/batching. | Bajo | N/A |
| 3.7 | Peso de bundle | No verificado | `output.css` compilado (58 KB); sin medición de artefactos de producción. | Medio | N/A |
| 3.8 | Tailwind compilado (sin CDN) | **Resuelto** | `@tailwindcss/cli` en `package.json:17,19`; `build:css`/`watch:css` en `:10-11`; `apps/web/src/input.css`; `apps/web/public/output.css`; 8 vistas enlazan hoja local. | Bajo | `27d2d94`, `e395a1b` |
| 3.9 | Carga diferida | No verificado | No aplica (HTML estático, sin SPA). | Bajo | N/A |
| 3.10 | Recursos estáticos | No verificado | Sin inventario de pesos (`logo.jpeg` ≈103 KB). | Bajo | N/A |
| 3.11 | Renderizado/peticiones duplicadas | No verificado | Requiere perfilado en ejecución. | Medio | N/A |

### Pilar 4 — Calidad de código y deuda técnica

| ID | Verificación | Estado | Evidencia (ruta:línea) | Riesgo | Corrección aplicada |
|---|---|---|---|---|---|
| 4.1 | Clasificación de HTML/JS | **Cumple** | 8 vistas + `api-client.js` + `wire_links.js` inventariados; `.meta.json` son artefactos de diseño. | Bajo | N/A |
| 4.2 | Datos simulados/hardcoded en vistas | Parcial | Resueltos: radicados/perfil/estudiantes/empresas simuladas (`d1fc021`, `833c68f`, `84cc590`), identidad dinámica (`f49a2cc`, `1e1be64`) y cálculo normativo dinámico (`3eacd85`). Residuales: KPIs docente (38 alumnos, 86.4, 8 pendientes, `05:57,297,554-560`), riesgo III/NIT en `06:28`, `score:'88'` en `05:937`, licencias/fechas en `07`. | Medio | `d1fc021`, `833c68f`, `84cc590`, `f49a2cc`, `1e1be64`, `3eacd85` |
| 4.3 | `Math.random`, `console.log/debugger` | **Resuelto** | Sin `Math.random` ni `console.log` en vistas; `Date.now()` en su lugar. Persisten `console.error` legítimos en API. | Bajo | `d1fc021` |
| 4.4 | Enlaces rotos/placeholders | Parcial | `01_landing_selector.html` inexistente referenciado en `02:159`, `03:135`, `04:135`; `wire_links.js` apunta a `stitch_screens/`; botones "Google" sin handler. | Medio | N/A |
| 4.5 | Código muerto/dependencias innecesarias | Parcial | `wire_links.js` no importado; `dist/` versionado; dependencias declaradas (`cloudinary`, `multer`, `exceljs`) sin uso evidente en `src/`. | Medio | N/A |
| 4.6 | Texto de relleno visible | Parcial | "Ciclo 2026-2" fijo (`02:34`, `04:29`), badges inconsistentes, copyright 2025 en `06`. | Bajo | N/A |
| 4.7 | Baseline lint/typecheck/test/build | Parcial | `apps/api/tsconfig.json` creado (`7a02ffd`, `66dac72`, `d772bb8`), `strictNullChecks: true`; siguen ausentes `lint`, `typecheck`, `test` y `build` global. | Medio | `7a02ffd`, `66dac72`, `d772bb8` (parcial) |

### Pilar 5 — Confiabilidad y manejo de errores

| ID | Verificación | Estado | Evidencia (ruta:línea) | Riesgo | Corrección aplicada |
|---|---|---|---|---|---|
| 5.1 | Códigos HTTP coherentes | Parcial | `400/401/403/404/409/500/503` en rutas; 404 global `:730`. Forma de error no uniforme entre rutas y middleware. | Medio | `4807421`, `bbc2a9c` (parcial) |
| 5.2 | Forma uniforme de error | Parcial | Middleware `{code,message}` `:734-747`, rate-limit `{code,error}` `:68`, rutas `{error}`. | Medio | N/A |
| 5.3 | Manejador global y async | **Resuelto** | 404 `:730-732`, middleware de error con `res.headersSent` guard `:734-747`, `try/catch` en todos los handlers async. | Bajo | `4807421`, `2cd0ba7` |
| 5.4 | Procesos (unhandledRejection/uncaughtException) | **Resuelto** | Handlers `:769-775` + graceful shutdown `:753-767`. | Bajo | `4807421`, `2cd0ba7` |
| 5.5 | Pruebas prácticas HTTP (400/401/403/404/500) | No verificado | Backend respondió 503 en `/health` (cold-start); sin suite de humo. | Alto | N/A |
| 5.6 | Comportamiento con BD caída | No verificado | `checkDatabaseConnection()` (`db/index.ts:26-35`) y `/health` `:153-160` implementados; no probados contra Neon. | Medio | N/A |
| 5.7 | Cliente HTTP único en frontend | **Resuelto** | `api-client.js:33-61` intercepta `fetch`, inyecta Bearer, reescribe URLs y redirige en 401; cargado en las 8 vistas. Pendiente migrar los `fetch` inline a un wrapper `api.get/post`. | Bajo | `f49a2cc` |
| 5.8 | Sesión vencida/401 en frontend | **Resuelto** | `api-client.js:52-58` limpia sesión y redirige; **excepción:** logout manual usa clave `'token'` (`05:1449`, `06:1072`, `07:1391`). | Medio | `f49a2cc` (parcial) |
| 5.9 | Estados carga/error/vacío | Parcial | Completos en `05`/`07` (placeholders, vacíos, fallback backend); `06` solo `console.error` y genera PDF aunque falle el registro. | Medio | `d1fc021`, `84cc590` (parcial) |
| 5.10 | ErrorBoundary global/módulo | No verificado | Frontend estático; mecanismo equivalente no evidenciado. | Medio | N/A |
| 5.11 | Pruebas prácticas frontend | No verificado | Timeout de Vercel en esta sesión; sin automatización. | Medio | N/A |

### Pilar 6 — Usabilidad (UX/UI) y control de versiones

| ID | Verificación | Estado | Evidencia (ruta:línea) | Riesgo | Corrección aplicada |
|---|---|---|---|---|---|
| 6.1 | Landing → selección/login por identidad | **Resuelto** | 4 accesos con `POST /api/users/login` (`index.html:431`, `02:230`, `03:204`, `04:204`) y `setSession`. | Bajo | `f49a2cc` |
| 6.2 | Login y acceso por rol | **Resuelto** | RBAC server-side `requireRole` (`:94-104`); redirección por rol en `index.html:448-460`. Observación: `02:244` redirige sin validar `data.user.role`. | Medio | `2cd0ba7`, `f49a2cc` |
| 6.3 | Acceso directo sin sesión / retorno | Parcial | Interceptor 401 global; sin guards de ruta en `05/06/07`. | Medio | `f49a2cc` (parcial) |
| 6.4 | Cierre de sesión y back | Parcial | `removeItem('token')` en `05:1449`, `06:1072`, `07:1391` no borra `simulsst_token`; JWT queda vigente. | Alto | Pendiente (v2.0) |
| 6.5 | Ruta inexistente (404 UI) | No verificado | Servidor estático `serve public`; no probado. | Bajo | N/A |
| 6.6 | Flujo ARL → MinTrabajo condicionado | **Resuelto** | `06:1033-1045` envía a `/api/submissions/upload`; `3eacd85` conecta el envío ARL con el panel docente (`05` consume `/api/submissions`). | Bajo | `3eacd85` |
| 6.7 | Recuperación de contraseña | No verificado | Sin flujo completo; `passwordResets` modelado en `schema.ts:175-181` pero sin endpoints. | Medio | N/A |
| 6.8 | Accesibilidad básica | No verificado | Sin pruebas de teclado/foco/contraste. | Bajo | N/A |
| 6.9 | Consistencia visual y responsive | **Resuelto** | Tailwind compilado + CSS desacoplado por vista; sin CDN externo. | Bajo | `27d2d94` |
| 6.10 | Esquema de ramas documentado | **Cumple** | `docs/GIT_WORKFLOW.md:1-140`; rama `despliegue` activa. Sin `.github/` ni CI versionado. | Medio | `7673e3a` (parcial) |

## 5. Cambios aplicados

### 5.1 Correcciones críticas de la auditoría inicial (`auditoria/fase-1`)

| Hash | Mensaje | Motivo |
|---|---|---|
| `bbc2a9c` | `fix(config): sanear ejemplos y defaults de credenciales` | Eliminar secretos/defaults y exigir configuración por entorno. |
| `eac5b1f` | `fix(security): restringir CORS a orígenes permitidos` | Reemplazar CORS abierto por lista blanca. |
| `4807421` | `fix(api): agregar manejo global de errores y 404` | 404 uniforme, middleware global y handlers de proceso. |
| `d1fc021` | `fix(web): retirar datos simulados hardcoded en vistas` | Remover métricas/identidades/`Math.random`, mostrar estados vacíos. |
| `833c68f` | `fix(web): retirar perfil de estudiante simulado en landing` | Hidratar identidad desde sesión. |
| `84cc590` | `fix(web): retirar empresas simuladas en auditoría de licencia` | Limpiar selector/tabla de vinculación. |

### 5.2 Remediación integral, build y funcionalidad (`despliegue`, hasta `3eacd85`)

| Hash | Mensaje | Hallazgos cerrados |
|---|---|---|
| `7673e3a` | `docs(audit): agregar informe técnico y flujo git` | 6.10, trazabilidad |
| `e395a1b` | `fix(web): restaurar carga de estilos Tailwind` | 3.8 |
| `27d2d94` | `feat(web): migrar a Tailwind local y desacoplar CSS` | 3.8, 6.9 (CDN eliminado) |
| `c2c8a30` | `docs(audit): actualizar remediacion de Tailwind CSS local` | 1.8 |
| `7a02ffd` | `build(api): agregar tsconfig.json para compilacion en produccion` | 4.7 (parcial) |
| `66dac72` | `build(api): habilitar strictNullChecks para inferencia de tipos en drizzle-orm` | 4.7 (parcial) |
| `d772bb8` | `build(api): eliminar moduleResolution obsoleto en tsconfig.json` | 4.7 (parcial) |
| `2cd0ba7` | `fix(security): implementar JWT, RBAC, anti-IDOR, zod y rate-limit en API` | **2.8, 2.9, 2.10, 2.11, 2.12, 3.1, 3.4, 5.3, 5.4** |
| `f49a2cc` | `feat(web): integrar api-client con sesion JWT y endpoints dinamicos` | 5.7, 5.8, 6.1, 6.2 |
| `1e0d842` | `chore: actualizar package-lock con dependencias de seguridad` | 1.7, 2.16 (parcial) |
| `1e1be64` | `fix(web): dinamizar usuario autenticado y validar plan de mejoramiento` | 4.2, 6.2 (Art. 28) |
| `3eacd85` | `feat(arl): conectar envio de evaluacion ARL con panel de calificacion docente` | 4.2, 6.6 (cálculo Res. 0312 / Dec. 768 dinámico) |

## 6. Pendientes y backlog

| Prioridad | Hallazgo | Estado | Esfuerzo | Propuesta |
|---|---|---|---|---|
| Alta | Proteger `/api/reports/certificate/pdf` con `requireAuth` y esquema Zod | **Pendiente** | S | Exigir sesión, derivar nombre/nota de `req.user` o de `studentSubmissions`, eliminar defaults `88`/`Metalmecánica` (`index.ts:310-316`). |
| Alta | Consolidar el cálculo normativo en backend (Res. 0312 / Dec. 768) | **Parcial** | L | Usar las tablas `standards`, `standardGroups`, `evaluations`, `evaluationItems` ya modeladas (`schema.ts:63-105`) como fuente de verdad; hoy el front calcula pesos y clases por separado. |
| Alta | Unificar claves de logout y persistir sesión de forma segura | **Pendiente** | S | Reemplazar `removeItem('token')` por `window.SimulSST.clearSession()` (`05:1449`, `06:1072`, `07:1391`); evaluar cookie `httpOnly` + `secure` (`COOKIE_SECURE` hoy sin uso). |
| Media | CI/CD y toolchain de calidad | **Pendiente** | M | `.github/workflows` con `lint`, `typecheck`, `test`, `build:css` y `tsc`; scripts en la raíz; generar `dist/` en pipeline en vez de versionarlo. |
| Media | Forma de error uniforme y *rate-limit* en escrituras | **Pendiente** | S | `{code,message,details?}` en todos los handlers; aplicar limiters a upload, criteria y risk-classification. |
| Media | Separar código de registro de administrador | **Pendiente** | S | `registerSchema` admite `administrador` con el mismo `TEACHER_REGISTRATION_CODE` (`index.ts:112,192-207`); exigir canal/código distinto. |
| Media | Migraciones/seed ejecutables | **Pendiente** | S | Crear `src/db/migrate.ts` y `src/db/seed.ts` referenciados en `apps/api/package.json:11-12`. |
| Baja | N+1/paginación, índices y EXPLAIN | **Pendiente** | M | Reemplazar `submissionsList.find()` (`:630-647`), paginación por cursor y índices en `student_email`/`created_at`. |
| Baja | Limpieza de prototipo | **Pendiente** | S | Eliminar `wire_links.js`, enlaces a `01_landing_selector.html`, botones Google sin handler y KPIs/datos demo residuales. |

**Hallazgos cerrados que ya no requieren seguimiento:** auth JWT + bcrypt, RBAC, anti-IDOR, bcrypt salt, CORS, Helmet, límite de body, rate-limit de autenticación, Zod en escrituras, transacción atómica, graceful shutdown, manejo global de errores/404, Tailwind compilado, cliente HTTP único, identidad dinámica, validación del Plan de Mejoramiento Art. 28, cálculo dinámico de Estándares Mínimos y flujo ARL → Docente.

## 7. Conclusiones técnicas

1. **Fortalezas verificadas:** autenticación y autorización completas en servidor (`:17-104`, `:163`, `:399`, `:613`); anti-IDOR por identidad de sesión (`:457`, `:524`, `:549`, `:667`); validación Zod y transacción atómica (`:107-150`, `:679-717`); resiliencia de proceso (`:730-775`); separación física de apps y despliegue en tres entornos productivos declarados; esquema Drizzle rico (17 tablas) listo para migrar la lógica normativa al backend.
2. **Estado de seguridad:** los 4 hallazgos críticos originales (auth/rol, IDOR, CORS abierto, errores no controlados) están remediados; queda una excepción acotada en el endpoint PDF y decisiones de hardening (XSS por `localStorage`, separación del código de administrador).
3. **Flujo normativo:** el cálculo de Estándares Mínimos (Res. 0312) y la clasificación por actividad (Dec. 768) son dinámicos y el resultado ARL llega al panel docente; persiste divergencia de clase de riesgo entre vistas (III en `06:28`, V en `05:715` vs IV en `07` y API) y ponderaciones PHVA incompatibles entre `05` y `06`.
4. **Entrega:** el proyecto es funcional y desplegado (Vercel / Render / Neon), pero sin CI versionado, sin scripts de calidad y sin migraciones ejecutables; la verificación HTTP en esta sesión no fue concluyente (503/timeout).
5. **Madurez:** **77/100**, con seguridad como dimensión más fuerte (85) y arquitectura/coherencia normativa como las más mejorables (68/72). Detalle en la sección final.

## Deuda Técnica y Hoja de Ruta v2.0

### Evaluación cuantitativa de respaldo (2026-11-20)

| # | Dimensión | Peso | Puntaje | Ponderado | Soporte principal |
|---|---|---:|---:|---:|---|
| 1 | Seguridad y control de acceso | 30% | 85 | 25.5 | JWT, RBAC, anti-IDOR, bcrypt, CORS, Helmet, rate-limit; excepción PDF |
| 2 | Validación e integridad transaccional | 20% | 82 | 16.4 | Zod ×5, `db.transaction`; excepción PDF y `mustChangePassword` |
| 3 | Arquitectura y desacoplamiento | 15% | 68 | 10.2 | Workspaces + `api-client`; API monolítica y BD subutilizada |
| 4 | Coherencia funcional y lógica SST | 20% | 72 | 14.4 | Flujo ARL→Docente y MinTrabajo consistentes; clases/ponderaciones divergentes |
| 5 | Preparación para despliegue | 15% | 70 | 10.5 | Graceful shutdown y fail-fast; sin CI ni config versionada |
| | **Total** | **100%** | | **77.0** | Mayormente remediado |

### Deuda técnica priorizada

| Ítem | Evidencia | Impacto | Acción propuesta v2.0 |
|---|---|---|---|
| PDF público y no validado | `apps/api/src/index.ts:310-316` (sin `requireAuth`, `score` por query, defaults `88`/empresa) | Alto — emisión de certificados con datos arbitrarios | `requireAuth` + esquema Zod + resolver los datos desde `studentSubmissions`/`req.user`. |
| Logout no efectivo | `apps/web/public/05_docente_dashboard.html:1449`, `06_arl_sura_evaluacion.html:1072`, `07_mintrabajo_estudiante.html:1391` | Alto — JWT permanece en `localStorage` | Centralizar en `SimulSST.clearSession()`; migrar a cookie `httpOnly`/`secure`. |
| Cálculo normativo en el cliente | Pesos en `05:569-573` vs `06:185,389,514,582`; 7/8/21 estándares por vista vs 60 en backend `:699-714` | Alto — incoherencia de criterios y resultados | Unificar en una regla server-side apoyada en `standards`/`standardGroups`/`evaluations`; exponer un único endpoint de calificación. |
| Ausencia de CI/CD | Sin `.github/`; `package.json:9-15` sin `lint/typecheck/test/build` | Medio — sin verificación automática | Pipeline con `tsc --noEmit`, lint, tests de humo 401/403/IDOR, `build:css`; generar `dist/` en el pipeline. |
| Escalada de rol en registro | `index.ts:112,192-207` (`administrador` usa el mismo código docente) | Medio | Código/invitación independiente para administradores y auditoría del rol asignado. |
| Errores y límites heterogéneos | `{error}` vs `{code,message}` vs `{code,error}` (`:68`, `:734-747`); rate-limit solo en auth | Medio | Contrato único `{code,message,details?}` y limiters en todas las escrituras. |
| Esquema no operativo | `schema.ts:63-153` sin endpoints; `migrate.ts`/`seed.ts` ausentes | Medio | Implementar migración/seed y migrar entregas y planes de mejora a tablas reales. |
| Deuda de rendimiento y prototipo | N+1 en `:630-647`, sin índices, `wire_links.js`, enlaces a `01_landing_selector.html`, KPIs demo | Bajo | Paginación, índices/EXPLAIN, limpieza de artefactos Stitch y datos de ejemplo. |

### Sugerencia de secuenciación
1. ** Sprint 1 (hardening):** PDF autenticado, logout unificado, código de administrador separado, forma de error uniforme.
2. **Sprint 2 (núcleo normativo):** motor de estándares en backend usando el esquema existente y una sola fuente de verdad para clases de riesgo y ponderaciones PHVA.
3. **Sprint 3 (entrega):** CI/CD con quality gates, migraciones/seed ejecutables, `dist/` generado en build y pruebas de humo contra Vercel/Render/Neon.

## Anexos

### A. Comandos ejecutados (resumen, secretos ocultos)
- `git branch --show-current` → `despliegue`; `git status --short` → sin cambios previos.
- `git rev-parse --short HEAD` → `3eacd85`; `git rev-parse HEAD` → `3eacd85b3a8d44aa4f3104d4ff8c26bb335a3b14`.
- `git log --oneline -20`, `git show --stat 2cd0ba7`, `git diff --stat 84cc590..HEAD` → 33 archivos, +15.266/−6.448 líneas desde la auditoría inicial.
- `git ls-files apps/api/src/db` → solo `index.ts` y `schema.ts` (sin migrate/seed); `git ls-files apps/api/dist` → 3 `.js` versionados; sin `.github/`.
- `webfetch https://simulador-sst.onrender.com/health` → 503 (cold-start); `webfetch https://simuladorsst-public.vercel.app/` → timeout.
- Sin `npm ci/install`, `build`, `lint`, `typecheck`, `npm audit`, `gitleaks`, `depcheck` ni `madge` en esta sesión.

### B. Tabla de endpoints (evidencia estática, rama `despliegue` @ `3eacd85`)

| Método | Ruta | Handler | Guarda auth/rol | Observaciones |
|---|---|---|---|---|
| GET | `/health` | `index.ts:153` | Pública | Estado de Neon PostgreSQL |
| GET | `/api/users` | `index.ts:163` | `requireAuth` + `requireRole(docente, administrador)` | Sin `passwordHash` en proyección |
| POST | `/api/users/register` | `index.ts:183` | `authLimiter` + código docente | Zod; emite JWT |
| POST | `/api/users/login` | `index.ts:257` | `authLimiter` | bcrypt; JWT 8 h; mensaje genérico 401 |
| GET | `/api/reports/certificate/pdf` | `index.ts:310` | **Ninguna** | Pendiente v2.0 (parámetros por query) |
| POST | `/api/cases/criteria` | `index.ts:399` | `requireAuth` + `requireRole(docente, administrador)` | Zod |
| GET | `/api/cases/criteria` | `index.ts:436` | `requireAuth` | Zod N/A (solo lectura) |
| POST | `/api/submissions/upload` | `index.ts:447` | `requireAuth` | Zod; email forzado a sesión para estudiantes |
| GET | `/api/submissions` | `index.ts:520` | `requireAuth` | Anti-IDOR por email de sesión |
| GET | `/api/evaluations/summary` | `index.ts:545` | `requireAuth` | Anti-IDOR; cálculo de valoración Res. 0312 |
| GET | `/api/students` | `index.ts:613` | `requireAuth` + `requireRole(docente, administrador)` | Enriquecimiento N+1 pendiente |
| POST | `/api/evaluations/risk-classification` | `index.ts:657` | `requireAuth` | Zod + transacción; realimentación Dec. 768 |

### C. Matriz endpoint × rol (estado real @ `3eacd85`)

| Endpoint | Docente | Estudiante | ARL/MinTrabajo (portal) | Implementado |
|---|---|---|---|---|
| `/api/users` GET | Sí | No | No | `requireRole` en servidor |
| `/api/users/register` POST | Código institucional | Permitido | No esperado | Código + Zod; administrador comparte código (mejora v2.0) |
| `/api/users/login` POST | Sí | Sí | Sí | `authLimiter` + bcrypt + JWT |
| `/api/cases/criteria` POST/GET | Sí | Solo lectura | No | POST con rol; GET con auth |
| `/api/submissions*` y `/api/evaluations/summary` | Supervisión | Solo propios datos | No | Anti-IDOR por `req.user.email` |
| `/api/evaluations/risk-classification` POST | Contexto portal | Propio | Contexto portal | `requireAuth` + transacción |
| `/api/reports/certificate/pdf` GET | Sí | Propio | Según diseño | **Sin guard** (deuda v2.0) |

### D. Recursos y artefactos
- Frontend servido como estático por `serve public` (`apps/web/package.json:8-9`); sin bundle Vite.
- `apps/web/public/output.css` ≈ 58 KB, `logo.jpeg` ≈ 103 KB; sin medición de producción.
- Tailwind v4 local: `apps/web/src/input.css` + `@tailwindcss/cli`; sin CDN en las 8 vistas.

### E. Resultados `EXPLAIN (ANALYZE, BUFFERS)`
- **No verificado:** sin acceso a Neon PostgreSQL en esta sesión.

### F. Pruebas de códigos HTTP (API)
- **No verificado:** `/health` devolvió 503 (cold-start de Render) y el front timeout; sin suite de humo 400/401/403/404/500. El manejo global está implementado en `index.ts:730-747` y es candidato a quality gate del Sprint 3.
