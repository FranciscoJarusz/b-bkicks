import { getEtiquetaCategoria } from "@/utils/categorias.js";

export function normalizarTexto(valor) {
    return String(valor ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .trim();
}

// "remeras" tiene que encontrar "Remera" y "pantalones" a "Pantalón".
function variantes(palabra) {
    const lista = [palabra];
    if (palabra.length > 3 && palabra.endsWith("es")) {
        lista.push(palabra.slice(0, -2));
    }
    if (palabra.length > 3 && palabra.endsWith("s")) {
        lista.push(palabra.slice(0, -1));
    }
    return lista;
}

/**
 * Las Jordan se cargan tanto "Jordan 1" como "J1" o "AJ1". Sumamos al texto la
 * otra forma, asi "jordan" encuentra "J1 low Travis Scott" y "j4" encuentra
 * "Jordan 4 retro".
 */
function expandirAbreviaturas(texto) {
    const extras = [];
    for (const [, numero] of texto.matchAll(/\ba?j(\d{1,2})\b/g)) {
        extras.push(`jordan ${numero}`);
    }
    for (const [, numero] of texto.matchAll(/\bjordan (\d{1,2})\b/g)) {
        extras.push(`j${numero} aj${numero}`);
    }
    return extras.length > 0 ? `${texto} ${extras.join(" ")}` : texto;
}

// Lo que lleva numeros tiene que coincidir entero: "jordan 1" o "j1" no
// deberian traer las 11.
function coincide(texto, palabra) {
    if (/\d/.test(palabra)) {
        const escapada = palabra.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`(^|[^a-z0-9])${escapada}([^a-z0-9]|$)`).test(texto);
    }
    return texto.includes(palabra);
}

// Cuanto pesa que una palabra aparezca en cada campo: si buscas "jordan",
// primero los productos de la marca Jordan y despues las Air Jordan de Nike.
const PESOS = { marca: 3, nombre: 2, categoria: 1 };

/**
 * Filtra y ordena por relevancia. Cada palabra de la busqueda tiene que
 * aparecer en el nombre, la marca o la categoria, asi "nike dunk" encuentra
 * un "Dunk Low" de Nike. A igual relevancia se respeta el orden original
 * (los mas nuevos primero).
 *
 * @template {{ name?: string, marca?: string, category?: string }} T
 * @param {T[]} productos
 * @param {string} consulta
 * @returns {T[]}
 */
export function buscarProductos(productos, consulta) {
    const palabras = normalizarTexto(consulta).split(/\s+/).filter(Boolean);
    if (palabras.length === 0) return productos;

    const puntuados = [];

    productos.forEach((producto, indice) => {
        const campos = {
            marca: normalizarTexto(producto.marca),
            nombre: expandirAbreviaturas(normalizarTexto(producto.name)),
            categoria: normalizarTexto(
                getEtiquetaCategoria(producto.category) || producto.category
            ),
        };

        let puntaje = 0;
        for (const palabra of palabras) {
            const formas = variantes(palabra);
            let mejor = 0;
            for (const [campo, texto] of Object.entries(campos)) {
                if (formas.some((forma) => coincide(texto, forma))) {
                    mejor = Math.max(mejor, PESOS[campo]);
                }
            }
            // Una palabra que no aparece en ningun lado descarta el producto.
            if (mejor === 0) return;
            puntaje += mejor;
        }

        puntuados.push({ producto, puntaje, indice });
    });

    return puntuados
        .sort((a, b) => b.puntaje - a.puntaje || a.indice - b.indice)
        .map(({ producto }) => producto);
}
