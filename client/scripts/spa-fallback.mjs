// GitHub Pages no sabe que la tienda es una SPA: copia index.html como 404.html
// para que los enlaces directos (p. ej. /producto/pastel-personalizado) funcionen.
import { copyFileSync, writeFileSync } from "node:fs";
copyFileSync("dist/index.html", "dist/404.html");
writeFileSync("dist/.nojekyll", "");
console.log("✓ 404.html y .nojekyll listos para GitHub Pages");
