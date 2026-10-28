import { useState } from "react";
import { supabase } from "@/lib/supabase.js";
import { CATEGORIAS } from "@/utils/categorias.js";
import { cloudinaryPublicId } from "@/utils/cloudinary.js";
import SelectMenu from "@/components/ui/SelectMenu.jsx";
import {
    deleteFromCloudinary,
    uploadFiles,
} from "@/components/admin/lib/imagenes.js";
import {
    getOrCreateBrand,
    getOrCreateSize,
    replaceProductImages,
} from "@/components/admin/lib/datos.js";
import {
    BOTON,
    ETIQUETA,
    INPUT,
    TARJETA,
} from "@/components/admin/lib/estilos.js";

const initialProductForm = {
    nombre: "",
    marca: "",
    categoria: "",
    precioBase: "",
    talle: "",
    stock: "",
};

export default function ProductoNuevo({ esEncargo, token, avisar, onCreado }) {
    const [productForm, setProductForm] = useState(initialProductForm);
    const [productFiles, setProductFiles] = useState([]);
    const [productFilesKey, setProductFilesKey] = useState(0);
    const [creando, setCreando] = useState(false);

    function cambiar(field, value) {
        setProductForm((prev) => ({ ...prev, [field]: value }));
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
            await deleteFromCloudinary(publicIds, token).catch((error) =>
                console.error("No pudimos borrar las imagenes:", error)
            );
        }
    }

    async function handleCreateProduct(event) {
        event.preventDefault();

        if (!productForm.nombre.trim() || !productForm.marca.trim()) {
            avisar("Completa nombre y marca para crear el producto.");
            return;
        }

        setCreando(true);

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
                token
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
                    es_encargo: esEncargo,
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
                        stock: esEncargo ? 0 : Number(productForm.stock || 0),
                        precio: Number(productForm.precioBase || 0),
                    });

                if (variantError) throw variantError;
            }

            setProductForm(initialProductForm);
            setProductFiles([]);
            setProductFilesKey((prev) => prev + 1);
            await onCreado("Producto creado.");
        } catch (error) {
            console.error("Error al crear producto:", error);
            await deshacerAltaIncompleta(createdProductId, uploadedUrls);
            avisar(
                error?.message?.includes("storage")
                    ? `No pudimos subir las imagenes al bucket. ${error.message}`
                    : `No pudimos crear el producto. ${error?.message ?? "Revisa las policies y el bucket de Storage."}`
            );
        } finally {
            setCreando(false);
        }
    }

    return (
        <form
            onSubmit={handleCreateProduct}
            className={`${TARJETA} flex flex-col gap-5 p-4 sm:p-6`}
        >
            <div>
                <h3 className="text-lg font-semibold text-black">
                    {esEncargo
                        ? "Cargar producto para encargar"
                        : "Cargar producto nuevo"}
                </h3>
                <p className="mt-1 text-sm text-black/50">
                    {esEncargo
                        ? "Los encargos no llevan stock: se piden a medida."
                        : "Podés cargar el primer talle ahora y sumar el resto después desde Editar."}
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Campo titulo="Nombre">
                    <input
                        value={productForm.nombre}
                        onChange={(event) =>
                            cambiar("nombre", event.target.value)
                        }
                        className={INPUT}
                        placeholder="Ej: Air Jordan 1 Low"
                        required
                    />
                </Campo>
                <Campo titulo="Marca">
                    <input
                        value={productForm.marca}
                        onChange={(event) =>
                            cambiar("marca", event.target.value)
                        }
                        className={INPUT}
                        placeholder="Ej: Nike"
                        required
                    />
                </Campo>
                <div className="flex flex-col gap-1.5">
                    <span className={ETIQUETA}>Categoría</span>
                    <SelectMenu
                        value={productForm.categoria}
                        options={CATEGORIAS}
                        onChange={(categoria) =>
                            cambiar("categoria", categoria)
                        }
                        placeholder="Opcional"
                        ariaLabel="Categoria del producto"
                    />
                </div>
                <Campo titulo="Precio base (USD)">
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={productForm.precioBase}
                        onChange={(event) =>
                            cambiar("precioBase", event.target.value)
                        }
                        className={INPUT}
                        placeholder="0"
                        required
                    />
                </Campo>
                <Campo titulo="Primer talle">
                    <input
                        value={productForm.talle}
                        onChange={(event) =>
                            cambiar("talle", event.target.value)
                        }
                        className={INPUT}
                        placeholder="Opcional. Ej: 10 US"
                    />
                </Campo>
                {!esEncargo && (
                    <Campo titulo="Stock inicial">
                        <input
                            type="number"
                            min="0"
                            value={productForm.stock}
                            onChange={(event) =>
                                cambiar("stock", event.target.value)
                            }
                            className={INPUT}
                            placeholder="0"
                        />
                    </Campo>
                )}
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-black/15 px-4 py-6 text-center transition-all duration-300 hover:border-primary">
                <input
                    key={productFilesKey}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) =>
                        setProductFiles(Array.from(event.target.files ?? []))
                    }
                    className="sr-only"
                />
                <span className="text-sm font-semibold text-black">
                    {productFiles.length > 0
                        ? `${productFiles.length} imagen(es) seleccionadas`
                        : "Elegir imágenes del producto"}
                </span>
                <span className="text-xs text-black/50">
                    {productFiles.length > 0
                        ? "Se suben al crear el producto"
                        : "Podés elegir varias a la vez"}
                </span>
            </label>

            <button
                type="submit"
                disabled={creando}
                className={`${BOTON.primario} w-full sm:w-auto sm:self-end sm:px-6`}
            >
                {creando ? "Creando..." : "Crear producto"}
            </button>
        </form>
    );
}

function Campo({ titulo, children }) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className={ETIQUETA}>{titulo}</span>
            {children}
        </label>
    );
}
