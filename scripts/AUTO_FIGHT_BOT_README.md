# Bot de Peleas Automáticas

Este bot permite pelear automáticamente con los brutos de cualquier cuenta.

## Características

✅ **Funciona con cualquier cuenta** - No está limitado a una cuenta específica  
✅ **Peleas dinámicas** - Detecta automáticamente la cantidad de peleas disponibles (12 normal, +2 por habilidad Regeneration, x2 por evento)  
✅ **Manejo de level up** - Si un bruto puede subir de nivel, lo salta y pasa al siguiente  
✅ **Sin level up automático** - El bot NO sube de nivel automáticamente, solo salta al siguiente bruto  
✅ **Procesamiento secuencial** - Va bruto por bruto, completando todas las peleas de uno antes de pasar al siguiente  
✅ **Hasta 10 brutos** - Procesa los primeros 10 brutos del usuario (ordenados por favorito y fecha de creación)

## Requisitos

- Node.js >= 17.0.0
- Base de datos configurada y accesible
- **Variable de entorno `DATABASE_URL` configurada**

### Configurar DATABASE_URL

El script necesita acceso a la base de datos. Tienes dos opciones:

#### Opción 1: Archivo `.env` (recomendado)

Crea un archivo `.env` en la raíz del proyecto con:

```env
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/nombre_base_datos"
```

**Nota:** Si ya tienes un archivo `.env` configurado para el servidor, el script lo usará automáticamente.

#### Opción 2: Variable de entorno del sistema

Configura la variable de entorno antes de ejecutar el script:

**Windows PowerShell:**
```powershell
$env:DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/nombre_base_datos"
npx tsx scripts/autoFightBot.ts Smitto
```

**Windows CMD:**
```cmd
set DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/nombre_base_datos
npx tsx scripts/autoFightBot.ts Smitto
```

**Linux/Mac:**
```bash
export DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/nombre_base_datos"
npx tsx scripts/autoFightBot.ts Smitto
```

## Uso

### Obtener el userId de una cuenta

Antes de ejecutar el bot, necesitas el `userId` de la cuenta. Tienes dos opciones:

#### Opción 1: Buscar por nombre de usuario

```bash
npx ts-node scripts/getUserId.ts <nombreUsuario>
```

Ejemplo:
```bash
npx ts-node scripts/getUserId.ts MiUsuario
```

#### Opción 2: Listar todos los usuarios

```bash
npx ts-node scripts/getUserId.ts --list
```

Para limitar la cantidad:
```bash
npx ts-node scripts/getUserId.ts --list --limit=10
```

### Configuración de la base de datos

**IMPORTANTE:** El script necesita acceso a la base de datos. Si tu base de datos está en Railway, necesitas crear un túnel para acceder desde tu PC local.

#### Opción 1: Usar Railway CLI (Recomendado para Railway)

1. **Instala Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Inicia sesión en Railway:**
   ```bash
   railway login
   ```

3. **Conecta tu proyecto:**
   ```bash
   railway link
   ```

4. **Crea un túnel a la base de datos en una terminal separada:**
   ```bash
   railway connect postgres
   ```
   
   Esto mostrará una URL de conexión temporal como:
   ```
   postgresql://postgres:password@localhost:5432/railway
   ```

5. **Actualiza tu archivo `.env`** con la URL del túnel (usando `localhost` en lugar de `postgres.railway.internal`):
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/railway"
   ```

6. **Mantén el túnel abierto** mientras ejecutas el bot.

#### Opción 2: Base de datos local

Si tienes una base de datos PostgreSQL local, configura el `.env` con:
```env
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/nombre_base_datos"
```

### Ejecutar el bot

El bot acepta tanto el `userId` como el nombre de usuario. **Debes usar `node` con el loader de ES modules**:

```bash
# Con userId (UUID)
node --loader ts-node/esm scripts/autoFightBot.ts 123e4567-e89b-12d3-a456-426614174000

