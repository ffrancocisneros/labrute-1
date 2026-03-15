# Análisis: Torneos Diarios No Visibles

**Fecha:** Marzo 2026  
**Problema:** Los torneos diarios se generan pero no son visibles para los usuarios. El mensaje "No hay torneo disponible para esta fecha" aparece al entrar a la sección de torneo diario.  
**Contexto:** Otros tipos de torneo (global, Copa del Rey, especial, etc.) funcionan correctamente.

---

## 🔍 Análisis del Problema

### Causa Raíz: Desajuste de fechas entre backend y frontend

El sistema usa un concepto de "día de juego" (`getGameDay()`) que agrega 3 horas a UTC antes de truncar a medianoche. Esto hace que el día de juego cambie a las **21:00 UTC** (18:00 Argentina).

Sin embargo, el torneo diario era el **único tipo** que usaba `new Date()` (fecha UTC cruda) en lugar de `getGameDay().toDate()` al crearse.

### Flujo del Bug

1. **Cron ejecuta a las 21:00 UTC del 15 de marzo:**
   - `getGameDay()` = 16 de marzo (porque 21:00 + 3h = 00:00 del 16)
   - `new Date()` = `2026-03-15T21:00:00Z` → almacenado como **15 de marzo** en PostgreSQL (`@db.Date`)

2. **Usuario accede al torneo después de medianoche UTC (ej: 09:00 Argentina = 12:00 UTC del 16 de marzo):**
   - Frontend construía la URL con `dayjs.utc().format('YYYY-MM-DD')` = **16 de marzo**
   - Consulta al backend: `GET /api/tournament/:name/2026-03-16`
   - Base de datos tiene el torneo con fecha **15 de marzo**
   - **No hay match** → "No hay torneo disponible para esta fecha"

3. **Resultado:** El torneo solo era visible ~3 horas (21:00-23:59 UTC) y desaparecía las siguientes 21 horas.

### Inconsistencia con otros torneos

Todos los demás tipos de torneo usaban `today.toDate()` correctamente:

| Tipo de Torneo | Fecha usada | ¿Correcto? |
|----------------|-------------|------------|
| **Daily** | `new Date()` | ❌ |
| Global | `today.toDate()` | ✅ |
| Copa del Rey | `today.toDate()` | ✅ |
| Unlimited Global | `today.toDate()` | ✅ |
| Special | `today.toDate()` | ✅ |
| Survival | `today.toDate()` | ✅ |
| Battle Royale | `lastEvent.date` | ✅ |

### Efecto cascada en el scheduler de seguridad

El scheduler cada 15 minutos (`server.ts` líneas 120-139) verificaba si existían torneos para el día de juego actual:

```typescript
const todayDailyTournaments = await cx.prisma.tournament.count({
  where: {
    type: TournamentType.DAILY,
    date: { gte: today.toDate(), lt: tomorrow.toDate() },
  },
});
```

Como los torneos se guardaban con la fecha UTC incorrecta, este conteo siempre daba **0** después de las 21:00 UTC, provocando re-ejecuciones innecesarias del daily job (que no creaban torneos duplicados gracias a que `registeredForTournament` ya estaba en `false`).

---

## ✅ Solución Implementada

### 1. Backend: Usar fecha de día de juego al crear torneos

**Archivo:** `server/src/dailyJob.ts` (línea 307)

**Antes:**
```typescript
const tournament = await prisma.tournament.create({
  data: {
    date: new Date(),  // ← Fecha UTC cruda
    participants: { connect: brutes.map((brute) => ({ id: brute.id })) },
    rounds: 6,
  },
});
```

**Después:**
```typescript
const tournament = await prisma.tournament.create({
  data: {
    date: today.toDate(),  // ← Día de juego (consistente con otros torneos)
    participants: { connect: brutes.map((brute) => ({ id: brute.id })) },
    rounds: 6,
  },
});
```

### 2. Frontend: Usar día de juego en URLs de torneos

Se reemplazó `dayjs.utc().format('YYYY-MM-DD')` por `getGameDay().format('YYYY-MM-DD')` en todos los componentes que construyen URLs de torneos:

| Archivo | Cambio |
|---------|--------|
| `client/src/views/UnifiedTournamentView.tsx` | `todayStr` usa `getGameDay()` |
| `client/src/routes.tsx` | Redirect de `/tournament` usa `getGameDay()` |
| `client/src/views/HomeView.tsx` | Link a torneo especial usa `getGameDay()` |
| `client/src/views/CopaDelReyView.tsx` | Fallback de fecha usa `getGameDay()` |
| `client/src/components/Cell/CellSpecialTournament.tsx` | `todayStr` usa `getGameDay()` |
| `client/src/views/TournamentHistoryView.tsx` | `todayStr` para Copa del Rey usa `getGameDay()` |

---

## 📊 Impacto del Cambio

- **Archivos modificados:** 7 (1 backend + 6 frontend)
- **Líneas cambiadas:** ~10 líneas (cambios mínimos y quirúrgicos)
- **Riesgo:** Bajo - Solo se corrige qué fecha se usa, no la lógica
- **Performance:** Sin impacto

---

## 🔧 Pasos para Verificar la Solución

1. **Compilar servidor:**
   ```bash
   cd server
   yarn compile
   ```

2. **Compilar cliente:**
   ```bash
   cd client
   yarn build
   ```

3. **Verificar en producción post-deploy:**
   - Acceder a la sección de torneo diario
   - Confirmar que el torneo del día de juego actual se muestra correctamente
   - Verificar tanto antes como después de las 21:00 UTC

4. **Verificar scheduler de seguridad:**
   - Después de las 21:00 UTC, el scheduler debería encontrar los torneos y NO re-ejecutar el daily job

---

## 📝 Lecciones Aprendidas

1. **Consistencia en el uso de fechas:**
   - Siempre usar `getGameDay().toDate()` para operaciones relacionadas al día de juego
   - Nunca usar `new Date()` cuando la fecha debe alinearse al boundary del día de juego (21:00 UTC)

2. **Frontend y backend deben usar la misma referencia de fecha:**
   - Si el backend usa `getGameDay()`, el frontend también debe usarlo
   - `dayjs.utc()` y `getGameDay()` difieren entre 21:00 y 23:59 UTC

3. **El patrón de los otros torneos era la pista:**
   - Todos los demás tipos ya usaban `today.toDate()` correctamente
   - El torneo diario era la excepción

---

## ✅ Checklist de Verificación

- [x] Causa raíz identificada (desajuste `new Date()` vs `getGameDay()`)
- [x] Fix en backend (`dailyJob.ts`)
- [x] Fix en frontend (6 archivos)
- [x] Imports limpiados (sin imports huérfanos)
- [x] Sin errores de linter
- [ ] Compilación local verificada
- [ ] Build de Docker verificado
- [ ] Deploy y verificación en producción
