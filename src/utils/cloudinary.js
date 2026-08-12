const UPLOAD_MARKER = "/upload/";

/**
 * Inserta transformaciones de Cloudinary (formato/calidad automáticos + resize)
 * en una URL de entrega. Si la URL no es de Cloudinary, la devuelve sin tocar.
 */
/**
 * @param {string | undefined | null} url
 * @param {{ width?: number, height?: number, crop?: string }} [options]
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

/**
 * Extrae el public_id (carpeta/nombre sin extensión) de una URL de entrega
 * de Cloudinary. Devuelve null si la URL no es de Cloudinary.
 * @param {string | undefined | null} url
 */
export function cloudinaryPublicId(url) {
    if (!url || typeof url !== "string") return null;

    const match = url.match(/\/upload\/(?:[^/]+\/)*v\d+\/(.+)\.[a-zA-Z0-9]+$/);
    return match ? match[1] : null;
}
