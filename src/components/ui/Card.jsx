export default function Card({ producto }) {
  const href = `/productos/${producto.slug}`;

  return (
    <article class="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col">

        <a href={href} class="bg-gray/10 h-60 flex items-center justify-center overflow-hidden">

            {producto.image ? (
            <img
                src={producto.image}
                alt={producto.name}
                class="object-cover h-full w-full transition-transform duration-300 hover:scale-105"
            />
            ) : (
                <span class="text-gray text-sm">Sin imagen</span>
            )}

        </a>

        <div class="flex flex-col flex-1 gap-2 p-4 justify-between">

            {(producto.category || producto.marca) && (
                <span class="text-xs font-semibold uppercase tracking-wide text-gray/50">
                    {[producto.category, producto.marca].filter(Boolean).join(" ")}
                </span>
            )}

            <a href={href} class="hover:text-primary transition-colors">
                <h3 class="font-bold text-black text-lg leading-tight">
                    {producto.name || "Producto sin nombre"}
                </h3>
            </a>

            <div class="flex items-center justify-between">

                <span class="text-xl font-bold text-primary">
                    ${producto.price.toLocaleString("es-AR")}
                </span>
                {producto.stock === 0 && (
                    <span class="text-xs text-primary font-medium">Sin stock</span>
                )}

            </div>

        </div>

    </article>
  );
}