import { writeFileSync } from 'fs'
import { PNG } from 'pngjs'

const TILE_SIZE = 16
const PATTERN_COUNT = 7
const CANVAS_WIDTH = TILE_SIZE * PATTERN_COUNT
const CANVAS_HEIGHT = TILE_SIZE

function createFloorsPng(): Buffer {
  const png = new PNG({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT })

  // Define 7 floor patterns
  const patterns = [
    // Pattern 0: Plain light gray
    (x: number, y: number) => ({ r: 180, g: 180, b: 180 }),
    // Pattern 1: Wood
    (x: number, y: number) => ({ r: 139 + (x % 2) * 20, g: 90 + (y % 2) * 10, b: 60 }),
    // Pattern 2: Stone tiles
    (x: number, y: number) => {
      const tileX = x % 8
      const tileY = y % 8
      const isBorder = tileX === 0 || tileX === 7 || tileY === 0 || tileY === 7
      return isBorder ? { r: 100, g: 100, b: 100 } : { r: 160, g: 160, b: 160 }
    },
    // Pattern 3: Checkerboard
    (x: number, y: number) => {
      const check = (Math.floor(x / 4) + Math.floor(y / 4)) % 2
      return check ? { r: 200, g: 200, b: 200 } : { r: 150, g: 150, b: 150 }
    },
    // Pattern 4: Dark tiles
    (x: number, y: number) => ({ r: 100, g: 100, b: 110 }),
    // Pattern 5: Carpet
    (x: number, y: number) => ({ r: 180 + (x % 2) * 10, g: 140 + (y % 2) * 10, b: 120 }),
    // Pattern 6: Marble
    (x: number, y: number) => ({ r: 200 + Math.sin(x * 0.5) * 20, g: 200 + Math.cos(y * 0.5) * 20, b: 210 })
  ]

  for (let pattern = 0; pattern < PATTERN_COUNT; pattern++) {
    const offsetX = pattern * TILE_SIZE
    const getPixel = patterns[pattern]

    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const pixelX = offsetX + x
        const idx = (y * CANVAS_WIDTH + pixelX) << 2
        const color = getPixel(x, y)

        png.data[idx] = color.r
        png.data[idx + 1] = color.g
        png.data[idx + 2] = color.b
        png.data[idx + 3] = 255
      }
    }
  }

  return PNG.sync.write(png)
}

const buffer = createFloorsPng()
const outputPath = './webview-ui/public/assets/floors.png'
writeFileSync(outputPath, buffer)
console.log(`Created ${outputPath}`)
