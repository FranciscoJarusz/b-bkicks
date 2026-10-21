import { CID_LOGO } from "../utils/emails.js";
import { LOGO_EMAIL_BASE64 } from "./logo-email";

const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
// Tiene que ser de un dominio verificado en Resend (bybkicks.com).
const REMITENTE =
    import.meta.env.EMAIL_REMITENTE?.trim() ||
    "B&B KICKS <pedidos@bybkicks.com>";
// A donde le llegan los avisos al dueño. Por defecto, el mail del admin.
export const EMAIL_DUEÑO =
    import.meta.env.EMAIL_AVISOS?.trim() ||
    import.meta.env.PUBLIC_ADMIN_EMAIL?.trim() ||
    "";

// Dos intentos de 6 s: el webhook de MercadoPago espera una respuesta unos
// 20 s, y los mails se mandan antes de contestarle.
const INTENTOS = 2;
const TIMEOUT_MS = 6_000;

export interface Email {
    para: string;
    asunto: string;
    html: string;
    texto: string;
    /** A quien le llega si el que recibe el mail responde. */
    responderA?: string;
    /** Resend descarta un segundo envio con la misma clave (24 h). */
    clave?: string;
}

/**
 * Manda un mail con Resend. Nunca tira: si falla, el pedido igual queda en el
 * admin. Devuelve si se mando, y registra el motivo en los logs si no.
 */
export async function enviarEmail(email: Email): Promise<boolean> {
    if (!RESEND_API_KEY) {
        console.warn("email: falta RESEND_API_KEY, no se manda", email.asunto);
        return false;
    }
    if (!email.para) {
        console.warn("email: sin destinatario para", email.asunto);
        return false;
    }

    const headers: Record<string, string> = {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
    };
    if (email.clave) headers["Idempotency-Key"] = email.clave;

    const body = JSON.stringify({
        from: REMITENTE,
        to: [email.para],
        subject: email.asunto,
        html: email.html,
        text: email.texto,
        ...(email.responderA && { reply_to: email.responderA }),
        attachments: [
            {
                filename: "logo.png",
                content: LOGO_EMAIL_BASE64,
                content_id: CID_LOGO,
            },
        ],
    });

    for (let intento = 1; intento <= INTENTOS; intento++) {
        try {
            const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers,
                body,
                signal: AbortSignal.timeout(TIMEOUT_MS),
            });
            if (res.ok) return true;

            console.error(
                `email: Resend respondio ${res.status} (intento ${intento}):`,
                (await res.text()).slice(0, 300)
            );
            // Un error de clave, remitente o destinatario no se arregla
            // reintentando.
            if (res.status < 500 && res.status !== 429) return false;
        } catch (error) {
            console.error(`email: fallo el intento ${intento}:`, error);
        }
    }

    return false;
}

/** Varios mails a la vez, sin que uno que falle frene a los demas. */
export function enviarEmails(emails: (Email | null)[]) {
    return Promise.all(
        emails.filter((e): e is Email => e !== null).map(enviarEmail)
    );
}
