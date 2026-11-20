# MANUAL_TECNICO.md — SimulSST Pro

Secciones 6, 7 y 8 del informe técnico del proyecto. Las rutas de imágenes de la sección 7 son referencias sugeridas: deben reemplazarse por las capturas reales tomadas desde el entorno desplegado.

## 6. Manual Técnico de Instalación, Configuración y Operación

### 6.1. Requisitos Previos del Entorno

| Requisito | Versión recomendada | Uso principal |
|---|---|---|
| Node.js | v18.0 o superior | Ejecución de la API y herramientas de build |
| npm | v9 o superior | Gestión de dependencias del monorepo |
| PostgreSQL | v14 o superior | Persistencia local o instancia cloud en Neon |
| Git | Versión estable | Control de versiones y trabajo con la rama `despliegue` |
| Cuentas de despliegue | Vercel, Render y Neon | Publicación del frontend, la API y la base de datos |

### 6.2. Estructura del Repositorio (Monorepo)

```text
Simulador/
├── apps/
│   ├── api/
│   │   ├── dist/                 # Salida compilada de TypeScript (`npm run build`)
│   │   ├── drizzle/              # Migraciones SQL y metadatos
│   │   └── src/
│   │       ├── db/               # Esquema y conexión PostgreSQL
│   │       └── index.ts          # Endpoint REST, JWT, Zod y generación de PDF
│   └── web/
│       ├── public/               # Frontend estático servido por Vercel
│       │   ├── css/
│       │   └── *.html
│       └── src/                  # Fuentes CSS / Tailwind
├── docs/
│   ├── architecture.md
│   ├── diagrams/
│   ├── product/
│   └── MANUAL_TECNICO.md
├── .env.example
├── apps/api/.env.example
└── package.json
```

### 6.3. Variables de Entorno Requeridas (`apps/api/.env`)

Para ejecutar el backend en entorno local o desplegarlo en Render, deben configurarse obligatoriamente las siguientes variables. Se recomienda copiar `apps/api/.env.example` como `apps/api/.env` antes de iniciar la API.

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto HTTP de escucha del servidor API. | `4000` (local) / `10000` (Render) |
| `DATABASE_URL` | Cadena de conexión PostgreSQL con SSL habilitado. | `postgresql://user:pass@host/neondb?sslmode=require` |
| `JWT_SECRET` | Clave criptográfica secreta para firmar tokens de sesión (mínimo 16 caracteres; recomendable 64 aleatorios). | Cadena aleatoria de 64 caracteres |
| `TEACHER_REGISTRATION_CODE` | Código institucional requerido para registrar cuentas con rol docente o administrador. | `DOCENTE-SST-2026` |
| `CORS_ORIGINS` | Lista separada por comas de orígenes frontend autorizados. | `https://simuladorsst-public.vercel.app,http://localhost:3000` |

El archivo de ejemplo también incluye `NODE_ENV`, `COOKIE_SECURE` y las credenciales `CLOUDINARY_*`, que deben ajustarse según el entorno y las funcionalidades utilizadas.

### 6.4. Instalación y Ejecución en Entorno Local

1. Clonar el repositorio y cambiar a la rama de producción:

   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd Simulador
   git checkout despliegue
   ```

2. Instalar dependencias, compilar el backend y arrancar la API:

   ```bash
   npm install
   npm --prefix apps/api run build
   npm --prefix apps/api start
   ```

   Para trabajar en modo desarrollo, `npm run dev` inicia simultáneamente la API (`tsx watch`) y el servidor estático del frontend.

3. Servir el frontend mediante un servidor estático local:

   ```bash
   npx serve apps/web/public -l 3000
   ```

   Posteriormente, acceder a `http://localhost:3000/index.html`.

### 6.5. Procedimiento de Despliegue Continuo (CI/CD)

- **Frontend (Vercel):** vinculado a la rama `despliegue` con directorio raíz `apps/web/public`. Cualquier `git push origin despliegue` dispara una compilación y publicación automática en la red CDN global.
- **Backend (Render):** vinculado a la rama `despliegue` con directorio raíz `apps/api`, comando de construcción `npm install && npm run build` y comando de arranque `npm start`.
- **Endpoint de monitoreo (health check):** `GET https://simulador-sst.onrender.com/health` verifica el estado del servidor y la conectividad activa con Neon PostgreSQL.

### 6.6. Controles de Seguridad Implementados

