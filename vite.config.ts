import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env variables
  // Fix: Cast process to any to avoid missing type definition for cwd()
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        // Fix: Use path.resolve("./") as __dirname might not be available in all environments/types
        "@": path.resolve("./"),
      },
    },
    define: {
      // Thay thế chính xác chuỗi process.env.API_KEY bằng giá trị thực
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY),
      // Polyfill object process.env rỗng để tránh crash các thư viện bên thứ 3 (nếu có dùng process.env.NODE_ENV...)
      'process.env': JSON.stringify({}) 
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    }
  };
});