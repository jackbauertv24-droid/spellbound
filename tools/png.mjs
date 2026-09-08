/**
 * Minimal PNG decode/encode — zero dependencies, Node's zlib only.
 * Shared by tools/ingest-art.mjs. (validate-assets.mjs keeps its own copy on
 * purpose: the gate must not break if this file is edited.)
 */
import { inflateSync, deflateSync } from 'node:zlib';

const crcTable = [...Array(256)].map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const paeth = (a, b, c) => {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

export function decodePng(buf) {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) if (buf[i] !== sig[i]) throw new Error('not a PNG file');
  let pos = 8, ihdr = null, plte = null, trns = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') ihdr = {
      width: data.readUInt32BE(0), height: data.readUInt32BE(4),
      depth: data[8], colorType: data[9], interlace: data[12],
    };
    else if (type === 'PLTE') plte = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (!ihdr) throw new Error('missing IHDR');
  if (ihdr.depth !== 8) throw new Error(`bit depth ${ihdr.depth}; only 8-bit is supported — re-export as 8-bit`);
  if (ihdr.interlace) throw new Error('interlaced PNG; re-export without Adam7 interlacing');
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ihdr.colorType];
  if (!channels) throw new Error(`unsupported colour type ${ihdr.colorType}`);

  const raw = inflateSync(Buffer.concat(idat));
  const { width: w, height: h } = ihdr, stride = w * channels;
  const out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[y * stride + x - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? out[(y - 1) * stride + x - channels] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1; else if (f === 4) v += paeth(a, b, c);
      else if (f !== 0) throw new Error(`bad scanline filter ${f}`);
      out[y * stride + x] = v & 0xff;
    }
  }
  const px = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const s = i * channels, d = i * 4;
    if (ihdr.colorType === 6) { px[d]=out[s]; px[d+1]=out[s+1]; px[d+2]=out[s+2]; px[d+3]=out[s+3]; }
    else if (ihdr.colorType === 2) { px[d]=out[s]; px[d+1]=out[s+1]; px[d+2]=out[s+2]; px[d+3]=255; }
    else if (ihdr.colorType === 0) { px[d]=px[d+1]=px[d+2]=out[s]; px[d+3]=255; }
    else if (ihdr.colorType === 4) { px[d]=px[d+1]=px[d+2]=out[s]; px[d+3]=out[s+1]; }
    else { const k = out[s]; px[d]=plte[k*3]; px[d+1]=plte[k*3+1]; px[d+2]=plte[k*3+2];
           px[d+3] = trns && k < trns.length ? trns[k] : 255; }
  }
  return { width: w, height: h, px };
}

export function encodePng(w, h, px) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w * 4; x++) raw[y * (w * 4 + 1) + 1 + x] = px[y * w * 4 + x];
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}
