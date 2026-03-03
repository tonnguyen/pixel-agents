import { writeFileSync, mkdirSync } from 'fs'
import { PNG } from 'pngjs'
import { join } from 'path'

const outputDir = './webview-ui/public/assets/furniture'
const assets = [
  { name: 'desk', width: 32, height: 32, color: '#8B4513' },
  { name: 'chair', width: 16, height: 16, color: '#A0522D' },
  { name: 'table', width: 32, height: 32, color: '#D2691E' },
  { name: 'plant', width: 16, height: 16, color: '#228B22' },
  { name: 'lamp', width: 16, height: 16, color: '#FFD700' },
  { name: 'computer', width: 16, height: 16, color: '#C0C0C0' },
  { name: 'bookshelf', width: 32, height: 16, color: '#8B4513' },
  { name: 'rug', width: 32, height: 32, color: '#CD853F' }
]

function createSimpleFurniturePng(width: number, height: number, color: string): Buffer {
  const png = new PNG({ width, height })
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 128, g: 128, b: 128 }
  }

  const rgb = hexToRgb(color)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) << 2
      // Create a simple border effect
      const isBorder = x === 0 || x === width - 1 || y === 0 || y === height - 1
      const isInner = x > 1 && x < width - 2 && y > 1 && y < height - 2

      if (isBorder) {
        png.data[idx] = Math.max(0, rgb.r - 40)
        png.data[idx + 1] = Math.max(0, rgb.g - 40)
        png.data[idx + 2] = Math.max(0, rgb.b - 40)
        png.data[idx + 3] = 255
      } else if (isInner) {
        png.data[idx] = Math.min(255, rgb.r + 20)
        png.data[idx + 1] = Math.min(255, rgb.g + 20)
        png.data[idx + 2] = Math.min(255, rgb.b + 20)
        png.data[idx + 3] = 255
      } else {
        png.data[idx] = rgb.r
        png.data[idx + 1] = rgb.g
        png.data[idx + 2] = rgb.b
        png.data[idx + 3] = 255
      }
    }
  }

  return PNG.sync.write(png)
}

// Create output directory if it doesn't exist
mkdirSync(outputDir, { recursive: true })

// Generate placeholder PNG files
for (const asset of assets) {
  const buffer = createSimpleFurniturePng(asset.width, asset.height, asset.color)
  const outputPath = join(outputDir, `${asset.name}.png`)
  writeFileSync(outputPath, buffer)
  console.log(`Created ${outputPath}`)
}

console.log('\n✅ Generated placeholder furniture assets')
