<p align="center"><img src=".github/art/cover.jpg" alt="Social Card of this repo"></p>

[![npm version][npm-version-src]][npm-version-href]
[![GitHub Actions][github-actions-src]][github-actions-href]
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
<!-- [![npm downloads][npm-downloads-src]][npm-downloads-href] -->
<!-- [![Codecov][codecov-src]][codecov-href] -->

# jpgx

> A TypeScript library for encoding & decoding JPEG images with robust memory management.

## Features

- 📸 **Complete JPEG Support**: Full implementation of JPEG encoding and decoding
- 🎨 **Color Space Handling**: Support for RGB, CMYK, and Grayscale color spaces
- 🔍 **EXIF Data**: Preserve and extract EXIF metadata
- 💾 **Memory Safe**: Built-in memory management to prevent OOM errors
- 🎯 **Quality Control**: Fine-tune compression quality for optimal file size
- 💪 **Type Safe**: Written in TypeScript with comprehensive type definitions
- ⚡ **Efficient**: Optimized DCT and color transformation algorithms
- 🛡️ **Error Handling**: Robust error handling for malformed JPEG data
- 📦 **Lightweight**: Zero dependencies and minimal footprint
- 🌐 **Browser & Server**: Works in both environments with no extra setup

## Installation

```bash
npm install jpgx
# or
pnpm add jpgx
# or
bun i jpgx
```

## Usage

### Decoding JPEG Images

```ts
import { decode } from 'jpgx'

// Basic decoding
const jpegBuffer = await fetch('image.jpg').then(res => res.arrayBuffer())
const image = decode(jpegBuffer)
console.log(`Dimensions: ${image.width}x${image.height}`)

// Advanced decoding with options
const image = decode(jpegBuffer, {
  colorTransform: true, // Force color space transformation
  formatAsRGBA: true, // Output in RGBA format
  maxResolutionInMP: 100, // Limit max resolution to 100 megapixels
  maxMemoryUsageInMB: 512 // Limit memory usage to 512MB
})

// Access image data
const { width, height, data, exifBuffer, comments } = image
```

### Encoding JPEG Images

```ts
import { JPEGEncoder } from 'jpgx'

// Create an encoder with quality setting (1-100)
const encoder = new JPEGEncoder(85) // 85% quality

// Prepare image data
const width = 800
const height = 600
const rgbData = new Uint8Array(width * height * 3) // RGB data

// Encode the image
const jpegData = encoder.encode({
  width,
  height,
  data: rgbData,
  comments: ['Created with jpgx'],
  exifBuffer: existingExifData // Optional
})

// Save or process the encoded JPEG
await fs.writeFile('output.jpg', jpegData)
```

### Memory Management

The library includes built-in memory management to prevent out-of-memory errors:

```ts
import { decode, JpegImage } from 'jpgx'

// Set global memory limits
JpegImage.resetMaxMemoryUsage(512 * 1024 * 1024) // 512MB limit

try {
  const image = decode(largeJpegBuffer, {
    maxMemoryUsageInMB: 256, // Per-operation limit
    maxResolutionInMP: 50 // Max 50 megapixels
  })
}
catch (err) {
  if (err instanceof TypeError) {
    console.error('Memory allocation failed:', err.message)
  }
}
```

### Working with Color Spaces

```ts
// Decode with color space control
const rgbImage = decode(jpegBuffer, {
  colorTransform: true // Force RGB color space
})

const cmykImage = decode(jpegBuffer, {
  colorTransform: false // Keep CMYK for print workflows
})

// Handle grayscale images
const grayscaleImage = decode(jpegBuffer)
if (grayscaleImage.data.length === width * height) {
  console.log('Single channel grayscale image')
}
```

### EXIF Data Handling

```ts
// Extract EXIF data
const image = decode(jpegBuffer)
if (image.exifBuffer) {
  console.log('EXIF data length:', image.exifBuffer.length)
}

// Preserve EXIF when encoding
const encoder = new JPEGEncoder(90)
const newJpeg = encoder.encode({
  width: image.width,
  height: image.height,
  data: modifiedImageData,
  exifBuffer: image.exifBuffer // Preserve original EXIF
})
```

## Error Handling

The library provides detailed error messages for common issues:

```ts
try {
  const image = decode(corruptedBuffer)
}
catch (err) {
  if (err.message.includes('marker was not found')) {
    console.error('Invalid JPEG format')
  }
  else if (err.message.includes('maxResolutionInMP')) {
    console.error('Image too large')
  }
  else if (err.message.includes('maxMemoryUsageInMB')) {
    console.error('Insufficient memory')
  }
}
```

## TypeScript Support

Full TypeScript support with detailed type definitions:

```ts
import { Buffer } from 'node:buffer'

interface JpegOptions {
  colorTransform?: boolean
  formatAsRGBA?: boolean
  tolerantDecoding?: boolean
  maxResolutionInMP?: number
  maxMemoryUsageInMB?: number
}

interface ImageData {
  width: number
  height: number
  data: Uint8Array | Buffer
  exifBuffer?: Uint8Array
  comments?: string[]
}

// Types are automatically inferred
const { width, height, data } = decode(jpegBuffer)
```

## Testing

```bash
bun test
```

## Changelog

Please see our [releases](https://github.com/stackjs/jpgx/releases) page for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](.github/CONTRIBUTING.md) for details.

## Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub](https://github.com/stacksjs/jpgx/discussions)

For casual chit-chat with others using this package:

[Join the Stacks Discord Server](https://discord.gg/stacksjs)

## Postcardware

Stacks OSS will always stay open-sourced, and we will always love to receive postcards from wherever Stacks is used! _And we also publish them on our website._

Our address: Stacks.js, 12665 Village Ln #2306, Playa Vista, CA 90094, United States 🌎

## Credits

Many thanks to [`jpeg-js`](https://github.com/jpeg-js/jpeg-js) and its contributors for inspiring this project.

## Sponsors

We would like to extend our thanks to the following sponsors for funding Stacks development. If you are interested in becoming a sponsor, please reach out to us.

- [JetBrains](https://www.jetbrains.com/)
- [The Solana Foundation](https://solana.com/)

## License

The MIT License (MIT). Please see [LICENSE](LICENSE.md) for more information.

Made with 💙

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/jpgx?style=flat-square
[npm-version-href]: https://npmjs.com/package/jpgx
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/stacksjs/jpgx/ci.yml?style=flat-square&branch=main
[github-actions-href]: https://github.com/stacksjs/jpgx/actions?query=workflow%3Aci

<!-- [codecov-src]: https://img.shields.io/codecov/c/gh/stacksjs/jpgx/main?style=flat-square
[codecov-href]: https://codecov.io/gh/stacksjs/jpgx -->
