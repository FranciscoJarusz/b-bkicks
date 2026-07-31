import React from "react";
import { normalizarTalles, ordenarTalles } from "@/utils/talles.js";

export default function Card({
    producto,
    priority = false,
    basePath = "/productos",
    mostrarTodosLosTalles = false,
}) {
    const href = `${basePath}/${producto.slug}`;
    const tallesDisponibles = ordenarTalles(
        normalizarTalles(producto.specs?.talle).filter(
            (t) => mostrarTodosLosTalles || t.stock > 0
        )
    );

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
            <div className="flex flex-1 flex-col gap-2 py-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex min-w-0 flex-col gap-0.5 text-left">
                    <h3 className="font-bold text-black text-sm lg:text-lg leading-tight">
                        {producto.name || "Producto sin nombre"}
                    </h3>
                    <span className="lg:flex hidden text-xs font-semibold uppercase tracking-wide text-black/70">
                        {producto.marca}
                    </span>
                    <span className="text-lg lg:text-2xl font-bold text-primary">
                        $
                        {Math.round(producto.price * 1.25).toLocaleString(
                            "es-AR"
                        )}
                    </span>
                    <span className="text-[10px] lg:text-sm text-black/60">
                        ($
                        <span className="font-bold">
                            {producto.price.toLocaleString("es-AR")}
                        </span>{" "}
                        en efectivo o transferencia)
                    </span>
                    {!mostrarTodosLosTalles && producto.stock === 0 && (
                        <span className="text-xs text-primary font-medium">
                            Sin stock
                        </span>
                    )}
                </div>
                {tallesDisponibles.length > 0 && (
                    <div className="flex flex-col gap-1 lg:items-end lg:shrink-0">
                        <div className="flex flex-wrap gap-1 lg:justify-end lg:max-w-22">
                            {tallesDisponibles.map((t) => (
                                <span
                                    key={t.nombre}
                                    className="bg-primary text-white text-xs font-semibold uppercase px-2 py-0.5"
                                >
                                    {t.nombre}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </article>
    );
}
