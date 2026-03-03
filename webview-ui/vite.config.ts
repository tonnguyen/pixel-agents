import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib'

  return {
    plugins: [react()],
    build: isLib ? {
      lib: {
        entry: {
          index: './src/index.ts',
          adapter: './src/adapter.ts',
          'adapter-context': './src/adapterContext.ts',
        },
        name: 'PixelAgentsWebview',
        formats: ['es'],
        fileName: (_format, entryName) => `${entryName}.js`,
      },
      rollupOptions: {
        external: ['react', 'react-dom'],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
          },
        },
      },
      outDir: 'dist',
      emptyOutDir: true,
    } : {
      outDir: 'dist',
      emptyOutDir: true,
    },
    base: './',
  }
})
