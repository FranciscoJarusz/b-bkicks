import { describe, expect, it, vi } from "vitest";
import {
    getTalleInicial,
    precioDeLista,
    precioDelTalle,
} from "@/utils/precios.js";

// productos.js crea el cliente de Supabase al importarse.
vi.mock("@/lib/supabase.js", () => ({ supabase: {} }));
const { getRangoDePrecios, getSlug, desambiguarSlugs } =
    await import("@/utils/productos.js");

describe("precioDeLista", () => {
    it("suma el recargo y redondea", () => {
        expect(precioDeLista(100)).toBe(125);
        expect(precioDeLista(99)).toBe(124);
        expect(precioDeLista(undefined)).toBe(0);
    });
});

describe("precioDelTalle", () => {
    const producto = {
        price: 100,
        specs: {
            talle: [
                { nombre: "M", precio: 120 },
                { nombre: "L", precio: 0 },
            ],
        },
    };

    it("usa el precio propio del talle", () => {
        expect(precioDelTalle(producto, "M")).toBe(120);
    });

    it("cae al precio del producto si el talle no tiene precio", () => {
        expect(precioDelTalle(producto, "L")).toBe(100);
        expect(precioDelTalle(producto, "XL")).toBe(100);
        expect(precioDelTalle(producto, null)).toBe(100);
    });

    it("un price en 0 es un precio sin cargar: cae al precio base", () => {
        expect(precioDelTalle({ price: 0, precioBase: 80 }, null)).toBe(80);
    });
});

describe("getTalleInicial", () => {
    it("elige el primer talle con stock", () => {
        expect(
            getTalleInicial([
                { nombre: "S", stock: 0 },
                { nombre: "M", stock: 2 },
            ])
        ).toBe("M");
    });

    it("sin stock en ninguno, el primero; sin talles, null", () => {
        expect(getTalleInicial([{ nombre: "S", stock: 0 }])).toBe("S");
        expect(getTalleInicial([])).toBeNull();
    });
});

describe("getRangoDePrecios", () => {
    it("mira solo los talles con stock", () => {
        expect(
            getRangoDePrecios(
                [
                    { stock: 1, precio: 100 },
                    { stock: 0, precio: 50 },
                    { stock: 2, precio: 150 },
                ],
                80
            )
        ).toEqual({ priceMin: 100, priceMax: 150 });
    });

    it("si no hay stock considera todos los talles", () => {
        expect(
            getRangoDePrecios(
                [
                    { stock: 0, precio: 50 },
                    { stock: 0, precio: 70 },
                ],
                80
            )
        ).toEqual({ priceMin: 50, priceMax: 70 });
    });

    it("sin talles con precio usa el precio base", () => {
        expect(getRangoDePrecios([], 80)).toEqual({
            priceMin: 80,
            priceMax: 80,
        });
    });
});

describe("slugs", () => {
    it("getSlug saca tildes y simbolos", () => {
        expect(getSlug("Pantalón Nike  Air!")).toBe("pantalon-nike-air");
        expect(getSlug("AM 95 X CRTZ")).toBe("am-95-x-crtz");
    });

    it("al nombre repetido le suma el id, respetando al mas viejo", () => {
        const productos = [
            { id: 3, slug: "dunk", esEncargo: false },
            { id: 1, slug: "dunk", esEncargo: false },
            { id: 2, slug: "dunk", esEncargo: true },
        ];

        desambiguarSlugs(productos);

        expect(productos.map((p) => p.slug)).toEqual([
            "dunk-3",
            "dunk",
            // Los encargos viven en otra ruta: no chocan con el catalogo.
            "dunk",
        ]);
    });
});
