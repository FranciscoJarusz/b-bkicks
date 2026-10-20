import { useEffect, useState, useTransition } from "react";
import { supabase } from "@/lib/supabase.js";
import { CATEGORIAS, getEtiquetaCategoria } from "@/utils/categorias.js";
import { cloudinaryUrl, cloudinaryPublicId } from "@/utils/cloudinary.js";
import SelectMenu from "@/components/ui/SelectMenu.jsx";
import LoginAdmin from "@/components/admin/LoginAdmin.jsx";
import ReelsAdmin from "@/components/admin/ReelsAdmin.jsx";
import {
    resumenDePrecio,
    precioSugerido,
    sortSizes,
} from "@/components/admin/lib/formato.js";
import {
    deleteFromCloudinary,
    uploadFiles,
} from "@/components/admin/lib/imagenes.js";
import {
    getOrCreateBrand,
    getOrCreateSize,
    replaceProductImages,
    appendProductImages,
} from "@/components/admin/lib/datos.js";

const ADMIN_EMAIL =
    import.meta.env.PUBLIC_ADMIN_EMAIL?.trim().toLowerCase() ?? "";

const initialProductForm = {
    nombre: "",
    marca: "",
    categoria: "",
    precioBase: "",
    talle: "",
    stock: "",
};

const initialVariantForm = {
    talle: "",
    stock: "",
};

