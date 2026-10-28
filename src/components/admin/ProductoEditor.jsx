import { useState } from "react";
import { supabase } from "@/lib/supabase.js";
import { CATEGORIAS } from "@/utils/categorias.js";
import { cloudinaryUrl } from "@/utils/cloudinary.js";
import SelectMenu from "@/components/ui/SelectMenu.jsx";
import { precioSugerido } from "@/components/admin/lib/formato.js";
import { uploadFiles } from "@/components/admin/lib/imagenes.js";
import {
    getOrCreateSize,
    appendProductImages,
} from "@/components/admin/lib/datos.js";
import {
    BOTON,
    ETIQUETA,
    INPUT,
    TARJETA,
} from "@/components/admin/lib/estilos.js";

const initialVariantForm = {
    talle: "",
    stock: "",
};

// Mismas columnas en el encabezado y en cada talle, para que queden alineados.
const COLUMNAS_TALLE = {
    stock: "sm:grid-cols-[72px_minmax(0,1fr)_minmax(0,1fr)_248px]",
    encargo: "sm:grid-cols-[72px_minmax(0,1fr)_248px]",
};

/**
 * Lo que se abre con "Editar": talles con su stock y precio, categoria e
 * imagenes. Cada cambio se guarda por separado y despues se recarga la lista.
 */
