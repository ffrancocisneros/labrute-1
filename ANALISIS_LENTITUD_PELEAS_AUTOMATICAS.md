# Análisis de Lentitud en Peleas Automáticas

**Fecha:** Enero 2026  
**Problema:** Las peleas automáticas demoran 35-45 segundos para 10-16 peleas (2.5-4.5 segundos por pelea)  
**Contexto:** Las peleas manuales funcionan bien, solo las automáticas son lentas

---

## 🔍 Análisis de Código

### Flujo de Pelea Automática (`executeAutoFights.ts`)

Por cada pelea en el loop (líneas 111-434), se ejecutan las siguientes operaciones:

#### **1. Queries a Base de Datos (Por Pelea)**

**ANTES de generar la pelea:**
- ✅ Línea 152: `prisma.brute.findFirst` - Obtener bruto actualizado (1 query)
- ✅ Línea 186: `prisma.brute.findFirst` - Obtener oponente completo (1 query)
- ✅ Línea 200: `enrichCalculatedBruteWithTemporary(updatedBrute)` - **2 queries**:
  - `bruteTemporaryEffect.findMany` (skills temporales)
  - `bruteTemporaryWeapon.findMany` (armas temporales)
- ✅ Línea 201: `enrichCalculatedBruteWithTemporary(opponentBrute)` - **2 queries más**:
  - `bruteTemporaryEffect.findMany` (skills temporales del oponente)
  - `bruteTemporaryWeapon.findMany` (armas temporales del oponente)
- ✅ Línea 221: `ServerState.getCurrentEvent(prisma)` - Obtener evento actual (1 query)

**Total antes de pelear: 7 queries por pelea**

**DESPUÉS de generar la pelea:**
- ✅ Línea 212: `prisma.fight.create` - Crear pelea (1 query)
- ✅ Línea 241: `prisma.brute.findFirst` - Obtener userId (1 query redundante)
- ✅ Línea 247: `prisma.brute.update` - Actualizar bruto (1 query)
- ✅ Línea 304: `prisma.brute.findUnique` - Obtener winStreak (1 query redundante)
- ✅ Línea 314: `prisma.brute.update` - Actualizar winStreak (1 query)
- ✅ Línea 383: `prisma.log.create` - Crear log del bruto (1 query)
- ✅ Línea 395: `prisma.log.create` - Crear log del oponente (1 query)

**Total después de pelear: 7 queries por pelea**

**TOTAL: ~14 queries por pelea × 10-16 peleas = 140-224 queries**

---

## 🐌 Posibles Causas de Lentitud

### **1. Queries Redundantes de Habilidades Temporales (CRÍTICO)**

**Problema:**
- `enrichCalculatedBruteWithTemporary` se llama **2 veces por pelea** (bruto + oponente)
- Cada llamada hace **2 queries** (skills + weapons temporales)
- **Total: 4 queries por pelea solo para habilidades temporales**
- Para 10-16 peleas: **40-64 queries adicionales**

**Impacto estimado:** 2-3 segundos por pelea (si cada query toma 50-75ms)

**Solución:**
- Cachear habilidades temporales al inicio del loop de peleas automáticas
- Pre-cargar todas las habilidades temporales de los oponentes en batch
- Usar `Promise.all` para cargar skills y weapons en paralelo
- Cachear en memoria durante la ejecución de `executeAutoFights`

---

### **2. Queries Redundantes de Bruto**

**Problema:**
- Línea 152: Se obtiene el bruto completo antes de cada pelea
- Línea 241: Se vuelve a obtener solo para `userId` (ya se tenía en línea 152)
- Línea 304: Se obtiene solo para `winStreak` (podría incluirse en línea 152)

**Impacto estimado:** 0.5-1 segundo por pelea

**Solución:**
- Incluir `userId` y `winStreakCurrent/winStreakMax` en la query de línea 152
- Eliminar queries redundantes (líneas 241 y 304)

---

### **3. Queries Secuenciales en lugar de Paralelas**

**Problema:**
- Líneas 200-201: `enrichCalculatedBruteWithTemporary` se llama secuencialmente
- Cada función hace 2 queries secuenciales (skills, luego weapons)
- Podrían ejecutarse en paralelo con `Promise.all`

