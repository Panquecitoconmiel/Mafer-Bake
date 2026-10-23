import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/prisma.js";
import { testOutbox } from "../src/services/mail.service.js";
import { app, createUser, login, resetDb } from "./helpers.js";

const valid = { firstName: "Ana", lastName: "López", email: "ana@example.com", password: "dulce1234", confirmPassword: "dulce1234", acceptTerms: true };
const tokenFrom = (text: string) => text.match(/token=([\w-]+)/)![1];

beforeEach(async () => {
  await resetDb();
  testOutbox.length = 0;
});

describe("registro", () => {
  it("crea siempre una cuenta de cliente e inicia sesión", async () => {
    const agent = request.agent(app);
    const res = await agent.post("/api/v1/auth/register").send(valid);
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("CUSTOMER");
    expect([res.headers["set-cookie"]].flat().join(";")).toMatch(/mafer_sid=.*HttpOnly/i);
    const me = await agent.get("/api/v1/auth/me");
    expect(me.body.user.email).toBe("ana@example.com");
    const stored = await prisma.user.findUniqueOrThrow({ where: { email: "ana@example.com" } });
    expect(stored.passwordHash).not.toContain("dulce1234");
  });

  it("rechaza que el cliente se asigne el rol de administrador", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({ ...valid, role: "ADMIN" });
    expect(res.status).toBe(400);
    expect(await prisma.user.count()).toBe(0);
  });

  it("valida contraseñas que no coinciden, contraseñas débiles y términos", async () => {
    const mismatch = await request(app).post("/api/v1/auth/register").send({ ...valid, confirmPassword: "otra1234" });
    expect(mismatch.status).toBe(400);
    expect(mismatch.body.error.details).toHaveProperty("confirmPassword");
    const weak = await request(app).post("/api/v1/auth/register").send({ ...valid, password: "corta", confirmPassword: "corta" });
    expect(weak.body.error.details).toHaveProperty("password");
    const terms = await request(app).post("/api/v1/auth/register").send({ ...valid, acceptTerms: false });
    expect(terms.body.error.details).toHaveProperty("acceptTerms");
  });

  it("no permite correos duplicados", async () => {
    await request(app).post("/api/v1/auth/register").send(valid);
    const res = await request(app).post("/api/v1/auth/register").send(valid);
    expect(res.status).toBe(409);
  });
});

describe("inicio de sesión", () => {
  it("usa un mensaje genérico para correo inexistente y contraseña incorrecta", async () => {
    await createUser("ana@example.com");
    const a = await request(app).post("/api/v1/auth/login").send({ email: "nadie@example.com", password: "x" });
    const b = await request(app).post("/api/v1/auth/login").send({ email: "ana@example.com", password: "incorrecta1" });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error.message).toBe(b.body.error.message);
  });

  it("bloquea temporalmente tras 5 intentos fallidos", async () => {
    await createUser("ana@example.com");
    for (let i = 0; i < 5; i++) await request(app).post("/api/v1/auth/login").send({ email: "ana@example.com", password: "mal12345" });
    const res = await request(app).post("/api/v1/auth/login").send({ email: "ana@example.com", password: "secreto123" });
    expect(res.status).toBe(429);
  });

  it("cierra sesión e invalida la sesión en el servidor", async () => {
    await createUser("ana@example.com");
    const agent = await login("ana@example.com");
    expect(await prisma.session.count()).toBe(1);
    await agent.post("/api/v1/auth/logout");
    expect(await prisma.session.count()).toBe(0);
    expect((await agent.get("/api/v1/auth/me")).body.user).toBeNull();
  });
});

describe("recuperación de contraseña y verificación de correo", () => {
  it("restablece la contraseña con un token de un solo uso", async () => {
    await createUser("ana@example.com");
    const res = await request(app).post("/api/v1/auth/forgot-password").send({ email: "ana@example.com" });
    expect(res.status).toBe(200);
    const token = tokenFrom(testOutbox.at(-1)!.text);

    const reset = await request(app).post("/api/v1/auth/reset-password").send({ token, password: "nueva1234", confirmPassword: "nueva1234" });
    expect(reset.status).toBe(200);
    const again = await request(app).post("/api/v1/auth/reset-password").send({ token, password: "otra12345", confirmPassword: "otra12345" });
    expect(again.status).toBe(400);
    await login("ana@example.com", "nueva1234");
  });

  it("no revela si el correo existe", async () => {
    const res = await request(app).post("/api/v1/auth/forgot-password").send({ email: "nadie@example.com" });
    expect(res.status).toBe(200);
    expect(testOutbox).toHaveLength(0);
  });

  it("rechaza tokens expirados", async () => {
    await createUser("ana@example.com");
    await request(app).post("/api/v1/auth/forgot-password").send({ email: "ana@example.com" });
    await prisma.authToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    const token = tokenFrom(testOutbox.at(-1)!.text);
    const res = await request(app).post("/api/v1/auth/reset-password").send({ token, password: "nueva1234", confirmPassword: "nueva1234" });
    expect(res.status).toBe(400);
  });

  it("verifica el correo con el enlace enviado al registrarse", async () => {
    const agent = request.agent(app);
    await agent.post("/api/v1/auth/register").send(valid);
    const token = tokenFrom(testOutbox.at(-1)!.text);
    expect((await agent.post("/api/v1/auth/verify-email").send({ token })).status).toBe(200);
    expect((await agent.get("/api/v1/auth/me")).body.user.emailVerified).toBe(true);
  });
});

describe("autorización por roles", () => {
  it("protege las rutas administrativas", async () => {
    await createUser("cliente@example.com");
    await createUser("admin@example.com", "ADMIN");
    expect((await request(app).get("/api/v1/admin/dashboard")).status).toBe(401);
    const customer = await login("cliente@example.com");
    expect((await customer.get("/api/v1/admin/dashboard")).status).toBe(403);
    expect((await customer.post("/api/v1/admin/categories").send({ name: "X" })).status).toBe(403);
    const admin = await login("admin@example.com");
    expect((await admin.get("/api/v1/admin/dashboard")).status).toBe(200);
  });

  it("rechaza peticiones desde orígenes no permitidos (CSRF)", async () => {
    await createUser("ana@example.com");
    const agent = await login("ana@example.com");
    const res = await agent.post("/api/v1/auth/logout").set("Origin", "https://sitio-malicioso.example");
    expect(res.status).toBe(403);
  });
});
