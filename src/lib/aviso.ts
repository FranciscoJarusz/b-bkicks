import { WHATSAPP_NUMERO } from "@/config.js";

const CALLMEBOT_APIKEY = import.meta.env.CALLMEBOT_APIKEY;

/**
 * Le manda un WhatsApp al dueño (WHATSAPP_NUMERO) via CallMeBot, un servicio
 * gratuito que solo escribe a numeros que se registraron con el. Es de
 * terceros: el texto no tiene que llevar DNI ni direccion.
 *
 * Nunca tira: si el aviso falla el pedido igual queda en el admin.
 */
export async function avisarAlDueño(texto: string) {
    if (!CALLMEBOT_APIKEY) {
        console.warn("aviso: falta CALLMEBOT_APIKEY, no se avisa el pedido");
        return;
    }

    const params = new URLSearchParams({
        phone: `+${WHATSAPP_NUMERO}`,
        text: texto,
        apikey: CALLMEBOT_APIKEY,
    });

    try {
        const res = await fetch(
            `https://api.callmebot.com/whatsapp.php?${params}`,
            { signal: AbortSignal.timeout(10_000) }
        );
        if (!res.ok) console.error("aviso: CallMeBot respondio", res.status);
    } catch (error) {
        console.error("aviso:", error);
    }
}
