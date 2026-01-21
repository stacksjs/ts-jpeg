# Installation

Installing jpgx is straightforward with any JavaScript package manager.

## Package Managers

### Bun (Recommended)

```bash
bun add jpgx
```

### npm

```bash
npm install jpgx
```

### pnpm

```bash
pnpm add jpgx
```

### Yarn

```bash
yarn add jpgx
```

## Requirements

- **Runtime**: Bun 1.0+, Node.js 18+, or modern browsers
- **TypeScript**: 5.0+ (for TypeScript projects)

## Verify Installation

After installation, verify jpgx is working:

```typescript
import { encode, decode } from 'jpgx'

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

jpgx works in modern browsers without any bundler configuration:

```html
<script type="module">
import { encode, decode } from 'https://esm.sh/jpgx'

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

If you want to contribute to jpgx or build from source:

```bash
# Clone the repository
git clone https://github.com/stacksjs/jpgx.git
cd jpgx

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
