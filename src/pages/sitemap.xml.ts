import type { APIRoute } from "astro";
import { getProductosAgrupados } from "@/utils/productos.js";

export const GET: APIRoute = async ({ url }) => {
  const base = url.origin;
  const productos = await getProductosAgrupados();

  const staticRoutes = ["", "/busqueda"];

  const urls = [
    ...staticRoutes.map(
      (path) => `
    <url>
      <loc>${base}${path}</loc>
      <changefreq>weekly</changefreq>
      <priority>${path === "" ? "1.0" : "0.7"}</priority>
    </url>`,
    ),
    ...productos.map(
      (p) => `
    <url>
      <loc>${base}/productos/${p.slug}</loc>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
    </url>`,
    ),
  ];

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
