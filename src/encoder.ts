import type { BufferLike, BufferRet, ImageData, RawImageData, UintArrRet } from './types'
import { Buffer } from 'node:buffer'

/*
  Copyright (c) 2008, Adobe Systems Incorporated
  All rights reserved.

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are
  met:

  * Redistributions of source code must retain the above copyright notice,
    this list of conditions and the following disclaimer.

  * Redistributions in binary form must reproduce the above copyright
    notice, this list of conditions and the following disclaimer in the
    documentation and/or other materials provided with the distribution.

  * Neither the name of Adobe Systems Incorporated nor the names of its
    contributors may be used to endorse or promote products derived from
    this software without specific prior written permission.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
  IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
  THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
  PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
  CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
  SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
/*
  JPEG encoder ported to TypeScript and optimized by Chris Breuer
  Basic GUI blocking jpeg encoder
*/

// var btoa = btoa || function (buf) {
//   return Buffer.from(buf).toString('base64')
// }

export class JPEGEncoder {
  private YTable: number[] = Array.from({ length: 64 })
  private UVTable: number[] = Array.from({ length: 64 })
  private fdtbl_Y: number[] = Array.from({ length: 64 })
  private fdtbl_UV: number[] = Array.from({ length: 64 })
  private YDC_HT: any
  private UVDC_HT: any
  private YAC_HT: any
  private UVAC_HT: any
  private bitcode: any[] = Array.from({ length: 65535 })
  private category: any[] = Array.from({ length: 65535 })
  private outputfDCTQuant: number[] = Array.from({ length: 64 })
  private DU: number[] = Array.from({ length: 64 })
  private byteout: number[] = []
  private bytenew: number = 0
  private bytepos: number = 7
  private YDU: number[] = Array.from({ length: 64 })
  private UDU: number[] = Array.from({ length: 64 })
  private VDU: number[] = Array.from({ length: 64 })
  private clt: string[] = Array.from({ length: 256 })
  private RGB_YUV_TABLE: number[] = Array.from({ length: 2048 })
  private currentQuality!: number

  private readonly ZigZag: number[] = [
    0,
    1,
    5,
    6,
    14,
    15,
    27,
    28,
    2,
    4,
    7,
    13,
    16,
    26,
    29,
    42,
    3,
    8,
    12,
    17,
    25,
    30,
    41,
    43,
    9,
    11,
    18,
    24,
    31,
    40,
    44,
    53,
    10,
    19,
    23,
    32,
    39,
    45,
    52,
    54,
    20,
    22,
    33,
    38,
    46,
    51,
    55,
    60,
    21,
    34,
    37,
    47,
    50,
    56,
    59,
    61,
    35,
    36,
    48,
    49,
    57,
    58,
    62,
    63,
  ]

