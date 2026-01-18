
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Only define the specific API key. 
      // DO NOT define 'process.env': {} as it breaks React's internal environment checks.
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});
