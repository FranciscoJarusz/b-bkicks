const API = "https://api.mercadopago.com";
const ACCESS_TOKEN = import.meta.env.MP_ACCESS_TOKEN;

export const mercadoPagoConfigurado = Boolean(ACCESS_TOKEN);

async function pedirAMercadoPago(path: string, init: RequestInit = {}) {
    return fetch(`${API}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10_000),
    });
}

/** Crea la preferencia de pago y devuelve el link de MercadoPago. */
export async function crearPreferencia(
    preferencia: Record<string, unknown>
): Promise<string> {
    const res = await pedirAMercadoPago("/checkout/preferences", {
        method: "POST",
        body: JSON.stringify(preferencia),
    });
    if (!res.ok) {
        throw new Error(`MercadoPago preferencias ${res.status}`);
    }

    const { init_point } = await res.json();
    if (typeof init_point !== "string") {
        throw new Error("MercadoPago no devolvio el link de pago");
    }

    return init_point;
}

/**
 * Datos del pago segun MercadoPago. Es la fuente de verdad: del webhook solo
 * usamos el id, el resto se pide aca. Null si el pago no existe.
 */
export async function obtenerPago(id: string) {
    const res = await pedirAMercadoPago(`/v1/payments/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`MercadoPago pagos ${res.status}`);

    return res.json();
}
