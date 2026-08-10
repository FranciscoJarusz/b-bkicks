// @ts-check
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    site: "https://www.bybkicks.com",
    output: "server",
    adapter: vercel(),
    integrations: [react()],
    vite: {
        plugins: [tailwindcss()],
    },
});
