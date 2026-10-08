import { describe, expect, it } from "vitest";
import { buscarProductos } from "@/utils/busqueda.js";

const PRODUCTOS = [
    { name: "Air Jordan 4 Retro", marca: "Nike", category: "zapatillas" },
    { name: "Dunk Low Panda", marca: "Nike", category: "zapatillas" },
    { name: "Hoodie Jumpman", marca: "Jordan", category: "buzo" },
    { name: "Tee Logo", marca: "Corteiz", category: "remera" },
    { name: "Cargo", marca: "Corteiz", category: "pantalon" },
];

const nombres = (lista) => lista.map((p) => p.name);

describe("buscarProductos", () => {
    it("sin busqueda devuelve todo en el mismo orden", () => {
        expect(buscarProductos(PRODUCTOS, "  ")).toEqual(PRODUCTOS);
    });

    it("cada palabra puede estar en un campo distinto", () => {
        expect(nombres(buscarProductos(PRODUCTOS, "nike dunk"))).toEqual([
            "Dunk Low Panda",
        ]);
    });

    it("una marca no esconde los productos que la nombran", () => {
        // Antes "jordan" devolvia solo la marca Jordan.
        expect(nombres(buscarProductos(PRODUCTOS, "jordan"))).toEqual([
            "Hoodie Jumpman",
            "Air Jordan 4 Retro",
        ]);
    });

    it("entiende las abreviaturas de Jordan en los dos sentidos", () => {
        const productos = [
            { name: "J1 low Travis Scott", marca: "Nike" },
            { name: "AJ11 Concord", marca: "Nike" },
            { name: "Jordan 4 retro", marca: "Jordan" },
            { name: "Dunk Low", marca: "Nike" },
        ];

        expect(nombres(buscarProductos(productos, "jordan"))).toEqual([
            "Jordan 4 retro",
            "J1 low Travis Scott",
            "AJ11 Concord",
        ]);
        // El 1 no tiene que traer las 11.
        expect(nombres(buscarProductos(productos, "jordan 1"))).toEqual([
            "J1 low Travis Scott",
        ]);
        expect(nombres(buscarProductos(productos, "j1"))).toEqual([
            "J1 low Travis Scott",
        ]);
        expect(nombres(buscarProductos(productos, "j4"))).toEqual([
            "Jordan 4 retro",
        ]);
    });

    it("tolera plurales y tildes", () => {
        expect(nombres(buscarProductos(PRODUCTOS, "remeras"))).toEqual([
            "Tee Logo",
        ]);
        expect(nombres(buscarProductos(PRODUCTOS, "pantalón"))).toEqual([
            "Cargo",
        ]);
    });

    it("si una palabra no aparece en ningun lado, no hay resultado", () => {
        expect(buscarProductos(PRODUCTOS, "nike corteiz")).toEqual([]);
    });
});
