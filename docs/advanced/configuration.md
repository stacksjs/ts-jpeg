# Advanced Configuration

This guide covers advanced configuration options for jpgx, including custom profiles, memory management, and performance tuning.

## Encoder Configuration

### Complete Encoder Options

```typescript
import { encode } from 'jpgx'

// Full configuration
const result = encode({
  width: 800,
  height: 600,
  data: imageData,       // RGBA Uint8Array
  comments: [],          // Optional comments
  exifBuffer: undefined, // Optional EXIF data
}, quality)
```

### Quality Profiles

Create reusable quality configurations:

```typescript
const QualityProfiles = {
  thumbnail: 40,
  preview: 55,
  web: 75,
  highQuality: 85,
  print: 92,
  lossless: 100,
}

function encodeWithProfile(
  imageData: RawImageData,
  profile: keyof typeof QualityProfiles
) {
  return encode(imageData, QualityProfiles[profile])
}

// Usage
const webImage = encodeWithProfile(data, 'web')
const printImage = encodeWithProfile(data, 'print')
```

## Decoder Configuration

### Full Decoder Options

```typescript
import { decode } from 'jpgx'

const image = decode(jpegData, {
  // Output format
  useTArray: false,       // Use typed arrays
  formatAsRGBA: true,     // Output RGBA (vs RGB)

  // Color handling
  colorTransform: undefined, // Auto-detect

  // Error handling
  tolerantDecoding: true, // Handle malformed data

  // Memory limits
  maxResolutionInMP: 100, // Max megapixels
  maxMemoryUsageInMB: 512, // Max memory
})
```

### Memory Profiles

```typescript
const MemoryProfiles = {
  constrained: {
    maxResolutionInMP: 10,
    maxMemoryUsageInMB: 64,
  },
  standard: {
    maxResolutionInMP: 50,
    maxMemoryUsageInMB: 256,
  },
  unlimited: {
    maxResolutionInMP: 200,
    maxMemoryUsageInMB: 2048,
  },
}

function decodeWithProfile(
  data: Uint8Array,
  profile: keyof typeof MemoryProfiles
) {
  return decode(data, {
    ...MemoryProfiles[profile],
    formatAsRGBA: true,
    tolerantDecoding: true,
  })
}
```

## Configuration Factory

### Environment-Based Configuration

```typescript
interface JpgxConfig {
  encoder: {
    quality: number
    preserveExif: boolean
  }
  decoder: {
    maxResolutionInMP: number
    maxMemoryUsageInMB: number
    tolerantDecoding: boolean
  }
}

function createConfig(env: 'development' | 'production' | 'ci'): JpgxConfig {
  const base: JpgxConfig = {
    encoder: {
      quality: 75,
      preserveExif: true,
    },
    decoder: {
      maxResolutionInMP: 100,
      maxMemoryUsageInMB: 512,
      tolerantDecoding: true,
    },
  }

  if (env === 'ci') {
    base.decoder.tolerantDecoding = false
    base.decoder.maxResolutionInMP = 50
  }

  if (env === 'development') {
    base.encoder.quality = 85
  }

  return base
}
```

### Config Builder

```typescript
class JpgxConfigBuilder {
  private config: Partial<DecoderOptions> = {}

  maxResolution(mp: number): this {
    this.config.maxResolutionInMP = mp
    return this
  }

  maxMemory(mb: number): this {
    this.config.maxMemoryUsageInMB = mb
    return this
  }

  outputRgb(): this {
    this.config.formatAsRGBA = false
    return this
  }

  outputRgba(): this {
    this.config.formatAsRGBA = true
    return this
  }

  strict(): this {
    this.config.tolerantDecoding = false
    return this
  }

  tolerant(): this {
    this.config.tolerantDecoding = true
    return this
  }

  build(): DecoderOptions {
    return this.config as DecoderOptions
  }
}

// Usage
const config = new JpgxConfigBuilder()
  .maxResolution(50)
  .maxMemory(256)
  .outputRgba()
  .tolerant()
  .build()

const image = decode(jpegData, config)
```

## Color Space Configuration

### Auto Detection

```typescript
// Let jpgx detect color space from JFIF/Adobe markers
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

// Keep original color values (no transformation)
const raw = decode(jpegData, {
  colorTransform: false,
})
```

## Error Handling Configuration

### Strict Mode

```typescript
try {
  const image = decode(jpegData, {
    tolerantDecoding: false,
  })
}
catch (error) {
  console.error('Strict validation failed:', error.message)
}
```

### Tolerant Mode with Logging

```typescript
function decodeSafe(data: Uint8Array) {
  try {
    return {
      success: true,
      image: decode(data, { tolerantDecoding: true }),
      warnings: [],
    }
  }
  catch (error) {
    return {
      success: false,
      image: null,
      warnings: [error.message],
    }
  }
}
```

## Output Configuration

### RGB vs RGBA

```typescript
// RGBA output (4 bytes per pixel, alpha always 255)
const rgba = decode(jpegData, { formatAsRGBA: true })
console.log(rgba.data.length) // width * height * 4

// RGB output (3 bytes per pixel, saves 25% memory)
const rgb = decode(jpegData, { formatAsRGBA: false })
console.log(rgb.data.length) // width * height * 3
```

### Typed Arrays

```typescript
// Use typed arrays for performance
const image = decode(jpegData, {
  useTArray: true,
})
```

## Configuration Best Practices

1. Set appropriate memory limits for your environment
2. Use RGB format when alpha channel is not needed
3. Enable strict mode in CI/test environments
4. Create reusable profiles for consistent processing
5. Configure quality based on use case requirements

## Next Steps

- [Custom Profiles](/advanced/custom-profiles) - Create reusable profiles
- [Performance](/advanced/performance) - Optimize processing
- [CI/CD Integration](/advanced/ci-cd-integration) - Automation
