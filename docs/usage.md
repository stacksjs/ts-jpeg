# Usage

jpgx provides a simple API for encoding and decoding JPEG images.

## Encoding

### Basic Encoding

```typescript
import { encode } from 'jpgx'

// Prepare raw image data (RGBA format)
const imageData = {
  width: 800,
  height: 600,
  data: new Uint8Array(800 * 600 * 4), // RGBA pixels
}

// Encode with default quality (50)
const result = encode(imageData)

// Encode with custom quality
const highQuality = encode(imageData, 95)
const lowQuality = encode(imageData, 30)

// Save to file
await Bun.write('output.jpg', result.data)
```

### Encoding with Comments

```typescript
import { encode } from 'jpgx'

const imageData = {
  width: 800,
  height: 600,
  data: new Uint8Array(800 * 600 * 4),
  comments: ['Created with jpgx', 'Copyright 2025'],
}

const result = encode(imageData, 85)
```

### Encoding with EXIF Data

```typescript
import { encode } from 'jpgx'

// Preserve EXIF data from a decoded image
const originalJpeg = await Bun.file('original.jpg').arrayBuffer()
const decoded = decode(new Uint8Array(originalJpeg))

// Re-encode with preserved EXIF
const result = encode({
  width: decoded.width,
  height: decoded.height,
  data: decoded.data,
  exifBuffer: decoded.exifBuffer,
}, 90)
```

## Decoding

### Basic Decoding

```typescript
import { decode } from 'jpgx'

// Read JPEG file
const jpegData = await Bun.file('image.jpg').arrayBuffer()

// Decode to raw image data
const image = decode(new Uint8Array(jpegData))

console.log('Width:', image.width)
console.log('Height:', image.height)
console.log('Data length:', image.data.length)
```

### Decoding with Options

```typescript
import { decode } from 'jpgx'

const jpegData = await Bun.file('image.jpg').arrayBuffer()

// Decode with custom options
const image = decode(new Uint8Array(jpegData), {
  useTArray: true,           // Use typed arrays
  formatAsRGBA: true,        // Output as RGBA (default)
  colorTransform: true,      // Apply color transformation
  tolerantDecoding: true,    // Be tolerant of malformed data
  maxResolutionInMP: 100,    // Max resolution in megapixels
  maxMemoryUsageInMB: 512,   // Max memory usage
})
```

### Extracting Metadata

```typescript
import { decode } from 'jpgx'

const jpegData = await Bun.file('photo.jpg').arrayBuffer()
const image = decode(new Uint8Array(jpegData))

// Access EXIF data
if (image.exifBuffer) {
  console.log('EXIF data found:', image.exifBuffer.byteLength, 'bytes')
}

// Access comments
if (image.comments) {
  console.log('Comments:', image.comments)
}
```

## Working with Canvas (Browser)

### Encoding from Canvas

```typescript
import { encode } from 'jpgx'

const canvas = document.getElementById('myCanvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

const result = encode({
  width: imageData.width,
  height: imageData.height,
  data: new Uint8Array(imageData.data.buffer),
}, 85)

// Download or upload the JPEG
const blob = new Blob([result.data], { type: 'image/jpeg' })
```

### Decoding to Canvas

```typescript
import { decode } from 'jpgx'

// Fetch and decode JPEG
const response = await fetch('image.jpg')
const buffer = await response.arrayBuffer()
const image = decode(new Uint8Array(buffer))

// Draw to canvas
const canvas = document.createElement('canvas')
canvas.width = image.width
canvas.height = image.height
const ctx = canvas.getContext('2d')!

const imageData = new ImageData(
  new Uint8ClampedArray(image.data),
  image.width,
  image.height
)
ctx.putImageData(imageData, 0, 0)
```

## Quality Settings

Quality ranges from 1 to 100:

| Quality | Use Case |
|---------|----------|
| 95-100 | Archival, maximum quality |
| 80-95 | Photography, high quality |
| 60-80 | Web images, balanced |
| 30-60 | Thumbnails, smaller files |
| 1-30 | Previews, minimum size |

```typescript
// Compare file sizes at different qualities
const qualities = [30, 50, 70, 90]

for (const quality of qualities) {
  const result = encode(imageData, quality)
  console.log(`Quality ${quality}: ${result.data.length} bytes`)
}
```

## Error Handling

```typescript
import { decode, encode } from 'jpgx'

try {
  const image = decode(jpegData)
}
catch (error) {
  if (error.message.includes('SOI not found')) {
    console.error('Invalid JPEG: missing start marker')
  }
  else if (error.message.includes('maxMemoryUsageInMB')) {
    console.error('Image too large to process')
  }
  else {
    console.error('Decoding failed:', error.message)
  }
}
```

## Next Steps

- [Configuration](/config) - Detailed configuration options
- [Quality Settings](/features/quality-settings) - Fine-tune output quality
- [Metadata Handling](/features/metadata-handling) - Work with EXIF and comments
