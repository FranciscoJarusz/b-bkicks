// Optimizacion de imagenes en el navegador y subida/borrado en Cloudinary.

import { cloudinaryPublicId } from "@/utils/cloudinary.js";

const CLOUDINARY_CLOUD_NAME =
    import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ?? "";

const CLOUDINARY_FOLDER = "productos";

function slugify(value) {
    return String(value ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

const WEBP_QUALITY = 0.75;

const MAX_WIDTH = 1200;

const BYPASS_WEBP_TYPES = new Set(["image/gif", "image/svg+xml"]);

function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error(`No pudimos procesar la imagen ${file.name}.`));
        };

        image.src = objectUrl;
    });
}

function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(
                        new Error(
                            "No pudimos convertir la imagen antes de subirla."
                        )
                    );
                    return;
                }

                resolve(blob);
            },
            type,
            quality
        );
    });
}

async function convertImageToWebp(file) {
    if (!file?.type?.startsWith("image/")) return file;
    if (BYPASS_WEBP_TYPES.has(file.type) || file.type === "image/webp")
        return file;

    const image = await loadImageFromFile(file);
    const canvas = document.createElement("canvas");

    let width = image.naturalWidth || image.width;
    let height = image.naturalHeight || image.height;

    if (width > MAX_WIDTH) {
        const ratio = MAX_WIDTH / width;
        width = MAX_WIDTH;
        height = height * ratio;
    }

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("No pudimos preparar la optimizacion de la imagen.");
    }
    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
    const originalName =
        file.name.replace(/\.[^.]+$/, "") || `imagen-${Date.now()}`;

    return new File([blob], `${originalName}.webp`, {
        type: "image/webp",
        lastModified: Date.now(),
    });
}

export async function deleteFromCloudinary(publicIds, accessToken) {
    if (!publicIds || publicIds.length === 0) return;

    const response = await fetch("/api/cloudinary-delete", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ publicIds }),
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
            `No pudimos borrar las imagenes en Cloudinary. ${detail}`.trim()
        );
    }
}

// La subida va firmada por el servidor: sin sesion de admin no hay firma, asi
// que nadie puede subir archivos a la cuenta aunque conozca el preset.
async function getFirmaCloudinary(folder, accessToken) {
    const response = await fetch("/api/cloudinary-sign", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ folder }),
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
            `No pudimos autorizar la subida a Cloudinary. ${detail}`.trim()
        );
    }

    return response.json();
}

async function uploadToCloudinary(file, folder, accessToken) {
    const firma = await getFirmaCloudinary(folder, accessToken);

    const formData = new FormData();
    formData.append("file", file);
    for (const [clave, valor] of Object.entries(firma)) {
        formData.append(clave, valor);
    }

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
    );

    if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
            `Cloudinary rechazo la subida (${response.status}). ${detail}`.trim()
        );
    }

    const data = await response.json();
    if (!data.secure_url) {
        throw new Error("Cloudinary no devolvio la URL de la imagen.");
    }

    return data.secure_url;
}

export async function uploadFiles(productName, files, accessToken) {
    if (!files || files.length === 0) return [];

    if (!CLOUDINARY_CLOUD_NAME) {
        throw new Error("Falta PUBLIC_CLOUDINARY_CLOUD_NAME en el entorno.");
    }

    const uploaded = [];
    const folder = `${CLOUDINARY_FOLDER}/${slugify(productName) || `producto-${Date.now()}`}`;

    try {
        for (const file of files) {
            const optimizedFile = await convertImageToWebp(file);
            const url = await uploadToCloudinary(
                optimizedFile,
                folder,
                accessToken
            );
            uploaded.push(url);
        }
    } catch (error) {
        // Si falla una a mitad de camino, las que ya subieron quedarian
        // huerfanas en Cloudinary: las borramos y seguimos con el error.
        const publicIds = uploaded.map(cloudinaryPublicId).filter(Boolean);
        await deleteFromCloudinary(publicIds, accessToken).catch(() => {});
        throw error;
    }

    return uploaded;
}
