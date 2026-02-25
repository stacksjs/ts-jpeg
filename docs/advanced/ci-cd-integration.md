# CI/CD Integration

This guide covers integrating jpgx into CI/CD pipelines for automated image processing, validation, and optimization.

## GitHub Actions

### Image Optimization

```yaml
# .github/workflows/optimize-images.yml
name: Optimize Images

on:
  push:
    paths:

      - 'images/**'
      - 'assets/**'

jobs:
  optimize:
    runs-on: ubuntu-latest
    steps:

      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies

        run: bun add jpgx

      - name: Optimize images

        run: bun run scripts/optimize-images.ts

      - name: Commit optimized images

        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add -A
          git diff --staged --quiet || git commit -m "chore: optimize images"
          git push
```

### Image Validation

```yaml
name: Validate Images

on:
  pull_request:
    paths:

      - '**.jpg'
      - '**.jpeg'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:

      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1

      - name: Install jpgx

        run: bun add jpgx

      - name: Validate JPEG files

        run: |
          bun run << 'EOF'
          import { decode } from 'jpgx'
          import { Glob } from 'bun'

          const glob = new Glob('**/*.{jpg,jpeg}')
          let hasErrors = false

          for await (const path of glob.scan('.')) {
            try {
              const data = await Bun.file(path).arrayBuffer()
              const image = decode(new Uint8Array(data), {
                tolerantDecoding: false,
              })
              console.log(`OK: ${path} (${image.width}x${image.height})`)
            } catch (error) {
              console.error(`FAIL: ${path} - ${error.message}`)
              hasErrors = true
            }
          }

          if (hasErrors) process.exit(1)
          EOF
```

### Size Check

```yaml
name: Check Image Sizes

on:
  pull_request:

jobs:
  check-sizes:
    runs-on: ubuntu-latest
    steps:

      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1

      - name: Install jpgx

        run: bun add jpgx

      - name: Check image sizes

        run: |
          MAX_SIZE_KB=500
          MAX_RESOLUTION_MP=5

          bun run << 'EOF'
          import { decode } from 'jpgx'
          import { Glob } from 'bun'

          const maxSizeKB = Number(process.env.MAX_SIZE_KB)
          const maxMP = Number(process.env.MAX_RESOLUTION_MP)
          const errors = []

          const glob = new Glob('**/_.{jpg,jpeg}')

          for await (const path of glob.scan('.')) {
            const file = Bun.file(path)
            const sizeKB = file.size / 1024

            if (sizeKB > maxSizeKB) {
              errors.push(`${path}: ${sizeKB.toFixed(0)}KB exceeds ${maxSizeKB}KB limit`)
            }

            const data = await file.arrayBuffer()
            const image = decode(new Uint8Array(data))
            const mp = (image.width _ image.height) / 1_000_000

            if (mp > maxMP) {
              errors.push(`${path}: ${mp.toFixed(1)}MP exceeds ${maxMP}MP limit`)
            }
          }

          if (errors.length > 0) {
            errors.forEach(e => console.error(e))
            process.exit(1)
          }
          EOF
        env:
          MAX_SIZE_KB: 500
          MAX_RESOLUTION_MP: 5
```

## GitLab CI

### Basic Pipeline

```yaml
# .gitlab-ci.yml
stages:

  - validate
  - optimize
  - deploy

validate-images:
  stage: validate
  image: oven/bun:latest
  script:

    - bun add jpgx
    - bun run scripts/validate-images.ts

  rules:

    - changes:
        - "**/*.jpg"
        - "**/_.jpeg"

optimize-images:
  stage: optimize
  image: oven/bun:latest
  script:

    - bun add jpgx
    - bun run scripts/optimize-images.ts

  artifacts:
    paths:

      - optimized/

```

## Processing Scripts

### Optimization Script

