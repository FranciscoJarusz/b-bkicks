// Armado de los items que se mandan a MercadoPago. MercadoPago cobra en pesos:
// la tienda tiene los precios en USD, asi que se convierten con la cotizacion.

import { formatearTalle } from "@/utils/talles.js";
import { precioDeLista } from "@/utils/precios.js";

/**
 * Un item por producto, con el precio de lista unitario ya en pesos. Se
 * redondea por unidad para que lo que se muestra en MercadoPago sea
 * exactamente lo que se cobra.
 *
 * @param {{ slug: string, name: string, talle: string | null, price: number, cantidad: number }[]} items
 * @param {number} cotizacion pesos por dolar
 */
export function itemsDePreferencia(items, cotizacion) {
    return items.map((item) => ({
        id: item.slug,
        title: item.talle
            ? `${item.name} (Talle ${formatearTalle(item.talle)})`
            : item.name,
        quantity: item.cantidad,
        unit_price: Math.round(precioDeLista(item.price) * cotizacion),
        currency_id: "ARS",
    }));
}

/** Lo que va a cobrar MercadoPago por esos items, en pesos. */
export function totalDePreferencia(itemsMP) {
    return itemsMP.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
}
