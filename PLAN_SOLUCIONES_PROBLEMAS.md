G# Plan de Soluciones - Problemas Reportados

Este documento detalla cada problema identificado, su causa raíz y la solución propuesta.

---

## 1. Evento de más peleas diarias: solo se actualiza el número al usar 1

### Causa
- **Ubicación**: `core/src/brute/getFightsLeft.ts`, `core/src/brute/getMaxFightsPerDay.ts`, datos del authenticate
- **Problema**: Cuando hay modificadores activos del servidor (`doubleFights`, `crazyDay` en `ServerState`), el cliente no los recibe. El `getMaxFightsPerDay(brute, modifiers)` multiplica la base por 2 o 10 según el modifier, pero el cliente llama `getMaxFightsPerDay(brute)` sin modifiers.
- **Resultado**: Se muestra el máximo base (ej: 12) en lugar del máximo con bonus (24 o 120). Al hacer la primera pelea, el servidor devuelve el `fightsLeft` ya actualizado y entonces el cliente muestra el valor correcto.

### Solución
1. Incluir `activeModifiers` (o `nextModifiers`) en la respuesta de `/api/user/authenticate` o en un endpoint de estado del servidor.
2. En el cliente, pasar estos modifiers a `getMaxFightsPerDay` y `getTotalFightsLeft` cuando se calculen las peleas restantes.
3. Alternativa: que el endpoint `getFightsLeft` del brute devuelva directamente `{ fightsLeft, maxFights }` calculados en el servidor con los modifiers correctos, y usar eso en la UI.

---

## 2. Torneos especiales sin cantidad total de participantes

### Causa
- **Ubicación**: `server/src/controllers/Tournaments.ts` → `getSpecial`
- **Problema**: El endpoint devuelve el torneo con `include: { fights: {...} }` pero no incluye el conteo de participantes (`_count: { participants: true }`). La UI del torneo especial podría mostrar "X / ?" o un layout roto si espera un total.

### Solución
1. En `Tournaments.getSpecial`, agregar al select/include:
   ```ts
   _count: { select: { participants: true } }
   ```
2. O calcular: `participantsCount: tournament.participants?.length ?? 64` si se incluye la relación participants.
3. Incluir `participantsCount` en la respuesta para que la UI muestre correctamente "Participantes: X / 64" (o el total real).

---

## 3. Intentos contra el jefe muestran "{current} / {max}" literal

### Causa
- **Ubicación**: `client/src/assets/i18n/es.json` (y otros), `ClanView.tsx`
- **Problema**: La clave usa `{current}` y `{max}`. En i18next la interpolación por defecto suele usar `{{variable}}`. Otras claves del proyecto usan `{{value}}` (ej: `fightsLeft`). Si la configuración espera doble llave, las variables no se interpolan.

### Solución
1. Cambiar en todos los archivos i18n:
   - De: `"bossFightsLeft": "Intentos contra el jefe hoy: {current} / {max}"`
   - A: `"bossFightsLeft": "Intentos contra el jefe hoy: {{current}} / {{max}}"`
2. Verificar que la llamada sea: `t('bossFightsLeft', { current: bossFightsLeft, max: 2 })` (ya está correcto en `ClanView.tsx` línea 875).

---

## 4. Botón "REGISTERFORNEXTCLANTOURNAMENT" sin traducir

### Causa
- **Ubicación**: `client/src/assets/i18n/*.json`
- **Problema**: La clave `registerForNextClanTournament` no existe en los archivos de traducción. i18next devuelve la clave cuando no encuentra traducción.

### Solución
1. Agregar en todos los idiomas (ej. en `es.json`):
   ```json
   "registerForNextClanTournament": "Inscribir para el próximo torneo de clan"
   ```
2. En `en.json`:
   ```json
   "registerForNextClanTournament": "Register for next clan tournament"
   ```
3. Repetir para fr, de, it, pt, ru, ko, etc.

---

## 5. Textos "ClanTournament" y "ClanTournamentNext" sin traducir

### Causa
- **Ubicación**: `client/src/assets/i18n/*.json`, `ClanView.tsx` líneas 526, 587
- **Problema**: Las claves `clanTournament` y `clanTournamentNext` no existen en i18n. Se usan en:
   - `t('clanTournament')` como título del enlace y del resumen
   - `t('clanTournamentNext')` cuando no hay torneo hoy registrado

