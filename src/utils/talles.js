const ORDEN_TALLES = ["XS", "S", "M", "L", "XL", "XXL"];

/**
 * Los talles se cargan a mano, asi que "unica" y "ÚNICA" llegan como dos
 * valores distintos. Comparamos siempre sin acentos y en mayuscula.
 */
export function normalizarNombreTalle(nombre) {
    return String(nombre ?? "")
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
}

/** El primer numero del talle: "8.5 US" -> 8.5, "8/8.5 US" -> 8. */
function getNumeroTalle(nombre) {
    const match = normalizarNombreTalle(nombre).match(/\d+(?:[.,]\d+)?/);
    return match ? Number(match[0].replace(",", ".")) : null;
}

export const GRUPOS_TALLES = [
    { value: "ropa", label: "Ropa" },
    { value: "zapatillas", label: "Zapatillas" },
    { value: "accesorios", label: "Accesorios" },
];

/**
 * A que grupo del filtro pertenece un talle. Los numeros solos se reparten por
 * rango: hasta 20 son de calzado (9.5, 10, 11) y de ahi para arriba de ropa
 * (30, 32, 38, que son cinturas de pantalon).
 */
export function getGrupoTalle(nombre) {
    const talle = normalizarNombreTalle(nombre);

    if (/UNIC[AO]|UNIVERSAL|TODOS LOS TALLES|ONE SIZE/.test(talle)) {
        return "accesorios";
    }

    if (/\bUS\b|\bEU\b|\bUK\b|\bAR\b/.test(talle)) return "zapatillas";

    if (ORDEN_TALLES.includes(talle.replace(/^FIT\s+/, ""))) return "ropa";

    const numero = getNumeroTalle(talle);
    if (numero != null) return numero > 20 ? "ropa" : "zapatillas";

    return "accesorios";
}

/**
 * Los talles de calzado se cargan tanto "10" como "10 US". Mostramos siempre la
 * version con US para que sean una sola opcion en los filtros.
 */
export function formatearTalle(nombre) {
    const talle = normalizarNombreTalle(nombre);

    if (getGrupoTalle(talle) !== "zapatillas") return talle;
    if (/\bUS\b|\bEU\b|\bUK\b|\bAR\b/.test(talle)) return talle;

    return `${talle} US`;
}

export function normalizarTalles(talles) {
    return (talles ?? [])
        .filter(Boolean)
        .map((t) => (typeof t === "string" ? { nombre: t, stock: 1 } : t))
        .filter((t) => t.nombre);
}

export function ordenarTalles(talles) {
    return [...talles].sort((a, b) => {
        const ia = ORDEN_TALLES.indexOf(normalizarNombreTalle(a.nombre));
        const ib = ORDEN_TALLES.indexOf(normalizarNombreTalle(b.nombre));
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;

        // "9 US" antes que "10 US": por texto quedarian al reves.
        const na = getNumeroTalle(a.nombre);
        const nb = getNumeroTalle(b.nombre);
        if (na != null && nb != null && na !== nb) return na - nb;
        if (na != null && nb == null) return -1;
        if (na == null && nb != null) return 1;

        return a.nombre.localeCompare(b.nombre, "es");
    });
}

/**
 * Reparte los talles en los grupos del filtro y descarta los que quedan vacios.
 *
 * @param {string[]} nombres
 * @returns {{ value: string, label: string, talles: string[] }[]}
 */
export function agruparTalles(nombres) {
    return GRUPOS_TALLES.map((grupo) => ({
        ...grupo,
        talles: ordenarTalles(
            nombres
                .filter((nombre) => getGrupoTalle(nombre) === grupo.value)
                .map((nombre) => ({ nombre, stock: 1 }))
        ).map((t) => t.nombre),
    })).filter((grupo) => grupo.talles.length > 0);
}
