import CatalogoConFiltros from "@/components/ui/CatalogoConFiltros.jsx";

/** @param {{ productos: object[] }} props */
export default function ResultadosBusqueda({ productos = [] }) {
    return (
        <CatalogoConFiltros
            productos={productos}
            titulo="Todos los productos"
            conBusqueda
        />
    );
}
