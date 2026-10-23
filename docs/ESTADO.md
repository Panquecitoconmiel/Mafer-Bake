# Estado del proyecto — primera versión

Fecha: 22 de octubre de 2026.

## Verificado en esta ejecución

Entorno: PostgreSQL 16 local, Node 22, pnpm 10.28.

- `pnpm typecheck` sin errores en cliente y servidor.
- `pnpm build` compila backend y frontend; la API compilada arranca y responde.
- **48 pruebas automatizadas pasando** (43 de integración del backend contra PostgreSQL + 5 unitarias del frontend):
  - Registro (siempre cliente, rechaza `role`), validaciones, correo duplicado.
  - Inicio de sesión con mensaje genérico, bloqueo tras 5 intentos, cierre de sesión en servidor.
  - Recuperación de contraseña con token de un solo uso y expiración; verificación de correo.
  - Rutas administrativas: 401 sin sesión, 403 para clientes; rechazo de orígenes no permitidos.
  - Catálogo: solo publicados, filtros de búsqueda, categoría y precio.
  - Carrito: precios calculados en servidor con variantes y opciones, rechazo de precios enviados por el cliente, opciones inválidas, existencias, cambios de precio, fusión del carrito de invitado.
  - Pedidos: creación con apartado de inventario, idempotencia, aviso de cambio de total, días bloqueados, **venta concurrente de las últimas unidades**, cupones con límite de usos, acceso a pedidos ajenos (404), cancelación con liberación, reglas de entrega a domicilio.
  - Stripe (cliente simulado + firmas reales del SDK): importes de Checkout desde el servidor, reutilización de sesión, la página de éxito no marca pagado, **firma inválida rechazada**, **eventos duplicados ignorados**, pagos asíncronos, importe alterado rechazado, expiración que libera inventario, reembolsos parciales sin reabastecer, clientes sin acceso a reembolsos, transiciones de pedido válidas y auditoría.
- Recorrido en navegador (Chromium headless): portada, catálogo, personalización del pastel (total estimado = total del servidor), carrito, registro con conservación del carrito, checkout con fecha y horario, menú móvil, inicio de sesión de administrador y dashboard. Sin errores de consola.

## Funciona (implementado y conectado)

- Tienda pública: inicio, catálogo con filtros/orden/paginación, categorías, promociones, detalle con personalizador, favoritos.
- Cuentas: registro, inicio/cierre de sesión, verificación de correo, recuperación de contraseña, perfil, cambio de contraseña, direcciones, historial y detalle de pedidos, cancelación de pendientes, reintento de pago.
- Carrito persistente (invitado y cliente) con totales del servidor.
- Checkout: recogida/domicilio, fecha y franja con cupo y anticipación, cupones, notas, resumen del servidor, aceptación de condiciones.
- Stripe Checkout y webhooks con verificación de firma, idempotencia y reembolsos (código y pruebas listos; requiere tus claves).
- Panel: dashboard con datos reales, productos (imágenes, variantes, opciones con recargo), categorías, inventario con movimientos, pedidos con transiciones e historial, clientes, pagos y reembolsos, cupones, configuración de tienda/entregas/horarios/días bloqueados.

## No verificado aquí (falta configuración externa)

- **Pago real de prueba con Stripe**: no hay claves en este entorno. El flujo está cubierto con un doble de prueba; al poner tus claves `sk_test_` y ejecutar `stripe listen`, prueba con la tarjeta `4242…` (ver STRIPE.md).
- **`prisma migrate dev` / `migrate deploy`**: el entorno de desarrollo bloqueaba la descarga del motor nativo de Prisma. La migración se generó con `prisma migrate diff` y se aplicó con `psql`. En tu equipo estos comandos funcionan con normalidad.
- **Tipografías de Google Fonts**: bloqueadas en este entorno; las capturas usan la tipografía de respaldo.

## Pendiente (siguientes etapas)

1. Proveedor de correo (verificación, recuperación y confirmación de pedido; hoy se imprimen en consola).
2. Adjuntar imagen de referencia en pasteles personalizados.
3. Reportes con filtros por fecha y exportación CSV.
4. Promociones por categoría, por cantidad y paquetes (hoy: precio promocional por producto y cupones).
5. Zonas de cobertura con costo por zona (hoy: costo único y descripción de cobertura).
6. Reseñas de productos (el modelo `ProductReview` existe; falta interfaz y moderación).
7. Gestión de contenidos de la portada desde el panel (banner y textos).
8. Almacenamiento de imágenes en servicio de objetos (hoy en disco local).
9. Página de historial de auditoría en el panel (el endpoint existe).
10. Pruebas E2E automatizadas en CI y pruebas de componentes del frontend.
