// Carrito guardado en localStorage como:
// [{ slug, name, marca, category, image, price, talle, cantidad }]

export function getCarrito() {
    if (typeof window === "undefined") return [];
    try {
        return JSON.parse(localStorage.getItem("carrito") || "[]");
    } catch {
        return [];
    }
}

export function agregarAlCarrito(item, cantidad = 1) {
    const carrito = getCarrito();
    const idx = carrito.findIndex(
        (i) => i.slug === item.slug && i.talle === item.talle
    );
    if (idx >= 0) {
        carrito[idx].cantidad += cantidad;
    } else {
        carrito.push({ ...item, cantidad });
    }
    localStorage.setItem("carrito", JSON.stringify(carrito));
    window.dispatchEvent(new Event("carrito-actualizado"));
}

export function restarDelCarrito(slug, talle) {
    const carrito = getCarrito();
    const idx = carrito.findIndex((i) => i.slug === slug && i.talle === talle);
    if (idx < 0) return;
    if (carrito[idx].cantidad <= 1) {
        carrito.splice(idx, 1);
    } else {
        carrito[idx].cantidad -= 1;
    }
    localStorage.setItem("carrito", JSON.stringify(carrito));
    window.dispatchEvent(new Event("carrito-actualizado"));
}

export function quitarDelCarrito(slug, talle) {
    const carrito = getCarrito().filter(
        (i) => !(i.slug === slug && i.talle === talle)
    );
    localStorage.setItem("carrito", JSON.stringify(carrito));
    window.dispatchEvent(new Event("carrito-actualizado"));
}

export function vaciarCarrito() {
    localStorage.removeItem("carrito");
    window.dispatchEvent(new Event("carrito-actualizado"));
}

/**
 * Pasa al carrito el precio y stock que devolvio /api/carrito. La cantidad se
 * recorta al stock que queda; un producto que ya no existe o se agoto queda
 * como estaba, para no hacerlo desaparecer sin aviso.
 *
 * @returns el carrito nuevo, o null si no cambio nada
 */
export function aplicarPreciosActuales(carrito, actuales) {
    let cambio = false;

    const nuevo = carrito.map((item) => {
        const actual = actuales.find(
            (a) => a.slug === item.slug && a.talle === item.talle
        );
        if (!actual?.existe) return item;

        const stock = Number(actual.stock ?? 0);
        const cantidad =
            stock > 0 ? Math.min(item.cantidad, stock) : item.cantidad;

        if (
            actual.price === item.price &&
            stock === item.stock &&
            cantidad === item.cantidad
        ) {
            return item;
        }

        cambio = true;
        return { ...item, price: actual.price, stock, cantidad };
    });

    return cambio ? nuevo : null;
}

// El header monta dos carritos (mobile y desktop): una sola consulta por pagina.
let actualizacion = null;

export function actualizarPreciosCarrito() {
    actualizacion ??= consultarPreciosActuales();
    return actualizacion;
}

async function consultarPreciosActuales() {
    const carrito = getCarrito();
    if (carrito.length === 0) return;

    try {
        const respuesta = await fetch("/api/carrito", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                items: carrito.map(({ slug, talle }) => ({ slug, talle })),
            }),
        });
        if (!respuesta.ok) return;

        const { items } = await respuesta.json();
        // Releemos por si el usuario toco el carrito mientras esperabamos.
        const nuevo = aplicarPreciosActuales(getCarrito(), items ?? []);
        if (!nuevo) return;

        localStorage.setItem("carrito", JSON.stringify(nuevo));
        window.dispatchEvent(new Event("carrito-actualizado"));
    } catch {
        // Sin red seguimos con los precios guardados; se reintenta en la
        // proxima pagina.
    }
}

// Borrador del checkout. Astro es MPA: cada navegacion remonta la isla del
// carrito y se perderian los datos ya tipeados. Se guarda mientras el pedido
// esta a medio completar y se borra apenas se envia.
const CLAVE_CHECKOUT = "checkout-datos";

// Un borrador viejo prellenaria, por ejemplo, un domicilio que ya no vive.
const VIGENCIA_CHECKOUT = 7 * 24 * 60 * 60 * 1000;

export function getDatosCheckout() {
    if (typeof window === "undefined") return null;
    try {
        const guardado = JSON.parse(
            localStorage.getItem(CLAVE_CHECKOUT) || "null"
        );
        if (!guardado) return null;
        if (Date.now() - guardado.guardado > VIGENCIA_CHECKOUT) {
            localStorage.removeItem(CLAVE_CHECKOUT);
            return null;
        }
        return guardado.datos;
    } catch {
        return null;
    }
}

export function guardarDatosCheckout(datos) {
    try {
        localStorage.setItem(
            CLAVE_CHECKOUT,
            JSON.stringify({ guardado: Date.now(), datos })
        );
    } catch {
        // Modo incognito con storage lleno: no vale la pena romper el checkout.
    }
}

export function limpiarDatosCheckout() {
    localStorage.removeItem(CLAVE_CHECKOUT);
}
