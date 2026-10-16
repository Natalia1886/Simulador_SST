# Simulador Web de Estándares Mínimos de SST (ARL SURA & Ministerio del Trabajo)

Un simulador interactivo web diseñado para la formación práctica de estudiantes y profesionales en la gestión del Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST), recreando la experiencia operativa de las plataformas de **ARL SURA** y del **Ministerio del Trabajo de Colombia** (Resolución 0312 de 2019).

---

## 📌 Tabla de Contenidos

1. [Descripción General](#-descripción-general)
2. [Arquitectura de Roles y Módulos](#-arquitectura-de-roles-y-módulos)

3. [Mecanismo Único de Validación de Evidencias (Hash)](#-mecanismo-único-de-validación-de-evidencias-hash)
4. [Estructura del Proyecto](#-estructura-del-proyecto)
5. [Tecnologías Sugeridas](#-tecnologías-sugeridas)

---

## 🎯 Descripción General

El objetivo de esta plataforma es reducir la curva de aprendizaje de los estudiantes de SST al enfrentarse a los trámites reales ante ARLs y el Ministerio del Trabajo. 

Permite realizar desde la autoevaluación inicial de estándares mínimos según la clasificación de riesgo de la empresa, hasta la generación de certificados consolidados y planes de mejoramiento, con retroalimentación en tiempo real y sin costos de almacenamiento masivo.

---

## 👥 Arquitectura de Roles y Módulos

El sistema distingue **dos roles principales**:

> 💡 **Nota Aclaratoria sobre el Rol Estudiante:** 
> Los Módulos 2 (*ARL*) y 3 (*Ministerio del Trabajo*) constituyen el entorno de práctica del **Estudiante (Responsable de SG-SST)**. No existe un "Módulo Estudiante" aislado debido a que sus interacciones ocurren directamente sobre las interfaces que simulan los portales reales. El **Módulo Docente** existe como una unidad independiente porque representa el panel de control administrativo y analítico exclusivo del profesor.

| Rol | Descripción y Alcance |
| :--- | :--- |
| **Estudiante (Responsable SG-SST)** | Interactúa con los simuladores de ARL y Ministerio del Trabajo. Registra empresas, califica estándares, carga evidencias sintéticas y genera reportes. |
| **Docente / Evaluador** | Administra el banco de empresas, configura patrones de validación de archivos (Hash), visualiza métricas de desempeño y exporta consolidados. |

---


## ⚙️ Mecanismo Único de Validación de Evidencias (Hash)

Para optimizar la infraestructura universitaria y brindar calificación automática:

1. **Profesor:** Sube plantillas de referencia y el sistema calcula su Hash SHA-256 en la BDD.
2. **Estudiante:** Selecciona el PDF localmente en su navegador.
3. **Sistema:** Calcula el Hash del archivo en memoria (sin subir el PDF al servidor) y lo compara contra la BDD:
   * **Coincidencia:** Marca la evidencia como válida.
   * **Diferencia:** Muestra una alerta indicando que el archivo es incorrecto, está vencido o no corresponde a la plantilla exigida.

---

## 🛠️ Tecnologías Sugeridas

* **Frontend:** React / Tailwind CSS / HTML5
* **Backend:** Node.js (Express) / Python (FastAPI o Django)
* **Base de Datos:** PostgreSQL / MySQL
* **Generación de Reportes:** PDFKit / Puppeteer
* **Algoritmo de Validación:** SHA-256 (Crypto API nativa de navegador)