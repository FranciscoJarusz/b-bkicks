import React from "react";

export default function Card({ producto, priority = false }) {
  const href = `/productos/${producto.slug}`;

  return (
    <article className="flex flex-col animate-fade-in-down">
      <a
        href={href}
        className="h-50 lg:h-80 object-fit flex items-center justify-center overflow-hidden rounded-xl"
      >
        {producto.image ? (
          <img
            src={producto.image}
            alt={producto.name}
            width="368"
            height="490"
            className="object-cover h-full w-full transition-transform duration-300 hover:scale-105"
            fetchPriority={priority ? "high" : "auto"}
          />
        ) : (
          <span className="text-blac/50 text-sm">Sin imagen</span>
        )}
      </a>
      <div className="flex flex-col flex-1 gap-1 py-4 items-center text-center">
        <h3 className="font-bold text-black text-lg leading-tight">
          {producto.name || "Producto sin nombre"}
        </h3>
        <span className="text-xs font-semibold uppercase tracking-wide text-black/70">
          {producto.marca}
        </span>
        <div className="flex items-center justify-between">
          <span className="text-base lg:text-xl font-bold text-primary">
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
