/** Ruta a un archivo de /public respetando la ruta base del sitio (p. ej. GitHub Pages). */
export const asset = (path: string) => import.meta.env.BASE_URL + path.replace(/^\//, "");
