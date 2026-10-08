// Logica del checkout que no depende de React: totales, validacion y el
// mensaje que se manda por WhatsApp.

import { formatearTalle } from "@/utils/talles.js";
import { precioDeLista } from "@/utils/precios.js";

export const MEDIOS_DE_PAGO = [
    { id: "mercadopago", icono: "💳", label: "MercadoPago" },
    { id: "transferencia", icono: "🏦", label: "Transferencia" },
    { id: "efectivo", icono: "💵", label: "Efectivo" },
];

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
 */
export function calcularTotales(items, pago) {
    const pagaConDescuento = pago === "efectivo" || pago === "transferencia";
    const precioSegunPago = (item) =>
        pagaConDescuento ? item.price : precioDeLista(item.price);

    const total = items.reduce((acc, i) => acc + i.price * i.cantidad, 0);
    const totalLista = items.reduce(
        (acc, i) => acc + precioDeLista(i.price) * i.cantidad,
        0
    );

    return {
        /** Total en efectivo o transferencia. */
        total,
        totalLista,
        totalAPagar: pagaConDescuento ? total : totalLista,
        precioSegunPago,
    };
}

/** @returns los errores por campo; vacio si el formulario esta completo. */
export function validarCheckout(datos) {
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
    }

    return errores;
}

export function armarMensajePedido(items, datos) {
    const { totalAPagar, precioSegunPago } = calcularTotales(items, datos.pago);

    const lineas = items.map(
        (i) =>
            `- *${i.name}*${i.talle ? ` (Talle: *${formatearTalle(i.talle)}*)` : ""} *x${i.cantidad}* — $*${(precioSegunPago(i) * i.cantidad).toLocaleString("es-AR")}*`
    );

    const medioDePago = MEDIOS_DE_PAGO.find((m) => m.id === datos.pago)?.label;
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
        `\n\n*Total: $${totalAPagar.toLocaleString("es-AR")}*` +
        `\n\n*Mis datos:*\n\n` +
        misDatos.join("\n")
    );
}