# Con nombre de usuario
node --loader ts-node/esm scripts/autoFightBot.ts MiUsuario
```

**Alternativa:** Si prefieres usar `tsx` (más rápido y mejor soporte para ES modules):
```bash
# Instalar tsx (solo una vez)
npm install -g tsx
# o
yarn global add tsx

# Luego usar:
npx tsx scripts/autoFightBot.ts MiUsuario
```

### Ejemplos

```bash
# Usando userId
node --loader ts-node/esm scripts/autoFightBot.ts 123e4567-e89b-12d3-a456-426614174000

# Usando nombre de usuario
node --loader ts-node/esm scripts/autoFightBot.ts MiUsuario
```

## Funcionamiento

1. **Verificación inicial**: El bot verifica que el usuario existe
2. **Obtención de brutos**: Obtiene hasta 10 brutos del usuario (ordenados por favorito y fecha de creación)
3. **Para cada bruto**:
   - Verifica si puede subir de nivel → Si puede, salta al siguiente
   - Obtiene la cantidad de peleas disponibles
   - Si no tiene peleas, salta al siguiente
   - Obtiene oponentes (regenera si es necesario)
   - Pelea hasta agotar todas las peleas disponibles
   - Después de cada pelea:
     - Actualiza XP, victorias/derrotas
     - Crea logs de la pelea
     - Regenera oponentes
     - Verifica si puede subir de nivel (si puede, termina con ese bruto)

## Detalles Técnicos

### Cantidad de Peleas

El bot calcula automáticamente las peleas disponibles usando:
- **Base**: 12 peleas por día (o `EventFightsPerDay` para brutos de evento)
- **Habilidad Regeneration**: +2 peleas adicionales
- **Modificador doubleFights**: x2 peleas (durante eventos especiales)

### Manejo de Level Up

El bot verifica si un bruto puede subir de nivel en dos momentos:
1. **Antes de empezar a pelear** con ese bruto
2. **Después de cada pelea** (por si ganó suficiente XP)

Si en cualquiera de estos momentos el bruto puede subir de nivel, el bot:
- **NO** sube de nivel automáticamente
- **SÍ** salta al siguiente bruto (si hay)

### Regeneración de Oponentes

Los oponentes se regeneran:
- Si nunca se generaron oponentes para hoy
- Si los oponentes fueron generados en otro día
- Si hay menos de 6 oponentes disponibles
- Después de cada pelea (para tener oponentes frescos)

## Salida del Bot

El bot muestra información detallada en la consola:

```
🤖 Iniciando bot de peleas automáticas para usuario: <userId>

✅ Usuario encontrado: <nombre>

📋 Encontrados X bruto(s):
  1. Bruto1 (Nivel 5)
  2. Bruto2 (Nivel 10)
  ...

============================================================
🥊 Procesando bruto 1/X: Bruto1
============================================================

✅ Bruto1 tiene 12 pelea(s) disponible(s)

🔄 Obteniendo nuevos oponentes para Bruto1...
✅ 6 oponente(s) obtenido(s)

  🥊 Pelea 1/12: Bruto1 vs Oponente1
  ✅ Pelea completada: Victoria (+2 XP)
  🥊 Pelea 2/12: Bruto1 vs Oponente2
  ✅ Pelea completada: Derrota (+1 XP)
  ...

✅ Bruto1 completado

