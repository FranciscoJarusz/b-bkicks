import { useState, useRef, useEffect, useId } from "react";

/** @param {{ productos: object[] }} props */
export default function BuscadorHeader({ productos = [] }) {
    const inputId = useId();
    const [busqueda, setBusqueda] = useState("");
    const [abierto, setAbierto] = useState(false);
    const ref = useRef(null);

    function normalizeText(value) {
        return String(value ?? "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }

    function getDedupKey(producto) {
        return [
            normalizeText(producto.slug),
            normalizeText(producto.name),
            normalizeText(producto.marca),
            Number(producto.price ?? 0),
            normalizeText(producto.image),
        ].join("::");
    }

    function getRenderKey(producto) {
        return String(producto.id ?? getDedupKey(producto));
    }

    function dedupeProducts(lista) {
        const seen = new Set();

        return lista.filter((producto) => {
            const key = getDedupKey(producto);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const q = params.get("q")?.trim() ?? "";
        if (q) setBusqueda(q);
    }, []);

    const sugerencias = busqueda.trim().length < 1 ? [] : dedupeProducts(productos)
        .filter((p) => {
            const q = normalizeText(busqueda);
            return (
                normalizeText(p.name).includes(q) ||
                (Array.isArray(p.marca)
                    ? p.marca.some((m) => normalizeText(m).includes(q))
                    : normalizeText(p.marca).includes(q)) ||
                normalizeText(p.category).includes(q)
            );
        })
        .slice(0, 6);

    function handleInput(e) {
        const valor = e.target.value;
        setBusqueda(valor);
        setAbierto(true);
        window.dispatchEvent(new CustomEvent("buscar", { detail: valor }));
    }

    function buscar() {
        window.location.href = `/busqueda?q=${encodeURIComponent(busqueda.trim())}`;
    }

    function seleccionar(producto) {
        window.location.href = `/productos/${producto.slug}`;
    }

    function limpiar() {
        setBusqueda("");
        setAbierto(false);
        window.dispatchEvent(new CustomEvent("buscar", { detail: "" }));
    }

    useEffect(() => {
        function onClickFuera(e) {
            if (ref.current && !ref.current.contains(e.target)) {
                setAbierto(false);
            }
        }
        document.addEventListener("mousedown", onClickFuera);
        return () => document.removeEventListener("mousedown", onClickFuera);
    }, []);

    return (
        <div ref={ref} className="relative w-full">
            <div className="flex items-center gap-2 border border-secondary/10 focus-within:border-primary transition-all duration-300 rounded-xl px-3 py-1.5 w-full">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 text-secondary/40 hover:text-secondary transition-colors shrink-0 cursor-pointer"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    onClick={buscar}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                    type="text"
                    placeholder="Buscar..."
                    id={inputId}
                    name="busqueda"
                    value={busqueda}
                    onInput={handleInput}
                    onFocus={() => busqueda && setAbierto(true)}
                    onKeyDown={(e) => e.key === 'Enter' && buscar()}
                    className="bg-transparent text-secondary placeholder-secondary/40 text-sm focus:outline-none w-full"
                />
                {busqueda && (
                    <button
                        onClick={limpiar}
                        className="text-secondary/40 hover:text-secondary transition-all duration-300 shrink-0 cursor-pointer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {abierto && sugerencias.length > 0 && (
                <ul className="absolute top-full mt-2 left-0 w-full bg-secondary rounded-xl shadow-2xl overflow-hidden z-50">
                    {sugerencias.map((p) => (
                        <li key={getRenderKey(p)}>
                            <button
                                onClick={() => seleccionar(p)}
                                className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-black/30 transition-all duration-300 cursor-pointer text-left"
                            >
                                {p.image && (
                                    <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                )}
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-black truncate">{p.name}</p>
                                    <p className="text-xs font-semibold text-black/50 uppercase">{[p.category, p.marca].filter(Boolean).join(" ")}</p>
                                </div>
                                <span className="ml-auto text-sm font-bold text-primary shrink-0">${p.price.toLocaleString("es-AR")}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
