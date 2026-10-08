import { describe, expect, it } from "vitest";
import { datosCoincidenciaAvanzada, normalizarTelefono } from "@/utils/meta.js";

describe("normalizarTelefono", () => {
    it.each([
        ["11 5555-4444", "5491155554444"],
        ["011 15 5555 4444", "5491155554444"],
        ["+54 9 11 5555-4444", "5491155554444"],
        ["+54 11 5555 4444", "5491155554444"],
    ])("%s -> %s", (entrada, esperado) => {
        expect(normalizarTelefono(entrada)).toBe(esperado);
    });
});

describe("datosCoincidenciaAvanzada", () => {
    it("normaliza y separa nombre y apellido", () => {
        expect(
            datosCoincidenciaAvanzada({
                nombre: " Juan Pérez Gómez ",
                telefono: "11 5555 4444",
                email: " Juan@Mail.com ",
            })
        ).toEqual({
            em: "juan@mail.com",
            ph: "5491155554444",
            fn: "juan",
            ln: "pérez gómez",
            country: "ar",
        });
    });

    it("no manda campos vacios", () => {
        const datos = datosCoincidenciaAvanzada({
            nombre: "Juan",
            telefono: "",
            email: "",
        });
        expect(datos).not.toHaveProperty("em");
        expect(datos).not.toHaveProperty("ln");
    });
});