============================================================
🎉 Bot completado exitosamente
============================================================
```

## Manejo de Errores

- Si un usuario no existe, el bot termina con error
- Si un bruto no tiene peleas disponibles, lo salta
- Si un bruto puede subir de nivel, lo salta
- Si hay un error en una pelea específica, la salta y continúa con el siguiente oponente
- Si hay un error fatal, el bot termina y muestra el error

## Notas Importantes

⚠️ **No sube de nivel automáticamente**: El bot está diseñado para NO subir de nivel. Si un bruto puede subir de nivel, simplemente lo salta.

⚠️ **Procesamiento secuencial**: El bot procesa un bruto a la vez, completando todas sus peleas antes de pasar al siguiente.

⚠️ **Límite de 10 brutos**: Solo procesa los primeros 10 brutos del usuario (ordenados por favorito y fecha de creación).

⚠️ **Pausa entre peleas**: Hay una pausa de 500ms entre peleas para evitar sobrecargar el sistema.

## Solución de Problemas

### Error: "Usuario no encontrado"
- Verifica que el userId o nombre de usuario sea correcto
- Verifica que el usuario exista en la base de datos
- Usa `npx ts-node scripts/getUserId.ts --list` para ver todos los usuarios disponibles

### Error: "No se encontraron brutos"
- El usuario no tiene brutos activos
- Todos los brutos del usuario están eliminados

### El bot se detiene en medio de una pelea
- Revisa los logs de error en la consola
- Verifica que la base de datos esté accesible
- Verifica que no haya problemas de conexión

## Compartir el bot con otros

### ⚠️ Requisito importante

**El bot requiere el código fuente completo del proyecto** porque importa módulos de:
- `@labrute/core` - Funciones de cálculo de brutos
- `@labrute/prisma` - Cliente de base de datos
- `server/src/utils/...` - Funciones del servidor

**No es posible usar el bot sin el código fuente completo** (a menos que se refactorice para ser standalone).

### Cómo compartir el bot

#### Opción 1: Compartir el repositorio completo (Recomendado)

1. **Comparte el acceso al repositorio Git** (o un ZIP del proyecto)
2. **Comparte el `DATABASE_PUBLIC_URL`** (no la URL interna)
3. **Comparte `scripts/INSTRUCCIONES_RAPIDAS.md`** que tiene instrucciones detalladas

**Ventajas:**
- Todo funciona inmediatamente
- No hay confusión sobre qué archivos necesitan

**Desventajas:**
- Compartes todo el código del proyecto

#### Opción 2: Compartir solo los scripts + instrucciones

1. **Comparte estos archivos:**
   - `scripts/autoFightBot.ts`
   - `scripts/getUserId.ts`
   - `scripts/INSTRUCCIONES_RAPIDAS.md`

2. **Comparte el `DATABASE_PUBLIC_URL`**

3. **La persona necesita:**
   - Acceso al proyecto completo (debe pedirlo o clonarlo)
   - Colocar los scripts en la carpeta `scripts/`
   - Seguir las instrucciones en `INSTRUCCIONES_RAPIDAS.md`

### Configuración de DATABASE_URL para compartir

**Si compartes acceso a la misma base de datos:**

1. **Obtén el `DATABASE_PUBLIC_URL` de Railway:**
   ```bash
   railway variables
   # Busca DATABASE_PUBLIC_URL (no DATABASE_URL)
   ```

2. **Comparte esa URL** con las personas que usarán el bot

3. **Cada persona crea su propio archivo `.env`** con:
   ```env
   DATABASE_URL="postgresql://postgres:password@yamabiko.proxy.rlwy.net:32845/railway"
   ```
   (Usando el valor de `DATABASE_PUBLIC_URL` que compartiste)

**⚠️ IMPORTANTE:**
- ✅ Comparte `DATABASE_PUBLIC_URL`, NO `DATABASE_URL` (la interna no funciona desde fuera)
- ⚠️ Cualquiera con esta URL puede acceder a la base de datos
- ⚠️ Solo compártela con personas de confianza
- ⚠️ Todos podrán ver y modificar los datos de la base de datos

## Desarrollo

El script está ubicado en `scripts/autoFightBot.ts` y utiliza:
- `PrismaClient` para acceso a la base de datos
- Funciones del core (`@labrute/core`) para cálculos
- Funciones del servidor para generar peleas y obtener oponentes
