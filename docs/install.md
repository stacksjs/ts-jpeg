# Installation

Installing ts-jpeg is straightforward with any JavaScript package manager.

## Package Managers

### Bun (Recommended)

```bash
bun add ts-jpeg
```

### npm

```bash
npm install ts-jpeg
```

### pnpm

```bash
pnpm add ts-jpeg
```

### Yarn

```bash
yarn add ts-jpeg
```

## Requirements

- **Runtime**: Bun 1.0+, Node.js 18+, or modern browsers
- **TypeScript**: 5.0+ (for TypeScript projects)

## Verify Installation

After installation, verify ts-jpeg is working:

```typescript
import { encode, decode } from 'ts-jpeg'

// Create a simple test image (1x1 red pixel)
const testImage = {
  width: 1,
  height: 1,
  data: new Uint8Array([255, 0, 0, 255]), // RGBA
}

const encoded = encode(testImage, 90)
console.log('Encoded JPEG size:', encoded.data.length, 'bytes')

const decoded = decode(encoded.data)
console.log('Decoded dimensions:', decoded.width, 'x', decoded.height)
```

## Browser Usage

ts-jpeg works in modern browsers without any bundler configuration:

```html
<script type="module">
import { encode, decode } from 'https://esm.sh/ts-jpeg'

// Use encode/decode in the browser
</script>
```

## TypeScript Configuration

For TypeScript projects, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "esModuleInterop": true
  }
}
```

## Development Setup

If you want to contribute to ts-jpeg or build from source:

```bash
# Clone the repository
git clone https://github.com/stacksjs/ts-jpeg.git
cd ts-jpeg

# Install dependencies
bun install

# Build the project
bun run build

# Run tests
bun test
```

## Next Steps

- [Usage Guide](/usage) - Learn how to encode and decode images
- [Configuration](/config) - Explore encoding and decoding options