### Qué hacen estos elementos
- **`clanTournament`** (línea 526): Es un **enlace** en la barra de navegación del clan (junto a "Volver a celda", "Ranking", "Foro", etc.). Al hacer clic navega a `/{brute}/clan/{clanId}/tournament`, es decir, lleva a la vista del torneo de clanes del clan actual (donde se ven guerras, participantes, etc.).
- **`clanTournamentNext`** (línea 587): Es un **texto de estado** dentro del resumen del torneo de clanes. Se muestra cuando el clan **no** está inscrito hoy (`tournamentSummary?.hasToday` es false). Indica "Próximo torneo" (o similar). Si el clan ya está inscrito hoy, en su lugar se muestra `clanTournamentTodayRegistered` ("Inscrito al torneo de hoy").

### Solución
1. Agregar en los archivos i18n:
   - `"clanTournament": "Torneo de Clanes"` (es)
   - `"clanTournamentNext": "Próximo torneo"` (es)
   - `"clanTournamentTodayRegistered": "Inscrito al torneo de hoy"` (si falta)
2. Verificar que `clanTournamentTodayRegistered` exista (usado en línea 586).

---

## 6. "Parámetros inválidos" al inscribirse al torneo de clanes

### Causa
- **Ubicación**: `server/src/controllers/ClanTournaments.ts` línea 136
- **Problema**: Cuando el clan ya está registrado en el torneo, el servidor lanza `ExpectedError(translate('invalidParameters', user))`. El mensaje genérico confunde al usuario.

### Solución
1. Crear una nueva clave de traducción: `clanTournamentAlreadyRegistered`
   - es: "Tu clan ya está inscrito en el próximo torneo."
   - en: "Your clan is already registered for the next tournament."
2. En `ClanTournaments.register`, reemplazar:
   ```ts
   throw new ExpectedError(translate('invalidParameters', user));
   ```
   por:
   ```ts
   throw new ExpectedError(translate('clanTournamentAlreadyRegistered', user));
   ```
3. Si el error viene por `missingParameters` (brute o clanId vacíos), el cliente debe asegurarse de enviar `{ brute: bruteId, clanId }` en el body del POST. El `Fetch` ya envía JSON correctamente.

---

## 7. Tarjeta de progreso diario debajo de las habilidades

### Causa
- **Ubicación**: `client/src/views/CellView.tsx`, `client/src/components/Cell/CellMain.tsx`
- **Problema**: `CellDailyProgress` está dentro de `CellMain` al inicio (línea 170). El orden actual es: Nivel/XP → Body/Stats → **CellDailyProgress** → Register All → Skills temporales → etc. Las habilidades (CellSkills) están en el Box de la izquierda (CellWeapons, CellSkills, CellPets), y CellMain está a la derecha.

### Solución
1. Mover `CellDailyProgress` fuera de `CellMain`.
2. En `CellView.tsx`, colocarlo dentro del `Box` que tiene `CellWeapons`, `CellSkills`, `CellPets`, justo después de `CellPets`:
   ```tsx
   <CellWeapons />
   <CellSkills />
   <CellPets sx={{ mt: 2 }} />
   <CellDailyProgress sx={{ mt: 2 }} />
   ```
3. Eliminar `CellDailyProgress` de `CellMain.tsx`.

---

## 8. Botón "Inscribir a todos los brutos" reaparece después de pelear

### Causa
- **Ubicación**: `client/src/components/Cell/CellMain.tsx`, flujo de datos de `useAuth`
- **Problema**: `hasUnregisteredBrutes` se calcula con `user.brutes.some((b) => !b.registeredForTournament && !b.canRankUpSince)`. Tras `registerAllDaily`, el frontend actualiza `updateData` con `registeredForTournament: true`. Pero:
   - Si hay un `window.location.reload()` después de pelear (p. ej. en auto-fight o al volver de una pelea), se pierde el estado en memoria y se vuelve a cargar desde el servidor.
   - El `authenticate` devuelve los brutes con su `registeredForTournament` actual. Si el reload ocurre antes de que el backend haya procesado la inscripción, o si hay un bug en la sincronización, podría mostrarse el botón de nuevo.
   - Otra posibilidad: `registerAllDaily` excluye brutes con `canRankUpSince` y `eventId`. Si algún brute no cumple los criterios, no se inscribe. Pero `hasUnregisteredBrutes` excluye `canRankUpSince`. Puede haber un desajuste: brutes que no se inscriben (eventId) pero que no cuentan para `hasUnregisteredBrutes`.

