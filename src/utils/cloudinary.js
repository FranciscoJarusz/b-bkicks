const UPLOAD_MARKER = "/upload/";

/**
 * Inserta transformaciones de Cloudinary (formato/calidad automáticos + resize)
 * en una URL de entrega. Si la URL no es de Cloudinary, la devuelve sin tocar.
 */
export function cloudinaryUrl(url, { width, height, crop = "fill" } = {}) {
    if (!url || typeof url !== "string") return url;

    const idx = url.indexOf(UPLOAD_MARKER);
    if (idx === -1) return url;

    const params = ["f_auto", "q_auto"];
    if (width) params.push(`w_${Math.round(width)}`);
    if (height) params.push(`h_${Math.round(height)}`);
    if (width || height) params.push(`c_${crop}`);

    const insertAt = idx + UPLOAD_MARKER.length;
    return `${url.slice(0, insertAt)}${params.join(",")}/${url.slice(insertAt)}`;
}
