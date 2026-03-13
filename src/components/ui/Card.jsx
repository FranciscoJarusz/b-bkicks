export default function Card({ producto }) {
  const href = `/productos/${producto.slug}`;

  return (
    <article className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col">

        <a href={href} className="bg-gray/10 h-56 flex items-center justify-center hover:opacity-80 transition-opacity">

            {producto.image ? (
            <img
                src={producto.image}
                alt={producto.name}
                className="object-contain h-full w-full p-4"
            />
            ) : (
            <span className="text-gray text-sm">Sin imagen</span>
            )}

        </a>

        <div className="flex flex-col flex-1 gap-2 p-4 justify-between">

            {(producto.category || producto.marca) && (
                <span className="text-xs font-semibold uppercase tracking-wide text-gray/50">
                    {[producto.category, producto.marca].filter(Boolean).join(" ")}
                </span>
            )}

            <a href={href} className="hover:text-primary transition-colors">
                <h3 className="font-bold text-black text-lg leading-tight">
                    {producto.name || "Producto sin nombre"}
                </h3>
            </a>

            <div className="flex items-center justify-between">

                <span className="text-xl font-bold text-primary">
                    ${producto.price.toLocaleString("es-AR")}
                </span>
                {producto.stock === 0 && (
                    <span className="text-xs text-primary font-medium">Sin stock</span>
                )}

            </div>

        </div>

    </article>
  );
}