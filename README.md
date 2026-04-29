<p align="center"><img src=".github/art/cover.jpg" alt="Social Card of this repo"></p>

[![npm version][npm-version-src]][npm-version-href]
[![GitHub Actions][github-actions-src]][github-actions-href]
[![Commitizen friendly][commitizen-src]][commitizen-href]
<!-- [![npm downloads][npm-downloads-src]][npm-downloads-href] -->
<!-- [![Codecov][codecov-src]][codecov-href] -->

# ts-jpeg

> A TypeScript library for encoding & decoding JPEG images with robust memory management.

## Features

- 📸 **Complete JPEG Support** _Full implementation of JPEG encoding and decoding_
- 🎨 **Color Space Handling** _Support for RGB, CMYK, and Grayscale color spaces_
- 🔍 **EXIF Data** _Preserve and extract EXIF metadata_
- 💾 **Memory Safe** _Built-in memory management to prevent OOM errors_
- 🎯 **Quality Control** _Fine-tune compression quality for optimal file size_
- 💪 **Type Safe** _Written in TypeScript with comprehensive type definitions_
- ⚡ **Efficient** _Optimized DCT and color transformation algorithms_
- 🛡️ **Error Handling** _Robust error handling for malformed JPEG data_
- 📦 **Lightweight** _Zero dependencies and minimal footprint_
- 🌐 **Browser & Server** _Works in both environments with no extra setup_

## Installation

```bash
npm install ts-jpeg
# or
pnpm add ts-jpeg
# or
bun i ts-jpeg
```

## Usage

### Decoding JPEG Images

```ts
import { decode } from 'ts-jpeg'

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
import { JPEGEncoder } from 'ts-jpeg'

// Create an encoder with quality setting (1-100)
const encoder = new JPEGEncoder(85) // 85% quality

// Prepare image data
const width = 800
const height = 600
const rgbData = new Uint8Array(width _ height _ 3) // RGB data

// Encode the image
const jpegData = encoder.encode({
  width,
  height,
  data: rgbData,
  comments: ['Created with ts-jpeg'],
  exifBuffer: existingExifData // Optional
})

// Save or process the encoded JPEG
await fs.writeFile('output.jpg', jpegData)
```

### Memory Management

The library includes built-in memory management to prevent out-of-memory errors:

```ts
import { decode, JpegImage } from 'ts-jpeg'

// Set global memory limits
JpegImage.resetMaxMemoryUsage(512 _ 1024 _ 1024) // 512MB limit

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

Please see our [releases][releases-href] page for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING][contributing-href] for details.

## Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub][discussions-href]

For casual chit-chat with others using this package:

[Join the Stacks Discord Server][discord-href]

## Postcardware

“Software that is free, but hopes for a postcard.” We love receiving postcards from around the world showing where `ts-jpeg` is being used! We showcase them on our website too.

Our address: Stacks.js, 12665 Village Ln #2306, Playa Vista, CA 90094, United States 🌎

## Credits

Many thanks to [`jpeg-js`][jpeg-js-href] and its contributors for inspiring this project.

## Sponsors

We would like to extend our thanks to the following sponsors for funding Stacks development. If you are interested in becoming a sponsor, please reach out to us.

- [JetBrains][jetbrains-href]
- [The Solana Foundation][solana-href]

## License

The MIT License (MIT). Please see [LICENSE][license-href] for more information.

Made with 💙

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/ts-jpeg?style=flat-square
[npm-version-href]: https://npmjs.com/package/ts-jpeg
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/stacksjs/ts-jpeg/ci.yml?style=flat-square&branch=main
[github-actions-href]: https://github.com/stacksjs/ts-jpeg/actions?query=workflow%3Aci

<!-- [codecov-src]: https://img.shields.io/codecov/c/gh/stacksjs/ts-jpeg/main?style=flat-square
[codecov-href]: https://codecov.io/gh/stacksjs/ts-jpeg -->
[commitizen-src]: https://img.shields.io/badge/commitizen-friendly-brightgreen.svg
[commitizen-href]: http://commitizen.github.io/cz-cli/
[releases-href]: https://github.com/stackjs/ts-jpeg/releases
[contributing-href]: .github/CONTRIBUTING.md
[discussions-href]: https://github.com/stacksjs/ts-jpeg/discussions
[discord-href]: https://discord.gg/stacksjs
[jpeg-js-href]: https://github.com/jpeg-js/jpeg-js
[jetbrains-href]: https://www.jetbrains.com/
[solana-href]: https://solana.com/
[license-href]: LICENSE.md
