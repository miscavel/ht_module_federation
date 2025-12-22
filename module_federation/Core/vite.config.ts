import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'core-app',
      filename: 'remoteEntry.js',
      remotes: {
        wmsApp: 'http://localhost:5001/assets/remoteEntry.js',
        asrsApp: 'http://localhost:5002/assets/remoteEntry.js',
      },
      exposes: {
        './SharedNotification': './src/components/SharedNotification.tsx',
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
