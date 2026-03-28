import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const rootDir = process.cwd();
const envPath = resolve(rootDir, ".env");
const dataPath = resolve(rootDir, "src/data/productos.json");

function loadEnv(filePath) {
  const content = readFileSync(filePath, "utf8");
  const entries = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separatorIndex = line.indexOf("=");
      return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)];
    });

  return Object.fromEntries(entries);
}

function countSizes(items = []) {
  const counts = new Map();

  for (const rawValue of items) {
    const value = String(rawValue ?? "").trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([nombre, stock]) => ({
    nombre,
    stock,
  }));
}

function normalizeProducts(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const key = row.name.trim().toLowerCase();
    const talles = countSizes(row.specs?.talle ?? []);
    const images = [...new Set((row.images ?? (row.image ? [row.image] : [])).filter(Boolean))];
    const firstImage = images[0] ?? null;

    if (!grouped.has(key)) {
      grouped.set(key, {
        nombre: row.name.trim(),
        precio_base: Number(row.price ?? 0),
        imagen_url: firstImage,
        marca: row.marca?.trim() ?? "Sin marca",
        images,
        talles: [...talles],
      });
      continue;
    }

    const existing = grouped.get(key);
    existing.images = [...new Set([...existing.images, ...images])];
    existing.imagen_url = existing.images[0] ?? existing.imagen_url;

    for (const talle of talles) {
      const current = existing.talles.find((item) => item.nombre === talle.nombre);
      if (current) {
        current.stock += talle.stock;
      } else {
        existing.talles.push({ ...talle });
      }
    }
  }

  return Array.from(grouped.values());
}

async function getOrCreateBrand(supabase, nombre) {
  const { data: existing, error: selectError } = await supabase
    .from("marca")
    .select("id_marca")
    .eq("nombre", nombre)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing.id_marca;

  const { data: inserted, error: insertError } = await supabase
    .from("marca")
    .insert({ nombre })
    .select("id_marca")
    .single();

  if (insertError) throw insertError;
  return inserted.id_marca;
}

async function getOrCreateSize(supabase, nombre) {
  const { data: existing, error: selectError } = await supabase
    .from("talle")
    .select("id_talle")
    .eq("nombre", nombre)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing.id_talle;

  const { data: inserted, error: insertError } = await supabase
    .from("talle")
    .insert({ nombre })
    .select("id_talle")
    .single();

  if (insertError) throw insertError;
  return inserted.id_talle;
}

async function getOrCreateProduct(supabase, product, brandId) {
  const { data: existing, error: selectError } = await supabase
    .from("producto")
    .select("id_producto")
    .eq("nombre", product.nombre)
    .eq("id_marca", brandId)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing.id_producto;

  const { data: inserted, error: insertError } = await supabase
    .from("producto")
    .insert({
      nombre: product.nombre,
      precio_base: product.precio_base,
      imagen_url: product.imagen_url,
      id_marca: brandId,
    })
    .select("id_producto")
    .single();

  if (insertError) throw insertError;
  return inserted.id_producto;
}

async function upsertProductSize(supabase, productId, sizeId, stock, precio) {
  const { data: existing, error: selectError } = await supabase
    .from("producto_talle")
    .select("id_producto")
    .eq("id_producto", productId)
    .eq("id_talle", sizeId)
    .maybeSingle();

  if (selectError) throw selectError;

  if (existing) {
    const { error: updateError } = await supabase
      .from("producto_talle")
      .update({ stock, precio })
      .eq("id_producto", productId)
      .eq("id_talle", sizeId);

    if (updateError) throw updateError;
    return "updated";
  }

  const { error: insertError } = await supabase.from("producto_talle").insert({
    id_producto: productId,
    id_talle: sizeId,
    stock,
    precio,
  });

  if (insertError) throw insertError;
  return "inserted";
}

async function syncProductImages(supabase, productId, images) {
  const orderedImages = images.map((url, orden) => ({
    id_producto: productId,
    url,
    orden,
  }));

  const { error: deleteError } = await supabase
    .from("producto_imagen")
    .delete()
    .eq("id_producto", productId);

  if (deleteError) throw deleteError;
  if (orderedImages.length === 0) return 0;

  const { error: insertError } = await supabase
    .from("producto_imagen")
    .insert(orderedImages);

  if (insertError) throw insertError;
  return orderedImages.length;
}

async function main() {
  const env = loadEnv(envPath);
  const supabaseUrl = env.PUBLIC_SUPABASE_URL;
  const supabaseKey =
    env.SUPABASE_SERVICE_ROLE_KEY || env.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Falta PUBLIC_SUPABASE_URL en .env");
  }

  if (!supabaseKey) {
    throw new Error(
      "Falta una key para escribir en Supabase. Usá SUPABASE_SERVICE_ROLE_KEY o PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const sourceRows = JSON.parse(readFileSync(dataPath, "utf8"));
  const products = normalizeProducts(sourceRows);
  const supabase = createClient(supabaseUrl, supabaseKey);

  const summary = {
    brands: 0,
    products: 0,
    imagesInserted: 0,
    productSizesInserted: 0,
    productSizesUpdated: 0,
  };

  for (const product of products) {
    const brandId = await getOrCreateBrand(supabase, product.marca);
    const productId = await getOrCreateProduct(supabase, product, brandId);
    summary.imagesInserted += await syncProductImages(supabase, productId, product.images);

    summary.products += 1;

    for (const talle of product.talles) {
      const sizeId = await getOrCreateSize(supabase, talle.nombre);
      const result = await upsertProductSize(
        supabase,
        productId,
        sizeId,
        talle.stock,
        product.precio_base
      );

      if (result === "inserted") {
        summary.productSizesInserted += 1;
      } else {
        summary.productSizesUpdated += 1;
      }
    }
  }

  const { count: brandCount, error: brandCountError } = await supabase
    .from("marca")
    .select("*", { count: "exact", head: true });

  if (brandCountError) throw brandCountError;
  summary.brands = brandCount ?? 0;

  console.log(JSON.stringify(summary, null, 2));
  console.log("Importacion lista. producto_imagen guarda todas las imagenes y producto.imagen_url conserva la principal.");
}

main().catch((error) => {
  console.error("Fallo la importacion a Supabase.");
  console.error(error.message ?? error);
  process.exit(1);
});
