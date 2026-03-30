import { useState, useEffect } from "react";
import Card from "@/components/ui/Card.jsx";

/** @param {{ productos: object[] }} props */
export default function ResultadosBusqueda({ productos = [] }) {
    const [q, setQ] = useState("");

    function normalizeText(value) {
        return String(value ?? "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }

    function getDedupKey(producto) {
        return [
            normalizeText(producto.slug),
            normalizeText(producto.name),
            normalizeText(producto.marca),
            Number(producto.price ?? 0),
            normalizeText(producto.image),
        ].join("::");
    }

    function getRenderKey(producto) {
        return String(producto.id ?? getDedupKey(producto));
    }

    function dedupeProducts(lista) {
        const seen = new Set();

        return lista.filter((producto) => {
            const key = getDedupKey(producto);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setQ(params.get("q")?.trim() ?? "");
    }, []);

    const productosUnicos = dedupeProducts(productos);
    const query = normalizeText(q);

    const resultados = query.length === 0
        ? productosUnicos
        : (() => {
            const porMarca = productosUnicos.filter((p) =>
                normalizeText(p.marca).includes(query)
            );

            if (porMarca.length > 0) {
                return porMarca;
            }

            return productosUnicos.filter((p) =>
                normalizeText(p.name).includes(query) ||
                normalizeText(p.marca).includes(query) ||
                normalizeText(p.category).includes(query)
            );
        })();

    const resultadoKeys = new Set(resultados.map(getDedupKey));

    const sugerencias = productosUnicos
        .filter((p) => normalizeText(p.marca).includes(query))
        .filter((p) => !resultadoKeys.has(getDedupKey(p)))
        .sort(() => Math.random() - 0.5)
        .slice(0, 4)
        .concat(
            productosUnicos
                .filter((p) => !resultadoKeys.has(getDedupKey(p)))
                .sort(() => Math.random() - 0.5)
        )
        .filter((p, index, arr) =>
            arr.findIndex((item) => getDedupKey(item) === getDedupKey(p)) === index
        )
        .slice(0, 4);

    return (
        <div className="flex flex-col gap-10 max-w-7xl mx-auto px-6 py-16">
            <div className="flex flex-col gap-2">
                <a href="/" className="flex items-center gap-1.5 text-sm text-black/70 hover:text-primary w-fit transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                    </svg>
                    Volver al inicio
                </a>

                <h1 className="text-3xl font-bold text-primary">
                    {q ? `Resultados para "${q}"` : "Todos los productos"}
                </h1>
                <p className="text-black mt-1 text-sm">
                    {resultados.length} {resultados.length === 1 ? "producto encontrado" : "productos encontrados"}
                </p>
            </div>

            {q && resultados.length === 0 && (
                <p className="text-black">
                    No se encontraron productos para "<span className="text-black font-semibold">{q}</span>".
                </p>
            )}

            {resultados.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20">
                    {resultados.map((p, i) => (
                        <Card key={getRenderKey(p)} producto={p} priority={i === 0} />
                    ))}
                </div>
            )}

            {q && resultados.length === 0 && sugerencias.length > 0 && (
                <div className="flex flex-col gap-6">
                    <h2 className="text-2xl font-bold text-black">Sugerencias</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-20">
                        {sugerencias.map((p) => (
                            <Card key={getRenderKey(p)} producto={p} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
