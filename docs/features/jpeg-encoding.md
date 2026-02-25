# JPEG Encoding

jpgx provides a powerful JPEG encoder that converts raw image data into compressed JPEG format. This guide covers the encoding process and options.

## Basic Encoding

```typescript
import { encode } from 'jpgx'

// Prepare image data (RGBA format)
const imageData = {
  width: 800,
  height: 600,
  data: new Uint8Array(800 * 600 * 4), // RGBA pixels
}

// Encode with default quality (50)
const result = encode(imageData)

// Save to file
await Bun.write('output.jpg', result.data)
```

## Quality Control

The quality parameter ranges from 1-100:

```typescript
// Low quality (smaller file)
const low = encode(imageData, 30)

// Medium quality (default)
const medium = encode(imageData, 50)

// High quality
const high = encode(imageData, 85)

// Maximum quality
const max = encode(imageData, 100)
```

### Quality vs File Size

| Quality | Typical Use | Relative Size |
|---------|-------------|---------------|
| 1-30 | Previews, thumbnails | ~10-20% |
| 30-60 | Web thumbnails | ~20-40% |
| 60-80 | Web images | ~40-60% |
| 80-95 | High-quality web | ~60-80% |
| 95-100 | Archival | ~80-100% |

## Input Data Format

### RGBA Data

The encoder expects RGBA data (4 bytes per pixel):

```typescript
const width = 100
const height = 100
const data = new Uint8Array(width * height * 4)

// Set pixels (RGBA order)
for (let i = 0; i < width * height; i++) {
  const offset = i * 4
  data[offset + 0] = 255  // Red
  data[offset + 1] = 128  // Green
  data[offset + 2] = 64   // Blue
  data[offset + 3] = 255  // Alpha (ignored in JPEG)
}

const result = encode({ width, height, data }, 85)
```

### From Canvas (Browser)

```typescript
const canvas = document.getElementById('canvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

const result = encode({
  width: imageData.width,
  height: imageData.height,
  data: new Uint8Array(imageData.data.buffer),
}, 85)
```

### From Buffer

```typescript
// If you have RGB data, convert to RGBA
function rgbToRgba(rgb: Uint8Array, width: number, height: number): Uint8Array {
  const rgba = new Uint8Array(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4 + 0] = rgb[i * 3 + 0]  // R
    rgba[i * 4 + 1] = rgb[i * 3 + 1]  // G
    rgba[i * 4 + 2] = rgb[i * 3 + 2]  // B
    rgba[i * 4 + 3] = 255             // A
  }
  return rgba
}
```

## Adding Comments

Embed comments in the JPEG file:

```typescript
const result = encode({
  width: 800,
  height: 600,
  data: imageData,
  comments: [
    'Created with jpgx',
    'Author: Your Name',
    'Copyright 2025',
  ],
}, 85)
```

Comments are stored in COM markers and can be read back during decoding.

## Preserving EXIF Data

Preserve EXIF metadata when re-encoding:

```typescript
import { encode, decode } from 'jpgx'

// Decode original with EXIF
const original = decode(originalJpegData)

// Modify the image data...
// (resize, filter, etc.)

// Re-encode with preserved EXIF
const result = encode({
  width: original.width,
  height: original.height,
  data: processedData,
  exifBuffer: original.exifBuffer, // Preserve EXIF
}, 85)
```

## Encoding Process

The encoder performs these steps:

1. **Color Space Conversion**: RGB to YCbCr
2. **Block Processing**: Divide into 8x8 blocks
3. **DCT**: Apply Discrete Cosine Transform
4. **Quantization**: Apply quality-based quantization
5. **Entropy Coding**: Huffman encoding
6. **Marker Writing**: JFIF markers, headers, data

## Output Format

```typescript
interface BufferRet {
  data: Buffer | Uint8ClampedArray
  width: number
  height: number
}
```

The output `data` contains a valid JPEG file that can be:

- Written to disk
- Sent over network
- Displayed in browser
- Further processed

## Performance Tips

### Batch Processing

```typescript
// Process multiple images
const images = ['img1.raw', 'img2.raw', 'img3.raw']

const results = await Promise.all(
  images.map(async (path) => {
    const raw = await Bun.file(path).arrayBuffer()
    return encode({ width: 800, height: 600, data: new Uint8Array(raw) }, 75)
  })
)
```

### Quality Selection

Choose quality based on use case:

```typescript
function getQualityForUseCase(useCase: string): number {
  switch (useCase) {
    case 'thumbnail':
      return 40
    case 'preview':
      return 60
    case 'web':
      return 75
    case 'print':
      return 90
    case 'archive':
      return 100
    default:
      return 75
  }
}
```

## Error Handling

```typescript
try {
  const result = encode(imageData, quality)
}
catch (error) {
  if (error.message.includes('Invalid')) {
    console.error('Invalid image data')
  }
  else {
    console.error('Encoding failed:', error.message)
  }
}
```

## Complete Example

```typescript
import { encode } from 'jpgx'

// Create a gradient image
const width = 256
const height = 256
const data = new Uint8Array(width * height * 4)

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 4
    data[offset + 0] = x         // Red gradient
    data[offset + 1] = y         // Green gradient
    data[offset + 2] = 128       // Blue constant
    data[offset + 3] = 255       // Alpha
  }
}

const result = encode({
  width,
  height,
  data,
  comments: ['Gradient test image'],
}, 85)

await Bun.write('gradient.jpg', result.data)
console.log(`Created ${result.data.length} byte JPEG`)
```

## Next Steps

- [JPEG Decoding](/features/jpeg-decoding) - Read JPEG files
- [Quality Settings](/features/quality-settings) - Fine-tune quality
- [Performance](/advanced/performance) - Optimize encoding
