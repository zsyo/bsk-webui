import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    // 书源文件可能较大，处理全在前端，无需额外分包
    chunkSizeWarningLimit: 1024,
  },
});
