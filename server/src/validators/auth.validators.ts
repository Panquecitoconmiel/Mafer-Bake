import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Correo electrónico no válido.").max(160);
export const password = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(128)
  .regex(/[A-Za-z]/, "Incluye al menos una letra.")
  .regex(/[0-9]/, "Incluye al menos un número.");

const name = z.string().trim().min(1, "Campo obligatorio.").max(80);

// Nota: el esquema NO acepta "role". El registro público siempre crea clientes.
export const registerSchema = z
  .object({
    firstName: name,
    lastName: name,
    email,
    password,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: "Debes aceptar los términos y el aviso de privacidad." }) }),
  })
  .strict()
  .refine((d) => d.password === d.confirmPassword, { message: "Las contraseñas no coinciden.", path: ["confirmPassword"] });

export const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
export const forgotSchema = z.object({ email });
export const resetSchema = z
  .object({ token: z.string().min(20).max(200), password, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { message: "Las contraseñas no coinciden.", path: ["confirmPassword"] });
export const verifySchema = z.object({ token: z.string().min(20).max(200) });

export const profileSchema = z
  .object({ firstName: name, lastName: name, phone: z.string().trim().max(30).optional().nullable() })
  .strict();

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1), newPassword: password })
  .strict();

export const addressSchema = z
  .object({
    label: z.string().trim().min(1).max(40),
    recipient: name,
    phone: z.string().trim().min(8, "Teléfono no válido.").max(30),
    street: z.string().trim().min(1).max(120),
    extNumber: z.string().trim().min(1).max(20),
    intNumber: z.string().trim().max(20).optional().nullable(),
    neighborhood: z.string().trim().min(1).max(80),
    city: z.string().trim().min(1).max(80),
    state: z.string().trim().min(1).max(80),
    postalCode: z.string().trim().regex(/^\d{5}$/, "El código postal debe tener 5 dígitos."),
    references: z.string().trim().max(200).optional().nullable(),
    isDefault: z.boolean().optional(),
  })
  .strict();
