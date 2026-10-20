import { supabase } from "@/lib/supabase.js";
import { esListaDeReels, REELS_INICIALES } from "@/reels";

export async function leerReels(): Promise<string[]> {
    const { data, error } = await supabase
        .from("contenido")
        .select("valor")
        .eq("clave", "reels")
        .maybeSingle();

    if (error || !data) return REELS_INICIALES;
    return esListaDeReels(data.valor) ? data.valor : REELS_INICIALES;
}
