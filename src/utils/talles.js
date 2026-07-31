const ORDEN_TALLES = ["XS", "S", "M", "L", "XL", "XXL"];

export function normalizarTalles(talles) {
    return (talles ?? [])
        .filter(Boolean)
        .map((t) => (typeof t === "string" ? { nombre: t, stock: 1 } : t))
        .filter((t) => t.nombre);
}

export function ordenarTalles(talles) {
    return [...talles].sort((a, b) => {
        const ia = ORDEN_TALLES.indexOf(a.nombre.toUpperCase());
        const ib = ORDEN_TALLES.indexOf(b.nombre.toUpperCase());
        if (ia === -1 && ib === -1) return a.nombre.localeCompare(b.nombre);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });
}
