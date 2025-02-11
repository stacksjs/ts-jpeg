import { decode } from './decoder'
import { encode } from './encoder'

export { decode, encode }

const jpeg: {
  decode: typeof decode
  encode: typeof encode
} = { decode, encode }

export default jpeg