  private readonly std_dc_luminance_nrcodes: number[] = [0, 0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0]
  private readonly std_dc_luminance_values: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  private readonly std_ac_luminance_nrcodes: number[] = [0, 0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 0x7D]
  private readonly std_ac_luminance_values: number[] = [
    0x01,
    0x02,
    0x03,
    0x00,
    0x04,
    0x11,
    0x05,
    0x12,
    0x21,
    0x31,
    0x41,
    0x06,
    0x13,
    0x51,
    0x61,
    0x07,
    0x22,
    0x71,
    0x14,
    0x32,
    0x81,
    0x91,
    0xA1,
    0x08,
    0x23,
    0x42,
    0xB1,
    0xC1,
    0x15,
    0x52,
    0xD1,
    0xF0,
    0x24,
    0x33,
    0x62,
    0x72,
    0x82,
    0x09,
    0x0A,
    0x16,
    0x17,
    0x18,
    0x19,
    0x1A,
    0x25,
    0x26,
    0x27,
    0x28,
    0x29,
    0x2A,
    0x34,
    0x35,
    0x36,
    0x37,
    0x38,
    0x39,
    0x3A,
    0x43,
    0x44,
    0x45,
    0x46,
    0x47,
    0x48,
    0x49,
    0x4A,
    0x53,
    0x54,
    0x55,
    0x56,
    0x57,
    0x58,
    0x59,
    0x5A,
    0x63,
    0x64,
    0x65,
    0x66,
    0x67,
    0x68,
    0x69,
    0x6A,
    0x73,
    0x74,
    0x75,
    0x76,
    0x77,
    0x78,
    0x79,
    0x7A,
    0x83,
    0x84,
    0x85,
    0x86,
    0x87,
    0x88,
    0x89,
    0x8A,
    0x92,
    0x93,
    0x94,
    0x95,
    0x96,
    0x97,
    0x98,
    0x99,
    0x9A,
    0xA2,
    0xA3,
    0xA4,
    0xA5,
    0xA6,
    0xA7,
    0xA8,
    0xA9,
    0xAA,
    0xB2,
    0xB3,
    0xB4,
    0xB5,
    0xB6,
    0xB7,
    0xB8,
    0xB9,
    0xBA,
    0xC2,
    0xC3,
    0xC4,
    0xC5,
    0xC6,
    0xC7,
    0xC8,
    0xC9,
    0xCA,
    0xD2,
    0xD3,
    0xD4,
    0xD5,
    0xD6,
    0xD7,
    0xD8,
    0xD9,
    0xDA,
    0xE1,
    0xE2,
    0xE3,
    0xE4,
    0xE5,
    0xE6,
    0xE7,
    0xE8,
    0xE9,
    0xEA,
    0xF1,
    0xF2,
    0xF3,
    0xF4,
    0xF5,
    0xF6,
    0xF7,
    0xF8,
    0xF9,
    0xFA,
  ]

  private readonly std_dc_chrominance_nrcodes: number[] = [0, 0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0]
  private readonly std_dc_chrominance_values: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  private readonly std_ac_chrominance_nrcodes: number[] = [0, 0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 0x77]
  private readonly std_ac_chrominance_values: number[] = [
    0x00,
    0x01,
    0x02,
    0x03,
    0x11,
    0x04,
    0x05,
    0x21,
    0x31,
    0x06,
    0x12,
    0x41,
    0x51,
    0x07,
    0x61,
    0x71,
    0x13,
    0x22,
    0x32,
    0x81,
    0x08,
    0x14,
    0x42,
    0x91,
    0xA1,
    0xB1,
    0xC1,
    0x09,
    0x23,
    0x33,
    0x52,
    0xF0,
    0x15,
    0x62,
    0x72,
    0xD1,
    0x0A,
    0x16,
    0x24,
    0x34,
    0xE1,
    0x25,
    0xF1,
    0x17,
    0x18,
    0x19,
    0x1A,
    0x26,
    0x27,
    0x28,
    0x29,
    0x2A,
    0x35,
    0x36,
    0x37,
    0x38,
    0x39,
    0x3A,
    0x43,
    0x44,
    0x45,
    0x46,
    0x47,
    0x48,
    0x49,
    0x4A,
    0x53,
    0x54,
    0x55,
    0x56,
    0x57,
    0x58,
    0x59,
    0x5A,
    0x63,
    0x64,
    0x65,
    0x66,
    0x67,
    0x68,
    0x69,
    0x6A,
    0x73,
    0x74,
    0x75,
    0x76,
    0x77,
    0x78,
    0x79,
    0x7A,
    0x82,
    0x83,
    0x84,
    0x85,
    0x86,
    0x87,
    0x88,
    0x89,
    0x8A,
    0x92,
    0x93,
    0x94,
    0x95,
    0x96,
    0x97,
    0x98,
    0x99,
    0x9A,
    0xA2,
    0xA3,
    0xA4,
    0xA5,
    0xA6,
    0xA7,
    0xA8,
    0xA9,
    0xAA,
    0xB2,
    0xB3,
    0xB4,
    0xB5,
    0xB6,
    0xB7,
    0xB8,
    0xB9,
    0xBA,
    0xC2,
    0xC3,
    0xC4,
    0xC5,
    0xC6,
    0xC7,
    0xC8,
    0xC9,
    0xCA,
    0xD2,
    0xD3,
    0xD4,
    0xD5,
    0xD6,
    0xD7,
    0xD8,
    0xD9,
    0xDA,
    0xE2,
    0xE3,
    0xE4,
    0xE5,
    0xE6,
    0xE7,
    0xE8,
    0xE9,
    0xEA,
    0xF2,
    0xF3,
    0xF4,
    0xF5,
    0xF6,
    0xF7,
    0xF8,
    0xF9,
    0xFA,
  ]

