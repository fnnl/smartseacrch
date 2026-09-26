import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

const alias = {
  "@": resolve(__dirname, "src"),
};

export default defineConfig({
  main: {
    resolve: { alias },
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    resolve: { alias },
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    resolve: { alias },
    plugins: [react(), tailwindcss()],
  },
});
