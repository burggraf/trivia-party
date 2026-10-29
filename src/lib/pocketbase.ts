import PocketBase from 'pocketbase';

function getPocketBaseUrl(): string {
  // Vite proxies /api in development; Nginx does the same in production.
  return window.location.origin;
}

const pb = new PocketBase(getPocketBaseUrl());

// Disable auto-cancellation for better experience in React
pb.autoCancellation(false);

/**
 * Generate a file URL for a PocketBase record
 * @param collectionName - Name of the collection
 * @param recordId - ID of the record
 * @param filename - Name of the file
 * @param options - Optional query parameters (e.g., { thumb: '100x100' })
 * @returns Full URL to the file
 */
export function getFileUrl(
  collectionName: string,
  recordId: string,
  filename: string,
  options?: Record<string, string>
): string {
  if (!filename) return '';

  const baseUrl = getPocketBaseUrl();
  let url = `${baseUrl}/api/files/${collectionName}/${recordId}/${filename}`;

  // Add query parameters if provided
  if (options && Object.keys(options).length > 0) {
    const params = new URLSearchParams(options);
    url += `?${params.toString()}`;
  }

  return url;
}

export default pb;