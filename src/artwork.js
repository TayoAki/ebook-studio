export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export function parseArtwork(dataUrl) {
  const match = typeof dataUrl === 'string' && dataUrl.match(/^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[2].length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) throw new Error('Artwork must be a PNG or JPEG no larger than 4 MB.');
  const bytes = Uint8Array.from(atob(match[2]), char => char.charCodeAt(0));
  const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10;
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES || !(match[1] === 'image/png' ? png : jpeg)) throw new Error('Artwork contains invalid image bytes.');
  return { bytes, mediaType: match[1], extension: png ? 'png' : 'jpg' };
}
