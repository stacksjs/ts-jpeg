# JPEG Decoding

jpgx provides a robust JPEG decoder that supports baseline, extended, and progressive JPEG formats. This guide covers the decoding process and options.

## Basic Decoding

```typescript
import { decode } from 'jpgx'

// Read JPEG file
const jpegData = await Bun.file('image.jpg').arrayBuffer()

// Decode to raw image data
const image = decode(new Uint8Array(jpegData))

console.log('Width:', image.width)
console.log('Height:', image.height)
console.log('Pixels:', image.data.length / 4)
```

## Decoder Options

```typescript
const image = decode(jpegData, {
  useTArray: true,           // Use typed arrays
  formatAsRGBA: true,        // Output RGBA (default) vs RGB
  colorTransform: undefined, // Auto-detect color transform
  tolerantDecoding: true,    // Handle malformed data
  maxResolutionInMP: 100,    // Max megapixels
  maxMemoryUsageInMB: 512,   // Max memory
})
```

## Output Format

### RGBA Output (Default)

```typescript
const image = decode(jpegData, { formatAsRGBA: true })

// 4 bytes per pixel: R, G, B, A
console.log(image.data.length) // width * height * 4

// Access pixel at (x, y)
function getPixel(image, x, y) {
  const offset = (y * image.width + x) * 4
  return {
    r: image.data[offset + 0],
    g: image.data[offset + 1],
    b: image.data[offset + 2],
    a: image.data[offset + 3], // Always 255 for JPEG
  }
}
```

### RGB Output

```typescript
const image = decode(jpegData, { formatAsRGBA: false })

// 3 bytes per pixel: R, G, B
console.log(image.data.length) // width * height * 3
```

## Supported JPEG Formats

| Format | Support |
|--------|---------|
| Baseline DCT (SOF0) | Full |
| Extended DCT (SOF1) | Full |
| Progressive DCT (SOF2) | Full |
| Grayscale | Full |
| YCbCr | Full |
| CMYK | Full |
| JFIF | Full |
| EXIF | Full |

## Extracting Metadata

### EXIF Data

```typescript
const image = decode(jpegData)

if (image.exifBuffer) {
  console.log('EXIF found:', image.exifBuffer.byteLength, 'bytes')

  // Parse EXIF with a library like exif-js
  // const exif = parseExif(image.exifBuffer)
}
```

### Comments

```typescript
const image = decode(jpegData)

if (image.comments && image.comments.length > 0) {
  console.log('Comments found:')
  image.comments.forEach((comment, i) => {
    console.log(`  ${i + 1}: ${comment}`)
  })
}
```

## Memory Management

### Resolution Limits

Prevent memory exhaustion with large images:

```typescript
// Limit to 50 megapixels (e.g., 7071 x 7071)
const image = decode(jpegData, {
  maxResolutionInMP: 50,
})
```

### Memory Limits

```typescript
// Limit memory to 256MB
const image = decode(jpegData, {
  maxMemoryUsageInMB: 256,
})
```

### Error on Exceed

```typescript
try {
  const image = decode(largeJpegData, {
    maxResolutionInMP: 25,
    maxMemoryUsageInMB: 128,
  })
}
catch (error) {
  if (error.message.includes('maxResolutionInMP')) {
    console.error('Image resolution too high')
  }
  if (error.message.includes('maxMemoryUsageInMB')) {
    console.error('Image would use too much memory')
  }
}
```

## Color Space Handling

### Auto Detection

```typescript
// Let jpgx detect the correct color space
const image = decode(jpegData, {
  colorTransform: undefined, // Auto (default)
})
```

### Force Transform

```typescript
// Force YCbCr to RGB transformation
const image = decode(jpegData, {
  colorTransform: true,
})

// Skip color transformation
const image = decode(jpegData, {
  colorTransform: false,
})
```

## Tolerant Decoding

Handle damaged or malformed JPEG files:

```typescript
// Enable tolerant mode (default)
const image = decode(damagedJpegData, {
  tolerantDecoding: true,
})

// Strict mode - fail on any error
try {
  const image = decode(jpegData, {
    tolerantDecoding: false,
  })
}
catch (error) {
  console.error('JPEG is malformed:', error.message)
}
```

## Browser Usage

### From File Input

```typescript
const input = document.querySelector('input[type="file"]')

input.addEventListener('change', async (e) => {
  const file = e.target.files[0]
  const buffer = await file.arrayBuffer()
  const image = decode(new Uint8Array(buffer))

  console.log(`Loaded ${image.width}x${image.height} image`)
})
```

### To Canvas

```typescript
const image = decode(jpegData)

const canvas = document.createElement('canvas')
canvas.width = image.width
canvas.height = image.height

const ctx = canvas.getContext('2d')
const imageData = new ImageData(
  new Uint8ClampedArray(image.data),
  image.width,
  image.height
)

ctx.putImageData(imageData, 0, 0)
document.body.appendChild(canvas)
```

### From URL

```typescript
async function loadJpegFromUrl(url: string) {
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  return decode(new Uint8Array(buffer))
}

const image = await loadJpegFromUrl('https://example.com/image.jpg')
```

## Error Handling

```typescript
try {
  const image = decode(jpegData)
}
catch (error) {
  if (error.message.includes('SOI not found')) {
    console.error('Not a valid JPEG file')
  }
  else if (error.message.includes('maxMemoryUsageInMB')) {
    console.error('Image too large to decode')
  }
  else if (error.message.includes('maxResolutionInMP')) {
    console.error('Image resolution too high')
  }
  else if (error.message.includes('Unsupported color mode')) {
    console.error('Unsupported JPEG format')
  }
  else {
    console.error('Decoding failed:', error.message)
  }
}
```

## Complete Example

```typescript
import { decode } from 'jpgx'

async function processJpeg(path: string) {
  // Read file
  const data = await Bun.file(path).arrayBuffer()

  // Decode with options
  const image = decode(new Uint8Array(data), {
    formatAsRGBA: true,
    maxResolutionInMP: 50,
    maxMemoryUsageInMB: 256,
  })

  // Log info
  console.log(`Image: ${path}`)
  console.log(`  Size: ${image.width}x${image.height}`)
  console.log(`  Pixels: ${image.width * image.height}`)
  console.log(`  Data: ${image.data.length} bytes`)

  if (image.exifBuffer) {
    console.log(`  EXIF: ${image.exifBuffer.byteLength} bytes`)
  }

  if (image.comments) {
    console.log(`  Comments: ${image.comments.length}`)
  }

  return image
}

const image = await processJpeg('photo.jpg')
```

## Next Steps

- [Quality Settings](/features/quality-settings) - Encoding quality
- [Metadata Handling](/features/metadata-handling) - Work with EXIF
- [Performance](/advanced/performance) - Optimize decoding
