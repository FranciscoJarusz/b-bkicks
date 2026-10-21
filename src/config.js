// Datos del negocio que se usan en varios lugares del sitio. Cambiarlos aca
// alcanza: los scripts `is:inline` los reciben por `define:vars`.

// Formato internacional sin "+" ni espacios, como lo pide wa.me.
export const WHATSAPP_NUMERO = "5491125322786";

export const META_PIXEL_ID = "917173001433329";

// El precio de lista (el general) es el de efectivo/transferencia mas este
// recargo.
export const RECARGO_LISTA = 1.25;

// Los precios de la tienda estan en USD. Lo que se paga en pesos (MercadoPago
// y transferencia en pesos) se convierte con la cotizacion de esta casa de
// dolarapi.com, a su precio de venta: "oficial", "blue", "bolsa" o
// "contadoconliqui". Bauty usa el blue.
export const COTIZACION_CASA = "blue";

// Recargo de PayPal sobre el precio de lista (0.06 = 6%). Bauty: PayPal paga
// el precio de lista, como tarjeta, sin extra. Con null, PayPal no aparece.
export const RECARGO_PAYPAL = 0;

// Lo que ve el cliente en /pedido/<id> para pagar por transferencia o cripto,
// por id de medio de pago (ver MEDIOS_DE_PAGO en src/utils/pedido.js). Los
// medios que no estan aca (efectivo, PayPal) se coordinan por WhatsApp.
export const DATOS_DE_PAGO = {
    transferencia: {
        titulo: "Transferencia en pesos",
        datos: [
            { label: "Alias", valor: "bautistabrey", copiable: true },
            {
                label: "CVU",
                valor: "0000003100076646360448",
                copiable: true,
            },
            { label: "Titular", valor: "Bautista Brey" },
            { label: "Banco", valor: "Mercado Pago" },
        ],
    },
    "transferencia-usd": {
        titulo: "Transferencia en dólares",
        datos: [
            { label: "Alias", valor: "BYBKICKS.USD", copiable: true },
            { label: "CBU", valor: "0070028331004055571135", copiable: true },
            { label: "Titular", valor: "Bautista Brey" },
            { label: "Banco", valor: "Banco Galicia" },
        ],
    },
    usdt: {
        titulo: "USDT",
        datos: [
            { label: "Red", valor: "TRC20 (Tron)" },
            {
                label: "Dirección",
                valor: "TBsWbx4LNrHxnTe2u8eAvcyMsMqySQaccd",
                copiable: true,
            },
        ],
        aviso: "Enviá solo por la red indicada: si usás otra, los fondos se pierden.",
    },
};

// Cuanto tiempo se le reserva el pedido a quien paga por transferencia o
// cripto. Pasado ese tiempo el pedido deja de verse en "Sin pagar" del admin.
export const HORAS_RESERVA = 24;

export function urlWhatsApp(mensaje) {
    const base = `https://wa.me/${WHATSAPP_NUMERO}`;
    return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}
