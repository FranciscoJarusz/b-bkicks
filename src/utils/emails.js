// Los mails de los pedidos: al dueño (pago aprobado, comprobante subido) y al
// cliente (pedido recibido, pago confirmado). Solo arman el contenido; los
// manda src/lib/email.ts.
//
// Van por un servicio de terceros (Resend): sin DNI ni direccion, eso se ve
// en el admin.

import { DATOS_DE_PAGO, HORAS_RESERVA, urlWhatsApp } from "@/config.js";
import { formatearTalle } from "@/utils/talles.js";
import {
    ENTREGAS,
    formatearTotalPedido,
    getMedioDePago,
} from "@/utils/pedido.js";

/**
 * @typedef {{
 *   id: string,
 *   medio_pago: string,
 *   cliente: { nombre: string, email?: string, entrega?: string },
 *   items: { name: string, talle: string | null, cantidad: number }[],
 *   total_usd: number,
 *   total_ars: number | null,
 * }} Pedido
 */

// Las imagenes las baja el cliente de mail desde internet: en local
// (http://localhost) o en un preview con login no las veria, asi que salen
// siempre del sitio publicado.
const SITIO = "https://www.bybkicks.com";
const INSTAGRAM = "https://www.instagram.com/bybkicks_/";

// Los colores del sitio (src/styles/global.css). Los mails no entienden
// opacidades: los grises son el negro del sitio sobre blanco, igual que
// text-black/70, text-black/50, border-black/10 y bg-black/5.
const NEGRO = "#1a1a1a";
const ROJO = "#b60807";
const BLANCO = "#ffffff";
const NEGRO_70 = "#5f5f5f";
const NEGRO_50 = "#8d8d8d";
const NEGRO_10 = "#e8e8e8";
const NEGRO_5 = "#f4f4f4";

// La fuente de los titulos del sitio. Solo la cargan algunos clientes (Apple
// Mail, iOS); Gmail y Outlook usan el respaldo condensado.
const URL_FRANKLIN = `${SITIO}/fonts/Franklin%20Gothic%20Extra%20Condensed.otf`;
const TITULAR =
    "Franklin,'Franklin Gothic Extra Condensed','Arial Narrow',Arial,sans-serif";
const TEXTO = "Montserrat,Arial,Helvetica,sans-serif";

// El logo va adjunto al mail con este id (lo agrega enviarEmail).
export const CID_LOGO = "logo-bybkicks";

/** El numero corto que ve el cliente, el mismo de /pedido/<id>. */
export function numeroDePedido(pedido) {
    return pedido.id.slice(0, 8).toUpperCase();
}

/** Para el dueño: un pago de MercadoPago se aprobo. */
export function emailPedidoPagado(pedido, origen) {
    const entrega = ENTREGAS.find(
        (e) => e.id === pedido.cliente.entrega
    )?.label;

    return armarEmail({
        asunto: `Pedido pagado con MercadoPago · ${pedido.cliente.nombre}`,
        etiqueta: "Pago aprobado",
        titulo: "Nuevo pedido pagado",
        parrafos: [
            `${pedido.cliente.nombre} pagó con MercadoPago. El stock ya se descontó.`,
        ],
        pedido,
        filas: [
            ["Medio de pago", "MercadoPago"],
            ...(entrega ? [["Entrega", entrega]] : []),
        ],
        boton: { texto: "Ver en el admin", url: `${origen}/admin` },
    });
}

/** Para el dueño: un cliente subio el comprobante de una transferencia. */
export function emailComprobante(pedido, origen) {
    return armarEmail({
        asunto: `Comprobante para revisar · ${pedido.cliente.nombre}`,
        etiqueta: "Comprobante subido",
        titulo: "Comprobante para revisar",
        parrafos: [
            `${pedido.cliente.nombre} subió el comprobante de su pago.`,
            "Chequeá que haya entrado la plata y confirmalo en el admin: ahí se descuenta el stock.",
        ],
        pedido,
        filas: [["Medio de pago", labelDelMedio(pedido)]],
        boton: { texto: "Revisar en el admin", url: `${origen}/admin` },
    });
}

/**
 * Para el cliente, apenas hace un pedido que no es de MercadoPago. Si paga
 * por transferencia o cripto lleva los datos para pagar y el link para subir
 * el comprobante; si no (efectivo, PayPal), se coordina por WhatsApp.
 */
