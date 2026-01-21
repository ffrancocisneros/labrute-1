# Análisis Completo del Proyecto LaBrute

**Versión del Proyecto:** 2.83.18  
**Última Actualización:** Enero 2026  
**Autor del Análisis:** Documentación técnica y funcional

---

## 📋 Tabla de Contenidos

1. [Análisis Técnico](#análisis-técnico)
2. [Análisis de Funcionalidades](#análisis-de-funcionalidades)
3. [Sistema de Deploy y DevOps](#sistema-de-deploy-y-devops)
4. [Mejoras e Implementaciones Recientes](#mejoras-e-implementaciones-recientes)
5. [Base de Datos y Modelos](#base-de-datos-y-modelos)
6. [Scripts y Utilidades](#scripts-y-utilidades)
7. [Arquitectura de Código](#arquitectura-de-código)

---

## 🔧 Análisis Técnico

### Stack Tecnológico

#### **Backend**
- **Runtime:** Node.js >= 17.0.0 (recomendado 20.x)
- **Framework:** Express.js 4.21.2
- **Lenguaje:** TypeScript 5.3.2
- **ORM:** Prisma 6.16.2
- **Base de Datos:** PostgreSQL
- **Autenticación:** 
  - Eternal-Twin OAuth (producción original)
  - Local Auth con username + shared secret (para deployments privados)
- **Observabilidad:** OpenTelemetry (opcional)
- **Tareas Programadas:** node-schedule 2.1.1
- **Internacionalización:** i18next 24.2.1
- **Notificaciones:** Discord.js 14.17.3

#### **Frontend**
- **Framework:** React 18.2.0
- **Build Tool:** react-scripts 5.0.1 (Create React App)
- **UI Library:** Material-UI (MUI) 5.14.20
- **Routing:** React Router 6.3.0
- **Animaciones/Graphics:** 
  - PixiJS 6.5.9 (motor de renderizado 2D)
  - @pixi/sound 4.4.1 (audio)
  - @pixi/filter-* (filtros visuales)
- **Internacionalización:** react-i18next 11.18.3
- **Editor Rich Text:** CKEditor 5
- **Analytics:** react-ga4 2.1.0
- **SEO:** react-helmet-async 2.0.5

#### **Shared (Core)**
- **Paquete:** `@labrute/core` (workspace)
- **Contiene:** Lógica compartida entre frontend y backend
- **Dependencias:** dayjs, tipos de Prisma

#### **Prisma**
- **Paquete:** `@labrute/prisma` (workspace)
- **Genera:** Cliente Prisma y tipos TypeScript
- **Output:** `./prisma/` (compartido entre workspaces)

### Arquitectura del Proyecto

#### **Estructura de Workspaces (Monorepo con Yarn)**

```
labrute/
├── client/          # Frontend React
├── server/          # Backend Express
├── core/            # Código compartido
├── prisma/          # Cliente Prisma generado
└── scripts/         # Scripts de utilidad
```

**Gestión de Paquetes:**
- **Yarn:** 4.0.2 (Berry)
- **Workspaces:** Configurado en `package.json`
- **Instalación:** `yarn install --immutable` (CI/CD)

#### **Estructura de Directorios**

```
client/
├── public/
│   ├── i18n/              # Traducciones (JSON)
│   ├── images/            # Assets estáticos
│   └── sfx/               # Sonidos
├── src/
│   ├── components/        # Componentes reutilizables
│   ├── hooks/             # React hooks personalizados
│   ├── layouts/           # Layouts (Main, Admin, etc.)
│   ├── theme/             # Configuración de tema MUI
│   ├── utils/             # Utilidades (Server.ts, cookies, etc.)
│   └── views/             # Vistas/páginas
│       ├── admin/         # Panel de administración
│       ├── clan/          # Vistas de clanes
│       ├── event/         # Vistas de eventos
│       └── mobile/        # Vistas optimizadas para móvil

server/
├── prisma/
│   ├── schema.prisma      # Schema de Prisma
│   └── migrations/        # Migraciones SQL
└── src/
    ├── controllers/        # Controladores de API
    ├── utils/             # Utilidades del servidor
    │   ├── brute/          # Lógica de brutos
    │   ├── fight/          # Sistema de peleas
    │   ├── shop/           # Sistema de tienda
    │   └── ...
    ├── config.ts           # Configuración del servidor
    ├── main.ts             # Punto de entrada
    ├── routes.ts            # Definición de rutas
    ├── server.ts            # Servidor Express
    └── dailyJob.ts          # Tareas programadas diarias

core/
└── src/
    ├── brute/              # Lógica de brutos (shared)
    ├── constants.ts        # Constantes del juego
    └── ...

scripts/
├── postInstall.sh          # Script post-instalación
├── start-production.sh     # Script de inicio en producción
├── populateShopItems.ts    # Población de items de tienda
├── autoFightBot.ts         # Bot de peleas automáticas
└── ...
```

### Configuración de Build

#### **TypeScript**
- **Configuración:** `tsconfig.json` (root), `tsconfig.build.json` (build)
- **Compilación:** `yarn compile` (compila todos los workspaces)
- **Output:** 
  - `server/lib/` (backend compilado)
  - `core/lib/` (core compilado)
  - `client/build/` (frontend build estático)

#### **Proceso de Build**

**Desarrollo:**
```bash
yarn dev  # Inicia DB, servidor, cliente y Eternal-Twin
```

**Producción:**
```bash
yarn compile        # Compila TypeScript
yarn build:client   # Build del frontend
```

**Post-instalación (postInstall.sh):**
- **Producción:** Compila TypeScript y build del cliente
- **Desarrollo:** Sincroniza DB, compila y seed

---

## 🎮 Análisis de Funcionalidades

### 1. Sistema de Autenticación

#### **Modos de Autenticación**

**A) Eternal-Twin OAuth (Producción Original)**
- Integración con Eternal-Twin
- OAuth 2.0 flow
- Requiere configuración de `ETERNALTWIN_URL`, `ETERNALTWIN_CLIENT_REF`, etc.

**B) Local Auth (Deployments Privados)**
- Username + shared secret (`LOCAL_AUTH_SECRET`)
- Auto-creación de usuarios
- Tokens de sesión rotativos
- **Archivos:**
  - `server/src/controllers/LocalAuth.ts`
  - `client/src/views/SimpleLoginView.tsx`

#### **Gestión de Sesiones**
- **Cookies:** `USER_COOKIE`, `TOKEN_COOKIE`
- **Validación:** Middleware `auth()` en cada endpoint protegido
- **Roles:** `admin`, `moderator` (booleanos en User)

### 2. Sistema de Brutos (Brutes)

#### **Creación y Gestión**
- **Límite por usuario:** 10 brutos (configurable)
- **Generación:** Aleatoria con stats iniciales
- **Niveles:** 1-100+ (sin límite máximo)
- **XP:** Sistema progresivo por nivel
- **Stats Base:** Endurance, Strength, Agility, Speed

#### **Sistema de Destinos (Destiny System)**
- **Path:** Array de elecciones LEFT/RIGHT
- **Choices:** Habilidades, Armas, Mascotas, Stats
- **Tiers:** Cada habilidad/arma puede tener hasta 3 tiers
- **Primer Bonus:** Se guarda automáticamente al crear bruto
- **Level Up:** Sistema de elecciones en cada subida de nivel

#### **Características de Brutos**
- **Ascensiones:** Sistema de reset con beneficios permanentes
- **Ranking:** Sistema de 11 niveles (11 = peor, 0 = mejor)
- **Favoritos:** Los usuarios pueden marcar brutos favoritos
- **Auto-Fight:** Sistema de peleas automáticas
- **Inventario:** Items especiales (visual reset, name change, etc.)

### 3. Sistema de Peleas (Fights)

#### **Tipos de Peleas**

**A) Peleas de Arena**
- **Límite diario:** 12 peleas por bruto
- **Bonus Fights:** Peleas extra compradas/ganadas (no acumulan)
- **Oponentes:** Generados aleatoriamente según nivel
- **XP/Gold:** Recompensas por victoria

**B) Torneos Diarios**
- **Registro:** Automático o manual
- **Formato:** 64 participantes, 6 rondas (eliminación)
- **Recompensas:** Oro y XP según posición
- **Generación:** Job diario automático

**C) Torneos Globales**
- **Formato:** Todos los brutos registrados
- **Rondas:** Hasta que quede 1 ganador
- **Recompensas:** Grandes cantidades de oro
- **Frecuencia:** Diario

**D) Battle Royale (Eventos)**
- **Formato:** Evento especial
- **Participantes:** Brutos de nivel específico
- **Rondas:** Múltiples días
- **Recompensa:** Título especial

**E) Peleas de Clan**
- **Boss Fights:** Peleas contra jefes de clan
- **Clan Wars:** Peleas entre clanes
- **Recompensas:** Puntos de clan, oro, XP

