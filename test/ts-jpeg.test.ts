const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')
const jpeg = require('..')

function fixture(name) {
  return fs.readFileSync(path.join(__dirname, 'fixtures', name))
}

const SUPER_LARGE_JPEG_BASE64 = '/9j/wfFRBf//BdgC/9p/2P/E4d4='

const SUPER_LARGE_RESOLUTION_JPEG_BASE64 = '/9j/wfFR2PDh3g=='

const SUPER_LARGE_JPEG_BUFFER = Buffer.from(SUPER_LARGE_JPEG_BASE64, 'base64')
const SUPER_LARGE_RESOLUTION_JPEG_BUFFER = Buffer.from(SUPER_LARGE_RESOLUTION_JPEG_BASE64, 'base64')

it('reads image with a bad e1 marker not preceeded by ff', () => {
  const jpegData = fixture('table-with-bad-e1.jpg')
  const rawImageData = jpeg.decode(jpegData)
  const expected = fixture('table-with-good-e1.jpg')
  const rawExpectedImageData = jpeg.decode(expected)
  expect(rawImageData.data).toEqual(rawExpectedImageData.data)
})

it('decodes a JPEG', () => {
  const jpegData = fixture('grumpycat.jpg')
  const rawImageData = jpeg.decode(jpegData)
  expect(rawImageData.width).toEqual(320)
  expect(rawImageData.height).toEqual(180)
  const expected = fixture('grumpycat.rgba')
  expect(rawImageData.data).toEqual(expected)
})

it('decodes a JPEG with fill bytes', () => {
  const jpegData = fixture('fillbytes.jpg')
  const rawImageData = jpeg.decode(jpegData)
  expect(rawImageData.width).toEqual(704)
  expect(rawImageData.height).toEqual(576)
})

it('decodes a JPEG with RST intervals', () => {
  const jpegData = fixture('redbox-with-rst.jpg')
  const rawImageData = jpeg.decode(jpegData)
  const expected = fixture('redbox.jpg')
  const rawExpectedImageData = jpeg.decode(expected)
  expect(rawImageData.data).toEqual(rawExpectedImageData.data)
})

it('decodes a JPEG with trailing bytes', () => {
  const jpegData = fixture('redbox-with-trailing-bytes.jpg')
  const rawImageData = jpeg.decode(jpegData)
  const expected = fixture('redbox.jpg')
  const rawExpectedImageData = jpeg.decode(expected)
  expect(rawImageData.data).toEqual(rawExpectedImageData.data)
})

it('decodes a grayscale JPEG', () => {
  const jpegData = fixture('apsara.jpg')
  const rawImageData = jpeg.decode(jpegData)
  expect(rawImageData.width).toEqual(580)
  expect(rawImageData.height).toEqual(599)
  expect(rawImageData.comments).toEqual(['File source: http://commons.wikimedia.org/wiki/File:Apsara-mit-Sitar.jpg'])
  const expected = fixture('apsara.rgba')
  expect(rawImageData.data).toEqual(expected)
})

it('decodes a 32-bit TrueColor RGB image', () => {
  const jpegData = fixture('truecolor.jpg')
  const rawImageData = jpeg.decode(jpegData, { colorTransform: false })
  expect(rawImageData.width).toEqual(1280)
  expect(rawImageData.height).toEqual(2000)
  const expected = fixture('truecolor.rgba')
  expect(rawImageData.data).toEqual(expected)
})

it('decodes a CMYK jpeg with correct colors', () => {
  const jpegData = fixture('tree-cmyk.jpg')
  const rawImageData = jpeg.decode(jpegData)
  expect(rawImageData.width).toEqual(400)
  expect(rawImageData.height).toEqual(250)
  const expected = fixture('tree-cmyk.rgba')
  expect(rawImageData.data).toEqual(expected)
})

it('decodes a CMYK jpeg with correct colors without transform', () => {
  const jpegData = fixture('tree-cmyk-notransform.jpg')
  const rawImageData = jpeg.decode(jpegData)
  expect(rawImageData.width).toEqual(400)
  expect(rawImageData.height).toEqual(250)
  const expected = fixture('tree-cmyk-notransform.rgba')
  expect(rawImageData.data).toEqual(expected)
})

it('decodes an RGB jpeg with correct colors', () => {
  const jpegData = fixture('tree-rgb.jpg')
  const rawImageData = jpeg.decode(jpegData)
  expect(rawImageData.width).toEqual(400)
  expect(rawImageData.height).toEqual(250)
  const expected = fixture('tree-rgb.rgba')
  expect(rawImageData.data).toEqual(expected)
})

