import { describe, expect, it } from "vitest";
import {
    DATOS_INICIALES,
    armarMensajePedido,
    calcularTotales,
    validarCheckout,
} from "@/utils/pedido.js";
import { aplicarPreciosActuales } from "@/utils/carrito.js";

const ITEMS = [
    { slug: "dunk", name: "Dunk Low", talle: "10", price: 1000, cantidad: 2 },
    { slug: "tee", name: "Tee", talle: "M", price: 99, cantidad: 1 },
];

const DATOS_COMPLETOS = {
    ...DATOS_INICIALES,
    nombre: "Juan Perez",
    telefono: "11 5555 4444",
    email: "juan@mail.com",
    entrega: "coordinar",
};

describe("calcularTotales", () => {
    it("sin medio de pago elegido vale el precio de lista", () => {
        const totales = calcularTotales(ITEMS, "");
        expect(totales.total).toBe(2099);
        expect(totales.totalLista).toBe(1250 * 2 + 124);
        expect(totales.totalAPagar).toBe(totales.totalLista);
    });

    it("efectivo y transferencia pagan el precio con descuento", () => {
        expect(calcularTotales(ITEMS, "efectivo").totalAPagar).toBe(2099);
        expect(calcularTotales(ITEMS, "transferencia").totalAPagar).toBe(2099);
    });

    it("MercadoPago paga el precio de lista", () => {
        expect(calcularTotales(ITEMS, "mercadopago").totalAPagar).toBe(2624);
    });
});

describe("validarCheckout", () => {
    it("pide los datos obligatorios", () => {
        expect(Object.keys(validarCheckout(DATOS_INICIALES)).sort()).toEqual(
            ["email", "entrega", "nombre", "pago", "telefono"].sort()
        );
    });

    it("coordinando la entrega no pide domicilio ni DNI", () => {
        expect(
            validarCheckout({ ...DATOS_COMPLETOS, pago: "efectivo" })
        ).toEqual({});
    });

    it("con envio pide direccion, DNI y codigo postal validos", () => {
        const errores = validarCheckout({
            ...DATOS_COMPLETOS,
            pago: "efectivo",
            entrega: "envio",
            dni: "123",
            codigoPostal: "B1714XYZ",
        });
        expect(Object.keys(errores).sort()).toEqual(["direccion", "dni"]);
    });
});

describe("armarMensajePedido", () => {
    it("lista los productos y el total del medio de pago elegido", () => {
        const mensaje = armarMensajePedido(ITEMS, {
            ...DATOS_COMPLETOS,
            pago: "mercadopago",
        });

        expect(mensaje).toContain(
            "*Dunk Low* (Talle: *10 US*) *x2* — $*2.500*"
        );
        expect(mensaje).toContain("*Total: $2.624*");
        expect(mensaje).toContain("*Medio de pago:* MercadoPago");
        expect(mensaje).not.toContain("DNI");
    });

    it("con efectivo usa el precio con descuento", () => {
        const mensaje = armarMensajePedido(ITEMS, {
            ...DATOS_COMPLETOS,
            pago: "efectivo",
        });
        expect(mensaje).toContain("*Total: $2.099*");
    });
});

describe("aplicarPreciosActuales", () => {
    const carrito = [
        { slug: "dunk", talle: "10", price: 1000, stock: 5, cantidad: 3 },
    ];

    it("actualiza el precio y recorta la cantidad al stock", () => {
        expect(
            aplicarPreciosActuales(carrito, [
                {
                    slug: "dunk",
                    talle: "10",
                    existe: true,
                    price: 1100,
                    stock: 2,
                },
            ])
        ).toEqual([
            { slug: "dunk", talle: "10", price: 1100, stock: 2, cantidad: 2 },
        ]);
    });

    it("devuelve null si no cambio nada o el producto ya no existe", () => {
        expect(
            aplicarPreciosActuales(carrito, [
                {
                    slug: "dunk",
                    talle: "10",
                    existe: true,
                    price: 1000,
                    stock: 5,
                },
            ])
        ).toBeNull();
        expect(
            aplicarPreciosActuales(carrito, [
                { slug: "dunk", talle: "10", existe: false },
            ])
        ).toBeNull();
    });
});
