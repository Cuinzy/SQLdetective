# SQL Detective: Archivos del Crimen

Videojuego web educativo de investigación criminal para aprender SQL. Cada estudiante es un detective de la **Agencia Índice** de Ciudad Bruma y resuelve crímenes consultando bases de datos **PostgreSQL reales**: no hay respuestas prefabricadas ni reconocimiento de palabras clave.

- **Tutorial jugable + 15 casos** en tres niveles (consultas básicas → JOIN y agregación → LEFT/RIGHT JOIN y relaciones complejas).
- Cada caso tiene su propio esquema (`case_01` … `case_15`), entre 6 y 10 tablas relacionadas con PK/FK, de 280 a 3.300 registros, 5 sospechosos, 8–11 evidencias, objetivos, pistas de tres niveles e interrogatorios que se desbloquean con evidencias descubiertas por SQL.
- Reglas de la fiscalía validadas en el servidor: 20 consultas válidas y distintas para acusar, +10 por cada acusación fallida, evidencias fundamentales, líneas de investigación completas, evidencia nueva tras un error y sin repetir sospechosos.
- Panel docente en `/admin`, códigos únicos de verificación, reportes PDF/JSON/CSV firmados con HMAC.

---

## 1. Arquitectura

| Capa | Tecnología |
|---|---|
| Aplicación | Next.js 15 (App Router) + React 19 + TypeScript |
| Base de datos | PostgreSQL 14+ (probado con PostgreSQL 18; compatible con Neon) mediante `pg` / `pg-cursor` |
| Análisis SQL | `pgsql-ast-parser` (AST) — lista blanca de sentencias, tablas y funciones |
| Editor | CodeMirror 6 con dialecto PostgreSQL y bloqueo de copiar/pegar |
| Reportes | `pdf-lib` (sin dependencias nativas) y JSON canónico firmado con HMAC-SHA256 |
| Arte | Pixel art original generado en SVG (retratos procedurales, escenarios, iconos), sonido sintetizado con WebAudio |

```
src/
  app/                 páginas (portada, registro, oficina, archivo, investigación, admin) y rutas /api
  cases/               definición de los 16 expedientes (datos, evidencias, pistas, interrogatorios, SOLUCIÓN)  ← solo servidor
  server/
    sql/analyzer.ts    análisis estructural (AST), huellas anti-repetición, detección de conceptos
    sql/sandbox.ts     ejecución aislada (rol de solo lectura, READ ONLY, timeout, 500 filas, protocolo extendido)
    sql/evidence.ts    detección de evidencias sobre el RESULTADO real de la consulta
    sql/errors.ts      traducción pedagógica de errores de PostgreSQL
    rules.ts           conteo de consultas válidas y habilitación de acusaciones (funciones puras)
    game.ts            motor de investigación (sesiones, consultas, pistas, interrogatorios, acusaciones)
    report.ts, pdf.ts  reportes firmados
    admin.ts           panel docente, estadísticas y CSV
    seed.ts            creación de esquemas, roles y datos
  components/          arte pixel, editor, explorador de esquemas, pestañas del juego
db/migrations/         esquema `game` (estudiantes, investigaciones, consultas, auditoría…)
scripts/               migraciones, carga de casos, validación, admin, PostgreSQL local, build de Vercel
tests/                 unitarias, integración (PostgreSQL real) y extremo a extremo (HTTP contra next start)
```

### Seguridad del motor de consultas (defensa en profundidad)
1. **AST**: una sola sentencia; solo `SELECT`/`WITH`/`UNION`/`VALUES`; tablas limitadas al caso activo (CTE permitidas); esquemas `game`, `pg_catalog`, `information_schema` y de otros casos bloqueados; funciones en **lista blanca** (agregaciones, texto, fechas); sin parámetros, `FOR UPDATE` ni funciones en `FROM`.
2. **Protocolo extendido** (`pg-cursor`): PostgreSQL rechaza por sí mismo múltiples sentencias.
3. **Transacción `READ ONLY`** + `SET LOCAL ROLE sqld_cNN`: cada caso tiene un rol `NOLOGIN` con `SELECT` solo sobre su esquema.
4. **Conexión con rol LOGIN `sqld_sandbox`** (`NOINHERIT`) sin privilegios sobre el esquema `game`: aunque alguien lograra hacer `RESET ROLE`, no vería datos de estudiantes.
5. `statement_timeout` (4 s), `work_mem` acotado, máximo 500 filas por resultado y límite de 30 consultas por minuto por investigación.
6. La solución, las consultas de referencia y las evidencias no descubiertas **nunca** se envían al navegador. Los contadores y la identidad del culpable solo existen en el servidor.

