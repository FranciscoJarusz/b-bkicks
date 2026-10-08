import type { APIRoute } from "astro";
import { respuestaJson } from "@/lib/http";
import { getProductosAgrupados } from "@/utils/productos.js";
import { precioDelTalle } from "@/utils/precios.js";

type ItemPedido = { slug: string; talle: string | null };

/**
 * Precio y stock actuales de los items del carrito. El carrito vive en
 * localStorage con el precio del momento en que se agrego cada producto; con
 * esto se pone al dia si despues se cambio el precio en el admin.
 */
export const POST: APIRoute = async ({ request }) => {
    const body = await request.json().catch(() => null);
    const pedidos: ItemPedido[] = Array.isArray(body?.items)
        ? body.items
              .filter(
                  (item: any) =>
                      typeof item?.slug === "string" &&
                      (item.talle == null || typeof item.talle === "string")
              )
              .slice(0, 50)
        : [];

    if (pedidos.length === 0) return respuestaJson({ items: [] });

    const productos = await getProductosAgrupados();
    const porSlug = new Map(productos.map((p) => [p.slug, p]));

    const items = pedidos.map(({ slug, talle }) => {
        const producto = porSlug.get(slug);
        if (!producto) return { slug, talle, existe: false };

        const datosTalle = producto.specs.talle.find(
            (t: { nombre: string }) => t.nombre === talle
        );

        return {
            slug,
            talle,
            existe: true,
            price: precioDelTalle(producto, talle),
            stock: datosTalle ? datosTalle.stock : producto.stock,
        };
    });

    return respuestaJson({ items });
};
