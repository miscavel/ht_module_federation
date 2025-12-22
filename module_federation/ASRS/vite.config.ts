import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'asrs-app',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/App.tsx',
      },
      remotes: {
        coreApp: 'http://localhost:5000/assets/remoteEntry.js',
        wmsApp: 'http://localhost:5001/assets/remoteEntry.js',
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
