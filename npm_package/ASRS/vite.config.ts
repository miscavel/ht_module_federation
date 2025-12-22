import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'npm-asrs',
      fileName: (format) => `npm-asrs.${format}.js`
    },
    rollupOptions: {
      external: ['react', 'react-dom', '@ionic/react', 'react-router-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          '@ionic/react': 'IonicReact',
          'react-router-dom': 'ReactRouterDOM'
        }
      }
    }
  }
})
