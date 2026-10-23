import { PrismaMariaDb } from "@prisma/adapter-mariadb";

/**
 * Crea el adaptador de Prisma para MySQL 8 (compatible también con MariaDB)
 * a partir de una URL estándar: mysql://usuario:contraseña@host:3306/base
 */
export function mysqlAdapter(url: string) {
  const u = new URL(url);
  if (!["mysql:", "mariadb:"].includes(u.protocol)) {
    throw new Error("DATABASE_URL debe tener el formato mysql://usuario:contraseña@host:3306/base");
  }
  return new PrismaMariaDb({
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
    connectionLimit: Number(u.searchParams.get("connection_limit") ?? 10),
    // MySQL 8 usa caching_sha2_password; sin TLS en local se necesita obtener la clave pública.
    allowPublicKeyRetrieval: true,
    // Prisma maneja las fechas en UTC.
    timezone: "Z",
  });
}
