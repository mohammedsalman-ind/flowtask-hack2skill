import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  oxc: { include: /\.[jt]sx?$/, exclude: [] },
  server: { host: 'localhost', port: 5173, strictPort: true },
  resolve: {
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
    alias: [
      { find: /^react-native$/, replacement: 'react-native-web' },
      { find: '@', replacement: fileURLToPath(new URL('./src/new-ui', import.meta.url)) },
      { find: 'expo-router', replacement: fileURLToPath(new URL('./src/new-ui/web-router.tsx', import.meta.url)) },
    ],
  },
})
