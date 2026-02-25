# Interfaces API Reference

## Overview

Documentation for all interfaces used in jpgx, providing detailed information about the structure and usage of each interface.

## Core Interfaces

### Encoder Interfaces

```typescript
interface Encoder {
  /**

   * Encodes data with default options

   */
  encode: (data: unknown) => string

  /**

   * Encodes data with custom options

   */
  encodeWithOptions: (data: unknown, options: EncodeOptions) => string

  /**

   * Streams data for encoding

   */
  streamEncode: (data: unknown) => ReadableStream
}

interface EncodeOptions {
  compressionLevel?: number
  compressionStrategy?: CompressionStrategy
  format?: SupportedFormat
  encoding?: SupportedEncoding
  bufferSize?: number
  useStreaming?: boolean
  validateInput?: boolean
  strictMode?: boolean
}
```

### Decoder Interfaces

```typescript
interface Decoder {
  /**

   * Decodes data with default options

   */
  decode: (data: string) => unknown

  /**

   * Decodes data with custom options

   */
  decodeWithOptions: (data: string, options: DecodeOptions) => unknown

  /**

   * Streams data for decoding

   */
  streamDecode: (data: string) => ReadableStream
}

interface DecodeOptions {
  timeout?: number
  maxSize?: number
  strictMode?: boolean
  validateOutput?: boolean
  errorHandling?: 'strict' | 'lenient'
  retryAttempts?: number
}
```

## Error Interfaces

```typescript
interface JpgxError extends Error {
  code: string
  details?: Record<string, unknown>
  timestamp: number
  stack?: string
}

interface ValidationError extends JpgxError {
  code: 'VALIDATION*ERROR'
  field?: string
  value?: unknown
  expected?: unknown
  path?: string[]
}

interface EncodingError extends JpgxError {
  code: 'ENCODING*ERROR'
  input?: unknown
  reason?: string
  position?: number
}

interface DecodingError extends JpgxError {
  code: 'DECODING_ERROR'
  input?: string
  reason?: string
  position?: number
}
```

## Configuration Interfaces

```typescript
interface JpgxConfig {
  encoder: EncoderConfig
  decoder: DecoderConfig
  logging: LoggingConfig
  performance: PerformanceConfig
}

interface EncoderConfig {
  defaultOptions: EncodeOptions
  validation: ValidationConfig
  performance: PerformanceConfig
}

interface DecoderConfig {
  defaultOptions: DecodeOptions
  validation: ValidationConfig
  performance: PerformanceConfig
}

interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error'
  format: 'json' | 'text'
  destination: 'console' | 'file' | 'stream'
  filePath?: string
}

interface PerformanceConfig {
  maxMemoryUsage: number
  maxConcurrentOperations: number
  timeout: number
  retryStrategy: RetryStrategy
}

interface ValidationConfig {
  strictMode: boolean
  customValidators: Record<string, Validator>
  errorMessages: Record<string, string>
}

interface RetryStrategy {
  maxAttempts: number
  backoff: 'linear' | 'exponential'
  initialDelay: number
  maxDelay: number
}
```

## Utility Interfaces

```typescript
interface Validator {
  validate: (data: unknown) => boolean
  message?: string
}

interface Cache {
  get: (key: string) => unknown
  set: (key: string, value: unknown) => void
  delete: (key: string) => void
  clear: () => void
}

interface Logger {
  debug: (message: string, ...args: unknown[]) => void
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
}
```

## Usage Examples

### Implementing Custom Validator

```typescript
class CustomValidator implements Validator {
  validate(data: unknown): boolean {
    // Implement validation logic
    return true
  }

  message = 'Custom validation failed'
}

// Usage
const config: JpgxConfig = {
  encoder: {
    validation: {
      customValidators: {
        custom: new CustomValidator()
      }
    }
  }
}
```

### Implementing Custom Logger

```typescript
class CustomLogger implements Logger {
  debug(message: string, ...args: unknown[]): void {
    console.debug(`[DEBUG] ${message}`, ...args)
  }

  info(message: string, ...args: unknown[]): void {
    console.info(`[INFO] ${message}`, ...args)
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args)
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args)
  }
}
```

## Best Practices

### Interface Design

1. Keep interfaces focused and single-purpose
2. Use descriptive names that reflect the interface's purpose
3. Document all properties and methods
4. Use proper TypeScript modifiers (readonly, optional, etc.)

### Implementation Guidelines

1. Implement all required interface members
2. Follow the interface contract strictly
3. Use proper error handling
4. Include proper type checking

### Extension Patterns

1. Use interface extension for related interfaces
2. Keep the inheritance hierarchy shallow
3. Use composition over inheritance when possible
4. Document interface relationships
