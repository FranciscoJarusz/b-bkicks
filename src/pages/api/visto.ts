import type { APIRoute } from "astro";
import { supabase } from "@/lib/supabase.js";

/**
 * Anota que alguien abrio un producto, para "Vistos recientemente". Lo llama la
 * pagina del producto desde el navegador: el HTML lo cachea el CDN, asi que el
 * servidor no se entera de cada visita.
 */
export const POST: APIRoute = async ({ request }) => {
    const body = await request.json().catch(() => null);
    const id = Number(body?.id);

    if (Number.isSafeInteger(id) && id > 0) {
        await supabase.rpc("registrar_visto", { p_id: id });
    }

    // Nadie espera la respuesta: una visita que no se anota no es un error.
    return new Response(null, { status: 204 });
};
