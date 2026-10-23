# Despliegue de Mafer

Mafer son dos piezas: una **API Node.js** con PostgreSQL y un **frontend estático** (archivos de `client/dist`).

## Opción recomendada: mismo dominio con proxy inverso

Servir frontend y API bajo el mismo dominio evita problemas de cookies entre sitios:

```
https://mafer.mx/            → client/dist (estático)
https://mafer.mx/api/*       → API Node (puerto 4000)
https://mafer.mx/uploads/*   → API Node
```

Ejemplo con Nginx o Caddy en un VPS, o con una plataforma que permita reglas de *rewrite*/proxy hacia la API.

Si usas dominios distintos (p. ej. `app.mafer.mx` y `api.mafer.mx`), deben compartir el dominio principal para que la cookie `SameSite=Lax` funcione, y debes:
- poner `CLIENT_URL=https://app.mafer.mx` en la API,
- compilar el frontend con `VITE_API_URL=https://api.mafer.mx/api/v1`.

## Requisitos por servicio

| Pieza | Requisitos |
|---|---|
| API | Node.js ≥ 20.19, proceso persistente (no funciona como funciones efímeras sin adaptar: hay limpieza periódica de sesiones y subida de archivos a disco). |
| Imágenes subidas | Se guardan en `server/uploads/`. En plataformas con disco efímero, monta un volumen persistente o migra a almacenamiento de objetos (pendiente). |
| PostgreSQL | 14+. Servicio administrado con copias de seguridad automáticas. |
| HTTPS | Obligatorio en producción (cookies `Secure` y webhooks de Stripe). |

## Pasos

```bash
pnpm install --frozen-lockfile
pnpm build

# Variables de la API (ver server/.env.example)
NODE_ENV=production
DATABASE_URL=postgresql://...
CLIENT_URL=https://mafer.mx
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Migraciones (no destructivas; nunca uses migrate dev en producción)
pnpm db:deploy

# Primer administrador
ADMIN_EMAIL=... ADMIN_PASSWORD=... pnpm admin:create

# Iniciar
pnpm start
```

El frontend se publica copiando `client/dist/` al hosting estático, con *fallback* de todas las rutas a `index.html` (es una SPA). Antes de compilar, pon `VITE_DEMO_NOTICE=false` cuando el catálogo real esté cargado.

## Migraciones seguras

1. Respaldo de la base antes de cada despliegue.
2. `pnpm db:deploy` aplica solo migraciones versionadas en `server/prisma/migrations`.
3. Cambios destructivos (renombrar/eliminar columnas) en dos despliegues: primero añadir y copiar datos, después eliminar.

## Copias de seguridad

- Usa los respaldos automáticos del proveedor (retención mínima de 7 días) **y** un `pg_dump` diario externo:
  ```bash
  pg_dump --format=custom "$DATABASE_URL" > mafer-$(date +%F).dump
  ```
- Prueba la restauración periódicamente con `pg_restore` en una base aparte.
- Respalda también la carpeta `uploads/` si guardas imágenes en disco.

## Lista de verificación previa a producción

- [ ] Claves `live` de Stripe y webhook de producción registrado.
- [ ] Proveedor de correo integrado (hoy los correos se imprimen en consola).
- [ ] Datos de contacto, dirección de recogida, horarios, costos de envío y políticas configurados en el panel.
- [ ] Textos legales revisados por asesoría legal.
- [ ] Productos y precios reales; productos de demostración archivados.
- [ ] `VITE_DEMO_NOTICE=false`.
