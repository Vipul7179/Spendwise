/**
 * Secure Server-Side Image Validator
 *
 * Validates image buffers against strict binary magic bytes signatures.
 * This prevents MIME-spoofing and blocks malicious payloads (e.g. disguised SVGs,
 * HTML polyglots, or executable binaries).
 */

export interface ValidationResult {
  valid: boolean;
  mimeType?: string;
  extension?: string;
  error?: string;
}

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateImageBuffer(buffer: Buffer, declaredMimeType?: string): ValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'File is empty.' };
  }

  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds the 5 MB limit.`,
    };
  }

  // 1. Check for SVG / XML polyglots (strictly forbidden to prevent XSS)
  const headerText = buffer.subarray(0, Math.min(buffer.length, 512)).toString('utf-8').toLowerCase();
  if (
    headerText.includes('<svg') ||
    headerText.includes('<?xml') ||
    headerText.includes('<!doctype svg') ||
    headerText.includes('<script') ||
    headerText.includes('xmlns="http://www.w3.org/2000/svg"')
  ) {
    return {
      valid: false,
      error: 'SVG and vector formats are prohibited due to security restrictions. Please use JPEG, PNG, WebP, or AVIF.',
    };
  }

  // 2. JPEG magic bytes: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, mimeType: 'image/jpeg', extension: 'jpg' };
  }

  // 3. PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, mimeType: 'image/png', extension: 'png' };
  }

  // 4. WebP magic bytes: RIFF .... WEBP
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { valid: true, mimeType: 'image/webp', extension: 'webp' };
  }

  // 5. GIF magic bytes: GIF87a or GIF89a
  if (
    buffer.length >= 6 &&
    (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' ||
      buffer.subarray(0, 6).toString('ascii') === 'GIF89a')
  ) {
    return { valid: true, mimeType: 'image/gif', extension: 'gif' };
  }

  // 6. AVIF magic bytes: 'ftyp' at offset 4, followed by 'avif' or 'avis'
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buffer.subarray(8, 12).toString('ascii');
    if (brand === 'avif' || brand === 'avis' || brand === 'mif1') {
      return { valid: true, mimeType: 'image/avif', extension: 'avif' };
    }
  }

  return {
    valid: false,
    error: `Unsupported image format${
      declaredMimeType ? ` (${declaredMimeType})` : ''
    }. Allowed formats are JPEG, PNG, WebP, AVIF, and GIF.`,
  };
}

