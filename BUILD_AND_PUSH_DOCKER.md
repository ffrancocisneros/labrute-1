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
- [ ] Build de Docker verificado
- [ ] Commit y push realizado
- [ ] CI build exitoso
