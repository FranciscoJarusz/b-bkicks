import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const rootDir = process.cwd();
const envPath = resolve(rootDir, ".env");

function loadEnv(filePath) {
    const content = readFileSync(filePath, "utf8");
    const entries = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => {
            const separatorIndex = line.indexOf("=");
            return [
                line.slice(0, separatorIndex),
                line.slice(separatorIndex + 1),
            ];
        });

    return Object.fromEntries(entries);
}

function isOnTargetCloud(url, cloudName) {
    return (
        typeof url === "string" &&
        url.includes(`res.cloudinary.com/${cloudName}/`)
    );
}

async function uploadRemoteToCloudinary(
    sourceUrl,
    { cloudName, preset, folder }
) {
    const download = await fetch(sourceUrl);
    if (!download.ok) {
        throw new Error(
            `No se pudo descargar la imagen original (${download.status}): ${sourceUrl}`
        );
    }

    const blob = await download.blob();
    const formData = new FormData();
    formData.append("file", blob);
    formData.append("upload_preset", preset);
    if (folder) formData.append("folder", folder);

    const upload = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData }
    );

    if (!upload.ok) {
        const detail = await upload.text().catch(() => "");
        throw new Error(
            `Cloudinary rechazo la subida (${upload.status}). ${detail}`.trim()
        );
    }

    const data = await upload.json();
    if (!data.secure_url) {
        throw new Error("Cloudinary no devolvio la URL de la imagen.");
    }

    return data.secure_url;
}

async function main() {
    const env = loadEnv(envPath);
    const supabaseUrl = env.PUBLIC_SUPABASE_URL;
    const supabaseKey =
        env.SUPABASE_SERVICE_ROLE_KEY || env.PUBLIC_SUPABASE_ANON_KEY;
    const cloudName = env.PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = env.PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!supabaseUrl) throw new Error("Falta PUBLIC_SUPABASE_URL en .env");
    if (!supabaseKey) {
        throw new Error(
            "Falta una key de Supabase. Usa SUPABASE_SERVICE_ROLE_KEY o PUBLIC_SUPABASE_ANON_KEY."
        );
    }
    if (!cloudName || !preset) {
        throw new Error(
            "Faltan PUBLIC_CLOUDINARY_CLOUD_NAME y PUBLIC_CLOUDINARY_UPLOAD_PRESET en .env"
        );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const folder = "productos";
    const cache = new Map();
    const summary = { imagenes: 0, principales: 0, saltadas: 0, errores: 0 };

    async function migrateUrl(sourceUrl) {
        if (!sourceUrl || isOnTargetCloud(sourceUrl, cloudName)) return null;
        if (cache.has(sourceUrl)) return cache.get(sourceUrl);

        const newUrl = await uploadRemoteToCloudinary(sourceUrl, {
            cloudName,
            preset,
            folder,
        });
        cache.set(sourceUrl, newUrl);
        return newUrl;
    }

    // 1) Tabla producto_imagen (todas las imagenes de cada producto)
    const { data: imagenes, error: imagenesError } = await supabase
        .from("producto_imagen")
        .select("id_producto, url, orden");

    if (imagenesError) throw imagenesError;

    for (const img of imagenes ?? []) {
        try {
            const newUrl = await migrateUrl(img.url);
            if (!newUrl) {
                summary.saltadas += 1;
                continue;
            }

            const { error: updateError } = await supabase
                .from("producto_imagen")
                .update({ url: newUrl })
                .eq("id_producto", img.id_producto)
                .eq("url", img.url);

            if (updateError) throw updateError;

            summary.imagenes += 1;
            console.log(`OK imagen producto ${img.id_producto}: ${newUrl}`);
        } catch (error) {
            summary.errores += 1;
            console.error(
                `ERROR imagen producto ${img.id_producto} (${img.url}): ${error.message ?? error}`
            );
        }
    }

    // 2) Columna producto.imagen_url (imagen principal)
    const { data: productos, error: productosError } = await supabase
        .from("producto")
        .select("id_producto, imagen_url");

    if (productosError) throw productosError;

    for (const producto of productos ?? []) {
        try {
            const newUrl = await migrateUrl(producto.imagen_url);
            if (!newUrl) {
                summary.saltadas += 1;
                continue;
            }

            const { error: updateError } = await supabase
                .from("producto")
                .update({ imagen_url: newUrl })
                .eq("id_producto", producto.id_producto);

            if (updateError) throw updateError;

            summary.principales += 1;
            console.log(
                `OK principal producto ${producto.id_producto}: ${newUrl}`
            );
        } catch (error) {
            summary.errores += 1;
            console.error(
                `ERROR principal producto ${producto.id_producto}: ${error.message ?? error}`
            );
        }
    }

    console.log("\nResumen:");
    console.log(JSON.stringify(summary, null, 2));
    console.log(
        "\nMigracion lista. Es re-ejecutable: las URLs que ya estan en la cuenta de Cloudinary destino se saltan."
    );

    if (summary.errores > 0) {
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("Fallo la migracion a Cloudinary.");
    console.error(error.message ?? error);
    process.exit(1);
});
