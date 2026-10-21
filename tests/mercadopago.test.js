import { describe, expect, it } from "vitest";
import { itemsDePreferencia, totalDePreferencia } from "@/utils/mercadopago.js";

const ITEMS = [
    { slug: "dunk", name: "Dunk Low", talle: "10", price: 100, cantidad: 2 },
    { slug: "tee", name: "Tee", talle: null, price: 40, cantidad: 1 },
];

describe("itemsDePreferencia", () => {
    it("cobra el precio de lista en pesos, redondeado por unidad", () => {
        const items = itemsDePreferencia(ITEMS, 1500.4);

        expect(items[0]).toMatchObject({
            id: "dunk",
            quantity: 2,
            // 100 * 1.25 = 125 USD -> 125 * 1500.4 = 187550
            unit_price: 187550,
            currency_id: "ARS",
        });
        expect(items[0].title).toBe("Dunk Low (Talle 10 US)");
        expect(items[1].title).toBe("Tee");
    });

    it("el total es lo que suma MercadoPago", () => {
        const items = itemsDePreferencia(ITEMS, 1500);
        expect(totalDePreferencia(items)).toBe(125 * 1500 * 2 + 50 * 1500);
    });
});