it('decodes an progressive RGB jpeg with correct colors', () => {
  const jpegData = fixture('rgb.jpg')
  const rawImageData = jpeg.decode(jpegData)
  expect(rawImageData.width).toEqual(350)
  expect(rawImageData.height).toEqual(262)
  const expected = fixture('rgb.rgba')
  expect(rawImageData.data).toEqual(expected)
})

it('decodes a greyscale CMYK jpeg with correct colors', () => {
  const jpegData = fixture('cmyk-grey.jpg')
  const rawImageData = jpeg.decode(jpegData)
  expect(rawImageData.width).toEqual(300)
  expect(rawImageData.height).toEqual(389)
  const expected = fixture('cmyk-grey.rgba')
  expect(rawImageData.data).toEqual(expected)
})

it('decodes an adobe CMYK jpeg with correct colors', () => {
  const jpegData = fixture('cmyktest.jpg')
  const rawImageData = jpeg.decode(jpegData)
  expect(rawImageData.width).toEqual(300)
  expect(rawImageData.height).toEqual(111)
  const expected = fixture('cmyktest.rgba')
  expect(rawImageData.data).toEqual(expected)

  const jpegData2 = fixture('plusshelf-drawing.jpg')
  const rawImageData2 = jpeg.decode(jpegData2)
  expect(rawImageData2.width).toEqual(350)
  expect(rawImageData2.height).toEqual(233)
  const expected2 = fixture('plusshelf-drawing.rgba')
  expect(rawImageData2.data).toEqual(expected2)
})

it('decodes a unconventional table JPEG', () => {
  const jpegData = fixture('unconventional-table.jpg')
  const rawImageData = jpeg.decode(jpegData)
  expect(rawImageData.width).toEqual(1920)
  expect(rawImageData.height).toEqual(1200)
})

it('decodes a progressive JPEG', () => {
  const jpegData = fixture('skater-progressive.jpg')
  const rawImageData = jpeg.decode(jpegData)
  expect(rawImageData.width).toEqual(256)
  expect(rawImageData.height).toEqual(256)
  const expected = fixture('skater-progressive.rgba')
  expect(rawImageData.data).toEqual(expected)
})

it('decodes a progressive JPEG the same as non-progressive', () => {
  const jpegData = fixture('skater.jpg')
  const rawImageData = jpeg.decode(jpegData)

  const otherJpegData = fixture('skater-progressive.jpg')
  const otherRawImageData = jpeg.decode(otherJpegData)

  expect(rawImageData.width).toEqual(otherRawImageData.width)
  expect(rawImageData.height).toEqual(otherRawImageData.height)
  expect(rawImageData.data).toEqual(otherRawImageData.data)
})

it('encodes a JPEG', () => {
  const frameData = fixture('grumpycat.rgba')
  const rawImageData = {
    data: frameData,
    width: 320,
    height: 180,
  }
  const jpegImageData = jpeg.encode(rawImageData, 50)
  expect(jpegImageData.width).toEqual(320)
  expect(jpegImageData.height).toEqual(180)
  const expected = fixture('grumpycat-50.jpg')
  expect(jpegImageData.data).toEqual(expected)
})

it('creates a JPEG from an array', () => {
  const width = 320
  const height = 180
  const frameData = Buffer.alloc(width * height * 4)
  let i = 0
  while (i < frameData.length) {
    frameData[i++] = 0xFF // red
    frameData[i++] = 0x00 // green
    frameData[i++] = 0x00 // blue
    frameData[i++] = 0xFF // alpha - ignored in JPEGs
  }
  const rawImageData = {
    data: frameData,
    width,
    height,
  }
  const jpegImageData = jpeg.encode(rawImageData, 50)
  expect(jpegImageData.width).toEqual(width)
  expect(jpegImageData.height).toEqual(height)
  const expected = fixture('redbox.jpg')
  expect(jpegImageData.data).toEqual(expected)
})

it('creates a JPEG from an array with comment', () => {
  const width = 320
  const height = 180
  const comments = ['First comment', 'Second comment']
  const frameData = Buffer.alloc(width * height * 4)
  let i = 0
  while (i < frameData.length) {
    frameData[i++] = 0xFF // red
    frameData[i++] = 0x00 // green
    frameData[i++] = 0x00 // blue
    frameData[i++] = 0xFF // alpha - ignored in JPEGs
  }
  const rawImageData = {
    data: frameData,
    width,
    height,
    comments,
  }
  const jpegImageData = jpeg.encode(rawImageData, 50)
  expect(jpegImageData.width).toEqual(width)
  expect(jpegImageData.height).toEqual(height)
  const expected = fixture('redbox_comment.jpg')
  expect(jpegImageData.data).toEqual(expected)
  expect(jpeg.decode(jpegImageData.data).comments).toEqual(['First comment', 'Second comment'])
})

