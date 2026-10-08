import { describe, expect, it } from "vitest";
import {
    formatearTalle,
    getGrupoTalle,
    normalizarNombreTalle,
    ordenarTalles,
} from "@/utils/talles.js";

describe("talles", () => {
    it("normaliza mayusculas y tildes", () => {
        expect(normalizarNombreTalle(" única ")).toBe("UNICA");
    });

    it("reparte los talles en grupos", () => {
        expect(getGrupoTalle("10")).toBe("zapatillas");
        expect(getGrupoTalle("9.5 US")).toBe("zapatillas");
        expect(getGrupoTalle("32")).toBe("ropa");
        expect(getGrupoTalle("M")).toBe("ropa");
        expect(getGrupoTalle("Única")).toBe("accesorios");
    });

    it("muestra el calzado siempre con US", () => {
        expect(formatearTalle("10")).toBe("10 US");
        expect(formatearTalle("10 US")).toBe("10 US");
        expect(formatearTalle("m")).toBe("M");
    });

    it("ordena letras primero y numeros de menor a mayor", () => {
        const ordenados = ordenarTalles([
            { nombre: "10 US" },
            { nombre: "9 US" },
            { nombre: "M" },
            { nombre: "S" },
        ]).map((t) => t.nombre);

        expect(ordenados).toEqual(["S", "M", "9 US", "10 US"]);
    });
});
