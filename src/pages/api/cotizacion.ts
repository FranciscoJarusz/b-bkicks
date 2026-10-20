import type { APIRoute } from "astro";
import { respuestaJson } from "@/lib/http";
import { getCotizacion } from "@/lib/cotizacion";

/** Pesos por dolar, para mostrar el total en pesos en el checkout. */
export const GET: APIRoute = async () => {
    const cotizacion = await getCotizacion();
    if (!cotizacion) {
        return respuestaJson({ error: "Cotización no disponible" }, 503);
    }

    const respuesta = respuestaJson(cotizacion);
    respuesta.headers.set(
        "Cache-Control",
        "public, s-maxage=300, stale-while-revalidate=600"
    );

    return respuesta;
};