#### **Motor de Peleas**

**Componentes:**
- **Generación:** `server/src/utils/fight/generateFight.ts`
- **Métodos:** `server/src/utils/fight/fightMethods.ts`
- **Stats:** Sistema de stats calculadas (CalculatedBrute)
- **Modificadores:** Habilidades, armas, mascotas afectan stats

**Flujo de Pelea:**
1. Preparación de equipos (brutos, mascotas, backups)
2. Aplicación de modificadores
3. Ordenamiento por iniciativa
4. Loop de turnos (hasta 2000 turnos o muerte)
5. Cálculo de ganador/perdedor
6. Guardado de resultados

**Stats de Pelea:**
- **Ofensivas:** Damage, Accuracy, Critical Chance, Combo
- **Defensivas:** Block, Evasion, Armor, Counter
- **Especiales:** Reversal, Disarm, Deflect, Initiative

### 4. Sistema de Habilidades y Armas

#### **Habilidades (Skills)**

**Tipos:**
- **Boosters:** herculeanStrength, felineAgility, lightningBolt, vitality, immortality
- **Passives:** weaponsMaster, martialArts, sixthSense, hostility, etc.
- **Supers:** hammer, hypnosis, flashFlood, tamer, etc.

**Modificadores:**
- **Flat:** Valores fijos (+3, +5, +7 según tier)
- **Percent:** Multiplicadores (50%, 60%, 70% según tier)
- **Condicionales:** Efectos que se activan en situaciones específicas

**Ejemplos:**
- `reconnaissance`: +15 flat speed, +250% speed, +70% critical damage
- `weaponsMaster`: +100% damage con armas SHARP (tier 3)
- `untouchable`: +50% EVASION (tier 3)
- `counterAttack`: +20% BLOCK, +99% REVERSAL después de bloquear

#### **Armas (Weapons)**

**Tipos:**
- **Fast:** fan, keyboard, knife, leek
- **Sharp:** sword, broadsword, scimitar, trident
- **Heavy:** axe, bumps, flail, fryingPan, mammothBone
- **Long:** baton, halbard, lance
- **Blunt:** Varias armas contundentes

**Características:**
- **Damage:** Rango de daño (tier 1, 2, 3)
- **Stats Modifiers:** Afectan reversal, evasion, combo, etc.
- **Reach:** Alcance del arma
- **Toss:** Probabilidad de lanzar el arma

**Ejemplos:**
- `sword`: 15-20 damage, buen critical chance
- `fan`: 4-8 damage, pero +60% reversal, +70% evasion, +55% combo
- `leek`: 5-11 damage, +100% reversal, +4 combo

### 5. Sistema de Misiones (Missions)

#### **Tipos de Misiones**

**A) Misiones Diarias (Daily Objectives)**
- **Generación:** Automática diaria
- **Tipos:** WIN_FIGHTS, WIN_TOURNAMENT, LEVEL_UP, etc.
- **Recompensas:** Oro o Títulos
- **Reset:** Diario a medianoche UTC

**B) Misiones Semanales (Weekly Objectives)**
- **Generación:** Automática semanal (lunes)
- **Tipos:** Similar a diarias pero con objetivos mayores
- **Recompensas:** Oro o Títulos
- **Reset:** Semanal

**C) Misiones Generales (Missions)**
- **Categorías:**
  - **COMBAT:** WIN_FIGHTS, WIN_FIGHTS_STREAK, WIN_TOURNAMENT, DEAL_DAMAGE
  - **PROGRESSION:** REACH_LEVEL, ASCEND, COMPLETE_FIGHTS, GAIN_XP
  - **SOCIAL:** FOLLOW_BRUTES, JOIN_CLAN, PARTICIPATE_CLAN_WARS
  - **EVENTS:** PARTICIPATE_EVENT, REACH_EVENT_FINAL, WIN_EVENT
  - **SPECIAL:** CREATE_BRUTES, TRY_DIFFERENT_SKILLS
- **Recompensas:** Oro o Títulos
- **Progreso:** Acumulativo, no se resetea

#### **Sistema de Títulos**
- **Asignación:** Automática al completar misiones/logros
- **Desbloqueo:** `User.unlockedTitleIds[]`
- **Equipamiento:** `User.equippedTitleId`
- **Ejemplos:** "Ascendido", "Ultimo hombre en pie", "Insistente", "Victorioso", etc.

### 6. Sistema de Logros (Achievements)

#### **Tipos de Logros**

**A) Logros de Bruto (Achievements)**
- **Categorías:** Fights, Skills, Perks, Stats, Tournament, Ranks, Ascend
- **Ejemplos:** wins, defeats, flawless, combo3, combo4, combo5, etc.
- **Tracking:** Por bruto individual

**B) Logros Permanentes (Permanent Achievements)**
- **Niveles:** BRONZE, SILVER, GOLD, PLATINUM
- **Tipos:** WIN_FIGHTS_TOTAL, WIN_TOURNAMENTS_TOTAL, REACH_LEVEL, etc.
- **Tracking:** Por usuario (cuenta completa)
- **Recompensas:** Oro, Títulos, Cosméticos

**C) Mission Achievements**
- **Tipos:** COMPLETE_COMBAT_MISSIONS, COMPLETE_PROGRESSION_MISSIONS, etc.
- **Tracking:** Por categoría de misión completada

### 7. Sistema de Estadísticas (Statistics)

#### **Funcionalidades**
- **Vista General:** Estadísticas por cuenta (usuario)
- **Vista Individual:** Estadísticas por bruto
- **Comparación:** Entre brutos del mismo usuario
- **Métricas:**
  - Peleas (total, ganadas, perdidas, racha)
  - Daño (total, máximo, promedio)
  - Torneos (participados, ganados)
  - Niveles y XP
  - Ascensiones
  - Eventos
  - Clanes

#### **UI Features**
- **Iconos:** Por tipo de estadística
- **Tabla Comparativa:** Columnas por bruto, filas por estadística
- **Rankings Internos:** Top 3 por categoría
- **Progreso Relativo:** Porcentaje respecto al mejor bruto
- **Tendencias:** Indicadores de mejora/empeoramiento
- **Ordenamiento:** Por cualquier columna
- **Búsqueda/Filtro:** Buscar estadísticas específicas
- **Badges:** Resaltar estadísticas destacadas
- **Eficiencia:** Métricas calculadas (victorias/pelea, daño/pelea)

### 8. Sistema de Tienda (Shop)

#### **Tipos de Items**

**A) Cosméticos (COSMETIC)**
- **Estado:** "Coming soon" (no implementado aún)
- **Estructura:** Preparado para futuras implementaciones

