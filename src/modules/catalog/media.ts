import { AppError } from "@/lib/errors";
import { MAX_IMAGE_BYTES } from "@/modules/catalog/validators";

export type AllowedImageMime =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/avif";

export interface MediaUploadResult {
  url: string;
  mimeType: AllowedImageMime;
  sizeBytes: number;
}

export interface MediaAdapter {
  upload(buffer: Buffer, mimeType: AllowedImageMime): Promise<MediaUploadResult>;
}

export function detectImageMimeFromBytes(
  buffer: Buffer,
): AllowedImageMime | null {
  if (buffer.length < 12) {
    return null;
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  if (
    buffer.subarray(4, 8).toString("ascii") === "ftyp" &&
    buffer.subarray(8, 12).toString("ascii") === "avif"
  ) {
    return "image/avif";
  }
  return null;
}

export function stripJpegExifSegments(buffer: Buffer): Buffer {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return buffer;
  }
  const chunks: Buffer[] = [buffer.subarray(0, 2)];
  let offset = 2;
  while (offset + 3 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      chunks.push(buffer.subarray(offset));
      break;
    }
    const marker = buffer[offset + 1];
    if (marker === undefined || marker === 0xda || marker === 0xd9) {
      chunks.push(buffer.subarray(offset));
      break;
    }
    const segLen = buffer.readUInt16BE(offset + 2);
    if (segLen < 2 || offset + 2 + segLen > buffer.length) {
      break;
    }
    const isExifApp1 = marker === 0xe1;
    if (!isExifApp1) {
      chunks.push(buffer.subarray(offset, offset + 2 + segLen));
    }
    offset += 2 + segLen;
  }
  return Buffer.concat(chunks);
}

export function validateAndSanitizeImage(buffer: Buffer): {
  sanitized: Buffer;
  mimeType: AllowedImageMime;
} {
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    throw new AppError(
      "VALIDATION",
      `Image must be between 1 byte and ${MAX_IMAGE_BYTES} bytes`,
    );
  }
  const mimeType = detectImageMimeFromBytes(buffer);
  if (mimeType === null) {
    throw new AppError(
      "VALIDATION",
      "Unsupported image format. Allowed: jpg, png, webp, avif",
    );
  }
  const sanitized =
    mimeType === "image/jpeg" ? stripJpegExifSegments(buffer) : buffer;
  return { sanitized, mimeType };
}

export async function processMediaUpload(
  rawBuffer: Buffer,
  adapter: MediaAdapter,
): Promise<MediaUploadResult> {
  const { sanitized, mimeType } = validateAndSanitizeImage(rawBuffer);
  return adapter.upload(sanitized, mimeType);
}
