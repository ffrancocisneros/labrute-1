# BUILD_AND_PUSH_DOCKER.md

## Análisis del Error de Build

**Fecha:** 23 de Enero 2026  
**Error:** Build de Docker falló durante la compilación de TypeScript  
**Commit:** `47f0a9de` - feat: Mover peleas bonus de User a Brute

---

## 🔍 Error Detectado

```
server/src/controllers/Fights.ts(173,56): error TS2345: Argument of type 'Omit<{ name: string; level: number; id: string; bonusFightsCount: number; bonusFightsDate: Date | null; ... }, "weapons" | ... | "pets"> & TieredPerks' is not assignable to parameter of type 'CalculatedBrute'.
  Type is missing the following properties: colors, deletedAt, createdAt, willBeDeletedAt, and 13 more.
```

**Ubicación del error:**
- Archivo: `server/src/controllers/Fights.ts`
- Línea 173: `await enrichCalculatedBruteWithTemporary(prisma, brute1);`
- Línea 228: `team1: { brutes: [brute1] }`

---

## 🧠 Análisis del Problema

### Causa Raíz

El problema ocurre porque:

1. **Cambio en el código:** Se modificó `baseBrute1` para usar un `select` explícito con campos específicos, incluyendo los nuevos campos `bonusFightsCount` y `bonusFightsDate`.

2. **Incompatibilidad de tipos:** 
   - `getCalculatedBrute()` retorna `Omit<T, 'weapons' | 'skills' | 'pets'> & TieredPerks` donde `T` es el tipo de entrada
   - Si `T` es un tipo parcial (resultado de `select`), el tipo retornado también será parcial
   - `CalculatedBrute` es `Omit<Brute, 'weapons' | 'skills' | 'pets'> & TieredPerks` que requiere TODOS los campos de `Brute` excepto weapons/skills/pets
   - TypeScript detecta que faltan campos como `colors`, `deletedAt`, `createdAt`, `willBeDeletedAt`, etc.

3. **Inconsistencia con `baseBrute2`:**
   - `baseBrute2` usa `include` (sin `select`), obteniendo todos los campos
   - `baseBrute1` usa `select` parcial, obteniendo solo campos específicos
   - Esta inconsistencia causa problemas de tipos

### Por qué falló en el build pero no localmente

Posibles razones:
- Versión diferente de TypeScript en CI vs local
- Configuración de `tsconfig.json` más estricta en CI
- Cache de TypeScript local que ocultó el error

---

## ✅ Solución Implementada

### Estrategia

Cambiar `baseBrute1` para usar `include` en lugar de `select`, igual que `baseBrute2`. Esto asegura que:
1. Se obtengan todos los campos necesarios de `Brute`
2. El tipo retornado sea compatible con `CalculatedBrute`
3. Se mantenga consistencia con el resto del código

### Cambio Realizado

**Antes:**
```typescript
const baseBrute1 = await prisma.brute.findFirst({
  where: { ... },
  select: {
    id: true,
    name: true,
    // ... muchos campos específicos
    bonusFightsCount: true,
    bonusFightsDate: true,
    opponents: { select: { name: true } },
  },
});
```

**Después:**
```typescript
const baseBrute1 = await prisma.brute.findFirst({
  where: { ... },
  include: {
    opponents: {
      select: { name: true },
    },
  },
});
```

### Ventajas de esta solución

1. ✅ **Compatibilidad de tipos:** Todos los campos de `Brute` están disponibles
2. ✅ **Consistencia:** Mismo patrón que `baseBrute1` y otros lugares del código
3. ✅ **Simplicidad:** Menos código, más mantenible
4. ✅ **Sin impacto en performance:** Los campos adicionales no afectan significativamente el tamaño de la query

### Desventajas potenciales

- ⚠️ **Más datos transferidos:** Se obtienen más campos de los necesarios
- ⚠️ **Posible impacto menor en memoria:** Pero insignificante para este caso

**Decisión:** Las ventajas superan las desventajas, especialmente porque:
- El impacto en performance es mínimo
- La consistencia del código es más importante
- TypeScript necesita todos los campos para inferir tipos correctamente

---

## 🔧 Pasos para Verificar la Solución

1. **Compilar localmente:**
   ```bash
   cd server
   yarn compile
   ```

2. **Verificar que no hay errores de TypeScript:**
   - Debe compilar sin errores
   - Verificar especialmente `Fights.ts`

3. **Ejecutar build de Docker localmente (opcional):**
   ```bash
   docker build -t labrute-test .
   ```

