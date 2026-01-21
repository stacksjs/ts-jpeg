# Configuration

jpgx provides configuration options for both encoding and decoding operations.

## Encoder Options

The `encode` function accepts raw image data and an optional quality parameter:

```typescript
import { encode } from 'jpgx'

const result = encode(imageData, quality)
```

### Image Data Structure

```typescript
interface RawImageData {
  width: number           // Image width in pixels
  height: number          // Image height in pixels
  data: Uint8Array        // RGBA pixel data
  comments?: string[]     // Optional comments to embed
  exifBuffer?: Uint8Array // Optional EXIF data to preserve
}
```

### Quality Parameter

| Value | Description |
|-------|-------------|
| 1-30 | Low quality, small file size |
| 31-60 | Medium quality, balanced |
| 61-85 | Good quality, recommended for web |
| 86-95 | High quality, larger files |
| 96-100 | Maximum quality, archival |

Default quality is 50 if not specified.

## Decoder Options

The `decode` function accepts JPEG data and optional configuration:

```typescript
import { decode } from 'jpgx'

const image = decode(jpegData, options)
```

### Decoder Options Interface

```typescript
interface DecoderOptions {
  useTArray: boolean          // Use typed arrays (default: false)
  colorTransform?: boolean    // Apply color transformation
  formatAsRGBA?: boolean      // Output as RGBA (default: true)
  tolerantDecoding?: boolean  // Tolerate malformed data (default: true)
  maxResolutionInMP?: number  // Max megapixels (default: 100)
  maxMemoryUsageInMB?: number // Max memory in MB (default: 512)
}
```

### Option Details

#### `useTArray`

When `true`, uses typed arrays for output data. Useful for performance-critical applications.

```typescript
const image = decode(jpegData, { useTArray: true })
```

#### `colorTransform`

Controls color space transformation:

- `undefined`: Auto-detect based on image metadata
- `true`: Always transform (YCbCr to RGB)
- `false`: Skip transformation

```typescript
const image = decode(jpegData, { colorTransform: true })
```

#### `formatAsRGBA`

When `true` (default), outputs RGBA data (4 bytes per pixel). When `false`, outputs RGB data (3 bytes per pixel).

```typescript
// RGBA output (default)
const rgba = decode(jpegData, { formatAsRGBA: true })
// data.length = width * height * 4

// RGB output
const rgb = decode(jpegData, { formatAsRGBA: false })
// data.length = width * height * 3
```

#### `tolerantDecoding`

When `true` (default), attempts to decode malformed or damaged JPEG files.

```typescript
const image = decode(jpegData, { tolerantDecoding: true })
```

#### `maxResolutionInMP`

Maximum allowed image resolution in megapixels. Prevents memory exhaustion from extremely large images.

```typescript
// Allow up to 50 megapixel images
const image = decode(jpegData, { maxResolutionInMP: 50 })
```

#### `maxMemoryUsageInMB`

Maximum memory allocation in megabytes during decoding.

```typescript
// Limit memory to 256MB
const image = decode(jpegData, { maxMemoryUsageInMB: 256 })
```

## Default Configuration

```typescript
const defaultDecoderOptions = {
  colorTransform: undefined,
  useTArray: false,
  formatAsRGBA: true,
  tolerantDecoding: true,
  maxResolutionInMP: 100,
  maxMemoryUsageInMB: 512,
}
```

## Output Structures

### Encoded Output

```typescript
interface BufferRet {
  data: Buffer | Uint8ClampedArray
  width: number
  height: number
}
```

### Decoded Output

```typescript
interface DecodedImage {
  width: number
  height: number
  data: Uint8ClampedArray
  exifBuffer?: ArrayBuffer
  comments?: string[]
  colorSpace?: 'srgb'
}
```

## Example Configurations

### Web Optimization

```typescript
// Optimized for web delivery
const result = encode(imageData, 75)
```

### Thumbnail Generation

```typescript
// Low quality for thumbnails
const result = encode(imageData, 40)
```

### Archival Quality

```typescript
// Maximum quality for archival
const result = encode(imageData, 100)
```

### Memory-Constrained Environment

```typescript
// Limit resource usage
const image = decode(jpegData, {
  maxResolutionInMP: 25,
  maxMemoryUsageInMB: 128,
})
```

### Strict Decoding

```typescript
// Fail on malformed data
const image = decode(jpegData, {
  tolerantDecoding: false,
})
```

## Next Steps

- [JPEG Encoding](/features/jpeg-encoding) - Deep dive into encoding
- [JPEG Decoding](/features/jpeg-decoding) - Deep dive into decoding
- [Performance](/advanced/performance) - Optimization tips
