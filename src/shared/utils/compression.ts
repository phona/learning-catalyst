/**
 * Compression Utilities
 *
 * Simple compression utilities for data storage optimization.
 * Uses Node.js built-in zlib for compression/decompression.
 */

import { promisify } from 'util';
import { deflate, inflate } from 'zlib';
import { Buffer } from 'node:buffer';

const deflateAsync = promisify(deflate);
const inflateAsync = promisify(inflate);

/**
 * Compress data using deflate
 */
export async function compress(data: string): Promise<string> {
  try {
    const inputBuffer = Buffer.from(data, 'utf8');
    const compressedBuffer = await deflateAsync(inputBuffer);
    return compressedBuffer.toString('base64');
  } catch (error) {
    throw new Error(`Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decompress data using inflate
 */
export async function decompress(compressedData: string): Promise<string> {
  try {
    const compressedBuffer = Buffer.from(compressedData, 'base64');
    const decompressedBuffer = await inflateAsync(compressedBuffer);
    return decompressedBuffer.toString('utf8');
  } catch (error) {
    throw new Error(`Decompression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if data appears to be compressed (base64 encoded)
 */
export function isCompressed(data: string): boolean {
  try {
    // Basic check for base64 encoding
    return /^[A-Za-z0-9+/]*={0,2}$/.test(data) && data.length > 100;
  } catch {
    return false;
  }
}

/**
 * Get compression ratio
 */
export function getCompressionRatio(original: string, compressed: string): number {
  const originalSize = Buffer.byteLength(original, 'utf8');
  const compressedSize = Buffer.byteLength(compressed, 'utf8');
  return (originalSize - compressedSize) / originalSize;
}