**B) Peleas Extra (BONUS_FIGHTS)**
- **Duración:** 24 horas desde compra
- **Comportamiento:** 
  - Se consumen antes que las peleas normales
  - No acumulan al día siguiente
  - Se resetean si no se usan

**C) Armas Temporales (TEMPORARY_WEAPON)**
- **Duración:** 24 horas
- **Aplicación:** Requiere selección de bruto
- **Almacenamiento:** `BruteTemporaryWeapon`
- **Uso:** Se aplican automáticamente en peleas

**D) Habilidades Temporales (TEMPORARY_SKILL)**
- **Duración:** 24 horas
- **Aplicación:** Requiere selección de bruto
- **Almacenamiento:** `BruteTemporaryEffect`
- **Uso:** Se aplican automáticamente en peleas

#### **Estructura de Items**
- **Precios:** Basados en rareza (odds) y poder
- **Ordenamiento:** Por tipo y orden personalizado
- **Disponibilidad:** Flag `available` para activar/desactivar

#### **Precios de Referencia**
- **Armas Ultra Raras:** 800-1200 oro (fan, leek, trident)
- **Armas Raras:** 400-700 oro (sword, broadsword, scimitar)
- **Habilidades Ultra Raras:** 1000-1500 oro (immortality, hammer)
- **Habilidades Raras:** 400-900 oro (weaponsMaster, untouchable)
- **Peleas Extra:** 200-500 oro (5-10 peleas)

### 9. Sistema de Pase de Batalla (Battle Pass)

#### **Estructura**
- **Niveles:** 40 niveles
- **XP por Nivel:** 300 XP
- **XP Total:** 12,000 XP para completar

#### **Recompensas (Distribución)**
- **Oro:** 20 niveles (25-250 oro, progresivo)
- **Armas Temporales:** 6 niveles (sword, axe, broadsword, trident, whip, scimitar)
- **Habilidades Temporales:** 6 niveles (herculeanStrength, felineAgility, lightningBolt, vitality, immortality, weaponsMaster)
- **Cosméticos:** 4 niveles (niveles 10, 20, 30, 40)
- **Peleas Extra:** 4 niveles (5 peleas cada una, niveles 4, 14, 26, 36)

#### **Misiones del Pase**
- **Tipos:** WIN_FIGHTS, PARTICIPATE_TOURNAMENTS, WIN_TOURNAMENTS, DEAL_DAMAGE, WIN_STREAK, ASCEND
- **Dificultades:** EASY, MEDIUM, HARD
- **XP Reward:** Variable según dificultad

#### **Progreso**
- **Tracking:** `UserBattlePassProgress` (totalXp, claimedLevels)
- **Misiones:** `UserBattlePassMissionProgress` (progreso por misión)

### 10. Sistema de Clanes (Clans)

#### **Funcionalidades**
- **Creación:** Por brutos (máximo 1 clan por bruto como master)
- **Límite:** 50 miembros por clan
- **Bosses:** 3 tipos (GoldClaw, EmberFang, Cerberus)
- **Puntos:** Sistema de puntos de clan
- **Elo:** Sistema de ranking de clanes

#### **Clan Wars**
- **Tipos:** Friendly, Official
- **Duración:** 7 días
- **Participantes:** Hasta 7 por clan
- **Recompensas:** Puntos, cambios de Elo
- **Tracking:** `ClanWar`, `ClanWarFighters`

#### **Foro de Clan**
- **Threads:** Discusiones con pin/unpin
- **Posts:** Mensajes en threads
- **Moderación:** Master puede gestionar

### 11. Sistema de Eventos (Events)

#### **Tipos de Eventos**
- **Battle Royale:** Evento principal
- **Formato:** Torneo de eliminación
- **Participación:** Brutos de nivel específico
- **Recompensas:** Títulos especiales

#### **Estados**
- **starting:** Evento iniciando
- **ongoing:** Evento en curso
- **finished:** Evento finalizado

### 12. Sistema de Notificaciones

#### **Tipos**
- **Severidades:** info, success, warning, error
- **Links:** Opcionales para navegación
- **Read Status:** Tracking de lectura

### 13. Sistema de Reportes (Brute Reports)

#### **Funcionalidades**
- **Razones:** name (nombres inapropiados)
- **Estados:** pending, accepted, rejected
- **Moderación:** Admins/moderadores pueden gestionar
- **Palabras Baneadas:** Sistema de palabras prohibidas

---

## 🚀 Sistema de Deploy y DevOps

### Arquitectura de Deploy

#### **Opción 1: Railway con Nixpacks (Original)**
- **Builder:** Nixpacks (detectado automáticamente)
- **Configuración:** `nixpacks.toml`
- **Problema:** Timeouts en builds grandes
- **Estado:** Mantenido como fallback

#### **Opción 2: Railway con Docker Image (Actual)**
- **Builder:** Docker (imagen pre-construida)
- **Source:** GitHub Container Registry (GHCR)
- **Ventajas:** 
  - Builds más rápidos
  - Sin timeouts
  - Mejor control del proceso

### Dockerfile

#### **Estructura Multi-Stage**

**Stage 1: Build**
```dockerfile
FROM node:20-bookworm-slim AS build
ENV NODE_ENV=production YARN_ENABLE_SCRIPTS=false
# Instala OpenSSL para Prisma
RUN apt-get update -y && apt-get install -y openssl ca-certificates
# Habilita Corepack
RUN corepack enable
# Copia manifests para cache
COPY package.json yarn.lock .yarnrc.yml .yarn/ ...
# Instala dependencias (sin postinstall)
RUN yarn install --immutable
# Copia código
COPY . .
# Compila y build
RUN yarn compile
RUN yarn build:client
```

**Stage 2: Runtime**
```dockerfile
FROM node:20-bookworm-slim
ENV NODE_ENV=production
# Instala OpenSSL para Prisma
RUN apt-get update -y && apt-get install -y openssl ca-certificates
# Copia todo del build stage
COPY --from=build /app /app
# Inicia con script de producción
CMD ["bash", "scripts/start-production.sh"]
```

#### **Características Clave**
- **OpenSSL:** Instalado para Prisma engines
- **YARN_ENABLE_SCRIPTS=false:** Evita ejecutar postinstall durante build
- **Multi-stage:** Reduce tamaño de imagen final
- **Cache:** Optimizado con copia de manifests primero

### GitHub Actions Workflow

#### **Archivo:** `.github/workflows/publish-ghcr.yml`

**Trigger:**
- Push a branch `main`

**Steps:**
1. Checkout del código
2. Setup Docker Buildx
3. Login a GHCR
4. Build y push de imagen Docker

**Tags:**
- `ghcr.io/{owner}/labrute:latest`
- `ghcr.io/{owner}/labrute:{sha}`

**Concurrency:**
- Cancela builds en progreso si hay nuevo push

### Scripts de Producción

#### **start-production.sh**

**Funcionalidad:**
1. Intenta `yarn db:sync:prod`
2. Si falla (P3009 - migración fallida):
   - Marca migración problemática como `applied`
   - Reintenta `yarn db:sync:prod`
3. Ejecuta seed y scripts adicionales
4. Inicia servidor con `yarn start`

**Auto-Recovery:**
- Maneja migraciones fallidas automáticamente
- Permite que migraciones v2 (idempotentes) reparen el esquema

#### **postInstall.sh**

**Comportamiento:**
- **CI/Docker:** Se salta (detecta `CI=true` o `YARN_ENABLE_SCRIPTS=false`)
- **Producción Local:** Compila TypeScript y build del cliente
- **Desarrollo:** Sincroniza DB, compila y seed

### Railway Configuration