**Impacto estimado:** 0.5-1 segundo por pelea

**Solución:**
```typescript
// En lugar de:
await enrichCalculatedBruteWithTemporary(prisma, updatedCalculatedBrute);
await enrichCalculatedBruteWithTemporary(prisma, opponentCalculatedBrute);

// Hacer:
await Promise.all([
  enrichCalculatedBruteWithTemporary(prisma, updatedCalculatedBrute),
  enrichCalculatedBruteWithTemporary(prisma, opponentCalculatedBrute),
]);
```

---

### **4. Falta de Índices en Tablas Temporales**

**Problema:**
- `bruteTemporaryEffect` y `bruteTemporaryWeapon` pueden no tener índices optimizados
- Las queries usan `bruteId` y `expiresAt` pero pueden no estar indexadas correctamente

**Impacto estimado:** 0.5-1 segundo por pelea si hay muchos registros

**Solución:**
- Verificar índices en `schema.prisma`:
  ```prisma
  model BruteTemporaryEffect {
    @@index([bruteId, expiresAt])
  }
  model BruteTemporaryWeapon {
    @@index([bruteId, expiresAt])
  }
  ```

---

### **5. Procesamiento Síncrono de Objetivos/Logros**

**Problema:**
- Líneas 265-294: Actualizaciones de objetivos y logros son síncronas
- Aunque algunas están en `void async`, otras bloquean el flujo
- Cada actualización puede hacer queries adicionales

**Impacto estimado:** 0.5-1 segundo por pelea

**Solución:**
- Mover más procesamiento a background (`void async`)
- Agrupar actualizaciones en transacciones cuando sea posible
- Usar `Promise.all` para operaciones independientes

---

### **6. Obtención de Evento Actual en Cada Pelea**

**Problema:**
- Línea 221: `ServerState.getCurrentEvent(prisma)` se llama en cada pelea
- El evento actual no cambia durante la ejecución de peleas automáticas

**Impacto estimado:** 0.2-0.5 segundos por pelea

**Solución:**
- Obtener el evento una vez al inicio de `executeAutoFights`
- Reutilizar el valor en todas las peleas

---

### **7. Regeneración de Oponentes**

**Problema:**
- Líneas 411-423: Se regeneran oponentes cuando quedan pocos
- `getOpponents` puede hacer múltiples queries complejas

**Impacto estimado:** Variable, pero puede ser significativo

**Solución:**
- Pre-generar más oponentes al inicio
- Cachear oponentes generados

---

## 📊 Resumen de Impacto Estimado

| Causa | Impacto por Pelea | Impacto Total (15 peleas) | Prioridad |
|-------|-------------------|---------------------------|-----------|
| Queries de habilidades temporales | 2-3 seg | 30-45 seg | 🔴 CRÍTICA |
| Queries redundantes de bruto | 0.5-1 seg | 7.5-15 seg | 🟡 ALTA |
| Queries secuenciales | 0.5-1 seg | 7.5-15 seg | 🟡 ALTA |
| Falta de índices | 0.5-1 seg | 7.5-15 seg | 🟡 ALTA |
| Procesamiento síncrono | 0.5-1 seg | 7.5-15 seg | 🟢 MEDIA |
| Evento actual repetido | 0.2-0.5 seg | 3-7.5 seg | 🟢 MEDIA |
| Regeneración de oponentes | Variable | Variable | 🟢 MEDIA |

**Total estimado:** 35-60 segundos para 15 peleas (coincide con el problema reportado)

---

## ✅ Soluciones Recomendadas (Por Prioridad)

### **Solución 1: Cachear Habilidades Temporales (CRÍTICA)**

