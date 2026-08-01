export const CATEGORIAS = [
    { value: "buzo", label: "Buzo" },
    { value: "remera", label: "Remera" },
    { value: "pantalon", label: "Pantalón" },
    { value: "zapatillas", label: "Zapatillas" },
    {  value: "accesorios", label: "Accesorios" },
];

export function getEtiquetaCategoria(value) {
    return CATEGORIAS.find((c) => c.value === value)?.label ?? "";
}
