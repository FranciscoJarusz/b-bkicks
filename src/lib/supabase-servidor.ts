import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const secretKey = import.meta.env.SUPABASE_SECRET_KEY;

/**
 * Cliente con la secret key: se saltea RLS. Solo para rutas del servidor
 * (src/pages/api), nunca para codigo que llegue al navegador. Es null si falta
 * SUPABASE_SECRET_KEY.
 */
export const supabaseServidor = secretKey
    ? createClient(supabaseUrl, secretKey, {
          auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
