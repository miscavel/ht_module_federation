import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    react(),
    federation({
      name: 'wms-app',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/App.tsx',
      },
      remotes: {
        coreApp: process.env.VITE_CORE_REMOTE || 'http://localhost:5000/assets/remoteEntry.js',
      },
      shared: ['react', 'react-dom', '@ionic/react', 'react-router-dom']
    })
  ],
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false
  }
})
