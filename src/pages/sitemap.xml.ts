import type { APIRoute } from "astro";
import { getProductosAgrupados, getEncargos } from "@/utils/productos.js";

type Producto = { slug: string };

const dedupBySlug = (productos: Producto[]) => {
    const slugsVistos = new Set<string>();
    return productos.filter((p) => {
        if (!p.slug || slugsVistos.has(p.slug)) return false;
        slugsVistos.add(p.slug);
        return true;
    });
};

export const GET: APIRoute = async ({ site, url }) => {
    const base = (site ?? new URL(url.origin)).origin;

    const [productos, encargos] = await Promise.all([
        getProductosAgrupados(),
        getEncargos(),
    ]);

    const entradas = [
        { path: "/", priority: "1.0" },
        { path: "/busqueda", priority: "0.7" },
        { path: "/encargos", priority: "0.7" },
        ...dedupBySlug(productos).map((p) => ({
            path: `/productos/${p.slug}`,
            priority: "0.8",
        })),
        ...dedupBySlug(encargos).map((p) => ({
            path: `/encargos/${p.slug}`,
            priority: "0.6",
        })),
    ];

    const urls = entradas.map(
        ({ path, priority }) => `
    <url>
      <loc>${base}${path}</loc>
      <changefreq>weekly</changefreq>
      <priority>${priority}</priority>
    </url>`
    );

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("")}
</urlset>`;

    return new Response(xml, {
        headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
        },
    });
};
