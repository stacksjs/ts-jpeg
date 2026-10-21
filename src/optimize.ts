/**
 * Remove JPEG comment segments without decoding pixels or changing metadata.
 * EXIF orientation, ICC profiles, progressive scans and entropy bytes survive.
 * Malformed input is rejected before any output is returned.
 */
export function optimize(input: Uint8Array): Uint8Array {
  if (input.length < 4 || input[0] !== 0xFF || input[1] !== 0xD8)
    throw new Error('Invalid JPEG signature')
  const parts: Uint8Array[] = [input.subarray(0, 2)]
  let offset = 2
  let removed = 0
  let hasMpf = false
  while (offset < input.length) {
    const start = offset
    if (input[offset++] !== 0xFF) throw new Error('Invalid JPEG marker')
    while (input[offset] === 0xFF) offset++
    const marker = input[offset++]
    if (marker === undefined || marker === 0 || marker === 0xD8)
      throw new Error('Invalid JPEG marker')
    if (marker === 0xD9) {
      // Preserve any appended data, e.g. the second image in an MPO file.
      parts.push(input.subarray(start))
      if (!removed || hasMpf) return input
      const output = new Uint8Array(input.length - removed)
      let cursor = 0
      for (const part of parts) {
        output.set(part, cursor)
        cursor += part.length
      }
      return output
    }
    if (marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
      parts.push(input.subarray(start, offset))
      continue
    }
    if (offset + 2 > input.length) throw new Error('Truncated JPEG segment')
    const length = (input[offset] << 8) | input[offset + 1]
    if (length < 2 || offset + length > input.length) throw new Error('Invalid JPEG segment length')
    if (marker === 0xE2 && length >= 6 && input[offset + 2] === 77 && input[offset + 3] === 80 && input[offset + 4] === 70 && input[offset + 5] === 0) hasMpf = true
    offset += length
    if (marker === 0xFE) removed += offset - start
    else parts.push(input.subarray(start, offset))
    if (marker === 0xDA) {
      const scanStart = offset
      while (offset < input.length) {
        if (input[offset] !== 0xFF) {
          offset++
          continue
        }
        let next = offset + 1
        while (input[next] === 0xFF) next++
        if (input[next] === 0 || (input[next] >= 0xD0 && input[next] <= 0xD7)) {
          offset = next + 1
          continue
        }
        break
      }
      parts.push(input.subarray(scanStart, offset))
    }
  }
  throw new Error('JPEG end marker missing')
}
