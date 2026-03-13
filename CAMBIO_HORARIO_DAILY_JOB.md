# Cambio de Horario del Daily Job

**Fecha:** 13 de Marzo 2026  
**Problema:** El daily job no se ejecutaba automáticamente y el horario del reset diario no era el deseado  
**Solución:** Centralizar el cálculo de "día de juego" y corregir el cron schedule

---

## Problema Original

### Síntoma 1: Horario incorrecto
El reset diario ocurría a las 00:00 UTC (21:00 Argentina). Se deseaba que ocurriese a las **18:00 Argentina (21:00 UTC)**, es decir, 3 horas antes.

### Síntoma 2: Daily job no se ejecutaba automáticamente
Tras intentar cambiar el horario, el torneo diario dejó de generarse automáticamente. Solo funcionaba al hacer click manual en "Run Daily Job" desde el admin panel.

---

## Causa Raíz

### 1. Cron con timezone no funcionaba

El código original usaba un cron simple que funcionaba perfectamente:
```javascript
schedule.scheduleJob('0 0 * * *', dailyJob(cx.prisma)); // 00:00 UTC
```

Se cambió a usar la funcionalidad de timezone de `node-schedule`:
```javascript
schedule.scheduleJob(
  { rule: '0 19 * * *', tz: 'America/Argentina/Buenos_Aires' },
  dailyJobFn,
);
```

**Problema:** La funcionalidad `tz` de `node-schedule` requiere que `luxon` esté disponible correctamente a través de `cron-parser`. Aunque `luxon` existía como dependencia transitiva en `yarn.lock`, la integración con el parámetro `tz` en el objeto `{ rule, tz }` fallaba silenciosamente: **el job nunca se programaba y nunca se ejecutaba**.

### 2. El concepto de "día" no estaba alineado con el horario de reset

Incluso si el cron hubiese funcionado, existía un problema conceptual: todas las funciones del servidor calculaban "hoy" como `dayjs.utc().startOf('day')` (inicio del día UTC). A las 21:00 UTC, el día UTC sigue siendo el mismo. El servidor no habría detectado un "nuevo día" y habría saltado la generación de torneos por considerarlos ya creados.

---

## Solución Implementada

### 1. Función centralizada `getGameDay()`

Se creó una función en `core/src/utils/date.ts` que define el "día de juego":

```typescript
export const GAME_DAY_OFFSET_HOURS = 3;

export const getGameDay = () =>
  dayjs.utc().add(GAME_DAY_OFFSET_HOURS, 'hour').startOf('day');

export const getGameTomorrow = () => getGameDay().add(1, 'day');
```

**Cómo funciona:** Al sumar 3 horas a UTC antes de truncar a medianoche:
- A las **21:00 UTC** (18:00 Argentina): `21 + 3 = 00:00` del día siguiente → **nuevo día de juego**
- A las **13:00 UTC** (10:00 Argentina): `13 + 3 = 16:00` del mismo día → **mismo día de juego**

### 2. Cron UTC simple

Se reemplazó el cron con timezone por uno simple en UTC:
```javascript
schedule.scheduleJob('0 21 * * *', dailyJobFn);
```

- **21:00 UTC = 18:00 Argentina** (UTC-3, sin horario de verano)
- Sin dependencias de `luxon` ni funcionalidades de timezone
- Argentina no observa DST, por lo que UTC-3 es constante todo el año

### 3. Safety scheduler actualizado

El scheduler de respaldo (cada 15 minutos) fue simplificado:
```javascript
schedule.scheduleJob('*/15 * * * *', async () => {
  if (dayjs.utc().hour() < 21) return;
  const today = getGameDay();
  // ...verifica si existen torneos para el día de juego actual
});
```

### 4. Reemplazo global de `dayjs.utc().startOf('day')`

Se reemplazaron **todas** las instancias de `dayjs.utc().startOf('day')` por `getGameDay()` en los siguientes archivos:

| Archivo | Instancias |
|---------|-----------|
| `server/src/dailyJob.ts` | 13 |
| `server/src/controllers/Tournaments.ts` | 10 + 2 endOf + 3 currentTournamentDate |
| `server/src/controllers/ClanTournaments.ts` | 3 |
| `server/src/controllers/Brutes.ts` | 2 |
| `server/src/controllers/Missions.ts` | 1 |
| `server/src/controllers/BattlePass.ts` | 1 |
| `server/src/utils/brute/resetBrute.ts` | 1 |
| `server/src/utils/battlePass/ensureNextSeason.ts` | 2 |
| `server/src/utils/battlePass/getCurrentSeason.ts` | 1 |
| `server/src/utils/missions/clanMissions.ts` | 1 |
| `server/src/utils/shop/purchaseItem.ts` | 2 |
| `client/src/views/TournamentView.tsx` | 2 |
| `client/src/views/SurvivalView.tsx` | 1 |
| `scripts/giveBattlePassLevels.ts` | 1 |
| `scripts/giveBattlePassLevelsById.ts` | 1 |
| `scripts/checkBattlePassProgress.ts` | 1 |

