import { supabase } from "@/lib/supabase.js";

export function getSlug(nombre) {
  return nombre.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function normalizeSupabaseProducts(rows = []) {
  const toArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);
  const grouped = new Map();

  for (const producto of rows) {
    const key = String(producto.id_producto ?? getSlug(producto.nombre ?? ""));

    if (!grouped.has(key)) {
      grouped.set(key, {
        id: producto.id_producto,
        name: producto.nombre,
        slug: getSlug(producto.nombre),
        category: "",
        marca: producto.marca?.nombre ?? "",
        description: "",
        price: Number(producto.precio_base ?? 0),
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
      const precio = talle?.precio != null ? Number(talle.precio) : undefined;

      if (!current) {
        item.tallesMap.set(talleNombre, { nombre: talleNombre, stock, precio });
      } else {
        item.tallesMap.set(talleNombre, {
          nombre: talleNombre,
          stock: Math.max(current.stock, stock),
          precio: current.precio ?? precio,
        });
      }

      if (item.price === 0 && precio != null) {
        item.price = precio;
      }
    }

    for (const image of toArray(producto.producto_imagen)) {
      const url = image?.url;
      if (!url) continue;
      item.imagesMap.set(url, { url, orden: image?.orden ?? 0 });
    }
  }

  return Array.from(grouped.values()).map((item) => {
    const talles = Array.from(item.tallesMap.values()).map(({ nombre, stock }) => ({
      nombre,
      stock,
    }));
    const stock = talles.reduce((sum, talle) => sum + talle.stock, 0);
    const images = Array.from(item.imagesMap.values())
      .sort((a, b) => a.orden - b.orden)
      .map((image) => image.url);
    const image = images[0] ?? item.fallbackImage ?? null;

    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      image,
      images: images.length > 0 ? images : image ? [image] : [],
      category: item.category,
      marca: item.marca,
      description: item.description,
      price: Number(item.price ?? 0),
      stock,
      specs: {
        talle: talles,
      },
    };
  });
}

async function getProductosFromSupabase() {
  const { data, error } = await supabase
    .from("producto")
    .select(`
      id_producto,
      nombre,
      precio_base,
      imagen_url,
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
    `)
    .order("id_producto", { ascending: true });

  if (error) {
    throw error;
  }

  return normalizeSupabaseProducts(data ?? []);
}

export async function getProductosAgrupados() {
  const productos = await getProductosFromSupabase();
  return productos;
}
