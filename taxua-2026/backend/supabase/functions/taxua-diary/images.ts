import { ImageMagick, initializeImageMagick, MagickFormat, MagickReadSettings, ResourceLimits } from '@imagemagick/magick-wasm';

const wasmUrl = 'https://cdn.jsdelivr.net/npm/@imagemagick/magick-wasm@0.0.44/dist/x86/magick.wasm';
const wasmHash = 'b7d6710436b150dc5bd1ca04d80b6b7614c54854d7470f888f7e69a2a41b00e4';
let initialized: Promise<void> | null = null;

export function jpegSize(bytes: Uint8Array) {
  if (bytes[0] !== 255 || bytes[1] !== 216) throw new Error('INVALID_IMAGE');
  let offset = 2;
  while (offset < Math.min(bytes.length - 9, 262144)) {
    if (bytes[offset++] !== 255) throw new Error('INVALID_IMAGE');
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 0xda || marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const length = bytes[offset] * 256 + bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) throw new Error('INVALID_IMAGE');
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      const height = bytes[offset + 3] * 256 + bytes[offset + 4];
      const width = bytes[offset + 5] * 256 + bytes[offset + 6];
      if (!width || !height || width > 1600 || height > 1600 || width * height > 2560000) throw new Error('IMAGE_DIMENSIONS');
      return { width, height };
    }
    offset += length;
  }
  throw new Error('INVALID_IMAGE');
}

async function initialize() {
  if (!initialized) initialized = (async () => {
    const response = await fetch(wasmUrl, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('IMAGE_PROCESSOR_UNAVAILABLE');
    const bytes = new Uint8Array(await response.arrayBuffer());
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(v => v.toString(16).padStart(2, '0')).join('');
    if (digest !== wasmHash) throw new Error('IMAGE_PROCESSOR_UNAVAILABLE');
    await initializeImageMagick(bytes);
    ResourceLimits.width = 1600n;
    ResourceLimits.height = 1600n;
    ResourceLimits.area = 2560000n;
    ResourceLimits.memory = 100663296n;
    ResourceLimits.disk = 0n;
    // ImageMagick uses temporary images during JPEG decode/resize. The decoder
    // is forced to JPEG, so this does not enable multi-frame input formats.
    ResourceLimits.listLength = 8n;
    ResourceLimits.maxProfileSize = 262144n;
  })().catch(error => { initialized = null; throw error; });
  await initialized;
}

export async function processImage(bytes: Uint8Array) {
  jpegSize(bytes); // Bound allocations before the decoder sees untrusted bytes.
  await initialize();
  try { return ImageMagick.read(bytes, new MagickReadSettings({ format: MagickFormat.Jpeg }), image => {
    if (image.width > 1600 || image.height > 1600) throw new Error('IMAGE_DIMENSIONS');
    image.autoOrient();
    image.strip();
    image.quality = 82;
    const width = image.width, height = image.height;
    const full = image.write(MagickFormat.Jpeg, data => new Uint8Array(data));
    const scale = Math.min(1, 640 / Math.max(width, height));
    image.resize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
    image.quality = 78;
    const thumb = image.write(MagickFormat.Jpeg, data => new Uint8Array(data));
    return { full, thumb, width, height };
  }); } catch { throw new Error('INVALID_IMAGE'); }
}
