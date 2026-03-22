import { useState, useEffect } from "react";
import Card from "@/components/ui/Card.jsx";

/** @param {{ productos: object[] }} props */
export default function ResultadosBusqueda({ productos = [] }) {
    const [q, setQ] = useState("");

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setQ(params.get("q")?.trim() ?? "");
    }, []);

    const resultados = q.length === 0 ? productos : productos.filter((p) => {
        const query = q.toLowerCase();
        return (
            p.name?.toLowerCase().includes(query) ||
            p.marca?.toLowerCase().includes(query) ||
            p.category?.toLowerCase().includes(query)
        );
    });

    const sugerencias = productos
        .filter(p => p.marca?.toLowerCase().includes(q.toLowerCase()))
        .filter(p => !resultados.includes(p))
        .sort(() => Math.random() - 0.5)
        .slice(0, 4)
        // fallback: si no hay coincidencia de marca, mostrar random
        .concat(
            productos
                .filter(p => !resultados.includes(p))
                .sort(() => Math.random() - 0.5)
        )
        .filter((p, i, arr) => arr.indexOf(p) === i)
        .slice(0, 4);

    const categoriasResultados = new Set(resultados.map(p => p.category).filter(Boolean));
    const marcasResultados = new Set(resultados.map(p => p.marca).filter(Boolean));

    const relacionados = productos
        .filter(p => !resultados.includes(p))
        .filter(p => marcasResultados.has(p.marca))
        .sort(() => Math.random() - 0.5)
        .slice(0, 4);

    return (
        <div className="flex flex-col gap-10 max-w-7xl mx-auto px-6 py-16">
            <div className="flex flex-col gap-2">
                <a href="/" className="flex items-center gap-1.5 text-sm text-gray-accent hover:text-primary w-fit transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                    </svg>
                    Volver al inicio
                </a>

                <h1 className="text-3xl font-bold text-primary">
                    {q ? `Resultados para "${q}"` : "Todos los productos"}
                </h1>
                <p className="text-gray-accent mt-1 text-sm">
                    {resultados.length} {resultados.length === 1 ? "producto encontrado" : "productos encontrados"}
                </p>
            </div>

            {q && resultados.length === 0 && (
                <p className="text-gray-accent">
                    No se encontraron productos para "<span className="text-black font-semibold">{q}</span>".
                </p>
            )}

            {resultados.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20">
                    {resultados.map((p, i) => (
                        <Card key={p.slug} producto={p} priority={i === 0} />
                    ))}
                </div>
            )}

            {q && resultados.length === 0 && sugerencias.length > 0 && (
                <div className="flex flex-col gap-6">
                    <h2 className="text-2xl font-bold text-black">Sugerencias</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-20">
                        {sugerencias.map((p) => (
                            <Card key={p.slug} producto={p} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
