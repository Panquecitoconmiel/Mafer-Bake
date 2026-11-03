// Solo para GitHub Pages (build:demo:github): GitHub no sabe que la tienda es una SPA,
// así que se copia index.html como 404.html para que funcionen los enlaces directos.
// Cloudflare Pages NO lo necesita: si no hay 404.html, envía todas las rutas a index.html.
import { copyFileSync, writeFileSync } from "node:fs";
copyFileSync("dist/index.html", "dist/404.html");
writeFileSync("dist/.nojekyll", "");
console.log("✓ 404.html y .nojekyll listos para GitHub Pages");
