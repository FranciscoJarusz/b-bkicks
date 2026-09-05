import { useState, useEffect } from "react";
import { normalizarTalles, ordenarTalles } from "@/utils/talles.js";
import { precioDeLista } from "@/utils/schema.js";
import { getTalleInicial, precioDelTalle } from "@/utils/precios.js";

/**
 * El precio de la ficha. Vive aparte del selector de talles (que esta en
 * AgregarAlCarrito / EncargarPorWhatsApp) porque en el layout va mucho mas
 * arriba, asi que se entera del talle elegido por un evento de window.
 */
export default function PrecioProducto({ producto }) {
    const talles = ordenarTalles(normalizarTalles(producto.specs?.talle ?? []));
    const [precio, setPrecio] = useState(() =>
        precioDelTalle(producto, getTalleInicial(talles))
    );

    useEffect(() => {
        // El otro island puede haber elegido el talle antes de que montemos,
        // asi que ademas de escuchar el evento leemos el ultimo valor.
        const actual = window.__talleSeleccionado;
        if (actual?.slug === producto.slug) setPrecio(actual.precio);

        function sincronizar(event) {
            if (event.detail?.slug !== producto.slug) return;
            setPrecio(event.detail.precio);
        }

        window.addEventListener("talle-seleccionado", sincronizar);
        return () =>
            window.removeEventListener("talle-seleccionado", sincronizar);
    }, [producto.slug]);

    return (
        <div className="flex flex-col gap-1">
            <span className="text-2xl font-bold text-primary">
                ${precioDeLista(precio).toLocaleString("es-AR")}
            </span>
            <span className="text-sm text-black/60">
                ($
                <span className="font-bold">
                    {precio.toLocaleString("es-AR")}
                </span>{" "}
                en efectivo o transferencia)
            </span>
        </div>
    );
}
