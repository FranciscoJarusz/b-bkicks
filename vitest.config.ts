import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
    resolve: {
        // El mismo alias "@/" que usa el proyecto (tsconfig.json).
        alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    test: {
        include: ["tests/**/*.test.js"],
    },
});
