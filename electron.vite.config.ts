import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import { join, resolve } from 'path'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: join(__dirname, 'src/main/index.ts')
      },
      minify: false,
      terserOptions: undefined
    }
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler', { reactCompiler: true }]]
        }
      }),
      tailwindcss()
    ]
  }
})
