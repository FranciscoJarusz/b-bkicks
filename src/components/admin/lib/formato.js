// Formato de precios y talles para las tarjetas del panel.

export function formatMoney(value) {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? number.toLocaleString("es-AR") : "0";
}

/**
 * El precio que muestra la tarjeta. La tienda cobra el precio de cada talle,
 * asi que resumimos el rango real en vez del precio_base, que quedaria fijo en
 * lo que se cargo al crear el producto.
 */
export function resumenDePrecio(producto) {
    const precios = (producto.producto_talle ?? [])
        .map((variante) => Number(variante.precio ?? 0))
        .filter((precio) => precio > 0);

    if (precios.length === 0) return `$${formatMoney(producto.precio_base)}`;

    const min = Math.min(...precios);
    const max = Math.max(...precios);

    return min === max
        ? `$${formatMoney(min)}`
        : `$${formatMoney(min)} - $${formatMoney(max)}`;
}

/** El precio con el que arranca un talle nuevo: el que ya tienen los demas. */
export function precioSugerido(producto) {
    const precios = (producto.producto_talle ?? [])
        .map((variante) => Number(variante.precio ?? 0))
        .filter((precio) => precio > 0);

    return precios.length > 0
        ? Math.min(...precios)
        : Number(producto.precio_base ?? 0);
}

export function sortSizes(a, b) {
    return (a.talle?.nombre ?? "").localeCompare(b.talle?.nombre ?? "", "es", {
        numeric: true,
        sensitivity: "base",
    });
}
