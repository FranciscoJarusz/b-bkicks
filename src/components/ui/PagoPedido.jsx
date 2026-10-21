import { useState } from "react";

// Las fotos de los celulares pesan varios MB: las achicamos antes de subirlas.
// Con 1600px un comprobante se sigue leyendo bien.
const LADO_MAXIMO = 1600;

/**
 * Comprime una foto a WebP. Devuelve el archivo original si no es una imagen
 * que el navegador pueda leer (un PDF, o un HEIC fuera de Safari) o si
 * comprimida no queda mas liviana.
 */
async function comprimir(archivo) {
    if (!archivo.type.startsWith("image/")) return archivo;

    try {
        const imagen = await createImageBitmap(archivo);
        const escala = Math.min(
            1,
            LADO_MAXIMO / Math.max(imagen.width, imagen.height)
        );
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(imagen.width * escala);
        canvas.height = Math.round(imagen.height * escala);
        canvas
            .getContext("2d")
            .drawImage(imagen, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise((ok) =>
            canvas.toBlob(ok, "image/webp", 0.8)
        );
        if (!blob || blob.size >= archivo.size) return archivo;

        return new File([blob], "comprobante.webp", { type: "image/webp" });
    } catch {
        return archivo;
    }
}

/** Los datos para pagar (con copiar) y la subida del comprobante. */
export default function PagoPedido({
    pedido,
    datos,
    aviso,
    comprobanteSubido,
}) {
    const [copiado, setCopiado] = useState("");
    const [subido, setSubido] = useState(comprobanteSubido);
    const [subiendo, setSubiendo] = useState(false);
    const [error, setError] = useState("");

    async function copiar(dato) {
        try {
            await navigator.clipboard.writeText(dato.valor);
            setCopiado(dato.label);
            setTimeout(() => setCopiado(""), 2000);
        } catch {
            // Sin permiso de portapapeles el dato igual se puede seleccionar.
        }
    }

    async function subir(evento) {
        const archivo = evento.target.files?.[0];
        evento.target.value = "";
        if (!archivo) return;

        setSubiendo(true);
        setError("");

        try {
            const form = new FormData();
            form.append("pedido", pedido);
            form.append("archivo", await comprimir(archivo));

            const res = await fetch("/api/comprobante", {
                method: "POST",
                body: form,
            });
            const cuerpo = await res.json().catch(() => null);
            if (!res.ok) throw new Error(cuerpo?.error);

            setSubido(true);
        } catch (e) {
            setError(
                e?.message || "No pudimos subir el comprobante. Probá de nuevo."
            );
        } finally {
            setSubiendo(false);
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <dl className="grid gap-2 sm:grid-cols-2">
                {datos.map((dato) => (
                    <div
                        key={dato.label}
                        className="flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 ring-1 ring-black/10"
                    >
                        <div className="min-w-0">
                            <dt className="text-[0.7rem] font-semibold uppercase text-black/45">
                                {dato.label}
                            </dt>
                            <dd className="break-all text-sm font-semibold text-black select-all">
                                {dato.valor}
                            </dd>
                        </div>

                        {dato.copiable && (
                            <button
                                type="button"
                                onClick={() => copiar(dato)}
                                className="shrink-0 cursor-pointer rounded-lg bg-black/5 px-3 py-1.5 text-xs font-semibold text-black transition-all duration-300 hover:bg-black/10"
                            >
                                {copiado === dato.label
                                    ? "¡Copiado!"
                                    : "Copiar"}
                            </button>
                        )}
                    </div>
                ))}
            </dl>

            {aviso && (
                <p className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-black">
                    {aviso}
                </p>
            )}

            <div className="flex flex-col gap-2">
                {subido ? (
                    <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-200">
                        <p className="font-semibold">
                            ¡Recibimos tu comprobante!
                        </p>
                        <p>
                            Apenas confirmemos el pago te escribimos para
                            coordinar la entrega.
                        </p>
                    </div>
                ) : (
                    <p className="text-sm text-black/60">
                        Cuando hagas el pago, subí el comprobante acá.
                    </p>
                )}

                {error && <p className="text-sm text-primary">{error}</p>}

                <label
                    className={`w-full cursor-pointer rounded-xl py-3 text-center transition-all duration-300 ${
                        subido
                            ? "text-sm font-semibold text-black/60 ring-1 ring-black/15 hover:text-black hover:ring-black/30"
                            : "bg-primary font-accent text-2xl uppercase text-secondary hover:bg-primary-accent"
                    } ${subiendo ? "pointer-events-none opacity-60" : ""}`}
                >
                    {subiendo
                        ? "Subiendo..."
                        : subido
                          ? "¿Te equivocaste? Subí otro"
                          : "Subir comprobante"}
                    <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={subir}
                        disabled={subiendo}
                        className="sr-only"
                    />
                </label>
            </div>
        </div>
    );
}
