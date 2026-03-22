import { useState, useEffect } from "react";
import Card from "@/components/ui/Card.jsx";

/** @param {{ producto: object, productos: object[] }} props */
export default function ProductosSimilares({ producto, productos = [] }) {
    const filtrados = productos.filter(
        (p) => p.slug !== producto.slug && p.marca === producto.marca
    );

    const [similares, setSimilares] = useState(filtrados.slice(0, 4));

    useEffect(() => {
        const mezclados = [...filtrados]
            .sort(() => Math.random() - 0.5)
            .slice(0, 4);
        setSimilares(mezclados);
    }, [producto.slug]);

    if (similares.length === 0) return null;

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto px-6 pb-16">
            <h2 className="text-2xl font-bold text-black">Más de {producto.marca}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20">
                {similares.map(p => (
                    <Card key={p.slug} producto={p} />
                ))}
            </div>
        </div>
    );
}
