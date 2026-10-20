// Logica del checkout que no depende de React: totales, validacion y el
// mensaje que se manda por WhatsApp.

import { formatearTalle } from "@/utils/talles.js";
import { precioDeLista } from "@/utils/precios.js";
import { RECARGO_PAYPAL } from "@/config.js";

/**
 * `precio`: "lista" es el precio general (con recargo) y "base" el de
 * descuento. `moneda`: en que se paga; los precios de la tienda estan en USD,
 * asi que "ARS" es lo unico que necesita cotizacion. `recargo`: extra sobre
 * el precio de lista. Los ids se guardan en el borrador del checkout: no
 * renombrar los que ya existen.
 */
const TODOS_LOS_MEDIOS = [
    {
        id: "mercadopago",
        icono: "💳",
        label: "MercadoPago",
        precio: "lista",
        moneda: "ARS",
    },
    {
        id: "transferencia",
        icono: "🏦",
        label: "Transferencia ARS",
        precio: "base",
        moneda: "ARS",
    },
    {
        id: "transferencia-usd",
        icono: "🏦",
        label: "Transferencia USD",
        precio: "base",
        moneda: "USD",
    },
    {
        id: "efectivo",
        icono: "💵",
        label: "Efectivo",
        precio: "base",
        moneda: "USD",
    },
    {
        id: "usdt",
        icono: "🪙",
        label: "USDT",
        precio: "base",
        moneda: "USD",
    },
    {
        id: "paypal",
        icono: "🅿️",
        label: "PayPal",
        precio: "lista",
        moneda: "USD",
        recargo: RECARGO_PAYPAL,
    },
];

// PayPal queda oculto hasta que se confirme su recargo.
export const MEDIOS_DE_PAGO = TODOS_LOS_MEDIOS.filter(
    (medio) => medio.id !== "paypal" || RECARGO_PAYPAL != null
);

export function getMedioDePago(id) {
    return MEDIOS_DE_PAGO.find((medio) => medio.id === id);
}

export const ENTREGAS = [
    { id: "envio", label: "Envío" },
    { id: "coordinar", label: "Coordinar entrega" },
];

export const DATOS_INICIALES = {
    nombre: "",
    telefono: "",
    email: "",
    entrega: "",
    direccion: "",
    codigoPostal: "",
    dni: "",
    pago: "",
};

/**
 * Como en las cards: el precio general es el de lista y el de efectivo o
 * transferencia es el descuento. El total del pedido sigue al medio de pago
 * elegido; mientras no hay uno elegido vale el de lista.
 *
 * @param {{ price: number, cantidad: number }[]} items
 * @param {string} pago id de MEDIOS_DE_PAGO, o "" si todavia no eligio
 * @param {number | null} [cotizacion] pesos por dolar, para los medios en ARS
 */
export function calcularTotales(items, pago, cotizacion = null) {
    const medio = getMedioDePago(pago);

    const precioSegunPago = (item) => {
        if (medio?.precio === "base") return item.price;

        const lista = precioDeLista(item.price);
        return medio?.recargo ? Math.round(lista * (1 + medio.recargo)) : lista;
    };

    const total = items.reduce((acc, i) => acc + i.price * i.cantidad, 0);
    const totalLista = items.reduce(
        (acc, i) => acc + precioDeLista(i.price) * i.cantidad,
        0
    );
    const totalAPagar = items.reduce(
        (acc, i) => acc + precioSegunPago(i) * i.cantidad,
        0
    );

    return {
        /** Total en efectivo o transferencia. */
        total,
        totalLista,
        totalAPagar,
        /** El total en pesos, solo si el medio es en ARS y hay cotizacion. */
        totalARS:
            medio?.moneda === "ARS" && cotizacion
                ? Math.round(totalAPagar * cotizacion)
                : null,
        precioSegunPago,
    };
}

/**
 * @param {object} datos
 * @param {number | null} [cotizacion] sin ella no se puede cobrar en pesos
 * @returns los errores por campo; vacio si el formulario esta completo.
 */
