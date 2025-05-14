# Types API Reference

## Overview

Comprehensive documentation of all type definitions used in jpgx.

## Core Types

### Encoder Types

```typescript
interface EncodeOptions {
  // Compression settings
  compressionLevel?: number // 0-9, higher means better compression
  compressionStrategy?: 'default' | 'filtered' | 'huffman' | 'rle' | 'fixed'

  // Format settings
  format?: 'json' | 'binary' | 'text'
  encoding?: 'utf8' | 'ascii' | 'base64'

  // Performance settings
  bufferSize?: number
  useStreaming?: boolean

  // Validation settings
  validateInput?: boolean
  strictMode?: boolean
}

interface EncoderResult {
  data: string
  metadata: {
    size: number
    format: string
    encoding: string
    compressionLevel: number
  }
}
```

### Decoder Types

```typescript
interface DecodeOptions {
  // Processing settings
  timeout?: number
  maxSize?: number

  // Validation settings
  strictMode?: boolean
  validateOutput?: boolean

  // Error handling
  errorHandling?: 'strict' | 'lenient'
  retryAttempts?: number
}

interface DecoderResult {
  data: any
  metadata: {
    originalSize: number
    decodedSize: number
    format: string
    encoding: string
  }
}
```

## Error Types

```typescript
interface JpgxError extends Error {
  code: string
  details?: Record<string, unknown>
}

interface ValidationError extends JpgxError {
  code: 'VALIDATION_ERROR'
  field?: string
  value?: unknown
  expected?: unknown
}

interface EncodingError extends JpgxError {
  code: 'ENCODING_ERROR'
  input?: unknown
  reason?: string
}

interface DecodingError extends JpgxError {
  code: 'DECODING_ERROR'
  input?: string
  reason?: string
}
```

## Utility Types

```typescript
type SupportedFormat = 'json' | 'binary' | 'text'
type SupportedEncoding = 'utf8' | 'ascii' | 'base64'
type CompressionStrategy = 'default' | 'filtered' | 'huffman' | 'rle' | 'fixed'

interface Metadata {
  timestamp: number
  version: string
  format: SupportedFormat
  encoding: SupportedEncoding
}
```

## Type Guards

```typescript
function isJpgxError(error: unknown): error is JpgxError {
  return (
    error instanceof Error
    && 'code' in error
    && typeof (error as JpgxError).code === 'string'
  )
}

function isValidFormat(format: unknown): format is SupportedFormat {
  return typeof format === 'string' && ['json', 'binary', 'text'].includes(format)
}

function isValidEncoding(encoding: unknown): encoding is SupportedEncoding {
  return typeof encoding === 'string' && ['utf8', 'ascii', 'base64'].includes(encoding)
}
```

## Usage Examples

### Type Checking

```typescript
import { isJpgxError, isValidFormat } from 'jpgx'

try {
  const result = encode(data)
  // Process result
}
catch (error) {
  if (isJpgxError(error)) {
    // Handle jpgx specific error
    console.error(`Error code: ${error.code}`)
  }
  else {
    // Handle other errors
    console.error('Unknown error:', error)
  }
}
```

### Type Assertions

```typescript
import { SupportedEncoding, SupportedFormat } from 'jpgx'

function processData(format: unknown, encoding: unknown) {
  if (!isValidFormat(format)) {
    throw new Error('Invalid format')
  }

  if (!isValidEncoding(encoding)) {
    throw new Error('Invalid encoding')
  }

  // Now TypeScript knows the types are correct
  return encode(data, { format, encoding })
}
```

## Best Practices

### Type Safety

1. Always use type guards when dealing with unknown data
2. Avoid using `any` type when possible
3. Use proper type assertions
4. Implement proper error handling with typed errors

### Type Definitions

1. Keep type definitions in a separate file
2. Use interfaces for object shapes
3. Use type aliases for unions and intersections
4. Document complex types with examples

### Error Handling

1. Use typed error classes
2. Implement proper error hierarchies
3. Include relevant metadata in errors
4. Use type guards for error handling
