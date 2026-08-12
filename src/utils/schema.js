import { cloudinaryUrl } from "@/utils/cloudinary.js";

const SITE_NAME = "B&B KICKS";

// El sitio muestra el precio de lista (efectivo/transferencia + 25%) como
// precio general, y el precio base como descuento por pago en efectivo.
// Google necesita el precio que paga cualquier comprador: el de lista.
export function precioDeLista(precioBase) {
    return Math.round(Number(precioBase ?? 0) * 1.25);
}

export function buildProductSchema(producto, { pageUrl, esEncargo = false }) {
    const disponibilidad = esEncargo
        ? "https://schema.org/PreOrder"
        : producto.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock";

    const imagenes = producto.images?.length
        ? producto.images
        : producto.image
          ? [producto.image]
          : [];

    const schema = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: producto.name,
        url: pageUrl,
        offers: {
            "@type": "Offer",
            url: pageUrl,
            price: String(precioDeLista(producto.price)),
            priceCurrency: "USD",
            availability: disponibilidad,
            itemCondition: "https://schema.org/NewCondition",
            seller: { "@type": "Organization", name: SITE_NAME },
        },
    };

    if (imagenes.length > 0) {
        schema.image = imagenes.map((img) =>
            cloudinaryUrl(img, { width: 1000, height: 1000 })
        );
    }
    if (producto.description) schema.description = producto.description;
    if (producto.marca) {
        schema.brand = { "@type": "Brand", name: producto.marca };
    }
    if (producto.category) schema.category = producto.category;

    return schema;
}

export function buildBreadcrumbSchema(items) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map(({ name, url }, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name,
            item: url,
        })),
    };
}

export function buildOrganizationSchema(siteUrl) {
    const origin = new URL(siteUrl).origin;

    return {
        "@context": "https://schema.org",
        "@type": "Store",
        name: SITE_NAME,
        url: origin,
        logo: `${origin}/Logotipo.svg`,
        image: `${origin}/hero.webp`,
        description:
            "Tienda de sneakers y streetwear original en Buenos Aires. Envios a toda Argentina.",
        telephone: "+5491125322786",
        foundingDate: "2024",
        areaServed: { "@type": "Country", name: "Argentina" },
        address: {
            "@type": "PostalAddress",
            addressLocality: "Buenos Aires",
            addressCountry: "AR",
        },
        sameAs: [
            "https://www.instagram.com/bybkicks_/",
            "https://wa.me/5491125322786",
        ],
    };
}
