import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { open: true },
  // o Rapier (física) vem com WASM embutido, o bundle é grande mesmo
  build: { chunkSizeWarningLimit: 4000 },
})
