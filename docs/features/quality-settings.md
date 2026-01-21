# Quality Settings

jpgx provides fine-grained control over JPEG encoding quality. This guide explains how quality affects output and how to choose the right setting.

## Quality Parameter

The quality parameter ranges from 1 to 100:

```typescript
import { encode } from 'jpgx'

// Quality 1-100
const result = encode(imageData, 75)
```

## Quality Ranges

| Range | Description | Use Case |
|-------|-------------|----------|
| 1-30 | Very low | Tiny previews, placeholders |
| 31-50 | Low | Thumbnails, list views |
| 51-70 | Medium | Web images, general use |
| 71-85 | High | Photography, detail needed |
| 86-95 | Very high | Professional, printing |
| 96-100 | Maximum | Archival, no compression |

## Quality vs File Size

Quality affects file size exponentially:

```typescript
// Example file sizes for 1920x1080 image
// Quality 30:  ~50 KB
// Quality 50:  ~100 KB
// Quality 70:  ~200 KB
// Quality 85:  ~400 KB
// Quality 95:  ~800 KB
// Quality 100: ~1.5 MB
```

### Compare Quality Levels

```typescript
import { encode } from 'jpgx'

function compareQualities(imageData: RawImageData) {
  const qualities = [30, 50, 70, 85, 95, 100]

  for (const quality of qualities) {
    const result = encode(imageData, quality)
    const sizeKB = Math.round(result.data.length / 1024)
    console.log(`Quality ${quality}: ${sizeKB} KB`)
  }
}
```

## Visual Quality

### Low Quality (1-30)

- Visible compression artifacts
- Block patterns visible
- Color banding
- Suitable for small thumbnails

### Medium Quality (50-70)

- Minor artifacts on close inspection
- Good for most web images
- Balance of size and quality

### High Quality (85-95)

- Minimal visible artifacts
- Suitable for photography
- Detail preserved

### Maximum Quality (100)

- No additional compression artifacts
- Largest file size
- Use for archival only

## Choosing Quality

### For Web

```typescript
// Hero images
const hero = encode(imageData, 80)

// Content images
const content = encode(imageData, 75)

// Thumbnails
const thumb = encode(imageData, 60)

// List items
const listItem = encode(imageData, 50)
```

### For Mobile

```typescript
// Optimize for mobile bandwidth
const mobileQuality = 65

// Even lower for slow connections
const slowQuality = 45
```

### For Print

```typescript
// Print quality (300 DPI)
const print = encode(imageData, 95)

// Maximum for archival
const archive = encode(imageData, 100)
```

## Adaptive Quality

Choose quality based on image content:

```typescript
function getAdaptiveQuality(width: number, height: number): number {
  const pixels = width * height

  if (pixels < 100000) {
    // Small images need higher quality
    return 85
  }
  else if (pixels < 500000) {
    // Medium images
    return 75
  }
  else if (pixels < 2000000) {
    // Large images
    return 70
  }
  else {
    // Very large images
    return 65
  }
}
```

## Quality and Content Type

### Photographs

- Use 75-85 for web
- Use 90-95 for print
- Complex detail hides artifacts

```typescript
const photo = encode(photoData, 80)
```

### Graphics/Screenshots

- Use higher quality (85-95)
- Sharp edges show artifacts more
- Text needs higher quality

```typescript
const screenshot = encode(screenshotData, 90)
```

### Icons/Logos

- Consider PNG instead
- If JPEG, use 90-100
- Artifacts very visible

```typescript
const logo = encode(logoData, 95)
```

## Quality Presets

```typescript
const QualityPresets = {
  thumbnail: 50,
  preview: 60,
  web: 75,
  highQuality: 85,
  print: 92,
  archival: 100,
} as const

function encodeWithPreset(imageData, preset: keyof typeof QualityPresets) {
  return encode(imageData, QualityPresets[preset])
}

// Usage
const webImage = encodeWithPreset(imageData, 'web')
const printImage = encodeWithPreset(imageData, 'print')
```

## Target File Size

Encode to approximate file size:

```typescript
async function encodeToTargetSize(
  imageData: RawImageData,
  targetKB: number,
  minQuality = 30,
  maxQuality = 95
): Promise<{ data: Uint8Array, quality: number }> {
  let low = minQuality
  let high = maxQuality
  let bestResult = encode(imageData, high)
  let bestQuality = high

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const result = encode(imageData, mid)
    const sizeKB = result.data.length / 1024

    if (sizeKB <= targetKB) {
      bestResult = result
      bestQuality = mid
      low = mid + 1
    }
    else {
      high = mid - 1
    }
  }

  return { data: bestResult.data, quality: bestQuality }
}

// Encode to approximately 100KB
const { data, quality } = await encodeToTargetSize(imageData, 100)
console.log(`Achieved quality ${quality}`)
```

## Performance Considerations

Higher quality has minimal impact on encoding speed:

```typescript
// Quality 30 and 95 have similar encoding time
// The difference is mainly in output size
```

## Next Steps

- [Metadata Handling](/features/metadata-handling) - Preserve EXIF data
- [JPEG Encoding](/features/jpeg-encoding) - Full encoding guide
- [Performance](/advanced/performance) - Optimize processing