- **Autenticación y autorización:** las rutas protegidas validan la firma y expiración del token JWT (`Authorization: Bearer <token>` o cookie `simulsst_token`) mediante `requireAuth`. Las rutas restringidas por perfil aplican además `requireRole('docente' | 'administrador')`.
- **Prevención de IDOR:** al consultar evaluaciones mediante `GET /api/evaluations/summary`, el backend usa el correo del token JWT del usuario autenticado; solo los roles docente/administrador pueden consultar el correo de otro estudiante.
- **Validación de entradas y mitigación de abuso:** los cuerpos de solicitud se validan con esquemas Zod antes de acceder a la base de datos, los endpoints de autenticación cuentan con `express-rate-limit` y la API aplica `helmet` y una lista blanca de orígenes CORS.
- **Integridad transaccional:** las operaciones compuestas, como el registro de la clasificación de riesgo y su entrega asociada, se ejecutan dentro de transacciones con confirmación o reversión atómica.
- **Registro docente:** la creación de cuentas con rol docente o administrador exige el código definido en `TEACHER_REGISTRATION_CODE`, enviado en el cuerpo o en la cabecera `x-teacher-code`.

> Nota operativa: `GET /api/reports/certificate/pdf` es una ruta pública parametrizada por query string; genera el documento con los datos recibidos en la URL. La verificación anti-IDOR descrita anteriormente corresponde a las rutas protegidas con JWT, en particular al resumen de evaluaciones.

## 7. Guía de Evidencias de Funcionamiento (Capturas de Pantalla)

Para completar la sección de pruebas del informe impreso o PDF, toma estas 7 capturas directamente desde [https://simuladorsst-public.vercel.app/](https://simuladorsst-public.vercel.app/) e insértalas con su respectivo pie de figura. Las rutas propuestas son `docs/evidencias/`.

### Figura 1 — Pantalla Principal y Acceso Multi-Rol

![Figura 1 — Pantalla principal y acceso multi-rol](./evidencias/figura-01-index-login.png)

*Pie de figura:* evidencia del portal público desplegado bajo HTTPS en Vercel con selección de perfil Estudiante y Docente (`index.html` / `01_login.html`).

### Figura 2 — Registro de Usuario y Persistencia en la Nube

![Figura 2 — Registro de usuario y persistencia en la nube](./evidencias/figura-02-registro-usuarios.png)

*Pie de figura:* confirmación de creación exitosa de usuario almacenado en Neon PostgreSQL (`08_registro_usuarios.html`).

### Figura 3 — Clasificación de Riesgo ARL

![Figura 3 — Clasificación de riesgo ARL](./evidencias/figura-03-clasificacion-risk-arl.png)

*Pie de figura:* interfaz de selección de empresa activa (Metalmecánica S.A. — CIIU 2592) y evaluación de la Clase de Riesgo según el Decreto 768 de 2022 (`07_mintrabajo_estudiante.html`).

### Figura 4 — Evaluación de Estándares Mínimos y Plan de Mejoramiento

![Figura 4 — Evaluación de estándares mínimos y plan de mejoramiento](./evidencias/figura-04-estandares-plan-mejoramiento.png)

*Pie de figura:* modal interactivo disparado al reportar un estándar No Conforme (Art. 28, Res. 0312 de 2019), con validación de la acción correctiva y del responsable autenticado (`06_arl_sura_evaluacion.html`).

### Figura 5 — Constancia de Radicación y Calificación Dinámica

![Figura 5 — Constancia de radicación y calificación dinámica](./evidencias/figura-05-constancia-radicacion.png)

*Pie de figura:* vista consolidada mostrando el porcentaje calculado en tiempo real a partir de los ítems diligenciados, la validación de la Clase de Riesgo ARL, el nivel de valoración legal y los datos del responsable (pestaña "3. CONSULTAR ESTÁNDARES MÍNIMOS" de `07_mintrabajo_estudiante.html`).

### Figura 6 — Certificado Oficial en PDF Generado por el Backend

![Figura 6 — Certificado oficial en PDF generado por el backend](./evidencias/figura-06-certificado-pdf.png)

*Pie de figura:* documento PDF descargado desde Render con los datos reales de la evaluación.

### Figura 7 — Panel de Auditoría Docente

![Figura 7 — Panel de auditoría docente](./evidencias/figura-07-panel-docente.png)

*Pie de figura:* vista de supervisión académica con los registros persistidos en la base de datos (`05_docente_dashboard.html`).

## 8. Conclusiones

1. **Pertinencia Académica:** la implementación de SimulSST Pro transforma el aprendizaje normativo del SG-SST en una experiencia práctica y verificable, permitiendo que los estudiantes comprendan el impacto real de una incorrecta clasificación de riesgo ARL o de una no conformidad en los estándares mínimos.
2. **Viabilidad Técnica y Escalabilidad:** la separación entre el frontend estático (Vercel), la API REST tipada (Render) y la base de datos relacional serverless (Neon) demuestra una arquitectura moderna, segura y con un costo operativo reducido para entornos educativos.
3. **Seguridad por Diseño:** la incorporación de JWT, control de acceso por roles, validación con Zod, protección anti-IDOR en el resumen de evaluaciones y limitación de peticiones garantiza que la plataforma aplique buenas prácticas de ingeniería de software en producción.
