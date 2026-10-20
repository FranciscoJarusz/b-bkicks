import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase.js";
import {
    MAXIMO_REELS,
    REELS_INICIALES,
    codigoDeReel,
    esListaDeReels,
    linkDeReel,
} from "@/reels";

export default function ReelsAdmin() {
    const [reels, setReels] = useState([]);
    const [link, setLink] = useState("");
    const [status, setStatus] = useState("Cargando reels...");
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        supabase
            .from("contenido")
            .select("valor")
            .eq("clave", "reels")
            .maybeSingle()
            .then(({ data, error }) => {
                if (error) {
                    setStatus(
                        "No pudimos cargar los reels. Revisa que exista la tabla contenido."
                    );
                    return;
                }
                setReels(
                    esListaDeReels(data?.valor) ? data.valor : REELS_INICIALES
                );
                setStatus("");
            });
    }, []);

    // Cada cambio se guarda en el momento: si falla, la lista vuelve a como
    // estaba para no mostrar algo distinto a lo que ve la tienda.
    async function guardar(nuevos, mensaje) {
        const anteriores = reels;
        setReels(nuevos);
        setGuardando(true);

        const { error } = await supabase.from("contenido").upsert({
            clave: "reels",
            valor: nuevos,
            actualizado: new Date().toISOString(),
        });

        setGuardando(false);

        if (error) {
            setReels(anteriores);
            setStatus(`No pudimos guardar los reels. ${error.message}`);
            return false;
        }

        setStatus(`${mensaje} En unos minutos se ve en la tienda.`);
        return true;
    }

    async function agregar(event) {
        event.preventDefault();
        const codigo = codigoDeReel(link);

        if (!codigo) {
            setStatus(
                "Ese link no parece de un reel. Copialo desde Instagram con Compartir > Copiar enlace."
            );
            return;
        }
        if (reels.includes(codigo)) {
            setStatus("Ese reel ya esta en la lista.");
            return;
        }
        if (reels.length >= MAXIMO_REELS) {
            setStatus(
                `Puede haber hasta ${MAXIMO_REELS} reels. Borra uno para agregar otro.`
            );
            return;
        }

        if (await guardar([...reels, codigo], "Reel agregado.")) setLink("");
    }

    function mover(indice, direccion) {
        const nuevos = [...reels];
        const destino = indice + direccion;
        [nuevos[indice], nuevos[destino]] = [nuevos[destino], nuevos[indice]];
        guardar(nuevos, "Orden actualizado.");
    }

    function borrar(codigo) {
        if (!window.confirm("Vas a sacar este reel de la tienda.")) return;
        guardar(
            reels.filter((item) => item !== codigo),
            "Reel eliminado."
        );
    }

    const botonFlecha =
        "h-10 w-10 rounded-xl ring ring-black/10 text-black transition-all duration-300 hover:ring-primary disabled:cursor-not-allowed disabled:text-black/20 disabled:hover:ring-black/10 cursor-pointer";

    return (
        <div className="flex flex-col gap-6">
            <div>
                <span className="text-xs uppercase tracking-[0.3em] text-black/50">
                    Reels de la home
                </span>
                <h2 className="mt-2 text-3xl font-semibold text-black">
                    Reels de Instagram
                </h2>
                <p className="mt-2 text-sm text-black/50">
                    Pega el link de un reel ya publicado. Se muestran en este
                    orden, hasta {MAXIMO_REELS}.
                </p>
            </div>

            <form
                onSubmit={agregar}
                className="grid gap-3 md:grid-cols-[1fr_180px]"
            >
                <input
                    value={link}
                    onChange={(event) => setLink(event.target.value)}
                    className="rounded-2xl ring ring-black/50 px-4 py-3 outline-none transition-all duration-300 focus:ring-primary"
                    placeholder="https://www.instagram.com/reel/..."
                    required
                />
                <button
                    type="submit"
                    disabled={guardando || reels.length >= MAXIMO_REELS}
                    className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-secondary transition-all duration-300 hover:bg-primary-accent disabled:cursor-not-allowed disabled:bg-black/50 cursor-pointer"
                >
                    {guardando ? "Guardando..." : "Agregar reel"}
                </button>
            </form>

            {status && <p className="text-sm text-black/50">{status}</p>}

            <ol className="overflow-hidden ring-1 ring-black/10">
                {reels.length === 0 && (
                    <li className="bg-secondary px-5 py-6 text-sm text-black/50">
                        No hay reels cargados. La seccion no se muestra en la
                        tienda.
                    </li>
                )}
                {reels.map((codigo, indice) => (
                    <li
                        key={codigo}
                        className="flex items-center gap-4 border-t border-black/10 bg-secondary px-4 py-3 first:border-t-0"
                    >
                        <span className="w-6 text-center font-accent text-2xl text-primary">
                            {indice + 1}
                        </span>
                        <a
                            href={linkDeReel(codigo)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-w-0 flex-1 truncate text-sm font-medium text-black underline-offset-4 hover:text-primary transition-all duration-300"
                        >
                            {linkDeReel(codigo)}
                        </a>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                aria-label="Subir"
                                title="Subir"
                                disabled={guardando || indice === 0}
                                onClick={() => mover(indice, -1)}
                                className={botonFlecha}
                            >
                                ↑
                            </button>
                            <button
                                type="button"
                                aria-label="Bajar"
                                title="Bajar"
                                disabled={
                                    guardando || indice === reels.length - 1
                                }
                                onClick={() => mover(indice, 1)}
                                className={botonFlecha}
                            >
                                ↓
                            </button>
                            <button
                                type="button"
                                disabled={guardando}
                                onClick={() => borrar(codigo)}
                                className="rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200 transition-all duration-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-red-50/50 disabled:text-red-300 cursor-pointer"
                            >
                                Borrar
                            </button>
                        </div>
                    </li>
                ))}
            </ol>
        </div>
    );
}