  constructor(quality?: number) {
    if (quality) {
      this.setQuality(quality)
    }
    else {
      this.setQuality(50)
    }
    this.init()
  }

  private writeAPP0(): void {
    this.writeWord(0xFFE0) // marker
    this.writeWord(16) // length
    this.writeByte(0x4A) // J
    this.writeByte(0x46) // F
    this.writeByte(0x49) // I
    this.writeByte(0x46) // F
    this.writeByte(0) // = "JFIF",'\0'
    this.writeByte(1) // versionhi
    this.writeByte(1) // versionlo
    this.writeByte(0) // xyunits
    this.writeWord(1) // xdensity
    this.writeWord(1) // ydensity
    this.writeByte(0) // thumbnwidth
    this.writeByte(0) // thumbnheight
  }

  private writeAPP1(exifBuffer?: Uint8Array): void {
    if (!exifBuffer)
      return

    this.writeWord(0xFFE1) // APP1 marker

    if (exifBuffer[0] === 0x45
      && exifBuffer[1] === 0x78
      && exifBuffer[2] === 0x69
      && exifBuffer[3] === 0x66) {
      // Buffer already starts with EXIF, just use it directly
      this.writeWord(exifBuffer.length + 2) // length is buffer + length itself!
    }
    else {
      // Buffer doesn't start with EXIF, write it for them
      this.writeWord(exifBuffer.length + 5 + 2) // length is buffer + EXIF\0 + length itself!
      this.writeByte(0x45) // E
      this.writeByte(0x78) // X
      this.writeByte(0x69) // I
      this.writeByte(0x66) // F
      this.writeByte(0) // = "EXIF",'\0'
    }

    for (let i = 0; i < exifBuffer.length; i++) {
      this.writeByte(exifBuffer[i])
    }
  }

  private writeSOF0(width: number, height: number): void {
    this.writeWord(0xFFC0) // marker
    this.writeWord(17) // length, truecolor YUV JPG
    this.writeByte(8) // precision
    this.writeWord(height)
    this.writeWord(width)
    this.writeByte(3) // nrofcomponents
    this.writeByte(1) // IdY
    this.writeByte(0x11) // HVY
    this.writeByte(0) // QTY
    this.writeByte(2) // IdU
    this.writeByte(0x11) // HVU
    this.writeByte(1) // QTU
    this.writeByte(3) // IdV
    this.writeByte(0x11) // HVV
    this.writeByte(1) // QTV
  }

  private writeDQT(): void {
    this.writeWord(0xFFDB) // marker
    this.writeWord(132) // length
    this.writeByte(0)
    for (let i = 0; i < 64; i++) {
      this.writeByte(this.YTable[i])
    }
    this.writeByte(1)
    for (let j = 0; j < 64; j++) {
      this.writeByte(this.UVTable[j])
    }
  }

