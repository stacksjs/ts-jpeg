# Metadata Handling

jpgx supports reading and preserving JPEG metadata including EXIF data, comments, and JFIF information. This guide covers working with metadata.

## Types of Metadata

| Type | Description | Use Case |
|------|-------------|----------|
| EXIF | Camera settings, GPS, timestamps | Photography |
| JFIF | Basic image info | Standard JPEG |
| Comments | Arbitrary text | Notes, copyright |
| Adobe | Color profile info | Design work |

## Reading Metadata

### EXIF Data

```typescript
import { decode } from 'jpgx'

const image = decode(jpegData)

if (image.exifBuffer) {
  console.log('EXIF data found')
  console.log('Size:', image.exifBuffer.byteLength, 'bytes')

  // The raw EXIF buffer can be parsed with an EXIF library
  // or preserved when re-encoding
}
```

### Comments

```typescript
const image = decode(jpegData)

if (image.comments && image.comments.length > 0) {
  console.log('Comments:')
  image.comments.forEach((comment, index) => {
    console.log(`  [${index + 1}] ${comment}`)
  })
}
```

## Writing Metadata

### Adding Comments

```typescript
import { encode } from 'jpgx'

const result = encode({
  width: 800,
  height: 600,
  data: imageData,
  comments: [
    'Created with jpgx',
    'Author: John Doe',
    'Date: 2025-01-15',
  ],
}, 85)
```

### Preserving EXIF

When re-encoding, preserve original EXIF data:

```typescript
import { encode, decode } from 'jpgx'

// Decode original
const original = decode(originalJpegData)

// Process the image...
const processedData = processImage(original.data)

// Re-encode with preserved EXIF
const result = encode({
  width: original.width,
  height: original.height,
  data: processedData,
  exifBuffer: original.exifBuffer, // Preserve EXIF
  comments: original.comments,      // Preserve comments
}, 85)
```

## EXIF Data Structure

The EXIF buffer contains raw EXIF data. Common fields include:

| Field | Description |
|-------|-------------|
| Make | Camera manufacturer |
| Model | Camera model |
| DateTime | Capture timestamp |
| ExposureTime | Shutter speed |
| FNumber | Aperture |
| ISO | Sensitivity |
| FocalLength | Lens focal length |
| GPSLatitude | GPS coordinates |
| GPSLongitude | GPS coordinates |
| Orientation | Image rotation |

### Parsing EXIF

jpgx returns raw EXIF bytes. Use a library like `exif-js` to parse:

```typescript
// Example with a hypothetical EXIF parser
import { decode } from 'jpgx'
import { parseExif } from 'exif-parser-library'

const image = decode(jpegData)

if (image.exifBuffer) {
  const exif = parseExif(image.exifBuffer)

  console.log('Camera:', exif.Make, exif.Model)
  console.log('Date:', exif.DateTime)
  console.log('Settings:', `f/${exif.FNumber}`, `ISO ${exif.ISO}`)

  if (exif.GPSLatitude && exif.GPSLongitude) {
    console.log('Location:', exif.GPSLatitude, exif.GPSLongitude)
  }
}
```

## Common Workflows

### Strip All Metadata

For privacy or smaller files:

```typescript
const original = decode(jpegData)

// Re-encode without metadata
const stripped = encode({
  width: original.width,
  height: original.height,
  data: original.data,
  // Don't include exifBuffer or comments
}, 85)
```

### Transfer Metadata

Copy metadata from one image to another:

```typescript
const source = decode(sourceJpegData)
const target = decode(targetJpegData)

// Re-encode target with source's metadata
const result = encode({
  width: target.width,
  height: target.height,
  data: target.data,
  exifBuffer: source.exifBuffer,
  comments: source.comments,
}, 85)
```

### Add Copyright

Add copyright info to images:

```typescript
const image = decode(jpegData)

const result = encode({
  width: image.width,
  height: image.height,
  data: image.data,
  exifBuffer: image.exifBuffer,
  comments: [
    ...(image.comments || []),
    `Copyright ${new Date().getFullYear()} Your Name`,
    'All rights reserved',
  ],
}, 85)
```

## JFIF Information

The decoder extracts JFIF header information:

```typescript
const image = decode(jpegData)

// JFIF data is used internally for:
// - Version information
// - Density units (DPI)
// - Pixel aspect ratio
// - Thumbnail data (if present)
```

## Adobe Marker

For images with Adobe color profiles:

```typescript
const image = decode(jpegData)

// Adobe marker data is used for:
// - Color transform information
// - CMYK color handling
```

## Batch Processing

Process multiple images while preserving metadata:

```typescript
async function processImages(paths: string[]) {
  for (const path of paths) {
    const data = await Bun.file(path).arrayBuffer()
    const image = decode(new Uint8Array(data))

    // Process image...
    const processed = applyFilter(image.data)

    // Save with preserved metadata
    const result = encode({
      width: image.width,
      height: image.height,
      data: processed,
      exifBuffer: image.exifBuffer,
      comments: image.comments,
    }, 85)

    await Bun.write(path.replace('.jpg', '_processed.jpg'), result.data)
  }
}
```

## Privacy Considerations

EXIF data can contain sensitive information:

- GPS coordinates (location)
- Date/time (when photo was taken)
- Device information
- Thumbnail of original image

Always strip metadata before sharing publicly if needed:

```typescript
function stripForPublic(jpegData: Uint8Array): Uint8Array {
  const image = decode(jpegData)

  return encode({
    width: image.width,
    height: image.height,
    data: image.data,
    // No exifBuffer
    // No comments (or add generic copyright only)
    comments: ['Public domain'],
  }, 85).data
}
```

## Next Steps

- [Configuration](/config) - Full configuration options
- [JPEG Encoding](/features/jpeg-encoding) - Complete encoding guide
- [Performance](/advanced/performance) - Optimize processing
