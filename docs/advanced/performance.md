# Performance

This guide covers performance optimization strategies for jpgx, including memory management, batch processing, and parallel operations.

## Encoding Performance

### Quality Impact

Quality has minimal impact on encoding speed:

```typescript
import { encode } from 'jpgx'

// Both have similar encoding time
const low = encode(imageData, 30)   // ~50ms
const high = encode(imageData, 95)  // ~52ms

// Output size differs significantly
console.log('Low:', low.data.length)   // ~50KB
console.log('High:', high.data.length) // ~400KB
```

### Image Size Impact

Encoding time scales with pixel count:

```typescript
// Rough estimates for encoding time
// 640x480 (307K pixels):  ~10ms
// 1280x720 (921K pixels): ~30ms
// 1920x1080 (2M pixels):  ~70ms
// 3840x2160 (8M pixels):  ~280ms
```

## Decoding Performance

### Output Format Impact

```typescript
// RGBA output (default)
const rgba = decode(jpegData, { formatAsRGBA: true })
// Uses width * height * 4 bytes

// RGB output (25% less memory)
const rgb = decode(jpegData, { formatAsRGBA: false })
// Uses width * height * 3 bytes
```

### Typed Arrays

```typescript
// Enable for slightly faster processing
const image = decode(jpegData, {
  useTArray: true,
})
```

## Memory Optimization

### Limit Resolution

Prevent memory exhaustion:

```typescript
// Safe defaults for web
const image = decode(jpegData, {
  maxResolutionInMP: 25,     // 5000x5000 max
  maxMemoryUsageInMB: 256,
})
```

### Memory Estimation

```typescript
function estimateMemory(width: number, height: number, rgba = true): number {
  const bytesPerPixel = rgba ? 4 : 3
  const bytes = width * height * bytesPerPixel
  return Math.ceil(bytes / (1024 * 1024)) // MB
}

// Check before decoding
const headers = parseJpegHeaders(jpegData)
const estimatedMB = estimateMemory(headers.width, headers.height)

if (estimatedMB > 256) {
  console.warn(`Image would use ~${estimatedMB}MB of memory`)
}
```

### Stream-Like Processing

Process images without loading all at once:

```typescript
async function processImageBatch(paths: string[], maxConcurrent = 3) {
  const results = []

  for (let i = 0; i < paths.length; i += maxConcurrent) {
    const batch = paths.slice(i, i + maxConcurrent)

    const batchResults = await Promise.all(
      batch.map(async (path) => {
        const data = await Bun.file(path).arrayBuffer()
        const image = decode(new Uint8Array(data), {
          maxMemoryUsageInMB: 128,
        })

        const processed = processImage(image)
        return encode(processed, 75)
      })
    )

    results.push(...batchResults)

    // Allow GC between batches
    await Bun.sleep(0)
  }

  return results
}
```

## Batch Processing

### Sequential Processing

```typescript
async function processSequential(images: Uint8Array[]): Promise<Uint8Array[]> {
  const results: Uint8Array[] = []

  for (const image of images) {
    const decoded = decode(image)
    const processed = applyFilter(decoded)
    const encoded = encode(processed, 75)
    results.push(encoded.data)
  }

  return results
}
```

### Parallel Processing

```typescript
async function processParallel(
  images: Uint8Array[],
  concurrency = 4
): Promise<Uint8Array[]> {
  const results: Uint8Array[] = new Array(images.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < images.length) {
      const index = nextIndex++
      const decoded = decode(images[index])
      const processed = applyFilter(decoded)
      results[index] = encode(processed, 75).data
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker())
  await Promise.all(workers)

  return results
}
```

## Caching

### Result Caching

```typescript
const cache = new Map<string, { data: Uint8Array; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function cachedEncode(
  imageData: RawImageData,
  quality: number
): Uint8Array {
  const key = `${imageData.width}x${imageData.height}:${quality}:${
    Bun.hash(imageData.data).toString()
  }`

  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  const result = encode(imageData, quality)

  cache.set(key, {
    data: result.data,
    timestamp: Date.now(),
  })

  return result.data
}
```

### LRU Cache

```typescript
class LRUCache<T> {
  private cache = new Map<string, T>()

  constructor(private maxSize: number) {}

  get(key: string): T | undefined {
    const value = this.cache.get(key)
    if (value !== undefined) {
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: string, value: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }
    else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }
}

const imageCache = new LRUCache<Uint8Array>(100)
```

## Benchmarking

### Measure Performance

```typescript
async function benchmark(
  imagePath: string,
  iterations = 100
) {
  const data = await Bun.file(imagePath).arrayBuffer()
  const jpegData = new Uint8Array(data)

  // Benchmark decode
  let decodeStart = performance.now()
  for (let i = 0; i < iterations; i++) {
    decode(jpegData)
  }
  let decodeTime = (performance.now() - decodeStart) / iterations

  // Benchmark encode
  const decoded = decode(jpegData)
  let encodeStart = performance.now()
  for (let i = 0; i < iterations; i++) {
    encode(decoded, 75)
  }
  let encodeTime = (performance.now() - encodeStart) / iterations

  console.log(`Image: ${decoded.width}x${decoded.height}`)
  console.log(`Decode: ${decodeTime.toFixed(2)}ms`)
  console.log(`Encode: ${encodeTime.toFixed(2)}ms`)
  console.log(`Total: ${(decodeTime + encodeTime).toFixed(2)}ms`)
}
```

### Compare Settings

```typescript
async function compareQualities(imagePath: string) {
  const data = await Bun.file(imagePath).arrayBuffer()
  const image = decode(new Uint8Array(data))

  const qualities = [30, 50, 70, 85, 95, 100]

  console.log('Quality | Size (KB) | Time (ms)')
  console.log('--------|-----------|----------')

  for (const quality of qualities) {
    const start = performance.now()
    const result = encode(image, quality)
    const time = performance.now() - start

    console.log(
      `${quality.toString().padStart(7)} | ` +
      `${Math.round(result.data.length / 1024).toString().padStart(9)} | ` +
      `${time.toFixed(2).padStart(8)}`
    )
  }
}
```

## Best Practices

1. **Choose appropriate quality**: Higher quality = larger files
2. **Use RGB when alpha not needed**: Saves 25% memory
3. **Set memory limits**: Prevent crashes
4. **Process in batches**: Better memory management
5. **Cache when possible**: Avoid redundant processing
6. **Profile before optimizing**: Measure first

## Next Steps

- [CI/CD Integration](/advanced/ci-cd-integration) - Automate processing
- [Configuration](/advanced/configuration) - Tune settings
- [Custom Profiles](/advanced/custom-profiles) - Reusable configurations