### Solución
1. Verificar que tras una pelea no se haga reload innecesario; si se hace, asegurarse de que el backend ya haya actualizado `registeredForTournament` antes.
2. Tras `registerAllDaily`, si el success devuelve `registered: N`, no mostrar el botón aunque `hasUnregisteredBrutes` siga en true hasta el próximo fetch (evitar parpadeos).
3. Añadir un estado local `justRegisteredAll` que oculte el botón hasta que se recargue el user, para evitar que reaparezca inmediatamente.
4. Revisar que `registerAllDaily` y la lógica de `hasUnregisteredBrutes` usen los mismos criterios (canRankUpSince, eventId, deletedAt).

---

## 9. Simplificar UI de torneos en una sola sección con pestañas

### Causa
- **Ubicación**: `client/src/routes.tsx`, `client/src/components/Cell/*`, `client/src/views/*`
- **Problema**: Actualmente hay múltiples componentes y rutas:
   - `CellTournament` → torneo diario
   - `CellSpecialTournament` → torneo especial
   - `CellGlobalTournament` → torneo global
   - Copa del Rey y Torneo de Clanes en otras vistas
   - Rutas: `/tournament/:date`, `/tournament/special/:date`, `/tournament/global/:date`, `/tournament/copa-del-rey/:type/:date`, `/clan/:id/tournament`

### Solución
1. Crear una nueva ruta unificada: `/:bruteName/tournament` (o `/:bruteName/tournament/:date` si se quiere filtrar por fecha).
2. Crear una vista `UnifiedTournamentView` con pestañas (tabs):
   - **Torneo Diario**: contenido actual de `TournamentView` (tipo daily)
   - **Torneo Global**: contenido de `GlobalTournamentView`
   - **Torneo Especial**: contenido de `TournamentView` (tipo special)
   - **Copa del Rey**: contenido de `CopaDelReyView`
   - **Torneo de Clanes**: redirigir o embedir la lógica de `ClanTournamentView` (requiere clanId; si no hay clan, mostrar mensaje o redirigir)

3. En `CellMain`, reemplazar los múltiples componentes (CellTournament, CellSpecialTournament, CellGlobalTournament) por un único botón/enlace:
   ```tsx
   <FantasyButton to={`/${brute.name}/tournament`}>
     {t('tournament')}
   </FantasyButton>
   ```

4. En `UnifiedTournamentView`, usar `Tabs` de MUI con:
   - `tournament.daily`
   - `tournament.global`
   - `tournament.special`
   - `tournament.copaDelRey`
   - `tournament.clan`

5. Mantener las rutas actuales como redirects o rutas internas (hash/query) para compatibilidad si hace falta.

---

## Resumen de archivos a modificar

| Problema | Archivos |
|----------|----------|
| 1. Peleas bonus | `core/`, `server/controllers/Users.ts` o auth, `client/` hooks o componentes que muestran fightsLeft |
| 2. Participants torneo especial | `server/controllers/Tournaments.ts` |
| 3. bossFightsLeft | `client/assets/i18n/*.json` |
| 4. registerForNextClanTournament | `client/assets/i18n/*.json` |
| 5. clanTournament, clanTournamentNext | `client/assets/i18n/*.json` |
| 6. Parámetros inválidos | `server/controllers/ClanTournaments.ts`, `server/i18n/*.json`, `client/assets/i18n/*.json` |
| 7. Progreso diario | `client/views/CellView.tsx`, `client/components/Cell/CellMain.tsx` |
| 8. Inscribir todos | `client/components/Cell/CellMain.tsx`, posiblemente `useAuth` o flujo de reload |
| 9. UI torneos | `client/routes.tsx`, nueva `UnifiedTournamentView`, `CellMain.tsx`, eliminar o simplificar CellTournament, CellSpecialTournament, CellGlobalTournament |

---

## Orden sugerido de implementación

1. **Rápidos (i18n y mensajes)**: 3, 4, 5, 6  
2. **Layout**: 7  
3. **Backend**: 2  
4. **Lógica de estado**: 1, 8  
5. **Refactor grande**: 9  
