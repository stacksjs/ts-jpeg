# Custom Profiles

This guide covers creating and using custom encoding/decoding profiles for jpgx to standardize image processing across your application.

## Encoding Profiles

### Quality Profiles

```typescript
interface EncodingProfile {
  name: string
  quality: number
  description: string
}

const encodingProfiles: Record<string, EncodingProfile> = {
  thumbnail: {
    name: 'Thumbnail',
    quality: 40,
    description: 'Small preview images',
  },
  web: {
    name: 'Web',
    quality: 75,
    description: 'Standard web images',
  },
  highQuality: {
    name: 'High Quality',
    quality: 90,
    description: 'High quality photography',
  },
  archival: {
    name: 'Archival',
    quality: 100,
    description: 'Maximum quality, no compression loss',
  },
}
```

### Profile-Based Encoding

```typescript
import { encode, RawImageData } from 'jpgx'

function encodeWithProfile(
  imageData: RawImageData,
  profileName: keyof typeof encodingProfiles
): Uint8Array {
  const profile = encodingProfiles[profileName]
  if (!profile) {
    throw new Error(`Unknown profile: ${profileName}`)
  }

  const result = encode(imageData, profile.quality)
  return result.data
}

// Usage
const thumbnail = encodeWithProfile(imageData, 'thumbnail')
const webImage = encodeWithProfile(imageData, 'web')
```

## Decoding Profiles

### Memory Profiles

```typescript
interface DecodingProfile {
  name: string
  options: DecoderOptions
  description: string
}

const decodingProfiles: Record<string, DecodingProfile> = {
  constrained: {
    name: 'Constrained',
    options: {
      maxResolutionInMP: 10,
      maxMemoryUsageInMB: 64,
      formatAsRGBA: true,
      tolerantDecoding: true,
    },
    description: 'For memory-limited environments',
  },
  standard: {
    name: 'Standard',
    options: {
      maxResolutionInMP: 50,
      maxMemoryUsageInMB: 256,
      formatAsRGBA: true,
      tolerantDecoding: true,
    },
    description: 'Default processing',
  },
  performance: {
    name: 'Performance',
    options: {
      maxResolutionInMP: 100,
      maxMemoryUsageInMB: 512,
      formatAsRGBA: false, // RGB saves memory
      useTArray: true,     // Faster
      tolerantDecoding: true,
    },
    description: 'Optimized for speed',
  },
  strict: {
    name: 'Strict',
    options: {
      maxResolutionInMP: 100,
      maxMemoryUsageInMB: 512,
      formatAsRGBA: true,
      tolerantDecoding: false, // Fail on errors
    },
    description: 'Validation mode',
  },
}
```

### Profile-Based Decoding

```typescript
import { decode } from 'jpgx'

function decodeWithProfile(
  data: Uint8Array,
  profileName: keyof typeof decodingProfiles
) {
  const profile = decodingProfiles[profileName]
  if (!profile) {
    throw new Error(`Unknown profile: ${profileName}`)
  }

  return decode(data, profile.options)
}

// Usage
const image = decodeWithProfile(jpegData, 'standard')
```

## Combined Profiles

### Full Processing Profiles

```typescript
interface ProcessingProfile {
  name: string
  decode: DecoderOptions
  encode: {
    quality: number
  }
  transform?: (image: DecodedImage) => DecodedImage
}

const processingProfiles: Record<string, ProcessingProfile> = {
  webOptimized: {
    name: 'Web Optimized',
    decode: {
      formatAsRGBA: true,
      maxResolutionInMP: 50,
      tolerantDecoding: true,
    },
    encode: {
      quality: 75,
    },
  },
  thumbnail: {
    name: 'Thumbnail',
    decode: {
      formatAsRGBA: true,
      maxResolutionInMP: 10,
      tolerantDecoding: true,
    },
    encode: {
      quality: 50,
    },
    // Could add resize transform here
  },
  preserveQuality: {
    name: 'Preserve Quality',
    decode: {
      formatAsRGBA: true,
      tolerantDecoding: false,
    },
    encode: {
      quality: 95,
    },
  },
}
```

### Processing Function

