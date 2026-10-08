import { supabase } from "@/lib/supabase.js";

export async function getOrCreateBrand(nombre) {
    const trimmed = nombre.trim();
    const { data: existing, error: readError } = await supabase
        .from("marca")
        .select("id_marca")
        .eq("nombre", trimmed)
        .maybeSingle();

    if (readError) throw readError;
    if (existing) return existing.id_marca;

    const { data, error } = await supabase
        .from("marca")
        .insert({ nombre: trimmed })
        .select("id_marca")
        .single();

    if (error) throw error;
    return data.id_marca;
}

export async function getOrCreateSize(nombre) {
    const trimmed = nombre.trim();
    const { data: existing, error: readError } = await supabase
        .from("talle")
        .select("id_talle")
        .eq("nombre", trimmed)
        .maybeSingle();

    if (readError) throw readError;
    if (existing) return existing.id_talle;

    const { data, error } = await supabase
        .from("talle")
        .insert({ nombre: trimmed })
        .select("id_talle")
        .single();

    if (error) throw error;
    return data.id_talle;
}

export async function replaceProductImages(productId, imageUrls) {
    const { error: deleteError } = await supabase
        .from("producto_imagen")
        .delete()
        .eq("id_producto", productId);

    if (deleteError) throw deleteError;

    if (imageUrls.length > 0) {
        const payload = imageUrls.map((url, orden) => ({
            id_producto: productId,
            url,
            orden,
        }));

        const { error: insertError } = await supabase
            .from("producto_imagen")
            .insert(payload);
        if (insertError) throw insertError;
    }

    const { error: updateError } = await supabase
        .from("producto")
        .update({ imagen_url: imageUrls[0] ?? null })
        .eq("id_producto", productId);

    if (updateError) throw updateError;
}

export async function appendProductImages(producto, imageUrls) {
    if (imageUrls.length === 0) return;

    const existing = [...(producto.producto_imagen ?? [])].sort(
        (a, b) => (a.orden ?? 0) - (b.orden ?? 0)
    );
    const payload = imageUrls.map((url, index) => ({
        id_producto: producto.id_producto,
        url,
        orden: existing.length + index,
    }));

    const { error } = await supabase.from("producto_imagen").insert(payload);
    if (error) throw error;

    if (!producto.imagen_url) {
        const { error: updateError } = await supabase
            .from("producto")
            .update({ imagen_url: imageUrls[0] })
            .eq("id_producto", producto.id_producto);

        if (updateError) throw updateError;
    }
}