export function emailPedidoRecibido(pedido, origen) {
    const numero = numeroDePedido(pedido);
    const pago = DATOS_DE_PAGO[pedido.medio_pago];

    return armarEmail({
        asunto: `Recibimos tu pedido #${numero}`,
        etiqueta: `Pedido #${numero}`,
        titulo: `¡Gracias, ${primerNombre(pedido)}!`,
        parrafos: pago
            ? [
                  "Recibimos tu pedido. Para completarlo, hacé el pago con los datos de abajo y subí el comprobante desde el botón.",
                  `Te lo reservamos por ${HORAS_RESERVA} horas.`,
              ]
            : [
                  `Recibimos tu pedido. Te vamos a escribir por WhatsApp para coordinar el pago (${labelDelMedio(pedido)}) y la entrega.`,
              ],
        pedido,
        filas: [["Medio de pago", labelDelMedio(pedido)]],
        datosDePago: pago,
        boton: pago
            ? { texto: "Subir comprobante", url: urlDelPedido(pedido, origen) }
            : { texto: "Ver mi pedido", url: urlDelPedido(pedido, origen) },
        whatsapp: numero,
    });
}

/** Para el cliente: su pago se confirmo (MercadoPago o el admin). */
export function emailPagoConfirmado(pedido, origen) {
    const numero = numeroDePedido(pedido);

    return armarEmail({
        asunto: `Pago confirmado · pedido #${numero}`,
        etiqueta: `Pedido #${numero}`,
        titulo: "¡Pago confirmado!",
        parrafos: [
            `${primerNombre(pedido)}, ya tenemos tu pago. Te vamos a escribir para coordinar la entrega.`,
        ],
        pedido,
        filas: [["Medio de pago", labelDelMedio(pedido)]],
        boton: { texto: "Ver mi pedido", url: urlDelPedido(pedido, origen) },
        whatsapp: numero,
    });
}

function labelDelMedio(pedido) {
    return getMedioDePago(pedido.medio_pago)?.label ?? pedido.medio_pago;
}

function primerNombre(pedido) {
    return pedido.cliente.nombre.trim().split(/\s+/)[0];
}

function urlDelPedido(pedido, origen) {
    return `${origen}/pedido/${pedido.id}`;
}

function talleDelItem(item) {
    return item.talle ? `Talle ${formatearTalle(item.talle)}` : "";
}

export function escaparHtml(texto) {
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * HTML de mail: tablas y estilos en linea, que es lo que respetan Gmail y
 * Outlook. Va siempre con su version en texto plano.
 *
 * "color-scheme: light only" le pide al cliente que no lo pase a modo
 * oscuro: Apple Mail lo respeta; Gmail y Outlook en el celular lo ignoran y
 * le cambian los colores igual.
 */
function armarEmail({
    asunto,
    etiqueta,
    titulo,
    parrafos,
    pedido,
    filas = [],
    datosDePago,
    boton,
    whatsapp,
}) {
    const total = formatearTotalPedido(pedido);
    const urlWa =
        whatsapp &&
        urlWhatsApp(`¡Hola B&B KICKS! Te escribo por mi pedido #${whatsapp}.`);

    const e = escaparHtml;

    const htmlItems = pedido.items
        .map(
            (item) => `<tr>
<td style="padding:14px 0;border-bottom:1px solid ${NEGRO_10};">
<div style="font-size:15px;font-weight:bold;color:${NEGRO};">${e(item.name)}</div>
${talleDelItem(item) ? `<div style="margin-top:3px;font-size:13px;color:${NEGRO_50};">${e(talleDelItem(item))}</div>` : ""}
</td>
<td align="right" valign="top" style="padding:14px 0 14px 12px;border-bottom:1px solid ${NEGRO_10};font-size:14px;color:${NEGRO_50};white-space:nowrap;">x${item.cantidad}</td>
</tr>`
        )
        .join("\n");

    const htmlFilas = filas
        .map(
            ([label, valor]) => `<tr>
<td style="padding:4px 0;font-size:14px;color:${NEGRO_50};">${e(label)}</td>
<td align="right" style="padding:4px 0;font-size:14px;color:${NEGRO};">${e(valor)}</td>
</tr>`
        )
        .join("\n");

    const htmlDatosDePago = datosDePago
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;background:${NEGRO_5};border:1px solid ${NEGRO_10};border-radius:16px;text-align:left;">
<tr><td style="padding:18px 20px 6px;font-family:${TITULAR};font-size:22px;text-transform:uppercase;color:${ROJO};">${e(datosDePago.titulo)}</td></tr>
${datosDePago.datos
    .map(
        (dato) => `<tr><td style="padding:6px 20px;">
<div style="font-size:12px;color:${NEGRO_50};">${e(dato.label)}</div>
<div style="margin-top:2px;font-size:15px;font-weight:bold;color:${NEGRO};word-break:break-all;">${e(dato.valor)}</div>
</td></tr>`
    )
    .join("\n")}
${datosDePago.aviso ? `<tr><td style="padding:8px 20px 0;font-size:12px;color:${ROJO};">${e(datosDePago.aviso)}</td></tr>` : ""}
<tr><td style="padding:0 0 14px;"></td></tr>
</table>`
        : "";

    const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${e(asunto)}</title>
<style>
:root { color-scheme: light only; supported-color-schemes: light only; }
@font-face { font-family: "Franklin"; src: url("${URL_FRANKLIN}") format("opentype"); }
</style>
</head>
<body style="margin:0;padding:0;background:${NEGRO_5};">
<div style="display:none;max-height:0;overflow:hidden;">${e(parrafos[0])}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${NEGRO_5};font-family:${TEXTO};color:${NEGRO};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${BLANCO};border-radius:24px;overflow:hidden;">

<tr><td align="center" style="background:${NEGRO};padding:22px 24px;">
<a href="${SITIO}" style="text-decoration:none;"><img src="cid:${CID_LOGO}" width="80" alt="B&amp;B KICKS" style="display:block;width:80px;height:auto;border:0;color:${BLANCO};font-family:${TITULAR};font-size:30px;line-height:1;text-transform:uppercase;"></a>
</td></tr>

<tr><td align="center" style="padding:36px 28px 8px;">
<div style="font-size:12px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:${NEGRO_50};">${e(etiqueta)}</div>
<h1 style="margin:10px 0 12px;font-family:${TITULAR};font-size:44px;font-weight:normal;line-height:1;text-transform:uppercase;color:${ROJO};">${e(titulo)}</h1>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;"><tr><td style="width:64px;height:3px;line-height:3px;font-size:0;background:${ROJO};border-radius:3px;">&nbsp;</td></tr></table>
${parrafos.map((p) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${NEGRO_70};">${e(p)}</p>`).join("\n")}
${htmlDatosDePago}
</td></tr>

