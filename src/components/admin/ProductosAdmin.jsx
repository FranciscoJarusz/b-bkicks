import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase.js";
import { getEtiquetaCategoria } from "@/utils/categorias.js";
import { cloudinaryUrl, cloudinaryPublicId } from "@/utils/cloudinary.js";
import Encabezado from "@/components/admin/Encabezado.jsx";
import ProductoNuevo from "@/components/admin/ProductoNuevo.jsx";
import ProductoEditor from "@/components/admin/ProductoEditor.jsx";
import { resumenDePrecio, sortSizes } from "@/components/admin/lib/formato.js";
import { deleteFromCloudinary } from "@/components/admin/lib/imagenes.js";
import { BOTON, TARJETA } from "@/components/admin/lib/estilos.js";

// Mismas columnas en el encabezado y en cada fila. Por debajo de lg cada
// producto se arma como una tarjeta.
const COLUMNAS = "lg:grid-cols-[24px_minmax(0,1fr)_140px_120px_120px_190px]";

const CONSULTA = `
    id_producto,
    nombre,
    precio_base,
    imagen_url,
    es_encargo,
    categoria,
    marca (
      nombre
    ),
    producto_imagen (
      url,
      orden
    ),
    producto_talle (
      id_producto,
      id_talle,
      stock,
      precio,
      talle (
        nombre
      )
    )
`;