**Total: ~45 reemplazos en 16 archivos**

Patrones adicionales corregidos:
- `dayjs.utc().endOf('day')` → `getGameDay().endOf('day')`
- `dayjs.utc().add(1, 'day').startOf('day')` → `getGameTomorrow()`
- `currentTournamentDate: dayjs.utc().toDate()` → `currentTournamentDate: getGameDay().toDate()`

---

## Tabla de Horarios

| Hora Argentina | Hora UTC | `getGameDay()` retorna | Evento |
|----------------|----------|----------------------|--------|
| 17:59 | 20:59 | Día actual (ej: March 13) | Último minuto del día de juego actual |
| **18:00** | **21:00** | **Día siguiente (ej: March 14)** | **Reset diario: cron dispara dailyJob** |
| 21:00 | 00:00 | March 14 | Medianoche UTC (sin efecto en el juego) |
| 10:00 | 13:00 | March 14 | Mediodía: mismo día de juego |

---

## Verificaciones Realizadas

- [x] `core` compila sin errores (`tsc --noEmit`)
- [x] `server` compila sin errores (`tsc --noEmit`)
- [x] `client` compila sin errores (`tsc --noEmit`)
- [x] 0 errores de linter en todos los archivos modificados
- [x] 0 instancias residuales de `dayjs.utc().startOf('day')` en el proyecto
- [x] `getGameDay()` y `getGameTomorrow()` exportados correctamente desde `@labrute/core`

---

## Para Modificar el Horario en el Futuro

Si se necesita cambiar la hora del reset diario:

1. **Modificar `GAME_DAY_OFFSET_HOURS`** en `core/src/utils/date.ts`:
   - Valor = cantidad de horas entre la hora deseada de reset (en Argentina) y las 21:00 Argentina
   - Ejemplo: para reset a las 20:00 Argentina → offset = 1 (20+1=21 UTC, 21+1=22 → empuja el "hoy" por 1h)
   - La fórmula exacta: `OFFSET = 24 - HORA_RESET_ARGENTINA - 3`
   - Donde 3 es la diferencia UTC-Argentina

2. **Modificar el cron** en `server/src/server.ts`:
   - `schedule.scheduleJob('0 HORA_UTC * * *', dailyJobFn)`
   - Donde `HORA_UTC = HORA_ARGENTINA + 3`

3. **Modificar el safety scheduler** en `server/src/server.ts`:
   - `if (dayjs.utc().hour() < HORA_UTC) return;`

**No es necesario tocar ningún otro archivo** gracias a la centralización en `getGameDay()`.

---

## Lecciones Aprendidas

1. **Evitar features de timezone de `node-schedule`:** La funcionalidad `tz` con `{ rule, tz }` puede fallar silenciosamente. Es más seguro usar cron UTC simple, especialmente para zonas horarias sin DST como Argentina.

2. **Centralizar el concepto de "día de juego":** Todas las funciones que determinan "hoy" deben usar la misma fuente de verdad. Sin esto, cambiar el horario requiere modificar docenas de archivos con riesgo de inconsistencias.

3. **Compilar antes de hacer push:** Siempre ejecutar `tsc --noEmit` en core, server y client antes de pushear (referencia: BUILD_AND_PUSH_DOCKER.md).

---

## Archivos Modificados

- `core/src/utils/date.ts` - Nueva función `getGameDay()`, `getGameTomorrow()`, constante `GAME_DAY_OFFSET_HOURS`
- `server/src/server.ts` - Cron cambiado a `0 21 * * *`, safety scheduler actualizado
- `server/src/dailyJob.ts` - 13 reemplazos + 3 simplificaciones de tomorrow + import
- `server/src/controllers/Tournaments.ts` - 15 reemplazos + import
- `server/src/controllers/Brutes.ts` - 2 reemplazos + import
- `server/src/controllers/ClanTournaments.ts` - 3 reemplazos + import
- `server/src/controllers/Missions.ts` - 1 reemplazo + import
- `server/src/controllers/BattlePass.ts` - 1 reemplazo + import
- `server/src/utils/brute/resetBrute.ts` - 1 reemplazo + import
- `server/src/utils/battlePass/ensureNextSeason.ts` - 2 reemplazos + import
- `server/src/utils/battlePass/getCurrentSeason.ts` - 1 reemplazo + import
- `server/src/utils/missions/clanMissions.ts` - 1 reemplazo + import
- `server/src/utils/shop/purchaseItem.ts` - 2 reemplazos + import
- `client/src/views/TournamentView.tsx` - 2 reemplazos + import
- `client/src/views/SurvivalView.tsx` - 1 reemplazo + import
- `scripts/giveBattlePassLevels.ts` - 1 reemplazo + import
- `scripts/giveBattlePassLevelsById.ts` - 1 reemplazo + import
- `scripts/checkBattlePassProgress.ts` - 1 reemplazo + import
