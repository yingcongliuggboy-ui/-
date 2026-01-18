import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173
    },
    define: {
      // Define Gemini API key for the application
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(
        env.VITE_GEMINI_API_KEY || 
        env.GEMINI_API_KEY || 
        process.env.VITE_GEMINI_API_KEY || 
        process.env.GEMINI_API_KEY || 
        ''
      )
    }
  };
});
