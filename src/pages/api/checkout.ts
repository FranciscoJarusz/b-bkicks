import type { APIRoute } from "astro";
import { respuestaJson } from "@/lib/http";
import { getCotizacion } from "@/lib/cotizacion";
import { crearPreferencia, mercadoPagoConfigurado } from "@/lib/mercadopago";
import { supabaseServidor } from "@/lib/supabase-servidor";
import { EMAIL_DUEÑO, enviarEmail } from "@/lib/email";
import { DATOS_DE_PAGO } from "@/config.js";
import { getProductosAgrupados } from "@/utils/productos.js";
import { precioDelTalle } from "@/utils/precios.js";
import {
    DATOS_INICIALES,
    calcularTotales,
    getMedioDePago,
    validarCheckout,
} from "@/utils/pedido.js";
import { itemsDePreferencia, totalDePreferencia } from "@/utils/mercadopago.js";
import { emailPedidoRecibido } from "@/utils/emails.js";

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
 * Guarda el pedido, con cualquier medio de pago. El navegador manda solo que
 * quiere (slug, talle y cantidad) y sus datos: precios, stock y cotizacion se
 * resuelven aca, asi nadie puede pagar un monto distinto. Todos los pedidos
 * nacen "pendiente". Responde segun el medio:
 *
 * - MercadoPago: `{ url }` al checkout de MercadoPago; el webhook lo pasa a
 *   "pagado".
 * - Transferencia o cripto (DATOS_DE_PAGO): `{ url }` a /pedido/<id>, con los
 *   datos para pagar y la subida del comprobante.
 * - El resto (efectivo): `{ pedido }`; se sigue por WhatsApp.
 *
 * Fuera de MercadoPago, el pedido lo pasa a "pagado" el admin, y al cliente le
 * llega un mail con el pedido (y el link para pagar, si paga en la web).
 */
export const POST: APIRoute = async ({ request }) => {
    if (!supabaseServidor) {
        return respuestaJson(
            { error: "No pudimos tomar el pedido. Escribinos por WhatsApp." },
            503
        );
    }

    try {
        return respuestaJson(await crearPedido(request));
    } catch (error) {
        if (error instanceof ErrorDePedido) {
            return respuestaJson({ error: error.message }, error.status);
        }

        console.error("checkout:", error);
        return respuestaJson(
            { error: "No pudimos tomar el pedido. Probá de nuevo." },
            502
        );
    }
};

async function crearPedido(request: Request) {
    const db = supabaseServidor!;
    const body = await request.json().catch(() => null);

    const medio = getMedioDePago(body?.datos?.pago);
    if (!medio) throw new ErrorDePedido("Elegí un medio de pago.");
    if (medio.id === "mercadopago" && !mercadoPagoConfigurado) {
        throw new ErrorDePedido(
            "El pago con MercadoPago no está disponible. Elegí otro medio.",
            503
        );
    }

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

    // Solo lo que se paga en pesos necesita cotizacion: si dolarapi no
    // responde, los medios en dolares siguen andando.
    const cotizacion = medio.moneda === "ARS" ? await getCotizacion() : null;

    const errores = validarCheckout(
        { ...DATOS_INICIALES, ...cliente, pago: medio.id },
        cotizacion?.venta ?? null
    );
    const primerError = Object.values(errores)[0];
    if (primerError) {
        throw new ErrorDePedido(
            primerError as string,
            medio.moneda === "ARS" && !cotizacion ? 503 : 400
        );
    }

    const items = await resolverItems(pedidos);
    const { totalAPagar, totalARS } = calcularTotales(
        items,
        medio.id,
        cotizacion?.venta ?? null
    );

    // MercadoPago cobra la suma de sus items redondeados por unidad: el total
    // en pesos tiene que ser exactamente ese.
    const itemsMP =
        medio.id === "mercadopago"
            ? itemsDePreferencia(items, cotizacion!.venta)
            : null;

    const { data: pedido, error } = await db
        .from("pedido")
        .insert({
            medio_pago: medio.id,
            cliente,
            items,
            total_usd: totalAPagar,
            cotizacion: cotizacion?.venta ?? null,
            total_ars: itemsMP ? totalDePreferencia(itemsMP) : totalARS,
        })
        .select("id, medio_pago, cliente, items, total_usd, total_ars")
        .single();
    if (error || !pedido) throw error ?? new Error("No se guardó el pedido");

    if (itemsMP) {
        return {
            url: await preferenciaDePago(request, pedido.id, itemsMP, cliente),
        };
    }

    await enviarEmail({
        para: cliente.email,
        ...emailPedidoRecibido(pedido, new URL(request.url).origin),
        responderA: EMAIL_DUEÑO,
    });

    if (medio.id in DATOS_DE_PAGO) return { url: `/pedido/${pedido.id}` };

    return { pedido: pedido.id };
}

/** Precio y stock de ahora, de la base: lo que diga el navegador no cuenta. */
async function resolverItems(
    pedidos: { slug: string; talle: string | null; cantidad: number }[]
) {
    const productos = await getProductosAgrupados();
    const porSlug = new Map(productos.map((p: any) => [p.slug, p]));

    return pedidos.map(({ slug, talle, cantidad }) => {
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
        // pasar el pedido a pagado (marcar_pedido_pagado).
        return {
            id: producto.id as number,
            slug,
            name: producto.name as string,
            talle,
            cantidad,
            price,
        };
    });
}

async function preferenciaDePago(
    request: Request,
    pedidoId: string,
    itemsMP: ReturnType<typeof itemsDePreferencia>,
    cliente: Record<string, string>
) {
    // MercadoPago no acepta back_urls ni webhooks en http (desarrollo local).
    const { origin } = new URL(request.url);
    const publico = origin.startsWith("https://");

    try {
        return await crearPreferencia({
            items: itemsMP,
            payer: { name: cliente.nombre, email: cliente.email },
            external_reference: pedidoId,
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
        await supabaseServidor!
            .from("pedido")
            .update({ estado: "cancelado" })
            .eq("id", pedidoId);
        throw error;
    }
}
