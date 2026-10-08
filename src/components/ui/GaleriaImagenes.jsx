import { useRef, useState } from "react";
import { cloudinaryUrl } from "@/utils/cloudinary.js";

export default function GaleriaImagenes({ images, alt }) {
    const [seleccionada, setSeleccionada] = useState(0);

    const inicioToque = useRef(null);

    function cambiar(nuevo) {
        setSeleccionada(nuevo);
    }

    // Swipe en mobile. Solo cuenta si el gesto es mas horizontal que vertical,
    // para no robarle el scroll de la pagina a quien desliza hacia abajo.
    function alTocar(evento) {
        const toque = evento.touches[0];
        inicioToque.current = { x: toque.clientX, y: toque.clientY };
    }

    function alSoltar(evento) {
        const inicio = inicioToque.current;
        inicioToque.current = null;
        if (!inicio || images.length < 2) return;

        const toque = evento.changedTouches[0];
        const dx = toque.clientX - inicio.x;
        const dy = toque.clientY - inicio.y;
        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;

        const paso = dx < 0 ? 1 : -1;
        cambiar((seleccionada + paso + images.length) % images.length);
    }

    if (!images || images.length === 0) {
        return <span className="text-black/50 text-sm">Sin imagen</span>;
    }

    return (
        <div className="flex flex-col gap-3">
            <div
                className="rounded-2xl overflow-hidden aspect-square w-full relative group"
                onTouchStart={alTocar}
                onTouchEnd={alSoltar}
            >
                {images.map((img, i) => (
                    <img
                        key={i}
                        src={cloudinaryUrl(img, { width: 800, height: 800 })}
                        alt={alt}
                        className={`absolute inset-0 object-cover h-full w-full transition-opacity duration-500 ${i === seleccionada ? "opacity-100" : "opacity-0"}`}
                        // Las fotos estan apiladas y todas "en pantalla", asi
                        // que lazy no las frenaria: priorizamos la primera y
                        // las demas bajan despues.
                        fetchPriority={i === 0 ? "high" : "low"}
                        decoding="async"
                    />
                ))}

                {images.length > 1 && (
                    <>
                        <button
                            onClick={() =>
                                cambiar(
                                    (seleccionada - 1 + images.length) %
                                        images.length
                                )
                            }
                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-secondary/80 hover:bg-secondary text-black rounded-full w-9 h-9 flex items-center justify-center shadow-md opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                            aria-label="Anterior"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                        </button>

                        <button
                            onClick={() =>
                                cambiar((seleccionada + 1) % images.length)
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-secondary/80 hover:bg-secondary text-black rounded-full w-9 h-9 flex items-center justify-center shadow-md opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                            aria-label="Siguiente"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        </button>
                    </>
                )}
            </div>

            {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((img, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => cambiar(i)}
                            aria-label={`Ver foto ${i + 1} de ${images.length}`}
                            aria-current={i === seleccionada}
                            className={`h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-all duration-300 md:h-20 md:w-20 ${
                                i === seleccionada
                                    ? "border-primary"
                                    : "border-transparent opacity-60 hover:opacity-100"
                            }`}
                        >
                            <img
                                src={cloudinaryUrl(img, {
                                    width: 160,
                                    height: 160,
                                })}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
