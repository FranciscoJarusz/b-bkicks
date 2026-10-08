import type { APIRoute } from "astro";
import { createHash } from "node:crypto";
import { esAdmin } from "@/lib/admin";
import { respuestaJson } from "@/lib/http";

const CLOUDINARY_API_KEY = import.meta.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = import.meta.env.CLOUDINARY_API_SECRET;
const CLOUDINARY_UPLOAD_PRESET =
    import.meta.env.PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim() ?? "";

// Solo firmamos subidas a la carpeta de productos ("productos" o
// "productos/<slug>"), la misma que arma el panel admin.
const CARPETA_PERMITIDA = /^productos(\/[a-z0-9-]+)?$/;

/**
 * Firma una subida a Cloudinary para el panel admin. Asi el preset puede pasar
 * a "Signed" y nadie puede subir archivos a la cuenta sin estar logueado como
 * admin.
 */
export const POST: APIRoute = async ({ request }) => {
    if (!(await esAdmin(request))) {
        return respuestaJson({ error: "No autorizado." }, 401);
    }

    if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
        return respuestaJson(
            {
                error: "Faltan CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET en el servidor.",
            },
            500
        );
    }

    const body = await request.json().catch(() => null);
    const folder = typeof body?.folder === "string" ? body.folder : "";

    if (!CARPETA_PERMITIDA.test(folder)) {
        return respuestaJson({ error: "Carpeta no permitida." }, 400);
    }

    const params: Record<string, string> = {
        folder,
        timestamp: String(Math.floor(Date.now() / 1000)),
    };
    if (CLOUDINARY_UPLOAD_PRESET) {
        params.upload_preset = CLOUDINARY_UPLOAD_PRESET;
    }

    // Cloudinary firma los parametros ordenados alfabeticamente, como
    // "a=1&b=2", con el secret pegado al final.
    const aFirmar = Object.keys(params)
        .sort()
        .map((clave) => `${clave}=${params[clave]}`)
        .join("&");
    const signature = createHash("sha1")
        .update(aFirmar + CLOUDINARY_API_SECRET)
        .digest("hex");

    return respuestaJson({
        ...params,
        api_key: CLOUDINARY_API_KEY,
        signature,
    });
};
