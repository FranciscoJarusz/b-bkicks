// Datos del negocio que se usan en varios lugares del sitio. Cambiarlos aca
// alcanza: los scripts `is:inline` los reciben por `define:vars`.

// Formato internacional sin "+" ni espacios, como lo pide wa.me.
export const WHATSAPP_NUMERO = "5491125322786";

export const META_PIXEL_ID = "917173001433329";

// El precio de lista (el general) es el de efectivo/transferencia mas este
// recargo.
export const RECARGO_LISTA = 1.25;

export function urlWhatsApp(mensaje) {
    const base = `https://wa.me/${WHATSAPP_NUMERO}`;
    return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}
