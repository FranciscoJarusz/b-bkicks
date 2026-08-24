// Coincidencias avanzadas del pixel de Meta. El pixel hashea estos valores con
// SHA-256 en el navegador antes de enviarlos, pero espera recibirlos ya
// normalizados: en minusculas, sin espacios ni simbolos, y el telefono en
// formato internacional.

// Mismo id con el que se inicializa el pixel en src/layouts/Layout.astro.
export const META_PIXEL_ID = "917173001433329";

// Los telefonos argentinos se escriben de mil formas ("11 5555-4444",
// "+54 9 11...", "011 15 5555 4444"). Meta los quiere como 549XXXXXXXXXX.
export function normalizarTelefono(valor) {
    let digitos = String(valor ?? "").replace(/\D/g, "");

    // El 0 de larga distancia y el 00 de salida internacional no van.
    digitos = digitos.replace(/^0+/, "");

    // Ya trae codigo de pais: nos aseguramos de que tenga un solo 9 de celular.
    if (digitos.startsWith("54")) {
        return `549${digitos.slice(2).replace(/^9+/, "")}`;
    }

    // "11 15 5555-4444": el 15 es prefijo local, no existe en internacional.
    if (digitos.length === 12 && digitos.slice(2, 4) === "15") {
        digitos = digitos.slice(0, 2) + digitos.slice(4);
    }

    return `549${digitos}`;
}

export function datosCoincidenciaAvanzada({ nombre, telefono, email }) {
    const palabras = String(nombre ?? "")
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

    const avanzados = {
        em: String(email ?? "")
            .trim()
            .toLowerCase(),
        ph: normalizarTelefono(telefono),
        fn: palabras[0],
        ln: palabras.slice(1).join(" "),
        country: "ar",
    };

    // Un campo vacio ensucia la calidad de la coincidencia: mejor no mandarlo.
    for (const clave of Object.keys(avanzados)) {
        if (!avanzados[clave]) delete avanzados[clave];
    }

    return avanzados;
}

// Guardamos los datos ya normalizados para que las visitas siguientes tambien
// salgan con coincidencias avanzadas: el snippet inline de
// src/layouts/Layout.astro los lee antes del fbq("init").
//
// OJO: si cambias la clave o la vigencia, hay que tocarlas tambien alla; un
// script `is:inline` no puede importar este modulo.
export const CLAVE_AM = "meta-am";
export const VIGENCIA_AM = 60 * 24 * 60 * 60 * 1000;

export function guardarCoincidenciaAvanzada(datos) {
    try {
        localStorage.setItem(
            CLAVE_AM,
            JSON.stringify({
                guardado: Date.now(),
                datos: datosCoincidenciaAvanzada(datos),
            })
        );
    } catch {
        // Sin storage no hay coincidencias avanzadas persistentes, nada mas.
    }
}
