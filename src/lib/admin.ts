import { supabase } from "@/lib/supabase.js";

const ADMIN_EMAIL =
    import.meta.env.PUBLIC_ADMIN_EMAIL?.trim().toLowerCase() ?? "";

/**
 * Valida el token de Supabase que manda el panel admin. Falla cerrado: sin
 * PUBLIC_ADMIN_EMAIL configurado no autoriza a nadie, porque cualquiera puede
 * crearse un usuario en Supabase Auth con la anon key.
 */
export async function esAdmin(request: Request) {
    if (!ADMIN_EMAIL) return false;

    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return false;

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return false;

    return data.user.email?.toLowerCase() === ADMIN_EMAIL;
}
