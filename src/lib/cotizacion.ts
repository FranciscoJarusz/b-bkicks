import { COTIZACION_CASA } from "@/config.js";

export type Cotizacion = { venta: number; actualizada: string };

// Con 10 minutos la cotizacion sigue al dolar sin pegarle a la API en cada
// pedido. Vive en memoria: cada instancia de la funcion tiene la suya.
const VIGENCIA_MS = 10 * 60 * 1000;
let cache: { valor: Cotizacion; vence: number } | null = null;

/**
 * Pesos por dolar (precio de venta de COTIZACION_CASA). Si la API falla
 * devuelve la ultima conocida, y null si nunca hubo una.
 */
export async function getCotizacion(): Promise<Cotizacion | null> {
    if (cache && cache.vence > Date.now()) return cache.valor;

    try {
        const res = await fetch(
            `https://dolarapi.com/v1/dolares/${COTIZACION_CASA}`,
            { signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) throw new Error(`dolarapi ${res.status}`);

        const { venta, fechaActualizacion } = await res.json();
        if (!(Number(venta) > 0)) throw new Error("cotizacion invalida");

        const valor = {
            venta: Number(venta),
            actualizada: String(fechaActualizacion ?? ""),
        };
        cache = { valor, vence: Date.now() + VIGENCIA_MS };

        return valor;
    } catch {
        return cache?.valor ?? null;
    }
}
