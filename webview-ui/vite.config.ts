import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Plugin to copy CSS and fonts to dist
function copyAssets() {
  return {
    name: 'copy-assets',
    writeBundle() {
      // Copy CSS
      const cssSrc = resolve(__dirname, 'src/index.css')
      const cssDist = resolve(__dirname, 'dist/index.css')
      copyFileSync(cssSrc, cssDist)

      // Copy fonts directory
      const fontsSrc = resolve(__dirname, 'src/fonts')
      const fontsDist = resolve(__dirname, 'dist/fonts')
      if (!existsSync(fontsDist)) {
        mkdirSync(fontsDist, { recursive: true })
      }
      const fontFile = resolve(fontsSrc, 'FSPixelSansUnicode-Regular.ttf')
      if (existsSync(fontFile)) {
        copyFileSync(fontFile, resolve(fontsDist, 'FSPixelSansUnicode-Regular.ttf'))
      }
    }
  }
}

export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib'

  return {
    plugins: [react(), isLib ? copyAssets() : null],
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
