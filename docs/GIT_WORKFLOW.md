# Flujo de trabajo Git — SimulSST Pro

**Fecha:** 2026-11-18  
**Alcance:** documentación del estado real observado y propuesta operativa para `Natalia`, `Camila`, `main` y `despliegue`. No se ejecutaron cambios sobre ramas remotas ni protecciones en GitHub.

## 1. Estado real observado

Evidencia de ramas locales/remotas (`git branch -a --format='%(refname:short)|%(committerdate:short)|%(authorname)|%(subject)'`):

| Rama | Último commit | Fecha | Autor | Asunto |
|---|---|---|---|---|
| `main` | `5f01d38` | 2026-10-26 | Natalia Valencia | Actualizar plantilla env |
| `despliegue` | `5f01d38` | 2026-10-26 | Natalia Valencia | Actualizar plantilla env |
| `Natalia` | `0ce4234` | 2026-11-18 | Natalia Valencia | docs(audit): generar auditoria tecnica y correcciones criticas |
| `auditoria/fase-1` | (HEAD actual de auditoría) | 2026-11-18 | Natalia Valencia | correcciones críticas de auditoría (ver `AUDITORIA_TECNICA.md`) |
| `origin/main` | `5f01d38` | 2026-10-26 | Natalia Valencia | Actualizar plantilla env |
| `origin/despliegue` | `5f01d38` | 2026-10-26 | Natalia Valencia | Actualizar plantilla env |
| `origin/Natalia` | `0ce4234` | 2026-11-18 | Natalia Valencia | docs(audit): generar auditoria tecnica y correcciones criticas |
| `origin/Camila` | `b8bd608` | 2026-10-22 | maria de los angeles camila pava arce | Agregar diagramas |

Divergencias respecto a `main` (`git rev-list --left-right --count main...<rama>`):
- `Natalia`: `0	2` (2 commits adelante de `main`, sin commits propios de `main` pendientes).
- `despliegue`: `0	0` (alineada con `main`).
- `origin/Natalia`: `0	2`.
- `origin/Camila`: `4	0` (4 commits en `main` no integrados en `origin/Camila`; no existe rama local `Camila` al momento de la revisión).

Integración continua / protección:
- No se encontró directorio `.github/` en el repositorio (`Test-Path .github` = `False`). No hay evidencia de workflows ni de protección de ramas configurada en el código versionado.

## 2. Esquema de ramas propuesto

| Rama | Propósito | Reglas |
|---|---|---|
| `main` | Código estable y revisado; fuente de verdad | Sin *push* directo; solo se actualiza mediante *pull request* con al menos una revisión; debe compilar y pasar verificaciones disponibles (lint, tipos, pruebas, build) |
| `despliegue` | Versión lista para publicar | Solo recibe fusiones desde `main`; cada fusi��n de release debe etiquetarse (`vX.Y.Z`, ej. `v0.1.0`) |
| `Natalia` | Rama de trabajo personal de Natalia | Se actualiza desde `main` con frecuencia; integra cambios a `main` por *pull request* en cambios pequeños y revisables |
| `Camila` | Rama de trabajo personal de Camila | Igual que `Natalia`; debe sincronizarse con `main` antes de abrir PR para reducir conflictos |

**Flujo propuesto:** `Natalia`/`Camila` → *pull request* → `main` → fusión a `despliegue` + etiqueta de versión.

**Ajuste según estado real:** `origin/Camila` está rezagada respecto a `main` (4 commits); se recomienda crear/actualizar la rama local `Camila`, integrar `origin/main` y resolver conflictos antes de nuevo trabajo. `despliegue` está alineada con `main` pero no hay evidencia de etiquetado de releases.

## 3. Convención de commits

Usar Conventional Commits en español o inglés de forma consistente:

- `feat(<área>): <descripción>` — nueva funcionalidad.
- `fix(<área>): <descripción>` — corrección de error/hallazgo.
- `docs(<área>): <descripción>` — documentación.
- `refactor(<área>): <descripción>` — cambio interno sin alterar comportamiento externo.
- `test(<área>): <descripción>` — pruebas.
- `chore(<área>): <descripción>` — tareas de mantenimiento.

Recomendaciones: un cambio lógico por commit, asunto breve en imperativo, y referencia a evidencia/hallazgo cuando aplique (ej. auditoría).

## 4. Plantilla de Pull Request

```md
## Resumen
- 

## Tipo de cambio
- [ ] feat  [ ] fix  [ ] docs  [ ] refactor  [ ] test  [ ] chore

## Hallazgos / issues relacionados
- 

## Verificación
- [ ] `npm run lint` (o equivalente) sin errores nuevos
- [ ] `npm run typecheck` / `tsc --noEmit` (si aplica) sin errores nuevos
- [ ] `npm test` (si aplica) pasando / evidencia adjunta
- [ ] `npm run build` (si aplica) exitoso
- [ ] Prueba manual / humo realizada (describir)

## Seguridad y datos
- [ ] No se incluyen secretos, `.env`, tokens ni credenciales
- [ ] No se exponen datos sensibles en logs o respuestas
- [ ] Cambios de auth/roles/validación revisados (si aplica)

## Riesgos y rollback
- Impacto:
- Plan de reversión:
```

## 5. Regla de resolución de conflictos

1. Actualizar la rama de trabajo desde `main` antes de abrir o actualizar el PR (`git fetch origin` + `git merge origin/main` o `rebase` solo si el equipo lo acuerda y sin reescribir historial compartido/publicado).
2. Resolver conflictos localmente, priorizando la versión ya revisada en `main` y preservando la intención del cambio.
3. Ejecutar nuevamente las verificaciones disponibles tras resolver conflictos.
4. No forzar push sobre ramas compartidas; si se requiere reescritura excepcional, acordarlo explícitamente y documentarlo.
5. Un PR debe quedar en estado mergeable y con revisión aprobada antes de fusionar.

## 6. Comandos del día a día (propuestos)

```bash
# Ver estado y rama actual
git status
git branch -vv

# Cambiar de rama
git switch Natalia
git switch -c feature/mi-cambio   # crear rama de trabajo desde la actual

# Sincronizar referencias remotas
git fetch origin

# Actualizar rama personal con cambios de main
git switch Natalia
git merge origin/main

# Preparar y confirmar cambios
git add <archivos>
git commit -m "fix(api): descripción breve"

# Publicar rama de trabajo (cuando el equipo lo solicite)
git push -u origin Natalia

# Crear PR (ejemplo con GitHub CLI, no ejecutado por este documento)
# gh pr create --base main --head Natalia --fill
```

## 7. Protección de ramas (comandos/configuración sugerida, no ejecutada)

> **No ejecutado.** Requiere permisos de administración del repositorio remoto.

Opciones recomendadas para `main` (y opcionalmente `despliegue`):
- Requerir pull request antes de fusionar (mínimo 1 aprobación).
- Requerir que las conversaciones estén resueltas.
- Requerir checks de estado (lint/typecheck/test/build) cuando exista CI en `.github/workflows`.
- Restringir pushes directos y forzar historial lineal según política del equipo.
- Requerir firma de commits si la organización lo exige.

Ejemplo conceptual con GitHub CLI (ajustar `OWNER/REPO` y contexto):

```bash
# Ejemplo ilustrativo, NO ejecutado
# gh api -X PUT repos/OWNER/REPO/branches/main/protection --input protection.json
```

Para `despliegue`, permitir solo merges desde `main` mediante política de PR/revisión y, si es posible, restringir quién puede hacer push/merge. 
