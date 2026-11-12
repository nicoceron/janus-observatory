/**
 * A small gzip reader, used only where the browser has no DecompressionStream. It follows the
 * DEFLATE specification (RFC 1951) directly and favours clarity over speed.
 */

const MAX_BITS = 15;
const LENGTH_BASE = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131,
  163, 195, 227, 258,
];
const LENGTH_EXTRA = [
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0,
];
const DISTANCE_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049,
  3073, 4097, 6145, 8193, 12289, 16385, 24577,
];
const DISTANCE_EXTRA = [
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13,
];
const CODE_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

type Huffman = { count: Uint16Array; symbol: Uint16Array };

function construct(lengths: ArrayLike<number>, n: number): Huffman {
  const count = new Uint16Array(MAX_BITS + 1);
  const symbol = new Uint16Array(n);
  for (let i = 0; i < n; i++) count[lengths[i]]++;
  count[0] = 0;
  const offsets = new Uint16Array(MAX_BITS + 2);
  for (let length = 1; length <= MAX_BITS; length++)
    offsets[length + 1] = offsets[length] + count[length];
  for (let i = 0; i < n; i++) if (lengths[i]) symbol[offsets[lengths[i]]++] = i;
  return { count, symbol };
}

const fixed = (() => {
  const lengths = new Uint8Array(288);
  lengths.fill(8, 0, 144).fill(9, 144, 256).fill(7, 256, 280).fill(8, 280, 288);
  return {
    literal: construct(lengths, 288),
    distance: construct(new Uint8Array(30).fill(5), 30),
  };
})();

export function inflate(input: Uint8Array, size: number): Uint8Array {
  const out = new Uint8Array(size);
  let position = 0,
    written = 0,
    buffer = 0,
    held = 0;

  const bits = (need: number) => {
    let value = buffer;
    while (held < need) {
      if (position >= input.length) throw new Error('Truncated deflate stream.');
      value |= input[position++] << held;
      held += 8;
    }
    buffer = value >>> need;
    held -= need;
    return value & ((1 << need) - 1);
  };

  const decode = (table: Huffman) => {
    let code = 0,
      first = 0,
      index = 0;
    for (let length = 1; length <= MAX_BITS; length++) {
      code |= bits(1);
      const count = table.count[length];
      if (code - count < first) return table.symbol[index + (code - first)];
      index += count;
      first = (first + count) << 1;
      code <<= 1;
    }
    throw new Error('Invalid deflate code.');
  };

  const block = (literal: Huffman, distance: Huffman) => {
    for (;;) {
      let symbol = decode(literal);
      if (symbol < 256) {
        out[written++] = symbol;
      } else if (symbol === 256) {
        return;
      } else {
        symbol -= 257;
        if (symbol >= 29) throw new Error('Invalid deflate length.');
        const length = LENGTH_BASE[symbol] + bits(LENGTH_EXTRA[symbol]);
        const d = decode(distance);
        if (d >= 30) throw new Error('Invalid deflate distance.');
        const offset = DISTANCE_BASE[d] + bits(DISTANCE_EXTRA[d]);
        if (offset > written) throw new Error('Deflate distance too far back.');
        for (let i = 0; i < length; i++, written++) out[written] = out[written - offset];
      }
    }
  };

  for (let last = 0; !last;) {
    last = bits(1);
    const type = bits(2);
    if (type === 0) {
      buffer = 0;
      held = 0;
      const length = input[position] | (input[position + 1] << 8);
      position += 4;
      out.set(input.subarray(position, position + length), written);
      position += length;
      written += length;
    } else if (type === 1) {
      block(fixed.literal, fixed.distance);
    } else if (type === 2) {
      const literals = bits(5) + 257,
        distances = bits(5) + 1,
        codes = bits(4) + 4;
      const lengths = new Uint8Array(320);
      for (let i = 0; i < codes; i++) lengths[CODE_ORDER[i]] = bits(3);
      const lengthCode = construct(lengths.slice(0, 19), 19);
      lengths.fill(0);
      for (let index = 0; index < literals + distances;) {
        const symbol = decode(lengthCode);
        if (symbol < 16) {
          lengths[index++] = symbol;
          continue;
        }
        let value = 0,
          repeat: number;
        if (symbol === 16) {
          if (!index) throw new Error('Invalid deflate repeat.');
          value = lengths[index - 1];
          repeat = 3 + bits(2);
        } else if (symbol === 17) repeat = 3 + bits(3);
        else repeat = 11 + bits(7);
        if (index + repeat > literals + distances) throw new Error('Invalid deflate lengths.');
        while (repeat--) lengths[index++] = value;
      }
      block(
        construct(lengths.subarray(0, literals), literals),
        construct(lengths.subarray(literals, literals + distances), distances),
      );
    } else throw new Error('Invalid deflate block.');
  }
  return written === size ? out : out.subarray(0, written);
}

/** Decompress a gzip member. */
export function gunzip(data: Uint8Array): Uint8Array {
  if (data[0] !== 0x1f || data[1] !== 0x8b || data[2] !== 8) throw new Error('Not gzip data.');
  const flags = data[3];
  let position = 10;
  if (flags & 4) position += 2 + (data[position] | (data[position + 1] << 8));
  if (flags & 8) while (data[position++]);
  if (flags & 16) while (data[position++]);
  if (flags & 2) position += 2;
  const end = data.length;
  const size =
    (data[end - 4] | (data[end - 3] << 8) | (data[end - 2] << 16) | (data[end - 1] << 24)) >>> 0;
  return inflate(data.subarray(position, end - 8), size);
}
