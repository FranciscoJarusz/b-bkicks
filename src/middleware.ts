import { defineMiddleware } from "astro:middleware";

// El CDN de Vercel guarda cada pagina un minuto y, pasado ese tiempo, la sigue
// sirviendo mientras la regenera en segundo plano. Un cambio en el admin tarda
// como mucho un par de minutos en verse en la tienda.
const CACHE_PAGINAS = "public, s-maxage=60, stale-while-revalidate=300";

// El admin y la API dependen de quien hace el pedido: nunca se cachean.
const SIN_CACHE = ["/admin", "/api/"];

export const onRequest = defineMiddleware(async (context, next) => {
    const response = await next();

    const { pathname } = context.url;
    const esPagina =
        context.request.method === "GET" &&
        !SIN_CACHE.some((ruta) => pathname.startsWith(ruta)) &&
        response.headers.get("content-type")?.includes("text/html");

    if (esPagina && !response.headers.has("Cache-Control")) {
        try {
            response.headers.set("Cache-Control", CACHE_PAGINAS);
        } catch {
            // Algunas respuestas traen headers inmutables: quedan sin cache.
        }
    }

    return response;
});