/** Catalogo y Encargos: alta de productos y listado con su edicion. */
export default function ProductosAdmin({ esEncargo, token }) {
    const [productos, setProductos] = useState([]);
    const [status, setStatus] = useState("Cargando productos...");
    const [cargando, setCargando] = useState(true);
    const [pendingKey, setPendingKey] = useState("");
    const [expandedProductId, setExpandedProductId] = useState(null);
    const [selectedProductIds, setSelectedProductIds] = useState([]);

    const productosVisibles = productos.filter(
        (producto) => Boolean(producto.es_encargo) === esEncargo
    );

    useEffect(() => {
        loadProductos();
    }, []);

    async function loadProductos() {
        setCargando(true);
        const { data, error } = await supabase
            .from("producto")
            .select(CONSULTA)
            .order("id_producto", { ascending: false });
        setCargando(false);

        if (error) {
            setStatus("No pudimos cargar los productos desde Supabase.");
            return;
        }

        const normalized = (data ?? []).map((producto) => ({
            ...producto,
            producto_talle: [...(producto.producto_talle ?? [])].sort(
                sortSizes
            ),
        }));

        setProductos(normalized);
        setStatus((actual) =>
            actual === "Cargando productos..." ? "" : actual
        );
    }

    function cambiarProducto(productoId, cambios) {
        setProductos((prev) =>
            prev.map((producto) =>
                producto.id_producto === productoId
                    ? { ...producto, ...cambios }
                    : producto
            )
        );
    }

    function updateVariante(productoId, talleId, field, value) {
        setProductos((prev) =>
            prev.map((producto) => {
                if (producto.id_producto !== productoId) return producto;
                return {
                    ...producto,
                    producto_talle: producto.producto_talle.map((variante) =>
                        variante.id_talle === talleId
                            ? { ...variante, [field]: value }
                            : variante
                    ),
                };
            })
        );
    }

    async function deleteProductRecord(producto) {
        try {
            const publicIds = [
                ...(producto.producto_imagen ?? []).map((item) =>
                    cloudinaryPublicId(item.url)
                ),
                cloudinaryPublicId(producto.imagen_url),
            ].filter(Boolean);

            const { error, data: deletedRows } = await supabase
                .from("producto")
                .delete()
                .select("id_producto")
                .eq("id_producto", producto.id_producto);

            if (error) throw error;
            if (!deletedRows || deletedRows.length === 0) {
                throw new Error(
                    "Supabase no confirmo el borrado del producto. Revisa la policy DELETE de producto."
                );
            }

            setProductos((prev) =>
                prev.filter((item) => item.id_producto !== producto.id_producto)
            );
            setSelectedProductIds((prev) =>
                prev.filter((id) => id !== producto.id_producto)
            );
            setExpandedProductId((actual) =>
                actual === producto.id_producto ? null : actual
            );

            let statusMessage = "Producto eliminado.";

            if (publicIds.length > 0) {
                const uniqueIds = [...new Set(publicIds)];
                try {
                    await deleteFromCloudinary(uniqueIds, token);
                } catch (cloudinaryError) {
                    console.error(
                        "Error al borrar imagenes en Cloudinary:",
                        cloudinaryError
                    );
                    statusMessage =
                        "Producto eliminado. Las imagenes en Cloudinary quedaron sin borrar.";
                }
            }

            return { ok: true, message: statusMessage };
        } catch (error) {
            console.error("Error al borrar producto:", error);
            return {
                ok: false,
                message:
                    `No pudimos borrar el producto. ${error?.message ?? ""}`.trim(),
            };
        }
    }

    async function handleDeleteProduct(producto) {
        const confirmed = window.confirm(
            `Vas a borrar "${producto.nombre}" completo. Esta accion no se puede deshacer.`
        );
        if (!confirmed) return;

        setPendingKey(`delete-product-${producto.id_producto}`);

        const result = await deleteProductRecord(producto);
        setStatus(result.message);
        setPendingKey("");

        if (result.ok) {
            await loadProductos();
        }
    }

    async function handleDeleteSelectedProducts() {
        const selectedProducts = productosVisibles.filter((producto) =>
            selectedProductIds.includes(producto.id_producto)
        );
        if (selectedProducts.length === 0) {
            setStatus("Selecciona al menos un producto para borrar.");
            return;
        }

        const confirmed = window.confirm(
            `Vas a borrar ${selectedProducts.length} producto(s). Esta accion no se puede deshacer.`
        );
        if (!confirmed) return;

        setPendingKey("delete-selected-products");

        let deletedCount = 0;
        let lastError = "";

        for (const producto of selectedProducts) {
            const result = await deleteProductRecord(producto);
            if (result.ok) {
                deletedCount += 1;
            } else {
                lastError = result.message;
                break;
            }
        }

        setPendingKey("");

        if (lastError) {
            setStatus(lastError);
            await loadProductos();
            return;
        }

        setStatus(
            deletedCount === 1
                ? "Se elimino 1 producto."
                : `Se eliminaron ${deletedCount} productos.`
        );
        await loadProductos();
    }

    function toggleProductSelection(productId) {
        setSelectedProductIds((prev) =>
            prev.includes(productId)
                ? prev.filter((id) => id !== productId)
                : [...prev, productId]
        );
    }

    function toggleSelectAllProducts() {
        setSelectedProductIds((prev) =>
            prev.length === productosVisibles.length
                ? []
                : productosVisibles.map((producto) => producto.id_producto)
        );
    }

    async function alCrear(mensaje) {
        setStatus(mensaje);
        await loadProductos();
    }

    const todosSeleccionados =
        productosVisibles.length > 0 &&
        selectedProductIds.length === productosVisibles.length;

    return (
        <div className="flex flex-col gap-6">
            <Encabezado
                antetitulo={esEncargo ? "Encargos" : "Catalogo"}
                titulo={
                    esEncargo ? "Productos para encargar" : "Productos en stock"
                }
                acciones={
                    <button
                        type="button"
                        disabled={cargando}
                        onClick={loadProductos}
                        className={BOTON.contorno}
                    >
                        {cargando ? "Actualizando..." : "Actualizar"}
                    </button>
                }
            >
                {esEncargo
                    ? "Se muestran en /encargos y se piden a medida, sin stock."
                    : "Lo que está en el catálogo de la tienda, con su stock por talle."}
            </Encabezado>

            {status && (
                <p
                    role="status"
                    className="rounded-xl bg-black/5 px-4 py-3 text-sm text-black/70"
                >
                    {status}
                </p>
            )}

            <ProductoNuevo
                esEncargo={esEncargo}
                token={token}
                avisar={setStatus}
                onCreado={alCrear}
            />

            <div className={`${TARJETA} overflow-hidden`}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-4 py-3 lg:px-5">
                    <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-black">
                        <input
                            type="checkbox"
                            checked={todosSeleccionados}
                            onChange={toggleSelectAllProducts}
                            className="h-4 w-4 cursor-pointer accent-primary"
                        />
                        <span>
                            {selectedProductIds.length > 0
                                ? `${selectedProductIds.length} seleccionado(s)`
                                : `${productosVisibles.length} producto(s)`}
                        </span>
                    </label>

                    {selectedProductIds.length > 0 && (
                        <button
                            type="button"
                            disabled={pendingKey === "delete-selected-products"}
                            onClick={handleDeleteSelectedProducts}
                            className={BOTON.peligro}
                        >
                            {pendingKey === "delete-selected-products"
                                ? "Borrando..."
                                : "Borrar seleccionados"}
                        </button>
                    )}
                </div>

                <div
                    className={`hidden items-center gap-4 bg-primary px-5 py-3 text-xs font-semibold uppercase text-secondary lg:grid ${COLUMNAS}`}
                >
                    <span></span>
                    <span>Producto</span>
                    <span>Categoria</span>
                    <span>Estado</span>
                    <span>{esEncargo ? "Talles" : "Stock"}</span>
                    <span></span>
                </div>

                {!cargando && productosVisibles.length === 0 && (
                    <p className="px-5 py-6 text-sm text-black/50">
                        {esEncargo
                            ? "No hay productos para encargar cargados todavia."
                            : "No hay productos del catalogo cargados todavia."}
                    </p>
                )}

                {productosVisibles.map((producto) => (
                    <FilaProducto
                        key={producto.id_producto}
                        producto={producto}
                        esEncargo={esEncargo}
                        seleccionado={selectedProductIds.includes(
                            producto.id_producto
                        )}
                        abierto={expandedProductId === producto.id_producto}
                        borrando={
                            pendingKey ===
                            `delete-product-${producto.id_producto}`
                        }
                        onSeleccionar={() =>
                            toggleProductSelection(producto.id_producto)
                        }
                        onAbrir={() =>
                            setExpandedProductId((actual) =>
                                actual === producto.id_producto
                                    ? null
                                    : producto.id_producto
                            )
                        }
                        onBorrar={() => handleDeleteProduct(producto)}
                    >
                        {(imagenes) => (
                            <ProductoEditor
                                producto={producto}
                                imagenes={imagenes}
                                esEncargo={esEncargo}
                                token={token}
                                avisar={setStatus}
                                recargar={loadProductos}
                                onCambiarVariante={(talleId, field, value) =>
                                    updateVariante(
                                        producto.id_producto,
                                        talleId,
                                        field,
                                        value
                                    )
                                }
                                onCambiarProducto={(cambios) =>
                                    cambiarProducto(
                                        producto.id_producto,
                                        cambios
                                    )
                                }
                            />
                        )}
                    </FilaProducto>
                ))}
            </div>
        </div>
    );
}