### Conteo de consultas válidas (anti-repetición)
Una consulta ejecutada correctamente suma al contador oficial solo si:
- consulta al menos una tabla del caso y muestra datos (no solo constantes);
- no es idéntica (AST normalizado) a una consulta previa;
- su resultado no es **equivalente** (mismas filas, aunque cambie el orden, los alias o la forma) a otra ya contabilizada;
- no repite por tercera vez la misma **plantilla** cambiando solo los valores, ni por cuarta vez la misma **forma** (`FROM`/`WHERE`/`GROUP BY`) con otra proyección.

Las búsquedas sin resultados sí pueden contar. Las evidencias se detectan sobre el resultado real (valores que aparecen juntos en una fila, con resultados acotados y, en los niveles II y III, usando JOIN o agregación cuando corresponde), por lo que cualquier consulta equivalente sirve: no se exige la consulta “oficial”.

### Copiar y pegar
Se bloquean Ctrl/⌘+C/V/X, Shift+Insert, menú contextual, arrastrar y soltar, y los eventos `copy`/`cut`/`paste`/`beforeinput` en todo el entorno de juego (editor y justificación de la acusación). **No es una protección absoluta** (puede eludirse con herramientas externas); por eso el servidor detecta repeticiones y registra los intentos de pegado bloqueados, visibles para el docente y en el reporte.

---

## 2. Estado de los 15 casos

Todos los casos son jugables de principio a fin y pasan la validación automática (estructura, FK, evidencias alcanzables con consultas reales, cada inocente descartado por datos, culpable implicado por ≥3 evidencias y ≥20 consultas útiles distintas).

| Caso | Título | Mecanismo central | Tablas | Registros |
|---|---|---|---|---|
| EXP-00 | La taza del comisario (tutorial) | SELECT, columnas, WHERE, ORDER BY, LIKE | 2 | 20 |
| EXP-01 | El robo del museo | Tarjetas nocturnas, cámara desconectada, declaración falsa | 8 | 227 |
| EXP-02 | El misterio de la biblioteca | Peso de la caja (comparar columnas), credencial vencida, arco detector | 8 | 450 |
| EXP-03 | El laboratorio alterado | Cuenta suplantada, huellas biométricas, sesiones en terminal | 9 | 339 |
| EXP-04 | El robo en el hotel | Llave maestra, apertura denegada, excusa del equipaje | 10 | 432 |
| EXP-05 | El sabotaje informático | IP → equipo, fuerza bruta, reserva de laboratorio | 9 | 452 |
| EXP-06 | El fraude del festival | Anulaciones por vendedor, boletas anuladas que ingresaron, efectivo oculto | 8 | 3.315 |
| EXP-07 | El vehículo desaparecido | Lecturas de placas, grúa “sombra”, orden de tránsito reutilizada | 9 | 417 |
| EXP-08 | El expediente perdido | SUM de páginas impresas, nivel de reserva, último en salir | 7 | 531 |
| EXP-09 | El sabotaje ferroviario | AVG/MIN de sensores, orden cerrada por otro, acceso fuera de turno | 8 | 3.034 |
| EXP-10 | La operación fantasma | Contratos bajo el umbral, JOIN por dirección, empresa fachada | 6 | 489 |
| EXP-11 | La red de identidades falsas | Documentos sin verificación (LEFT JOIN), teléfonos compartidos, flujo de dinero | 8 | 510 |
| EXP-12 | El secreto del puerto | Manifiesto sin carga (LEFT JOIN), sin inspección, autouniones | 7 | 284 |
| EXP-13 | El proyecto clandestino | Accesos sin asignación, USB, dominios no autorizados | 9 | 687 |
| EXP-14 | El crimen de medianoche | Coartadas vs. posiciones (JOIN con BETWEEN), llamadas, huellas | 7 | 650 |
| EXP-15 | El archivo maestro | Conspiración: dinero → intermediario → ejecutores, llamadas, vehículos, coartada falsa | 8 | 571 |

Los datos combinan registros clave escritos a mano con relleno **determinista** (generador pseudoaleatorio con semilla fija por caso): cada carga produce exactamente los mismos registros y la prueba automática lo verifica en un proceso independiente. Para revisar un caso: `npm run db:validate -- 7`.

---

## 3. Ejecución local