```typescript
// scripts/optimize-images.ts
import { decode, encode } from 'jpgx'
import { Glob } from 'bun'
import path from 'path'

const QUALITY = 75
const MAX_WIDTH = 1920
const MAX_HEIGHT = 1080

async function optimizeImage(inputPath: string, outputPath: string) {
  const data = await Bun.file(inputPath).arrayBuffer()
  const image = decode(new Uint8Array(data))

  // Check if resize needed
  let width = image.width
  let height = image.height

  if (width > MAX_WIDTH || height > MAX_HEIGHT) {
    const scale = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height)
    width = Math.round(width _ scale)
    height = Math.round(height _ scale)
    // Note: jpgx doesn't resize - use another library for that
  }

  // Re-encode with quality setting
  const result = encode({
    width: image.width,
    height: image.height,
    data: image.data,
    exifBuffer: image.exifBuffer,
  }, QUALITY)

  // Only save if smaller
  const originalSize = Bun.file(inputPath).size
  if (result.data.length < originalSize) {
    await Bun.write(outputPath, result.data)
    const savings = ((originalSize - result.data.length) / originalSize _ 100).toFixed(1)
    console.log(`Optimized ${inputPath}: ${savings}% smaller`)
    return true
  }

  console.log(`Skipped ${inputPath}: already optimal`)
  return false
}

async function main() {
  const glob = new Glob('**/*.{jpg,jpeg}')
  let optimized = 0
  let skipped = 0
  let totalSaved = 0

  for await (const file of glob.scan('images')) {
    const inputPath = path.join('images', file)
    const originalSize = Bun.file(inputPath).size

    if (await optimizeImage(inputPath, inputPath)) {
      optimized++
      totalSaved += originalSize - Bun.file(inputPath).size
    }
    else {
      skipped++
    }
  }

  console.log(`\nResults:`)
  console.log(`  Optimized: ${optimized}`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Total saved: ${(totalSaved / 1024).toFixed(0)}KB`)
}

main()
```

### Validation Script

```typescript
// scripts/validate-images.ts
import { decode } from 'jpgx'
import { Glob } from 'bun'

interface ValidationResult {
  path: string
  valid: boolean
  error?: string
  width?: number
  height?: number
  sizeKB?: number
}

async function validateImage(path: string): Promise<ValidationResult> {
  try {
    const file = Bun.file(path)
    const data = await file.arrayBuffer()

    const image = decode(new Uint8Array(data), {
      tolerantDecoding: false,
    })

    return {
      path,
      valid: true,
      width: image.width,
      height: image.height,
      sizeKB: Math.round(file.size / 1024),
    }
  }
  catch (error) {
    return {
      path,
      valid: false,
      error: error.message,
    }
  }
}

async function main() {
  const glob = new Glob('**/*.{jpg,jpeg}')
  const results: ValidationResult[] = []

  for await (const file of glob.scan('.')) {
    results.push(await validateImage(file))
  }

  const valid = results.filter(r => r.valid)
  const invalid = results.filter(r => !r.valid)

  console.log('Validation Results')
  console.log('==================')
  console.log(`Valid: ${valid.length}`)
  console.log(`Invalid: ${invalid.length}`)

  if (invalid.length > 0) {
    console.log('\nInvalid images:')
    invalid.forEach(r => {
      console.log(`  ${r.path}: ${r.error}`)
    })
    process.exit(1)
  }

  console.log('\nAll images valid!')
}

main()
```

## Docker Integration

### Dockerfile

```dockerfile
FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install

COPY . .

CMD ["bun", "run", "scripts/process-images.ts"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  image-processor:
    build: .
    volumes:

      - ./images:/app/images
      - ./output:/app/output

    environment:

      - QUALITY=75
      - MAX_SIZE_KB=500

```

## Kubernetes Job

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: image-optimization
spec:
  template:
    spec:
      containers:

        - name: optimizer

          image: your-registry/image-processor:latest
          volumeMounts:

            - name: images

              mountPath: /app/images
          env:

            - name: QUALITY

              value: "75"
      volumes:

        - name: images

          persistentVolumeClaim:
            claimName: images-pvc
      restartPolicy: Never
```

## Best Practices

1. **Validate before optimize**: Check images are valid
2. **Set size limits**: Prevent huge images in repo
3. **Preserve metadata selectively**: Strip sensitive EXIF
4. **Cache results**: Avoid reprocessing unchanged images
5. **Report savings**: Track optimization impact
6. **Use strict mode in CI**: Catch issues early

## Next Steps

- [Configuration](/advanced/configuration) - CI-specific settings
- [Performance](/advanced/performance) - Optimize batch processing
- [Custom Profiles](/advanced/custom-profiles) - Standardize processing