export function validarCheckout(datos, cotizacion = true) {
    const errores = {};

    if (!datos.nombre.trim()) {
        errores.nombre = "Ingresá tu nombre completo.";
    }

    const telefono = datos.telefono.replace(/\D/g, "");
    if (!telefono) {
        errores.telefono = "Ingresá tu teléfono.";
    } else if (telefono.length < 8) {
        errores.telefono = "El teléfono no parece válido.";
    }

    const email = datos.email.trim();
    if (!email) {
        errores.email = "Ingresá tu email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errores.email = "El email no parece válido.";
    }

    if (!datos.entrega) {
        errores.entrega = "Elegí cómo querés recibir el pedido.";
    }

    // Coordinando la entrega no hace falta ninguno de estos datos.
    if (datos.entrega === "envio") {
        if (!datos.direccion.trim()) {
            errores.direccion = "Ingresá tu dirección de envío.";
        }

        const dni = datos.dni.replace(/\D/g, "");
        if (!dni) {
            errores.dni = "Ingresá tu DNI.";
        } else if (dni.length < 7 || dni.length > 8) {
            errores.dni = "El DNI no parece válido.";
        }

        const codigoPostal = datos.codigoPostal.trim();
        if (!codigoPostal) {
            errores.codigoPostal = "Ingresá tu código postal.";
            // Sirven tanto el viejo (1714) como el actual (B1714XYZ).
        } else if (!/^[A-Za-z]?\d{4}[A-Za-z]{0,3}$/.test(codigoPostal)) {
            errores.codigoPostal = "El código postal no parece válido.";
        }
    }

    if (!datos.pago) {
        errores.pago = "Elegí un medio de pago.";
    } else if (getMedioDePago(datos.pago)?.moneda === "ARS" && !cotizacion) {
        errores.pago =
            "No pudimos obtener la cotización del dólar. Probá de nuevo o elegí otro medio de pago.";
    }

    return errores;
}

export function armarMensajePedido(items, datos, cotizacion = null) {
    const { totalAPagar, totalARS, precioSegunPago } = calcularTotales(
        items,
        datos.pago,
        cotizacion
    );

    const lineas = items.map(
        (i) =>
            `- *${i.name}*${i.talle ? ` (Talle: *${formatearTalle(i.talle)}*)` : ""} *x${i.cantidad}* — $*${(precioSegunPago(i) * i.cantidad).toLocaleString("es-AR")}*`
    );

    const medioDePago = getMedioDePago(datos.pago)?.label;
    const entrega = ENTREGAS.find((e) => e.id === datos.entrega)?.label;

    const misDatos = [
        `- *Nombre:* ${datos.nombre.trim()}`,
        `- *Teléfono:* ${datos.telefono.trim()}`,
        `- *Email:* ${datos.email.trim()}`,
        `- *Entrega:* ${entrega}`,
        // Coordinando la entrega estos datos no se piden.
        ...(datos.entrega === "envio"
            ? [
                  `- *Dirección:* ${datos.direccion.trim()}`,
                  `- *Código postal:* ${datos.codigoPostal.trim().toUpperCase()}`,
                  `- *DNI:* ${datos.dni.trim()}`,
              ]
            : []),
        `- *Medio de pago:* ${medioDePago}`,
    ];

    return (
        `*Nuevo pedido a través de la tienda online:*\n\n` +
        `¡Hola B&B KICKS! Acabo de elegir estos productos en la web:\n\n` +
        lineas.join("\n") +
        `\n\n*Total: USD ${totalAPagar.toLocaleString("es-AR")}*` +
        (totalARS
            ? `\n*Total en pesos: $${totalARS.toLocaleString("es-AR")}* (dólar a $${cotizacion.toLocaleString("es-AR")})`
            : "") +
        `\n\n*Mis datos:*\n\n` +
        misDatos.join("\n")
    );
}

/**
 * El WhatsApp que le llega al dueño cuando se aprueba un pago. Va por un
 * servicio de terceros: sin DNI ni direccion, eso se ve en el admin.
 *
 * @param {{ cliente: { nombre: string, entrega: string }, items: { name: string, talle: string | null, cantidad: number }[], total_usd: number, total_ars: number | null }} pedido
 * @param {string} urlAdmin
 */
export function armarAvisoPedidoPagado(pedido, urlAdmin) {
    const entrega = ENTREGAS.find(
        (e) => e.id === pedido.cliente.entrega
    )?.label;
    const lineas = pedido.items.map(
        (i) =>
            `- ${i.name}${i.talle ? ` (Talle ${formatearTalle(i.talle)})` : ""} x${i.cantidad}`
    );
    const total = pedido.total_ars
        ? `$${Number(pedido.total_ars).toLocaleString("es-AR")} (USD ${Number(pedido.total_usd).toLocaleString("es-AR")})`
        : `USD ${Number(pedido.total_usd).toLocaleString("es-AR")}`;

    return (
        `*Nuevo pedido PAGADO con MercadoPago*\n\n` +
        `${pedido.cliente.nombre}\n` +
        lineas.join("\n") +
        `\n\n*Total:* ${total}` +
        (entrega ? `\n*Entrega:* ${entrega}` : "") +
        `\n\nDatos completos en ${urlAdmin}`
    );
}
