import { useState } from "react";

export default function GaleriaImagenes({ images, alt }) {
    const [seleccionada, setSeleccionada] = useState(0);

    function cambiar(nuevo) {
        setSeleccionada(nuevo);
    }

    if (!images || images.length === 0) {
        return <span className="text-gray text-sm">Sin imagen</span>;
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="rounded-2xl overflow-hidden aspect-square w-full relative group">
                {images.map((img, i) => (
                    <img
                        key={i}
                        src={img}
                        alt={alt}
                        className={`absolute inset-0 object-cover h-full w-full transition-opacity duration-500 ${i === seleccionada ? "opacity-100" : "opacity-0"}`}
                        fetchPriority="high"
                    />
                ))}

                {images.length > 1 && (
                    <>
                        <button
                            onClick={() => cambiar((seleccionada - 1 + images.length) % images.length)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black rounded-full w-9 h-9 flex items-center justify-center shadow-md opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                            aria-label="Anterior"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <button
                            onClick={() => cambiar((seleccionada + 1) % images.length)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black rounded-full w-9 h-9 flex items-center justify-center shadow-md opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                            aria-label="Siguiente"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
