import { useState, useEffect } from "react";
import Card from "@/components/ui/Card.jsx";
import { CATEGORIAS, getEtiquetaCategoria } from "@/utils/categorias.js";
import {
    agruparTalles,
    formatearTalle,
    normalizarTalles,
} from "@/utils/talles.js";

/** El precio que ve el usuario en la card es el base con el recargo aplicado. */
function getPrecioMostrado(producto) {
    return Math.round(Number(producto.price ?? 0) * 1.25);
}

/** El techo del rango, para productos que valen distinto segun el talle. */
function getPrecioMaximo(producto) {
    return Math.round(Number(producto.priceMax ?? producto.price ?? 0) * 1.25);
}

function getTallesDisponibles(producto, mostrarTodosLosTalles = false) {
    return normalizarTalles(producto.specs?.talle)
        .filter((t) => mostrarTodosLosTalles || t.stock > 0)
        .map((t) => formatearTalle(t.nombre));
}

/**
 * Grilla de productos con panel de filtros. La usan la pagina de busqueda y la
 * de encargos; la diferencia es que solo la primera lee el ?q= de la URL.
 *
 * @param {{
 *   productos: object[],
 *   basePath?: string,
 *   mostrarTodosLosTalles?: boolean,
 *   conBusqueda?: boolean,
 *   titulo?: string,
 * }} props
 */