#### **railway.json**
```json
{
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "bash scripts/start-production.sh",
    "healthcheckPath": "/api/is-ready",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

#### **Deploy desde Docker Image**
- **Source:** Docker Image
- **Image:** `ghcr.io/{owner}/labrute:latest`
- **Auto-update:** Railway detecta cambios en `latest` tag
- **Variables:** Se mantienen del servicio anterior

### Variables de Entorno

#### **Requeridas**
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: "production"
- `SELF_URL`: URL completa con trailing slash
- `COOKIE_SECRET`: String aleatorio 32+ caracteres
- `CSRF_SECRET`: String aleatorio 32+ caracteres

#### **Opcionales**
- `LOCAL_AUTH_SECRET`: Para autenticación local
- `PORT`: Puerto del servidor (Railway lo setea automáticamente)
- `CORS_REGEX`: Regex para CORS origins
- `OTEL_ENABLED`: Habilitar OpenTelemetry

---

## ✨ Mejoras e Implementaciones Recientes

### 1. Sistema de Tienda (Shop System)

#### **Implementación: Enero 2026**

**Backend:**
- **Schema:** `ShopItem` model con tipos COSMETIC, BONUS_FIGHTS, TEMPORARY_WEAPON, TEMPORARY_SKILL
- **Controller:** `server/src/controllers/Shop.ts`
- **Utils:** `server/src/utils/shop/purchaseItem.ts`
- **Routes:** `/api/shop` (GET), `/api/shop/purchase` (POST)

**Frontend:**
- **View:** `client/src/views/ShopView.tsx`
- **Secciones:** Armas, Habilidades, Cosméticos (Coming soon), Peleas
- **Features:**
  - Tabs para navegación
  - Diálogo de confirmación
  - Selección de bruto para items temporales
  - Filtro de items no disponibles (shortsword)
  - Actualización de oro en tiempo real

**Scripts:**
- **Población:** `scripts/populateShopItems.ts`
- **Precios:** Basados en rareza y poder de items

**Migraciones:**
- `20260119000000_add_shop_system` (fallida en prod, reparada)
- `20260120000000_add_shop_system_v2` (idempotente, reparación)

### 2. Sistema de Estadísticas Avanzado

#### **Implementación: Diciembre 2025 - Enero 2026**

**Features:**
- Vista general por cuenta
- Vista individual por bruto
- Comparación entre brutos
- Iconos por tipo de estadística
- Tabla comparativa
- Rankings internos
- Progreso relativo
- Tendencias
- Ordenamiento
- Búsqueda/filtro
- Badges destacados
- Métricas de eficiencia

**Backend:**
- **Controller:** `server/src/controllers/Statistics.ts`
- **Endpoint:** `/api/statistics/:name`

**Frontend:**
- **View:** `client/src/views/StatisticsView.tsx`
- **UI:** Material-UI con gráficos y tablas

### 3. Sistema de Misiones Mejorado

#### **Implementación: Diciembre 2025**

**Mejoras:**
- Misiones diarias, semanales y generales
- Sistema de títulos asociados
- Progreso acumulativo
- Recompensas de oro y títulos
- Categorización por tipo

**Backend:**
- **Controllers:** `Missions.ts`, `Objectives.ts`
- **Models:** `Mission`, `DailyObjective`, `WeeklyObjective`, `MissionAchievement`

**Frontend:**
- **View:** `client/src/views/MissionsView.tsx`
- **UI:** Tabs para diarias/semanales/generales

### 4. Sistema de Pase de Batalla

#### **Implementación: Diciembre 2025**

**Features:**
- 40 niveles
- Recompensas variadas (oro, armas temporales, habilidades temporales, cosméticos, peleas)
- Misiones del pase
- Progreso por XP
- Sistema de reclamación

**Backend:**
- **Controller:** `server/src/controllers/BattlePass.ts`
- **Models:** `BattlePassSeason`, `BattlePassReward`, `BattlePassMission`

**Frontend:**
- **View:** `client/src/views/BattlePassView.tsx`
- **UI:** Visualización de niveles, recompensas y progreso

### 5. Optimización de Deploy

#### **Implementación: Enero 2026**

**Problema Original:**
- Railway timeouts en builds grandes
- Nixpacks no podía completar builds

**Solución:**
- Dockerfile multi-stage
- GitHub Actions para build
- Publicación en GHCR
- Railway deploy desde imagen pre-construida

**Mejoras:**
- Builds más rápidos (5-6 minutos vs 10+ minutos)
- Sin timeouts
- Mejor control del proceso
- Auto-deploy en Railway

### 6. Fix de Migraciones en Producción

#### **Implementación: Enero 2026**

**Problema:**
- Migración `20260119000000_add_shop_system` falló parcialmente
- Prisma bloqueaba todas las migraciones siguientes (P3009)

**Solución:**
- Migración v2 idempotente (`20260120000000_add_shop_system_v2`)
- Auto-recovery en `start-production.sh`
- Detección y resolución automática de migraciones fallidas

**Técnica:**
- `prisma migrate resolve --applied` para marcar migración problemática
- Migración v2 usa `IF NOT EXISTS` y `DO $$ BEGIN ... END $$` para idempotencia

### 7. Mejoras de UI/UX

#### **Header/Navigation**
- **Web:** Hasta 10 brutos visibles en header
- **Mobile:** Removidos iconos del header, acceso vía nombre de usuario
- **Iconos:** Solo iconos sin texto en web
- **Alineación:** Centrado de botones de filtro

#### **Misiones/Logros**
- **Contraste:** Mejorado texto vs fondo
- **Recuadros:** Encapsulación de botones
- **Títulos:** Mostrar nombre real del título en lugar de "Título 1", "Título 2"

#### **Estadísticas**
- **Legibilidad:** Mejor contraste y espaciado
- **Organización:** Mejor estructura visual

---

## 🗄️ Base de Datos y Modelos

### Esquema Principal (Prisma)

#### **Ubicación:** `server/prisma/schema.prisma`

#### **Modelos Principales**

**User**
- Información de usuario
- Oro, límite de brutos
- Preferencias (idioma, música, velocidad de pelea)
- Relaciones: brutes, achievements, missions, etc.

**Brute**
- Información del bruto
- Stats (endurance, strength, agility, speed)
- Nivel, XP, HP
- Habilidades, armas, mascotas
- Path de destinos
- Relaciones: user, clan, fights, etc.

**Fight**
- Datos de pelea
- Steps (JSON con pasos de la pelea)
- Fighters (JSON con información de luchadores)
- Relaciones: brute1, brute2, tournament, clanWar

**Tournament**
- Torneos (diarios, globales, battle royale)
- Participantes, rondas
- Relaciones: fights, event

**Clan**
- Información de clan
- Boss, puntos, Elo
- Relaciones: brutes, clanWars

**ClanWar**
- Guerras entre clanes
- Estado, duración, ganador
- Relaciones: attacker, defender, fights

**Event**
- Eventos especiales
- Battle Royale
- Relaciones: brutes, tournament

**Mission**
- Misiones generales
- Progreso, completado, reclamado
- Relaciones: user

**DailyObjective / WeeklyObjective**
- Objetivos diarios/semanales
- Progreso, recompensas
- Relaciones: user

**Achievement**
- Logros de bruto
- Relaciones: brute, user

**PermanentAchievement**
- Logros permanentes de usuario
- Niveles (BRONZE, SILVER, GOLD, PLATINUM)
- Relaciones: user

**BattlePassSeason**
- Temporadas del pase
- Fechas de inicio/fin
- Relaciones: rewards, missions, userProgress

**ShopItem**
- Items de tienda
- Tipos, precios, valores
- Disponibilidad, orden

**BruteTemporaryWeapon**
- Armas temporales
- Expiración
- Relaciones: brute

**BruteTemporaryEffect**
- Habilidades temporales
- Expiración
- Relaciones: brute

**DestinyChoice**
- Elecciones de destino
- Path (array de LEFT/RIGHT)
- Tipo (skill, weapon, pet, stats)
- Relaciones: brute

### Enums Principales

- `ShopItemType`: COSMETIC, BONUS_FIGHTS, TEMPORARY_WEAPON, TEMPORARY_SKILL
- `DestinyChoiceSide`: LEFT, RIGHT
- `DestinyChoiceType`: skill, weapon, pet, stats
- `BruteStat`: endurance, strength, agility, speed
- `SkillName`: 49 habilidades
- `WeaponName`: 26 armas
- `PetName`: dog1, dog2, dog3, panther, bear
- `MissionType`: WIN_FIGHTS, WIN_TOURNAMENT, etc.
- `MissionCategory`: COMBAT, PROGRESSION, SOCIAL, EVENTS, SPECIAL
- `TournamentType`: DAILY, GLOBAL, UNLIMITED_GLOBAL, CUSTOM, BATTLE_ROYALE
- `FightModifier`: noThrows, focusOpponent, etc.

### Migraciones

#### **Estructura:** `server/prisma/migrations/`

**Migraciones Recientes:**
- `20260120000000_add_shop_system_v2`: Sistema de tienda (reparación)
- `20260119000000_add_shop_system`: Sistema de tienda (fallida, marcada como applied)
- `20250125000000_add_battle_pass_system`: Sistema de pase de batalla
- `20250116000001_add_missions_system`: Sistema de misiones

**Total:** 266+ migraciones

---

## ⏰ Sistema de Tareas Programadas (Daily Job)

### Funcionalidad

El `dailyJob` se ejecuta automáticamente una vez al día (configurado con `node-schedule`).

#### **Tareas Ejecutadas (en orden):**

1. **Releases:** Manejo de versiones y release notes
2. **Battle Pass:** Asegura próxima temporada si la actual termina en ≤1 día
3. **Modificadores Diarios:** Genera modificadores aleatorios para peleas
4. **Torneos Diarios:** 
   - Genera torneos de 64 participantes
   - Crea todas las peleas (63 por torneo)
   - Asigna recompensas (oro y XP)
5. **Torneo Global:**
   - Torneo único con todos los brutos registrados
   - Sistema de byes para potencias de 2
   - Grandes recompensas
6. **Torneo Global Ilimitado:**
   - Para brutos no registrados que pelearon en últimas 24h
7. **Guerras de Clanes:**
   - Procesa guerras activas
   - Genera peleas de guerra
   - Calcula ganadores y recompensas
8. **Eventos:**
   - Finaliza eventos terminados
   - Genera rondas de torneo de eventos
9. **Limpieza:**
   - Elimina brutos marcados para eliminación
10. **Logros:**
    - Otorga logro "beta" a brutos nuevos
    - Otorga logro "bug" a admins

#### **Server State Management**

- **Hold Traffic:** `ServerState.setReady(false)` durante generación de torneos
- **Release Traffic:** `ServerState.setReady(true)` al finalizar
- **Healthcheck:** Endpoint `/api/is-ready` verifica estado

#### **Memory Management**

- **Logging:** `logMemory()` después de cada tarea
- **Garbage Collection:** `triggerGC()` después de tareas pesadas
- **Optimización:** Procesamiento en chunks para evitar OOM

---

## 🛠️ Scripts y Utilidades

### Scripts de Producción

#### **postInstall.sh**
- **Propósito:** Ejecutado después de `yarn install`
- **Comportamiento:** 
  - Detecta CI/Docker y se salta
  - En producción: compila y build
  - En desarrollo: sync DB, compila, seed

#### **start-production.sh**
- **Propósito:** Inicio del servidor en producción
- **Funcionalidad:**
  - Ejecuta migraciones con auto-recovery
  - Ejecuta seed
  - Ejecuta scripts de bonus
  - Inicia servidor

### Scripts de Utilidad

#### **populateShopItems.ts**
- **Propósito:** Poblar items de tienda en base de datos
- **Funcionalidad:**
  - Crea/actualiza items de armas temporales
  - Crea/actualiza items de habilidades temporales
  - Crea/actualiza items de peleas extra
  - Precios basados en rareza y poder

#### **autoFightBot.ts**
- **Propósito:** Bot de peleas automáticas
- **Funcionalidad:**
  - Ejecuta peleas automáticas para usuarios
  - Hasta 10 brutos por usuario
  - Respeto de límites de peleas diarias

#### **getUserId.ts**
- **Propósito:** Obtener ID de usuario por nombre
- **Funcionalidad:**
  - Lista usuarios
  - Busca usuario por nombre
  - Muestra información y brutos

#### **giveBattlePassLevels.ts**
- **Propósito:** Asignar niveles de pase de batalla
- **Funcionalidad:**
  - Asigna XP y niveles a usuarios
  - Útil para testing

#### **setCauteruccioDestiny.sql**
- **Propósito:** Asignar build personalizada a bruto
- **Funcionalidad:**
  - Crea destinos LEFT y RIGHT para niveles 2-42
  - Build "Velocidad y Evasión con Armas Afiladas"

### Scripts de Build

#### **generateCoreExports.ts**
- **Propósito:** Generar exports del paquete core
- **Uso:** Ejecutar después de crear/eliminar archivos en core

#### **generateSitemap.ts**
- **Propósito:** Generar sitemap para SEO
- **Uso:** Ejecutar después de editar páginas principales

---

## 🏗️ Arquitectura de Código

### Backend (Express)

#### **Estructura de Controladores**

```
server/src/controllers/
├── Achievements.ts          # Logros de brutos
├── BattlePass.ts            # Pase de batalla
├── BruteReports.ts          # Reportes de brutos
├── Brutes.ts                # CRUD de brutos, level up, etc.
├── Clans.ts                  # Gestión de clanes
├── ClanWars.ts              # Guerras de clanes
├── Configs.ts                # Configuración del servidor
├── Events.ts                 # Eventos especiales
├── Fights.ts                 # Creación y gestión de peleas
├── LocalAuth.ts              # Autenticación local
├── Logs.ts                   # Logs de brutos
├── Missions.ts               # Misiones generales
├── Notifications.ts           # Notificaciones
├── OAuth.ts                  # OAuth Eternal-Twin
├── Objectives.ts             # Objetivos diarios/semanales
├── PermanentAchievements.ts  # Logros permanentes
├── Shop.ts                   # Sistema de tienda
├── Statistics.ts             # Estadísticas
├── Tournaments.ts            # Torneos
├── UserLogs.ts               # Logs de usuario
└── Users.ts                  # Gestión de usuarios
```

#### **Utils Principales**

```
server/src/utils/
├── brute/
│   ├── checkLevelUpAchievements.ts
│   ├── executeAutoFights.ts
│   ├── getOpponents.ts
│   ├── removeChoiceFromDestiny.ts
│   ├── resetBrute.ts
│   └── updateBruteData.ts
├── fight/
│   ├── fightMethods.ts       # Métodos de pelea (ataques, defensas, etc.)
│   ├── generateFight.ts       # Generación de peleas
│   ├── getDamage.ts
│   └── getFighters.ts
├── shop/
│   └── purchaseItem.ts        # Lógica de compra de items
├── auth.ts                    # Middleware de autenticación
├── createUserLog.ts           # Creación de logs de usuario
├── sendError.ts               # Manejo de errores
└── translate.ts               # Traducción
```

#### **Tareas Programadas**

**dailyJob.ts:**
- Generación de torneos diarios
- Generación de torneos globales
- Generación de torneos ilimitados
- Manejo de eventos
- Guerras de clanes
- Limpieza de brutos marcados para eliminación
- Otorgamiento de logros beta

### Frontend (React)

#### **Estructura de Vistas**

```
client/src/views/
├── admin/                    # Panel de administración
├── clan/                     # Vistas de clanes
├── event/                    # Vistas de eventos
├── mobile/                   # Vistas optimizadas móvil
├── AchievementsView.tsx
├── BattlePassView.tsx
├── MissionsView.tsx
├── ShopView.tsx
├── StatisticsView.tsx
├── TournamentView.tsx
└── ...
```

#### **Componentes Principales**

```
client/src/components/
├── Arena/                    # Componentes de arena
├── Brute/                    # Componentes de bruto
├── Cell/                     # Celda de bruto
├── Fight/                    # Visualización de peleas
└── ...
```

#### **Hooks Personalizados**

```
client/src/hooks/
├── useAlert.ts               # Sistema de alertas
├── useAuth.ts                # Autenticación
└── ...
```

#### **Utils del Cliente**

```
client/src/utils/
├── Server.ts                 # Cliente API (Fetch wrapper)
├── cookies.ts                # Manejo de cookies
├── catchError.ts             # Manejo de errores
└── ...
```

### Core (Shared)

#### **Estructura**

```
core/src/
├── brute/
│   ├── calculatedBrute.ts   # Cálculo de stats
│   ├── getLevelUpChoices.ts  # Generación de elecciones
│   ├── skills.ts             # Definición de habilidades
│   ├── weapons.ts            # Definición de armas
│   └── ...
├── constants.ts              # Constantes del juego
└── ...
```

---

## 📊 Métricas y Límites del Juego

### Límites del Sistema

- **Brutos por Usuario:** 10 (configurable)
- **Peleas Diarias:** 12 por bruto (+ bonus fights)
- **Participantes por Torneo Diario:** 64
- **Miembros por Clan:** 50
- **Niveles del Pase:** 40
- **XP por Nivel del Pase:** 300
- **Niveles de Bruto:** Sin límite máximo

### Constantes del Juego

- **Stats Iniciales:** 11 puntos distribuidos
- **XP Base:** Sistema progresivo
- **Oro por Torneo Diario:** 100
- **Oro por Torneo Global:** 150
- **Recompensas de Boss:** 500 XP, 500 oro

---

## 🔐 Seguridad y Autenticación

### Autenticación

#### **Local Auth**
- **Método:** Username + shared secret
- **Implementación:** `server/src/controllers/LocalAuth.ts`
- **Variables:** `LOCAL_AUTH_SECRET`
- **Auto-creación:** Usuarios se crean automáticamente

#### **OAuth (Eternal-Twin)**
- **Método:** OAuth 2.0
- **Implementación:** `server/src/controllers/OAuth.ts`
- **Variables:** `ETERNALTWIN_URL`, `ETERNALTWIN_CLIENT_REF`, etc.

### Seguridad

- **CSRF Protection:** `csrf-csrf` package
- **Cookie Security:** HttpOnly, Secure en producción
- **Input Validation:** Validación en controladores
- **Error Handling:** No exposición de información sensible

---

## 🌐 Internacionalización

### Sistema i18n

- **Backend:** i18next con fs-backend
- **Frontend:** react-i18next
- **Archivos:** `client/public/i18n/`
- **Idiomas:** en, fr, de, es, ru, pt
- **Traducción:** Crowdin integration

---

## 📈 Monitoreo y Observabilidad

### OpenTelemetry (Opcional)

- **Habilitación:** `OTEL_ENABLED=true`
- **Tracing:** Instrumentación de Express y HTTP
- **Export:** OTLP Proto

### Logs

- **User Logs:** Tracking de acciones de usuario
- **Server Logs:** Logging en consola
- **Discord:** Notificaciones de errores (opcional)

---

## 🐛 Problemas Resueltos y Soluciones

### 1. Migración Fallida en Producción (Shop System)

#### **Problema:**
- Migración `20260119000000_add_shop_system` falló parcialmente
- El tipo `ShopItemType` se creó, pero la migración quedó marcada como `failed`
- Prisma bloqueaba todas las migraciones siguientes (error P3009)

#### **Causa Raíz:**
- Uso de `gen_random_uuid()` que requiere extensión `pgcrypto`
- La extensión no estaba habilitada en el momento de la migración
- Migración falló a mitad de camino

#### **Solución Implementada:**
1. **Migración V2 Idempotente:**
   - `20260120000000_add_shop_system_v2`
   - Usa `uuid_generate_v4()` (extensión `uuid-ossp` ya existente)
   - Usa `IF NOT EXISTS` y bloques `DO $$ BEGIN ... END $$` para idempotencia

2. **Auto-Recovery en Startup:**
   - `start-production.sh` detecta migraciones fallidas
   - Marca la migración problemática como `applied` (sin ejecutar SQL)
   - Reintenta `db:sync:prod` (aplica migración v2)

3. **Resultado:**
   - Sistema se auto-repara en cada deploy
   - No requiere intervención manual
   - Migración v2 repara cualquier inconsistencia

### 2. Build Timeouts en Railway

#### **Problema:**
- Railway con Nixpacks tenía timeouts en builds grandes
- Builds de 10+ minutos fallaban
- Monorepo con múltiples workspaces era muy pesado

#### **Solución:**
1. **Dockerfile Multi-Stage:**
   - Build stage: Compila todo
   - Runtime stage: Solo copia artefactos necesarios
   - Reduce tamaño de imagen final

2. **GitHub Actions CI/CD:**
   - Build en GitHub Actions (más recursos)
   - Publicación en GHCR
   - Railway deploy desde imagen pre-construida

3. **Optimizaciones:**
   - Cache de dependencias (copia manifests primero)
   - Deshabilitación de scripts durante build
   - Instalación de OpenSSL para Prisma

### 3. Postinstall Script en Docker Build

#### **Problema:**
- `postInstall.sh` se ejecutaba durante `yarn install` en Docker
- Intentaba hacer `db:sync` sin acceso a DB
- Causaba fallos en build

#### **Solución:**
1. **Detección de Entorno:**
   - Script detecta `CI=true` o `YARN_ENABLE_SCRITPS=false`
   - Se salta automáticamente en CI/Docker

2. **Dockerfile:**
   - `YARN_ENABLE_SCRIPTS=false` en build stage
   - Scripts se ejecutan manualmente después

### 4. Yarn 4.0.2 y Workspace Scripts

#### **Problema:**
- Yarn 4 intenta ejecutar scripts del workspace root incluso con `YARN_ENABLE_SCRIPTS=false`
- Causaba `exit code 127` en builds

#### **Solución:**
1. **Eliminación Temporal:**
   - Elimina `postinstall` de `package.json` antes de `yarn install`
   - Restaura después (aunque se sobrescribe con `COPY . .`)

2. **Doble Protección:**
   - Variable de entorno + detección en script
   - Garantiza que no se ejecute en CI

### 5. Errores de ESLint y TypeScript en Build de Docker (Enero 2026)

#### **Contexto:**
Durante la implementación del sistema de habilidades y armas temporales en la UI, el build de Docker fallaba repetidamente con errores de ESLint y TypeScript. Se requirieron múltiples iteraciones para resolver todos los problemas.

#### **Errores Encontrados y Soluciones:**

##### **5.1. ESLint `max-len` - Líneas Demasiado Largas**

**Problema:**
- Múltiples archivos tenían líneas que excedían el límite de caracteres (100-120 caracteres)
- Archivos afectados: `ProvideBrute.tsx`, `CellMain.tsx`, `SimpleLoginView.tsx`, `useAuth.tsx`, `HomeView.tsx`, `ShopView.tsx`

**Ejemplo de Error:**
```
Line 84: This line has 125 characters, but the maximum is 100
```

**Solución:**
- Dividir líneas largas en múltiples líneas
- Usar paréntesis para agrupar expresiones
- Extraer variables intermedias cuando sea necesario

**Archivos Corregidos:**
- `client/src/components/Brute/ProvideBrute.tsx`
- `client/src/components/Cell/CellMain.tsx`
- `client/src/views/SimpleLoginView.tsx`
- `client/src/hooks/useAuth.tsx`
- `client/src/views/HomeView.tsx`
- `client/src/views/ShopView.tsx`

##### **5.2. ESLint `no-shadow` - Variable Shadowing**

**Problema:**
- Variables dentro de funciones `map()` usaban nombres que ya existían en el scope superior
- Ejemplo: usar `t` para el loop cuando `t` ya se usaba para la función de traducción (`useTranslation()`)

**Ejemplo de Error:**
```typescript
const { t } = useTranslation();
// ...
.map((t) => ...) // ❌ Shadowing de 't'
```

**Solución:**
- Renombrar variables de loop con nombres descriptivos
- `t` → `temp` (para temporary effects)
- `s` → `skill` (para skills)
- `w` → `weapon` (para weapons)

**Archivos Corregidos:**
- `client/src/components/Cell/CellMain.tsx`
- `client/src/components/Cell/CellSkills.tsx`
- `client/src/views/ShopView.tsx`

##### **5.3. TypeScript `TS2345` - Incompatibilidad de Tipos**

**Problema:**
- Tipos locales `TempSkill` y `TempWeapon` usaban `string` para `skillName` y `weaponName`
- La función `applyTemporaryEffects` esperaba `TemporarySkillEffect[]` y `TemporaryWeaponEffect[]` de `@labrute/core`
- Estos tipos usan `SkillName` y `WeaponName` (tipos más específicos que `string`)

**Ejemplo de Error:**
```
TS2345: Argument of type 'TempSkill[]' is not assignable to parameter of type 'TemporarySkillEffect[]'.
  Type 'TempSkill' is not assignable to type 'TemporarySkillEffect'.
    Types of property 'skillName' are incompatible.
      Type 'string' is not assignable to type 'SkillName'.
