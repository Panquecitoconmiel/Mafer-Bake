/**
 * Crea el primer administrador de Mafer (o promueve una cuenta existente con --promote).
 * Uso:
 *   ADMIN_EMAIL=… ADMIN_PASSWORD=… ADMIN_FIRST_NAME=… ADMIN_LAST_NAME=… pnpm admin:create
 *   pnpm admin:create -- --promote   (convierte en admin una cuenta ya registrada con ADMIN_EMAIL)
 * Este es el único camino para crear administradores: la API pública nunca asigna ese rol.
 */
import { prisma } from "../config/prisma.js";
import { hashPassword } from "../services/auth.service.js";
import { password as passwordRule } from "../validators/auth.validators.js";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const firstName = process.env.ADMIN_FIRST_NAME?.trim() || "Administración";
  const lastName = process.env.ADMIN_LAST_NAME?.trim() || "Mafer";
  const promote = process.argv.includes("--promote");

  if (!email) throw new Error("Define ADMIN_EMAIL en el entorno o en server/.env");
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.role === "ADMIN") return console.info(`ℹ️  ${email} ya es administrador.`);
    if (!promote) throw new Error(`Ya existe una cuenta de cliente con ${email}. Usa --promote para convertirla en administrador.`);
    await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
    await prisma.auditLog.create({ data: { action: "user.promote_admin", entity: "User", entityId: existing.id, details: { via: "cli" } } });
    return console.info(`✅ ${email} ahora es administrador.`);
  }

  const check = passwordRule.safeParse(password);
  if (!check.success) throw new Error(`ADMIN_PASSWORD no es válida: ${check.error.issues.map((i) => i.message).join(" ")}`);

  const user = await prisma.user.create({
    data: { email, firstName, lastName, role: "ADMIN", passwordHash: await hashPassword(password), emailVerifiedAt: new Date() },
  });
  await prisma.auditLog.create({ data: { action: "user.create_admin", entity: "User", entityId: user.id, details: { via: "cli" } } });
  console.info(`✅ Administrador creado: ${email}. Ya puedes eliminar ADMIN_PASSWORD de tu archivo .env.`);
}

main()
  .catch((e) => {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
