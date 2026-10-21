import { supabase } from "@/lib/supabase.js";

export function getSlug(nombre) {
    return (
        nombre
            // Separa la tilde de su letra base y la descarta, para que
            // "pantalon" no quede como "pantaln". Idem la n con virgulilla.
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
    );
}

function normalizeSupabaseProducts(rows = []) {
    const toArray = (value) =>
        Array.isArray(value) ? value : value ? [value] : [];
    const grouped = new Map();

    for (const producto of rows) {
        const key = String(
            producto.id_producto ?? getSlug(producto.nombre ?? "")
        );

        if (!grouped.has(key)) {
            grouped.set(key, {
                id: producto.id_producto,
                name: producto.nombre,
                slug: getSlug(producto.nombre),
                category: producto.categoria ?? "",
                marca: producto.marca?.nombre ?? "",
                description: "",
                precioBase: Number(producto.precio_base ?? 0),
                esEncargo: Boolean(producto.es_encargo),
                fallbackImage: producto.imagen_url ?? null,
                tallesMap: new Map(),
                imagesMap: new Map(),
            });
        }

        const item = grouped.get(key);

        for (const talle of toArray(producto.producto_talle)) {
            const talleNombre = talle?.talle?.nombre ?? "";
            if (!talleNombre) continue;

            const current = item.tallesMap.get(talleNombre);
            const stock = Number(talle?.stock ?? 0);
            // El precio del talle manda; precio_base es solo el respaldo para
            // los talles que nunca recibieron uno propio.
            const precioTalle = Number(talle?.precio ?? 0);
            const precio = precioTalle > 0 ? precioTalle : item.precioBase;

            if (!current) {
                item.tallesMap.set(talleNombre, {
                    nombre: talleNombre,
                    stock,
                    precio,
                });
            } else {
                item.tallesMap.set(talleNombre, {
                    nombre: talleNombre,
                    stock: Math.max(current.stock, stock),
                    precio: Math.min(current.precio, precio),
                });
            }
        }

        for (const image of toArray(producto.producto_imagen)) {
            const url = image?.url;
            if (!url) continue;
            item.imagesMap.set(url, { url, orden: image?.orden ?? 0 });
        }
    }

    return Array.from(grouped.values()).map((item) => {
        const talles = Array.from(item.tallesMap.values()).map(
            ({ nombre, stock, precio }) => ({
                nombre,
                stock,
                precio,
            })
        );
        const stock = talles.reduce((sum, talle) => sum + talle.stock, 0);
        const images = Array.from(item.imagesMap.values())
            .sort((a, b) => a.orden - b.orden)
            .map((image) => image.url);
        const image = images[0] ?? item.fallbackImage ?? null;
        const { priceMin, priceMax } = getRangoDePrecios(
            talles,
            item.precioBase
        );

        return {
            id: item.id,
            name: item.name,
            slug: item.slug,
            image,
            images: images.length > 0 ? images : image ? [image] : [],
            category: item.category,
            marca: item.marca,
            description: item.description,
            // El precio "del producto" es el mas barato que se puede comprar
            // hoy; la ficha lo ajusta al talle que elige el comprador.
            price: priceMin,
            priceMin,
            priceMax,
            precioBase: item.precioBase,
            esEncargo: item.esEncargo,
            stock,
            specs: {
                talle: talles,
            },
        };
    });
}

/**
 * Rango de precios que puede pagar un comprador. Miramos solo los talles con
 * stock, que son los unicos que se pueden comprar; si no queda ninguno (un
 * encargo o un producto agotado) caemos a todos los talles, y si el producto
 * todavia no tiene talles cargados, al precio base.
 *
 * @param {{ stock: number, precio: number }[]} talles
 * @param {number} precioBase
 */
export function getRangoDePrecios(talles = [], precioBase = 0) {
    const base = Number(precioBase ?? 0);
    const conStock = talles.filter((talle) => Number(talle.stock ?? 0) > 0);
    const considerados = conStock.length > 0 ? conStock : talles;
    const precios = considerados
        .map((talle) => Number(talle.precio ?? 0))
        .filter((precio) => precio > 0);

    if (precios.length === 0) return { priceMin: base, priceMax: base };

    return { priceMin: Math.min(...precios), priceMax: Math.max(...precios) };
}

