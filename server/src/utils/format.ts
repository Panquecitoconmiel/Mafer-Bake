/** Normaliza un texto a slug para URL: "Pastel de Fresas" → "pastel-de-fresas". */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Número de pedido legible: 12 → "MF-000012". */
export const orderNumber = (n: number) => `MF-${String(n).padStart(6, "0")}`;

/** Fecha YYYY-MM-DD → Date a medianoche UTC (columna @db.Date). */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export const toDateOnly = (d: Date) => d.toISOString().slice(0, 10);
