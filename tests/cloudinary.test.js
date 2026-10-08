import { describe, expect, it } from "vitest";
import { cloudinaryPublicId, cloudinaryUrl } from "@/utils/cloudinary.js";

const URL_ORIGINAL =
    "https://res.cloudinary.com/demo/image/upload/v1786551876/productos/abc.png";

describe("cloudinaryUrl", () => {
    it("agrega formato, calidad y tamaño", () => {
        expect(cloudinaryUrl(URL_ORIGINAL, { width: 500, height: 667 })).toBe(
            "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_500,h_667,c_fill/v1786551876/productos/abc.png"
        );
    });

    it("no toca URLs que no son de Cloudinary", () => {
        expect(cloudinaryUrl("/hero.webp", { width: 100 })).toBe("/hero.webp");
        expect(cloudinaryUrl(null)).toBeNull();
    });
});

describe("cloudinaryPublicId", () => {
    it("extrae el public_id con o sin transformaciones", () => {
        expect(cloudinaryPublicId(URL_ORIGINAL)).toBe("productos/abc");
        expect(
            cloudinaryPublicId(cloudinaryUrl(URL_ORIGINAL, { width: 100 }))
        ).toBe("productos/abc");
    });

    it("devuelve null si no es de Cloudinary", () => {
        expect(cloudinaryPublicId("/hero.webp")).toBeNull();
    });
});
