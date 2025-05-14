# Advanced Configuration

## Overview

Detailed configuration options and customization capabilities for jpgx.

## Configuration Options

### Encoder Configuration

```typescript
interface EncoderConfig {
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
```

### Decoder Configuration

```typescript
interface DecoderConfig {
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
```

## Usage Examples

### Basic Configuration

```typescript
import { configure } from 'jpgx'

// Basic configuration
configure({
  encoder: {
    compressionLevel: 9,
    format: 'json',
    encoding: 'utf8'
  },
  decoder: {
    timeout: 5000,
    strictMode: true
  }
})
```

### Advanced Configuration

```typescript
// Advanced configuration with all options
configure({
  encoder: {
    compressionLevel: 9,
    compressionStrategy: 'huffman',
    format: 'binary',
    encoding: 'base64',
    bufferSize: 1024 * 1024,
    useStreaming: true,
    validateInput: true,
    strictMode: true
  },
  decoder: {
    timeout: 10000,
    maxSize: 10 * 1024 * 1024,
    strictMode: true,
    validateOutput: true,
    errorHandling: 'strict',
    retryAttempts: 3
  }
})
```

## Configuration Best Practices

1. Set appropriate timeout values
2. Enable validation in development
3. Use streaming for large datasets
4. Configure proper error handling
5. Set reasonable buffer sizes
