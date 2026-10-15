import sharp from 'sharp'

/** Edge of the generated circular favicon, in px (crisp on a retina tab). */
export const FAVICON_SIZE = 128

/**
 * Crop an avatar to a circle and return PNG bytes: the square's inscribed
 * circle, with transparent corners.
 *
 * This is how GitHub presents avatars, and the tab icon matches. Doing it here
 * (build time, via sharp) keeps the browser from running a canvas pass at
 * startup, and the result is a plain file the favicon can point at.
 */
export async function circleAvatar(bytes: Buffer, size = FAVICON_SIZE): Promise<Buffer> {
  const square = await sharp(bytes)
    .resize(size, size, { fit: 'cover' })
    .ensureAlpha()
    .png()
    .toBuffer()

  // A white circle on transparent: `dest-in` keeps the image only where the
  // mask is opaque, i.e. inside the circle.
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  )

  return sharp(square)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()
}