<tr><td style="padding:20px 28px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${NEGRO_10};">
${htmlItems}
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
${htmlFilas}
<tr>
<td style="padding:14px 0 0;font-family:${TITULAR};font-size:24px;text-transform:uppercase;color:${NEGRO};">Total</td>
<td align="right" style="padding:14px 0 0;font-size:18px;font-weight:bold;color:${ROJO};">${e(total)}</td>
</tr>
</table>
</td></tr>

${
    boton
        ? `<tr><td style="padding:28px 28px 8px;">
<a href="${e(boton.url)}" style="display:block;background:${ROJO};color:${BLANCO};text-decoration:none;padding:14px 20px;border-radius:12px;font-size:14px;font-weight:bold;text-align:center;">${e(boton.texto)}</a>
</td></tr>`
        : ""
}

<tr><td style="padding:20px 28px 32px;">
${urlWa ? `<p style="margin:0;font-size:13px;line-height:1.5;color:${NEGRO_50};text-align:center;">¿Dudas? <a href="${e(urlWa)}" style="color:${ROJO};font-weight:bold;">Escribinos por WhatsApp</a></p>` : ""}
</td></tr>

<tr><td align="center" style="background:${NEGRO};padding:22px 28px;font-size:12px;">
<a href="${SITIO}" style="color:${BLANCO};text-decoration:none;font-weight:bold;">bybkicks.com</a>
<span style="color:${NEGRO_50};">&nbsp;·&nbsp;</span>
<a href="${INSTAGRAM}" style="color:${BLANCO};text-decoration:none;font-weight:bold;">Instagram</a>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

    const texto = [
        titulo,
        "",
        ...parrafos,
        ...(datosDePago
            ? [
                  "",
                  datosDePago.titulo,
                  ...datosDePago.datos.map((d) => `${d.label}: ${d.valor}`),
                  ...(datosDePago.aviso ? [datosDePago.aviso] : []),
              ]
            : []),
        "",
        ...pedido.items.map(
            (i) =>
                `- ${i.name}${i.talle ? ` (${talleDelItem(i)})` : ""} x${i.cantidad}`
        ),
        "",
        ...filas.map(([label, valor]) => `${label}: ${valor}`),
        `Total: ${total}`,
        ...(boton ? ["", `${boton.texto}: ${boton.url}`] : []),
        ...(urlWa ? ["", `¿Dudas? Escribinos por WhatsApp: ${urlWa}`] : []),
    ].join("\n");

    return { asunto, html, texto };
}
