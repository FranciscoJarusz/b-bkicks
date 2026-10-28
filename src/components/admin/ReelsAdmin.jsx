import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase.js";
import {
    MAXIMO_REELS,
    REELS_INICIALES,
    codigoDeReel,
    esListaDeReels,
    linkDeReel,
} from "@/reels";
import Encabezado from "@/components/admin/Encabezado.jsx";
import {
    BOTON,
    ETIQUETA,
    INPUT,
    TARJETA,
} from "@/components/admin/lib/estilos.js";

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

    const botonFlecha = `${BOTON.contorno} w-11 px-0`;

    return (
        <div className="flex flex-col gap-6">
            <Encabezado
                antetitulo="Reels de la home"
                titulo="Reels de Instagram"
            >
                Pega el link de un reel ya publicado. Se muestran en este orden,
                hasta {MAXIMO_REELS}.
            </Encabezado>

            <form
                onSubmit={agregar}
                className={`${TARJETA} grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-6`}
            >
                <label className="flex flex-col gap-1.5">
                    <span className={ETIQUETA}>
                        Link del reel ({reels.length}/{MAXIMO_REELS})
                    </span>
                    <input
                        value={link}
                        onChange={(event) => setLink(event.target.value)}
                        className={INPUT}
                        placeholder="https://www.instagram.com/reel/..."
                        required
                    />
                </label>
                <button
                    type="submit"
                    disabled={guardando || reels.length >= MAXIMO_REELS}
                    className={`${BOTON.primario} sm:px-6`}
                >
                    {guardando ? "Guardando..." : "Agregar reel"}
                </button>
            </form>

            {status && (
                <p
                    role="status"
                    className="rounded-xl bg-black/5 px-4 py-3 text-sm text-black/70"
                >
                    {status}
                </p>
            )}

            <ol className={`${TARJETA} overflow-hidden`}>
                {reels.length === 0 && (
                    <li className="px-5 py-6 text-sm text-black/50">
                        No hay reels cargados. La seccion no se muestra en la
                        tienda.
                    </li>
                )}
                {reels.map((codigo, indice) => (
                    <li
                        key={codigo}
                        className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-black/10 px-4 py-3 first:border-t-0"
                    >
                        <span className="w-6 text-center font-accent text-2xl text-primary">
                            {indice + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-black">
                                {codigo}
                            </p>
                            <a
                                href={linkDeReel(codigo)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="whitespace-nowrap text-xs text-black/50 underline-offset-4 transition-all duration-300 hover:text-primary hover:underline"
                            >
                                Ver en Instagram ↗
                            </a>
                        </div>
                        <div className="flex w-full gap-2 pl-10 sm:w-auto sm:pl-0">
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
                                className={`${BOTON.peligro} flex-1 sm:flex-none`}
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
