import type { APIRoute } from "astro";
import { esAdmin } from "@/lib/admin";
import { respuestaJson } from "@/lib/http";
import { supabaseServidor } from "@/lib/supabase-servidor";
import { EMAIL_DUEÑO, enviarEmail } from "@/lib/email";
import { emailPagoConfirmado } from "@/utils/emails.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * El admin confirma que cobro un pedido que no es de MercadoPago
 * (transferencia, efectivo, cripto): pasa a "pagado" y descuenta el stock,
 * con la misma funcion que usa el webhook. marcar_pedido_pagado solo la puede
 * llamar el servidor, por eso esta ruta en vez de un update desde el panel.
 * Al cliente le llega un mail con la confirmacion.
 */
export const POST: APIRoute = async ({ request, url }) => {
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

    // Los de MercadoPago los confirma el webhook, contra el pago real.
    const { data: pedido } = await db
        .from("pedido")
        .select("medio_pago")
        .eq("id", id)
        .maybeSingle();
    if (!pedido) return respuestaJson({ error: "Pedido inválido." }, 404);
    if (pedido.medio_pago === "mercadopago") {
        return respuestaJson(
            { error: "Los pagos de MercadoPago se confirman solos." },
            409
        );
    }

    const { data, error } = await db.rpc("marcar_pedido_pagado", { p_id: id });
    if (error) {
        console.error("pedido-confirmar:", error);
        return respuestaJson({ error: "No pudimos confirmar el pago." }, 502);
    }
    if (!data?.length) {
        return respuestaJson(
            { error: "El pedido ya no estaba pendiente." },
            409
        );
    }

    const pagado = data[0];
    await enviarEmail({
        para: pagado.cliente.email,
        ...emailPagoConfirmado(pagado, url.origin),
        responderA: EMAIL_DUEÑO,
        clave: `pagado-cliente-${pagado.id}`,
    });

    return respuestaJson({ ok: true });
};