```

**Solución:**
1. **Importar tipos del core:**
   ```typescript
   import { TemporarySkillEffect, TemporaryWeaponEffect } from '@labrute/core';
   ```

2. **Usar tipos del core en lugar de tipos locales:**
   ```typescript
   // ❌ Antes:
   type TempSkill = { skillName: string; expiresAt: string };
   
   // ✅ Después:
   type TempSkill = TemporarySkillEffect;
   ```

**Archivos Corregidos:**
- `client/src/hooks/useAuth.tsx`
- `client/src/views/HomeView.tsx`
- `client/src/views/ShopView.tsx`
- `client/src/views/SimpleLoginView.tsx`

##### **5.4. ESLint `@typescript-eslint/no-unnecessary-type-assertion`**

**Problema:**
- Type assertions innecesarias en `ProvideBrute.tsx`
- Las aserciones no cambiaban el tipo real de la expresión

**Ejemplo de Error:**
```typescript
const tempSkills = (data.temporarySkills ?? []) as TemporarySkillEffect[];
// ❌ Assertion innecesaria
```

**Solución:**
- Eliminar type assertions cuando TypeScript puede inferir el tipo correctamente
- Confiar en los tipos del core que ya son correctos

**Archivo Corregido:**
- `client/src/components/Brute/ProvideBrute.tsx`

##### **5.5. ESLint `@typescript-eslint/no-unused-vars`**

**Problema:**
- Imports no utilizados después de refactorizar código
- Variables no utilizadas después de eliminar type assertions

**Ejemplo de Error:**
```
'TemporarySkillEffect' is defined but never used
'TemporaryWeaponEffect' is defined but never used
```

**Solución:**
- Eliminar imports no utilizados
- Usar solo los tipos necesarios

**Archivos Corregidos:**
- `client/src/components/Brute/ProvideBrute.tsx`
- `client/src/utils/applyTemporaryEffects.ts`

##### **5.6. ESLint `prefer-destructuring`**

**Problema:**
- Acceso a propiedades de objetos sin usar destructuring
- ESLint recomienda usar destructuring para mejor legibilidad

**Ejemplo de Error:**
```typescript
// ❌ Antes:
for (const temp of temporarySkills) {
  const skillName = temp.skillName;
}

