import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom', // Requerido para simular el DOM del navegador en React
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text'], // <- Genera el archivo lcov.info para SonarQube
      reportsDirectory: './coverage'
    },
  },
})