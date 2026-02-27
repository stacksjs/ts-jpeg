import type { Buffer } from 'node:buffer'

export interface RawImageData<T> {
  width: number
  height: number
  data: T
}

export interface BufferRet {
  data: Buffer | Uint8ClampedArray
  width: number
  height: number
  exifBuffer?: ArrayBuffer
  comments?: string[]
}

export type UintArrRet = ImageData & {
  exifBuffer?: ArrayBuffer
  comments?: string[]
}

export interface ImageData {
  width: number
  height: number
  data: Uint8Array | Uint8ClampedArray | Buffer
  colorSpace?: 'srgb'
}

export type BufferLike = Buffer | Uint8Array | ArrayLike<number> | Iterable<number> | ArrayBuffer

export interface DecoderOptions {
  useTArray?: boolean
  colorTransform?: boolean
  formatAsRGBA?: boolean
  tolerantDecoding?: boolean
  maxResolutionInMP?: number
  maxMemoryUsageInMB?: number
}
