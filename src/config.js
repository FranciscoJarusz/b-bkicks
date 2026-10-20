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
// "contadoconliqui". A CONFIRMAR con Bauty cual usa.
export const COTIZACION_CASA = "blue";

// Recargo de PayPal sobre el precio de lista (0.06 = 6%). Mientras sea null,
// PayPal no aparece como medio de pago. A CONFIRMAR con Bauty.
export const RECARGO_PAYPAL = null;

export function urlWhatsApp(mensaje) {
    const base = `https://wa.me/${WHATSAPP_NUMERO}`;
    return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}
