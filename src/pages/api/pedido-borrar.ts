import type { APIRoute } from "astro";
import { esAdmin } from "@/lib/admin";
import { respuestaJson } from "@/lib/http";
import { supabaseServidor } from "@/lib/supabase-servidor";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * El admin borra un pedido para siempre, con su comprobante si tiene. No
 * devuelve stock: si el pedido estaba pagado, lo descontado queda descontado.
 * Para sacar un pedido de la lista sin perderlo esta "Descartar" (cancelado).
 */
export const POST: APIRoute = async ({ request }) => {
    if (!(await esAdmin(request))) {
        return respuestaJson({ error: "No autorizado." }, 401);
    }

    const db = supabaseServidor;
    if (!db) return respuestaJson({ error: "No disponible." }, 503);

    const body = await request.json().catch(() => null);
    const id = body?.pedido;
    if (typeof id !== "string" || !UUID.test(id)) {
        return respuestaJson({ error: "Pedido inválido." }, 400);
    }

    const { data: borrados, error } = await db
        .from("pedido")
        .delete()
        .eq("id", id)
        .select("comprobante_path");
    if (error) {
        console.error("pedido-borrar:", error);
        return respuestaJson({ error: "No pudimos borrar el pedido." }, 502);
    }
    if (!borrados?.length) {
        return respuestaJson({ error: "El pedido ya no existe." }, 404);
    }

    // Los comprobantes van en una carpeta por pedido: se borra entera, por si
    // quedo alguno de una subida anterior.
    const { data: archivos } = await db.storage.from("comprobantes").list(id);
    if (archivos?.length) {
        await db.storage
            .from("comprobantes")
            .remove(archivos.map((archivo) => `${id}/${archivo.name}`));
    }

    return respuestaJson({ ok: true });
};