  private writeDHT(): void {
    this.writeWord(0xFFC4) // marker
    this.writeWord(0x01A2) // length

    this.writeByte(0) // HTYDCinfo
    for (let i = 0; i < 16; i++) {
      this.writeByte(this.std_dc_luminance_nrcodes[i + 1])
    }
    for (let j = 0; j <= 11; j++) {
      this.writeByte(this.std_dc_luminance_values[j])
    }

    this.writeByte(0x10) // HTYACinfo
    for (let k = 0; k < 16; k++) {
      this.writeByte(this.std_ac_luminance_nrcodes[k + 1])
    }
    for (let l = 0; l <= 161; l++) {
      this.writeByte(this.std_ac_luminance_values[l])
    }

    this.writeByte(1) // HTUDCinfo
    for (let m = 0; m < 16; m++) {
      this.writeByte(this.std_dc_chrominance_nrcodes[m + 1])
    }
    for (let n = 0; n <= 11; n++) {
      this.writeByte(this.std_dc_chrominance_values[n])
    }

    this.writeByte(0x11) // HTUACinfo
    for (let o = 0; o < 16; o++) {
      this.writeByte(this.std_ac_chrominance_nrcodes[o + 1])
    }
    for (let p = 0; p <= 161; p++) {
      this.writeByte(this.std_ac_chrominance_values[p])
    }
  }

  private writeCOM(comments?: string[]): void {
    if (typeof comments === 'undefined' || !Array.isArray(comments)) {
      return
    }

    comments.forEach((comment) => {
      if (typeof comment !== 'string')
        return

      this.writeWord(0xFFFE) // marker
      this.writeWord(comment.length + 2) // length itself as well

      for (let i = 0; i < comment.length; i++) {
        this.writeByte(comment.charCodeAt(i))
      }
    })
  }

  private writeSOS(): void {
    this.writeWord(0xFFDA) // marker
    this.writeWord(12) // length
    this.writeByte(3) // nrofcomponents
    this.writeByte(1) // IdY
    this.writeByte(0) // HTY
    this.writeByte(2) // IdU
    this.writeByte(0x11) // HTU
    this.writeByte(3) // IdV
    this.writeByte(0x11) // HTV
    this.writeByte(0) // Ss
    this.writeByte(0x3F) // Se
    this.writeByte(0) // Bf
  }

  private processDU(CDU: number[], fdtbl: number[], DC: number, HTDC: any[], HTAC: any[]): number {
    const EOB = HTAC[0x00]
    const M16zeroes = HTAC[0xF0]
    let pos
    const I16 = 16
    const I63 = 63
    const I64 = 64
    const DU_DCT = this.fDCTQuant(CDU, fdtbl)

    // ZigZag reorder
    for (let j = 0; j < I64; ++j) {
      this.DU[this.ZigZag[j]] = DU_DCT[j]
    }

    const Diff = this.DU[0] - DC
    const currentDC = this.DU[0]

    // Encode DC
    if (Diff === 0) {
      this.writeBits(HTDC[0]) // Diff might be 0
    }
    else {
      pos = 32767 + Diff
      this.writeBits(HTDC[this.category[pos]])
      this.writeBits(this.bitcode[pos])
    }

    // Encode ACs
    let end0pos = 63
    // eslint-disable-next-line no-empty
    for (; (end0pos > 0) && (this.DU[end0pos] === 0); end0pos--) { }

    // end0pos = first element in reverse order !=0
    if (end0pos === 0) {
      this.writeBits(EOB)
      return currentDC
    }

    let i = 1
    let lng
    while (i <= end0pos) {
      const startpos = i
      // eslint-disable-next-line no-empty
      for (; (this.DU[i] === 0) && (i <= end0pos); ++i) { }
      let nrzeroes = i - startpos
      if (nrzeroes >= I16) {
        lng = nrzeroes >> 4
        for (let nrmarker = 1; nrmarker <= lng; ++nrmarker) {
          this.writeBits(M16zeroes)
        }
        nrzeroes = nrzeroes & 0xF
      }
      pos = 32767 + this.DU[i]
      this.writeBits(HTAC[(nrzeroes << 4) + this.category[pos]])
      this.writeBits(this.bitcode[pos])
      i++
    }

    if (end0pos !== I63) {
      this.writeBits(EOB)
    }

    return currentDC
  }

  private initCharLookupTable(): void {
    for (let i = 0; i < 256; i++) {
      this.clt[i] = String.fromCharCode(i)
    }
  }