it('decodes a JPEG into a typed array', () => {
  const jpegData = fixture('grumpycat.jpg')
  const rawImageData = jpeg.decode(jpegData, { useTArray: true })
  expect(rawImageData.width).toEqual(320)
  expect(rawImageData.height).toEqual(180)
  const expected = fixture('grumpycat.rgba')
  expect(rawImageData.data).toEqual(new Uint8Array(expected))
  assert.ok(rawImageData.data instanceof Uint8Array, 'data is a typed array')
})

it('decodes a JPEG from a typed array into a typed array', () => {
  const jpegData = fixture('grumpycat.jpg')
  const rawImageData = jpeg.decode(new Uint8Array(jpegData), { useTArray: true })
  expect(rawImageData.width).toEqual(320)
  expect(rawImageData.height).toEqual(180)
  const expected = fixture('grumpycat.rgba')
  expect(rawImageData.data).toEqual(new Uint8Array(expected))
  assert.ok(rawImageData.data instanceof Uint8Array, 'data is a typed array')
})

it('decodes a JPEG with options', () => {
  const jpegData = fixture('grumpycat.jpg')
  const rawImageData = jpeg.decode(new Uint8Array(jpegData), {
    useTArray: true,
    colorTransform: false,
  })
  expect(rawImageData.width).toEqual(320)
  expect(rawImageData.height).toEqual(180)
  const expected = fixture('grumpycat-nocolortrans.rgba')
  expect(rawImageData.data).toEqual(new Uint8Array(expected))
  assert.ok(rawImageData.data instanceof Uint8Array, 'data is a typed array')
})

it('decodes a JPEG into RGB', () => {
  const jpegData = fixture('grumpycat.jpg')
  const rawImageData = jpeg.decode(new Uint8Array(jpegData), { useTArray: true, formatAsRGBA: false })
  expect(rawImageData.width).toEqual(320)
  expect(rawImageData.height).toEqual(180)
  const expected = fixture('grumpycat.rgb')
  expect(rawImageData.data).toEqual(new Uint8Array(expected))
  assert.ok(rawImageData.data instanceof Uint8Array, 'data is a typed array')
})

it('encodes/decode image with exif data', () => {
  const jpegData = fixture('grumpycat.jpg')
  const imageData = jpeg.decode(new Uint8Array(jpegData))
  assert.ok(imageData.exifBuffer, 'decodes an exif buffer')
  const encodedData = jpeg.encode(imageData)
  const loopImageData = jpeg.decode(new Uint8Array(encodedData.data))
  expect(loopImageData.exifBuffer).toEqual(imageData.exifBuffer)
})

it('decodes image with ffdc marker', () => {
  const jpegData = fixture('marker-ffdc.jpg')
  const imageData = jpeg.decode(new Uint8Array(jpegData))
  expect(imageData.height).toEqual(200)
  expect(imageData.width).toEqual(200)
})

it('decodes large images within memory limits', () => {
  const jpegData = fixture('black-6000x6000.jpg')
  const rawImageData = jpeg.decode(jpegData)
  expect(rawImageData.width).toEqual(6000)
  expect(rawImageData.height).toEqual(6000)
}, 30000)

// See https://github.com/eugeneware/jpeg-js/issues/53
it('limits resolution exposure', () => {
  expect(() => jpeg.decode(SUPER_LARGE_RESOLUTION_JPEG_BUFFER)).toThrow(
    'maxResolutionInMP limit exceeded by 3405MP',
  )
})

it('limits memory exposure', () => {
  expect(() => jpeg.decode(SUPER_LARGE_JPEG_BUFFER, { maxResolutionInMP: 500 })).toThrow(
    /maxMemoryUsageInMB limit exceeded by at least \d+MB/,
  )

  // Make sure the limit resets each decode.
  const jpegData = fixture('grumpycat.jpg')
  expect(() => jpeg.decode(jpegData)).not.toThrow()
}, 30000)

// See https://github.com/jpeg-js/jpeg-js/issues/105
it('errors out invalid sampling factors', () => {
  expect(() => jpeg.decode(Buffer.from('/9j/wfFR2AD/UdgA/9r/3g==', 'base64')).toThrow(
    'Invalid sampling factor, expected values above 0',
  ))
})
