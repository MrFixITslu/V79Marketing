/** Secure raster-only profile media policy; SVG and active content are forbidden. */
export type ProfileImageType = 'image/png' | 'image/jpeg' | 'image/webp';

export const PROFILE_LOGO_MAX_BYTES = 1024 * 1024;
export const PROFILE_BANNER_MAX_BYTES = 3 * 1024 * 1024;

export function profileImageExtension(buffer: Buffer, claimedMime: string): string | null {
  const mime = claimedMime.split(';')[0].trim().toLowerCase();
  if (mime === 'image/png' && buffer.length >= 24 &&
      buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) &&
      buffer.toString('ascii', 12, 16) === 'IHDR') return '.png';

  if (mime === 'image/jpeg' && buffer.length >= 4 &&
      buffer[0] === 0xff && buffer[1] === 0xd8 &&
      buffer[2] === 0xff && buffer[buffer.length - 2] === 0xff &&
      buffer[buffer.length - 1] === 0xd9) return '.jpg';

  if (mime === 'image/webp' && buffer.length >= 16 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP') return '.webp';

  return null;
}

export function allowedProfileMediaName(name: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:png|jpg|webp)$/.test(name);
}

export function allowedProfileMediaOwner(owner: string) {
  return /^[a-f0-9]{32}$/.test(owner);
}
