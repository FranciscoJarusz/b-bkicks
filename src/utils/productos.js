import { supabase } from "@/lib/supabase.js";

export function getSlug(nombre) {
  return nombre.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function normalizeSupabaseProducts(rows = []) {
  return rows.map((producto) => {
    const talles = (producto.producto_talle ?? []).map((item) => ({
      nombre: item.talle?.nombre ?? "",
      stock: item.stock ?? 0,
    }));

    const stock = talles.reduce((sum, item) => sum + item.stock, 0);
    const images = (producto.producto_imagen ?? [])
      .slice()
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
      .map((item) => item.url)
      .filter(Boolean);
    const image = images[0] ?? producto.imagen_url ?? null;
    const priceFromSizes = producto.producto_talle?.find((item) => item.precio != null)?.precio;

    return {
      name: producto.nombre,
      slug: getSlug(producto.nombre),
      image,
      images: images.length > 0 ? images : image ? [image] : [],
      category: "",
      marca: producto.marca?.nombre ?? "",
      description: "",
      price: Number(priceFromSizes ?? producto.precio_base ?? 0),
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