export default function CatalogoConFiltros({
    productos = [],
    basePath = "/productos",
    mostrarTodosLosTalles = false,
    conBusqueda = false,
    titulo = "Todos los productos",
}) {
    const [q, setQ] = useState("");
    const [marcasSeleccionadas, setMarcasSeleccionadas] = useState([]);
    const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState([]);
    const [tallesSeleccionados, setTallesSeleccionados] = useState([]);
    const [precioMin, setPrecioMin] = useState("");
    const [precioMax, setPrecioMax] = useState("");
    const [orden, setOrden] = useState("");
    const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

    function normalizeText(value) {
        return String(value ?? "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
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
        if (!conBusqueda) return;
        const params = new URLSearchParams(window.location.search);
        const query = params.get("q")?.trim() ?? "";
        setQ(query);

        if (query && typeof window.fbq === "function") {
            window.fbq("track", "Search", { search_string: query });
        }
    }, [conBusqueda]);

    const productosUnicos = dedupeProducts(productos);
    const query = normalizeText(q);

    const porBusqueda =
        query.length === 0
            ? productosUnicos
            : (() => {
                  const porMarca = productosUnicos.filter((p) =>
                      normalizeText(p.marca).includes(query)
                  );

                  if (porMarca.length > 0) {
                      return porMarca;
                  }

                  return productosUnicos.filter(
                      (p) =>
                          normalizeText(p.name).includes(query) ||
                          normalizeText(p.marca).includes(query) ||
                          normalizeText(p.category).includes(query)
                  );
              })();

    // Las opciones salen de lo que devolvio la busqueda, no del catalogo entero,
    // para no ofrecer filtros que dejarian la grilla vacia.
    const marcasDisponibles = [
        ...new Set(porBusqueda.map((p) => p.marca).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

    const categoriasDisponibles = CATEGORIAS.filter((categoria) =>
        porBusqueda.some((p) => p.category === categoria.value)
    );

    const gruposDeTalles = agruparTalles([
        ...new Set(
            porBusqueda.flatMap((p) =>
                getTallesDisponibles(p, mostrarTodosLosTalles)
            )
        ),
    ]);

    const min = precioMin === "" ? null : Number(precioMin);
    const max = precioMax === "" ? null : Number(precioMax);

    const resultados = porBusqueda
        .filter((p) => {
            if (
                marcasSeleccionadas.length > 0 &&
                !marcasSeleccionadas.includes(p.marca)
            ) {
                return false;
            }

            if (
                categoriasSeleccionadas.length > 0 &&
                !categoriasSeleccionadas.includes(p.category)
            ) {
                return false;
            }

            if (tallesSeleccionados.length > 0) {
                const talles = getTallesDisponibles(p, mostrarTodosLosTalles);
                if (!tallesSeleccionados.some((t) => talles.includes(t))) {
                    return false;
                }
            }

            // Un producto entra si alguno de sus talles cae en el rango, no
            // solo el mas barato.
            const desde = getPrecioMostrado(p);
            const hasta = getPrecioMaximo(p);
            if (min != null && Number.isFinite(min) && hasta < min)
                return false;
            if (max != null && Number.isFinite(max) && desde > max)
                return false;

            return true;
        })
        .sort((a, b) => {
            if (orden === "asc")
                return getPrecioMostrado(a) - getPrecioMostrado(b);
            if (orden === "desc")
                return getPrecioMostrado(b) - getPrecioMostrado(a);
            return 0;
        });

    const resultadoKeys = new Set(resultados.map(getDedupKey));

    const sugerencias = !conBusqueda
        ? []
        : productosUnicos
              .filter((p) => normalizeText(p.marca).includes(query))
              .filter((p) => !resultadoKeys.has(getDedupKey(p)))
              .sort(() => Math.random() - 0.5)
              .slice(0, 4)
              .concat(
                  productosUnicos
                      .filter((p) => !resultadoKeys.has(getDedupKey(p)))
                      .sort(() => Math.random() - 0.5)
              )
              .filter(
                  (p, index, arr) =>
                      arr.findIndex(
                          (item) => getDedupKey(item) === getDedupKey(p)
                      ) === index
              )
              .slice(0, 4);

    function toggleEnLista(valor, lista, setLista) {
        setLista(
            lista.includes(valor)
                ? lista.filter((item) => item !== valor)
                : [...lista, valor]
        );
    }

    function reiniciarFiltros() {
        setMarcasSeleccionadas([]);
        setCategoriasSeleccionadas([]);
        setTallesSeleccionados([]);
        setPrecioMin("");
        setPrecioMax("");
        setOrden("");
    }

    const chips = [
        ...marcasSeleccionadas.map((marca) => ({
            key: `marca-${marca}`,
            label: marca,
            quitar: () =>
                setMarcasSeleccionadas((prev) =>
                    prev.filter((item) => item !== marca)
                ),
        })),
        ...categoriasSeleccionadas.map((categoria) => ({
            key: `categoria-${categoria}`,
            label: getEtiquetaCategoria(categoria),
            quitar: () =>
                setCategoriasSeleccionadas((prev) =>
                    prev.filter((item) => item !== categoria)
                ),
        })),
        ...tallesSeleccionados.map((talle) => ({
            key: `talle-${talle}`,
            label: `Talle ${talle}`,
            quitar: () =>
                setTallesSeleccionados((prev) =>
                    prev.filter((item) => item !== talle)
                ),
        })),
    ];

    if (precioMin !== "" || precioMax !== "") {
        chips.push({
            key: "precio",
            label: `USD ${precioMin || "0"} - ${precioMax || "∞"}`,
            quitar: () => {
                setPrecioMin("");
                setPrecioMax("");
            },
        });
    }

    if (orden) {
        chips.push({
            key: "orden",
            label: orden === "asc" ? "Menor a mayor" : "Mayor a menor",
            quitar: () => setOrden(""),
        });
    }

    const tituloSeccion = "text-[11px] font-semibold uppercase text-black/50";
    const botonOpcion = (activo) =>
        `rounded-xl px-3 py-2 text-xs font-semibold uppercase transition-all duration-300 cursor-pointer ${
            activo
                ? "bg-primary text-secondary"
                : "ring-1 ring-black/15 text-black hover:ring-primary"
        }`;

    const panelFiltros = (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold uppercase text-black">
                    Filtros{" "}
                    {chips.length > 0 && (
                        <span className="text-primary">({chips.length})</span>
                    )}
                </p>
                {chips.length > 0 && (
                    <button
                        type="button"
                        onClick={reiniciarFiltros}
                        className="text-[11px] font-semibold uppercase text-black/50 hover:text-primary transition-colors cursor-pointer"
                    >
                        Reiniciar
                    </button>
                )}
            </div>

            {chips.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {chips.map((chip) => (
                        <button
                            key={chip.key}
                            type="button"
                            onClick={chip.quitar}
                            className="flex items-center gap-2 rounded-lg ring-1 ring-black/15 px-2.5 py-1.5 text-[11px] font-semibold uppercase text-black hover:ring-primary hover:text-primary transition-all duration-300 cursor-pointer"
                        >
                            {chip.label}
                            <span aria-hidden="true">✕</span>
                            <span className="sr-only">Quitar filtro</span>
                        </button>
                    ))}
                </div>
            )}

            {marcasDisponibles.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-black/10 pt-5">
                    <p className={tituloSeccion}>Marca</p>
                    {/* Lenis intercepta el wheel del documento: sin este atributo
                        la rueda no scrollea la lista sino la pagina entera. */}
                    <div
                        data-lenis-prevent
                        className="flex max-h-56 flex-col overflow-y-auto pr-1"
                    >
                        {marcasDisponibles.map((marca) => {
                            const activo = marcasSeleccionadas.includes(marca);
                            return (
                                <button
                                    key={marca}
                                    type="button"
                                    onClick={() =>
                                        toggleEnLista(
                                            marca,
                                            marcasSeleccionadas,
                                            setMarcasSeleccionadas
                                        )
                                    }
                                    className={`py-1.5 text-left text-sm transition-colors cursor-pointer ${
                                        activo
                                            ? "font-bold text-primary"
                                            : "text-black hover:text-primary"
                                    }`}
                                >
                                    {marca}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {categoriasDisponibles.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-black/10 pt-5">
                    <p className={tituloSeccion}>Subcategoría</p>
                    <div className="flex flex-wrap gap-2">
                        {categoriasDisponibles.map((categoria) => (
                            <button
                                key={categoria.value}
                                type="button"
                                onClick={() =>
                                    toggleEnLista(
                                        categoria.value,
                                        categoriasSeleccionadas,
                                        setCategoriasSeleccionadas
                                    )
                                }
                                className={botonOpcion(
                                    categoriasSeleccionadas.includes(
                                        categoria.value
                                    )
                                )}
                            >
                                {categoria.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {gruposDeTalles.length > 0 && (
                <div className="flex flex-col gap-5 border-t border-black/10 pt-5">
                    <p className={tituloSeccion}>Talles</p>
                    {gruposDeTalles.map((grupo) => (
                        <div key={grupo.value} className="flex flex-col gap-3">
                            <p className="text-xs font-semibold text-black">
                                {grupo.label}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {grupo.talles.map((talle) => (
                                    <button
                                        key={talle}
                                        type="button"
                                        onClick={() =>
                                            toggleEnLista(
                                                talle,
                                                tallesSeleccionados,
                                                setTallesSeleccionados
                                            )
                                        }
                                        className={`${botonOpcion(
                                            tallesSeleccionados.includes(talle)
                                        )} min-w-12 text-center`}
                                    >
                                        {talle}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex flex-col gap-3 border-t border-black/10 pt-5">
                <p className={tituloSeccion}>Precio (USD)</p>
                <div className="flex items-center gap-3">
                    <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={precioMin}
                        onChange={(event) => setPrecioMin(event.target.value)}
                        placeholder="Min"
                        aria-label="Precio mínimo"
                        className="w-full border-b border-black/20 pb-1 text-sm text-black outline-none transition-colors focus:border-primary"
                    />
                    <span className="text-black/40">—</span>
                    <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={precioMax}
                        onChange={(event) => setPrecioMax(event.target.value)}
                        placeholder="Max"
                        aria-label="Precio máximo"
                        className="w-full border-b border-black/20 pb-1 text-sm text-black outline-none transition-colors focus:border-primary"
                    />
                </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-black/10 pt-5">
                <p className={tituloSeccion}>Ordenar</p>
                <div className="flex flex-col gap-2">
                    {[
                        { value: "asc", label: "Menor a mayor" },
                        { value: "desc", label: "Mayor a menor" },
                    ].map((opcion) => (
                        <button
                            key={opcion.value}
                            type="button"
                            onClick={() =>
                                setOrden(
                                    orden === opcion.value ? "" : opcion.value
                                )
                            }
                            className={`${botonOpcion(
                                orden === opcion.value
                            )} text-left`}
                        >
                            {opcion.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-10 max-w-7xl mx-auto px-6 py-16">
            <div className="flex flex-col gap-2">
                <a
                    href="/"
                    className="flex items-center gap-1.5 text-sm text-black/70 hover:text-primary w-fit transition-colors"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11 17l-5-5m0 0l5-5m-5 5h12"
                        />
                    </svg>
                    Volver al inicio
                </a>

                <h1 className="text-3xl font-bold text-primary">
                    {q ? `Resultados para "${q}"` : titulo}
                </h1>
                <p className="text-black mt-1 text-sm">
                    {resultados.length}{" "}
                    {resultados.length === 1
                        ? "producto encontrado"
                        : "productos encontrados"}
                </p>
            </div>

            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
                <aside className="lg:w-60 lg:shrink-0">
                    <button
                        type="button"
                        onClick={() => setFiltrosAbiertos((prev) => !prev)}
                        aria-expanded={filtrosAbiertos}
                        className="flex w-full items-center justify-between rounded-xl ring-1 ring-black/15 px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] text-black transition-all duration-300 hover:ring-primary cursor-pointer lg:hidden"
                    >
                        Filtros{" "}
                        {chips.length > 0 && (
                            <span className="text-primary">
                                ({chips.length})
                            </span>
                        )}
                    </button>

                    <div
                        className={`${filtrosAbiertos ? "mt-4 flex" : "hidden"} lg:mt-0 lg:flex`}
                    >
                        {panelFiltros}
                    </div>
                </aside>

                <div className="flex flex-1 flex-col gap-10">
                    {resultados.length === 0 && (
                        <p className="text-black">
                            {q ? (
                                <>
                                    No se encontraron productos para "
                                    <span className="text-black font-semibold">
                                        {q}
                                    </span>
                                    ".
                                </>
                            ) : (
                                "Ningún producto coincide con los filtros elegidos."
                            )}
                        </p>
                    )}

                    {resultados.length > 0 && (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-16">
                            {resultados.map((p, i) => (
                                <Card
                                    key={getRenderKey(p)}
                                    producto={p}
                                    basePath={basePath}
                                    mostrarTodosLosTalles={
                                        mostrarTodosLosTalles
                                    }
                                    priority={i < 3}
                                />
                            ))}
                        </div>
                    )}

                    {q && resultados.length === 0 && sugerencias.length > 0 && (
                        <div className="flex flex-col gap-6">
                            <h2 className="text-2xl font-bold text-black">
                                Sugerencias
                            </h2>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-16">
                                {sugerencias.map((p) => (
                                    <Card
                                        key={getRenderKey(p)}
                                        producto={p}
                                        basePath={basePath}
                                        mostrarTodosLosTalles={
                                            mostrarTodosLosTalles
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
