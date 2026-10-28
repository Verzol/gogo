/* Local HEIC decoding. No photo bytes leave this worker for another service.
 * libheif 1.23.7 / libde265 1.0.16: LGPL-3.0-or-later, vendor/heif/. */
'use strict';
importScripts('./vendor/heif/libheif.js');
const heif = buildLibheif({ print() {}, printErr() {} });
self.onmessage = async ({ data: file }) => {
  let decoder, images, bitmap;
  try {
    if (!(file instanceof Blob) || !file.size || file.size > 20 * 1024 * 1024) throw new Error('REQUEST_TOO_LARGE');
    decoder = new heif.HeifDecoder();
    images = decoder.decode(await file.arrayBuffer());
    const image = images.find(item => item.is_primary()) || images[0];
    if (!image) throw new Error('INVALID_HEIC');
    const width = image.get_width(), height = image.get_height();
    // Check before allocating the decoded RGBA surface, including image collections.
    if (!width || !height || width * height > 50000000) throw new Error('IMAGE_DIMENSIONS');
    const pixels = await new Promise((resolve, reject) => {
      image.display(new ImageData(width, height), result => result ? resolve(result) : reject(new Error('INVALID_HEIC')));
    });
    if (typeof createImageBitmap === 'function') {
      const ratio = Math.min(1, 1600 / Math.max(width, height));
      bitmap = await createImageBitmap(pixels, { resizeWidth: Math.max(1, Math.round(width * ratio)), resizeHeight: Math.max(1, Math.round(height * ratio)), resizeQuality: 'high' });
      self.postMessage({ bitmap }, [bitmap]);
    } else {
      self.postMessage({ width, height, pixels: pixels.data.buffer }, [pixels.data.buffer]);
    }
  } catch (error) {
    bitmap?.close();
    self.postMessage({ error: error.message === 'IMAGE_DIMENSIONS' ? 'IMAGE_DIMENSIONS' : 'INVALID_HEIC' });
  } finally {
    images?.forEach(image => image.free());
    if (decoder?.decoder) heif.heif_context_free(decoder.decoder);
  }
};
