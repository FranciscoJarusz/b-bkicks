import { describe, expect, it } from "vitest";
import {
    emailComprobante,
    emailPagoConfirmado,
    emailPedidoPagado,
    emailPedidoRecibido,
    numeroDePedido,
} from "@/utils/emails.js";

const ORIGEN = "https://x.com";

const PEDIDO = {
    id: "3f2a9c1e-1111-4222-8333-944445555666",
    medio_pago: "transferencia",
    cliente: {
        nombre: "Juan Perez",
        email: "juan@mail.com",
        entrega: "envio",
        dni: "30111222",
        direccion: "Av. Siempre Viva 742",
    },
    items: [{ name: "Dunk Low", talle: "10", cantidad: 2 }],
    total_usd: 250,
    total_ars: 375000,
};

describe("emails al dueño", () => {
    it("el de pago aprobado resume el pedido sin datos sensibles", () => {
        const email = emailPedidoPagado(
            { ...PEDIDO, medio_pago: "mercadopago" },
            ORIGEN
        );

        expect(email.asunto).toContain("Juan Perez");
        expect(email.texto).toContain("- Dunk Low (Talle 10 US) x2");
        expect(email.texto).toContain("Total: $375.000 (USD 250)");
        expect(email.texto).toContain("Entrega: Envío");
        expect(email.texto).toContain("https://x.com/admin");
        for (const contenido of [email.texto, email.html]) {
            expect(contenido).not.toContain("30111222");
            expect(contenido).not.toContain("Siempre Viva");
        }
    });

    it("el de comprobante dice el medio y cuanto tiene que haber entrado", () => {
        const email = emailComprobante(PEDIDO, ORIGEN);

        expect(email.texto).toContain("Transferencia ARS");
        expect(email.texto).toContain("Total: $375.000 (USD 250)");
        expect(email.texto).toContain("https://x.com/admin");
    });

    it("en dolares no muestra pesos", () => {
        const email = emailComprobante(
            { ...PEDIDO, medio_pago: "usdt", total_ars: null },
            ORIGEN
        );

        expect(email.texto).toContain("Total: USD 250");
    });
});

describe("emails al cliente", () => {
    it("si paga en la web, lleva el link para pagar y la reserva", () => {
        const email = emailPedidoRecibido(PEDIDO, ORIGEN);

        expect(email.asunto).toBe("Recibimos tu pedido #3F2A9C1E");
        expect(email.texto).toContain("¡Gracias, Juan!");
        expect(email.texto).toContain(`https://x.com/pedido/${PEDIDO.id}`);
        expect(email.texto).toContain("24 horas");
        expect(email.texto).toContain("Alias: bautistabrey");
    });

    it("si paga en efectivo, se coordina por WhatsApp", () => {
        const email = emailPedidoRecibido(
            { ...PEDIDO, medio_pago: "efectivo" },
            ORIGEN
        );

        expect(email.texto).toContain("por WhatsApp");
        expect(email.texto).not.toContain("horas");
    });

    it("el de pago confirmado lleva el numero de pedido", () => {
        const email = emailPagoConfirmado(PEDIDO, ORIGEN);

        expect(email.asunto).toContain(numeroDePedido(PEDIDO));
        expect(email.texto).toContain("¡Pago confirmado!");
    });

    it("escapa lo que escribe el cliente", () => {
        const email = emailPedidoRecibido(
            { ...PEDIDO, cliente: { ...PEDIDO.cliente, nombre: "<b>Ana</b>" } },
            ORIGEN
        );

        expect(email.html).not.toContain("<b>Ana");
        expect(email.html).toContain("&lt;b&gt;Ana");
    });
});
