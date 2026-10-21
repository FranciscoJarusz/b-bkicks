// @ts-check
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";

export default defineConfig({
    site: "https://www.bybkicks.com",
    output: "server",
    adapter: vercel(),
    integrations: [react(), icon()],
    vite: {
        plugins: [tailwindcss()],
    },
});
