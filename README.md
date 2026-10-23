# Mafer — Pastelería y repostería en línea

> «Pequeños antojos, grandes momentos»

Tienda web de Mafer: catálogo de cupcakes, pasteles, galletas y postres personalizados, cuentas de cliente, carrito, pedidos con fecha y horario, pagos con Stripe Checkout y panel administrativo.

| Capa | Tecnología |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4, TanStack Query, React Router 7 |
| Backend | Node.js (≥ 20.19), Express 5, TypeScript, Zod |
| Base de datos | MySQL 8 + Prisma 6 (cliente sin binario nativo, con adaptador de MySQL/MariaDB) |
| Pagos | Stripe Checkout + webhooks firmados |
| Pruebas | Vitest + Supertest (integración contra MySQL real) |
| Paquetes | **pnpm** (workspaces) |

## Estructura

```
mafer/
├── client/                 # Tienda y panel administrativo (React)
│   ├── public/demo/        # Ilustraciones SVG de demostración (originales)
│   └── src/
│       ├── components/     # Logo, tarjetas de producto, formularios, UI base
│       ├── context/        # Sesión y notificaciones
│       ├── hooks/          # Consultas y acciones del carrito
│       ├── layouts/        # Tienda y panel administrativo
│       ├── lib/            # Formato de moneda y fechas
│       ├── pages/          # Páginas públicas, cuenta y admin/
│       ├── services/       # Cliente HTTP de la API
│       ├── styles/         # Tokens de marca (Tailwind @theme)
│       └── types/
├── server/                 # API REST /api/v1
│   ├── prisma/             # schema.prisma, migraciones (se generan con db:migrate) y seed
│   ├── src/
│   │   ├── config/         # Entorno, Prisma, Stripe
│   │   ├── controllers/    # Capa HTTP
│   │   ├── middleware/     # Sesión, roles, CSRF, rate limit, errores
│   │   ├── routes/         # Definición de rutas
│   │   ├── scripts/        # create-admin
│   │   ├── services/       # Lógica de negocio (catálogo, carrito, pedidos, pagos…)
│   │   ├── utils/
│   │   └── validators/     # Esquemas Zod
│   ├── tests/              # Pruebas de integración
│   └── uploads/            # Imágenes subidas desde el panel (no se versionan)
└── docs/                   # API, Stripe y despliegue
```

## Puesta en marcha (desarrollo)

Requisitos: Node.js 20.19 o superior, pnpm 10 y **MySQL 8.0** o superior.

```bash
# 1. Dependencias (también genera el cliente de Prisma)
pnpm install

# 2. Variables de entorno
cp server/.env.example server/.env
cp client/.env.example client/.env
#    Edita server/.env: DATABASE_URL y TEST_DATABASE_URL (bases distintas)
#    Formato: mysql://root:TU_CONTRASEÑA@localhost:3306/mafer
```

```sql
-- 3. Bases de datos (en MySQL Workbench o en la consola `mysql -u root -p`)
CREATE DATABASE mafer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE mafer_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```bash
# 4. Tablas y datos de demostración
pnpm db:migrate          # la primera vez crea la migración: escribe "init" cuando pregunte el nombre
pnpm db:seed             # 8 categorías, 10 productos, 3 franjas horarias (demostración)

# 5. Primer administrador (único camino para crear administradores)
ADMIN_EMAIL=tu@correo.com ADMIN_PASSWORD='UnaClaveSegura1' \
ADMIN_FIRST_NAME=Fernanda ADMIN_LAST_NAME=Mafer pnpm admin:create

# 6. Iniciar frontend + backend
pnpm dev
```

- Tienda: http://localhost:5173
- Panel: http://localhost:5173/admin
- API: http://localhost:4000/api/v1 (Vite la sirve en el mismo origen mediante proxy)

La primera vez, `pnpm db:migrate` crea la carpeta `server/prisma/migrations/`. **Súbela al repositorio** (`git add server/prisma/migrations && git commit -m "Migración inicial" && git push`): es la que se usará en producción.

Para que la base de pruebas tenga las mismas tablas:

```powershell
# Windows PowerShell
$env:DATABASE_URL="mysql://root:TU_CONTRASEÑA@localhost:3306/mafer_test"; pnpm --filter ./server exec prisma migrate deploy; Remove-Item Env:DATABASE_URL
```

```bash
# macOS / Linux
DATABASE_URL=mysql://root:TU_CONTRASEÑA@localhost:3306/mafer_test pnpm --filter ./server exec prisma migrate deploy
```

### Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Frontend y backend con recarga en caliente |
| `pnpm test` | Pruebas del backend (integración) y del frontend |
| `pnpm typecheck` | Verificación de tipos de ambos paquetes |
| `pnpm build` | Compila backend (`server/dist`) y frontend (`client/dist`) |
| `pnpm start` | Inicia la API compilada |
| `pnpm db:migrate` / `db:deploy` | Migraciones en desarrollo / producción |
| `pnpm db:seed` | Datos de demostración (idempotente) |
| `pnpm admin:create` | Crea el primer administrador (`-- --promote` convierte una cuenta existente) |

### Correos en desarrollo

Aún no hay proveedor de correo integrado. Los enlaces de **verificación de correo** y **recuperación de contraseña** se imprimen en la consola del servidor.

## Pagos con Stripe

Sin `STRIPE_SECRET_KEY` la tienda funciona completa, pero el botón «Confirmar y pagar» aparece deshabilitado con un aviso. Para activar pagos de prueba sigue [docs/STRIPE.md](docs/STRIPE.md).

## Decisiones importantes

- **Importes en centavos (enteros)**, moneda MXN, igual que la unidad que usa Stripe.
- **El servidor calcula todos los precios**: variantes, personalizaciones, cupones, envío e impuestos. El cliente nunca envía precios (los esquemas Zod son estrictos).
- **Pedido ≠ pago**: un pedido se crea como «Pendiente de pago»; solo pasa a «Confirmado» cuando Stripe confirma el pago (webhook verificado o consulta directa a Stripe). La página de éxito no marca nada como pagado.
- **Inventario**: los productos con existencias se *apartan* al crear el pedido (decremento condicional, nunca negativo) y se *liberan* si el pago expira, falla o el pedido se cancela antes de prepararse. Un reembolso **no** devuelve existencias.
- **Sesiones** en base de datos con cookie `HttpOnly` + `SameSite=Lax` (`Secure` en producción); solo se guarda el hash del token. CSRF mitigado con verificación de `Origin`.
- **Precios con impuestos incluidos** por defecto; tasa, envío, horarios y datos de contacto se configuran en el panel (no se inventan).
- **MySQL 8**: la búsqueda no distingue mayúsculas ni acentos (intercalación `utf8mb4`); el cupo por horario se protege con `SELECT … FOR UPDATE` dentro de la transacción del pedido.
- **Cliente de Prisma sin binario nativo** (`engineType = "client"` + `@prisma/adapter-mariadb`, compatible con MySQL): simplifica despliegues en contenedores.

## Estado de esta primera versión

Consulta [docs/ESTADO.md](docs/ESTADO.md) para la lista detallada de lo que funciona, lo verificado y lo pendiente.

Documentación adicional: [API](docs/API.md) · [Stripe](docs/STRIPE.md) · [Despliegue](docs/DESPLIEGUE.md)
