// electron.vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";
import { join, resolve } from "path";
var __electron_vite_injected_dirname = "C:\\Users\\moon\\Desktop\\demo\\web\\gift-book-desktop";
var electron_vite_config_default = defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: join(__electron_vite_injected_dirname, "src/main/index.ts")
      },
      minify: false,
      terserOptions: void 0
    }
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src")
      }
    },
    plugins: [
      react({
        babel: {
          plugins: [["babel-plugin-react-compiler", { reactCompiler: true }]]
        }
      }),
      tailwindcss()
    ]
  }
});
export {
  electron_vite_config_default as default
};