  public encode(image: {
    width: number
    height: number
    data: Uint8Array
    comments?: string[]
    exifBuffer?: Uint8Array
  }, quality?: number): Uint8Array | Buffer {
    // const time_start = new Date().getTime()

    if (quality) {
      this.setQuality(quality)
    }

    // Initialize bit writer
    this.byteout = []
    this.bytenew = 0
    this.bytepos = 7

    // Add JPEG headers
    this.writeWord(0xFFD8) // SOI
    this.writeAPP0()
    this.writeCOM(image.comments)
    this.writeAPP1(image.exifBuffer)
    this.writeDQT()
    this.writeSOF0(image.width, image.height)
    this.writeDHT()
    this.writeSOS()

    // Encode 8x8 macroblocks
    let DCY = 0
    let DCU = 0
    let DCV = 0

    this.bytenew = 0
    this.bytepos = 7

    const width = image.width
    const height = image.height
    const imageData = image.data
    const quadWidth = width * 4

    let x = 0
    let y = 0

    while (y < height) {
      x = 0
      while (x < quadWidth) {
        const start = quadWidth * y + x
        let p = start
        let col = -1
        let row = 0

        for (let pos = 0; pos < 64; pos++) {
          row = pos >> 3 // /8
          col = (pos & 7) * 4 // %8
          p = start + (row * quadWidth) + col

          if (y + row >= height) { // padding bottom
            p -= (quadWidth * (y + 1 + row - height))
          }

          if (x + col >= quadWidth) { // padding right
            p -= ((x + col) - quadWidth + 4)
          }

          const r = imageData[p++]
          const g = imageData[p++]
          const b = imageData[p++]

          this.YDU[pos] = ((this.RGB_YUV_TABLE[r]
            + this.RGB_YUV_TABLE[(g + 256) >> 0]
            + this.RGB_YUV_TABLE[(b + 512) >> 0]) >> 16) - 128
          this.UDU[pos] = ((this.RGB_YUV_TABLE[(r + 768) >> 0]
            + this.RGB_YUV_TABLE[(g + 1024) >> 0]
            + this.RGB_YUV_TABLE[(b + 1280) >> 0]) >> 16) - 128
          this.VDU[pos] = ((this.RGB_YUV_TABLE[(r + 1280) >> 0]
            + this.RGB_YUV_TABLE[(g + 1536) >> 0]
            + this.RGB_YUV_TABLE[(b + 1792) >> 0]) >> 16) - 128
        }

        DCY = this.processDU(this.YDU, this.fdtbl_Y, DCY, this.YDC_HT, this.YAC_HT)
        DCU = this.processDU(this.UDU, this.fdtbl_UV, DCU, this.UVDC_HT, this.UVAC_HT)
        DCV = this.processDU(this.VDU, this.fdtbl_UV, DCV, this.UVDC_HT, this.UVAC_HT)
        x += 32
      }
      y += 8
    }

    // Do the bit alignment of the EOI marker
    if (this.bytepos >= 0) {
      const fillbits = []
      fillbits[1] = this.bytepos + 1
      fillbits[0] = (1 << (this.bytepos + 1)) - 1
      this.writeBits(fillbits)
    }

    // Write EOI marker
    this.writeWord(0xFFD9)

    if (typeof module === 'undefined') {
      return new Uint8Array(this.byteout)
    }

    return Buffer.from(this.byteout)
  }

  private setQuality(quality: number): void {
    if (quality <= 0) {
      quality = 1
    }
    if (quality > 100) {
      quality = 100
    }

    if (this.currentQuality === quality) {
      return // don't recalc if unchanged
    }

    let sf = 0
    if (quality < 50) {
      sf = Math.floor(5000 / quality)
    }
    else {
      sf = Math.floor(200 - quality * 2)
    }

    this.initQuantTables(sf)
    this.currentQuality = quality
  }

  private init(): void {
    this.initCharLookupTable()
    this.initHuffmanTbl()
    this.initCategoryNumber()
    this.initRGBYUVTable()
  }

