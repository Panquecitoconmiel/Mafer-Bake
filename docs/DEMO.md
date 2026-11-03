# Demostración de diseño (modo vitrina)

Versión de Mafer para **mostrar el diseño a clientes**. Funciona sin servidor ni base de datos y se publica gratis en GitHub Pages.

## Qué se puede hacer

- Recorrer portada, catálogo, filtros, búsqueda y detalle de productos.
- Personalizar pasteles y ver el precio calculado.
- Agregar al carrito, crear una cuenta de prueba y completar el checkout. Se crea un **pedido de prueba**; no se cobra nada.
- Ver «Mi cuenta»: pedidos, direcciones y favoritos.
- Entrar al **panel administrativo** en modo solo lectura con:
  - correo: `admin@demo.mafer`
  - contraseña: `demo1234`

Todo lo que hace cada visitante (carrito, cuenta, pedidos) se guarda **solo en su navegador**. No se envían correos ni se procesan pagos.

## Publicar en GitHub Pages (una sola vez)

1. En GitHub abre el repositorio → **Settings** → **Pages**.
2. En **Build and deployment → Source** elige **GitHub Actions**.
3. Ve a la pestaña **Actions**, abre «Demostración en GitHub Pages» y pulsa **Run workflow** (o sube cualquier cambio a `main`).
4. Al terminar (1–2 minutos) la dirección aparece en *Settings → Pages*:
   `https://USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/`

Cada vez que subas cambios a `main`, la demostración se actualiza sola.

## Probarla en tu computadora

```bash
pnpm --filter ./client build:demo
pnpm --filter ./client preview:demo
```

Abre http://localhost:4173/Mafer-Bake/

## Catálogo actual

50 productos de ejemplo en 8 categorías: pasteles, pasteles personalizados, cupcakes, donas, galletas, pan dulce, postres especiales y **velas de postre**. Nombres, precios (MXN) y existencias son de ejemplo.

Las fotos están en `client/public/productos/` (WEBP de 800 × 800). Son **imágenes ilustrativas de referencia**: el sitio lo indica en el aviso superior. Antes de vender, reemplázalas por fotos propias de Mafer con el mismo nombre de archivo, o súbelas desde el panel.

## Cambiar los productos de la demostración

El catálogo base está en `server/prisma/catalog.ts` (lo usa `pnpm db:seed` en la tienda real). Los datos de la demostración se exportan de ahí a `client/src/services/demo/data.json`. La lógica que imita al servidor está en `client/src/services/demo/mock.ts`. La versión normal de la tienda (`pnpm build`) **no** incluye estos archivos.

## Cloudflare Pages (alternativa)

- Comando de compilación: `pnpm --filter ./client build:demo`
- Carpeta de salida: `client/dist`
- Variable de entorno: `VITE_BASE=/`