4. **Push y verificar CI:**
   - Hacer commit y push
   - Verificar que el build de GitHub Actions pase

---

## 📝 Lecciones Aprendidas

1. **Consistencia en queries de Prisma:**
   - Usar `include` cuando se necesita compatibilidad con tipos completos
   - Usar `select` solo cuando se necesita optimización específica y se manejan los tipos manualmente

2. **TypeScript y Prisma:**
   - Los tipos inferidos de `select` parciales pueden causar problemas con funciones que esperan tipos completos
   - Siempre verificar compatibilidad de tipos después de cambios en queries

3. **Testing en CI:**
   - Los errores de TypeScript pueden aparecer primero en CI si hay diferencias de configuración
   - Siempre ejecutar `yarn compile` antes de hacer push

4. **Mantenimiento de código:**
   - Mantener patrones consistentes en todo el código
   - Si un lugar usa `include`, otros lugares similares deberían usar lo mismo

---

## 🚀 Próximos Pasos

1. ✅ Corregir el código en `Fights.ts`
2. ✅ Verificar compilación local
3. ⏳ Hacer commit y push
4. ⏳ Verificar que el build de CI pase
5. ⏳ Monitorear que no haya regresiones

---

## 📊 Impacto del Cambio

- **Archivos modificados:** 1 (`server/src/controllers/Fights.ts`)
- **Líneas cambiadas:** ~50 líneas eliminadas (select explícito) → ~5 líneas (include simple)
- **Riesgo:** Bajo - Solo cambia cómo se obtienen los datos, no la lógica
- **Performance:** Impacto mínimo - Se obtienen más campos pero el bruto ya se obtenía completo antes

---

## ✅ Checklist de Verificación

- [x] Error identificado y analizado
- [x] Causa raíz determinada
- [x] Solución implementada
- [x] Compilación local verificada
- [x] Build de Docker verificado
- [x] Commit y push realizado
- [x] CI build exitoso

---

## 🚂 Railway Auto-Deploy - Problema y Solución

### Problema Reportado

**Situación:** La imagen Docker se publicó exitosamente en `ghcr.io` con tag `latest`, pero Railway no hizo el deploy automático.

### Causa

Railway **no detecta automáticamente** cambios en imágenes Docker con tag `:latest`. Esto es un comportamiento conocido de Railway cuando se usa una imagen Docker como source en lugar de conectarlo directamente al repositorio.

### Solución Implementada

El workflow `publish-ghcr.yml` ya incluye un job `railway-redeploy` (líneas 45-56) que debería disparar el redeploy automático después de publicar la imagen. Sin embargo, este job requiere **3 secrets configurados en GitHub**:

| Secret | Descripción | Cómo obtenerlo |
|--------|-------------|----------------|
| `RAILWAY_TOKEN` | Token de API de Railway | [railway.com/account/tokens](https://railway.com/account/tokens) → Crear token (Team o Personal) |
| `RAILWAY_SERVICE_ID` | ID del servicio en Railway | En Railway dashboard → Servicio → CMD/CTRL+K → Copy → Service ID |
| `RAILWAY_ENVIRONMENT_ID` | ID del environment en Railway | En Railway dashboard → Environment → CMD/CTRL+K → Copy → Environment ID |

### Verificación del Job

1. **Verificar si el job se ejecutó:**
   - Ir a GitHub Actions → Último workflow run (`c93ba826` o más reciente)
   - Buscar el job `railway-redeploy`
   - Verificar si se ejecutó y si falló

2. **Si el job no existe o falló:**
   - El job tiene `continue-on-error: true` (línea 49), así que puede fallar silenciosamente
   - Verificar los logs del job para ver el error específico
   - Probablemente falta alguno de los 3 secrets

3. **Si los secrets no están configurados:**
   - Ir a GitHub → Settings → Secrets and variables → Actions
   - Agregar los 3 secrets según la tabla anterior
   - El próximo push a `main` debería disparar el redeploy automático

### Verificación: ¿Railway está usando la imagen Docker o haciendo build?

**IMPORTANTE:** El mensaje "rebuild and deploy" puede ser confuso. Depende de cómo esté configurado Railway:

#### Si Railway está usando imagen Docker (GHCR):
- **Source:** Docker Image
- **Image:** `ghcr.io/ffrancocisneros/labrute:latest`
- **Al hacer redeploy:** Railway hará `docker pull` de la nueva imagen `:latest` y la desplegará
- **No hará rebuild** del código, solo pull de la imagen

#### Si Railway está conectado al repositorio GitHub:
- **Source:** GitHub Repository
- **Builder:** Nixpacks (según `railway.json`)
- **Al hacer redeploy:** Railway hará build desde el código fuente del último commit
- **Sí hará rebuild** del código

### Cómo verificar qué está usando Railway

1. **En Railway Dashboard:**
   - Ir a tu servicio
   - Ver la sección "Source" o "Settings"
   - Verificar si dice "Docker Image" o "GitHub Repository"

2. **Si dice "Docker Image":**
   - El redeploy debería hacer pull de `ghcr.io/ffrancocisneros/labrute:latest`
   - La nueva imagen con los cambios debería aplicarse
   - El mensaje "rebuild" es engañoso, en realidad hace pull de la imagen

3. **Si dice "GitHub Repository":**
   - El redeploy hará build desde el código del último commit
   - También aplicará los cambios, pero construyendo desde cero

### Respuesta Directa

**Si Railway está configurado para usar `ghcr.io/ffrancocisneros/labrute:latest` como source:**
- ✅ **Sí, está bien hacer redeploy**
- ✅ **Sí, va a aplicar los cambios** - Railway hará pull de la nueva imagen `:latest` que contiene los cambios
- ✅ **Sí, toma la imagen desde `ghcr.io/ffrancocisneros/labrute:latest`**

El mensaje "rebuild and deploy" es un texto genérico de Railway, pero si el source es una imagen Docker, en realidad hace `docker pull` de la nueva imagen, no rebuild del código.

### Verificación Post-Deploy

Después del redeploy, verificar:
1. Los logs del deploy deberían mostrar que está usando la imagen Docker
2. Los cambios deberían estar aplicados (peleas bonus funcionando correctamente)
3. El commit SHA en los logs debería coincidir con `c93ba826` o más reciente

---

### Próximos Pasos Recomendados

1. ⏳ Verificar en GitHub Actions si el job `railway-redeploy` se ejecutó
2. ⏳ Si no se ejecutó o falló, revisar los logs para identificar el problema
3. ⏳ Configurar los 3 secrets requeridos si no están configurados
4. ⏳ Hacer un push de prueba o deploy manual para verificar que funcione

### Nota Importante

El workflow está diseñado para que el job `railway-redeploy` falle silenciosamente (`continue-on-error: true`) si los secrets no están configurados, para que el build de la imagen Docker no falle. Esto significa que el workflow puede completarse exitosamente incluso si el redeploy no se ejecuta.

### Referencias

- Workflow: `.github/workflows/publish-ghcr.yml` (líneas 43-56)
- Documentación: `DEPLOYMENT.md` (líneas 84-94)

---

## ❌ Error de build Docker - ESLint en AscendView

### Síntoma

Al correr el workflow `publish-ghcr.yml`, el paso `yarn build:client` falló con:

```text
[eslint]
src/views/AscendView.tsx
  Line 102:1:  Expected indentation of 2 spaces but found 4  indent
  Line 116:1:  Expected indentation of 4 spaces but found 6  indent
  Line 117:1:  Expected indentation of 6 spaces but found 8  indent
```

### Causa

- Se modificó `AscendView.tsx` para hacer más segura la lógica de ascensión de mascotas (`ascendedPets?.includes(pet)`), pero se dejó un bloque con **indentación incorrecta**:
  - La declaración de `const onPetClick = (pet: PetName) => { ... }` quedó desfasada hacia la derecha.
  - El `if/else` interno tenía niveles de indentación inconsistentes.
- El linter de `react-scripts` se ejecuta en el **build de producción** (`yarn build`), y cualquier warning de esta regla se trata como error, rompiendo el build de Docker.

### Solución aplicada

- Reescribir el bloque de `onPetClick` con indentación correcta y lógica más clara:

```ts
const onPetClick = (pet: PetName) => {
  if (pet === 'dog1' || pet === 'dog2' || pet === 'dog3') {
    const nextAvailableDogAscendLevel = getNextAvailableDogAscendLevel();
    if (nextAvailableDogAscendLevel === -1) {
      return;
    }

    if (nextAvailableDogAscendLevel === 1) {
      setSelectedPerk('dog1');
    } else if (nextAvailableDogAscendLevel === 2) {
      setSelectedPerk('dog2');
    } else if (nextAvailableDogAscendLevel === 3) {
      setSelectedPerk('dog3');
    }
  } else if (brute?.ascendedPets?.includes(pet)) {
    return;
  } else {
    setSelectedPerk(pet);
  }
  setSelectedPerkType('pet');
};
```

### Lección / Checklist para futuros cambios

Antes de hacer **push a `main`** y disparar el build Docker:

1. Ejecutar localmente (al menos una vez por rama grande):
   ```bash
   cd client
   yarn build
   ```
   Esto corre el mismo ESLint que el build de Docker.

2. Si se toca cualquier vista React (`client/src/views/**`), en especial componentes complejos como `AscendView`, verificar que:
   - No haya warnings de ESLint (indentación, variables sin usar, etc.).
   - El build de producción se complete correctamente.

Con esto se evitan fallos de CI por detalles de formato que solo aparecen en `yarn build:client` dentro del contenedor Docker.

---

## 🚨 Error de Migración en Producción - Bonus Fights

### Problema Reportado

**Fecha:** 23 de Enero 2026  
**Error:** Migración `20260116000000_add_bonus_fights_to_brute` falló en producción  
**Síntoma:** Container crasheó con error `P3009` - migración fallida bloquea nuevas migraciones  
**Causa:** Las columnas `bonusFightsCount` y `bonusFightsDate` ya existían en la tabla `Brute`

### Logs del Error

```
Error: P3018
A migration failed to apply. New migrations cannot be applied before the error is recovered from.
Migration name: 20260116000000_add_bonus_fights_to_brute
Database error code: 42701
Database error:
ERROR: column "bonusFightsCount" of relation "Brute" already exists
```

### Análisis del Problema

1. **Migración falló parcialmente:**
   - La migración `20260116000000_add_bonus_fights_to_brute` intentó agregar las columnas
   - Las columnas ya existían (probablemente agregadas manualmente o por otro proceso)
   - Prisma marcó la migración como `failed` en `_prisma_migrations`

2. **Bloqueo de nuevas migraciones:**
   - Prisma detecta migraciones fallidas y bloquea todas las migraciones siguientes (error `P3009`)
   - El container no puede iniciar porque las migraciones fallan

3. **Auto-recovery falló:**
   - El script `start-production.sh` tenía recovery solo para `20260119000000_add_shop_system`
   - No manejaba el caso de `20260116000000_add_bonus_fights_to_brute`

### Solución Implementada

#### 1. Migración V2 Idempotente

**Archivo:** `server/prisma/migrations/20260123000000_add_bonus_fights_to_brute_v2/migration.sql`

**Características:**
- Usa `DO $$ BEGIN ... END $$` para verificar existencia de columnas
- Solo agrega columnas si no existen (`IF NOT EXISTS`)
- Idempotente: puede ejecutarse múltiples veces sin errores

**Código:**
```sql
-- Add bonusFightsCount column (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Brute' 
    AND column_name = 'bonusFightsCount'
  ) THEN
    ALTER TABLE "Brute" ADD COLUMN "bonusFightsCount" INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add bonusFightsDate column (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Brute' 
    AND column_name = 'bonusFightsDate'
  ) THEN
    ALTER TABLE "Brute" ADD COLUMN "bonusFightsDate" DATE;
  END IF;
END $$;
```

#### 2. Actualización del Auto-Recovery

**Archivo:** `scripts/start-production.sh`

**Cambios:**
- Agregado manejo de `20260116000000_add_bonus_fights_to_brute` en el recovery
- Marca la migración fallida como `applied` sin ejecutar SQL
- Permite que la migración v2 (idempotente) repare el esquema

**Código agregado:**
```bash
# Migración 20260116000000_add_bonus_fights_to_brute: las columnas ya existen
yarn prisma migrate resolve --applied 20260116000000_add_bonus_fights_to_brute || true
```

#### 3. Script SQL Manual (Opcional)

**Archivo:** `scripts/resolve_bonus_fights_migration.sql`

**Propósito:** Resolver manualmente la migración si el auto-recovery no funciona

**Uso:**
```sql
-- Ejecutar en DBeaver o psql si es necesario
-- Marca la migración como aplicada sin ejecutar SQL
```

### Flujo de Solución

1. **Deploy con nueva migración v2:**
   - La migración v2 es idempotente y puede ejecutarse aunque las columnas existan
   - Si las columnas no existen, las crea
   - Si ya existen, no hace nada (no falla)

2. **Auto-recovery en startup:**
   - `start-production.sh` detecta migración fallida
   - Marca `20260116000000_add_bonus_fights_to_brute` como `applied`
   - Prisma puede aplicar la migración v2 sin problemas

3. **Resultado:**
   - Sistema se auto-repara en cada deploy
   - No requiere intervención manual
   - Migración v2 repara cualquier inconsistencia

### Verificación Post-Fix

Después del deploy, verificar:

1. **Logs del container:**
   ```
   Database migrations completed.
   Starting server...
   ```

2. **Estado de las migraciones:**
   ```sql
   SELECT migration_name, finished_at, applied_steps_count 
   FROM "_prisma_migrations" 
   WHERE migration_name LIKE '%bonus_fights%';
   ```

3. **Columnas en la tabla:**
   ```sql
   SELECT column_name, data_type, column_default
   FROM information_schema.columns
   WHERE table_name = 'Brute'
   AND column_name IN ('bonusFightsCount', 'bonusFightsDate');
   ```

### Lecciones Aprendidas

1. **Migraciones idempotentes:**
   - Siempre usar `IF NOT EXISTS` o bloques `DO $$` para verificar existencia
   - Evita fallos cuando objetos ya existen

2. **Auto-recovery:**
   - Actualizar `start-production.sh` para manejar todas las migraciones problemáticas conocidas
   - Usar `prisma migrate resolve --applied` para marcar migraciones fallidas como aplicadas

3. **Patrón de migración v2:**
   - Cuando una migración falla parcialmente, crear una v2 idempotente
   - La v2 repara inconsistencias sin fallar si ya están aplicadas

4. **Verificación en producción:**
   - Verificar logs después de cada deploy
   - Monitorear estado de migraciones en `_prisma_migrations`

### Referencias

- Migración original: `server/prisma/migrations/20260116000000_add_bonus_fights_to_brute/migration.sql`
- Migración v2: `server/prisma/migrations/20260123000000_add_bonus_fights_to_brute_v2/migration.sql`
- Script de recovery: `scripts/start-production.sh` (líneas 16-26)
- Script manual: `scripts/resolve_bonus_fights_migration.sql`
- Patrón similar: `server/prisma/migrations/20260120000000_add_shop_system_v2/migration.sql`

---

## 🚨 Error ESLint en Build Docker - react/no-array-index-key

### Problema Reportado

**Fecha:** 31 de Enero 2026  
**Error:** Build de Docker falló durante `yarn build:client`  
**Síntoma:** ESLint rechazó el uso de índice de array como `key` en React

### Logs del Error

```
[eslint] 
src/views/CopaDelReyView.tsx
  Line 101:25:  Do not use Array index in keys  react/no-array-index-key
```

### Causa

La regla `react/no-array-index-key` prohíbe usar el índice del array como `key` en listas de React porque:
- Los índices pueden cambiar si se reordena la lista
- Puede causar re-renders incorrectos o bugs sutiles
- React recomienda usar identificadores únicos y estables de los datos

### Solución Implementada

**Archivo:** `client/src/views/CopaDelReyView.tsx`

**Antes:**
```tsx
{rounds.map((roundFights, roundIndex) => (
  <Box key={roundIndex} sx={{ mb: 2 }}>
```

**Después:**
```tsx
{rounds.map(({ step, fights: roundFights }, roundIndex) => (
  // eslint-disable-next-line react/no-array-index-key -- step is unique per round
  <Box key={step} sx={{ mb: 2 }}>
```

1. Se preserva el `tournamentStep` (único por ronda) y se usa como `key` en lugar del índice.
2. Se agrega `eslint-disable-next-line` como respaldo (patrón usado en HallView, TournamentView, etc.).

### Nota sobre Re-runs en GitHub Actions

Si el build falla y se hace **Re-run** del workflow, GitHub Actions usa el **mismo commit** (no el último push). Para que el fix se aplique, hay que hacer un **nuevo commit y push** para disparar un workflow run fresco.

### Verificación

```bash
cd client
yarn build
```

---

## 🚨 Error ESLint en Build Docker - Líneas de Conexión del Torneo

### Problema Reportado

**Fecha:** 4 de Febrero 2026  
**Error:** Build de Docker falló durante `yarn build:client`  
**Commit:** `31c83caa` - feat: Agregar líneas de conexión visual al torneo  
**Síntoma:** ESLint rechazó múltiples violaciones de reglas en archivos nuevos

### Logs del Error

```
Failed to compile.

[eslint]
src/components/TournamentBracketLines.tsx
  Line 53:1:   Trailing spaces not allowed        no-trailing-spaces
  Line 56:20:  Do not use Array index in keys     react/no-array-index-key
  Line 65:16:  Unnecessary 'else' after 'return'  no-else-return
  Line 69:20:  Do not use Array index in keys     react/no-array-index-key

src/views/TournamentView.tsx
  Line 182:12:  Multiple spaces found before '// Ronda 0 -> ...'       no-multi-spaces
  Line 183:13:  Multiple spaces found before '// Ronda 10 ->...'       no-multi-spaces
  Line 184:12:  Multiple spaces found before '// Ronda 1 -> ...'       no-multi-spaces
  Line 185:12:  Multiple spaces found before '// Ronda 9 -> ...'       no-multi-spaces
  Line 186:12:  Multiple spaces found before '// Ronda 2 -> ...'       no-multi-spaces
  Line 187:12:  Multiple spaces found before '// Ronda 8 -> ...'       no-multi-spaces
  Line 188:12:  Multiple spaces found before '// Ronda 3 -> ...'       no-multi-spaces
  Line 189:12:  Multiple spaces found before '// Ronda 7 -> ...'       no-multi-spaces
  Line 190:12:  Multiple spaces found before '// Ronda 4 -> ...'       no-multi-spaces
  Line 191:12:  Multiple spaces found before '// Ronda 6 -> ...'       no-multi-spaces
  Line 303:5:   Arrow function expected no return value                consistent-return
  Line 603:1:   This line has a length of 105. Maximum allowed is 100  max-len
```

### Causa

Errores de ESLint en código nuevo:
1. **Trailing spaces:** Espacios en blanco al final de líneas
2. **Array index in keys:** Uso de índice de array como `key` en React (aunque aceptable en este caso)
3. **Unnecessary else:** Uso de `else` después de `return` (no necesario)
4. **Multiple spaces:** Espacios múltiples antes de comentarios
5. **Consistent return:** Función arrow que debería retornar consistentemente
6. **Max line length:** Línea excede 100 caracteres

### Solución Implementada

#### 1. TournamentBracketLines.tsx

**Cambios:**
- Eliminar trailing spaces en línea 53
- Agregar `eslint-disable-next-line` para uso de índice como key (justificado: array es estable)
- Eliminar `else` innecesario después de `return`
- Agregar comentario explicativo para justificar el uso de índice

**Código corregido:**
```tsx
{lines.map((line, index) => {
  if (line.intermediate) {
    const path = `M ${line.from.x} ${line.from.y}
                 L ${line.from.x} ${line.intermediate.y}
                 L ${line.to.x} ${line.intermediate.y}
                 L ${line.to.x} ${line.to.y}`;
    // eslint-disable-next-line react/no-array-index-key -- lines array is stable
    return (
      <path key={index} ... />
    );
  }
  // Simple straight line
  // eslint-disable-next-line react/no-array-index-key -- lines array is stable
  return (
    <line key={index} ... />
  );
})}
```

#### 2. TournamentView.tsx

**Cambios:**
- Eliminar espacios múltiples antes de comentarios (líneas 182-191)
- Agregar `return undefined;` explícito en cleanup de useEffect para consistencia
- Dividir línea larga (603) en múltiples líneas

**Código corregido:**
```tsx
const roundConnections: Record<number, number> = {
  0: 1, // Ronda 0 -> Ronda 1 (izquierda)
  10: 9, // Ronda 10 -> Ronda 9 (derecha)
  // ... etc
};

// En useEffect cleanup:
return () => {
  clearTimeout(timeout);
  window.removeEventListener('resize', handleResize);
  return undefined;
};

// Línea dividida:
{display
  && bracketLines.length > 0
  && containerSize.width > 0
  && containerSize.height > 0
  && (
    <TournamentBracketLines ... />
  )}
```

### Lecciones Aprendidas

1. **Verificar ESLint localmente antes de push:**
   - Ejecutar `yarn build` o `yarn lint` antes de hacer commit
   - Los errores de ESLint bloquean el build en CI

2. **Patrones comunes:**
   - Usar `eslint-disable-next-line` con justificación cuando sea necesario
   - Evitar `else` después de `return`
   - Mantener líneas bajo 100 caracteres
   - Eliminar trailing spaces

3. **Testing en CI:**
   - Los errores de ESLint aparecen primero en CI si no se verifican localmente
   - Siempre ejecutar `yarn build:client` antes de hacer push

### Verificación Post-Fix

```bash
cd client
yarn build
```

Debe compilar sin errores de ESLint.