  private initQuantTables(sf: number): void {
    const YQT: number[] = [
      16,
      11,
      10,
      16,
      24,
      40,
      51,
      61,
      12,
      12,
      14,
      19,
      26,
      58,
      60,
      55,
      14,
      13,
      16,
      24,
      40,
      57,
      69,
      56,
      14,
      17,
      22,
      29,
      51,
      87,
      80,
      62,
      18,
      22,
      37,
      56,
      68,
      109,
      103,
      77,
      24,
      35,
      55,
      64,
      81,
      104,
      113,
      92,
      49,
      64,
      78,
      87,
      103,
      121,
      120,
      101,
      72,
      92,
      95,
      98,
      112,
      100,
      103,
      99,
    ]

    for (let i = 0; i < 64; i++) {
      let t = Math.floor((YQT[i] * sf + 50) / 100)
      t = Math.max(1, Math.min(255, t))
      this.YTable[this.ZigZag[i]] = t
    }

    const UVQT: number[] = [
      17,
      18,
      24,
      47,
      99,
      99,
      99,
      99,
      18,
      21,
      26,
      66,
      99,
      99,
      99,
      99,
      24,
      26,
      56,
      99,
      99,
      99,
      99,
      99,
      47,
      66,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
      99,
    ]

    for (let j = 0; j < 64; j++) {
      let u = Math.floor((UVQT[j] * sf + 50) / 100)
      u = Math.max(1, Math.min(255, u))
      this.UVTable[this.ZigZag[j]] = u
    }

    const aasf: number[] = [
      1.0,
      1.387039845,
      1.306562965,
      1.175875602,
      1.0,
      0.785694958,
      0.541196100,
      0.275899379,
    ]

    let k = 0
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        this.fdtbl_Y[k] = 1.0 / (this.YTable[this.ZigZag[k]] * aasf[row] * aasf[col] * 8.0)
        this.fdtbl_UV[k] = 1.0 / (this.UVTable[this.ZigZag[k]] * aasf[row] * aasf[col] * 8.0)
        k++
      }
    }
  }

  private computeHuffmanTbl(nrcodes: number[], std_table: number[]): any[] {
    let codevalue = 0
    let pos_in_table = 0
    const HT: any[] = []

    for (let k = 1; k <= 16; k++) {
      for (let j = 1; j <= nrcodes[k]; j++) {
        HT[std_table[pos_in_table]] = []
        HT[std_table[pos_in_table]][0] = codevalue
        HT[std_table[pos_in_table]][1] = k
        pos_in_table++
        codevalue++
      }
      codevalue *= 2
    }
    return HT
  }

  private initHuffmanTbl(): void {
    this.YDC_HT = this.computeHuffmanTbl(this.std_dc_luminance_nrcodes, this.std_dc_luminance_values)
    this.UVDC_HT = this.computeHuffmanTbl(this.std_dc_chrominance_nrcodes, this.std_dc_chrominance_values)
    this.YAC_HT = this.computeHuffmanTbl(this.std_ac_luminance_nrcodes, this.std_ac_luminance_values)
    this.UVAC_HT = this.computeHuffmanTbl(this.std_ac_chrominance_nrcodes, this.std_ac_chrominance_values)
  }

  private initCategoryNumber(): void {
    let nrlower = 1
    let nrupper = 2
    for (let cat = 1; cat <= 15; cat++) {
      // Positive numbers
      for (let nr = nrlower; nr < nrupper; nr++) {
        this.category[32767 + nr] = cat
        this.bitcode[32767 + nr] = []
        this.bitcode[32767 + nr][1] = cat
        this.bitcode[32767 + nr][0] = nr
      }
      // Negative numbers
      for (let nrneg = -(nrupper - 1); nrneg <= -nrlower; nrneg++) {
        this.category[32767 + nrneg] = cat
        this.bitcode[32767 + nrneg] = []
        this.bitcode[32767 + nrneg][1] = cat
        this.bitcode[32767 + nrneg][0] = nrupper - 1 + nrneg
      }
      nrlower <<= 1
      nrupper <<= 1
    }
  }

  private initRGBYUVTable(): void {
    for (let i = 0; i < 256; i++) {
      this.RGB_YUV_TABLE[i] = 19595 * i
      this.RGB_YUV_TABLE[(i + 256) >> 0] = 38470 * i
      this.RGB_YUV_TABLE[(i + 512) >> 0] = 7471 * i + 0x8000
      this.RGB_YUV_TABLE[(i + 768) >> 0] = -11059 * i
      this.RGB_YUV_TABLE[(i + 1024) >> 0] = -21709 * i
      this.RGB_YUV_TABLE[(i + 1280) >> 0] = 32768 * i + 0x807FFF
      this.RGB_YUV_TABLE[(i + 1536) >> 0] = -27439 * i
      this.RGB_YUV_TABLE[(i + 1792) >> 0] = -5329 * i
    }
  }

  private writeBits(bs: number[]): void {
    const value = bs[0]
    let posval = bs[1] - 1
    while (posval >= 0) {
      if (value & (1 << posval)) {
        this.bytenew |= (1 << this.bytepos)
      }
      posval--
      this.bytepos--
      if (this.bytepos < 0) {
        if (this.bytenew === 0xFF) {
          this.writeByte(0xFF)
          this.writeByte(0)
        }
        else {
          this.writeByte(this.bytenew)
        }
        this.bytepos = 7
        this.bytenew = 0
      }
    }
  }

  private writeByte(value: number): void {
    this.byteout.push(value)
  }

  private writeWord(value: number): void {
    this.writeByte((value >> 8) & 0xFF)
    this.writeByte((value) & 0xFF)
  }

  private fDCTQuant(data: number[], fdtbl: number[]): number[] {
    let d0, d1, d2, d3, d4, d5, d6, d7
    /* Pass 1: process rows. */
    let dataOff = 0
    let i
    const I8 = 8
    const I64 = 64

    for (i = 0; i < I8; ++i) {
      d0 = data[dataOff]
      d1 = data[dataOff + 1]
      d2 = data[dataOff + 2]
      d3 = data[dataOff + 3]
      d4 = data[dataOff + 4]
      d5 = data[dataOff + 5]
      d6 = data[dataOff + 6]
      d7 = data[dataOff + 7]

      const tmp0 = d0 + d7
      const tmp7 = d0 - d7
      const tmp1 = d1 + d6
      const tmp6 = d1 - d6
      const tmp2 = d2 + d5
      const tmp5 = d2 - d5
      const tmp3 = d3 + d4
      const tmp4 = d3 - d4

      /* Even part */
      let tmp10 = tmp0 + tmp3
      const tmp13 = tmp0 - tmp3
      let tmp11 = tmp1 + tmp2
      let tmp12 = tmp1 - tmp2

      data[dataOff] = tmp10 + tmp11
      data[dataOff + 4] = tmp10 - tmp11

      const z1 = (tmp12 + tmp13) * 0.707106781
      data[dataOff + 2] = tmp13 + z1
      data[dataOff + 6] = tmp13 - z1

      /* Odd part */
      tmp10 = tmp4 + tmp5
      tmp11 = tmp5 + tmp6
      tmp12 = tmp6 + tmp7

      const z5 = (tmp10 - tmp12) * 0.382683433
      const z2 = 0.541196100 * tmp10 + z5
      const z4 = 1.306562965 * tmp12 + z5
      const z3 = tmp11 * 0.707106781

      const z11 = tmp7 + z3
      const z13 = tmp7 - z3

      data[dataOff + 5] = z13 + z2
      data[dataOff + 3] = z13 - z2
      data[dataOff + 1] = z11 + z4
      data[dataOff + 7] = z11 - z4

      dataOff += 8
    }

    /* Pass 2: process columns. */
    dataOff = 0
    for (i = 0; i < I8; ++i) {
      d0 = data[dataOff]
      d1 = data[dataOff + 8]
      d2 = data[dataOff + 16]
      d3 = data[dataOff + 24]
      d4 = data[dataOff + 32]
      d5 = data[dataOff + 40]
      d6 = data[dataOff + 48]
      d7 = data[dataOff + 56]

      const tmp0p2 = d0 + d7
      const tmp7p2 = d0 - d7
      const tmp1p2 = d1 + d6
      const tmp6p2 = d1 - d6
      const tmp2p2 = d2 + d5
      const tmp5p2 = d2 - d5
      const tmp3p2 = d3 + d4
      const tmp4p2 = d3 - d4

      /* Even part */
      let tmp10p2 = tmp0p2 + tmp3p2
      const tmp13p2 = tmp0p2 - tmp3p2
      let tmp11p2 = tmp1p2 + tmp2p2
      let tmp12p2 = tmp1p2 - tmp2p2

      data[dataOff] = tmp10p2 + tmp11p2
      data[dataOff + 32] = tmp10p2 - tmp11p2

      const z1p2 = (tmp12p2 + tmp13p2) * 0.707106781
      data[dataOff + 16] = tmp13p2 + z1p2
      data[dataOff + 48] = tmp13p2 - z1p2

      /* Odd part */
      tmp10p2 = tmp4p2 + tmp5p2
      tmp11p2 = tmp5p2 + tmp6p2
      tmp12p2 = tmp6p2 + tmp7p2

      const z5p2 = (tmp10p2 - tmp12p2) * 0.382683433
      const z2p2 = 0.541196100 * tmp10p2 + z5p2
      const z4p2 = 1.306562965 * tmp12p2 + z5p2
      const z3p2 = tmp11p2 * 0.707106781

      const z11p2 = tmp7p2 + z3p2
      const z13p2 = tmp7p2 - z3p2

      data[dataOff + 40] = z13p2 + z2p2
      data[dataOff + 24] = z13p2 - z2p2
      data[dataOff + 8] = z11p2 + z4p2
      data[dataOff + 56] = z11p2 - z4p2

      dataOff++
    }

    // Quantize/descale the coefficients
    for (i = 0; i < I64; ++i) {
    // Apply the quantization and scaling factor & Round to nearest integer
      const fDCTQuant = data[i] * fdtbl[i]
      this.outputfDCTQuant[i] = (fDCTQuant > 0.0) ? ((fDCTQuant + 0.5) | 0) : ((fDCTQuant - 0.5) | 0)
    }

    return this.outputfDCTQuant
  }
}

