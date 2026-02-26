// ... imports ...

export default defineConfig(({ mode }) => {
    // ...
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        
        // --- Make sure this 'proxy' block is here ---
        proxy: {
          '/api': {
            target: 'http://localhost:8080',
            changeOrigin: true,
          },
          '/ws': {
            target: 'ws://localhost:8080',
            ws: true,
          },
          // forward camera MJPEG requests to the Python helper
          '/camera_feed': {
            target: 'http://localhost:5000',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/camera_feed/, '/video_feed'),
          }
        }
        // --- End of proxy block ---

      },
      plugins: [react()],
      // ... rest of the file ...
    };
});
function defineConfig(configFactory: ({ mode }: { mode: any; }) => {
  server: {
    port: number;
    host: string;
    proxy: {
      '/api': { target: string; changeOrigin: boolean; };
      '/ws': { target: string; ws: boolean; };
    };
  };
  plugins: any[];
}) {
  // Simply return the result of the config factory function
  return (params: { mode: any }) => configFactory(params);
}
function react(): any {
  // This function typically returns a Vite plugin for React
  // In a real implementation, this would be imported from '@vitejs/plugin-react'
  return {
    name: 'vite-plugin-react',
    transform(code: string, id: string) {
      // Basic plugin structure
      return {
        code,
        map: null
      };
    }
  };
}

