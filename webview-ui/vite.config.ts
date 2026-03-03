import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Recursively copy directory
function copyRecursive(src: string, dest: string) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true })
  }
  const entries = readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = resolve(src, entry.name)
    const destPath = resolve(dest, entry.name)
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

// Plugin to copy CSS, fonts, and assets to dist
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
      if (existsSync(fontsSrc)) {
        copyRecursive(fontsSrc, fontsDist)
      }

      // Copy public assets directory to dist
      const publicAssetsSrc = resolve(__dirname, 'public/assets')
      const distAssets = resolve(__dirname, 'dist/assets')
      if (existsSync(publicAssetsSrc)) {
        copyRecursive(publicAssetsSrc, distAssets)
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