export default function ProductoEditor({
    producto,
    imagenes,
    esEncargo,
    token,
    avisar,
    recargar,
    onCambiarVariante,
    onCambiarProducto,
}) {
    const [pendingKey, setPendingKey] = useState("");
    const [newVariant, setNewVariant] = useState(initialVariantForm);
    const [archivos, setArchivos] = useState([]);
    const [archivosKey, setArchivosKey] = useState(0);

    const id = producto.id_producto;
    const columnas = esEncargo ? COLUMNAS_TALLE.encargo : COLUMNAS_TALLE.stock;

    async function saveVariante(talleId, stock, precio) {
        setPendingKey(`${talleId}`);

        const { error } = await supabase
            .from("producto_talle")
            .update({
                stock: Number(stock),
                precio: Number(precio),
            })
            .eq("id_producto", id)
            .eq("id_talle", talleId);

        setPendingKey("");

        if (error) {
            avisar("No pudimos guardar una de las variantes.");
            return;
        }

        avisar("Cambios guardados.");
        await recargar();
    }

    async function deleteVariante(talleId, stock) {
        if (Number(stock ?? 0) !== 0) {
            avisar("Solo puedes borrar talles con stock en 0.");
            return;
        }

        setPendingKey(`delete-${talleId}`);

        const { error } = await supabase
            .from("producto_talle")
            .delete()
            .eq("id_producto", id)
            .eq("id_talle", talleId);

        setPendingKey("");

        if (error) {
            avisar("No pudimos borrar ese talle.");
            return;
        }

        avisar("Talle eliminado.");
        await recargar();
    }

    async function saveCategoria(categoria) {
        setPendingKey("categoria");

        const { error } = await supabase
            .from("producto")
            .update({ categoria: categoria || null })
            .eq("id_producto", id);

        setPendingKey("");

        if (error) {
            avisar("No pudimos guardar la categoria.");
            return;
        }

        onCambiarProducto({ categoria: categoria || null });
        avisar("Categoria actualizada.");
    }

    async function handleAddVariant(event) {
        event.preventDefault();
        if (!newVariant.talle.trim()) {
            avisar("Escribi un talle antes de agregarlo.");
            return;
        }

        setPendingKey("new");

        try {
            const sizeId = await getOrCreateSize(newVariant.talle);
            const { error } = await supabase.from("producto_talle").insert({
                id_producto: id,
                id_talle: sizeId,
                stock: esEncargo ? 0 : Number(newVariant.stock || 0),
                precio: precioSugerido(producto),
            });

            if (error) throw error;

            setNewVariant(initialVariantForm);
            avisar("Talle agregado.");
            await recargar();
        } catch (error) {
            avisar(
                error.message?.includes("duplicate")
                    ? "Ese talle ya existe para el producto."
                    : "No pudimos agregar el talle."
            );
        } finally {
            setPendingKey("");
        }
    }

    async function handleAddImages() {
        if (archivos.length === 0) {
            avisar("Selecciona archivos antes de agregar imagenes.");
            return;
        }

        setPendingKey("images");

        try {
            const uploadedUrls = await uploadFiles(
                producto.nombre,
                archivos,
                token
            );
            await appendProductImages(producto, uploadedUrls);

            setArchivos([]);
            setArchivosKey((prev) => prev + 1);
            avisar("Imagenes agregadas.");
            await recargar();
        } catch (error) {
            console.error("Error al subir imagenes:", error);
            avisar(
                `No pudimos subir las imagenes del producto. ${error?.message ?? ""}`.trim()
            );
        } finally {
            setPendingKey("");
        }
    }

    return (
        <div className="grid gap-4 border-t border-black/10 bg-black/2 p-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-5">
            <Bloque titulo="Talles y precios">
                {producto.producto_talle.length === 0 ? (
                    <p className="text-sm text-black/50">
                        Todavía no tiene talles: sin talles no se puede comprar.
                    </p>
                ) : (
                    <>
                        <div
                            className={`hidden gap-3 px-3 ${ETIQUETA} sm:grid ${columnas}`}
                        >
                            <span>Talle</span>
                            {!esEncargo && <span>Stock</span>}
                            <span>Precio (USD)</span>
                        </div>
                        <ul className="flex flex-col gap-2">
                            {producto.producto_talle.map((variante) => (
                                <FilaTalle
                                    key={variante.id_talle}
                                    variante={variante}
                                    producto={producto}
                                    esEncargo={esEncargo}
                                    columnas={columnas}
                                    pendingKey={pendingKey}
                                    onCambiar={(field, value) =>
                                        onCambiarVariante(
                                            variante.id_talle,
                                            field,
                                            value
                                        )
                                    }
                                    onGuardar={saveVariante}
                                    onBorrar={deleteVariante}
                                />
                            ))}
                        </ul>
                    </>
                )}

                <form
                    onSubmit={handleAddVariant}
                    className={`grid gap-3 border-t border-black/10 pt-4 ${esEncargo ? "sm:grid-cols-[minmax(0,1fr)_auto]" : "sm:grid-cols-[minmax(0,1fr)_120px_auto]"} sm:items-end`}
                >
                    <label className="flex flex-col gap-1.5">
                        <span className={ETIQUETA}>Agregar talle</span>
                        <input
                            value={newVariant.talle}
                            onChange={(event) =>
                                setNewVariant((prev) => ({
                                    ...prev,
                                    talle: event.target.value,
                                }))
                            }
                            className={INPUT}
                            placeholder="Ej: 10 US"
                        />
                    </label>
                    {!esEncargo && (
                        <label className="flex flex-col gap-1.5">
                            <span className={ETIQUETA}>Stock</span>
                            <input
                                type="number"
                                min="0"
                                value={newVariant.stock}
                                onChange={(event) =>
                                    setNewVariant((prev) => ({
                                        ...prev,
                                        stock: event.target.value,
                                    }))
                                }
                                className={INPUT}
                                placeholder="0"
                            />
                        </label>
                    )}
                    <button
                        type="submit"
                        disabled={pendingKey === "new"}
                        className={BOTON.primario}
                    >
                        {pendingKey === "new" ? "Agregando..." : "Agregar"}
                    </button>
                </form>
            </Bloque>

            <div className="flex flex-col gap-4">
                <Bloque titulo="Categoría">
                    <SelectMenu
                        value={producto.categoria ?? ""}
                        options={CATEGORIAS}
                        disabled={pendingKey === "categoria"}
                        onChange={saveCategoria}
                        placeholder="Sin categoria"
                        ariaLabel="Categoria del producto"
                    />
                </Bloque>

                <Bloque titulo={`Imágenes (${imagenes.length})`}>
                    {imagenes.length > 0 && (
                        <ul className="flex flex-wrap gap-2">
                            {imagenes.map((url) => (
                                <li
                                    key={url}
                                    className="size-16 overflow-hidden rounded-xl bg-black/10 ring-1 ring-black/10"
                                >
                                    <img
                                        src={cloudinaryUrl(url, {
                                            width: 128,
                                            height: 128,
                                        })}
                                        alt=""
                                        loading="lazy"
                                        className="h-full w-full object-cover"
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-1">
                        <label
                            className={`${BOTON.contorno} min-w-0 font-medium`}
                        >
                            <input
                                key={archivosKey}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(event) =>
                                    setArchivos(
                                        Array.from(event.target.files ?? [])
                                    )
                                }
                                className="sr-only"
                            />
                            <span className="truncate">
                                {archivos.length > 0
                                    ? `${archivos.length} archivo(s) seleccionados`
                                    : "Elegir archivos"}
                            </span>
                        </label>
                        <button
                            type="button"
                            disabled={pendingKey === "images"}
                            onClick={handleAddImages}
                            className={BOTON.primario}
                        >
                            {pendingKey === "images"
                                ? "Subiendo..."
                                : "Agregar imágenes"}
                        </button>
                    </div>
                </Bloque>
            </div>
        </div>
    );
}

function Bloque({ titulo, children }) {
    return (
        <section className={`${TARJETA} flex flex-col gap-3 p-4`}>
            <h4 className="text-sm font-semibold text-black">{titulo}</h4>
            {children}
        </section>
    );
}

/**
 * En el celular cada talle es una tarjetita con sus etiquetas; desde sm es una
 * fila alineada con el encabezado de columnas.
 */
function FilaTalle({
    variante,
    producto,
    esEncargo,
    columnas,
    pendingKey,
    onCambiar,
    onGuardar,
    onBorrar,
}) {
    const talleId = variante.id_talle;
    const stock = Number(variante.stock ?? 0);
    const precio = variante.precio ?? producto.precio_base ?? 0;
    const guardando = pendingKey === `${talleId}`;
    const borrando = pendingKey === `delete-${talleId}`;

    return (
        <li
            className={`grid grid-cols-2 gap-3 rounded-xl bg-secondary p-3 ring-1 ring-black/10 sm:items-center ${columnas}`}
        >
            <p className="col-span-2 font-semibold text-black sm:col-span-1">
                {variante.talle?.nombre ?? "Sin talle"}
            </p>
            {!esEncargo && (
                <label className="flex flex-col gap-1.5">
                    <span className={`${ETIQUETA} sm:sr-only`}>Stock</span>
                    <input
                        type="number"
                        min="0"
                        value={variante.stock ?? 0}
                        onChange={(event) =>
                            onCambiar("stock", event.target.value)
                        }
                        className={INPUT}
                    />
                </label>
            )}
            <label
                className={`flex flex-col gap-1.5 ${esEncargo ? "col-span-2 sm:col-span-1" : ""}`}
            >
                <span className={`${ETIQUETA} sm:sr-only`}>Precio (USD)</span>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={precio}
                    onChange={(event) =>
                        onCambiar("precio", event.target.value)
                    }
                    className={INPUT}
                />
            </label>
            <div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-1">
                <button
                    type="button"
                    disabled={guardando}
                    onClick={() => onGuardar(talleId, variante.stock, precio)}
                    className={BOTON.oscuro}
                >
                    {guardando ? "Guardando..." : "Guardar"}
                </button>
                <button
                    type="button"
                    disabled={stock !== 0 || borrando}
                    onClick={() => onBorrar(talleId, variante.stock)}
                    className={BOTON.peligro}
                    title={
                        stock === 0
                            ? "Eliminar talle"
                            : "Pon el stock en 0 para borrarlo"
                    }
                >
                    {borrando ? "Borrando..." : "Borrar"}
                </button>
            </div>
        </li>
    );
}
