import type { APIRoute } from "astro";
import { supabase } from "@/lib/supabase.js";

const ADMIN_EMAIL =
    import.meta.env.PUBLIC_ADMIN_EMAIL?.trim().toLowerCase() ?? "";
const CLOUDINARY_CLOUD_NAME = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = import.meta.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = import.meta.env.CLOUDINARY_API_SECRET;

async function isAuthorizedAdmin(request: Request) {
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return false;

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return false;

    return !ADMIN_EMAIL || data.user.email?.toLowerCase() === ADMIN_EMAIL;
}

export const POST: APIRoute = async ({ request }) => {
    if (!(await isAuthorizedAdmin(request))) {
        return new Response(JSON.stringify({ error: "No autorizado." }), {
            status: 401,
        });
    }

    if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
        return new Response(
            JSON.stringify({
                error: "Faltan CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET en el servidor.",
            }),
            { status: 500 }
        );
    }

    const body = await request.json().catch(() => null);
    const publicIds = Array.isArray(body?.publicIds)
        ? body.publicIds.filter((id: unknown) => typeof id === "string")
        : [];

    if (publicIds.length === 0) {
        return new Response(JSON.stringify({ deleted: [] }), { status: 200 });
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
        return new Response(
            JSON.stringify({
                error: `Cloudinary rechazo el borrado (${cloudinaryRes.status}). ${detail}`,
            }),
            { status: 502 }
        );
    }

    const data = await cloudinaryRes.json();
    return new Response(JSON.stringify({ deleted: Object.keys(data.deleted ?? {}) }), {
        status: 200,
    });
};