// Una misma pagina pide el catalogo mas de una vez (el header y la pagina en
// si), y una funcion de Vercel atiende varias visitas seguidas. Reusamos la
// consulta unos segundos; el CDN igual cachea la pagina entera (ver
// src/middleware.ts), asi que esto solo ahorra consultas repetidas.
const VIGENCIA_CACHE = 30 * 1000;
/** @type {{ desde: number, promesa: ReturnType<typeof consultarProductos> } | null} */
let cacheProductos = null;

function getProductosFromSupabase() {
    const ahora = Date.now();
    if (cacheProductos && ahora - cacheProductos.desde < VIGENCIA_CACHE) {
        return cacheProductos.promesa;
    }

    const promesa = consultarProductos();
    cacheProductos = { desde: ahora, promesa };
    // Si la consulta falla no la dejamos cacheada: la proxima visita reintenta.
    promesa.catch(() => {
        if (cacheProductos?.promesa === promesa) cacheProductos = null;
    });

    return promesa;
}

async function consultarProductos() {
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
      producto_imagen (
        url,
        orden
      ),
      marca (
        nombre
      ),
      producto_talle (
        stock,
        precio,
        talle (
          nombre
        )
      )
    `
        )
        // Del mas nuevo al mas viejo: no hay fecha de alta en la tabla, pero el
        // id es autoincremental, asi que sirve de proxy (es el mismo criterio
        // que usa el panel de admin).
        .order("id_producto", { ascending: false });

    if (error) {
        throw error;
    }

    return desambiguarSlugs(normalizeSupabaseProducts(data ?? []));
}

/**
 * El slug sale del nombre, asi que dos productos que se llaman igual chocan y
 * el segundo queda inaccesible. Al repetido le sumamos el id. Recorremos del
 * mas viejo al mas nuevo para que el que ya estaba publicado conserve su URL,
 * y separamos catalogo de encargos porque viven en rutas distintas.
 *
 * @template {{ id: number, slug: string, esEncargo: boolean }} T
 * @param {T[]} productos
 * @returns {T[]}
 */
export function desambiguarSlugs(productos) {
    const usados = new Set();
    const porAntiguedad = [...productos].sort(
        (a, b) => Number(a.id ?? 0) - Number(b.id ?? 0)
    );

    for (const producto of porAntiguedad) {
        const clave = `${producto.esEncargo}:${producto.slug}`;
        if (usados.has(clave)) {
            producto.slug = `${producto.slug}-${producto.id}`;
        }
        usados.add(`${producto.esEncargo}:${producto.slug}`);
    }

    return productos;
}

/**
 * Lo que necesita la grilla con filtros (busqueda y encargos). Viaja como props
 * de una isla en el HTML: sin la galeria completa ni campos que no muestra.
 */
export function paraCatalogo(productos) {
    return productos.map(
        ({
            id,
            slug,
            name,
            marca,
            category,
            image,
            price,
            priceMax,
            stock,
            specs,
        }) => ({
            id,
            slug,
            name,
            marca,
            category,
            image,
            price,
            priceMax,
            stock,
            specs,
        })
    );
}

export async function getProductosAgrupados() {
    const productos = await getProductosFromSupabase();
    return productos.filter((producto) => !producto.esEncargo);
}

export async function getEncargos() {
    const productos = await getProductosFromSupabase();
    return productos.filter((producto) => producto.esEncargo);
}

/**
 * Los ultimos productos que abrio cualquier visitante, de catalogo y de
 * encargos, con los datos actuales (precio, imagen) del producto. La tabla
 * guarda como mucho 24: si cambias el limite, cambialo tambien en
 * supabase/vistos-limite-migration.sql.
 */
export async function getVistosRecientes(limite = 24) {
    const { data, error } = await supabase
        .from("producto_visto")
        .select("id_producto")
        .order("visto", { ascending: false })
        .limit(limite);

    if (error) throw error;

    const productos = await getProductosFromSupabase();
    const porId = new Map(productos.map((p) => [p.id, p]));

    return (data ?? []).flatMap(({ id_producto }) => {
        const producto = porId.get(id_producto);
        return producto ? [producto] : [];
    });
}