// ✅ Después:
for (const { skillName } of temporarySkills) {
  // ...
}
```

**Solución:**
- Usar destructuring en loops y asignaciones
- Mejora la legibilidad y sigue las convenciones de ESLint

**Archivo Corregido:**
- `client/src/utils/applyTemporaryEffects.ts`

##### **5.7. TypeScript `TS2740` - Uso Incorrecto de Objetos como Arrays**

**Problema:**
- En `ShopView.tsx`, se intentaba usar `skills` y `weapons` como arrays (`string[]`)
- En realidad, son objetos de tipo `Partial<Record<SkillName, number>>` y `Partial<Record<WeaponName, number>>`

**Ejemplo de Error:**
```typescript
// ❌ Antes:
const skillsArray: string[] = selectedBrute.skills ?? [];
const permTier = skillsArray.filter((skillName) => skillName === skill).length;

// Error: Type 'Partial<Record<SkillName, number>>' is missing properties from type 'string[]'
```

**Solución:**
- Acceder directamente al objeto usando la clave como índice
- Obtener el tier directamente del objeto en lugar de filtrar un array

**Código Corregido:**
```typescript
// ✅ Después:
const permTier = selectedBrute.skills?.[skill as keyof typeof selectedBrute.skills] ?? 0;
```

**Archivo Corregido:**
- `client/src/views/ShopView.tsx`

#### **Lecciones Aprendidas:**

1. **Consistencia de Tipos:**
   - Siempre usar tipos del core (`@labrute/core`) en lugar de definir tipos locales duplicados
   - Los tipos del core (`TemporarySkillEffect`, `TemporaryWeaponEffect`) ya están correctamente tipados con `SkillName` y `WeaponName`

2. **Nombres de Variables Descriptivos:**
   - Evitar nombres genéricos como `t`, `s`, `w` en loops
   - Usar nombres descriptivos como `temp`, `skill`, `weapon` para evitar shadowing

3. **Estructura de Datos:**
   - Entender la estructura real de los datos (`skills` y `weapons` son objetos, no arrays)
   - Consultar los tipos TypeScript antes de asumir la estructura

4. **Type Assertions:**
   - Evitar type assertions innecesarias
   - Confiar en la inferencia de tipos de TypeScript cuando sea posible

5. **Imports Limpios:**
   - Eliminar imports no utilizados regularmente
   - Usar herramientas de IDE para detectar imports no utilizados

6. **Destructuring:**
   - Usar destructuring para mejorar legibilidad
   - Especialmente útil en loops y cuando se accede a múltiples propiedades

#### **Proceso de Resolución:**

1. **Iteración 1:** Corrección de `max-len` (líneas largas)
2. **Iteración 2:** Corrección de `no-shadow` (variable shadowing)
3. **Iteración 3:** Corrección de tipos (`TS2345` - incompatibilidad de tipos)
4. **Iteración 4:** Eliminación de type assertions innecesarias
5. **Iteración 5:** Eliminación de imports no utilizados
6. **Iteración 6:** Corrección de uso de objetos como arrays (`TS2740`)

**Total de Commits:** 6 commits para resolver todos los errores
**Tiempo Total:** ~30 minutos de builds iterativos

#### **Prevención Futura:**

1. **Pre-commit Hooks:**
   - Considerar usar `husky` con `lint-staged` para ejecutar ESLint antes de commits
   - Prevenir errores antes de que lleguen a CI/CD

2. **Type Checking Local:**
   - Ejecutar `yarn compile` y `yarn build:client` localmente antes de push
   - Usar `yarn lint` para verificar errores de ESLint

3. **IDE Configuration:**
   - Configurar ESLint en el IDE para mostrar errores en tiempo real
   - Usar TypeScript strict mode para detectar errores de tipos temprano

4. **Code Review:**
   - Revisar tipos y estructura de datos antes de merge
   - Verificar que se usen tipos del core en lugar de tipos locales

---

## 🎯 Próximas Mejoras Sugeridas

### Técnicas
1. **Cache Layer:** Redis para sesiones y datos frecuentes
2. **CDN:** Para assets estáticos
3. **Rate Limiting:** Protección contra abuso
4. **Monitoring:** Integración con servicios de monitoreo (Datadog, Sentry, etc.)
5. **Testing:** Suite de tests automatizados (Jest, React Testing Library)
6. **Database Optimization:** Índices adicionales, query optimization
7. **API Versioning:** Versionado de API para cambios futuros
8. **GraphQL:** Considerar GraphQL para queries complejas

### Funcionales
1. **Cosméticos:** Implementación completa del sistema de cosméticos
2. **Social Features:** Mejoras en seguimiento, feed, mensajería
3. **Leaderboards:** Rankings globales por categorías
4. **Achievements:** Más logros y títulos personalizados
5. **Events:** Más tipos de eventos (torneos especiales, eventos temáticos)
6. **Guilds/Alliances:** Sistema de alianzas entre clanes
7. **Trading:** Sistema de intercambio entre usuarios
8. **Seasons:** Temporadas con recompensas especiales

---

## 📝 Notas de Desarrollo

### Comandos Útiles

```bash
# Desarrollo
yarn dev                    # Inicia todo (DB, server, client, etwin)
yarn front                  # Solo frontend
yarn back                   # Solo backend
yarn studio                 # Prisma Studio

