import type { APIRoute } from "astro";
import { obtenerPago } from "@/lib/mercadopago";
import { supabaseServidor } from "@/lib/supabase-servidor";
import { avisarAlDueño } from "@/lib/aviso";
import { armarAvisoPedidoPagado } from "@/utils/pedido.js";

const ID_NUMERICO = /^\d+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ok = () => new Response(null, { status: 200 });

/**
 * Avisos de MercadoPago. No confiamos en lo que trae el aviso: solo sacamos el
 * id del pago y le preguntamos a MercadoPago, con nuestro token, el estado y
 * el monto reales. Un aviso falso nunca marca un pedido como pagado.
 *
 * Responde 200 a lo que no nos sirve (para que MercadoPago no reintente) y 500
 * ante fallas pasajeras (para que reintente).
 */
export const POST: APIRoute = async ({ request, url }) => {
    const db = supabaseServidor;
    if (!db) return new Response(null, { status: 503 });

    const body = await request.json().catch(() => null);
    const tipo =
        body?.type ??
        url.searchParams.get("type") ??
        url.searchParams.get("topic");
    const id = String(
        body?.data?.id ??
            url.searchParams.get("data.id") ??
            url.searchParams.get("id") ??
            ""
    );
    if (tipo !== "payment" || !ID_NUMERICO.test(id)) return ok();

    try {
        const pago = await obtenerPago(id);
        const referencia = pago?.external_reference;
        if (!pago || !UUID.test(referencia ?? "")) return ok();

        const { data: pedido } = await db
            .from("pedido")
            .select("total_ars")
            .eq("id", referencia)
            .maybeSingle();
        if (!pedido) return ok();

        const { error } = await db
            .from("pedido")
            .update({ mp_payment_id: String(pago.id), mp_estado: pago.status })
            .eq("id", referencia);
        if (error) throw error;

        // Aprobado, en pesos y por el monto que armamos. Un pago por menos no
        // cierra el pedido: queda pendiente para revisarlo a mano.
        const montoCorrecto =
            pago.currency_id === "ARS" &&
            Number(pago.transaction_amount) >= Number(pedido.total_ars);
        if (pago.status !== "approved" || !montoCorrecto) return ok();

        // Marca pagado y descuenta stock en una sola transaccion, y solo desde
        // "pendiente": si MercadoPago repite el aviso (lo hace), el segundo no
        // devuelve nada, no descuenta de nuevo y no se avisa dos veces.
        const { data: pagados, error: errorPagado } = await db.rpc(
            "marcar_pedido_pagado",
            { p_id: referencia }
        );
        if (errorPagado) throw errorPagado;

        if (pagados?.length) {
            await avisarAlDueño(
                armarAvisoPedidoPagado(pagados[0], `${url.origin}/admin`)
            );
        }

        return ok();
    } catch (error) {
        console.error("mp-webhook:", error);
        return new Response(null, { status: 500 });
    }
};
