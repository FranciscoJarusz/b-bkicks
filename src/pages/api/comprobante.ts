import type { APIRoute } from "astro";
import { respuestaJson } from "@/lib/http";
import { supabaseServidor } from "@/lib/supabase-servidor";
import { EMAIL_DUEÑO, enviarEmail } from "@/lib/email";
import { DATOS_DE_PAGO } from "@/config.js";
import { emailComprobante } from "@/utils/emails.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Vercel corta los cuerpos de mas de 4.5 MB: el navegador ya comprime las
// fotos, esto es para los PDF y las fotos que no pudo comprimir.
const TAMANO_MAXIMO = 4 * 1024 * 1024;

const EXTENSIONES: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
    "application/pdf": "pdf",
};

/**
 * El cliente sube el comprobante de una transferencia desde /pedido/<id>. Va
 * al bucket privado "comprobantes" y se le avisa al dueño. Se puede volver a
 * subir (si se equivoco de archivo) mientras el pedido siga pendiente; el
 * anterior se borra.
 */
export const POST: APIRoute = async ({ request, url }) => {
    const db = supabaseServidor;
    if (!db) return respuestaJson({ error: "No disponible." }, 503);

    const form = await request.formData().catch(() => null);
    const id = form?.get("pedido");
    const archivo = form?.get("archivo");

    if (typeof id !== "string" || !UUID.test(id)) {
        return respuestaJson({ error: "Pedido inválido." }, 400);
    }
    if (!(archivo instanceof File) || archivo.size === 0) {
        return respuestaJson({ error: "Elegí un archivo." }, 400);
    }

    const extension = EXTENSIONES[archivo.type];
    if (!extension) {
        return respuestaJson(
            { error: "Subí una foto o un PDF del comprobante." },
            415
        );
    }
    if (archivo.size > TAMANO_MAXIMO) {
        return respuestaJson(
            { error: "El archivo es muy pesado (máximo 4 MB)." },
            413
        );
    }

    const { data: pedido } = await db
        .from("pedido")
        .select(
            "id, estado, medio_pago, cliente, items, total_usd, total_ars, comprobante_path"
        )
        .eq("id", id)
        .maybeSingle();

    if (!pedido || !(pedido.medio_pago in DATOS_DE_PAGO)) {
        return respuestaJson({ error: "Pedido inválido." }, 404);
    }
    if (pedido.estado !== "pendiente") {
        return respuestaJson(
            { error: "Este pedido ya no está esperando un pago." },
            409
        );
    }

    const path = `${id}/${Date.now()}.${extension}`;
    const { error: errorSubida } = await db.storage
        .from("comprobantes")
        .upload(path, archivo, { contentType: archivo.type });
    if (errorSubida) {
        console.error("comprobante:", errorSubida);
        return respuestaJson(
            { error: "No pudimos subir el comprobante. Probá de nuevo." },
            502
        );
    }

    const { error } = await db
        .from("pedido")
        .update({
            comprobante_path: path,
            comprobante_subido: new Date().toISOString(),
        })
        .eq("id", id);
    if (error) {
        console.error("comprobante:", error);
        return respuestaJson(
            { error: "No pudimos guardar el comprobante. Probá de nuevo." },
            502
        );
    }

    if (pedido.comprobante_path) {
        await db.storage.from("comprobantes").remove([pedido.comprobante_path]);
    }

    await enviarEmail({
        para: EMAIL_DUEÑO,
        ...emailComprobante(pedido, url.origin),
        responderA: pedido.cliente.email,
    });

    return respuestaJson({ ok: true });
};