function Chip({ clase, children }) {
    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${clase}`}
        >
            {children}
        </span>
    );
}

function FilaProducto({
    producto,
    esEncargo,
    seleccionado,
    abierto,
    borrando,
    onSeleccionar,
    onAbrir,
    onBorrar,
    children,
}) {
    const imagenes = [...(producto.producto_imagen ?? [])]
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
        .map((item) => item.url);
    const image = imagenes[0] ?? producto.imagen_url;
    const talles = producto.producto_talle.length;
    const totalStock = producto.producto_talle.reduce(
        (sum, item) => sum + Number(item.stock ?? 0),
        0
    );

    return (
        <div className="border-t border-black/10 first:border-t-0">
            <div
                className={`grid grid-cols-[24px_minmax(0,1fr)] items-center gap-3 p-4 lg:gap-4 lg:px-5 ${COLUMNAS}`}
            >
                <input
                    type="checkbox"
                    checked={seleccionado}
                    onChange={onSeleccionar}
                    aria-label={`Seleccionar ${producto.nombre}`}
                    className="h-4 w-4 cursor-pointer justify-self-center accent-primary"
                />

                <div className="flex min-w-0 items-center gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-black/10 ring-1 ring-black/10">
                        {image ? (
                            <img
                                src={cloudinaryUrl(image, {
                                    width: 100,
                                    height: 100,
                                })}
                                alt={producto.nombre}
                                loading="lazy"
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-[11px] text-black/50">
                                Sin img
                            </div>
                        )}
                    </div>

                    <div className="min-w-0">
                        <p className="truncate text-[11px] uppercase tracking-[0.22em] text-black/50">
                            {producto.marca?.nombre ?? "Sin marca"}
                        </p>
                        <h3 className="truncate text-base font-bold text-black sm:text-lg">
                            {producto.nombre}
                        </h3>
                        <p className="text-sm font-semibold text-primary">
                            {resumenDePrecio(producto)}
                        </p>
                    </div>
                </div>

                {/* En el celular van juntos en una linea debajo del nombre; en
                    lg cada uno ocupa su columna. */}
                <div className="col-span-2 flex flex-wrap items-center gap-2 pl-9 lg:contents">
                    <div>
                        {producto.categoria ? (
                            <Chip clase="bg-black/5 text-black">
                                {getEtiquetaCategoria(producto.categoria)}
                            </Chip>
                        ) : (
                            <Chip clase="bg-amber-50 text-amber-700">
                                Sin categoria
                            </Chip>
                        )}
                    </div>

                    <div>
                        {esEncargo ? (
                            <Chip clase="bg-blue-50 text-blue-700">
                                A pedido
                            </Chip>
                        ) : totalStock > 0 ? (
                            <Chip clase="bg-emerald-50 text-emerald-700">
                                Disponible
                            </Chip>
                        ) : (
                            <Chip clase="bg-red-50 text-red-600">
                                Sin stock
                            </Chip>
                        )}
                    </div>

                    <p className="text-xs text-black/50 lg:flex lg:flex-col lg:text-sm">
                        {!esEncargo && (
                            <>
                                <span className="font-semibold text-black">
                                    {totalStock} u.
                                </span>
                                <span className="lg:hidden"> · </span>
                            </>
                        )}
                        <span className="lg:text-xs">
                            {talles} {talles === 1 ? "talle" : "talles"}
                        </span>
                    </p>
                </div>

                <div className="col-span-2 grid grid-cols-2 gap-2 lg:col-span-1 lg:flex lg:justify-end">
                    <button
                        type="button"
                        onClick={onAbrir}
                        aria-expanded={abierto}
                        className={BOTON.oscuro}
                    >
                        {abierto ? "Cerrar" : "Editar"}
                    </button>
                    <button
                        type="button"
                        disabled={borrando}
                        onClick={onBorrar}
                        className={BOTON.peligro}
                    >
                        {borrando ? "Borrando..." : "Borrar"}
                    </button>
                </div>
            </div>

            {abierto && children(imagenes)}
        </div>
    );
}
