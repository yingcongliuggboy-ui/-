
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
      // Only define the specific API keys. 
      // DO NOT define 'process.env': {} as it breaks React's internal environment checks.
      'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY || process.env.OPENAI_API_KEY),
      'process.env.OPENAI_API_BASE_URL': JSON.stringify(env.OPENAI_API_BASE_URL || process.env.OPENAI_API_BASE_URL)
    }
  };
});
