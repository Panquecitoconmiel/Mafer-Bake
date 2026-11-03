import { PrismaMariaDb } from "@prisma/adapter-mariadb";

/**
 * Crea el adaptador de Prisma para MySQL 8 (compatible también con MariaDB)
 * a partir de una URL estándar: mysql://usuario:contraseña@host:3306/base
 *
 * Conexión cifrada (necesaria en servicios en la nube como Aiven):
 *   - agrega `?ssl-mode=REQUIRED` a la URL (Aiven ya la incluye), y
 *   - opcionalmente define DATABASE_CA_CERT con el certificado CA del proveedor
 *     (contenido PEM) para verificar la identidad del servidor.
 */
export function mysqlAdapter(url: string) {
  const u = new URL(url);
  if (!["mysql:", "mariadb:"].includes(u.protocol)) {
    throw new Error("DATABASE_URL debe tener el formato mysql://usuario:contraseña@host:3306/base");
  }
  const sslMode = (u.searchParams.get("ssl-mode") ?? u.searchParams.get("sslmode") ?? "").toUpperCase();
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n");
  const ssl = ca
    ? { ca, rejectUnauthorized: true }
    : ["REQUIRED", "REQUIRE", "VERIFY_CA", "VERIFY_IDENTITY"].includes(sslMode)
      ? { rejectUnauthorized: false } // cifrado sin verificar el certificado
      : undefined;

  return new PrismaMariaDb({
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
    connectionLimit: Number(u.searchParams.get("connection_limit") ?? 5),
    // MySQL 8 usa caching_sha2_password; sin TLS en local se necesita obtener la clave pública.
    allowPublicKeyRetrieval: !ssl,
    ...(ssl && { ssl }),
    // Prisma maneja las fechas en UTC.
    timezone: "Z",
  });
}