export default function AdminPanel() {
    const [session, setSession] = useState(null);
    const [status, setStatus] = useState("Cargando panel...");
    const [productos, setProductos] = useState([]);
    const [pendingKey, setPendingKey] = useState("");
    const [newVariantForms, setNewVariantForms] = useState({});
    const [productForm, setProductForm] = useState(initialProductForm);
    const [productFiles, setProductFiles] = useState([]);
    const [productFilesKey, setProductFilesKey] = useState(0);
    const [productImageFiles, setProductImageFiles] = useState({});
    const [productImageKeys, setProductImageKeys] = useState({});
    const [expandedProductId, setExpandedProductId] = useState(null);
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [tab, setTab] = useState("catalogo");
    const [isPending, startTransition] = useTransition();

    const esTabEncargos = tab === "encargos";
    const productosVisibles = productos.filter(
        (producto) => Boolean(producto.es_encargo) === esTabEncargos
    );

    function cambiarTab(nextTab) {
        if (nextTab === tab) return;
        setTab(nextTab);
        setSelectedProductIds([]);
        setExpandedProductId(null);
    }

    useEffect(() => {
        let alive = true;

        supabase.auth.getSession().then(({ data, error }) => {
            if (!alive) return;
            if (error) {
                setStatus("No pudimos recuperar la sesion.");
                return;
            }
            setSession(data.session ?? null);
            if (!data.session) {
                setStatus("Ingresa con tu cuenta para administrar el stock.");
            }
        });

        const { data: authListener } = supabase.auth.onAuthStateChange(
            (_event, nextSession) => {
                if (!alive) return;
                setSession(nextSession);
                if (!nextSession) {
                    setProductos([]);
                    setStatus(
                        "Ingresa con tu cuenta para administrar el stock."
                    );
                }
            }
        );

        return () => {
            alive = false;
            authListener.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!session) return;
        if (!ADMIN_EMAIL || session.user.email?.toLowerCase() !== ADMIN_EMAIL) {
            setStatus("Esta cuenta no esta habilitada para el panel.");
            setProductos([]);
            return;
        }

        loadProductos();
    }, [session]);

    async function loadProductos() {
        setStatus("Cargando productos...");
        const { data, error } = await supabase
            .from("producto")
            .select(
                `
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
      `
            )
            .order("id_producto", { ascending: false });

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
        setStatus(
            normalized.length > 0 ? "" : "No hay productos cargados todavia."
        );
    }

    async function handleLogout() {
        await supabase.auth.signOut();
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

    async function saveVariante(productoId, talleId, stock, precio) {
        const key = `${productoId}-${talleId}`;
        setPendingKey(key);

        const { error } = await supabase
            .from("producto_talle")
            .update({
                stock: Number(stock),
                precio: Number(precio),
            })
            .eq("id_producto", productoId)
            .eq("id_talle", talleId);

        setPendingKey("");

        if (error) {
            setStatus("No pudimos guardar una de las variantes.");
            return;
        }

        setStatus("Cambios guardados.");
        await loadProductos();
    }

    async function saveCategoria(productoId, categoria) {
        const key = `categoria-${productoId}`;
        setPendingKey(key);

        const { error } = await supabase
            .from("producto")
            .update({ categoria: categoria || null })
            .eq("id_producto", productoId);

        setPendingKey("");

        if (error) {
            setStatus("No pudimos guardar la categoria.");
            return;
        }

        setProductos((prev) =>
            prev.map((producto) =>
                producto.id_producto === productoId
                    ? { ...producto, categoria: categoria || null }
                    : producto
            )
        );
        setStatus("Categoria actualizada.");
    }

    async function deleteVariante(productoId, talleId, stock) {
        if (Number(stock ?? 0) !== 0) {
            setStatus("Solo puedes borrar talles con stock en 0.");
            return;
        }

        const key = `delete-${productoId}-${talleId}`;
        setPendingKey(key);

        const { error } = await supabase
            .from("producto_talle")
            .delete()
            .eq("id_producto", productoId)
            .eq("id_talle", talleId);

        setPendingKey("");

        if (error) {
            setStatus("No pudimos borrar ese talle.");
            return;
        }

        setStatus("Talle eliminado.");
        await loadProductos();
    }

    function updateNewVariantForm(productId, field, value) {
        setNewVariantForms((prev) => ({
            ...prev,
            [productId]: {
                ...(prev[productId] ?? initialVariantForm),
                [field]: value,
            },
        }));
    }

    async function handleAddVariant(producto) {
        const form =
            newVariantForms[producto.id_producto] ?? initialVariantForm;
        if (!form.talle.trim()) {
            setStatus("Escribi un talle antes de agregarlo.");
            return;
        }

        const key = `new-${producto.id_producto}`;
        setPendingKey(key);

        try {
            const sizeId = await getOrCreateSize(form.talle);
            const { error } = await supabase.from("producto_talle").insert({
                id_producto: producto.id_producto,
                id_talle: sizeId,
                stock: producto.es_encargo ? 0 : Number(form.stock || 0),
                precio: precioSugerido(producto),
            });

            if (error) throw error;

            setNewVariantForms((prev) => ({
                ...prev,
                [producto.id_producto]: { ...initialVariantForm },
            }));
            setStatus("Talle agregado.");
            await loadProductos();
        } catch (error) {
            setStatus(
                error.message?.includes("duplicate")
                    ? "Ese talle ya existe para el producto."
                    : "No pudimos agregar el talle."
            );
        } finally {
            setPendingKey("");
        }
    }

    // Best effort: si tambien falla la limpieza, el error original es el que
    // importa mostrar; lo que quede se puede borrar a mano desde el panel.
    async function deshacerAltaIncompleta(productId, imageUrls) {
        if (productId) {
            const { error } = await supabase
                .from("producto")
                .delete()
                .eq("id_producto", productId);
            if (error) console.error("No pudimos deshacer el producto:", error);
        }

        const publicIds = imageUrls.map(cloudinaryPublicId).filter(Boolean);
        if (publicIds.length > 0) {
            await deleteFromCloudinary(publicIds, session?.access_token).catch(
                (error) =>
                    console.error("No pudimos borrar las imagenes:", error)
            );
        }
    }

    async function handleCreateProduct(event) {
        event.preventDefault();

        if (!productForm.nombre.trim() || !productForm.marca.trim()) {
            setStatus("Completa nombre y marca para crear el producto.");
            return;
        }

        setPendingKey("new-product");

        // Lo que ya quedo creado, para deshacerlo si un paso posterior falla:
        // sin esto quedaba un producto sin talles o imagenes huerfanas.
        let uploadedUrls = [];
        let createdProductId = null;

        try {
            // Subimos las imagenes primero: si Cloudinary falla, no queda un producto
            // a medio crear (sin imagen ni talles) en la base.
            uploadedUrls = await uploadFiles(
                productForm.nombre,
                productFiles,
                session?.access_token
            );

            const brandId = await getOrCreateBrand(productForm.marca);
            const { data: product, error: productError } = await supabase
                .from("producto")
                .insert({
                    nombre: productForm.nombre.trim(),
                    precio_base: Number(productForm.precioBase || 0),
                    categoria: productForm.categoria || null,
                    imagen_url: null,
                    id_marca: brandId,
                    es_encargo: esTabEncargos,
                })
                .select("id_producto")
                .single();

            if (productError) throw productError;
            createdProductId = product.id_producto;

            await replaceProductImages(product.id_producto, uploadedUrls);

            if (productForm.talle.trim()) {
                const sizeId = await getOrCreateSize(productForm.talle);
                const { error: variantError } = await supabase
                    .from("producto_talle")
                    .insert({
                        id_producto: product.id_producto,
                        id_talle: sizeId,
                        stock: esTabEncargos
                            ? 0
                            : Number(productForm.stock || 0),
                        precio: Number(productForm.precioBase || 0),
                    });

                if (variantError) throw variantError;
            }

            setProductForm(initialProductForm);
            setProductFiles([]);
            setProductFilesKey((prev) => prev + 1);
            setStatus("Producto creado.");
            await loadProductos();
        } catch (error) {
            console.error("Error al crear producto:", error);
            await deshacerAltaIncompleta(createdProductId, uploadedUrls);
            setStatus(
                error?.message?.includes("storage")
                    ? `No pudimos subir las imagenes al bucket. ${error.message}`
                    : `No pudimos crear el producto. ${error?.message ?? "Revisa las policies y el bucket de Storage."}`
            );
        } finally {
            setPendingKey("");
        }
    }

    async function handleAddImages(producto) {
        const files = productImageFiles[producto.id_producto] ?? [];

        if (files.length === 0) {
            setStatus("Selecciona archivos antes de agregar imagenes.");
            return;
        }

        const key = `images-${producto.id_producto}`;
        setPendingKey(key);

        try {
            const uploadedUrls = await uploadFiles(
                producto.nombre,
                files,
                session?.access_token
            );
            await appendProductImages(producto, uploadedUrls);

            setProductImageFiles((prev) => ({
                ...prev,
                [producto.id_producto]: [],
            }));
            setProductImageKeys((prev) => ({
                ...prev,
                [producto.id_producto]: (prev[producto.id_producto] ?? 0) + 1,
            }));
            setStatus("Imagenes agregadas.");
            await loadProductos();
        } catch (error) {
            console.error("Error al subir imagenes:", error);
            setStatus(
                `No pudimos subir las imagenes del producto. ${error?.message ?? ""}`.trim()
            );
        } finally {
            setPendingKey("");
        }
    }

    async function deleteProductRecord(producto, key) {
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

            if (expandedProductId === producto.id_producto) {
                setExpandedProductId(null);
            }

            let statusMessage = "Producto eliminado.";

            if (publicIds.length > 0) {
                const uniqueIds = [...new Set(publicIds)];
                try {
                    await deleteFromCloudinary(
                        uniqueIds,
                        session?.access_token
                    );
                } catch (cloudinaryError) {
                    console.error(
                        "Error al borrar imagenes en Cloudinary:",
                        cloudinaryError
                    );
                    statusMessage =
                        "Producto eliminado. Las imagenes en Cloudinary quedaron sin borrar.";
                }
            }

            setStatus(statusMessage);
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

        const key = `delete-product-${producto.id_producto}`;
        setPendingKey(key);

        const result = await deleteProductRecord(producto, key);
        setStatus(result.message);
        setPendingKey("");

        if (result.ok) {
            await loadProductos();
        }
    }

    async function handleDeleteSelectedProducts() {
        const selectedProducts = productos.filter((producto) =>
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
            const result = await deleteProductRecord(
                producto,
                "delete-selected-products"
            );
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

    // Sin PUBLIC_ADMIN_EMAIL no habilitamos a nadie, igual que la API.
    const isAuthorized =
        session &&
        Boolean(ADMIN_EMAIL) &&
        session.user.email?.toLowerCase() === ADMIN_EMAIL;

    if (!session || !isAuthorized) {
        return <LoginAdmin status={status} setStatus={setStatus} />;
    }

    return (
        <section className="min-h-screen px-4 py-6 text-black md:px-6">
            <div className="flex flex-col gap-20 mx-auto max-w-7xl">
                <div className="rounded-4xl py-10">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <span className="text-xs uppercase tracking-[0.3em] text-black/50">
                                Panel Admin
                            </span>
                            <h2 className="mt-2 font-accent text-5xl uppercase text-primary">
                                Stock, talles, productos e imagenes
                            </h2>
                            <p className="mt-2 text-sm text-black">
                                Sesion activa: {session.user.email}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => startTransition(loadProductos)}
                                className="rounded-2xl ring ring-black/50 px-4 py-3 text-sm font-medium text-black transition-all duration-300 hover:ring-primary cursor-pointer"
                            >
                                {isPending ? "Actualizando..." : "Actualizar"}
                            </button>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="rounded-2xl bg-black px-4 py-3 text-sm font-medium text-secondary transition-all duration-300 hover:bg-primary cursor-pointer"
                            >
                                Cerrar sesion
                            </button>
                        </div>
                    </div>

                    {status && (
                        <p className="mt-4 text-sm text-black/50">{status}</p>
                    )}

                    <div className="mt-8 flex gap-2">
                        {[
                            { id: "catalogo", label: "Catalogo" },
                            { id: "encargos", label: "Encargos" },
                            { id: "reels", label: "Reels" },
                        ].map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => cambiarTab(item.id)}
                                className={`rounded-2xl px-5 py-3 text-sm font-semibold transition-all duration-300 cursor-pointer ${
                                    tab === item.id
                                        ? "bg-primary text-secondary"
                                        : "ring ring-black/20 text-black hover:ring-primary"
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                {tab === "reels" ? (
                    <ReelsAdmin />
                ) : (
                    <>
                        <form onSubmit={handleCreateProduct}>
                            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                                <div>
                                    <span className="text-xs uppercase tracking-[0.3em] text-black/50">
                                        {esTabEncargos
                                            ? "Nuevo encargo"
                                            : "Nuevo producto"}
                                    </span>
                                    <h2 className="mt-2 text-3xl font-semibold text-black">
                                        {esTabEncargos
                                            ? "Cargar nuevo producto para encargar"
                                            : "Cargar nuevo producto"}
                                    </h2>
                                </div>
                                <button
                                    type="submit"
                                    disabled={pendingKey === "new-product"}
                                    className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-secondary transition-all duration-300 hover:bg-primary-accent disabled:cursor-not-allowed disabled:bg-black/50 cursor-pointer"
                                >
                                    {pendingKey === "new-product"
                                        ? "Creando..."
                                        : "Crear producto"}
                                </button>
                            </div>

                            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <input
                                    value={productForm.nombre}
                                    onChange={(event) =>
                                        setProductForm((prev) => ({
                                            ...prev,
                                            nombre: event.target.value,
                                        }))
                                    }
                                    className="rounded-2xl ring ring-black/50 px-4 py-3 outline-none transition-all duration-300 focus:ring-primary"
                                    placeholder="Nombre"
                                    required
                                />
                                <input
                                    value={productForm.marca}
                                    onChange={(event) =>
                                        setProductForm((prev) => ({
                                            ...prev,
                                            marca: event.target.value,
                                        }))
                                    }
                                    className="rounded-2xl ring ring-black/50 px-4 py-3 outline-none transition-all duration-300 focus:ring-primary"
                                    placeholder="Marca"
                                    required
                                />
                                <SelectMenu
                                    value={productForm.categoria}
                                    options={CATEGORIAS}
                                    onChange={(categoria) =>
                                        setProductForm((prev) => ({
                                            ...prev,
                                            categoria,
                                        }))
                                    }
                                    placeholder="Categoria (opcional)"
                                    ariaLabel="Categoria del producto"
                                    size="lg"
                                />
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={productForm.precioBase}
                                    onChange={(event) =>
                                        setProductForm((prev) => ({
                                            ...prev,
                                            precioBase: event.target.value,
                                        }))
                                    }
                                    className="rounded-2xl ring ring-black/50 px-4 py-3 outline-none transition-all duration-300 focus:ring-primary"
                                    placeholder="Precio base"
                                    required
                                />
                                <input
                                    value={productForm.talle}
                                    onChange={(event) =>
                                        setProductForm((prev) => ({
                                            ...prev,
                                            talle: event.target.value,
                                        }))
                                    }
                                    className="rounded-2xl ring ring-black/50 px-4 py-3 outline-none transition-all duration-300 focus:ring-primary"
                                    placeholder="Primer talle opcional"
                                />
                                {!esTabEncargos && (
                                    <input
                                        type="number"
                                        min="0"
                                        value={productForm.stock}
                                        onChange={(event) =>
                                            setProductForm((prev) => ({
                                                ...prev,
                                                stock: event.target.value,
                                            }))
                                        }
                                        className="rounded-2xl ring ring-black/50 px-4 py-3 outline-none transition-all duration-300 focus:ring-primary"
                                        placeholder="Stock inicial"
                                    />
                                )}
                                <label className="flex min-h-28 flex-col justify-center rounded-2xl ring ring-black/50 px-4 py-3 text-sm text-black cursor-pointer">
                                    <span className="text-black/50">
                                        Subir imagenes del producto
                                    </span>
                                    <input
                                        key={productFilesKey}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={(event) =>
                                            setProductFiles(
                                                Array.from(
                                                    event.target.files ?? []
                                                )
                                            )
                                        }
                                        className="sr-only"
                                    />
                                    <span className="mt-3 font-semibold text-black">
                                        {productFiles.length > 0
                                            ? `${productFiles.length} archivo(s) seleccionados`
                                            : "Elegir archivos"}
                                    </span>
                                    <span className="mt-2 text-xs text-black/50">
                                        {productFiles.length > 0
                                            ? "Listos para subir"
                                            : "Todavia no seleccionaste archivos"}
                                    </span>
                                </label>
                            </div>
                        </form>

                        <div className="mt-6 overflow-hidden ring-1 ring-black/10">
                            <div className="flex items-center justify-between gap-4 border-b border-black/10 bg-secondary px-4 py-3">
                                <label className="flex items-center gap-3 text-sm font-medium text-black">
                                    <input
                                        type="checkbox"
                                        checked={
                                            productosVisibles.length > 0 &&
                                            selectedProductIds.length ===
                                                productosVisibles.length
                                        }
                                        onChange={toggleSelectAllProducts}
                                        className="h-4 w-4 accent-primary cursor-pointer"
                                    />
                                    <span>
                                        {selectedProductIds.length > 0
                                            ? `${selectedProductIds.length} seleccionado(s)`
                                            : "Seleccionar productos"}
                                    </span>
                                </label>

                                <button
                                    type="button"
                                    disabled={
                                        selectedProductIds.length === 0 ||
                                        pendingKey ===
                                            "delete-selected-products"
                                    }
                                    onClick={handleDeleteSelectedProducts}
                                    className="rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200 transition-all duration-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-red-50/50 disabled:text-red-300 cursor-pointer"
                                >
                                    {pendingKey === "delete-selected-products"
                                        ? "Borrando..."
                                        : "Borrar seleccionados"}
                                </button>
                            </div>

                            <div className="hidden grid-cols-[32px_minmax(0,1.6fr)_130px_120px_120px_140px] items-center gap-4 bg-primary px-5 py-3 text-xs font-semibold uppercase text-secondary md:grid">
                                <span></span>
                                <span>Producto</span>
                                <span>Categoria</span>
                                <span>Estado</span>
                                <span>
                                    {esTabEncargos ? "Talles" : "Stock"}
                                </span>
                            </div>

                            {productosVisibles.length === 0 && (
                                <p className="border-t border-black/10 bg-secondary px-5 py-6 text-sm text-black/50">
                                    {esTabEncargos
                                        ? "No hay productos para encargar cargados todavia."
                                        : "No hay productos del catalogo cargados todavia."}
                                </p>
                            )}

                            {productosVisibles.map((producto) => {
                                const orderedImages = [
                                    ...(producto.producto_imagen ?? []),
                                ]
                                    .sort(
                                        (a, b) =>
                                            (a.orden ?? 0) - (b.orden ?? 0)
                                    )
                                    .map((item) => item.url);
                                const image =
                                    orderedImages[0] ?? producto.imagen_url;
                                const newVariant =
                                    newVariantForms[producto.id_producto] ??
                                    initialVariantForm;
                                const imageInputKey =
                                    productImageKeys[producto.id_producto] ?? 0;
                                const queuedFiles =
                                    productImageFiles[producto.id_producto] ??
                                    [];
                                const totalStock = (
                                    producto.producto_talle ?? []
                                ).reduce(
                                    (sum, item) =>
                                        sum + Number(item.stock ?? 0),
                                    0
                                );
                                const isExpanded =
                                    expandedProductId === producto.id_producto;

                                return (
                                    <div
                                        key={producto.id_producto}
                                        className="border-t border-black/10 bg-secondary first:border-t-0"
                                    >
                                        <div className="grid gap-3 px-4 py-4 md:grid-cols-[32px_minmax(0,1.6fr)_130px_120px_120px_140px] md:items-center">
                                            <div className="flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedProductIds.includes(
                                                        producto.id_producto
                                                    )}
                                                    onChange={() =>
                                                        toggleProductSelection(
                                                            producto.id_producto
                                                        )
                                                    }
                                                    className="h-4 w-4 accent-primary"
                                                />
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-black/10 ring-1 ring-black/10">
                                                    {image ? (
                                                        <img
                                                            src={cloudinaryUrl(
                                                                image,
                                                                {
                                                                    width: 100,
                                                                    height: 100,
                                                                }
                                                            )}
                                                            alt={
                                                                producto.nombre
                                                            }
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
                                                        {producto.marca
                                                            ?.nombre ??
                                                            "Sin marca"}
                                                    </p>
                                                    <h2 className="truncate text-lg font-bold text-black">
                                                        {producto.nombre}
                                                    </h2>
                                                    <p className="text-sm font-semibold text-primary">
                                                        {resumenDePrecio(
                                                            producto
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            <div>
                                                {producto.categoria ? (
                                                    <span className="inline-flex rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium text-black">
                                                        {getEtiquetaCategoria(
                                                            producto.categoria
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                                                        Sin categoria
                                                    </span>
                                                )}
                                            </div>

                                            <div>
                                                {esTabEncargos ? (
                                                    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                                                        A pedido
                                                    </span>
                                                ) : (
                                                    <span
                                                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${totalStock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}
                                                    >
                                                        {totalStock > 0
                                                            ? "Disponible"
                                                            : "Sin stock"}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="text-sm font-semibold text-black">
                                                {!esTabEncargos && (
                                                    <p>{totalStock}</p>
                                                )}
                                                <p className="text-xs text-black/50">
                                                    {
                                                        producto.producto_talle
                                                            .length
                                                    }{" "}
                                                    talle/s
                                                </p>
                                            </div>

                                            <div className="flex gap-2 md:justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setExpandedProductId(
                                                            isExpanded
                                                                ? null
                                                                : producto.id_producto
                                                        )
                                                    }
                                                    className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-secondary transition-all duration-300 hover:bg-primary cursor-pointer"
                                                >
                                                    {isExpanded
                                                        ? "Cerrar"
                                                        : "Editar"}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={
                                                        pendingKey ===
                                                        `delete-product-${producto.id_producto}`
                                                    }
                                                    onClick={() =>
                                                        handleDeleteProduct(
                                                            producto
                                                        )
                                                    }
                                                    className="rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200 transition-all duration-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-red-50/50 disabled:text-red-300 cursor-pointer"
                                                >
                                                    {pendingKey ===
                                                    `delete-product-${producto.id_producto}`
                                                        ? "Borrando..."
                                                        : "Borrar"}
                                                </button>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="border-t border-black/10 px-4 py-4">
                                                <div className="mb-4 flex flex-col gap-2 md:max-w-xs">
                                                    <p className="text-sm font-semibold text-black">
                                                        Categoria
                                                    </p>
                                                    <SelectMenu
                                                        value={
                                                            producto.categoria ??
                                                            ""
                                                        }
                                                        options={CATEGORIAS}
                                                        disabled={
                                                            pendingKey ===
                                                            `categoria-${producto.id_producto}`
                                                        }
                                                        onChange={(categoria) =>
                                                            saveCategoria(
                                                                producto.id_producto,
                                                                categoria
                                                            )
                                                        }
                                                        placeholder="Sin categoria"
                                                        ariaLabel="Categoria del producto"
                                                    />
                                                </div>

                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full">
                                                        <thead>
                                                            <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-black/50">
                                                                <th className="px-3 pb-2">
                                                                    Talle
                                                                </th>
                                                                {!esTabEncargos && (
                                                                    <th className="px-3 pb-2">
                                                                        Stock
                                                                    </th>
                                                                )}
                                                                <th className="px-3 pb-2">
                                                                    Precio
                                                                </th>
                                                                <th className="px-3 pb-2 text-right">
                                                                    Acciones
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {producto.producto_talle.map(
                                                                (variante) => {
                                                                    const rowKey = `${producto.id_producto}-${variante.id_talle}`;
                                                                    return (
                                                                        <tr
                                                                            key={
                                                                                rowKey
                                                                            }
                                                                            className="bg-secondary"
                                                                        >
                                                                            <td className="rounded-l-2xl px-3 py-3 font-semibold text-black">
                                                                                {variante
                                                                                    .talle
                                                                                    ?.nombre ??
                                                                                    "Sin talle"}
                                                                            </td>
                                                                            {!esTabEncargos && (
                                                                                <td className="px-3 py-3">
                                                                                    <input
                                                                                        type="number"
                                                                                        min="0"
                                                                                        value={
                                                                                            variante.stock ??
                                                                                            0
                                                                                        }
                                                                                        onChange={(
                                                                                            event
                                                                                        ) =>
                                                                                            updateVariante(
                                                                                                producto.id_producto,
                                                                                                variante.id_talle,
                                                                                                "stock",
                                                                                                event
                                                                                                    .target
                                                                                                    .value
                                                                                            )
                                                                                        }
                                                                                        className="h-11 w-full min-w-27.5 rounded-xl ring ring-black/10 px-3 outline-none transition-all duration-300 focus:ring-primary"
                                                                                    />
                                                                                </td>
                                                                            )}
                                                                            <td className="px-3 py-3">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    step="0.01"
                                                                                    value={
                                                                                        variante.precio ??
                                                                                        producto.precio_base ??
                                                                                        0
                                                                                    }
                                                                                    onChange={(
                                                                                        event
                                                                                    ) =>
                                                                                        updateVariante(
                                                                                            producto.id_producto,
                                                                                            variante.id_talle,
                                                                                            "precio",
                                                                                            event
                                                                                                .target
                                                                                                .value
                                                                                        )
                                                                                    }
                                                                                    className="h-11 w-full min-w-35 rounded-xl ring ring-black/10 px-3 outline-none transition-all duration-300 focus:ring-primary"
                                                                                />
                                                                            </td>
                                                                            <td className="rounded-r-2xl px-3 py-3">
                                                                                <div className="flex justify-end gap-2">
                                                                                    <button
                                                                                        type="button"
                                                                                        disabled={
                                                                                            pendingKey ===
                                                                                            rowKey
                                                                                        }
                                                                                        onClick={() =>
                                                                                            saveVariante(
                                                                                                producto.id_producto,
                                                                                                variante.id_talle,
                                                                                                variante.stock,
                                                                                                variante.precio ??
                                                                                                    producto.precio_base ??
                                                                                                    0
                                                                                            )
                                                                                        }
                                                                                        className="h-11 rounded-xl bg-black px-4 text-sm font-medium text-secondary transition-all duration-300 hover:bg-primary disabled:cursor-not-allowed disabled:bg-black/50 cursor-pointer"
                                                                                    >
                                                                                        {pendingKey ===
                                                                                        rowKey
                                                                                            ? "Guardando..."
                                                                                            : "Guardar"}
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        disabled={
                                                                                            Number(
                                                                                                variante.stock ??
                                                                                                    0
                                                                                            ) !==
                                                                                                0 ||
                                                                                            pendingKey ===
                                                                                                `delete-${producto.id_producto}-${variante.id_talle}`
                                                                                        }
                                                                                        onClick={() =>
                                                                                            deleteVariante(
                                                                                                producto.id_producto,
                                                                                                variante.id_talle,
                                                                                                variante.stock
                                                                                            )
                                                                                        }
                                                                                        className="h-11 rounded-xl bg-red-50 px-4 text-sm font-medium text-red-700 ring-1 ring-red-200 transition-all duration-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:border-red-100 disabled:bg-red-50/50 disabled:text-red-300 cursor-pointer"
                                                                                        title={
                                                                                            Number(
                                                                                                variante.stock ??
                                                                                                    0
                                                                                            ) ===
                                                                                            0
                                                                                                ? "Eliminar talle"
                                                                                                : "Pon el stock en 0 para borrarlo"
                                                                                        }
                                                                                    >
                                                                                        {pendingKey ===
                                                                                        `delete-${producto.id_producto}-${variante.id_talle}`
                                                                                            ? "Borrando..."
                                                                                            : "Borrar"}
                                                                                    </button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                }
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                                                    <div>
                                                        <p className="mb-3 text-sm font-semibold text-black">
                                                            Agregar talle nuevo
                                                        </p>
                                                        <div
                                                            className={`grid gap-3 ${esTabEncargos ? "md:grid-cols-[1fr_140px]" : "md:grid-cols-[1fr_140px_140px]"}`}
                                                        >
                                                            <input
                                                                value={
                                                                    newVariant.talle
                                                                }
                                                                onChange={(
                                                                    event
                                                                ) =>
                                                                    updateNewVariantForm(
                                                                        producto.id_producto,
                                                                        "talle",
                                                                        event
                                                                            .target
                                                                            .value
                                                                    )
                                                                }
                                                                className="h-11 rounded-xl ring ring-black/10 px-3 outline-none transition-all duration-300 focus:ring-primary"
                                                                placeholder="Ej: 10 US"
                                                            />
                                                            {!esTabEncargos && (
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={
                                                                        newVariant.stock
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        updateNewVariantForm(
                                                                            producto.id_producto,
                                                                            "stock",
                                                                            event
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                    className="h-11 rounded-xl ring ring-black/10 px-3 outline-none transition-all duration-300 focus:ring-primary"
                                                                    placeholder="Stock"
                                                                />
                                                            )}
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    pendingKey ===
                                                                    `new-${producto.id_producto}`
                                                                }
                                                                onClick={() =>
                                                                    handleAddVariant(
                                                                        producto
                                                                    )
                                                                }
                                                                className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-secondary transition-all duration-300 hover:bg-primary-accent disabled:cursor-not-allowed disabled:bg-black/50 cursor-pointer"
                                                            >
                                                                {pendingKey ===
                                                                `new-${producto.id_producto}`
                                                                    ? "Agregando..."
                                                                    : "Agregar"}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <p className="mb-3 text-sm font-semibold text-black">
                                                            Agregar imagenes
                                                        </p>
                                                        <div className="grid gap-3 md:grid-cols-[1fr_180px] md:items-end">
                                                            <label className="flex h-11 items-center rounded-xl ring ring-black/10 px-3 text-sm text-black cursor-pointer">
                                                                <input
                                                                    key={
                                                                        imageInputKey
                                                                    }
                                                                    type="file"
                                                                    accept="image/*"
                                                                    multiple
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        setProductImageFiles(
                                                                            (
                                                                                prev
                                                                            ) => ({
                                                                                ...prev,
                                                                                [producto.id_producto]:
                                                                                    Array.from(
                                                                                        event
                                                                                            .target
                                                                                            .files ??
                                                                                            []
                                                                                    ),
                                                                            })
                                                                        )
                                                                    }
                                                                    className="sr-only"
                                                                />
                                                                <span className="truncate font-semibold text-black">
                                                                    {queuedFiles.length >
                                                                    0
                                                                        ? `${queuedFiles.length} archivo(s) seleccionados`
                                                                        : "Elegir archivos"}
                                                                </span>
                                                            </label>
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    pendingKey ===
                                                                    `images-${producto.id_producto}`
                                                                }
                                                                onClick={() =>
                                                                    handleAddImages(
                                                                        producto
                                                                    )
                                                                }
                                                                className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-secondary transition-all duration-300 hover:bg-primary-accent disabled:cursor-not-allowed disabled:bg-black/50 cursor-pointer"
                                                            >
                                                                {pendingKey ===
                                                                `images-${producto.id_producto}`
                                                                    ? "Subiendo..."
                                                                    : "Agregar imagenes"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
