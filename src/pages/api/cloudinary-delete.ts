import type { APIRoute } from "astro";
import { esAdmin } from "@/lib/admin";
import { respuestaJson } from "@/lib/http";

const CLOUDINARY_CLOUD_NAME = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = import.meta.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = import.meta.env.CLOUDINARY_API_SECRET;

// Todas las imagenes de productos viven bajo "productos/". Cualquier otro
// public_id no es nuestro de borrar desde aca, aunque el pedido sea del admin.
const PREFIJO_PERMITIDO = "productos/";

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
    const publicIds: string[] = Array.isArray(body?.publicIds)
        ? body.publicIds.filter(
              (id: unknown) =>
                  typeof id === "string" && id.startsWith(PREFIJO_PERMITIDO)
          )
        : [];

    if (publicIds.length === 0) {
        return respuestaJson({ deleted: [] });
    }

    const auth = Buffer.from(
        `${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`
    ).toString("base64");

    const url = new URL(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/resources/image/upload`
    );
    for (const id of publicIds.slice(0, 100)) {
        url.searchParams.append("public_ids[]", id);
    }

    const cloudinaryRes = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Basic ${auth}` },
    });

    if (!cloudinaryRes.ok) {
        const detail = await cloudinaryRes.text().catch(() => "");
        return respuestaJson(
            {
                error: `Cloudinary rechazo el borrado (${cloudinaryRes.status}). ${detail}`,
            },
            502
        );
    }

    const data = await cloudinaryRes.json();
    return respuestaJson({ deleted: Object.keys(data.deleted ?? {}) });
};
