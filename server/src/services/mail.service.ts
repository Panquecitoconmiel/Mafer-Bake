import { env } from "../config/env.js";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/** Bandeja en memoria para pruebas automatizadas. */
export const testOutbox: MailMessage[] = [];

/**
 * Envío de correo.
 * Pendiente: integrar un proveedor SMTP/transaccional. Mientras tanto, en desarrollo
 * el mensaje se imprime en la consola del servidor (nunca en producción con datos reales).
 */
export async function sendMail(msg: MailMessage): Promise<void> {
  if (env.isTest) {
    testOutbox.push(msg);
    return;
  }
  console.info(`\n✉️  [correo de desarrollo] De: ${env.MAIL_FROM}\nPara: ${msg.to}\nAsunto: ${msg.subject}\n\n${msg.text}\n`);
}