Requisitos: **Node.js 20+** (probado con Node 24). No hace falta instalar PostgreSQL: el proyecto incluye uno embebido.

```powershell
npm install
```

En una terminal aparte, inicia PostgreSQL local (puerto 54329, datos en `.local-pg/`):

```powershell
npm run db:local
```

Crea `.env.local` (puedes partir de `.env.example`):

```env
DATABASE_URL=postgres://postgres:postgres@localhost:54329/sqldetective
SANDBOX_DB_PASSWORD=una-clave-local-larga-123456
SESSION_SECRET=cambia-esto-por-32-caracteres-o-mas-aleatorios
REPORT_SIGNING_SECRET=cambia-esto-tambien-por-32-caracteres-o-mas
```

Migraciones y carga de los 16 expedientes, y creación del docente:

```powershell
npm run db:setup
```

```powershell
npm run admin:create -- docente
```

Desarrollo (http://localhost:3000):

```powershell
npm run dev
```

Producción local:

```powershell
npm run build; npm run start
```

## 4. Configuración de PostgreSQL

- **Esquema `game`** (migración `db/migrations/001_init.sql`): `players`, `investigations` (código `UNIQUE`), `queries`, `evidence_found`, `hints_used`, `interrogations`, `accusations`, `achievements`, `reports`, `admin_users`, `admin_sessions`, `audit_log`.
- **Esquemas `case_00`…`case_15`**: tablas y datos de cada expediente; se recrean con `npm run db:seed` (idempotente).
- **Roles** creados por el seed: `sqld_c00`…`sqld_c15` (NOLOGIN, SELECT sobre su esquema) y `sqld_sandbox` (LOGIN, NOINHERIT, miembro de los roles de caso, sin acceso a `game`).
- El usuario de `DATABASE_URL` necesita poder crear esquemas y roles (`CREATEROLE`). En Neon, el rol propietario del proyecto lo tiene.
- Si tu proveedor no permite crear roles LOGIN, omite `SANDBOX_DB_PASSWORD`: la app usará la conexión principal con `SET LOCAL ROLE` (siguen activas las capas 1, 2, 3 y 5, pero se pierde la capa 4). En producción se muestra un aviso en los logs.

### Neon
1. Crea un proyecto en https://neon.tech y copia la cadena **Pooled connection** (`…-pooler…`, `sslmode=require`).
2. Úsala como `DATABASE_URL` y ejecuta `npm run db:setup` desde tu equipo con esa variable, **o** deja que el build de Vercel lo haga (ver abajo).

## 5. Despliegue en Vercel

1. Sube el repositorio a GitHub e impórtalo en Vercel (framework detectado: Next.js).
2. En **Settings → Environment Variables** define: `DATABASE_URL`, `SANDBOX_DB_PASSWORD`, `SESSION_SECRET`, `REPORT_SIGNING_SECRET` y, solo para el primer despliegue, `ADMIN_USERNAME` y `ADMIN_PASSWORD`.
3. Despliega. Vercel ejecuta `npm run vercel-build`, que:
   - aplica migraciones pendientes (idempotente);
   - carga los 16 casos si aún no existen (`SEED_ON_BUILD=true` fuerza la recarga);
   - crea o actualiza el docente si `ADMIN_USERNAME`/`ADMIN_PASSWORD` están definidos;
   - compila Next.js.
4. Elimina `ADMIN_PASSWORD` de las variables tras el primer despliegue.
5. Comprueba `https://TU-APP.vercel.app/api/health` → `"ok":true` con `database.caseSchemas: 16`, `database.migrations: 1` y `sandbox.ok: true`. Si algo falla, la respuesta indica qué variable o conexión revisar (nunca muestra valores).

Todo el estado oficial vive en PostgreSQL: la app no usa archivos temporales ni memoria del servidor para registrar investigaciones, por lo que funciona con las funciones serverless de Vercel.

## 6. Administrador (docente)

- Crear o cambiar contraseña: `npm run admin:create -- <usuario>` (pide la contraseña sin mostrarla; mínimo 12 caracteres) o `ADMIN_USERNAME`/`ADMIN_PASSWORD` en el build de Vercel.
- Contraseñas con **scrypt**; sesiones en servidor (cookie `httpOnly`, `SameSite=Strict`, 8 h); bloqueo tras 8 intentos fallidos por IP en 15 minutos.
- En `/admin`: verificación por código, estadísticas generales (resolución, promedios, construcciones SQL más usadas, errores frecuentes, pistas más pedidas, avance por estudiante), filtros (nombre, grupo, código, caso, fechas, estado), exportación CSV, visor completo de consultas con resaltado de sintaxis, resumen de conceptos SQL derivado del AST, culpable correcto (solo docente) y **verificación de reportes JSON** entregados por estudiantes.

## 7. Estudiantes: sesión y recuperación

Al registrarse, cada estudiante recibe una **placa** (`AG-XXXX-XXXX`) y una **clave de recuperación** de 16 caracteres que se muestra una sola vez. La sesión se guarda en una cookie `httpOnly` (180 días). En otro equipo, se recupera con placa + clave en `/recuperar`. El código de verificación de una investigación (`SQLD-XXXX-XXXX-XXXX`) **no** da acceso a datos: solo lo usa el docente autenticado.

## 8. Pruebas

```powershell
npm run test
```

```powershell
npm run build; npm run test:e2e
```

Las pruebas levantan su propio PostgreSQL temporal (puerto 54339), migran y cargan los 16 casos. Ver la sección **Resultados de las pruebas** al final.

## 9. Diagnóstico de errores frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| “La base de datos de la agencia no está disponible” | `DATABASE_URL` ausente o incorrecta | Revisa la variable y `/api/health` |
| `permission denied to create role` en el seed | El usuario no tiene `CREATEROLE` | Usa el rol propietario (Neon) o quita `SANDBOX_DB_PASSWORD` (modo `SET ROLE`) |
| `password authentication failed for user "sqld_sandbox"` | La contraseña cambió | Ejecuta `npm run db:seed` con el mismo `SANDBOX_DB_PASSWORD` que usa la app |
| Error al compilar fuentes (`next/font`) | Sin internet durante el build | Vuelve a compilar con conexión (Vercel la tiene) |
| Todas las consultas fallan con 42501 | Esquemas de casos sin cargar | `npm run db:seed` |
| `SESSION_SECRET debe definirse…` en producción | Falta un secreto | Define `SESSION_SECRET` y `REPORT_SIGNING_SECRET` (≥32 caracteres) |
| “Demasiadas consultas en poco tiempo” | Límite de 30/min por investigación | Ajusta `QUERY_RATE_PER_MIN` si lo necesitas |
| `db:local` falla en Windows | Carpeta `.local-pg` dañada | Detén el proceso y borra `.local-pg/` |

---

## Resultados de las pruebas

Ejecutadas el 18-nov-2026 (Windows 11, Node 24, PostgreSQL 18 embebido): `npm run test` → **5 archivos, 106 pruebas, 106 aprobadas**; `npm run test:e2e` → **10 aprobadas**. Total: **116/116**.

| Prueba solicitada | Dónde | Estado |
|---|---|---|
| 1 · Ejecución SQL (SELECT, WHERE, ORDER BY, GROUP BY, HAVING, INNER/LEFT/RIGHT JOIN) | `tests/integration/sandbox.test.ts` | ✅ |
| 2 · Acusación con menos de 20 consultas rechazada | `tests/integration/game.test.ts` | ✅ |
| 3 · Misma consulta 20 veces = 1 válida | `game.test.ts`, `tests/unit/rules.test.ts` | ✅ |
| 4 · Acusación incorrecta → 30 consultas + evidencia nueva, sin repetir sospechoso | `game.test.ts` | ✅ |
| 5 · Resolución evaluada en servidor | `game.test.ts` | ✅ |
| 6 · Reporte (consultas, culpable, estado, código, firma, PDF) | `game.test.ts` | ✅ |
| 7 · Panel docente por código | `game.test.ts` | ✅ |
| 8 · Independencia entre estudiantes | `game.test.ts` | ✅ |
| 9 · Integridad de contadores y estado | `game.test.ts` | ✅ |
| 10 · Los 15 casos validados contra PostgreSQL real | `sandbox.test.ts`, `tests/unit/content.test.ts` | ✅ |
| Seguridad del motor (multi-sentencia, solo lectura, esquemas ajenos, timeout, rol aislado) | `sandbox.test.ts`, `analyzer.test.ts` | ✅ |
| Extremo a extremo HTTP (`next start` + PostgreSQL real): registro, cookie httpOnly, CSRF, SQL destructivo, bloqueo <20, investigación completa, acusación fallida y penalización, PDF/JSON/CSV, aislamiento entre estudiantes, panel docente con login, verificación de reporte, recuperación de credencial | `tests/e2e/http-flow.test.ts` | ✅ 10/10 |
