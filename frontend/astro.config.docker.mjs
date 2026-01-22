// @ts-check
// Astro config for Docker builds (uses @astrojs/node adapter)
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import node from "@astrojs/node";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
    output: "server",
    adapter: node({
        mode: "standalone"
    }),
    integrations: [
        tailwind(),
        react(),
    ],
    server: {
        host: "0.0.0.0",
        port: 4321,
    },
    image: {
        domains: ["static.wixstatic.com"],
    },
    security: {
        checkOrigin: false
    }
});
