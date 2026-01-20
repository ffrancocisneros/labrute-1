# Guía Completa - Bot de Peleas Automáticas

## 📋 Tabla de Contenidos

1. [Requisitos](#requisitos)
2. [Instalación de Node.js](#instalación-de-nodejs)
3. [Obtener los archivos del bot](#obtener-los-archivos-del-bot)
4. [Configuración inicial](#configuración-inicial)
5. [Configurar acceso a la base de datos](#configurar-acceso-a-la-base-de-datos)
6. [Usar el bot](#usar-el-bot)
7. [Solución de problemas](#solución-de-problemas)

---

## Requisitos

Para usar este bot necesitas:

1. **Acceso al código fuente del proyecto labrute** (el bot importa módulos del proyecto)
2. **Node.js >= 17.0.0** instalado
3. **Acceso a la base de datos** (DATABASE_URL o DATABASE_PUBLIC_URL)
4. **tsx** instalado (se instala automáticamente con `npx`, pero puedes instalarlo globalmente)

---

## Instalación de Node.js

### Windows

1. **Descarga Node.js:**
   - Ve a: https://nodejs.org/
   - Descarga la versión **LTS** (Long Term Support) - actualmente v20.x o superior
   - Elige el instalador para Windows (`.msi`)

2. **Instala Node.js:**
   - Ejecuta el archivo descargado
   - Sigue el asistente de instalación (acepta todas las opciones por defecto)
   - Marca la opción "Automatically install the necessary tools" si aparece

3. **Verifica la instalación:**
   Abre PowerShell o CMD y ejecuta:
   ```powershell
   node --version
   npm --version
   ```
   
   Deberías ver algo como:
   ```
   v20.10.0
   10.2.3
   ```

### Mac

1. **Opción 1: Instalador oficial**
   - Ve a: https://nodejs.org/
   - Descarga la versión LTS para Mac
   - Ejecuta el instalador `.pkg`

2. **Opción 2: Con Homebrew** (recomendado)
   ```bash
   brew install node
   ```

3. **Verifica la instalación:**
   ```bash
   node --version
   npm --version
   ```

### Linux

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# O con el gestor de paquetes de tu distribución
sudo apt install nodejs npm  # Ubuntu/Debian
sudo dnf install nodejs npm   # Fedora
sudo pacman -S nodejs npm     # Arch Linux
```

**Verifica la instalación:**
```bash
node --version
npm --version
```

---

## Obtener los archivos del bot

### Opción 1: Tienes acceso al repositorio completo

Si tienes acceso al repositorio Git del proyecto labrute:

1. **Clona o descarga el repositorio:**
   ```bash
   git clone <url-del-repositorio>
   cd labrute
   ```

2. **Los archivos del bot ya están incluidos:**
   - `scripts/autoFightBot.ts` - El bot principal
   - `scripts/getUserId.ts` - Script auxiliar para obtener userIds
   - `scripts/INSTRUCCIONES_RAPIDAS.md` - Esta guía

### Opción 2: Te compartieron solo los archivos del bot

Si alguien te compartió solo los archivos del bot, necesitas:

1. **Obtener el proyecto completo:**
   - El bot **requiere** el proyecto completo porque importa módulos de:
     - `@labrute/core`
     - `@labrute/prisma`
     - `server/src/utils/...`
   
   **Pide al dueño del proyecto que te comparta:**
   - El repositorio completo, O
   - Al menos las carpetas: `core/`, `prisma/`, `server/`, y los archivos `package.json`, `tsconfig.json`

2. **Coloca los archivos del bot:**
   - Coloca `autoFightBot.ts` y `getUserId.ts` en la carpeta `scripts/` del proyecto

---

## Configuración inicial

### 1. Instalar dependencias del proyecto

Una vez que tengas el proyecto completo:

```bash
# Navega a la carpeta del proyecto
cd ruta/al/proyecto/labrute

# Instala todas las dependencias
yarn install
# O si no tienes yarn:
npm install
```

Esto puede tardar varios minutos la primera vez.

### 2. Instalar tsx (opcional pero recomendado)

```bash
npm install -g tsx
```

**Nota:** Si no lo instalas globalmente, puedes usar `npx tsx` en su lugar (funciona igual, solo es un poco más lento).

---

## Configurar acceso a la base de datos

El bot necesita conectarse a la base de datos. Tienes dos escenarios:

### Escenario A: Compartes la misma base de datos con el dueño del proyecto

Si el dueño del proyecto te compartió el acceso a la misma base de datos:

1. **Pide al dueño del proyecto:**
   - La variable `DATABASE_PUBLIC_URL` (NO la `DATABASE_URL` interna)
   - Debe verse algo como: `postgresql://postgres:password@yamabiko.proxy.rlwy.net:32845/railway`

2. **Crea el archivo `.env`:**
   - En la raíz del proyecto (misma carpeta donde está `package.json`)
   - Crea un archivo llamado `.env` (sin extensión)
   - Agrega esta línea:
     ```env
     DATABASE_URL="postgresql://postgres:password@yamabiko.proxy.rlwy.net:32845/railway"
     ```
   - Reemplaza el valor con el `DATABASE_PUBLIC_URL` que te dieron

**⚠️ IMPORTANTE:** 
- Usa `DATABASE_PUBLIC_URL`, NO `DATABASE_URL` (la interna no funciona desde fuera de Railway)
- No compartas esta URL públicamente, contiene credenciales

### Escenario B: Tienes tu propia base de datos

Si tienes tu propia base de datos PostgreSQL:

1. **Crea el archivo `.env`:**
   - En la raíz del proyecto
   - Agrega:
     ```env
     DATABASE_URL="postgresql://usuario:contraseña@host:puerto/nombre_base_datos"
     ```
   
   **Ejemplos:**
   - Base de datos local: `postgresql://postgres:mipassword@localhost:5432/labrute`
   - Base de datos remota: `postgresql://usuario:pass@servidor.com:5432/dbname`

### Crear el archivo .env

**Windows (PowerShell):**
```powershell
cd ruta/al/proyecto/labrute
New-Item -Path ".env" -ItemType File -Force
notepad .env
# Pega el DATABASE_URL y guarda
```

**Windows (CMD):**
```cmd
cd ruta\al\proyecto\labrute
echo DATABASE_URL="tu_url_aqui" > .env
```

**Mac/Linux:**
```bash
cd ruta/al/proyecto/labrute
nano .env
# Pega el DATABASE_URL, presiona Ctrl+X, luego Y, luego Enter
```

---

## Usar el bot

### Paso 1: Ver usuarios disponibles (opcional)

```bash
npx tsx scripts/getUserId.ts --list
```

Esto mostrará una lista de usuarios con sus IDs.

### Paso 2: Buscar un usuario específico (opcional)

```bash
npx tsx scripts/getUserId.ts NombreUsuario
```

Esto mostrará información del usuario y su ID.

### Paso 3: Ejecutar el bot

```bash
# Con nombre de usuario
npx tsx scripts/autoFightBot.ts NombreUsuario

# O con userId directamente
npx tsx scripts/autoFightBot.ts 123e4567-e89b-12d3-a456-426614174000
```

El bot:
- Buscará el usuario
- Encontrará sus brutos (hasta 10)
- Peleará automáticamente con cada bruto
- Saltará brutos que puedan subir de nivel
- Mostrará el progreso en la consola

---

## Solución de problemas

### Error: "Node.js no está instalado" o "node: command not found"

**Solución:**
- Instala Node.js siguiendo las instrucciones en [Instalación de Node.js](#instalación-de-nodejs)
- Reinicia la terminal después de instalar
- Verifica con `node --version`

### Error: "Cannot find module '@labrute/core'" o similar

**Solución:**
- Asegúrate de tener el proyecto completo (no solo los scripts)
- Ejecuta `yarn install` o `npm install` en la raíz del proyecto
- Verifica que las carpetas `core/`, `prisma/`, y `server/` existen

### Error: "DATABASE_URL not found" o "Environment variable not found"

**Solución:**
1. Verifica que el archivo `.env` existe en la raíz del proyecto (misma carpeta que `package.json`)
2. Verifica que el archivo contiene exactamente:
   ```env
   DATABASE_URL="postgresql://..."
   ```
   (con comillas y sin espacios alrededor del `=`)
3. Verifica que no hay espacios extra o caracteres raros

### Error: "Can't reach database server" o "Connection refused"

**Solución:**
- Si usas Railway: Asegúrate de usar `DATABASE_PUBLIC_URL` (no `DATABASE_URL` interna)
- Verifica que la URL es correcta (copia y pega exactamente como te la dieron)
- Verifica que tu conexión a internet funciona
- Si usas base de datos local: Verifica que PostgreSQL está corriendo

### Error: "tsx: command not found" o "ts-node: command not found"

**Solución:**
- Usa `npx tsx` en lugar de solo `tsx`:
  ```bash
  npx tsx scripts/autoFightBot.ts NombreUsuario
  ```
- O instala tsx globalmente:
  ```bash
  npm install -g tsx
  ```

### Error: "Usuario no encontrado"

**Solución:**
- Verifica que el nombre de usuario es correcto (mayúsculas/minúsculas pueden importar)
- Usa `npx tsx scripts/getUserId.ts --list` para ver usuarios disponibles
- Verifica que tienes acceso a la base de datos correcta

### El bot se detiene o da errores durante las peleas

**Solución:**
- Revisa los mensajes de error en la consola
- Verifica que la conexión a la base de datos es estable
- Algunos errores son normales (por ejemplo, si un oponente no existe), el bot continúa automáticamente

---

## Preguntas Frecuentes

### ¿Necesito tener el proyecto completo o solo los scripts?

**Necesitas el proyecto completo** porque el bot importa módulos de:
- `@labrute/core` (cálculos de brutos)
- `@labrute/prisma` (cliente de base de datos)
- `server/src/utils/...` (funciones del servidor)

### ¿Puedo usar el bot sin acceso al código fuente?

**No**, actualmente el bot requiere el código fuente porque importa módulos internos del proyecto. Si quieres una versión standalone, sería necesario refactorizar el código para que no dependa de estos módulos.

### ¿Es seguro compartir el DATABASE_PUBLIC_URL?

**Parcialmente seguro:**
- ✅ Es más seguro que compartir contraseñas directamente
- ⚠️ Cualquiera con esta URL puede acceder a la base de datos
- ⚠️ Solo compártela con personas de confianza
- ⚠️ Si la compartes, todos podrán ver y modificar los datos

### ¿El bot funciona con cualquier cuenta?

**Sí**, el bot funciona con cualquier cuenta que esté en la base de datos. Solo necesitas el nombre de usuario o el userId.

### ¿Cuántos brutos procesa el bot?

El bot procesa hasta **10 brutos** por ejecución, ordenados por favorito y fecha de creación.

---

## Más información

Para documentación técnica completa, ver `AUTO_FIGHT_BOT_README.md`