```typescript
import { decode, encode } from 'jpgx'

async function processWithProfile(
  inputData: Uint8Array,
  profileName: keyof typeof processingProfiles,
  preserveMetadata = true
): Promise<Uint8Array> {
  const profile = processingProfiles[profileName]
  if (!profile) {
    throw new Error(`Unknown profile: ${profileName}`)
  }

  // Decode
  const decoded = decode(inputData, profile.decode)

  // Optional transform
  const transformed = profile.transform
    ? profile.transform(decoded)
    : decoded

  // Encode
  const result = encode({
    width: transformed.width,
    height: transformed.height,
    data: transformed.data,
    exifBuffer: preserveMetadata ? decoded.exifBuffer : undefined,
    comments: preserveMetadata ? decoded.comments : undefined,
  }, profile.encode.quality)

  return result.data
}
```

## Use-Case Profiles

### E-commerce

```typescript
const ecommerceProfiles = {
  productMain: {
    decode: { maxResolutionInMP: 25, formatAsRGBA: true },
    encode: { quality: 85 },
    dimensions: { maxWidth: 1200, maxHeight: 1200 },
  },
  productThumb: {
    decode: { maxResolutionInMP: 5, formatAsRGBA: true },
    encode: { quality: 70 },
    dimensions: { width: 200, height: 200 },
  },
  productZoom: {
    decode: { maxResolutionInMP: 50, formatAsRGBA: true },
    encode: { quality: 90 },
    dimensions: { maxWidth: 2400, maxHeight: 2400 },
  },
}
```

### Social Media

```typescript
const socialProfiles = {
  instagram: {
    encode: { quality: 80 },
    dimensions: { width: 1080, height: 1080 },
  },
  twitter: {
    encode: { quality: 85 },
    dimensions: { maxWidth: 1200, maxHeight: 675 },
  },
  facebook: {
    encode: { quality: 80 },
    dimensions: { width: 1200, height: 630 },
  },
  linkedin: {
    encode: { quality: 85 },
    dimensions: { width: 1200, height: 627 },
  },
}
```

### Photography

```typescript
const photographyProfiles = {
  web: {
    encode: { quality: 85 },
    metadata: { preserveExif: true },
    dimensions: { maxWidth: 2048, maxHeight: 2048 },
  },
  print: {
    encode: { quality: 95 },
    metadata: { preserveExif: true },
    dimensions: null, // Original size
  },
  archive: {
    encode: { quality: 100 },
    metadata: { preserveExif: true, preserveComments: true },
    dimensions: null, // Original size
  },
}
```

## Profile Registry

### Central Profile Management

```typescript
class ProfileRegistry {
  private profiles = new Map<string, ProcessingProfile>()

  register(name: string, profile: ProcessingProfile): void {
    this.profiles.set(name, profile)
  }

  get(name: string): ProcessingProfile {
    const profile = this.profiles.get(name)
    if (!profile) {
      throw new Error(`Profile not found: ${name}`)
    }
    return profile
  }

  list(): string[] {
    return Array.from(this.profiles.keys())
  }
}

const registry = new ProfileRegistry()

// Register built-in profiles
registry.register('web', processingProfiles.webOptimized)
registry.register('thumbnail', processingProfiles.thumbnail)

// Register custom profile
registry.register('custom', {
  name: 'Custom',
  decode: { formatAsRGBA: true },
  encode: { quality: 80 },
})
```

## Environment-Specific Profiles

```typescript
function getProfileForEnvironment(): ProcessingProfile {
  const env = process.env.NODE_ENV

  switch (env) {
    case 'development':
      return {
        name: 'Development',
        decode: { tolerantDecoding: true, maxResolutionInMP: 100 },
        encode: { quality: 85 },
      }

    case 'production':
      return {
        name: 'Production',
        decode: { tolerantDecoding: false, maxResolutionInMP: 50 },
        encode: { quality: 75 },
      }

    case 'test':
      return {
        name: 'Test',
        decode: { tolerantDecoding: false, maxResolutionInMP: 10 },
        encode: { quality: 50 },
      }

    default:
      return processingProfiles.webOptimized
  }
}
```

## Next Steps

- [Performance](/advanced/performance) - Optimize processing
- [Configuration](/advanced/configuration) - Detailed settings
- [CI/CD Integration](/advanced/ci-cd-integration) - Automation
