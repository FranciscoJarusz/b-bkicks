
import React from "react";
import BotonComprar from "@/components/ui/BotonComprar.jsx";

export default function Card({ producto, priority = false }) {
    const href = `/productos/${producto.slug}`;

    return (
        <article className="shadow-xl rounded-xl overflow-hidden flex flex-col animate-fade-in-down">
            <a href={href} className="h-80 object-fit flex items-center justify-center overflow-hidden">
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
                    <span className="text-gray text-sm">Sin imagen</span>
                )}
            </a>
            <div className="flex flex-col flex-1 gap-2 p-4 justify-between">
                {(producto.category || producto.marca) && (
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-accent">
                        {[producto.category, producto.marca].filter(Boolean).join(" ")}
                    </span>
                )}
                <h1 className="font-bold text-black text-lg leading-tight">
                    {producto.name || "Producto sin nombre"}
                </h1>
                <div className="flex items-center justify-between mt-5">
                    <span className="text-xl font-bold text-primary">
                        ${producto.price.toLocaleString("es-AR")}
                    </span>
                    {producto.stock === 0 && (
                        <span className="text-xs text-primary font-medium">Sin stock</span>
                    )}
                    <BotonComprar
                        onClick={() => (window.location.href = href)}
                        disabled={producto.stock === 0}
                    />
                </div>
            </div>
        </article>
    );
}