```typescript
// Al inicio de executeAutoFights, antes del loop:
const temporaryEffectsCache = new Map<string, { skills: string[], weapons: string[] }>();

// Función helper para obtener desde cache o DB:
const getTemporaryEffects = async (bruteId: string) => {
  if (temporaryEffectsCache.has(bruteId)) {
    return temporaryEffectsCache.get(bruteId)!;
  }
  
  const [skills, weapons] = await Promise.all([
    prisma.bruteTemporaryEffect.findMany({
      where: { bruteId, expiresAt: { gt: new Date() } },
      select: { skillName: true },
    }),
    prisma.bruteTemporaryWeapon.findMany({
      where: { bruteId, expiresAt: { gt: new Date() } },
      select: { weaponName: true },
    }),
  ]);
  
  const result = {
    skills: skills.map(s => s.skillName),
    weapons: weapons.map(w => w.weaponName),
  };
  
  temporaryEffectsCache.set(bruteId, result);
  return result;
};

// Pre-cargar efectos temporales de todos los oponentes antes del loop
const opponentIds = opponents.map(o => o.id);
await Promise.all(opponentIds.map(id => getTemporaryEffects(id)));

// Dentro del loop, usar cache:
const bruteEffects = await getTemporaryEffects(updatedBrute.id);
const opponentEffects = await getTemporaryEffects(opponentBrute.id);
```

**Ahorro estimado:** 30-45 segundos para 15 peleas

---

### **Solución 2: Optimizar Queries de Bruto**

```typescript
// Línea 152: Incluir todos los campos necesarios
const updatedBrute = await prisma.brute.findFirst({
  where: { id: brute.id, deletedAt: null },
  select: {
    id: true,
    userId: true,  // ← Agregar
    winStreakCurrent: true,  // ← Agregar
    winStreakMax: true,  // ← Agregar
    // ... otros campos existentes
  },
});

// Eliminar líneas 241 y 304 (queries redundantes)
```

**Ahorro estimado:** 7.5-15 segundos para 15 peleas

---

### **Solución 3: Paralelizar Queries**

```typescript
// Líneas 200-201: Ejecutar en paralelo
await Promise.all([
  enrichCalculatedBruteWithTemporary(prisma, updatedCalculatedBrute),
  enrichCalculatedBruteWithTemporary(prisma, opponentCalculatedBrute),
]);

// Dentro de enrichCalculatedBruteWithTemporary:
// Ejecutar skills y weapons en paralelo
const [effects, weapons] = await Promise.all([
  prisma.bruteTemporaryEffect.findMany(...),
  prisma.bruteTemporaryWeapon.findMany(...),
]);
```

**Ahorro estimado:** 7.5-15 segundos para 15 peleas

---

### **Solución 4: Cachear Evento Actual**

```typescript
// Al inicio de executeAutoFights:
const currentEvent = await ServerState.getCurrentEvent(prisma);

// Dentro del loop, usar currentEvent en lugar de línea 221
```

**Ahorro estimado:** 3-7.5 segundos para 15 peleas

---

### **Solución 5: Verificar Índices**

```prisma
model BruteTemporaryEffect {
  // ... campos existentes
  @@index([bruteId, expiresAt])  // ← Agregar si no existe
}

model BruteTemporaryWeapon {
  // ... campos existentes
  @@index([bruteId, expiresAt])  // ← Agregar si no existe
}
```

**Ahorro estimado:** Variable, pero puede ser significativo con muchos registros

---

## 🎯 Implementación Recomendada

**Fase 1 (Impacto Inmediato):**
1. Cachear habilidades temporales (Solución 1)
2. Optimizar queries de bruto (Solución 2)
3. Cachear evento actual (Solución 4)

**Ahorro esperado:** 40-67.5 segundos → **Tiempo total: 5-10 segundos para 15 peleas**

**Fase 2 (Optimización Adicional):**
4. Paralelizar queries (Solución 3)
5. Verificar índices (Solución 5)

**Ahorro adicional:** 7.5-22.5 segundos → **Tiempo total: 2-5 segundos para 15 peleas**

---

## 📝 Notas Adicionales

- Las peleas manuales no tienen este problema porque solo hacen 1 pelea a la vez
- El problema se agrava con más peleas automáticas (10-16)
- Las implementaciones recientes (habilidades temporales) agregaron 4 queries por pelea
- El botón de "inscribir todos" no afecta las peleas automáticas (solo frontend)

---

## 🔍 Verificación Post-Implementación

Después de implementar las soluciones, verificar:
1. Tiempo total para 15 peleas automáticas (debería ser < 10 segundos)
2. Número de queries ejecutadas (debería reducirse de ~210 a ~50-70)
3. Uso de CPU/memoria durante peleas automáticas
4. Logs de tiempo de ejecución por pelea
