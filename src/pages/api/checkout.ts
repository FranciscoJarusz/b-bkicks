import type { APIRoute } from "astro";
import { respuestaJson } from "@/lib/http";
import { getCotizacion } from "@/lib/cotizacion";
import { crearPreferencia, mercadoPagoConfigurado } from "@/lib/mercadopago";
import { supabaseServidor } from "@/lib/supabase-servidor";
import { getProductosAgrupados } from "@/utils/productos.js";
import { precioDelTalle } from "@/utils/precios.js";
import {
    DATOS_INICIALES,
    calcularTotales,
    validarCheckout,
} from "@/utils/pedido.js";
import { itemsDePreferencia, totalDePreferencia } from "@/utils/mercadopago.js";

const CAMPOS_DATOS = [
    "nombre",
    "telefono",
    "email",
    "entrega",
    "direccion",
    "codigoPostal",
    "dni",
] as const;

class ErrorDePedido extends Error {
    constructor(
        mensaje: string,
        public status = 400
    ) {
        super(mensaje);
    }
}

/**
 * Arranca un pago con MercadoPago. El navegador manda solo que quiere (slug,
 * talle y cantidad) y sus datos: precios, stock y cotizacion se resuelven
 * aca, asi nadie puede pagar un monto distinto. Guarda el pedido como
 * "pendiente" y devuelve el link de pago; el webhook lo pasa a "pagado".
 */
export const POST: APIRoute = async ({ request }) => {
    if (!mercadoPagoConfigurado || !supabaseServidor) {
        return respuestaJson(
            { error: "El pago con MercadoPago no está disponible." },
            503
        );
    }

    try {
        const url = await iniciarPago(request);
        return respuestaJson({ url });
    } catch (error) {
        if (error instanceof ErrorDePedido) {
            return respuestaJson({ error: error.message }, error.status);
        }

        console.error("checkout:", error);
        return respuestaJson(
            { error: "No pudimos iniciar el pago. Probá de nuevo." },
            502
        );
    }
};

async function iniciarPago(request: Request) {
    const db = supabaseServidor!;
    const body = await request.json().catch(() => null);

    const pedidos: { slug: string; talle: string | null; cantidad: number }[] =
        (Array.isArray(body?.items) ? body.items : [])
            .filter(
                (item: any) =>
                    typeof item?.slug === "string" &&
                    (item.talle == null || typeof item.talle === "string") &&
                    Number.isInteger(item.cantidad) &&
                    item.cantidad >= 1 &&
                    item.cantidad <= 20
            )
            .slice(0, 50);
    if (pedidos.length === 0) throw new ErrorDePedido("El carrito está vacío.");

    const cliente: Record<string, string> = {};
    for (const campo of CAMPOS_DATOS) {
        const valor = body?.datos?.[campo];
        cliente[campo] = typeof valor === "string" ? valor.slice(0, 200) : "";
    }

    const cotizacion = await getCotizacion();
    if (!cotizacion) {
        throw new ErrorDePedido(
            "No pudimos obtener la cotización del dólar. Probá de nuevo.",
            503
        );
    }

    const errores = validarCheckout(
        { ...DATOS_INICIALES, ...cliente, pago: "mercadopago" },
        cotizacion.venta
    );
    const primerError = Object.values(errores)[0];
    if (primerError) throw new ErrorDePedido(primerError as string);

    // Precio y stock de ahora, de la base: lo que diga el navegador no cuenta.
    const productos = await getProductosAgrupados();
    const porSlug = new Map(productos.map((p: any) => [p.slug, p]));

    const items = pedidos.map(({ slug, talle, cantidad }) => {
        const producto: any = porSlug.get(slug);
        if (!producto) {
            throw new ErrorDePedido(
                "Un producto del carrito ya no está disponible.",
                409
            );
        }

        const datosTalle = producto.specs.talle.find(
            (t: { nombre: string }) => t.nombre === talle
        );
        const stock = datosTalle ? datosTalle.stock : producto.stock;
        if (stock != null && cantidad > stock) {
            throw new ErrorDePedido(
                `No hay stock suficiente de ${producto.name}.`,
                409
            );
        }

        const price = precioDelTalle(producto, talle);
        if (!(price > 0)) {
            throw new ErrorDePedido(
                `${producto.name} no tiene precio cargado.`,
                409
            );
        }

        // El id es el de la fila de la base: con el se descuenta el stock al
        // aprobarse el pago (marcar_pedido_pagado).
        return {
            id: producto.id as number,
            slug,
            name: producto.name as string,
            talle,
            cantidad,
            price,
        };
    });

    const itemsMP = itemsDePreferencia(items, cotizacion.venta);
    const totalARS = totalDePreferencia(itemsMP);
    const { totalAPagar } = calcularTotales(items, "mercadopago");

    const { data: pedido, error } = await db
        .from("pedido")
        .insert({
            medio_pago: "mercadopago",
            cliente,
            items,
            total_usd: totalAPagar,
            cotizacion: cotizacion.venta,
            total_ars: totalARS,
        })
        .select("id")
        .single();
    if (error || !pedido) throw error ?? new Error("No se guardó el pedido");

    // MercadoPago no acepta back_urls ni webhooks en http (desarrollo local).
    const { origin } = new URL(request.url);
    const publico = origin.startsWith("https://");

    try {
        return await crearPreferencia({
            items: itemsMP,
            payer: { name: cliente.nombre, email: cliente.email },
            external_reference: pedido.id,
            statement_descriptor: "B&B KICKS",
            back_urls: {
                success: `${origin}/pago/exito`,
                pending: `${origin}/pago/pendiente`,
                failure: `${origin}/pago/error`,
            },
            ...(publico && {
                auto_return: "approved",
                notification_url: `${origin}/api/mp-webhook`,
            }),
        });
    } catch (error) {
        // El cliente nunca llego a MercadoPago: no queda un pedido colgado.
        await db
            .from("pedido")
            .update({ estado: "cancelado" })
            .eq("id", pedido.id);
        throw error;
    }
}
