import Card from "./Card.jsx";

/** @param {{ producto: object, productos: object[] }} props */
export default function ProductosSimilares({ producto, productos = [] }) {
    const similares = productos
        .filter(p => p.slug !== producto.slug && p.marca === producto.marca)
        .sort(() => Math.random() - 0.5)
        .slice(0, 4);

    if (similares.length === 0) return null;

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto px-6 pb-16">
            <h2 className="text-2xl font-bold text-black">Más de {producto.marca}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-20">
                {similares.map(p => (
                    <Card key={p.slug} producto={p} />
                ))}
            </div>
        </div>
    );
}
