import { decode } from './decoder'
import { encode } from './encoder'
import { optimize } from './optimize'

export { decode, encode, optimize }

const jpeg: {
  decode: typeof decode
  encode: typeof encode
  optimize: typeof optimize
} = { decode, encode, optimize }

export default jpeg
