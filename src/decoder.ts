/*
   Copyright 2011 notmasteryet

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

// - The JPEG specification can be found in the ITU CCITT Recommendation T.81
//   (www.w3.org/Graphics/JPEG/itu-t81.pdf)
// - The JFIF specification can be found in the JPEG File Interchange Format
//   (www.w3.org/Graphics/JPEG/jfif3.pdf)
// - The Adobe Application-Specific JPEG markers in the Supporting the DCT Filters
//   in PostScript Level 2, Technical Note #5116
//   (partners.adobe.com/public/developer/en/ps/sdk/5116.DCT_Filter.pdf)

import type { Buffer } from 'node:buffer'
import type { BufferLike, DecoderOptions, UintArrRet } from './types'

class JpegImage {
  private static dctZigZag = new Int32Array([
    0,
    1,
    8,
    16,
    9,
    2,
    3,
    10,
    17,
    24,
    32,
    25,
    18,
    11,
    4,
    5,
    12,
    19,
    26,
    33,
    40,
    48,
    41,
    34,
    27,
    20,
    13,
    6,
    7,
    14,
    21,
    28,
    35,
    42,
    49,
    56,
    57,
    50,
    43,
    36,
    29,
    22,
    15,
    23,
    30,
    37,
    44,
    51,
    58,
    59,
    52,
    45,
    38,
    31,
    39,
    46,
    53,
    60,
    61,
    54,
    47,
    55,
    62,
    63,
  ])

  private static readonly dctCos1 = 4017 // cos(pi/16)
  private static readonly dctSin1 = 799 // sin(pi/16)
  private static readonly dctCos3 = 3406 // cos(3*pi/16)
  private static readonly dctSin3 = 2276 // sin(3*pi/16)
  private static readonly dctCos6 = 1567 // cos(6*pi/16)
  private static readonly dctSin6 = 3784 // sin(6*pi/16)
  private static readonly dctSqrt2 = 5793 // sqrt(2)
  private static readonly dctSqrt1d2 = 2896 // sqrt(2) / 2

  private static totalBytesAllocated = 0
  private static maxMemoryUsageBytes = 0

  public width!: number
  public height!: number
  public jfif: any
  public adobe: any
  public components: any[]
  public comments: string[]
  public exifBuffer?: Uint8Array
  public opts: DecoderOptions

  constructor(opts: DecoderOptions = { useTArray: false, colorTransform: undefined, formatAsRGBA: true, tolerantDecoding: true, maxResolutionInMP: 100, maxMemoryUsageInMB: 512 }) {
    this.opts = opts
    this.comments = []
    this.components = []
  }

  static resetMaxMemoryUsage(maxMemoryUsageBytes_: number): void {
    JpegImage.totalBytesAllocated = 0
    JpegImage.maxMemoryUsageBytes = maxMemoryUsageBytes_
  }

  static getBytesAllocated(): number {
    return JpegImage.totalBytesAllocated
  }

  public static requestMemoryAllocation(increaseAmount = 0): void {
    const totalMemoryImpactBytes = JpegImage.totalBytesAllocated + increaseAmount
    if (totalMemoryImpactBytes > JpegImage.maxMemoryUsageBytes) {
      const exceededAmount = Math.ceil((totalMemoryImpactBytes - JpegImage.maxMemoryUsageBytes) / 1024 / 1024)
      throw new Error(`maxMemoryUsageInMB limit exceeded by at least ${exceededAmount}MB`)
    }
    JpegImage.totalBytesAllocated = totalMemoryImpactBytes
  }

  private static buildHuffmanTable(codeLengths: Uint8Array, values: Uint8Array): any[] {
    let k = 0
    const code: any[] = []
    let length = 16

    while (length > 0 && !codeLengths[length - 1]) {
      length--
    }

    code.push({ children: [], index: 0 })
    let p = code[0]
    let q

    for (let i = 0; i < length; i++) {
      for (let j = 0; j < codeLengths[i]; j++) {
        p = code.pop()
        p.children[p.index] = values[k]
        while (p.index > 0) {
          if (code.length === 0) {
            throw new Error('Could not recreate Huffman Table')
          }
          p = code.pop()
        }
        p.index++
        code.push(p)
        while (code.length <= i) {
          code.push(q = { children: [], index: 0 })
          p.children[p.index] = q.children
          p = q
        }
        k++
      }
      if (i + 1 < length) {
        code.push(q = { children: [], index: 0 })
        p.children[p.index] = q.children
        p = q
      }
    }

    return code[0].children
  }

  private static clampTo8bit(a: number): number {
    return a < 0 ? 0 : a > 255 ? 255 : a
  }

  public async load(path: string): Promise<void> {
    const response = await fetch(path)
    const arrayBuffer = await response.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)
    this.parse(data)
  }

  public parse(data: Uint8Array): void {
    const maxResolutionInPixels = (this.opts.maxResolutionInMP || 100) * 1000 * 1000
    let offset = 0

    const readUint16 = () => {
      const value = (data[offset] << 8) | data[offset + 1]
      offset += 2
      return value
    }

    const readDataBlock = () => {
      const length = readUint16()
      const array = data.subarray(offset, offset + length - 2)
      offset += array.length
      return array
    }

    const prepareComponents = (frame: any) => {
      let maxH = 1
      let maxV = 1
      let component, componentId

      for (componentId in frame.components) {
        if (Object.prototype.hasOwnProperty.call(frame.components, componentId)) {
          component = frame.components[componentId]
          if (maxH < component.h)
            maxH = component.h
          if (maxV < component.v)
            maxV = component.v
        }
      }

      const mcusPerLine = Math.ceil(frame.samplesPerLine / 8 / maxH)
      const mcusPerColumn = Math.ceil(frame.scanLines / 8 / maxV)

      for (componentId in frame.components) {
        if (Object.prototype.hasOwnProperty.call(frame.components, componentId)) {
          component = frame.components[componentId]
          const blocksPerLine = Math.ceil(Math.ceil(frame.samplesPerLine / 8) * component.h / maxH)
          const blocksPerColumn = Math.ceil(Math.ceil(frame.scanLines / 8) * component.v / maxV)
          const blocksPerLineForMcu = mcusPerLine * component.h
          const blocksPerColumnForMcu = mcusPerColumn * component.v
          const blocksToAllocate = blocksPerColumnForMcu * blocksPerLineForMcu
          const blocks = []

          JpegImage.requestMemoryAllocation(blocksToAllocate * 256)

          for (let i = 0; i < blocksPerColumnForMcu; i++) {
            const row = []
            for (let j = 0; j < blocksPerLineForMcu; j++) {
              row.push(new Int32Array(64))
            }
            blocks.push(row)
          }

          component.blocksPerLine = blocksPerLine
          component.blocksPerColumn = blocksPerColumn
          component.blocks = blocks
        }
      }

      frame.maxH = maxH
      frame.maxV = maxV
      frame.mcusPerLine = mcusPerLine
      frame.mcusPerColumn = mcusPerColumn
    }

    let jfif = null
    let adobe = null
    let frame: any
    let resetInterval: number
    const quantizationTables: any[] = []
    const frames: any[] = []
    const huffmanTablesAC: any[] = []
    const huffmanTablesDC: any[] = []
    let fileMarker = readUint16()
    let malformedDataOffset = -1

    if (fileMarker !== 0xFFD8) { // SOI (Start of Image)
      throw new Error('SOI not found')
    }

    fileMarker = readUint16()

    while (fileMarker !== 0xFFD9) { // EOI (End of image)
      let i, j

      switch (fileMarker) {
        case 0xFF00:
          break

        case 0xFFE0: // APP0 (Application Specific)
        case 0xFFE1: // APP1
        case 0xFFE2: // APP2
        case 0xFFE3: // APP3
        case 0xFFE4: // APP4
        case 0xFFE5: // APP5
        case 0xFFE6: // APP6
        case 0xFFE7: // APP7
        case 0xFFE8: // APP8
        case 0xFFE9: // APP9
        case 0xFFEA: // APP10
        case 0xFFEB: // APP11
        case 0xFFEC: // APP12
        case 0xFFED: // APP13
        case 0xFFEE: // APP14
        case 0xFFEF: // APP15
        case 0xFFFE: {
          // COM (Comment)
          const appData = readDataBlock()

          if (fileMarker === 0xFFFE) {
            const comment = String.fromCharCode.apply(null, appData as any)
            this.comments.push(comment)
          }

          if (fileMarker === 0xFFE0) {
            if (appData[0] === 0x4A && appData[1] === 0x46 && appData[2] === 0x49
              && appData[3] === 0x46 && appData[4] === 0) { // 'JFIF\x00'
              jfif = {
                version: { major: appData[5], minor: appData[6] },
                densityUnits: appData[7],
                xDensity: (appData[8] << 8) | appData[9],
                yDensity: (appData[10] << 8) | appData[11],
                thumbWidth: appData[12],
                thumbHeight: appData[13],
                thumbData: appData.subarray(14, 14 + 3 * appData[12] * appData[13]),
              }
            }
          }

          if (fileMarker === 0xFFE1) {
            if (appData[0] === 0x45
              && appData[1] === 0x78
              && appData[2] === 0x69
              && appData[3] === 0x66
              && appData[4] === 0) { // 'EXIF\x00'
              this.exifBuffer = appData.subarray(5, appData.length)
            }
          }

          if (fileMarker === 0xFFEE) {
            if (appData[0] === 0x41 && appData[1] === 0x64 && appData[2] === 0x6F
              && appData[3] === 0x62 && appData[4] === 0x65 && appData[5] === 0) { // 'Adobe\x00'
              adobe = {
                version: appData[6],
                flags0: (appData[7] << 8) | appData[8],
                flags1: (appData[9] << 8) | appData[10],
                transformCode: appData[11],
              }
            }
          }
          break
        }

        case 0xFFDB: {
          // DQT (Define Quantization Tables)
          const quantizationTablesLength = readUint16()
          const quantizationTablesEnd = quantizationTablesLength + offset - 2
          let z
          while (offset < quantizationTablesEnd) {
            const quantizationTableSpec = data[offset++]
            JpegImage.requestMemoryAllocation(64 * 4)
            const tableData = new Int32Array(64)
            if ((quantizationTableSpec >> 4) === 0) { // 8 bit values
              for (j = 0; j < 64; j++) {
                z = JpegImage.dctZigZag[j]
                tableData[z] = data[offset++]
              }
            }
            else if ((quantizationTableSpec >> 4) === 1) { // 16 bit
              for (j = 0; j < 64; j++) {
                z = JpegImage.dctZigZag[j]
                tableData[z] = readUint16()
              }
            }
            else {
              throw new Error('DQT: invalid table spec')
            }
            quantizationTables[quantizationTableSpec & 15] = tableData
          }
          break
        }
        case 0xFFC0: // SOF0 (Start of Frame, Baseline DCT)
        case 0xFFC1: // SOF1 (Start of Frame, Extended DCT)
        case 0xFFC2: {
          // SOF2 (Start of Frame, Progressive DCT)
          readUint16() // skip data length
          frame = {}
          frame.extended = (fileMarker === 0xFFC1)
          frame.progressive = (fileMarker === 0xFFC2)
          frame.precision = data[offset++]
          frame.scanLines = readUint16()
          frame.samplesPerLine = readUint16()
          frame.components = {}
          frame.componentsOrder = []

          const pixelsInFrame = frame.scanLines * frame.samplesPerLine
          if (pixelsInFrame > maxResolutionInPixels) {
            const exceededAmount = Math.ceil((pixelsInFrame - maxResolutionInPixels) / 1e6)
            throw new Error(`maxResolutionInMP limit exceeded by ${exceededAmount}MP`)
          }

          const componentsCount = data[offset++]
          let componentId
          for (i = 0; i < componentsCount; i++) {
            componentId = data[offset]
            const h = data[offset + 1] >> 4
            const v = data[offset + 1] & 15
            const qId = data[offset + 2]

            if (h <= 0 || v <= 0) {
              throw new Error('Invalid sampling factor, expected values above 0')
            }

            frame.componentsOrder.push(componentId)
            frame.components[componentId] = {
              h,
              v,
              quantizationIdx: qId,
            }
            offset += 3
          }
          prepareComponents(frame)
          frames.push(frame)
          break
        }

        case 0xFFC4: {
          // DHT (Define Huffman Tables)
          const huffmanLength = readUint16()
          for (i = 2; i < huffmanLength;) {
            const huffmanTableSpec = data[offset++]
            const codeLengths = new Uint8Array(16)
            let codeLengthSum = 0
            for (j = 0; j < 16; j++, offset++) {
              codeLengthSum += (codeLengths[j] = data[offset])
            }

            JpegImage.requestMemoryAllocation(16 + codeLengthSum)
            const huffmanValues = new Uint8Array(codeLengthSum)

            for (j = 0; j < codeLengthSum; j++, offset++) {
              huffmanValues[j] = data[offset]
            }
            i += 17 + codeLengthSum;

            ((huffmanTableSpec >> 4) === 0 ? huffmanTablesDC : huffmanTablesAC)[huffmanTableSpec & 15]
              = JpegImage.buildHuffmanTable(codeLengths, huffmanValues)
          }
          break
        }

        case 0xFFDD: // DRI (Define Restart Interval)
          readUint16() // skip data length
          // eslint-disable-next-line unused-imports/no-unused-vars
          resetInterval = readUint16()
          break

        case 0xFFDC: // Number of Lines marker
          readUint16() // skip data length
          readUint16() // Ignore this data since it represents the image height
          break

        case 0xFFDA: {
          // SOS (Start of Scan)
          // const scanLength = readUint16()
          const selectorsCount = data[offset++]
          const components: any[] = []
          let component

          for (i = 0; i < selectorsCount; i++) {
            component = frame.components[data[offset++]]
            const tableSpec = data[offset++]
            component.huffmanTableDC = huffmanTablesDC[tableSpec >> 4]
            component.huffmanTableAC = huffmanTablesAC[tableSpec & 15]
            components.push(component)
          }

          const spectralStart = data[offset++]
          const spectralEnd = data[offset++]
          const successiveApproximation = data[offset++]
          const resetInterval: number = 0

          const processed = this.decodeScan(
            data,
            offset,
            frame,
            components,
            resetInterval,
            spectralStart,
            spectralEnd,
            successiveApproximation >> 4,
            successiveApproximation & 15,
          )

          offset += processed
          break
        }

        case 0xFFFF: // Fill bytes
          if (data[offset] !== 0xFF) { // Avoid skipping a valid marker
            offset--
          }
          break

        default:
          if (data[offset - 3] === 0xFF && data[offset - 2] >= 0xC0 && data[offset - 2] <= 0xFE) {
            // could be incorrect encoding -- last 0xFF byte of the previous block was eaten by the encoder
            offset -= 3
            break
          }
          else if (fileMarker === 0xE0 || fileMarker === 0xE1) {
            // Recover from malformed APP1 markers popular in some phone models
            if (malformedDataOffset !== -1) {
              throw new Error(
                `first unknown JPEG marker at offset ${malformedDataOffset.toString(16)}, `
                + `second unknown JPEG marker ${fileMarker.toString(16)} at offset ${(offset - 1).toString(16)}`,
              )
            }
            malformedDataOffset = offset - 1
            const nextOffset = readUint16()
            if (data[offset + nextOffset - 2] === 0xFF) {
              offset += nextOffset - 2
              break
            }
          }
          throw new Error(`unknown JPEG marker ${fileMarker.toString(16)}`)
      }
      fileMarker = readUint16()
    }

    if (frames.length !== 1) {
      throw new Error('only single frame JPEGs supported')
    }

    // set each frame's components quantization table
    for (let i = 0; i < frames.length; i++) {
      const cp = frames[i].components
      for (const j in cp) {
        cp[j].quantizationTable = quantizationTables[cp[j].quantizationIdx]
        delete cp[j].quantizationIdx
      }
    }

    this.width = frame.samplesPerLine
    this.height = frame.scanLines
    this.jfif = jfif
    this.adobe = adobe
    this.components = []

    for (let i = 0; i < frame.componentsOrder.length; i++) {
      const component = frame.components[frame.componentsOrder[i]]
      this.components.push({
        lines: this.buildComponentData(component),
        scaleX: component.h / frame.maxH,
        scaleY: component.v / frame.maxV,
      })
    }
  }

  private buildComponentData(component: any): any[] {
    const lines = []
    const blocksPerLine = component.blocksPerLine
    const blocksPerColumn = component.blocksPerColumn
    const samplesPerLine = blocksPerLine << 3
    const R = new Int32Array(64)
    const r = new Uint8Array(64)

    function quantizeAndInverse(zz: any, dataOut: Uint8Array, dataIn: Int32Array) {
      const qt = component.quantizationTable
      let v0, v1, v2, v3, v4, v5, v6, v7, t
      const p = dataIn
      let i

      // dequant
      for (i = 0; i < 64; i++) {
        p[i] = zz[i] * qt[i]
      }

      // inverse DCT on rows
      for (i = 0; i < 8; ++i) {
        const row = 8 * i

        // check for all-zero AC coefficients
        if (p[1 + row] === 0 && p[2 + row] === 0 && p[3 + row] === 0
          && p[4 + row] === 0 && p[5 + row] === 0 && p[6 + row] === 0
          && p[7 + row] === 0) {
          t = (JpegImage.dctSqrt2 * p[0 + row] + 512) >> 10
          p[0 + row] = t
          p[1 + row] = t
          p[2 + row] = t
          p[3 + row] = t
          p[4 + row] = t
          p[5 + row] = t
          p[6 + row] = t
          p[7 + row] = t
          continue
        }

        // stage 4
        v0 = (JpegImage.dctSqrt2 * p[0 + row] + 128) >> 8
        v1 = (JpegImage.dctSqrt2 * p[4 + row] + 128) >> 8
        v2 = p[2 + row]
        v3 = p[6 + row]
        v4 = (JpegImage.dctSqrt1d2 * (p[1 + row] - p[7 + row]) + 128) >> 8
        v7 = (JpegImage.dctSqrt1d2 * (p[1 + row] + p[7 + row]) + 128) >> 8
        v5 = p[3 + row] << 4
        v6 = p[5 + row] << 4

        // stage 3
        t = (v0 - v1 + 1) >> 1
        v0 = (v0 + v1 + 1) >> 1
        v1 = t
        t = (v2 * JpegImage.dctSin6 + v3 * JpegImage.dctCos6 + 128) >> 8
        v2 = (v2 * JpegImage.dctCos6 - v3 * JpegImage.dctSin6 + 128) >> 8
        v3 = t
        t = (v4 - v6 + 1) >> 1
        v4 = (v4 + v6 + 1) >> 1
        v6 = t
        t = (v7 + v5 + 1) >> 1
        v5 = (v7 - v5 + 1) >> 1
        v7 = t

        // stage 2
        t = (v0 - v3 + 1) >> 1
        v0 = (v0 + v3 + 1) >> 1
        v3 = t
        t = (v1 - v2 + 1) >> 1
        v1 = (v1 + v2 + 1) >> 1
        v2 = t
        t = (v4 * JpegImage.dctSin3 + v7 * JpegImage.dctCos3 + 2048) >> 12
        v4 = (v4 * JpegImage.dctCos3 - v7 * JpegImage.dctSin3 + 2048) >> 12
        v7 = t
        t = (v5 * JpegImage.dctSin1 + v6 * JpegImage.dctCos1 + 2048) >> 12
        v5 = (v5 * JpegImage.dctCos1 - v6 * JpegImage.dctSin1 + 2048) >> 12
        v6 = t

        // stage 1
        p[0 + row] = v0 + v7
        p[7 + row] = v0 - v7
        p[1 + row] = v1 + v6
        p[6 + row] = v1 - v6
        p[2 + row] = v2 + v5
        p[5 + row] = v2 - v5
        p[3 + row] = v3 + v4
        p[4 + row] = v3 - v4
      }

      // inverse DCT on columns
      for (i = 0; i < 8; ++i) {
        const col = i

        // check for all-zero AC coefficients
        if (p[1 * 8 + col] === 0 && p[2 * 8 + col] === 0 && p[3 * 8 + col] === 0
          && p[4 * 8 + col] === 0 && p[5 * 8 + col] === 0 && p[6 * 8 + col] === 0
          && p[7 * 8 + col] === 0) {
          t = (JpegImage.dctSqrt2 * dataIn[i + 0] + 8192) >> 14
          p[0 * 8 + col] = t
          p[1 * 8 + col] = t
          p[2 * 8 + col] = t
          p[3 * 8 + col] = t
          p[4 * 8 + col] = t
          p[5 * 8 + col] = t
          p[6 * 8 + col] = t
          p[7 * 8 + col] = t
          continue
        }

        // stage 4
        v0 = (JpegImage.dctSqrt2 * p[0 * 8 + col] + 2048) >> 12
        v1 = (JpegImage.dctSqrt2 * p[4 * 8 + col] + 2048) >> 12
        v2 = p[2 * 8 + col]
        v3 = p[6 * 8 + col]
        v4 = (JpegImage.dctSqrt1d2 * (p[1 * 8 + col] - p[7 * 8 + col]) + 2048) >> 12
        v7 = (JpegImage.dctSqrt1d2 * (p[1 * 8 + col] + p[7 * 8 + col]) + 2048) >> 12
        v5 = p[3 * 8 + col]
        v6 = p[5 * 8 + col]

        // stage 3
        t = (v0 - v1 + 1) >> 1
        v0 = (v0 + v1 + 1) >> 1
        v1 = t
        t = (v2 * JpegImage.dctSin6 + v3 * JpegImage.dctCos6 + 2048) >> 12
        v2 = (v2 * JpegImage.dctCos6 - v3 * JpegImage.dctSin6 + 2048) >> 12
        v3 = t
        t = (v4 - v6 + 1) >> 1
        v4 = (v4 + v6 + 1) >> 1
        v6 = t
        t = (v7 + v5 + 1) >> 1
        v5 = (v7 - v5 + 1) >> 1
        v7 = t

        // stage 2
        t = (v0 - v3 + 1) >> 1
        v0 = (v0 + v3 + 1) >> 1
        v3 = t
        t = (v1 - v2 + 1) >> 1
        v1 = (v1 + v2 + 1) >> 1
        v2 = t
        t = (v4 * JpegImage.dctSin3 + v7 * JpegImage.dctCos3 + 2048) >> 12
        v4 = (v4 * JpegImage.dctCos3 - v7 * JpegImage.dctSin3 + 2048) >> 12
        v7 = t
        t = (v5 * JpegImage.dctSin1 + v6 * JpegImage.dctCos1 + 2048) >> 12
        v5 = (v5 * JpegImage.dctCos1 - v6 * JpegImage.dctSin1 + 2048) >> 12
        v6 = t

        // stage 1
        p[0 * 8 + col] = v0 + v7
        p[7 * 8 + col] = v0 - v7
        p[1 * 8 + col] = v1 + v6
        p[6 * 8 + col] = v1 - v6
        p[2 * 8 + col] = v2 + v5
        p[5 * 8 + col] = v2 - v5
        p[3 * 8 + col] = v3 + v4
        p[4 * 8 + col] = v3 - v4
      }

      // convert to 8-bit integers
      for (i = 0; i < 64; ++i) {
        const sample = 128 + ((p[i] + 8) >> 4)
        dataOut[i] = sample < 0 ? 0 : sample > 0xFF ? 0xFF : sample
      }
    }

    JpegImage.requestMemoryAllocation(samplesPerLine * blocksPerColumn * 8)

    let i, j
    for (let blockRow = 0; blockRow < blocksPerColumn; blockRow++) {
      const scanLine = blockRow << 3
      for (i = 0; i < 8; i++) {
        lines.push(new Uint8Array(samplesPerLine))
      }

      for (let blockCol = 0; blockCol < blocksPerLine; blockCol++) {
        quantizeAndInverse(component.blocks[blockRow][blockCol], r, R)

        let offset = 0
        const sample = blockCol << 3
        for (j = 0; j < 8; j++) {
          const line = lines[scanLine + j]
          for (i = 0; i < 8; i++) {
            line[sample + i] = r[offset++]
          }
        }
      }
    }
    return lines
  }

  public getData(width: number, height: number): Uint8Array {
    const scaleX = this.width / width
    const scaleY = this.height / height

    let component1, component2, component3, component4
    let component1Line, component2Line, component3Line, component4Line
    let x, y
    let offset = 0
    let Y, Cb, Cr, K, C, M, Ye, R, G, B
    let colorTransform
    const dataLength = width * height * this.components.length

    JpegImage.requestMemoryAllocation(dataLength)
    const data = new Uint8Array(dataLength)

    switch (this.components.length) {
      case 1:
        component1 = this.components[0]
        for (y = 0; y < height; y++) {
          component1Line = component1.lines[0 | (y * component1.scaleY * scaleY)]
          for (x = 0; x < width; x++) {
            Y = component1Line[0 | (x * component1.scaleX * scaleX)]
            data[offset++] = Y
          }
        }
        break

      case 2:
        // PDF might compress two component data in custom colorspace
        component1 = this.components[0]
        component2 = this.components[1]
        for (y = 0; y < height; y++) {
          component1Line = component1.lines[0 | (y * component1.scaleY * scaleY)]
          component2Line = component2.lines[0 | (y * component2.scaleY * scaleY)]
          for (x = 0; x < width; x++) {
            Y = component1Line[0 | (x * component1.scaleX * scaleX)]
            data[offset++] = Y
            Y = component2Line[0 | (x * component2.scaleX * scaleX)]
            data[offset++] = Y
          }
        }
        break

      case 3:
        // The default transform for three components is true
        colorTransform = true
        // The adobe transform marker overrides any previous setting
        if (this.adobe && this.adobe.transformCode) {
          colorTransform = true
        }
        else if (typeof this.opts.colorTransform !== 'undefined') {
          colorTransform = !!this.opts.colorTransform
        }

        component1 = this.components[0]
        component2 = this.components[1]
        component3 = this.components[2]
        for (y = 0; y < height; y++) {
          component1Line = component1.lines[0 | (y * component1.scaleY * scaleY)]
          component2Line = component2.lines[0 | (y * component2.scaleY * scaleY)]
          component3Line = component3.lines[0 | (y * component3.scaleY * scaleY)]
          for (x = 0; x < width; x++) {
            if (!colorTransform) {
              R = component1Line[0 | (x * component1.scaleX * scaleX)]
              G = component2Line[0 | (x * component2.scaleX * scaleX)]
              B = component3Line[0 | (x * component3.scaleX * scaleX)]
            }
            else {
              Y = component1Line[0 | (x * component1.scaleX * scaleX)]
              Cb = component2Line[0 | (x * component2.scaleX * scaleX)]
              Cr = component3Line[0 | (x * component3.scaleX * scaleX)]

              R = JpegImage.clampTo8bit(Y + 1.402 * (Cr - 128))
              G = JpegImage.clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128))
              B = JpegImage.clampTo8bit(Y + 1.772 * (Cb - 128))
            }

            data[offset++] = R
            data[offset++] = G
            data[offset++] = B
          }
        }
        break

      case 4:
        if (!this.adobe) {
          throw new Error('Unsupported color mode (4 components)')
        }
        // The default transform for four components is false
        colorTransform = false
        // The adobe transform marker overrides any previous setting
        if (this.adobe && this.adobe.transformCode) {
          colorTransform = true
        }
        else if (typeof this.opts.colorTransform !== 'undefined') {
          colorTransform = !!this.opts.colorTransform
        }

        component1 = this.components[0]
        component2 = this.components[1]
        component3 = this.components[2]
        component4 = this.components[3]
        for (y = 0; y < height; y++) {
          component1Line = component1.lines[0 | (y * component1.scaleY * scaleY)]
          component2Line = component2.lines[0 | (y * component2.scaleY * scaleY)]
          component3Line = component3.lines[0 | (y * component3.scaleY * scaleY)]
          component4Line = component4.lines[0 | (y * component4.scaleY * scaleY)]
          for (x = 0; x < width; x++) {
            if (!colorTransform) {
              C = component1Line[0 | (x * component1.scaleX * scaleX)]
              M = component2Line[0 | (x * component2.scaleX * scaleX)]
              Ye = component3Line[0 | (x * component3.scaleX * scaleX)]
              K = component4Line[0 | (x * component4.scaleX * scaleX)]
            }
            else {
              Y = component1Line[0 | (x * component1.scaleX * scaleX)]
              Cb = component2Line[0 | (x * component2.scaleX * scaleX)]
              Cr = component3Line[0 | (x * component3.scaleX * scaleX)]
              K = component4Line[0 | (x * component4.scaleX * scaleX)]

              C = 255 - JpegImage.clampTo8bit(Y + 1.402 * (Cr - 128))
              M = 255 - JpegImage.clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128))
              Ye = 255 - JpegImage.clampTo8bit(Y + 1.772 * (Cb - 128))
            }
            data[offset++] = 255 - C
            data[offset++] = 255 - M
            data[offset++] = 255 - Ye
            data[offset++] = 255 - K
          }
        }
        break

      default:
        throw new Error('Unsupported color mode')
    }
    return data
  }

  public copyToImageData(image: {
    width: number
    height: number
    data: Uint8Array | Uint8ClampedArray | Buffer
  }, formatAsRGBA: boolean): void {
    const width = image.width
    const height = image.height
    const imageDataArray = image.data
    const data = this.getData(width, height)
    let i = 0
    let j = 0
    let x, y
    let Y, K, C, M, R, G, B

    switch (this.components.length) {
      case 1:
        for (y = 0; y < height; y++) {
          for (x = 0; x < width; x++) {
            Y = data[i++]

            imageDataArray[j++] = Y
            imageDataArray[j++] = Y
            imageDataArray[j++] = Y
            if (formatAsRGBA) {
              imageDataArray[j++] = 255
            }
          }
        }
        break

      case 3:
        for (y = 0; y < height; y++) {
          for (x = 0; x < width; x++) {
            R = data[i++]
            G = data[i++]
            B = data[i++]

            imageDataArray[j++] = R
            imageDataArray[j++] = G
            imageDataArray[j++] = B
            if (formatAsRGBA) {
              imageDataArray[j++] = 255
            }
          }
        }
        break

      case 4:
        for (y = 0; y < height; y++) {
          for (x = 0; x < width; x++) {
            C = data[i++]
            M = data[i++]
            Y = data[i++]
            K = data[i++]

            R = 255 - JpegImage.clampTo8bit(C * (1 - K / 255) + K)
            G = 255 - JpegImage.clampTo8bit(M * (1 - K / 255) + K)
            B = 255 - JpegImage.clampTo8bit(Y * (1 - K / 255) + K)

            imageDataArray[j++] = R
            imageDataArray[j++] = G
            imageDataArray[j++] = B
            if (formatAsRGBA) {
              imageDataArray[j++] = 255
            }
          }
        }
        break

      default:
        throw new Error('Unsupported color mode')
    }
  }

  private decodeScan(
    data: Uint8Array,
    offset: number,
    frame: any,
    components: any[],
    resetInterval: number,
    spectralStart: number,
    spectralEnd: number,
    successivePrev: number,
    successive: number,
  ): number {
    const mcusPerLine = frame.mcusPerLine
    const progressive = frame.progressive
    const startOffset = offset
    let bitsData = 0
    let bitsCount = 0

    function readBit(): number {
      if (bitsCount > 0) {
        bitsCount--
        return (bitsData >> bitsCount) & 1
      }

      bitsData = data[offset++]

      if (bitsData === 0xFF) {
        const nextByte = data[offset++]

        if (nextByte) {
          throw new Error(`unexpected marker: ${((bitsData << 8) | nextByte).toString(16)}`)
        }
        // unstuff 0
      }

      bitsCount = 7

      return bitsData >>> 7
    }

    function decodeHuffman(tree: any): number | null {
      let node = tree
      let bit

      // eslint-disable-next-line no-cond-assign
      while ((bit = readBit()) !== null) {
        node = node[bit]
        if (typeof node === 'number') {
          return node
        }

        if (typeof node !== 'object') {
          throw new TypeError('invalid huffman sequence')
        }
      }

      return null
    }

    function receive(length: number): number | null {
      let n = 0

      while (length > 0) {
        const bit = readBit()

        if (bit === null)
          return null

        n = (n << 1) | bit
        length--
      }

      return n
    }

    function receiveAndExtend(length: number): number | null {
      const n = receive(length)

      if (n === null)
        return null

      if (n >= 1 << (length - 1)) {
        return n
      }

      return n + (-1 << length) + 1
    }

    function decodeBaseline(component: any, zz: Int32Array): void {
      const t = decodeHuffman(component.huffmanTableDC)

      if (t === null)
        throw new Error('invalid huffman sequence. t is null')

      const diff = t === 0 ? 0 : receiveAndExtend(t)
      zz[0] = (component.pred += diff)

      let k = 1
      while (k < 64) {
        const rs = decodeHuffman(component.huffmanTableAC)

        if (rs === null)
          throw new Error('invalid huffman sequence. rs is null')

        const s = rs & 15
        const r = rs >> 4

        if (s === 0) {
          if (r < 15)
            break

          k += 16
          continue
        }

        k += r

        const z = JpegImage.dctZigZag[k]
        const v = receiveAndExtend(s)

        if (v === null)
          throw new Error('invalid huffman sequence. v is null')

        zz[z] = v
        k++
      }
    }

    function decodeDCFirst(component: any, zz: Int32Array): void {
      const t = decodeHuffman(component.huffmanTableDC)

      if (t === null)
        throw new Error('invalid huffman sequence. t is null')

      const a = receiveAndExtend(t)
      if (a === null)
        throw new Error('invalid huffman sequence. a is null')

      const diff = t === 0 ? 0 : (a << successive)
      zz[0] = (component.pred += diff)
    }

    function decodeDCSuccessive(component: any, zz: Int32Array): void {
      zz[0] |= readBit() << successive
    }

    let eobrun = 0
    function decodeACFirst(component: any, zz: Int32Array): void {
      if (eobrun > 0) {
        eobrun--
        return
      }
      let k = spectralStart
      const e = spectralEnd

      while (k <= e) {
        const rs = decodeHuffman(component.huffmanTableAC)

        if (rs === null)
          throw new Error('invalid huffman sequence. rs is null')

        const s = rs & 15
        const r = rs >> 4

        if (s === 0) {
          if (r < 15) {
            const b = receive(r)

            if (b === null)
              throw new Error('invalid huffman sequence. b is null')

            eobrun = b + (1 << r) - 1
            break
          }

          k += 16
          continue
        }
        k += r

        const z = JpegImage.dctZigZag[k]
        const v = receiveAndExtend(s)

        if (v === null)
          throw new Error('invalid huffman sequence. v is null')

        zz[z] = v * (1 << successive)
        k++
      }
    }

    let successiveACState = 0
    let successiveACNextValue: number

    function decodeACSuccessive(component: any, zz: Int32Array): void {
      let k = spectralStart
      const e = spectralEnd
      let r = 0

      while (k <= e) {
        const z = JpegImage.dctZigZag[k]
        const direction = zz[z] < 0 ? -1 : 1
        switch (successiveACState) {
          case 0: {
            // initial state
            const rs = decodeHuffman(component.huffmanTableAC)
            if (rs === null)
              throw new Error('invalid huffman sequence. rs is null')

            const s = rs & 15
            r = rs >> 4

            if (s === 0) {
              if (r < 15) {
                const b = receive(r)

                if (b === null)
                  throw new Error('invalid huffman sequence. b is null')

                eobrun = b + (1 << r)
                successiveACState = 4
              }
              else {
                r = 16
                successiveACState = 1
              }
            }
            else {
              if (s !== 1) {
                throw new Error('invalid ACn encoding')
              }

              const v = receiveAndExtend(s)

              if (v === null)
                throw new Error('invalid huffman sequence. v is null')

              successiveACNextValue = v
              successiveACState = r ? 2 : 3
            }

            continue
          }
          case 1: // skipping r zero items
          case 2:
            if (zz[z]) {
              zz[z] += (readBit() << successive) * direction
            }
            else {
              r--
              if (r === 0) {
                successiveACState = successiveACState === 2 ? 3 : 0
              }
            }
            break
          case 3: // set value for a zero item
            if (zz[z]) {
              zz[z] += (readBit() << successive) * direction
            }
            else {
              zz[z] = successiveACNextValue << successive
              successiveACState = 0
            }

            break
          case 4: // eob
            if (zz[z]) {
              zz[z] += (readBit() << successive) * direction
            }

            break
        }
        k++
      }
      if (successiveACState === 4) {
        eobrun--
        if (eobrun === 0) {
          successiveACState = 0
        }
      }
    }

    // eslint-disable-next-line ts/no-unsafe-function-type
    function decodeMcu(this: JpegImage, component: any, decode: Function, mcu: number, row: number, col: number): void {
      const mcuRow = (mcu / mcusPerLine) | 0
      const mcuCol = mcu % mcusPerLine
      const blockRow = mcuRow * component.v + row
      const blockCol = mcuCol * component.h + col

      // If the block is missing and we're in tolerant mode, just skip it.
      if (component.blocks[blockRow] === undefined && this.opts.tolerantDecoding)
        return

      decode(component, component.blocks[blockRow][blockCol])
    }

    // eslint-disable-next-line ts/no-unsafe-function-type
    function decodeBlock(this: JpegImage, component: any, decode: Function, mcu: number): void {
      const blockRow = (mcu / component.blocksPerLine) | 0
      const blockCol = mcu % component.blocksPerLine

      // If the block is missing and we're in tolerant mode, just skip it.
      if (component.blocks[blockRow] === undefined && this.opts.tolerantDecoding)
        return

      decode(component, component.blocks[blockRow][blockCol])
    }

    const componentsLength = components.length
    let component, i, j, k, n
    let decodeFn

    if (progressive) {
      if (spectralStart === 0) {
        decodeFn = successivePrev === 0 ? decodeDCFirst : decodeDCSuccessive
      }
      else {
        decodeFn = successivePrev === 0 ? decodeACFirst : decodeACSuccessive
      }
    }
    else {
      decodeFn = decodeBaseline
    }

    let mcu = 0
    let marker
    let mcuExpected

    if (componentsLength === 1) {
      mcuExpected = components[0].blocksPerLine * components[0].blocksPerColumn
    }
    else {
      mcuExpected = mcusPerLine * frame.mcusPerColumn
    }

    if (!resetInterval) {
      resetInterval = mcuExpected
    }

    let h, v
    while (mcu < mcuExpected) {
      // reset interval stuff
      for (i = 0; i < componentsLength; i++) {
        components[i].pred = 0
      }
      eobrun = 0

      if (componentsLength === 1) {
        component = components[0]
        for (n = 0; n < resetInterval; n++) {
          decodeBlock.call(this, component, decodeFn, mcu)
          mcu++
        }
      }
      else {
        for (n = 0; n < resetInterval; n++) {
          for (i = 0; i < componentsLength; i++) {
            component = components[i]
            h = component.h
            v = component.v
            for (j = 0; j < v; j++) {
              for (k = 0; k < h; k++) {
                decodeMcu.call(this, component, decodeFn, mcu, j, k)
              }
            }
          }
          mcu++

          // If we've reached our expected MCU's, stop decoding
          if (mcu === mcuExpected) {
            break
          }
        }
      }

      if (mcu === mcuExpected) {
        // Skip trailing bytes at the end of the scan - until we reach the next marker
        do {
          if (data[offset] === 0xFF) {
            if (data[offset + 1] !== 0x00) {
              break
            }
          }
          offset += 1
        } while (offset < data.length - 2)
      }

      // find marker
      bitsCount = 0
      marker = (data[offset] << 8) | data[offset + 1]

      if (marker < 0xFF00) {
        throw new Error('marker was not found')
      }

      if (marker >= 0xFFD0 && marker <= 0xFFD7) { // RSTx
        offset += 2
      }
      else {
        break
      }
    }

    return offset - startOffset
  }
}

export function decode(jpegData: BufferLike, userOpts?: DecoderOptions): (UintArrRet & { comments?: string[] }) | ImageData {
  const defaultOpts = {
    // "undefined" means "Choose whether to transform colors based on the image's color model."
    colorTransform: undefined,
    useTArray: false,
    formatAsRGBA: true,
    tolerantDecoding: true,
    maxResolutionInMP: 100, // Don't decode more than 100 megapixels
    maxMemoryUsageInMB: 512, // Don't decode if memory footprint is more than 512MB
  }

  const opts = { ...defaultOpts, ...userOpts }
  const arr = jpegData instanceof Uint8Array
    ? jpegData
    : new Uint8Array(jpegData instanceof ArrayBuffer ? jpegData : Array.from(jpegData))
  const decoder = new JpegImage()

  decoder.opts = opts

  // Need to make resetMaxMemoryUsage and requestMemoryAllocation public in JpegImage class
  JpegImage.resetMaxMemoryUsage(opts.maxMemoryUsageInMB * 1024 * 1024)
  decoder.parse(arr)

  const channels = opts.formatAsRGBA ? 4 : 3
  const bytesNeeded = decoder.width * decoder.height * channels

  let image: ImageData & {
    comments?: string[]
  }

  try {
    JpegImage.requestMemoryAllocation(bytesNeeded)

    image = {
      width: decoder.width,
      height: decoder.height,
      exifBuffer: decoder.exifBuffer,
      data: new Uint8ClampedArray(decoder.getData(decoder.width, decoder.height).buffer),
      comments: decoder.comments.length > 0 ? decoder.comments : undefined,
      colorSpace: 'srgb' as const,
    } as ImageData & { comments?: string[] }

    if (decoder.comments.length > 0) {
      image.comments = decoder.comments
    }

    decoder.copyToImageData(image, opts.formatAsRGBA)

    return image
  }
  catch (err) {
    if (err instanceof RangeError) {
      throw new TypeError(
        `Could not allocate enough memory for the image. Required: ${bytesNeeded}`,
      )
    }

    if (err instanceof ReferenceError && err.message === 'Buffer is not defined') {
      throw new Error(
        'Buffer is not globally defined in this environment. Consider setting useTArray to true',
      )
    }

    throw err
  }
}
