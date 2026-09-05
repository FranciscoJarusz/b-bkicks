/**
 * Precio por talle. La tienda cobra el precio de la fila producto_talle; el
 * precio_base del producto solo se usa como respaldo (productos sin talles
 * cargados, o talles viejos que quedaron sin precio propio).
 */

/**
 * El talle que viene preseleccionado en la ficha: el primero con stock, para
 * no abrir el producto mostrando "sin stock" habiendo talles disponibles.
 *
 * @param {{ nombre: string, stock?: number }[]} talles ya ordenados
 */
export function getTalleInicial(talles = []) {
    return (
        talles.find((talle) => Number(talle.stock ?? 0) > 0)?.nombre ??
        talles[0]?.nombre ??
        null
    );
}

/**
 * Lo que paga el comprador por un talle concreto.
 *
 * @param {{ price?: number, precioBase?: number, specs?: object }} producto
 * @param {string | null} nombreTalle
 */
export function precioDelTalle(producto, nombreTalle) {
    // Ojo con ??: un price en 0 es un precio sin cargar, no un precio valido,
    // asi que tiene que caer igual al precio base.
    const respaldo =
        Number(producto?.price ?? 0) || Number(producto?.precioBase ?? 0);
    if (!nombreTalle) return respaldo;

    const talle = (producto?.specs?.talle ?? []).find(
        (t) => t && typeof t === "object" && t.nombre === nombreTalle
    );
    const precio = Number(talle?.precio ?? 0);

    return precio > 0 ? precio : respaldo;
}

/**
 * Avisa al resto de la ficha que cambio el talle elegido. Guardamos ademas el
 * ultimo valor en window porque los islands montan en orden indeterminado y el
 * que muestra el precio puede llegar tarde al evento.
 */
export function publicarTalleSeleccionado(slug, precio) {
    if (typeof window === "undefined") return;

    window.__talleSeleccionado = { slug, precio };
    window.dispatchEvent(
        new CustomEvent("talle-seleccionado", { detail: { slug, precio } })
    );
}
