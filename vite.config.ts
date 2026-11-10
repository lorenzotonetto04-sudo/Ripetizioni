import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// "base" deve coincidere con il nome del repository su GitHub
export default defineConfig({
  base: '/Ripetizioni/',
  plugins: [react()],
})
