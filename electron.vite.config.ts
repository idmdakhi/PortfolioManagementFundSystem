import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

// Entries are explicit because this project keeps main/preload in /electron and the Vue app in /src
// (electron-vite's defaults expect src/main, src/preload and src/renderer).
// Output names match package.json "main" (out/main/index.js) and the preload path used in electron/main.ts.
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@electron': resolve('electron') } },
    build: {
      rollupOptions: {
        input: resolve('electron/main.ts'),
        output: { entryFileNames: 'index.js' }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve('electron/preload.ts'),
        output: { entryFileNames: 'index.js' }
      }
    }
  },
  renderer: {
    root: resolve('.'),
    resolve: { alias: { '@': resolve('src') } },
    plugins: [vue()],
    build: { rollupOptions: { input: resolve('index.html') } }
  }
})
