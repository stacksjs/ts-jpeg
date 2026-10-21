import { expect, test } from 'bun:test'
import { decode, encode, optimize } from '../src'

const image = encode({ width: 2, height: 2, data: new Uint8Array(16).fill(255) }, 90).data
const segment = (marker: number, bytes: number[]) => new Uint8Array([255, marker, 0, bytes.length + 2, ...bytes])
const join = (...parts: Uint8Array[]) => new Uint8Array(Buffer.concat(parts))

test('removes comments with identical decoded pixels and preserves EXIF/ICC segments', () => {
  const exif = segment(0xE1, [69, 120, 105, 102, 0, 0, 1, 2])
  const icc = segment(0xE2, [73, 67, 67, 0, 1])
  const comment = segment(0xFE, [104, 101, 108, 108, 111])
  const original = join(image.subarray(0, 2), exif, icc, comment, image.subarray(2))
  const output = optimize(original)
  expect(output).toEqual(join(image.subarray(0, 2), exif, icc, image.subarray(2)))
  expect(decode(output).data).toEqual(decode(original).data)
  expect(optimize(output)).toBe(output)
})

test('handles progressive scan boundaries, stuffed bytes, restart markers and trailing data', () => {
  const original = new Uint8Array([255,216, 255,218,0,2, 1,255,0,2,255,208,3, 255,254,0,3,7, 255,218,0,2, 4,255,0,5, 255,217, 9])
  expect(optimize(original)).toEqual(new Uint8Array([255,216,255,218,0,2,1,255,0,2,255,208,3,255,218,0,2,4,255,0,5,255,217,9]))
})

test('rejects malformed and truncated images', () => {
  for (const bytes of [[], [255,216,255], [255,216,255,254,0,1,255,217], [255,216,255,218,0,20,255,217]])
    expect(() => optimize(new Uint8Array(bytes))).toThrow()
  expect(() => optimize(image.subarray(0, image.length - 2))).toThrow()
})

test('preserves MPF offsets by retaining multi-picture containers unchanged', () => {
  const comment = segment(0xFE, [1,2,3])
  const mpf = segment(0xE2, [77,80,70,0,1,2,3])
  const original = join(image.subarray(0,2), comment, mpf, image.subarray(2))
  expect(optimize(original)).toBe(original)
})
