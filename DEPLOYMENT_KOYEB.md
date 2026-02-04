# LaBrute - Despliegue en Koyeb (alternativa a Railway)

Esta guía explica cómo desplegar LaBrute en [Koyeb](https://www.koyeb.com/) como alternativa cuando Railway no es viable (por ejemplo, por restricciones de pago con tarjetas de débito/prepago).

## ¿Es buena opción Koyeb? ¿Es gratis para siempre?

- **Sí, es una alternativa sólida**: Koyeb permite 1 servicio web + 1 base de datos Postgres en su capa gratuita, con soporte para Docker y regiones en US, EU y Asia. Es una de las opciones más parecidas a lo que Railway ofrecía.
- **Compromiso con el free tier**: Koyeb ha declarado públicamente su compromiso a mantener un plan gratuito a largo plazo (tras el cierre del free tier de Heroku), basándose en su propia infraestructura y en scale-to-zero para mantener costes bajos. No hay “garantía de por vida” en términos legales, pero es un free tier pensado para perdurar.
- **Limitaciones del free tier**:
  - **Scale-to-zero**: Los servicios gratuitos se “duermen” tras ~1 hora sin tráfico (web) y la base de datos tras ~5 minutos sin uso. La primera pelea o carga tras un rato puede tardar unos segundos (cold start).
  - **Postgres free**: 0.25 vCPU, 1 GB RAM, **5 horas de compute al mes**, hasta **1 GB** de datos. Para uso bajo (grupo pequeño, pocas peleas al día) suele bastar.
  - **Pago para registrarse**: Koyeb puede pedir un método de pago (tarjeta) para combatir fraude; el uso dentro del free tier sigue siendo $0. Conviene comprobar en [koyeb.com/pricing](https://www.koyeb.com/pricing) y en el registro si aceptan tu tipo de tarjeta.

## Arquitectura en Koyeb

```
┌─────────────────────────────────────────────────────────┐
│  Koyeb App                                              │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Web Service (Docker o Git)                        │ │
│  │  Express + client/build, healthcheck /api/is-ready  │ │
│  └───────────────────────────────────────────────────┘ │
│                          │                              │
│                          ▼                              │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Database Service (PostgreSQL)                    │ │
│  │  DATABASE_URL desde Connection Details            │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Requisitos previos

- Cuenta en [Koyeb](https://app.koyeb.com/) (y método de pago si lo solicitan).
- Repositorio de LaBrute en GitHub (para despliegue desde Git o desde imagen Docker en GHCR).

## Paso 1: Crear la base de datos Postgres en Koyeb

1. En [Koyeb](https://app.koyeb.com/) → pestaña **Databases** → **Create Database Service**.
2. Configuración sugerida:
   - **Name**: p. ej. `labrute-db`
   - **Region**: la más cercana a tus usuarios (Frankfurt, Washington D.C. o Singapore).
   - **Engine**: PostgreSQL 16 (o 15).
   - **Default role**: p. ej. `koyeb-adm` (o el que prefieras).
   - **Instance type**: **free** (0.25 vCPU, 1 GB RAM, 5 h compute/mes, 1 GB almacenamiento).
3. Crear el servicio y esperar a que esté listo.
4. En el Database Service → pestaña **Connection Details** → elegir la base de datos (por defecto `koyebdb`). Si quieres una base dedicada, en la pestaña **Databases** crea una nueva (p. ej. `labrute`) y usa esa en la connection string.
5. Copiar la **connection string** (formato `postgres://usuario:password@host/database`). La usarás como `DATABASE_URL` en el servicio web.
   - **Importante:** Si la contraseña del rol contiene caracteres especiales (`@`, `#`, `:`, `/`, `?`, `&`, `=`, `%`, etc.), debes **codificarla en la URL** (ver sección [Error P1010: User was denied access](#error-p1010-user-was-denied-access) más abajo).

## Paso 2: Desplegar la aplicación

Tienes dos opciones: **Docker** (imagen preconstruida, p. ej. desde GHCR) o **Git** (Koyeb construye desde el repo).

### Opción A: Desplegar desde imagen Docker (recomendado si ya usas GHCR)

1. En Koyeb → **Create App** → **Create Service**.
2. **Source**: **Docker**.
3. **Image**: la URL de tu imagen, por ejemplo:
   - Docker Hub: `docker.io/tu-usuario/labrute:latest`
   - GitHub Container Registry: `ghcr.io/tu-usuario/labrute:latest`
4. **Instance type**: elegir **free** (o el más pequeño disponible en el plan gratuito).
5. **Port**: el que use tu app (por defecto LaBrute usa el que indique `PORT`; Koyeb suele inyectar `PORT=8000`).
6. **Environment variables** (Variables → añadir):

   | Variable           | Descripción                                      | Ejemplo                          |
   |--------------------|---------------------------------------------------|----------------------------------|
   | `DATABASE_URL`     | Connection string de Koyeb (Paso 1)               | `postgres://...`                 |
   | `NODE_ENV`         | Debe ser `production`                             | `production`                     |
   | `SELF_URL`         | URL pública de la app **con barra final**        | `https://tu-app.koyeb.app/`      |
   | `COOKIE_SECRET`    | Cadena aleatoria 32+ caracteres                   | (generar una)                    |
   | `CSRF_SECRET`      | Otra cadena aleatoria 32+ caracteres             | (generar una)                    |
   | `LOCAL_AUTH_SECRET`| Contraseña compartida para login local            | (la que uses con tu grupo)       |

   No hace falta definir `PORT` si Koyeb ya lo inyecta.

7. **Health check** (opcional pero recomendado): Path ` /api/is-ready`, timeout razonable (p. ej. 300 s en el primer arranque por las migraciones).
8. Crear el servicio. Koyeb desplegará la imagen; el script `scripts/start-production.sh` ejecutará migraciones y seed y luego iniciará el servidor.

**Redeploy automático**: Koyeb **no** redeploya solo cuando actualizas la imagen en el registro. Para redeployar al publicar una nueva imagen (p. ej. `:latest`), puedes usar un webhook (ver [Koyeb – Pre-Built Docker Images](https://koyeb.com/docs/build-and-deploy/prebuilt-docker-images)) o redeploy manual desde el panel.

### Opción B: Desplegar desde Git (Koyeb construye con Dockerfile)

1. En Koyeb → **Create App** → **Create Service**.
2. **Source**: **GitHub** → conectar el repo y elegir la rama (p. ej. `main`).
3. **Builder**: **Dockerfile** (Koyeb detectará el `Dockerfile` en la raíz).
4. **Instance type**: **free**.
5. **Port**: dejar el que Koyeb asigne (por defecto suele ser 8000; LaBrute lee `PORT`).
6. Añadir las mismas **variables de entorno** que en la tabla de la Opción A.
7. **Health check**: Path ` /api/is-ready`.
8. Crear el servicio. El primer deploy puede tardar varios minutos (build + migraciones + seed).

Con Git, cada push a la rama configurada puede disparar un nuevo deploy (según la configuración de Koyeb).

## Paso 3: URL pública y dominio

- Koyeb asigna una URL tipo `https://tu-app-xxx.koyeb.app`. Úsala como `SELF_URL` (con barra final) en las variables de entorno.
- Si cambias la URL (p. ej. dominio propio), actualiza `SELF_URL` y vuelve a desplegar o reiniciar.
- En el plan gratuito puedes usar un **dominio propio** (consultar [Koyeb – Domains](https://koyeb.com/docs/run-and-scale/domains)).

## Migrar datos desde Railway (opcional)

Si ya tenías datos en PostgreSQL de Railway:

1. **Exportar desde Railway**: Conectar por `psql` o con un cliente usando `DATABASE_URL` de Railway y hacer un dump:
   ```bash
   pg_dump "$DATABASE_URL" -Fc -f labrute_backup.dump
   ```
2. **Importar en Koyeb**: Usar la connection string del Paso 1 y restaurar:
   ```bash
   pg_restore -d "$DATABASE_URL_KOYEB" --no-owner --no-acl labrute_backup.dump
   ```
   Ajusta opciones de `pg_restore` si hay diferencias de versiones o extensiones.

Después de importar, despliega la app en Koyeb apuntando a esta base; no hace falta volver a ejecutar seed si ya migraste todo.

## Variables de entorno (resumen)

Mismas que en Railway (ver [DEPLOYMENT.md](./DEPLOYMENT.md)):

| Variable             | Obligatoria | Descripción                    |
|---------------------|------------|--------------------------------|
| `DATABASE_URL`      | Sí         | Connection string de Koyeb DB  |
| `NODE_ENV`          | Sí         | `production`                   |
| `SELF_URL`          | Sí         | URL pública con barra final    |
| `COOKIE_SECRET`     | Sí         | 32+ caracteres                 |
| `CSRF_SECRET`       | Sí         | 32+ caracteres                 |
| `LOCAL_AUTH_SECRET` | Sí (auth local) | Contraseña compartida    |
| `PORT`              | No         | Koyeb suele inyectarlo         |

## Error P1010: User was denied access

Si Prisma falla con **P1010: User was denied access on the database `(not available)`**, casi siempre es porque la **contraseña** del usuario de Postgres contiene **caracteres especiales** y no está codificada en la URL.

En una URL de tipo `postgres://usuario:password@host/database`, el `@` que separa contraseña y host hace que, si la contraseña lleva por ejemplo `@` o `#`, el parser interprete mal la URL y Postgres rechace la conexión.

**Solución:** codificar (URL-encode) **solo la parte de la contraseña** en `DATABASE_URL`:

| Carácter | Reemplazo |
|----------|-----------|
| `@`      | `%40`     |
| `#`      | `%23`     |
| `:`      | `%3A`     |
| `/`      | `%2F`     |
| `?`      | `%3F`     |
| `&`      | `%26`     |
| `=`      | `%3D`     |
| `%`      | `%25`     |
| espacio  | `%20`     |

**Ejemplo:** si Koyeb te dio esta connection string (con la contraseña visible):

```
postgres://koyeb-adm:abc@x#123@ep-xxx.pg.koyeb.app/koyebdb
```

la contraseña es `abc@x#123`. Debes reemplazarla por su versión codificada: `abc%40x%23123`. La URL correcta sería:

```
postgres://koyeb-adm:abc%40x%23123@ep-xxx.pg.koyeb.app/koyebdb
```

**Pasos:**

1. En Koyeb → tu Database Service → **Connection Details** → revelar la contraseña del rol y copiar la connection string.
2. Abrir la URL y localizar la contraseña (entre el primer `:` después de `//` y el `@` antes del host).
3. Codificar esa contraseña (a mano o con una herramienta; en Node: `encodeURIComponent('tu-password')` — ten en cuenta que `encodeURIComponent` codifica también `!` `'` `(` `)` `~`; para una URL de Postgres suele estar bien).
4. Sustituir en la URL la contraseña en claro por la codificada.
5. Usar esa URL completa como valor de **DATABASE_URL** en las variables de entorno del **servicio web** (no del Database Service). Guardar y redeployar.

Si la contraseña no tiene caracteres especiales y sigues teniendo P1010, comprueba que estás usando la connection string del **rol por defecto** (p. ej. `koyeb-adm`) que es dueño de la base `koyebdb`, y que en el servicio web la variable se llama exactamente `DATABASE_URL` (no un Secret que inyecte otro nombre o formato).

## Cold start (servicios dormidos)

- Tras inactividad, el servicio web y/o la base de datos pueden dormirse. La primera petición puede tardar varios segundos.
- Para reducir molestias: usar la app de forma algo regular o aceptar el cold start como trade-off del plan gratuito.

## Referencias

- [Koyeb – Pre-Built Docker Images](https://koyeb.com/docs/build-and-deploy/prebuilt-docker-images)
- [Koyeb – Databases (PostgreSQL)](https://koyeb.com/docs/databases)
- [Koyeb – Scale-to-Zero](https://koyeb.com/docs/run-and-scale/scale-to-zero)
- [Koyeb Pricing](https://www.koyeb.com/pricing)