export function encode(imgData: RawImageData<BufferLike> & { comments?: string[] }, quality?: number): BufferRet {
  if (typeof quality === 'undefined')
    quality = 50

  const encoder = new JPEGEncoder(quality)
  const inputData = 'buffer' in imgData.data
    ? new Uint8Array(imgData.data.buffer)
    : new Uint8Array(imgData.data as ArrayLike<number>)

  const data = encoder.encode({
    ...imgData,
    data: inputData,
  }, quality)

  return {
    data: (typeof Buffer !== 'undefined'
      ? Buffer.from(data.buffer)
      : new Uint8ClampedArray(data.buffer)),
    width: imgData.width,
    height: imgData.height,
  }
}

// helper function to get the imageData of an existing image on the current page.
export function getImageDataFromImage(idOrElement: string | HTMLImageElement): ImageData {
  const theImg = (typeof idOrElement === 'string' ? document.getElementById(idOrElement) : idOrElement) as HTMLImageElement
  const cvs = document.createElement('canvas')
  cvs.width = theImg?.width
  cvs.height = theImg?.height
  const ctx = cvs.getContext('2d')
  ctx?.drawImage(theImg, 0, 0)

  const imageData = ctx!.getImageData(0, 0, cvs.width, cvs.height)

  return {
    data: typeof Buffer !== 'undefined'
      ? Buffer.from(imageData.data.buffer)
      : new Uint8ClampedArray(imageData.data.buffer),
    width: imageData.width,
    height: imageData.height,
  }
}