# Build
yarn compile                # Compila TypeScript
yarn build:client           # Build del frontend
yarn build                  # Compila y build completo

# Base de Datos
yarn db:sync:dev            # Sincroniza DB (desarrollo)
yarn db:sync:prod           # Aplica migraciones (producción)
yarn db:seed                # Pobla base de datos
yarn db:reset               # Resetea DB completa

# Utilidades
yarn core:export            # Regenera exports de core
yarn sitemap:generate       # Genera sitemap
yarn sfx:generate           # Genera spritesheet de sonidos
```

### Convenciones de Código

- **TypeScript:** Strict mode habilitado
- **ESLint:** Configuración Airbnb
- **Imports:** Usar `import type` para tipos
- **Error Handling:** Usar `ExpectedError`, `LimitError`, `NotFoundError`
- **Traducción:** Usar `translate()` en backend, `useTranslation()` en frontend

---

## 🔗 Referencias Importantes

### Documentación Externa
- **Prisma:** https://www.prisma.io/docs
- **Express:** https://expressjs.com/
- **React:** https://react.dev/
- **Material-UI:** https://mui.com/
- **PixiJS:** https://pixijs.com/

### Archivos Clave del Proyecto
- `server/prisma/schema.prisma` - Schema de base de datos
- `server/src/routes.ts` - Definición de rutas API
- `client/src/routes.tsx` - Definición de rutas frontend
- `Dockerfile` - Configuración Docker
- `.github/workflows/publish-ghcr.yml` - CI/CD
- `scripts/start-production.sh` - Script de inicio producción

---

## 📚 Referencias de Implementación

### Endpoints API Principales

#### **Autenticación**
- `GET /api/oauth/redirect` - OAuth redirect
- `POST /api/oauth/token` - OAuth token exchange
- `POST /api/auth/simple-login` - Local auth login
- `GET /api/user/authenticate` - Verificar autenticación

#### **Brutos**
- `GET /api/brute/list` - Lista de brutos
- `POST /api/brute/create` - Crear bruto
- `GET /api/brute/:name` - Obtener bruto
- `PATCH /api/brute/:name/level-up/:stat` - Subir nivel
- `PATCH /api/brute/:name/set-destiny` - Elegir destino
- `PATCH /api/brute/:name/ascend` - Ascender bruto

#### **Peleas**
- `PATCH /api/fight` - Crear pelea
- `GET /api/fight/:id` - Obtener pelea

#### **Torneos**
- `PATCH /api/tournament/:name/register` - Registrar en torneo
- `GET /api/tournament/:name/history` - Historial de torneos

#### **Misiones**
- `GET /api/missions` - Obtener misiones
- `POST /api/missions/:id/claim` - Reclamar misión

#### **Tienda**
- `GET /api/shop` - Obtener items
- `POST /api/shop/purchase` - Comprar item

#### **Pase de Batalla**
- `GET /api/battle-pass` - Obtener pase
- `POST /api/battle-pass/claim-level` - Reclamar nivel

#### **Estadísticas**
- `GET /api/statistics/:name` - Estadísticas de bruto

### Flujos de Usuario Principales

#### **Creación de Bruto**
1. Usuario autenticado
2. Verificar límite de brutos
3. Generar stats aleatorios
4. Crear primer bonus (destino)
5. Guardar bruto en DB
6. Actualizar logros de creación

#### **Level Up**
1. Verificar XP suficiente
2. Generar opciones de destino (o usar existentes)
3. Usuario elige LEFT o RIGHT
4. Aplicar elección (habilidad/arma/pet/stats)
5. Actualizar stats calculadas
6. Verificar logros de nivel
7. Guardar en DB

#### **Pelea**
1. Seleccionar oponente
2. Verificar peleas disponibles
3. Generar pelea (generateFight)
4. Guardar resultado
5. Actualizar XP/Gold
6. Actualizar stats de bruto
7. Verificar logros
8. Actualizar misiones

#### **Compra en Tienda**
1. Verificar autenticación
2. Verificar oro suficiente
3. Validar item disponible
4. Procesar compra según tipo:
   - COSMETIC: Desbloquear
   - BONUS_FIGHTS: Agregar peleas
   - TEMPORARY_WEAPON: Crear arma temporal
   - TEMPORARY_SKILL: Crear habilidad temporal
5. Descontar oro
6. Crear log de transacción
7. Actualizar datos de usuario

---

## 🔍 Detalles Técnicos Adicionales

### Sistema de Modificadores de Pelea

#### **Modificadores Diarios**
- Se generan aleatoriamente cada día
- Afectan todas las peleas del día
- Ejemplos: `noThrows`, `doubleAgility`, `alwaysUseSupers`, etc.

#### **Modificadores de Torneo**
- Modificadores específicos por torneo
- Pueden variar entre torneos

### Sistema de Backup en Peleas

#### **Funcionalidad**
- Si un bruto tiene la habilidad `backup`
- Puede llamar a otro bruto del usuario como backup
- El backup entra en la pelea si el bruto principal muere

### Sistema de Mascotas

#### **Tipos**
- **Dogs:** 3 variantes (dog1, dog2, dog3)
- **Panther:** Mascota poderosa
- **Bear:** Mascota muy poderosa

#### **Efectos**
- Afectan stats del bruto (malus de endurance)
- Participan en peleas
- Pueden ser atacadas y eliminadas

### Sistema de Inventario

#### **Tipos de Items**
- `visualReset`: Reset visual del bruto
- `bossTicket`: Ticket para pelear boss de clan
- `nameChange`: Cambio de nombre
- `favoriteFight`: Marcar pelea como favorita

---

## 📝 Notas de Mantenimiento

### Regeneración de Prisma Client

```bash
cd server
yarn prisma generate
```

### Aplicar Migraciones Manualmente

```bash
cd server
yarn prisma migrate deploy
```

### Poblar Items de Tienda

```bash
npx ts-node scripts/populateShopItems.ts
```

### Verificar Estado del Servidor

```bash
curl https://your-domain.com/api/is-ready
```

---

**Fin del Documento de Análisis**

*Este documento se actualiza periódicamente con nuevas implementaciones y mejoras.*  
*Última actualización: Enero 2026*
